let latestBuild, cacheStore;
const newCache = {},
	cache = {};

const selectedBuild = "wow_beta"; // TODO: Allow changing

const builds = {
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
}

const iconFlags = {
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
}

function sanityText(text) {
	text = text.replace(/\$bullet;/g, "<br>&bull; "); // New line
	text = text.replace(/\|cFF([a-z0-9]+)\|Hspell:([0-9]+)\s?\|h([^|]+)\|h\|r/gi, " <a style=\"color: #$1;\" href=\"https://" + builds[selectedBuild].link + "wowhead.com/spell=$2\" data-wowhead=\"spell-$2\">$3</a>"); // Spell tooltips
	text = text.replace(/\$\[[0-9,]+(?:[\s\n]+)?(.*?)\$]/g, "$1"); // Ignored difficulty text
	text = text.replace(/\$\[![0-9,]+(?:[\s\n]+)?(.*?)\$]/g, "<p class=\"iconsprite warning\">$1</p>"); // Difficulty warning text
	text = text.replace(/\$(\d+)s(\d+)/g, function(_, spellID, section) { // SpellEffect variables
		let cacheIndex = spellID + "-" + (parseInt(section) - 1);
		if(typeof(cache[cacheIndex]) === "undefined") {
			let storeCacheIndex = cacheIndex;
			if(typeof(newCache[cacheIndex]) === "undefined") {
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
	for(let bitKey of Object.keys(iconFlags)) {
		if(bit & bitKey) {
			ret += iconFlags[bitKey] + " ";
		}
	}
	ret += "\">";
	return ret;
}

function initBossSections() {
	// Parse boss sections
	Papa.parse("https://wow.tools/dbc/api/export/?name=journalencountersection&build=" + latestBuild, {
		download:		true,
		delimiter:		",",
		skipEmptyLines:	true,
		complete:		function(data) {
			const store = {
				Overview:	{},
				Abilities:	{}
			}
			for(let i = 1; i < data.data.length; i++) {
				const dat = data.data[i];
				if(dat[8] === "3" && dat[13] !== "3") { // Overview
					if(typeof(store.Overview[dat[3]]) === "undefined") {
						store.Overview[dat[3]] = [];
					}
					store.Overview[dat[3]][dat[4]] = dat;
				} else if(dat[9] === "0" || dat[8] === "1" || dat[8] === "2") { // Abilities: Header | Creature | spell
					if(typeof(store.Abilities[dat[3]]) === "undefined") {
						store.Abilities[dat[3]] = [];
					}
					store.Abilities[dat[3]][dat[4]] = dat;
				}
			}
			let iter = Object.keys(store.Overview).concat(Object.keys(store.Abilities));
			for(let encounterID of iter.filter((value, index) => iter.indexOf(value) === index)) {
				const elem = document.querySelector("#boss-" + encounterID + " + label + div");
				if(elem == null) {
					continue;
				}
				for(let storeType of Object.keys(store)) {
					const sectionStore = store[storeType];
					if(typeof(sectionStore[encounterID]) !== "undefined") {
						let contents = "<ul>",
							prevParent = "0",
							prevIndent = 0,
							siblings = [];
						for(let section of Object.values(sectionStore[encounterID])) {
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
						}
						contents += "</ul>";
						elem.innerHTML += "\
							<input id=\"boss-" + encounterID + "-" + storeType + "\" type=\"radio\" name=\"boss-" + encounterID + "\">\
							<label for=\"boss-" + encounterID + "-" + storeType + "\">" + storeType + "</label>\
							<div>\
								" + contents + "\
							</div>";
					}
				}
				/*
				elem.innerHTML += "\
					<input id=\"boss-" + encounterID + "-loot\" type=\"radio\" name=\"boss-" + encounterID + "\">\
					<label for=\"boss-" + encounterID + "-loot\">Loot</label>\
					<div>\
						" + contents + "\
					</div>";
				*/
			}
		}
	});
}

function initBosses() {
	// Parse bosses
	const bosses = {}
	Papa.parse("https://wow.tools/dbc/api/export/?name=journalencounter&build=" + latestBuild, {
		download:		true,
		delimiter:		",",
		skipEmptyLines:	true,
		complete:		function(data) {
			for(let i = 1; i < data.data.length; i++) {
				const dat = data.data[i];
				if(dat[5] === "0") { // Fix for PvP Battlegrounds being listed.
					continue;
				}
				if(typeof(bosses[dat[5]]) === "undefined") {
					bosses[dat[5]] = [];
				}
				bosses[dat[5]].splice(dat[7], 0, dat);
			}
			for(let instanceID of Object.keys(bosses)) {
				const elem = document.querySelector("#instance-" + instanceID + " + label + div");
				for(let boss of Object.values(bosses[instanceID])) {
					elem.innerHTML += "\
					<input id=\"boss-" + boss[0] + "\" type=\"radio\" name=\"instance-" + boss[5] + "\">\
					<label for=\"boss-" + boss[0] + "\">" + boss[1] + "</label>\
					<div class=\"tabbed\">\
						<div>" + boss[2] + "</div>\
					</div>";
				}
			}
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
		complete:		function(data) {
			for(let i = 1; i < data.data.length; i++) {
				const dat = data.data[i];
				document.querySelector("#expansion-" + dat[1] + " + label + div").innerHTML += "\
				<input id=\"instance-" + dat[2] + "\" type=\"radio\" name=\"expansion-" + dat[1] + "\">\
				<label for=\"instance-" + dat[2] + "\"></label>\
				<div class=\"tabbed\"></div>";
			}
			Papa.parse("https://wow.tools/dbc/api/export/?name=journalinstance&build=" + latestBuild, {
				download:		true,
				delimiter:		",",
				skipEmptyLines:	true,
				complete:		function(data) {
					for(let i = 1; i < data.data.length; i++) {
						const dat	= data.data[i],
							elem	= document.querySelector("#instance-" + dat[2] + " + label");
						if(elem !== null) { // Fix for unassigned instances (e.g. 235: Scarlet Monastery - OLD, PH)
							elem.innerHTML = dat[0];
							document.querySelector("#instance-" + dat[2] + " + label + div").innerHTML += dat[1];
						}
					}
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
		complete:		function(data) {
			const elem = document.getElementsByClassName('tabbed')[0];
			let isFirst = true;
			for(let i = data.data.length - 1; i > 0; i--) {
				const dat = data.data[i];
				elem.innerHTML += "\
				<input id=\"expansion-" + dat[0] + "\" type=\"radio\" name=\"expansion\"" + (isFirst ? "checked" : "") + ">\
				<label for=\"expansion-" + dat[0] + "\">" + dat[1] + "</label>\
				<div class=\"tabbed\"></div>";
				isFirst = false;
			}
			initInstances();
		}
	});
}

function initSpellEffects() {
	const spellEffectsReq = new XMLHttpRequest()
	spellEffectsReq.onreadystatechange = function() {
		if(spellEffectsReq.readyState !== 4) {
			return;
		}
		const data = JSON.parse(spellEffectsReq.responseText)
		const spellHeaderSpellID			= data.headers.indexOf('SpellID'),
			spellHeaderEffectIndex			= data.headers.indexOf('EffectIndex'),
			spellHeaderEffectBasePointsF	= data.headers.indexOf('EffectBasePointsF');
		Papa.parse("https://wow.tools/dbc/api/export/?name=spelleffect&build=" + latestBuild, {
			download:		true,
			delimiter:		",",
			skipEmptyLines:	true,
			complete:		function(data) {
				for(let i = 1; i < data.data.length; i++) {
					const dat = data.data[i];
					newCache[dat[spellHeaderSpellID] + "-" + dat[spellHeaderEffectIndex]] = dat[spellHeaderEffectBasePointsF];
				}
				initExpansions();
			}
		});
	}
	spellEffectsReq.open("GET", "https://wow.tools/dbc/api/header/spelleffect/?build=" + latestBuild, true);
	spellEffectsReq.send(null);
}

const buildsReq = new XMLHttpRequest()
buildsReq.onreadystatechange = function() {
	if(buildsReq.readyState !== 4) {
		return;
	}
	latestBuild = JSON.parse(buildsReq.responseText)[selectedBuild]
	const store = indexedDB.open('CacheDB', 1);
	store.onupgradeneeded = function() {
		if(store.result.objectStoreNames.contains(latestBuild)) {
			store.result.deleteObjectStore(latestBuild);
		}
		store.result.createObjectStore(latestBuild);
	};
	store.onsuccess = function() {
		cacheStore = store.result;
		const request = cacheStore.transaction(latestBuild).objectStore(latestBuild).openCursor();
		request.onsuccess = function(event) {
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
buildsReq.open("GET", "https://wow.tools/api.php?type=latestbuilds", true);
buildsReq.send(null);