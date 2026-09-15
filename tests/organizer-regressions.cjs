const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const src = fs.readFileSync('box-manager.js', 'utf8');

function between(a, b) {
  const i = src.indexOf(a);
  const j = src.indexOf(b, i + a.length);
  assert(i >= 0 && j > i, `missing source block: ${a}`);
  return src.slice(i, j);
}

assert(src.includes('BOX MANAGER v1.19.0'));
assert(src.includes('const ORGANIZER_FULL_EV_TOTAL = 508'));
assert(src.includes("reserveFirstBoxes:2"));
assert(src.includes('wd-organizer-reserve-first'));
assert(src.includes('wd-organizer-box-direction'), 'v1.19 must expose an explicit fill direction independent of intake reserve');
assert(src.includes('wd-org-trained-criteria'), 'Battle Ready criteria must be visually nested under the parent control');
assert(src.includes('wdorg-order-inline'), 'Box Order editor must render inline instead of covering the physical preview');
assert(!src.includes('wd-organizer-order-direction-title'), 'Box Order must not duplicate the physical-direction summary');
assert(!src.includes('wdorg-order-num'), 'Box Order must not show misleading logical ordinals as physical box numbers');
const orderEditorCss = between('#wd-box-organizer-v14 .wdorg-order-editor {', '#wd-box-organizer-v14 .wdorg-order-editor[hidden]');
assert(!orderEditorCss.includes('position:absolute'), 'Box Order editor must not be an overlay popover');
const orderListCss = between('#wd-box-organizer-v14 .wdorg-order-list {', '#wd-box-organizer-v14 .wdorg-order-row {');
assert(orderListCss.includes('flex-wrap:wrap'), 'Box Order categories must wrap compactly inline');

const organizerBodyCss = between('#wd-box-organizer-v14 .wdorg-body {', '#wd-box-organizer-v14 .wdorg-tools {');
assert(organizerBodyCss.includes('overflow-y:auto'), 'the whole Organizer body must own vertical scrolling');
const organizerTableWrapCss = between('#wd-box-organizer-v14 .wdorg-tablewrap {', '#wd-box-organizer-v14 table {');
assert(organizerTableWrapCss.includes('flex:0 0 auto'), 'the preview table must flow inside the Organizer body instead of owning the only vertical scrollbar');

assert(src.includes('const ORGANIZER_REFRESH_EVERY_MOVES = 50;'), 'large Organizer applies should use sparse periodic live-box refreshes');
assert(src.includes("if (err?.code === 'BOX_FULL')"), 'BOX_FULL must still trigger immediate recovery logic');
assert(src.includes("'Initial organizer live-box check'"), 'Organizer must keep initial live validation');
assert(src.includes("'Verify moved boxes'"), 'Organizer must keep final live layout verification');
assert(src.includes("STORAGE:'COLLECTION'"));
assert(src.includes("RELEASE:'CLEANUP REVIEW'"));
assert(src.includes("base:'CLEANUP REVIEW'"));
assert(!src.includes('g.count>=autoOwnMin'), 'collection family size must not auto-promote to private boxes');
const prefsBlock = between('const ORGANIZER_SECTION_DEFAULT_ORDER', 'function loadOrganizerPrefs');
const normalizePrefs = vm.runInNewContext(`(() => { ${prefsBlock}; return normalizeOrganizerPrefs; })()`);
const migratedPrefs = normalizePrefs({
  categoryOrder:['SPECIAL','BATTLE_READY','DEX_TASK','BREED_NOW','TO_BE','SYNCRO','FINAL','STORAGE','RELEASE'],
  boxDirection:'descending'
});
assert.deepStrictEqual(Array.from(migratedPrefs.categoryOrder.slice(0,2)),['BATTLE_READY','SPECIAL'],'legacy default order should migrate to v1.19 semantics');
assert.strictEqual(migratedPrefs.boxDirection,'descending','explicit saved fill direction must survive v1.19 preference normalization');
assert.strictEqual(migratedPrefs.reserveFirstBoxes,2,'v1.19 default intake reserve should be two boxes');
const organizerSection = between('// BOX ORGANIZER v1.19.0', 'function mountReviewPanel');
assert(!organizerSection.includes('/api/box/release'), 'Organizer must never call the release endpoint');

const trainedBlock = between('const ORGANIZER_FULL_EV_TOTAL = 508', 'function organizerIsSpecial');
const trainedFnSource = trainedBlock.match(/function organizerIsTrained\(m, prefs = organizerPrefsState\) \{[\s\S]*?\n      \}/)[0];
const organizerIsTrained = vm.runInNewContext(`(() => {
  const ORGANIZER_FULL_EV_TOTAL=508;
  const evTotal=m=>Number(m.evTotal||0);
  ${trainedFnSource};
  return organizerIsTrained;
})()`);
const strict = {keepTrainedTogether:true,trainedEv:true,trainedLevel:true,trainedLevelMin:100};
assert.strictEqual(organizerIsTrained({lvl:100,evTotal:508},strict),true,'Lv100 + 508 EVs should be Battle Ready');
assert.strictEqual(organizerIsTrained({lvl:100,evTotal:507},strict),false,'partial EV training must not qualify');
assert.strictEqual(organizerIsTrained({lvl:99,evTotal:508},strict),false,'level rule must combine with EV rule');
assert.strictEqual(organizerIsTrained({lvl:100,evTotal:0},{...strict,trainedEv:false}),true,'disabling EV rule should leave the enabled level rule');

