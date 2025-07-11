let
	selectedBuild = undefined,
	selectedBuild2 = undefined,
	selectedDifficulty = 'mythic',
	selectedTab = '',
	shouldDiff = false;

const fetchFromWago = async (endpoint) => await(fetch(wagoPath + endpoint).then(data => data.json()));

// Load data
let apiBuilds, instances, instanceData = {
	// Just to silence 'undefined' warnings
	'conditionalcontenttuning': {'NormalTuning':null, 'ReplacementTuning':null},
	'contenttuningxexpected': null,
	'expectedstatmod': null,
	'journalencounter': {'ID':null, 'Name_lang':null, 'Description_lang':null, 'JournalInstanceID':null, 'OrderIndex':null},
	'journalencountersection': {'ID':null, 'BodyText_lang':null, 'Title_lang':null, 'Type':null, 'JournalEncounterID':null, 'OrderIndex':null, 'IconCreatureDisplayInfoID':null, 'SpellID':null, 'ParentSectionID':null, 'IconFlags':null},
	'journalinstance': {'ID':null, 'Name_lang':null, 'Description_lang':null, 'MapID':null},
	'journalsectionxdifficulty': {'ID':null, 'DifficultyID':null, 'JournalEncounterSectionID':null},
	'journaltier': {'ID':null, 'Name_lang':null},
	'journaltierxinstance': {'JournalTierID':null, 'JournalInstanceID':null},
	'mapdifficulty': {'DifficultyID':null, 'ContentTuningID':null, 'MapID':null},
	'spell': {'Description_lang':null, 'AuraDescription_lang':null},
	'spellauraoptions': {'CumulativeAura':null, 'ProcCharges':null, 'ProcChance':null},
	'spellduration': null,
	'spelleffect': {'DifficultyID':null, 'EffectAura':null, 'Effect':null, 'EffectAmplitude':null, 'EffectAuraPeriod':null, 'EffectChainAmplitude':null, 'EffectChainTargets':null, 'EffectPointsPerResource':null, 'EffectBasePointsF':null, 'EffectMiscValue_0':null, 'EffectRadiusIndex_0':null, 'EffectRadiusIndex_1':null},
	'spellmisc': {'DurationIndex':null, 'RangeIndex':null},
	'spellpower': {'ManaCost':null},
	'spellname': null,
	'spellradius': [null,null],
	'spellrange': {'ID':null, 'RangeMin_0':null, 'RangeMax_0':null},
	'spelltargetrestrictions': {'DifficultyID':null, 'MaxTargets':null, 'SpellID':null},
	'statMultiplier': null,
}, instanceDataOld = instanceData;

const
	wagoPath = 'https://wago.tools/api/',
	wowheadPath = {
		'wow': 'wowhead.com',
		'wowt': 'wowhead.com/ptr',
		'wowxptr': 'wowhead.com/ptr-2',
		'wow_beta': 'wowhead.com/beta',
	},
	difficulties = {
		'all':		{},
		'LFR':		{
			'7':	true,
			'17':	true
		},
		'normal':	{
			'1':	true,
			'14':	true
		},
		'heroic':	{
			'2':	true,
			'15':	true
		},
		'mythic':	{
			'16':	true,
			'23':	true
		}
	},
	iconFlags = {
		1:		'tank',
		2:		'damage',
		4:		'healer',
		8:		'heroic',
		16:		'deadly',
		32:		'important',
		64:		'interruptible',
		128:	'magic',
		256:	'curse',
		512:	'poison',
		1024:	'disease',
		2048:	'enrage',
		4096:	'mythic',
		8192:	'bleed'
	},
	errorText = '<span class="error">&lt;error&gt;</span>';

const setHash = () => {
	let hash = '#';
	if (selectedBuild) {
		hash += 'build=' + selectedBuild.version;
	}
	if (selectedBuild2) {
		if (hash !== '#') {
			hash += '&';
		}
		hash += 'build2=' + selectedBuild2.version;
	}
	if (selectedDifficulty !== 'mythic') {
		if (hash !== '#') {
			hash += '&';
		}
		hash += 'difficulty=' + selectedDifficulty;
	}
	if (selectedTab !== '') {
		if (hash !== '#') {
			hash += '&';
		}
		hash += 'tab=' + selectedTab;
	}
	if (hash === '#') {
		return;
	}
	location.hash = hash;
	localStorage.hash = location.hash;
}

const getSpellEffect = (cacheData, spellID, section) => {
	let data, sectionID = parseInt(section) - 1;
	const diffIter = Object.keys(difficulties[selectedDifficulty]);
	diffIter.push('0');
	for (let i = 0; i <= 1; i++) {
		if (i === 1) { // 0 = normal sectionID, 1 = fallback to 0
			sectionID = 0;
		}
		for (let difficultyID of diffIter) {
			data = cacheData.spelleffect[spellID + '-' + sectionID + '-' + difficultyID];
			if (data) {
				return data;
			}
		}
	}
}

