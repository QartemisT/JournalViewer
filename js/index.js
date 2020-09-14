let latestBuild, cacheStore,
	selectedBuild = "wow_beta";
const newCache = {},
	cache = {},
	reqHeadersResponse = {},
	reqCSVResponse = {},
	reqHeaders = [
		"spelleffect",
		"spellmisc",
		"spellname",
		"spell"
	],
	reqCSVs = [
		"spellradius",
		"spellduration",
		"journaltier",
		"journaltierxinstance",
		"journalinstance",
		"journalencounter",
		"journalencountersection"
	],
	builds = {
		"wow":		{
			link: "",
			name: "Live"
		},
		"wowt":		{
			link: "ptr.",
			name: "PTR"
		},
		"wow_beta":	{
			link: "shadowlands.",
			name: "Beta"
		},
		"wowdev":	{
			link: "",
			name: "Alpha"
		}
	},
	iconFlags = {
		1:		"tank",
		2:		"damage",
		4:		"healer",
		8:		"heroic",
		16:		"deadly",
		32:		"important",
		64:		"interruptible",
		128:	"magic",
		256:	"curse",
		512:	"poison",
		1024:	"disease",
		2048:	"enrage",
		4096:	"mythic",
	};

function sanityText(text, overrideSpellID) {
	if(!text) {
		return "";
	}
	text = text.replace(/\$bullet;/g, "<br>&bull; "); // New line
	text = text.replace(/\|cFF([a-z0-9]+)\|Hspell:([0-9]+)\s?\|h([^|]+)\|h\|r/gi, " <a style=\"color: #$1;\" href=\"https://" + builds[selectedBuild].link + "wowhead.com/spell=$2\" data-wowhead=\"spell-$2\">$3</a>"); // Spell tooltips
	text = text.replace(/\$\[[0-9,]+(?:[\s\n]+)?(.*?)\$]/g, "$1"); // Ignored difficulty text
	text = text.replace(/\$\[![0-9,]+(?:[\s\n]+)?(.*?)\$]/g, "<p class=\"iconsprite warning\">$1</p>"); // Difficulty warning text
	text = text.replace(/\$(\d+)?s(\d+)/g, (_, spellID, section) => { // SpellEffect variables
		spellID = spellID || overrideSpellID;
		if(!spellID) {
			console.log("Null spellID", "SpellEffect", text);
			return "<err>";
		}
		const cacheIndex = "spelleffect-" + spellID + "-" + (parseInt(section) - 1);
		if(!cache[cacheIndex]) {
			let storeCacheIndex = cacheIndex;
			if(!newCache[cacheIndex]) {
				storeCacheIndex = "spelleffect-" + spellID + "-0";
			}
			cacheStore.transaction(latestBuild, "readwrite").objectStore(latestBuild).add(JSON.stringify(newCache[storeCacheIndex]), cacheIndex);
			cache[cacheIndex] = newCache[storeCacheIndex];
		}
		if(!cache[cacheIndex]) {
			console.log("Failed SpellEffect", text);
			return "<err>";
		}
		return Math.abs(cache[cacheIndex].EffectBasePointsF);
	});
	text = text.replace(/\$@spellname(\d+)/g, (_, spellID) => { // SpellName variable
		const cacheIndex = "spellname-" + spellID;
		if(!cache[cacheIndex]) {
			cacheStore.transaction(latestBuild, "readwrite").objectStore(latestBuild).add(JSON.stringify(newCache[cacheIndex]), cacheIndex);
			cache[cacheIndex] = newCache[cacheIndex];
		}
		return "<a href=\"https://" + builds[selectedBuild].link + "wowhead.com/spell=" + spellID + "\" data-wowhead=\"spell-" + spellID + "\">" + cache[cacheIndex] + "</a>";
	});
	text = text.replace(/\$@spelldesc(\d+)/g, (_, spellID) => { // SpellDesc variable
		const cacheIndex = "spelldesc-" + spellID;
		if(!cache[cacheIndex]) {
			cacheStore.transaction(latestBuild, "readwrite").objectStore(latestBuild).add(JSON.stringify(newCache[cacheIndex]), cacheIndex);
			cache[cacheIndex] = newCache[cacheIndex];
		}
		return cache[cacheIndex];
	});
	text = text.replace(/\$(\d+)([a|A])(\d+)?/g, (_, spellID, type, section) => { // Radius variables
		if(!spellID) {
			console.log("Null spellID", "Radius", text);
			return "<err>";
		}
		let cacheIndex = "spelleffect-" + spellID + "-" + (parseInt(section) - 1);
		if(!cache[cacheIndex]) {
			let storeCacheIndex = cacheIndex;
			if(!newCache[cacheIndex]) {
				storeCacheIndex = "spelleffect-" + spellID + "-0";
			}
			cacheStore.transaction(latestBuild, "readwrite").objectStore(latestBuild).add(JSON.stringify(newCache[storeCacheIndex]), cacheIndex);
			cache[cacheIndex] = newCache[storeCacheIndex];
		}
		const indexType = type === "a" ? 0 : 1;
		if(!cache[cacheIndex]) {
			console.log("Failed EffectRadiusIndex", text);
			return "<err>";
		}
		let radiusIndex = cache[cacheIndex]["EffectRadiusIndex" + indexType];
		if(radiusIndex === "0") {
			radiusIndex = cache[cacheIndex]["EffectRadiusIndex" + (indexType === 0 ? 1 : 0)]
		}
		if(radiusIndex === "0") {
			console.log("Failed EffectRadiusIndex (both radius indexes returned 0)", text);
			return "<err>";
		}
		return reqCSVResponse.spellradius.find(data => data[0] === radiusIndex)[1];
	});
	text = text.replace(/\$(\d+)?t(\d+)?/g, (_, spellID, section) => { // Time variables
		spellID = spellID || overrideSpellID
		section = section || 1;
		if(!spellID) {
			console.log("Null spellID", "Time", text);
			return "<err>";
		}
		const cacheIndex = "spelleffect-" + spellID + "-" + ((parseInt(section) - 1) || 0);
		if(!cache[cacheIndex]) {
			let storeCacheIndex = cacheIndex;
			if(!newCache[cacheIndex]) {
				storeCacheIndex = "spelleffect-" + spellID + "-0";
			}
			cacheStore.transaction(latestBuild, "readwrite").objectStore(latestBuild).add(JSON.stringify(newCache[storeCacheIndex]), cacheIndex);
			cache[cacheIndex] = newCache[storeCacheIndex];
		}
		if(!cache[cacheIndex]) {
			console.log("Failed EffectAuraPeriod", text);
			return "<err>";
		}
		return cache[cacheIndex].EffectAuraPeriod / 1000;
	});
	text = text.replace(/\$(\d+)?d/g, (_, spellID) => { // Duration variables
		spellID = spellID || overrideSpellID
		if(!spellID) {
			console.log("Null spellID", "Duration", text);
			return "<err>";
		}
		const cacheIndex = "spellmisc-" + spellID;
		if(!cache[cacheIndex]) {
			cacheStore.transaction(latestBuild, "readwrite").objectStore(latestBuild).add(JSON.stringify(newCache[cacheIndex]), cacheIndex);
			cache[cacheIndex] = newCache[cacheIndex];
		}
		if(!cache[cacheIndex]) {
			console.log("Failed Duration", text);
			return "<err>";
		}
		if(cache[cacheIndex].DurationIndex === "0") { // Special edge case
			return "until cancelled";
		}
		try {
			return reqCSVResponse.spellduration.find(data => data[0] === cache[cacheIndex].DurationIndex)[1] / 1000;
		} catch(_) {
			console.log("Failed Duration", text);
			return "<err>";
		}
	});
	// TODO: ${$E1*100}
	return text;
}

