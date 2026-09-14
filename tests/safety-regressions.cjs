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

assert(src.includes('BOX MANAGER v1.18.8'));
assert(src.includes('doneMarketHardIVPct: 90'));
assert(src.includes('protectFourPerfectIVsHard: true'));
assert(!src.includes("if (n === 'ralts' || n === 'abra')"));
assert(!src.includes("if (n === 'deino' || n === 'dratini')"));

const fpBlock = between('function monFingerprint(m)', 'function rebuildAnalysis');
for (const marker of ['evs:', 'friendship:', 'favourite:', 'shiny:', 'shadow:', 'rainbow:', 'nick:', 'item:']) {
  assert(fpBlock.includes(marker), `fingerprint missing ${marker}`);
}
const fpFnSource = fpBlock.match(/function monFingerprint\(m\) \{[\s\S]*?\n      \}/)[0];
const fp = vm.runInNewContext(`(() => { const STATS=['hp','atk','def','spa','spd','spe']; ${fpFnSource}; return monFingerprint; })()`);
const base = {id:1,dex:25,species:'Pikachu',form:null,gender:'m',nature:'Jolly',ability:'static',ivs:{hp:1,atk:2,def:3,spa:4,spd:5,spe:6},evs:{},lvl:100,friendship:0};
assert.notStrictEqual(fp(base), fp({...base, favourite:true}), 'favourite change must invalidate fingerprint');
assert.notStrictEqual(fp(base), fp({...base, evs:{spe:252}}), 'EV change must invalidate fingerprint');
assert.notStrictEqual(fp(base), fp({...base, item:'leftovers'}), 'item change must invalidate fingerprint');

const virtualBlock = between('function breedPlannerVirtualMon', 'function breedPlannerBestSetupForPair');
const virtualFnSource = virtualBlock.match(/function breedPlannerVirtualMon\([\s\S]*?\n      \}/)[0];
const virtualMon = vm.runInNewContext(`(() => { const STATS=['hp','atk','def','spa','spd','spe']; const dexToName=new Map(); const publicSpeciesName=x=>x; ${virtualFnSource}; return breedPlannerVirtualMon; })()`);
assert.strictEqual(virtualMon({eggDex:147, eggName:'Dratini'}, ['hp'], {nature:'Any',ability:'Any'}, true, 'x', null).dex, 147, 'null breedDex must fall back to target eggDex');
assert.strictEqual(virtualMon({eggDex:147, eggName:'Dratini'}, ['hp'], {nature:'Any',ability:'Any'}, true, 'x', 148).dex, 148);

assert(src.includes('let expectedLiveFingerprints = new Map('));
assert(src.includes('new or unexpected PC Pokémon appeared since analysis'));
assert(src.includes('const liveCheck = await validateSelectedLive([Number(id)])'));
assert(src.includes('expectedLiveFingerprints.delete(id)'));
assert(src.includes("CLEANER_SAFETY_METADATA_ISSUES.push('EGG_GROUP_UNAVAILABLE')"));
assert(src.includes("CLEANER_SAFETY_METADATA_ISSUES.push('NURSERY_UNAVAILABLE')"));
assert(src.includes("CLEANER_SAFETY_METADATA_ISSUES.push('EVOLUTION_METADATA_UNAVAILABLE')"));
assert(src.includes('EGG_GROUP_INCOMPLETE_'));
assert(src.includes('__wdUnavailable:true'));
assert(src.includes('for (const issue of CLEANER_SAFETY_METADATA_ISSUES)'));
assert(src.includes('[...(exactCoreWhy.get(id) || [\'CORE\'])].join(\'+\')'));
assert(src.includes('[...(maleEggWhy.get(id) || [\'DONOR\'])].join(\'+\')'));
assert(src.includes('const reservedEvolutionSourceIds = new Set()'));
assert(src.includes('b.tier-a.tier ||'));
assert(src.includes('for (const [key, raw] of Object.entries(saved))'));
assert(/syncBreedPlanFamilyModes\(true\);\r?\n      rebuildAnalysis\(true\);/.test(src));

const interlock = between('function releaseInterlock', 'function assertReleaseInterlock');
assert(
  /const activeEggDonor\s*=\s*maleEggCore\.has\(id\)\s*&&/.test(interlock),
  'release interlock must protect cross-family active egg donors'
);
assert(
  !/const activeEggDonor\s*=\s*explicitBreeding\s*&&/.test(interlock),
  'cross-family donor interlock must not depend on donor family mode'
);

console.log('v1.18.8 safety regression contract passed');