const sanityText = (cacheData, text, overrideSpellID, spellMultiplier) => {
	if (! text) {
		return '';
	}
	let prevSpellID, lastVar;
	text = text.replaceAll(/\$bullet;/ig, '<br>&bull; '); // New line
	text = text.replaceAll(/\|cFF([a-z\d]+)\|Hspell:\s?(\d+)[\s.]*\|h([^|]+)\|h\|r/ig, " <a style=\"color: #$1;\" href=\"https://" + wowheadPath[selectedBuild['product'] || 'wow'] + "/spell=$2\" data-wowhead=\"spell-$2\">$3</a>"); // Spell tooltips
	text = text.replaceAll(/\$\[([\d, ]+)(?:[\s\n\r]+)?(.*?)\$]/gs, (_, diffs, txt) => { // Difficulty specific
		for (const diff of diffs.split(',')) {
			if (selectedDifficulty === 'all' || difficulties[selectedDifficulty][diff.trim()]) {
				return txt;
			}
		}
		return '';
	});
	text = text.replaceAll(/\$\[!([\d, ]+)(?:[\s\n\r]+)?(.*?)\$]/gs, (_, diffs, txt) => { // Dificulty specific WARNING
		for (const diff of diffs.split(',')) {
			if (selectedDifficulty === 'all') {
				for (const difficulty of Object.keys(difficulties)) {
					if (difficulties[difficulty][diff.trim()]) {
						return "<p class=\"iconsprite warning\"><b>(" + difficulty + ") </b>" + txt + "</p>"
					}
				}
			}
			if (difficulties[selectedDifficulty][diff.trim()]) {
				return "<p class=\"iconsprite warning\">" + txt + "</p>";
			}
		}
		return '';
	});
	text = text.replaceAll(/\$?@?spellicon(\d+)/ig, ''); // SpellIcon variable - remove it.
	text = text.replaceAll(/\$?@?spelltooltip(\d+)/ig, ''); // SpellTooltip variable - remove it.
	text = text.replaceAll(/\$?@?spellname(\d+)/ig, (_, spellID) => // SpellName variable
		"<a href=\"https://" + wowheadPath[selectedBuild['product'] || 'wow'] + "/spell=" + spellID + "\" data-wowhead=\"spell-" + spellID + "\">" + cacheData.spellname[spellID] + "</a>"
	);
	text = text.replaceAll(/\$?@?spelldesc(\d+)/ig, (_, spellID) => // SpellDesc variable
		sanityText(cacheData, cacheData.spell[spellID]?.Description_lang, spellID, spellMultiplier)
	);
	text = text.replaceAll(/\$?@?spellaura(\d+)/ig, (_, spellID) => // SpellAura variable
		sanityText(cacheData, cacheData.spell[spellID]?.AuraDescription_lang, spellID, spellMultiplier)
	);
	text = text.replaceAll(/\$\?((?:(?:\$\?)?\|?diff[\d|,]+?)+)(?:[\s\n\r]+)?(\[[^\]]+]|\[])(?:[\s\n\r]+)?(\?((?:\|?diff[\d|,]+?)+)(?:[\s\n\r]+)?(\[[^\]]+]|\[]))?(\[[^\]]+]|\[])?/ig, (_1, diffs, matchT, _2, diffs2, matchT2, matchF) => {
		if (! matchF) {
			matchF = '[]';
		}
		if (selectedDifficulty === 'all') {
			let diffz = '';
			for (const diff of diffs.split(/[|,]/)) {
				for (const difficulty of Object.keys(difficulties)) {
					if (difficulties[difficulty][diff.replaceAll(/diff/ig, '').trim()]) {
						diffz += difficulty + '/';
						break;
					}
				}
			}
			diffz = diffz.substring(0, diffz.length - 1);
			let diffz2 = '';
			if (diffs2 !== undefined) {
				for (const diff of diffs2.split(/[|,]/)) {
					for (const difficulty of Object.keys(difficulties)) {
						if (difficulties[difficulty][diff.replaceAll(/diff/ig, '').trim()]) {
							diffz2 += difficulty + '/';
							break;
						}
					}
				}
				diffz2 = diffz2.substring(0, diffz2.length - 1);
			}
			let matchFF = matchF.substring(1, matchF.length - 1).trim();
			if (matchFF !== '' && matchFF !== '.') {
				matchFF = "<b> (Other) </b>" + matchFF;
			}
			let out = '<i> ';
			out += "<b>(" + diffz + ") </b>" + matchT.substring(1, matchT.length - 1);
			if (diffz2 !== "") {
				out += " <b>(" + diffz2 + ") </b>" + matchT2.substring(1, matchT2.length - 1);
			}
			out += matchFF + '</i>';
			return out;
		}
		for (const diff of diffs.split(/[|,]/)) {
			if (difficulties[selectedDifficulty][diff.replaceAll(/diff/ig, '').trim()]) {
				return matchT.substring(1, matchT.length - 1);
			}
		}
		if (diffs2 !== undefined) {
			for (const diff of diffs2.split(/[|,]/)) {
				if (difficulties[selectedDifficulty][diff.replaceAll(/diff/ig, '').trim()]) {
					return matchT2.substring(1, matchT2.length - 1);
				}
			}
		}
		return matchF.substring(1, matchF.length - 1);
	});
	text = text.replaceAll(/\$(\d+)?[mMsSwW](\d+)?/g, (f, spellID, section) => { // SpellEffect variables
		spellID = spellID || overrideSpellID || prevSpellID;
		section = section || 1;
		prevSpellID = spellID;
		if (!spellID) {
			console.log('Null spellID', 'SpellEffect', text);
			return errorText;
		}
		const data = getSpellEffect(cacheData, spellID, section);
		if (!data) {
			console.log('Failed SpellEffect', text);
			return errorText;
		}
		if (data.Effect === 2 || (data.Effect === 6 && (data.EffectAura === 3 || data.EffectAura === 301))) {
			lastVar = Math.round(Math.abs(spellMultiplier * data.EffectBasePointsF / 100)).toLocaleString()
			return lastVar;
		}
		lastVar = Math.abs(data.EffectBasePointsF).toLocaleString()
		return lastVar;
	});
	text = text.replaceAll(/\$(\d+)?[eE](\d+)?/g, (_, spellID, section) => { // EffectAmplitude variables
		spellID = spellID || overrideSpellID || prevSpellID;
		section = section || 1;
		prevSpellID = spellID;
		if (!spellID) {
			console.log('Null spellID', 'EffectAmplitude', text);
			return errorText;
		}
		const data = getSpellEffect(cacheData, spellID, section);
		if (!data) {
			console.log('Failed EffectAmplitude', text);
			return errorText;
		}
		return data.EffectAmplitude.toLocaleString();
	});
	text = text.replaceAll(/\$(\d+)?o(\d+)?/g, (_, spellID, section) => { // AuraDamage variable
		spellID = spellID || overrideSpellID || prevSpellID;
		section = section || 1;
		prevSpellID = spellID;
		if (!spellID) {
			console.log('Null spellID', 'AuraDamage', text);
			return errorText;
		}
		const data = getSpellEffect(cacheData, spellID, section);
		if (!data) {
			console.log('Failed AuraDamage (SpellEffect)', text);
			return errorText;
		}
		const data2 = cacheData.spellmisc[spellID]
		if (!data2) {
			console.log('Failed AuraDamage2 (SpellMisc)', text);
			return errorText;
		}
		try {
			return Math.round(Math.abs(spellMultiplier * data.EffectBasePointsF / 100) * ((cacheData.spellduration[data2.DurationIndex] / 1000) / (data.EffectAuraPeriod / 1000))).toLocaleString();
		} catch (_) {
			console.log('Failed AuraDamage (SpellDuration)', text);
			return errorText;
		}
	});
	text = text.replaceAll(/\$(\d+)?([aA])(\d+)?/g, (_, spellID, type, section) => { // Radius variables
		spellID = spellID || overrideSpellID || prevSpellID;
		section = section || 1;
		prevSpellID = spellID;
		if (!spellID) {
			console.log('Null spellID', "Radius", text);
			return errorText;
		}
		const data = getSpellEffect(cacheData, spellID, section);
		if (!data) {
			console.log('Failed EffectRadiusIndex', text);
			return errorText;
		}
		let radiusIndex = data['EffectRadiusIndex_' + (type === 'a' ? 0 : 1)];
		if (radiusIndex === 0) {
			radiusIndex = data['EffectRadiusIndex_' + (type === 'a' ? 1 : 0)];
		}
		if (radiusIndex === 0) {
			console.log('Failed EffectRadiusIndex (both radius indexes returned 0)', text);
			return 0; // Match WoWhead logic
		}
		return cacheData.spellradius[radiusIndex].toLocaleString();
	});
	text = text.replaceAll(/\$(\d+)?[tT](\d+)?/g, (_, spellID, section) => { // Time variables
		spellID = spellID || overrideSpellID || prevSpellID;
		section = section || 1;
		prevSpellID = spellID;
		if (!spellID) {
			console.log('Null spellID', 'Time', text);
			return errorText;
		}
		const data = getSpellEffect(cacheData, spellID, section);
		if (!data) {
			console.log('Failed EffectAuraPeriod', text);
			return errorText;
		}
		return (data.EffectAuraPeriod / 1000).toLocaleString();
	});
	text = text.replaceAll(/\$(\d+)?[xX](\d+)?/g, (_, spellID, section) => { // EffectChainTargets variables
		spellID = spellID || overrideSpellID || prevSpellID;
		section = section || 1;
		prevSpellID = spellID;
		if (!spellID) {
			console.log('Null spellID', 'EffectChainTargets', text);
			return errorText;
		}
		const data = getSpellEffect(cacheData, spellID, section);
		if (!data) {
			console.warn('Failed EffectChainTargets', text);
			return errorText;
		}
		return data.EffectChainTargets.toLocaleString();
	});
	text = text.replaceAll(/\$(\d+)?[fF](\d+)?/g, (_, spellID, section) => { // EffectChainAmplitude variables
		spellID = spellID || overrideSpellID || prevSpellID;
		section = section || 1;
		prevSpellID = spellID;
		if (!spellID) {
			console.log('Null spellID', 'EffectChainAmplitude', text);
			return errorText;
		}
		const data = getSpellEffect(cacheData, spellID, section);
		if (!data) {
			console.warn('Failed EffectChainAmplitude', text);
			return errorText;
		}
		return data.EffectChainAmplitude.toLocaleString();
	});
	text = text.replaceAll(/\$(\d+)?[bB](\d+)?/g, (_, spellID, section) => { // EffectPointsPerResource variables
		spellID = spellID || overrideSpellID || prevSpellID;
		section = section || 1;
		prevSpellID = spellID;
		if (!spellID) {
			console.log('Null spellID', 'EffectPointsPerResource', text);
			return errorText;
		}
		const data = getSpellEffect(cacheData, spellID, section);
		if (!data) {
			console.warn('Failed EffectPointsPerResource', text);
			return errorText;
		}
		return data.EffectPointsPerResource.toLocaleString();
	});
	text = text.replaceAll(/\$(\d+)?[qQ](\d+)?/g, (_, spellID, section) => { // EffectMiscValue variables
		spellID = spellID || overrideSpellID || prevSpellID;
		section = section || 1;
		prevSpellID = spellID;
		if (!spellID) {
			console.log('Null spellID', 'EffectMiscValue', text);
			return errorText;
		}
		const data = getSpellEffect(cacheData, spellID, section);
		if (!data) {
			console.warn('Failed EffectMiscValue', text);
			return errorText;
		}
		return data['EffectMiscValue_0'].toLocaleString();
	});
	text = text.replaceAll(/\$(\d+)?[dD](\d+)?/g, (_, spellID) => { // Duration variables
		spellID = spellID || overrideSpellID || prevSpellID;
		prevSpellID = spellID;
		if (!spellID) {
			console.log('Null spellID', 'Duration', text);
			return errorText;
		}
		const data = cacheData.spellmisc[spellID]
		if (!data) {
			console.log('Failed Duration', text);
			return errorText;
		}
		if (data.DurationIndex === 0) { // Special edge case
			return 'until cancelled';
		}
		try {
			return (cacheData.spellduration[data.DurationIndex] / 1000).toLocaleString() + " sec";
		} catch (_) {
			console.log('Failed Duration', text);
			return errorText;
		}
	});
	text = text.replaceAll(/\$(\d+)?[cC](\d+)?/g, (_, spellID) => { // SpellPower variables
		spellID = spellID || overrideSpellID || prevSpellID;
		prevSpellID = spellID;
		if (!spellID) {
			console.log('Null spellID', 'SpellPower', text);
			return errorText;
		}
		const data = cacheData.spellpower?.[spellID];
		if (!data) {
			console.log('Failed SpellPower', text);
			return errorText;
		}
		return data.ManaCost.toLocaleString();
	});
	text = text.replaceAll(/\$(\d+)?([rR])(\d+)?/g, (_, spellID, type) => { // Range variables
		spellID = spellID || overrideSpellID || prevSpellID;
		prevSpellID = spellID;
		if (!spellID) {
			console.log('Null spellID', 'Range', text);
			return errorText;
		}
		const data = cacheData.spellmisc[spellID];
		if (!data) {
			console.log('Failed Range', text);
			return errorText;
		}
		try {
			return cacheData.spellrange[data.RangeIndex][type === "r" ? 1 : 0].toLocaleString();
		} catch (_) {
			console.log('Failed Range', text);
			return errorText;
		}
	});
	text = text.replaceAll(/\$(\d+)?[iI](\d+)?/g, (_, spellID) => { // SpellTargetRestrictions variables
		spellID = parseInt(spellID) || overrideSpellID || prevSpellID;
		prevSpellID = spellID;
		if (!spellID) {
			console.log('Null spellID', 'SpellTargetRestrictions', text);
			return errorText;
		}
		try {
			let ret = errorText;
			for (const data of cacheData.spelltargetrestrictions.filter(data => data.SpellID === spellID).sort((a, b) => a.DifficultyID - b.DifficultyID)) {
				if (data.DifficultyID === 0 || selectedDifficulty === 'all' || difficulties[selectedDifficulty][data.DifficultyID]) {
					ret = data.MaxTargets;
				}
			}
			return ret.toLocaleString();
		} catch (_) {
			console.log('Failed SpellTargetRestrictions', text);
			return errorText;
		}
	});
	text = text.replaceAll(/\$(\d+)?[uU](\d+)?/g, (_, spellID) => { // MaxStacks variables
		spellID = spellID || overrideSpellID || prevSpellID;
		prevSpellID = spellID;
		if (!spellID) {
			console.log('Null spellID', 'MaxStacks', text);
			return errorText;
		}
		const data = cacheData.spellauraoptions[spellID]
		if (!data) {
			console.log('Failed MaxStacks', text);
			return errorText;
		}
		return data.CumulativeAura.toLocaleString();
	});
	text = text.replaceAll(/\$(\d+)?[hH](\d+)?/g, (_, spellID) => { // ProcChance variables
		spellID = spellID || overrideSpellID || prevSpellID;
		prevSpellID = spellID;
		if (!spellID) {
			console.log('Null spellID', 'ProcChance', text);
			return errorText;
		}
		const data = cacheData.spellauraoptions[spellID]
		if (!data) {
			console.log('Failed ProcChance', text);
			return errorText;
		}
		return data.ProcChance.toLocaleString();
	});
	text = text.replaceAll(/\$(\d+)?[nN](\d+)?/g, (_, spellID) => { // ProcCharges variables
		spellID = spellID || overrideSpellID || prevSpellID;
		prevSpellID = spellID;
		if (!spellID) {
			console.log('Null spellID', 'ProcCharges', text);
			return errorText;
		}
		const data = cacheData.spellauraoptions[spellID]
		if (!data) {
			console.log('Failed ProcCharges', text);
			return errorText;
		}
		return data.ProcCharges.toLocaleString();
	});
	text = text.replaceAll('$pri', '<stat>');
	text = text.replaceAll(/\${([^}]+)}(\.\d+)?/g, (repl, math, precision) => { // Math
		math = math.replaceAll(' sec', '').replaceAll(',', ''); // e.g. "30 sec*20"
		precision = precision?.replaceAll('.', '') ?? 2;
		try {
			if (math.match(/^[\s\d().*/+-]+$/g)) { // Matches: Spaces, numbers, brackets, math operations
				return eval(math).toLocaleString(undefined, { maximumFractionDigits: precision });
			}
		} catch (_) {
			// Do nothing
		}
		// Still needs variable support
		console.error('Invalid math: ', math, text);
		return repl.toLocaleString();
	});
	text = text.replaceAll(/(\d+).*? \$[lL]([^:]+):([^;]+);/g, (_, amount, singular, plural) => // Pluralization
		amount + " " + (parseInt(amount) < 2 ? singular : plural)
	);
	text = text.replaceAll(/\|4([^:]+):([^;]+);/g, (_, singular, plural) => // Previous variable pluralization
		parseInt(lastVar) < 2 ? singular : plural
	);
	text = text.replaceAll(/\|5\s?(<[^>]+>)?([a-zA-Z])/g, (_, link, nextLetter) => // A vs AN
		(['a', 'e', 'i', 'o', 'u'].indexOf(nextLetter.toLowerCase()) !== -1 ? 'an ' : 'a ') + link + nextLetter
	);
	const unmatchedItems = [...text.matchAll(/\$(\d+)?[a-zA-Z](\d+)?/g)]
	if (unmatchedItems.length > 0) {
		console.warn('Unmatched items: ', overrideSpellID, unmatchedItems[0]);
	}
	return text;
}