function elementIcons(bit) {
	bit = parseInt(bit);
	if(bit === 0) {
		return "<li>";
	}
	let ret = "<li class=\"iconsprite ";
	Object.keys(iconFlags)
		.filter(bitKey => bit & bitKey)
		.map(bitKey => ret += iconFlags[bitKey] + " ");
	ret += "\">";
	return ret;
}

function load() {
	// Expansions
	const expansionsElem = document.getElementsByClassName("tabbed")[0];
	reqCSVResponse.journaltier.reverse().map((data, index) => {
		expansionsElem.innerHTML += "\
			<input id=\"expansion-" + data[0] + "\" type=\"radio\" name=\"expansion\"" + (index === 0 ? "checked" : "") + ">\
			<label for=\"expansion-" + data[0] + "\">" + data[1] + "</label>\
			<div class=\"tabbed\"></div>";
	});
	// Instances
	reqCSVResponse.journaltierxinstance.map(data => {
		document.querySelector("#expansion-" + data[1] + " + label + div").innerHTML += "\
			<input id=\"instance-" + data[2] + "\" type=\"radio\" name=\"expansion-" + data[1] + "\">\
			<label for=\"instance-" + data[2] + "\"></label>\
			<div class=\"tabbed\"></div>";
	});
	reqCSVResponse.journalinstance
		.filter(data => document.querySelector("#instance-" + data[2] + " + label"))
		.map(data => {
			document.querySelector("#instance-" + data[2] + " + label").innerHTML = data[0];
			document.querySelector("#instance-" + data[2] + " + label + div").innerHTML += data[1];
		});
	// Bosses
	const bosses = {}
	reqCSVResponse.journalencounter
		.filter((data) => data[5] !== "0")
		.map(data => {
			if(!bosses[data[5]]) {
				bosses[data[5]] = [];
			}
			bosses[data[5]].splice(data[7], 0, data);
		});
	Object.keys(bosses).map(instanceID => {
		const elem = document.querySelector("#instance-" + instanceID + " + label + div");
		Object.values(bosses[instanceID]).map(boss => {
			elem.innerHTML += "\
					<input id=\"boss-" + boss[0] + "\" type=\"radio\" name=\"instance-" + boss[5] + "\">\
					<label for=\"boss-" + boss[0] + "\">" + boss[1] + "</label>\
					<div class=\"tabbed\">\
						<div>" + boss[2] + "</div>\
					</div>";
		});
	});
	// Sections
	const store = {
		Overview:	{},
		Abilities:	{}
	}
	reqCSVResponse.journalencountersection.map(data => {
		if(data[8] === "3" && data[13] !== "3") { // Overview
			if(!store.Overview[data[3]]) {
				store.Overview[data[3]] = [];
			}
			store.Overview[data[3]][data[4]] = data;
		} else if(data[9] === "0" || data[8] === "1" || data[8] === "2") { // Abilities: Header | Creature | spell
			if(!store.Abilities[data[3]]) {
				store.Abilities[data[3]] = [];
			}
			store.Abilities[data[3]][data[4]] = data;
		}
	});
	Object.keys(store.Overview).concat(Object.keys(store.Abilities))
		.filter((encounterID, index, self) => self.indexOf(encounterID) === index && document.querySelector("#boss-" + encounterID + " + label + div"))
		.map(encounterID => {
			const elem = document.querySelector("#boss-" + encounterID + " + label + div");
			Object.keys(store)
				.filter(storeType => store[storeType][encounterID])
				.map(storeType => {
					const sectionStore = store[storeType];
					let contents = "<ul>",
						prevParent = "0",
						prevIndent = 0,
						siblings = [];
					Object.values(sectionStore[encounterID]).map(section => {
						if(section[5] === "0") {
							siblings[section[0]] = 0;
						} else {
							siblings[section[0]] = siblings[section[5]] + 1;
						}
						if(prevParent !== section[5]) {
							if(siblings[section[0]] < prevIndent) {
								for(let i = 0; i < prevIndent - siblings[section[0]]; i++) {
									contents += "</ul>";
								}
							} else {
								contents += "<ul>";
							}
						}
						prevParent = section[5];
						prevIndent = siblings[section[0]];
						if(storeType === "Overview") {
							contents += elementIcons(section[14]) + "<b>" + section[1] + "</b> " + sanityText(section[2]) + "</li>";
						} else if(section[11] !== "0") { // Ability: Spell
							const spellID = section[11],
								spellNameIndex = "spellname-" + spellID,
								spellDescIndex = "spelldesc-" + spellID;
							if(!cache[spellNameIndex]) {
								cacheStore.transaction(latestBuild, "readwrite").objectStore(latestBuild).add(JSON.stringify(newCache[spellNameIndex]), spellNameIndex);
								cache[spellNameIndex] = newCache[spellNameIndex];
							}
							if(!cache[spellDescIndex]) {
								cacheStore.transaction(latestBuild, "readwrite").objectStore(latestBuild).add(JSON.stringify(newCache[spellDescIndex]), spellDescIndex);
								cache[spellDescIndex] = newCache[spellDescIndex];
							}
							contents += elementIcons(section[14]) + "<b><a href=\"https://" + builds[selectedBuild].link + "wowhead.com/spell=" + spellID + "\" data-wowhead=\"spell-" + spellID + "\">" + cache[spellNameIndex] + "</a></b> " + sanityText(cache[spellDescIndex], spellID) + "</li>";
						} else {
							contents += elementIcons(section[14]) + "<b>" + section[1] + "</b> " + sanityText(section[2]) + "</li>";
						}
						prevParent = section[5];
					});
					contents += "</ul>";
					elem.innerHTML += "\
								<input id=\"boss-" + encounterID + "-" + storeType + "\" type=\"radio\" name=\"boss-" + encounterID + "\">\
								<label for=\"boss-" + encounterID + "-" + storeType + "\">" + storeType + "</label>\
								<div>\
									" + contents + "\
								</div>";
				});
		});
}

