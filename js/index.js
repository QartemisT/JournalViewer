let latestBuild, cacheStore;
const selectedBuild = "wow_beta", // TODO: Allow changing
	newCache = {},
	cache = {},
	reqResponse = {},
	reqHeaders = [
		"spelleffect",
		"spellmisc",
		"spell"
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

function sanityText(text) {
	text = text.replace(/\$bullet;/g, "<br>&bull; "); // New line
	text = text.replace(/\|cFF([a-z0-9]+)\|Hspell:([0-9]+)\s?\|h([^|]+)\|h\|r/gi, " <a style=\"color: #$1;\" href=\"https://" + builds[selectedBuild].link + "wowhead.com/spell=$2\" data-wowhead=\"spell-$2\">$3</a>"); // Spell tooltips
	text = text.replace(/\$\[[0-9,]+(?:[\s\n]+)?(.*?)\$]/g, "$1"); // Ignored difficulty text
	text = text.replace(/\$\[![0-9,]+(?:[\s\n]+)?(.*?)\$]/g, "<p class=\"iconsprite warning\">$1</p>"); // Difficulty warning text
	text = text.replace(/\$(\d+)s(\d+)/g, (_, spellID, section) => { // SpellEffect variables
		let cacheIndex = spellID + "-" + (parseInt(section) - 1);
		if(!cache[cacheIndex]) {
			let storeCacheIndex = cacheIndex;
			if(!newCache[cacheIndex]) {
				storeCacheIndex = spellID + "-0";
			}
			cacheStore.transaction(latestBuild, "readwrite").objectStore(latestBuild).add(newCache[storeCacheIndex], cacheIndex);
			cache[cacheIndex] = newCache[storeCacheIndex];
		}
		return cache[cacheIndex];
	});
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

function initBossSections() {
	// Parse boss sections
	Papa.parse("https://wow.tools/dbc/api/export/?name=journalencountersection&build=" + latestBuild, {
		download:		true,
		delimiter:		",",
		skipEmptyLines:	true,
		complete: (data) => {
			const store = {
				Overview:	{},
				Abilities:	{}
			}
			data.data.shift();
			data.data.map(data => {
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
								} else {
									// TODO: SpellID
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
	});
}

function initBosses() {
	// Parse bosses
	Papa.parse("https://wow.tools/dbc/api/export/?name=journalencounter&build=" + latestBuild, {
		download:		true,
		delimiter:		",",
		skipEmptyLines:	true,
		complete: (data) => {
			const bosses = {}
			data.data.shift();
			data.data
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
			initBossSections();
		}
	});
}

function initInstances() {
	// Parse instances
	Papa.parse("https://wow.tools/dbc/api/export/?name=journaltierxinstance&build=" + latestBuild, {
		download:		true,
		delimiter:		",",
		skipEmptyLines:	true,
		complete: (data) => {
			data.data.shift();
			data.data.map(data => {
				document.querySelector("#expansion-" + data[1] + " + label + div").innerHTML += "\
				<input id=\"instance-" + data[2] + "\" type=\"radio\" name=\"expansion-" + data[1] + "\">\
				<label for=\"instance-" + data[2] + "\"></label>\
				<div class=\"tabbed\"></div>";
			});
			Papa.parse("https://wow.tools/dbc/api/export/?name=journalinstance&build=" + latestBuild, {
				download:		true,
				delimiter:		",",
				skipEmptyLines:	true,
				complete: (data) => {
					data.data.shift();
					data.data
						.filter(data => document.querySelector("#instance-" + data[2] + " + label"))
						.map(data => {
							document.querySelector("#instance-" + data[2] + " + label").innerHTML = data[0];
							document.querySelector("#instance-" + data[2] + " + label + div").innerHTML += data[1];
						});
					initBosses();
				}
			});
		}
	});
}

function initExpansions() {
	// Load expansions
	Papa.parse("https://wow.tools/dbc/api/export/?name=journaltier&build=" + latestBuild, {
		download:		true,
		delimiter:		",",
		skipEmptyLines:	true,
		complete: (data) => {
			const elem = document.getElementsByClassName("tabbed")[0];
			data.data.shift();
			data.data.reverse().map((data, index) => {
				elem.innerHTML += "\
				<input id=\"expansion-" + data[0] + "\" type=\"radio\" name=\"expansion\"" + (index === 0 ? "checked" : "") + ">\
				<label for=\"expansion-" + data[0] + "\">" + data[1] + "</label>\
				<div class=\"tabbed\"></div>";
			});
			initInstances();
		}
	});
}

function initSpellEffects() {
	const spellHeaderSpellID			= reqHeaders.spelleffect.indexOf("SpellID"),
		spellHeaderEffectIndex			= reqHeaders.spelleffect.indexOf("EffectIndex"),
		spellHeaderEffectBasePointsF	= reqHeaders.spelleffect.indexOf("EffectBasePointsF");
	Papa.parse("https://wow.tools/dbc/api/export/?name=spelleffect&build=" + latestBuild, {
		download:		true,
		delimiter:		",",
		skipEmptyLines:	true,
		complete: (data) => {
			data.data.shift();
			data.data.map(data => newCache[data[spellHeaderSpellID] + "-" + data[spellHeaderEffectIndex]] = data[spellHeaderEffectBasePointsF]);
			initExpansions();
		}
	});
}

function initCache() {
	const store = indexedDB.open("CacheDB", 1);
	store.onupgradeneeded = () => {
		if(store.result.objectStoreNames.contains(latestBuild)) {
			store.result.deleteObjectStore(latestBuild);
		}
		store.result.createObjectStore(latestBuild);
	};
	store.onsuccess = () => {
		cacheStore = store.result;
		const request = cacheStore.transaction(latestBuild).objectStore(latestBuild).openCursor();
		request.onsuccess = (event) => {
			let cursor = event.target.result;
			if(cursor) { // Getting results
				cache[cursor.primaryKey] = cursor.value;
				cursor.continue();
			} else { // Finished
				if(Object.keys(cache).length !== 0) {
					initExpansions();
				} else {
					initSpellEffects();
				}
			}
		};
	};
}

fetch("https://wow.tools/api.php?type=latestbuilds")
	.then(response => response.json())
	.then(json => {
		latestBuild = json[selectedBuild];
		Promise.all(reqHeaders.map(header => fetch("https://wow.tools/dbc/api/header/" + header + "/?build=" + latestBuild)))
			.then(responses => Promise.all(responses.map(response => response.json())))
			.then(headers => headers.map((header, index) => reqResponse[reqHeaders[index]] = header.headers))
			.then(() => initCache());
	});