const elementIcons = (bit) => {
	bit = parseInt(bit);
	if (bit === 0) {
		return '<li>';
	}
	let ret = '<li>';
	Object.keys(iconFlags)
		.filter(bitKey => bit & bitKey)
		.map(bitKey => ret += `<span class="iconsprite ${iconFlags[bitKey]}"></span> `);
	return ret;
}

const instanceXmapID = {},
	bossXinstance = {};
const loadInstances = async () => {
	// Expansions
	const expansionsElem = document.querySelector("#container div");
	instances.journaltier.map((data, index) => {
		expansionsElem.innerHTML += `
			<input id="expansion-${data.ID}" type="radio" name="expansion" ${(index === 0 ? 'checked' : '')}">
			<label for="expansion-${data.ID}" title="Expansion ID: ${data.ID}">${data.Name_lang}</label>
			<div class="tabbed"></div>`;
	});

	// Instances
	Object.keys(instances.journaltierxinstance).map(tierID => {
		instances.journaltierxinstance[tierID].map(instanceID => {
			document.querySelector(`#expansion-${tierID} + label + div`).innerHTML += `
			<input class="instance-${instanceID}" id="instance-${tierID}-${instanceID}" type="radio" name="expansion-${tierID}" data-instance="${instanceID}">
			<label for="instance-${tierID}-${instanceID}" title="Instance ID: ${instanceID}"></label>
			<div class="tabbed"></div>`;
		});
	});
	instances.journalinstance
		.filter(data => document.querySelector(`.instance-${data.ID} + label`))
		.map(data => {
			instanceXmapID[data.ID] = data.MapID;
			[...document.querySelectorAll(`.instance-${data.ID} + label`)].map(elem => elem.innerHTML = data.Name_lang);
			if (data.Description_lang) {
				[...document.querySelectorAll(`.instance-${data.ID} + label + div`)].map(elem => elem.innerHTML += `<span>${data.Description_lang}</span>`);
			}
		});

	// Bosses
	let count = 0;
	Object.values(instances.journalencounter).map(boss => {
		const elems = [...document.querySelectorAll(`.instance-${boss.JournalInstanceID} + label + div`)];
		bossXinstance[boss.ID] = boss.JournalInstanceID;
		elems.map(elem => {
			const name = elem.parentElement.querySelector(`.instance-${boss.JournalInstanceID}`).id;
			count += 1;
			elem.innerHTML += `
				<input class="boss-${boss.ID}" id="boss-${count}-${boss.ID}" type="radio" name="${name}">
				<label for="boss-${count}-${boss.ID}" title="Boss ID: ${boss.ID}">${boss.Name_lang}</label>
				<div class="tabbed">
					<div>${(boss.Description_lang || '')}</div>
				</div>`;
		});
	});
}