function initCache() {
	const store = indexedDB.open("CacheDB", 3);
	store.onupgradeneeded = () => {
		if(store.result.objectStoreNames.contains(latestBuild)) {
			store.result.deleteObjectStore(latestBuild);
		}
		store.result.createObjectStore(latestBuild);
	};
	store.onsuccess = () => {
		cacheStore = store.result;
		const request = cacheStore.transaction(latestBuild).objectStore(latestBuild).openCursor();
		request.onsuccess = async (event) => {
			let cursor = event.target.result;
			if(cursor) { // Getting results
				try {
					cache[cursor.primaryKey] = JSON.parse(cursor.value);
				} catch(_) {
					console.log(cursor.primaryKey, cursor.value);
				}
				cursor.continue();
			} else { // Finished
				if(Object.keys(cache).length === 0) {
					await new Promise((resolve) => {
						const spellHeaderSpellID = reqHeadersResponse.spelleffect.indexOf("SpellID"),
							spellHeaderEffectIndex = reqHeadersResponse.spelleffect.indexOf("EffectIndex"),
							spellHeaderEffectBasePointsF = reqHeadersResponse.spelleffect.indexOf("EffectBasePointsF"),
							spellHeaderEffectAuraPeriod = reqHeadersResponse.spelleffect.indexOf("EffectAuraPeriod"),
							spellHeaderEffectRadiusIndex0 = reqHeadersResponse.spelleffect.indexOf("EffectRadiusIndex[0]"),
							spellHeaderEffectRadiusIndex1 = reqHeadersResponse.spelleffect.indexOf("EffectRadiusIndex[1]");
						Papa.parse("https://wow.tools/dbc/api/export/?name=spelleffect&build=" + latestBuild, {
							download: true,
							delimiter: ",",
							skipEmptyLines: true,
							complete: (data) => {
								data.data.shift();
								data.data.map(data => newCache["spelleffect-" + data[spellHeaderSpellID] + "-" + data[spellHeaderEffectIndex]] = {
									EffectBasePointsF:	data[spellHeaderEffectBasePointsF],
									EffectAuraPeriod:	data[spellHeaderEffectAuraPeriod],
									EffectRadiusIndex0:	data[spellHeaderEffectRadiusIndex0],
									EffectRadiusIndex1:	data[spellHeaderEffectRadiusIndex1]
								});
								resolve();
							}
						});
					});
					await new Promise((resolve) => {
						const spellHeaderSpellID = reqHeadersResponse.spellmisc.indexOf("SpellID"),
							spellHeaderDurationIndex = reqHeadersResponse.spellmisc.indexOf("DurationIndex"),
							spellHeaderRangeIndex = reqHeadersResponse.spellmisc.indexOf("RangeIndex");
						Papa.parse("https://wow.tools/dbc/api/export/?name=spellmisc&build=" + latestBuild, {
							download: true,
							delimiter: ",",
							skipEmptyLines: true,
							complete: (data) => {
								data.data.shift();
								data.data.map(data => newCache["spellmisc-" + data[spellHeaderSpellID]] = {
									DurationIndex:	data[spellHeaderDurationIndex],
									RangeIndex:		data[spellHeaderRangeIndex]
								});
								resolve();
							}
						});
					});
					await new Promise((resolve) => {
						const spellHeaderID = reqHeadersResponse.spell.indexOf("ID"),
							spellHeaderDescription_lang = reqHeadersResponse.spell.indexOf("Description_lang");
						Papa.parse("https://wow.tools/dbc/api/export/?name=spell&build=" + latestBuild, {
							download: true,
							delimiter: ",",
							skipEmptyLines: true,
							complete: (data) => {
								data.data.shift();
								data.data.map(data => newCache["spelldesc-" + data[spellHeaderID]] = data[spellHeaderDescription_lang]);
								resolve();
							}
						});
					});
					await new Promise((resolve) => {
						const spellHeaderID = reqHeadersResponse.spellname.indexOf("ID"),
							spellHeaderName_lang = reqHeadersResponse.spellname.indexOf("Name_lang");
						Papa.parse("https://wow.tools/dbc/api/export/?name=spellname&build=" + latestBuild, {
							download: true,
							delimiter: ",",
							skipEmptyLines: true,
							complete: (data) => {
								data.data.shift();
								data.data.map(data => newCache["spellname-" + data[spellHeaderID]] = data[spellHeaderName_lang]);
								resolve();
							}
						});
					});
				}
				load();
			}
		};
	};
}

