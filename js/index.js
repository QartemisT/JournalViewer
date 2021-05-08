let cacheData,
	selectedBuild = "wow_beta",
	selectedDifficulty = "mythic",
	selectedTab = "";
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
		//"wowdev":	{
		//	link: "",
		//	name: "Alpha"
		//}
	},
	difficulties = {
		"all": {},
		"normal": {
			"1":	true,
			"14":	true
		},
		"heroic": {
			"2":	true,
			"15":	true
		},
		"mythic": {
			"16":	true,
			"23":	true
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
		8192:	"bleed"
	};

function setHash() {
	let hash = "#";
	if(selectedBuild !== "wow_beta") {
		hash += "build=" + selectedBuild;
	}
	if(selectedDifficulty !== "mythic") {
		if(hash !== "#") {
			hash += "&";
		}
		hash += "difficulty=" + selectedDifficulty;
	}
	if(selectedTab !== "") {
		if(hash !== "#") {
			hash += "&";
		}
		hash += "tab=" + selectedTab;
	}
	if(hash === "#") {
		return;
	}
	location.hash = hash;
	localStorage.hash = location.hash;
}

function getSpellEffect(spellID, section) {
	const data = cacheData.spelleffect[spellID + "-" + (parseInt(section) - 1)];
	if(data) {
		return data;
	}
	return cacheData.spelleffect[spellID + "-0"];
}

function sanityText(text, overrideSpellID, spellMultiplier) {
	if(!text) {
		return "";
	}
	text = text.replace(/\$bullet;/g, "<br>&bull; "); // New line
	text = text.replace(/\|cFF([a-z0-9]+)\|Hspell:([0-9]+)\s?\|h([^|]+)\|h\|r/gi, " <a style=\"color: #$1;\" href=\"https://" + builds[selectedBuild].link + "wowhead.com/spell=$2\" data-wowhead=\"spell-$2\">$3</a>"); // Spell tooltips
	text = text.replace(/\$\[[0-9, ]+(?:[\s\n]+)?(.*?)\$]/g, "$1"); // Ignored difficulty text
	text = text.replace(/\$\[!([0-9, ]+)(?:[\s\n]+)?(.*?)\$]/g, (_, diffs, txt) => {
		for(const diff of diffs.split(",")) {
			if(selectedDifficulty === "all" || difficulties[selectedDifficulty][diff.trim()]) {
				return "<p class=\"iconsprite warning\">" + txt + "</p>";
			}
		}
		return "";
	});
	text = text.replace(/\$@spellicon(\d+)/g, ""); // SpellIcon variable - remove it.
	text = text.replace(/\$@spellname(\d+)/g, (_, spellID) => { // SpellName variable
		return "<a href=\"https://" + builds[selectedBuild].link + "wowhead.com/spell=" + spellID + "\" data-wowhead=\"spell-" + spellID + "\">" + cacheData.spellname[spellID] + "</a>";
	});
	text = text.replace(/\$@spelldesc(\d+)/g, (_, spellID) => { // SpellDesc variable
		return sanityText(cacheData.spell[spellID], spellID, spellMultiplier);
	});
	text = text.replace(/\$(\d+)?[mMsSwW](\d+)?/g, (_, spellID, section) => { // SpellEffect variables
		spellID = spellID || overrideSpellID;
		section = section || 1;
		if(!spellID) {
			console.log("Null spellID", "SpellEffect", text);
			return "<err>";
		}
		const data = getSpellEffect(spellID, section);
		if(!data) {
			console.log("Failed SpellEffect", text);
			return "<err>";
		}
		if(data.Effect === 2) {
			return Math.round(Math.abs(spellMultiplier * data.EffectBasePointsF / 100));
		}
		return Math.abs(data.EffectBasePointsF);
	});
	text = text.replace(/\$(\d+)?[eE](\d+)?/g, (_, spellID, section) => { // EffectAmplitude variables
		spellID = spellID || overrideSpellID;
		section = section || 1;
		if(!spellID) {
			console.log("Null spellID", "EffectAmplitude", text);
			return "<err>";
		}
		const data = getSpellEffect(spellID, section);
		if(!data) {
			console.log("Failed EffectAmplitude", text);
			return "<err>";
		}
		return data.EffectAmplitude;
	});
	text = text.replace(/\$(\d+)?o(\d+)?/g, (_, spellID, section) => { // AuraDamage variable
		spellID = spellID || overrideSpellID;
		section = section || 1;
		if(!spellID) {
			console.log("Null spellID", "AuraDamage", text);
			return "<err>";
		}
		const data = getSpellEffect(spellID, section);
		if(!data) {
			console.log("Failed AuraDamage (SpellEffect)", text);
			return "<err>";
		}
		const data2 = cacheData.spellmisc[spellID]
		if(!data2) {
			console.log("Failed AuraDamage2 (SpellMisc)", text);
			return "<err>";
		}
		try {
			return Math.round(Math.abs(spellMultiplier * data.EffectBasePointsF / 100) * ((cacheData.spellduration[data2.DurationIndex] / 1000) / (data.EffectAuraPeriod / 1000)));
		} catch(_) {
			console.log("Failed AuraDamage (SpellDuration)", text);
			return "<err>";
		}
	});
	text = text.replace(/\$(\d+)?([a|A])(\d+)?/g, (_, spellID, type, section) => { // Radius variables
		spellID = spellID || overrideSpellID;
		section = section || 1;
		if(!spellID) {
			console.log("Null spellID", "Radius", text);
			return "<err>";
		}
		const data = getSpellEffect(spellID, section);
		if(!data) {
			console.log("Failed EffectRadiusIndex", text);
			return "<err>";
		}
		let radiusIndex = data["EffectRadiusIndex" + type === "a" ? 0 : 1];
		if(radiusIndex === 0) {
			radiusIndex = data["EffectRadiusIndex" + (type === "a" ? 1 : 0)]
		}
		if(radiusIndex === 0) {
			console.log("Failed EffectRadiusIndex (both radius indexes returned 0)", text);
			return "<err>";
		}
		return cacheData.spellradius[radiusIndex];
	});
	text = text.replace(/\$(\d+)?[tT](\d+)?/g, (_, spellID, section) => { // Time variables
		spellID = spellID || overrideSpellID
		section = section || 1;
		if(!spellID) {
			console.log("Null spellID", "Time", text);
			return "<err>";
		}
		const data = getSpellEffect(spellID, section);
		if(!data) {
			console.log("Failed EffectAuraPeriod", text);
			return "<err>";
		}
		return data.EffectAuraPeriod / 1000;
	});
	text = text.replace(/\$(\d+)?[xX](\d+)?/g, (_, spellID, section) => { // EffectChainTargets variables
		spellID = spellID || overrideSpellID
		section = section || 1;
		if(!spellID) {
			console.log("Null spellID", "EffectChainTargets", text);
			return "<err>";
		}
		const data = getSpellEffect(spellID, section);
		if(!data) {
			console.warn("Failed EffectChainTargets", text);
			return "<err>";
		}
		return data.EffectChainTargets;
	});
	text = text.replace(/\$(\d+)?[fF](\d+)?/g, (_, spellID, section) => { // EffectChainAmplitude variables
		spellID = spellID || overrideSpellID
		section = section || 1;
		if(!spellID) {
			console.log("Null spellID", "EffectChainAmplitude", text);
			return "<err>";
		}
		const data = getSpellEffect(spellID, section);
		if(!data) {
			console.warn("Failed EffectChainAmplitude", text);
			return "<err>";
		}
		return data.EffectChainAmplitude;
	});
	text = text.replace(/\$(\d+)?[bB](\d+)?/g, (_, spellID, section) => { // EffectPointsPerResource variables
		spellID = spellID || overrideSpellID
		section = section || 1;
		if(!spellID) {
			console.log("Null spellID", "EffectPointsPerResource", text);
			return "<err>";
		}
		const data = getSpellEffect(spellID, section);
		if(!data) {
			console.warn("Failed EffectPointsPerResource", text);
			return "<err>";
		}
		return data.EffectPointsPerResource;
	});
	text = text.replace(/\$(\d+)?q(\d+)?/g, (_, spellID, section) => { // EffectMiscValue variables
		spellID = spellID || overrideSpellID
		section = section || 1;
		if(!spellID) {
			console.log("Null spellID", "EffectMiscValue", text);
			return "<err>";
		}
		const data = getSpellEffect(spellID, section);
		if(!data) {
			console.warn("Failed EffectMiscValue", text);
			return "<err>";
		}
		return data.EffectMiscValue0;
	});
	text = text.replace(/\$(\d+)?[dD](\d+)?/g, (_, spellID) => { // Duration variables
		spellID = spellID || overrideSpellID
		if(!spellID) {
			console.log("Null spellID", "Duration", text);
			return "<err>";
		}
		const data = cacheData.spellmisc[spellID]
		if(!data) {
			console.log("Failed Duration", text);
			return "<err>";
		}
		if(data.DurationIndex === 0) { // Special edge case
			return "until cancelled";
		}
		try {
			return cacheData.spellduration[data.DurationIndex] / 1000 + " sec";
		} catch(_) {
			console.log("Failed Duration", text);
			return "<err>";
		}
	});
	text = text.replace(/\$(\d+)?[rR](\d+)?/g, (_, spellID) => { // Range variables
		spellID = spellID || overrideSpellID
		if(!spellID) {
			console.log("Null spellID", "Range", text);
			return "<err>";
		}
		const data = cacheData.spellmisc[spellID]
		if(!data) {
			console.log("Failed Range", text);
			return "<err>";
		}
		try {
			return cacheData.spellrange[data["RangeIndex" + type === "R" ? 0 : 1]];
		} catch(_) {
			console.log("Failed Range", text);
			return "<err>";
		}
	});
	text = text.replace(/\$(\d+)?[iI](\d+)?/g, (_, spellID) => { // SpellTargetRestrictions variables
		spellID = spellID || overrideSpellID
		if(!spellID) {
			console.log("Null spellID", "SpellTargetRestrictions", text);
			return "<err>";
		}
		try {
			let ret = "<err>";
			for(const data of cacheData.spelltargetrestrictions.filter(data => data.SpellID === spellID).sort((a, b) => a.DifficultyID - b.DifficultyID)) {
				if(data.DifficultyID === 0 || selectedDifficulty === "all" || difficulties[selectedDifficulty][data.DifficultyID]) {
					ret = data.MaxTargets;
				}
			}
			return ret;
		} catch(_) {
			console.log("Failed SpellTargetRestrictions", text);
			return "<err>";
		}
	});
	text = text.replace(/\$(\d+)?[uU](\d+)?/g, (_, spellID) => { // SpellAuraOptions variables
		spellID = spellID || overrideSpellID
		if(!spellID) {
			console.log("Null spellID", "SpellAuraOptions", text);
			return "<err>";
		}
		const data = cacheData.spellauraoptions[spellID]
		if(!data) {
			console.log("Failed SpellAuraOptions", text);
			return "<err>";
		}
		return data;
	});
	text = text.replace(/\${([^}]+)}/g, (repl, math) => { // Math
		math = math.replace(" sec", ""); // e.g. "30 sec*20"
		if(math.match(/^[\s\d().*/+-]+$/g)) { // Matches: Spaces, numbers, brackets, math operations
			return eval(math);
		}
		// Still needs variable support
		console.error("Invalid math: ", math, text);
		return repl;
	});
	text = text.replace(/\${(\d+)} \$[lL]([^:]+):([^;]+);/g, (_, amount, singular, plural) => { // Pluralization
		return amount + " " + (parseInt(amount) < 2 ? singular : plural);
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

function load() {
	// Expansions
	const expansionsElem = document.querySelector("#container div");
	cacheData.journaltier.reverse().map((data, index) => {
		expansionsElem.innerHTML += "\
			<input id=\"expansion-" + data.ID + "\" type=\"radio\" name=\"expansion\"" + (index === 0 ? "checked" : "") + ">\
			<label for=\"expansion-" + data.ID + "\" title=\"Expansion ID: " + data.ID + "\">" + data.Name_lang + "</label>\
			<div class=\"tabbed\"></div>";
	});
	// Instances
	cacheData.journaltierxinstance.map(data => {
		document.querySelector("#expansion-" + data.JournalTierID + " + label + div").innerHTML += "\
			<input id=\"instance-" + data.JournalInstanceID + "\" type=\"radio\" name=\"expansion-" + data.JournalTierID + "\">\
			<label for=\"instance-" + data.JournalInstanceID + "\" title=\"Instance ID: " + data.JournalInstanceID + "\"></label>\
			<div class=\"tabbed\"></div>";
	});
	const instanceXmapID = {};
	cacheData.journalinstance
		.filter(data => document.querySelector("#instance-" + data.ID + " + label"))
		.map(data => {
			instanceXmapID[data.ID] = data.MapID;
			document.querySelector("#instance-" + data.ID + " + label").innerHTML = data.Name_lang;
			if(data.Description_lang) {
				document.querySelector("#instance-" + data.ID + " + label + div").innerHTML += data.Description_lang;
			}
		});
	// Bosses
	const bosses = {},
		journalEncounter = cacheData.journalencounter.filter(data => data.JournalInstanceID !== 0);
	journalEncounter.sort((a, b) => a.OrderIndex - b.OrderIndex);
	journalEncounter.map(data => {
		if(!bosses[data.JournalInstanceID]) {
			bosses[data.JournalInstanceID] = [];
		}
		bosses[data.JournalInstanceID].splice(data.OrderIndex, 0, data);
	});
	const bossXinstance = {};
	Object.keys(bosses).map(instanceID => {
		const elem = document.querySelector("#instance-" + instanceID + " + label + div");
		Object.values(bosses[instanceID]).map(boss => {
			bossXinstance[boss.ID] = instanceID;
			elem.innerHTML += "\
				<input id=\"boss-" + boss.ID + "\" type=\"radio\" name=\"instance-" + boss.JournalInstanceID + "\">\
				<label for=\"boss-" + boss.ID + "\" title=\"Boss ID: " + boss.ID + "\">" + boss.Name_lang + "</label>\
				<div class=\"tabbed\">\
					<div>" + (boss.Description_lang || "") + "</div>\
				</div>";
		});
	});
	// Sections x Difficulty
	const sectionsXDifficulty = {};
	cacheData.journalsectionxdifficulty
		.map(data => {
			if(!sectionsXDifficulty[data.JournalEncounterSectionID]) {
				sectionsXDifficulty[data.JournalEncounterSectionID] = [];
			}
			sectionsXDifficulty[data.JournalEncounterSectionID].push(data.DifficultyID);
		});
	// Prepare spell stuff
	const mapXcontentTuning = [];
	cacheData.mapdifficulty
		.filter((data) => selectedDifficulty === "all" || difficulties[selectedDifficulty][data.DifficultyID])
		.map(data => {
			mapXcontentTuning[data.MapID] = data.ContentTuningID;
		});
	const conditionalTuning = [];
	cacheData.conditionalcontenttuning
		.map(data => {
			conditionalTuning[data.NormalTuning] = data.ReplacementTuning;
		});
	Object.keys(mapXcontentTuning)
		.map(mapID => {
			const tuneValue = conditionalTuning[mapXcontentTuning[mapID]];
			if(tuneValue) {
				mapXcontentTuning[mapID] = tuneValue;
			}
		});
	const statModsXtuningID = [];
	Object.entries(cacheData.contenttuningxexpected)
		.map(([k, v]) => {
			if(!statModsXtuningID[k]) {
				statModsXtuningID[k] = 1;
			}
			v.map(data => statModsXtuningID[k] *= cacheData.expectedstatmod[data]);
		});
	// Sections
	const store = {
		Overview:	{},
		Abilities:	{}
	}
	cacheData.journalencountersection
		.map(data => {
			if(data.Type === 3 && data.Flags !== 3) { // Overview
				if(!store.Overview[data.JournalEncounterID]) {
					store.Overview[data.JournalEncounterID] = [];
				}
				store.Overview[data.JournalEncounterID][data.OrderIndex] = data;
			} else if(data.IconCreatureDisplayInfoID === 0 || data.Type === 1 || data.Type === 2) { // Abilities: Header | Creature | spell
				if(!store.Abilities[data.JournalEncounterID]) {
					store.Abilities[data.JournalEncounterID] = [];
				}
				store.Abilities[data.JournalEncounterID][data.OrderIndex] = data;
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
						prevParent = 0,
						prevIndent = 0,
						siblings = [];
					Object.values(sectionStore[encounterID]).map(section => {
						if(section.ParentSectionID === 0) {
							siblings[section.ID] = 0;
						} else {
							siblings[section.ID] = siblings[section.ParentSectionID] + 1;
						}
						if(prevParent !== section.ParentSectionID) {
							if(siblings[section.ID] < prevIndent) {
								for(let i = 0; i < prevIndent - siblings[section.ID]; i++) {
									contents += "</ul>";
								}
							} else {
								contents += "<ul>";
							}
						}
						prevParent = section.ParentSectionID;
						prevIndent = siblings[section.ID];
						let shouldParse = false;
						const diffs = sectionsXDifficulty[section.ID];
						if(diffs) {
							for(const diff of diffs) {
								if(selectedDifficulty === "all" || difficulties[selectedDifficulty][diff]) {
									shouldParse = true;
								}
							}
						} else {
							shouldParse = true;
						}
						if(!shouldParse) {
							return;
						}
						const overviewParsed = sanityText(section.BodyText_lang);
						if(storeType === "Overview") {
							contents += elementIcons(section.IconFlags) + "<b>" + section.Title_lang + "</b> " + overviewParsed + "</li>";
						} else if(section.SpellID !== 0) { // Ability: Spell
							const spellID = section.SpellID;
							// 22025.363 = ExpectedStat.CreatureSpellDamage
							contents += elementIcons(section.IconFlags) + "<b><a href=\"https://" + builds[selectedBuild].link + "wowhead.com/spell=" + spellID + "\" data-wowhead=\"spell-" + spellID + "\">" + cacheData.spellname[spellID] + "</a></b> " + sanityText(cacheData.spell[spellID], spellID, 22025.363 * (statModsXtuningID[mapXcontentTuning[instanceXmapID[bossXinstance[encounterID]]]] || 1)) + overviewParsed + "</li>";
						} else {
							contents += elementIcons(section.IconFlags) + "<b>" + section.Title_lang + "</b> " + overviewParsed + "</li>";
						}
						prevParent = section.ParentSectionID;
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
	Array.from(document.querySelectorAll("input:not([id=themeMode])")).map(element => {
		element.onclick = (event) => {
			const elem = event.target;
			if(elem.checked && elem.getAttribute("id") !== selectedTab) {
				selectedTab = elem.getAttribute("id");
				setHash();
			}
		}
	});
	// Render the cached tab
	if(selectedTab !== "") {
		let selector = selectedTab;
		while(true) { // eslint-disable-line no-constant-condition
			let target = document.querySelector("#" + selector);
			if(!target) {
				break;
			}
			target.checked = true;
			const name = target.getAttribute("name");
			if(name === "expansion") { // Top level
				break;
			}
			selector = name;
		}
	}
	document.getElementById("loading").style.display = "none";
}

(() => {
	const lightCSSselector = document.querySelector("link[title=lightMode]"),
		lightCSS = lightCSSselector.sheet || lightCSSselector.styleSheet;
	lightCSS.disabled = localStorage.lightMode !== "true";

	if(location.hash === "" && localStorage.hash) {
		location.hash = localStorage.hash;
	}

	const themeSwitch = document.getElementById("themeMode");
	themeSwitch.checked = localStorage.lightMode !== "true";
	themeSwitch.onchange = () => {
		lightCSS.disabled = themeSwitch.checked;
		localStorage.lightMode = !themeSwitch.checked;
	}

	const hashData = {};
	for(const hashDat of location.hash.substr(1).split("&")) {
		const values = hashDat.split("=");
		hashData[values[0]] = values[1];
	}

	selectedBuild = hashData["build"] || selectedBuild;
	selectedDifficulty = hashData["difficulty"] || selectedDifficulty;
	selectedTab = hashData["tab"] || selectedTab;

	const versionDropdown = document.getElementById("version"),
		difficultyDropdown = document.getElementById("difficulty");

	versionDropdown.onchange = () => {
		selectedBuild = versionDropdown.value;
		setHash();
		location.reload();
	};
	Object.keys(builds).map(build => {
		versionDropdown.options[versionDropdown.options.length] = new Option(builds[build].name, build);
		if(selectedBuild === build) {
			versionDropdown.value = build;
		}
	});

	difficultyDropdown.onchange = () => {
		selectedDifficulty = difficultyDropdown.value;
		setHash();
		location.reload();
	};
	Object.keys(difficulties).map(difficulty => {
		difficultyDropdown.options[difficultyDropdown.options.length] = new Option(difficulty.charAt(0).toUpperCase() + difficulty.slice(1), difficulty);
		if(selectedDifficulty === difficulty) {
			difficultyDropdown.value = difficulty;
		}
	});

	fetch("cache/" + selectedBuild + ".json")
		.then(response => response.json())
		.then(data => {
			cacheData = data;
			document.title = "Journal Viewer - " + data['build']
		})
		.then(() => load());
})();