const loadInstance = () => {
	// Sections x Difficulty
	const sectionsXDifficulty = {};
	instanceData.journalsectionxdifficulty
		.map(data => {
			if (!sectionsXDifficulty[data.JournalEncounterSectionID]) {
				sectionsXDifficulty[data.JournalEncounterSectionID] = [];
			}
			sectionsXDifficulty[data.JournalEncounterSectionID].push(data.DifficultyID);
		});
	// Prepare spell stuff
	const mapXcontentTuning = [];
	instanceData.mapdifficulty
		.filter((data) => selectedDifficulty === 'all' || difficulties[selectedDifficulty][data.DifficultyID])
		.map(data => {
			mapXcontentTuning[data.MapID] = data.ContentTuningID;
		});
	const conditionalTuning = instanceData.conditionalcontenttuning;
	Object.keys(mapXcontentTuning)
		.map(mapID => {
			const tuneValue = conditionalTuning[mapXcontentTuning[mapID]];
			if (tuneValue) {
				mapXcontentTuning[mapID] = tuneValue;
			}
		});
	const statModsXtuningID = [];
	Object.entries(instanceData.contenttuningxexpected)
		.map(([k, v]) => {
			if (!statModsXtuningID[k]) {
				statModsXtuningID[k] = 1;
			}
			v.map(data => statModsXtuningID[k] *= instanceData.expectedstatmod[data]);
		});

	// Sections
	const store = {
		Overview:			{},
		OverviewRemoved:	{},
		Abilities:			{},
		AbilitiesRemoved:	{},
	}
	const oldStore = {};
	let JournalEncounterSection = instanceData.journalencountersection;
	if(shouldDiff) {
		instanceDataOld.journalencountersection
			.map(data => {
				oldStore[data.ID] = data;
			});
		instanceDataOld.journalencountersection.map(e => {
			if (JournalEncounterSection.filter(section => section.ID === e.ID).length < 1) {
				e.isRemoved = true;
				JournalEncounterSection.push(e);
			}
		});
	}

	JournalEncounterSection
		.map(data => {
			if (
				(
					data.Title_lang === 'Overview' ||
					data.Title_lang === 'Tanks' ||
					data.Title_lang === 'Tank' ||
					data.Title_lang === 'Damage Dealers' ||
					data.Title_lang === 'Damage Dealer' ||
					data.Title_lang === 'DPS' ||
					data.Title_lang === 'Healers' ||
					data.Title_lang === 'Healer'
				) ||
				(
					data.Type === 3 && // Overview
					![
						22119, 22523,               // Bugfix: Sire Denathrius' Private Collection
						25040, 25061, 25064, 25068, // Bugfix: Vault of the Incarnates -> Kurog Grimtotem -> Altars
						25638,						// Bugfix: Vault of the Incarnates -> Raszageth the Storm-Eater -> Primality Forces
						27288, 27282, 27278,		// Bugfix: Amirdrassil, the Dream's Hope -> Torments
						28164, 28334, 28344,		// Bugfix: Amirdrassil, the Dream's hope -> Gnarlroot -> Tainted Flora
						28216,						// Bugfix: Throne of the Tides -> Lady Naz'jar -> Elite Guard
						28845,						// Bugfix: Nerub-ar Palace -> Ulgrax the Devourer -> Gnawing Frenzy
					].includes(data.ID)
				)
			) {
				let storeType = 'Overview';
				if (data.isRemoved) {
					storeType += 'Removed';
				}
				if (! store[storeType][data.JournalEncounterID]) {
					store[storeType][data.JournalEncounterID] = [];
				}
				store[storeType][data.JournalEncounterID][data.OrderIndex] = data;
			} else { // Abilities: Header | Creature | Spell
				let storeType = 'Abilities';
				if (data.isRemoved) {
					storeType += 'Removed';
				}
				if (! store[storeType][data.JournalEncounterID]) {
					store[storeType][data.JournalEncounterID] = [];
				}
				store[storeType][data.JournalEncounterID][data.OrderIndex] = data;
			}
		});

	let count = 0;
	Object.keys(store.Overview).concat(Object.keys(store.Abilities))
		.filter((encounterID, index, self) => self.indexOf(encounterID) === index && document.querySelector(`.boss-${encounterID} + label + div`))
		.map(encounterID => {
			const elems = [...document.querySelectorAll(`.boss-${encounterID} + label + div`)];
			Object.keys(store)
				.filter(storeType => store[storeType][encounterID] && (storeType === 'Overview' || storeType === 'Abilities'))
				.map(storeType => {
					let sectionStore = store[storeType],
						contents = '<ul>',
						prevParent = 0,
						prevIndent = 0,
						siblings = [],
						parents = [];
					Object.values(sectionStore[encounterID]).map(section => {
						parents[section.ID] = section.ParentSectionID;
						if (section.ParentSectionID === 0) {
							siblings[section.ID] = 0;
						} else {
							siblings[section.ID] = siblings[section.ParentSectionID] + 1;
						}
						let shouldParse = false;
						let diffs = sectionsXDifficulty[section.ID];
						if (!diffs) {
							let sectionID = section.ID;
							while(parents[sectionID]) {
								sectionID = parents[sectionID];
								if (sectionsXDifficulty[sectionID]) {
									diffs = sectionsXDifficulty[sectionID];
									break;
								}
							}
						}
						if (diffs) {
							for (const diff of diffs) {
								if (selectedDifficulty === 'all' || difficulties[selectedDifficulty][diff]) {
									shouldParse = true;
								}
							}
						} else {
							shouldParse = true;
						}
						// Bugfix: "Fractal Shell" shouldn't render here (even though blizz said it should render in mythic?)
						if ([24809].includes(section.ID) && selectedDifficulty === 'mythic') {
							return;
						}
						if (!shouldParse) {
							return;
						}
						if (prevParent !== section.ParentSectionID) {
							if (siblings[section.ID] < prevIndent) {
								for (let i = 0; i < prevIndent - siblings[section.ID]; i++) {
									contents += '</ul>';
								}
							} else {
								contents += '<ul>';
							}
						}
						prevParent = section.ParentSectionID;
						prevIndent = siblings[section.ID];
						const spellMultiplier = instanceData.statMultiplier * (statModsXtuningID[mapXcontentTuning[instanceXmapID[bossXinstance[encounterID]]]] || 1);
						let diffNew = sanityText(instanceData, section.BodyText_lang, section.SpellID, spellMultiplier), diffOld = "";
						if (shouldDiff) {
							const oldData = oldStore[section.ID];
							if (oldData) {
								diffOld = sanityText(instanceDataOld, oldData.BodyText_lang, oldData.SpellID, spellMultiplier);
							}
						}
						let diffz = '';
						if (selectedDifficulty === 'all' && diffs) {
							diffz += '<b>[';
							for (const difficulty of Object.keys(difficulties)) {
								for (const diff of diffs) {
									if (difficulties[difficulty][diff]) {
										diffz += difficulty + "/";
										break;
									}
								}
							}
							diffz = diffz.substring(0, diffz.length - 1) + ']</b> ';
						}
						if (storeType === 'Overview') {
							contents += `${elementIcons(section.IconFlags)}${diffz}<b>${section.Title_lang}</b> `;
						} else if (section.SpellID !== 0) { // Ability: Spell
							const spellID = section.SpellID;
							contents += `${elementIcons(section.IconFlags)}${diffz}<b><a href="https://${wowheadPath[selectedBuild['product'] || 'wow']}/spell=${spellID}" data-wowhead="spell-${spellID}">${instanceData.spellname[spellID]}</a></b> `;
							diffNew = sanityText(instanceData, instanceData.spell[spellID]?.Description_lang, spellID, spellMultiplier) + diffNew;
							if(shouldDiff) {
								diffOld = sanityText(instanceDataOld, instanceDataOld.spell[spellID]?.Description_lang, spellID, spellMultiplier) + diffOld;
							}
						} else {
							contents += `${elementIcons(section.IconFlags)}${diffz}<b>${section.Title_lang}</b> `;
						}
						if (shouldDiff && diffOld !== diffNew) {
							// noinspection JSPotentiallyInvalidConstructorUsage
							const dmp = new diff_match_patch();
							const dmp_diff = dmp.diff_main(diffOld, diffNew)
							dmp.diff_cleanupSemantic(dmp_diff);
							if (dmp_diff.filter(entry => /<a( style="[^"]+")? href="[^"]+$/.test(entry[1]) || /p class=/.test(entry[1])).length > 0) {
								contents += `<del class="diff-removed">${diffOld}</del><ins class="diff-added">${diffNew}</ins>`;
							} else {
								contents += dmp.diff_prettyHtml(dmp_diff);
							}
						} else {
							contents += diffNew;
						}
						contents += '</li>';
						prevParent = section.ParentSectionID;
					});
					contents += '</ul>';
					if (shouldDiff) {
						sectionStore = store[storeType + 'Removed'];
						let hasRemoved = false;
						if (sectionStore[encounterID]?.length > 0) {
							hasRemoved = true;
							contents += '<h2>Removed Sections</h2><ul>';
						}
						Object.values(sectionStore[encounterID] ?? []).map(section => {
							if (! section.isRemoved) {
								return;
							}
							const spellMultiplier = instanceData.statMultiplier * (statModsXtuningID[mapXcontentTuning[instanceXmapID[bossXinstance[encounterID]]]] || 1);
							let diffOld = '';
							if (storeType === 'Overview') {
								contents += `${elementIcons(section.IconFlags)}<b>${section.Title_lang}</b> `;
							} else if (section.SpellID !== 0) { // Ability: Spell
								const spellID = section.SpellID;
								contents += `${elementIcons(section.IconFlags)}<b><a href="https://${wowheadPath[selectedBuild['product'] || 'wow']}/spell=${spellID}" data-wowhead="spell-${spellID}">${instanceDataOld.spellname[spellID]}</a></b> `;
								diffOld = sanityText(instanceDataOld, instanceDataOld.spell[spellID]?.Description_lang, spellID, spellMultiplier) + diffOld;
							} else {
								contents += `${elementIcons(section.IconFlags)}<b>${section.Title_lang}</b> `;
							}
							if (diffOld !== '') {
								// noinspection JSPotentiallyInvalidConstructorUsage
								const dmp = new diff_match_patch();
								const dmp_diff = dmp.diff_main(diffOld, "")
								dmp.diff_cleanupSemantic(dmp_diff);
								if(dmp_diff.filter(entry => /<a( style="[^"]+")? href="[^"]+$/.test(entry[1]) || /p class=/.test(entry[1])).length > 0) {
									contents += `<del class="diff-removed">${diffOld}</del>`;
								} else {
									contents += dmp.diff_prettyHtml(dmp_diff);
								}
							}
						});
						if (hasRemoved) {
							contents += '</ul>';
						}
					}
					elems.map(elem => {
						const name = elem.parentElement.querySelector(`.boss-${encounterID}`).id;
						count += 1;
						elem.innerHTML += `
							<input id="boss-${count}-${encounterID}-${storeType}" type="radio" name="${name}">
							<label for="boss-${count}-${encounterID}-${storeType}">${storeType}</label>
							<div>${contents}</div>`;
					});
				});
		});
}

const loadedInstances = [];
const fetchInstance = async (instanceID) => {
	if (loadedInstances.indexOf(instanceID) > -1) {
		loadInstance();
		return;
	}

	document.getElementById('loading').style.display = 'block';
	instanceData = await fetchFromWago(`journal/instance/${instanceID}?version=${selectedBuild.version}&useHotfixes`);
	if (shouldDiff) {
		instanceDataOld = await fetchFromWago(`journal/instance/${instanceID}?version=${selectedBuild2.version}`)
	}
	loadInstance();
	document.getElementById('loading').style.display = 'none';
	loadedInstances.push(instanceID);
}

(async () => {
	const lightCSSselector = document.querySelector('link[title=lightMode]'),
		lightCSS = lightCSSselector.sheet || lightCSSselector.styleSheet;
	lightCSS.disabled = localStorage.lightMode !== 'true';

	const themeSwitch = document.getElementById('themeMode');
	themeSwitch.checked = localStorage.lightMode !== 'true';
	themeSwitch.onchange = () => {
		lightCSS.disabled = themeSwitch.checked;
		localStorage.lightMode = !themeSwitch.checked;
	}

	if (location.hash === "" && localStorage.hash) {
		location.hash = localStorage.hash;
	}

	const hashData = {};
	for (const hashDat of location.hash.substring(1).split('&')) {
		const values = hashDat.split('=');
		hashData[values[0]] = values[1];
	}

	selectedDifficulty = hashData['difficulty'] || selectedDifficulty;
	selectedTab = hashData['tab'] || selectedTab;

	const versionDropdown = document.getElementById('version'),
		versionDropdown2 = document.getElementById('version2'),
		difficultyDropdown = document.getElementById('difficulty');

	difficultyDropdown.onchange = () => {
		selectedDifficulty = difficultyDropdown.value;
		setHash();
		location.reload();
	}
	Object.keys(difficulties).map(difficulty => {
		difficultyDropdown.options[difficultyDropdown.options.length] = new Option(difficulty.charAt(0).toUpperCase() + difficulty.slice(1), difficulty);
		if (selectedDifficulty === difficulty) {
			difficultyDropdown.value = difficulty;
		}
	});

	const parseVersion = version => version.split('.').map(Number);
	apiBuilds = await fetchFromWago('builds').then(data =>
		[...data['wowxptr'], ...data['wowt'], ...data['wow']]
			.filter((() => {
				const seen = new Set();
				return obj => {
					if (seen.has(obj.version)) return false;
					seen.add(obj.version);
					return true;
				};
			})())
			.sort((a, b) => {
				const [majA, minA, patchA, buildA] = parseVersion(a.version);
				const [majB, minB, patchB, buildB] = parseVersion(b.version);

				if (majA !== majB) return majB - majA;
				if (minA !== minB) return minB - minA;
				if (patchA !== patchB) return patchB - patchA;
				return buildB - buildA;
			})
	);
	versionDropdown.onchange = () => {
		selectedBuild = apiBuilds.filter(e => e.version === versionDropdown.value)[0];
		setHash();
		location.reload();
	}
	versionDropdown2.onchange = () => {
		selectedBuild2 = apiBuilds.filter(e => e.version === versionDropdown2.value)[0];
		setHash();
		location.reload();
	}
	selectedBuild = Object.values(apiBuilds)[0];
	if (hashData['build']) {
		const tmp = apiBuilds.filter(e => e.version === hashData['build'])[0];
		if (tmp) {
			selectedBuild = tmp;
		}
	}
	if (hashData['build2']) {
		selectedBuild2 = apiBuilds.filter(e => e.version === hashData['build2'])[0];
		shouldDiff = selectedBuild && selectedBuild2 && selectedBuild.version !== selectedBuild2.version;
	}

	Object.values(apiBuilds).map(build => {
		versionDropdown.options[versionDropdown.options.length] = new Option(build.version, build.version);
		versionDropdown2.options[versionDropdown.options.length] = new Option(build.version, build.version);
		if (selectedBuild?.version === build.version) {
			versionDropdown.value = build.version;
		}
		if (selectedBuild2?.version === build.version) {
			versionDropdown2.value = build.version;
		}
	});

	instances = await fetchFromWago(`journal/instances?version=${selectedBuild.version}`);

	await loadInstances();

	Array.from(document.querySelectorAll('input[type="radio"]')).map(element => {
		element.onclick = async (event) => {
			const elem = event.target;
			[...document.querySelectorAll('input[type="radio"]:not([name="expansion"])')]
				.filter(e => e !== elem && e !== elem.parentNode?.previousElementSibling?.previousElementSibling)
				.map(e => {
					e.checked = false;
				});
			if (elem.checked && elem.getAttribute('id') !== selectedTab) {
				if (elem.dataset.instance) {
					await fetchInstance(elem.dataset.instance);
				}
				selectedTab = elem.getAttribute('id');
				setHash();
			}
		}
	});
	// Render the cached tab
	if (selectedTab !== '') {
		let selector = selectedTab,
			instanceID;

		while (true) { // eslint-disable-line no-constant-condition
			let target = document.querySelector(`#${selector}`);
			if (! target) {
				break;
			}
			target.checked = true;
			if (target.dataset.instance) {
				instanceID = target.dataset.instance;
			}
			const name = target.getAttribute('name');
			if (name === 'expansion') { // Top level
				break;
			}
			selector = name;
		}

		if (instanceID) {
			await fetchInstance(instanceID);
		}
	}
	document.getElementById('loading').style.display = 'none';
})();
