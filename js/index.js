let latestBuild

const sectionIcons = {
	// Tank
	"Tank":				"tank",
	"Tanks": 			"tank",
	// Healer
	"Healer":			"healer",
	"Healers":			"healer",
	// Damage
	"Damage":			"damage",
	"Damage Dealers":	"damage"
}
let spellHeaderSpellID, spellHeaderEffectIndex, spellHeaderEffectBasePointsF;

function sanityText(text) {
	text = text.replace(/\$bullet;/g, "<br>&bull; "); // New line
	text = text.replace(/\|cFF([a-z0-9]+)\|Hspell:([0-9]+)\s?\|h([^|]+)\|h\|r/gi, " <a style=\"color: #$1;\" href=\"https://ptr.wowhead.com/spell=$2\" data-wowhead=\"spell-$2\">$3</a>"); // Spell tooltips
	text = text.replace(/\$\[[0-9,]+(?:[\s\n]+)?(.*?)\$]/g, "$1"); // Ignored difficulty text
	text = text.replace(/\$\[![0-9,]+(?:[\s\n]+)?(.*?)\$]/g, "<p class=\"iconsprite warning\">$1</p>"); // Difficulty warning text
	text = text.replace(/\$(\d+)s(\d+)/g, function(_, spellID, section) { // SpellEffect variables
		const req = new XMLHttpRequest();
		req.open("GET", "https://wow.tools/dbc/api/data/spelleffect/?build=" + latestBuild + "&draw=1&length=1&start=0&columns[" + spellHeaderSpellID + "][search][value]=" + spellID + "&columns[" + spellHeaderEffectIndex + "][search][value]=" + (parseInt(section) - 1), false);
		req.send(null);
		return JSON.parse(req.responseText).data[0][spellHeaderEffectBasePointsF];
	});
	return text;
}

function initBossSections() {
	// Parse boss sections
	const sections = {}
	Papa.parse("https://wow.tools/dbc/api/export/?name=journalencountersection&build=" + latestBuild, {
		download:		true,
		delimiter:		",",
		skipEmptyLines:	true,
		complete:		function(data) {
			for(let i = 1; i < data.data.length; i++) {
				const dat = data.data[i];
				if(dat[8] !== "3" || dat[13] === "3") {
					continue;
				}
				if(typeof(sections[dat[3]]) === "undefined") {
					sections[dat[3]] = [];
				}
				sections[dat[3]][dat[4]] = dat;
			}
			for(let [encounterID, sectionz] of Object.entries(sections)) {
				const elem = document.querySelector("#boss-" + encounterID + " + label + div");
				if(elem == null) {
					continue;
				}
				let contents	= "<ul>",
					prevParent	= "0",
					checking	= false;
				// noinspection JSCheckFunctionSignatures
				for(let section of Object.values(sectionz)) {
					if(prevParent !== section[5]) {
						if(checking) {
							contents += "</ul>";
						} else {
							contents += "<ul>";
						}
						checking = true;
					}
					if(typeof(sectionIcons[section[1]]) !== "undefined") {
						contents += "<li class=\"iconsprite " + sectionIcons[section[1]] + "\">";
					} else {
						contents += "<li>";
					}
					contents += "<b>" + section[1] + "</b> " + sanityText(section[2]) + "</li>";
					prevParent = section[5];
				}
				contents += "</ul>";
				elem.innerHTML += contents;
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
			for(let [instanceID, bossz] of Object.entries(bosses)) {
				const elem = document.querySelector("#instance-" + instanceID + " + label + div");
				// noinspection JSCheckFunctionSignatures
				for(let boss of Object.values(bossz)) {
					elem.innerHTML += "\
					<input id=\"boss-" + boss[0] + "\" type=\"radio\" name=\"instance-" + boss[5] + "\">\
					<label for=\"boss-" + boss[0] + "\">" + boss[1] + "</label>\
					<div>\
						" + boss[2] + "\
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
		spellHeaderSpellID				= data.headers.indexOf('SpellID');
		spellHeaderEffectIndex			= data.headers.indexOf('EffectIndex');
		spellHeaderEffectBasePointsF	= data.headers.indexOf('EffectBasePointsF');
		initExpansions();
	}
	spellEffectsReq.open("GET", "https://wow.tools/dbc/api/header/spelleffect/?build=" + latestBuild, true);
	spellEffectsReq.send(null);
}

const buildsReq = new XMLHttpRequest()
buildsReq.onreadystatechange = function() {
	if(buildsReq.readyState !== 4) {
		return;
	}
	latestBuild = JSON.parse(buildsReq.responseText)["wow_beta"]
	initSpellEffects();
}
buildsReq.open("GET", "https://wow.tools/api.php?type=latestbuilds", true);
buildsReq.send(null);