document.addEventListener('DOMContentLoaded', () => {
	selectedBuild = location.hash.substr(1) || selectedBuild;

	const versionDropdown = document.getElementById("version");
	versionDropdown.onchange = () => {
		location.hash = "#" + versionDropdown.value;
		location.reload();
	}
	Object.keys(builds).map(build => {
		versionDropdown.options[versionDropdown.options.length] = new Option(builds[build].name, build);
		if(selectedBuild === build) {
			versionDropdown.value = build;
		}
	});

	fetch("https://wow.tools/api.php?type=latestbuilds")
		.then(response => response.json())
		.then(json => {
			latestBuild = json[selectedBuild];
			Promise.all(reqHeaders.map(header => fetch("https://wow.tools/dbc/api/header/" + header + "/?build=" + latestBuild)))
				.then(responses => Promise.all(responses.map(response => response.json())))
				.then(headers => headers.map((header, index) => reqHeadersResponse[reqHeaders[index]] = header.headers))
				//
				.then(() => Promise.all(reqCSVs.map(header => fetch("https://wow.tools/dbc/api/export/?name=" + header + "&build=" + latestBuild))))
				.then(responses => Promise.all(responses.map(response => response.text())))
				.then(csvs => Promise.all(csvs.map((csv, index) => new Promise((resolve) => {
					Papa.parse(csv, {
						delimiter: ",",
						skipEmptyLines: true,
						complete: (data) => {
							data.data.shift();
							resolve(reqCSVResponse[reqCSVs[index]] = data.data);
						}
					});
				}))))
				//
				.then(() => initCache());
		});
});