const specialBlock = between('function organizerIsSpecial', 'const ORGANIZER_CATEGORY_ORDER');
assert(!specialBlock.includes('m.favourite'), 'favourite must not imply SPECIAL destination');

const catBlock = between('function organizerCategory', 'function organizerDetails');
assert(catBlock.indexOf("return 'BATTLE_READY'") < catBlock.indexOf("return 'SPECIAL'"), 'Battle Ready must outrank rare/unbreedable grouping');
const specialFnSource = specialBlock.match(/function organizerIsSpecial\(m\) \{[\s\S]*?\n      \}/)[0];
const catFnSource = catBlock.match(/function organizerCategory\(m, prefs = organizerPrefsState\) \{[\s\S]*?\n      \}/)[0];
const classify = vm.runInNewContext(`(() => {
  const ORGANIZER_FULL_EV_TOTAL=508;
  const evTotal=m=>Number(m.evTotal||0);
  const groupsOf=m=>Array.isArray(m.groups)?m.groups:[];
  const candidateById=new Map();
  const dexTaskCore={evoParents:new Map(),breedParents:new Map()};
  const FAMILY_MODE={BREED:'BREED NOW',TO_BE:'TO-BE',AUTO:'AUTO'};
  const familyMode=()=>FAMILY_MODE.AUTO;
  const isFinalDex=()=>false;
  ${trainedFnSource}
  ${specialFnSource}
  ${catFnSource}
  return organizerCategory;
})()`);
const classifyPrefs={...strict,keepFavouritesInPlace:false,keepSpecialsTogether:true,keepDexTasksTogether:false,keepBreedersTogether:false,keepSynchronizeTogether:false};
assert.strictEqual(classify({id:1,lvl:100,evTotal:508,favourite:true},classifyPrefs),'BATTLE_READY','trained favourite should be Battle Ready when not pinned');
assert.strictEqual(classify({id:2,lvl:1,evTotal:0,favourite:true},classifyPrefs),'STORAGE','favourite alone must not force a destination');
assert.strictEqual(classify({id:3,lvl:100,evTotal:508,shiny:true},classifyPrefs),'BATTLE_READY','trained rare should prefer functional Battle Ready grouping');
assert.strictEqual(classify({id:4,lvl:1,evTotal:0,shiny:true},classifyPrefs),'SPECIAL','untrained rare should use rare/unbreedable grouping');

const planBlock = between('function buildOrganizerPlan', 'let organizerPlan = null');
assert(planBlock.includes('!forceOwn && !activeBreedingFamily'), 'AUTO/DONE/NO_BREED collection pooling guard missing');
assert(planBlock.includes("base:'COLLECTION'"), 'collection box naming missing');
assert(planBlock.includes('reserveFirstBoxes'), 'intake reserve missing from planner');

const placementBlock = between('function stableAssignOrganizerBoxes', 'function buildOrganizerPlan');
assert(placementBlock.includes('eligibleBoxes'), 'stable placement must exclude reserved intake boxes');
assert(placementBlock.includes("direction === 'descending'"), 'stable placement must support high-to-low traversal');
assert(placementBlock.includes('localTargets=maxScoreIncreasingAssignment(scores)'), 'Balanced/Ordered placement must preserve logical order along the selected traversal');

const placementDeps = between('function hungarianMin', 'function stableAssignOrganizerBoxes');
const stableAssign = vm.runInNewContext(`(() => {
  const ORGANIZER_SAFE_CAPACITY=99;
  const window={Game:{state:{boxNames:{}}}};
  ${placementDeps}
  ${placementBlock}
  return stableAssignOrganizerBoxes;
})()`);
const def=(name,size,currentBox=0)=>({base:name,items:Array.from({length:size},()=>({box:currentBox}))});
assert.deepStrictEqual(
  Array.from(stableAssign([def('A',10),def('B',10)],6,99,new Map(),'ordered',2,'ascending').targets),
  [2,3],
  'ascending ordered layout should start at the earliest non-reserved physical box'
);
assert.deepStrictEqual(
  Array.from(stableAssign([def('A',10),def('B',10)],6,99,new Map(),'ordered',2,'descending').targets),
  [5,4],
  'descending ordered layout should start at the highest physical box while preserving the intake reserve'
);
assert.strictEqual(
  stableAssign([def('A',99)],5,99,new Map([[2,1]]),'ordered',2,'ascending').targets[0],
  3,
  'a pinned favourite occupying the first ascending organized box must make placement skip to a feasible box'
);
assert.strictEqual(
  stableAssign([def('A',99)],5,99,new Map([[4,1]]),'ordered',2,'descending').targets[0],
  3,
  'a pinned favourite occupying the first descending organized box must make placement skip to the next feasible box'
);
assert(stableAssign([def('A',1,0)],5,99,new Map(),'min_moves',2,'descending').targets[0] >= 2, 'min-moves must still exclude reserved intake boxes');

const applyBlock = between('async function applyOrganizerPlan', 'function mountOrganizerPanel');
assert(applyBlock.includes('incomingLimit = temporary ? SERVER_BOX_MOVE_CAPACITY : ORGANIZER_SAFE_CAPACITY'), 'temporary backend buffer policy missing');
assert(applyBlock.includes('...(plan.intakeBoxes||[])'), 'reserved intake boxes must be preferred for cycle buffering');
assert(applyBlock.includes("No physical PC slot is free to safely schedule box moves"), 'buffer preflight missing');

console.log('v1.19.0 organizer regression contract passed');
