from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
JS = ROOT / 'box-manager.js'
README = ROOT / 'README.md'
CHANGELOG = ROOT / 'CHANGELOG.md'
BUILD = ROOT / '.github/workflows/build.yml'
TEST = ROOT / 'tests/safety-regressions.cjs'

src = JS.read_text(encoding='utf-8')
original = src


def replace_once(old: str, new: str, label: str):
    global src
    count = src.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    src = src.replace(old, new, 1)


def sub_once(pattern: str, repl: str, label: str):
    global src
    src2, count = re.subn(pattern, repl, src, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    src = src2

# v1.18.8 identity.
src = src.replace('BOX MANAGER v1.18.7', 'BOX MANAGER v1.18.8')
src = src.replace('SUMMARY v1.18.7', 'SUMMARY v1.18.8')
src = src.replace('FAMILY / BREEDING DECISIONS v1.18.7', 'FAMILY / BREEDING DECISIONS v1.18.8')
src = src.replace('re-run Box Manager v1.18.7', 're-run Box Manager v1.18.8')

# H3: required cleanup metadata must fail closed instead of silently becoming {}.
replace_once(
"""      const EGG_GROUP = globalConst('EGG_GROUP') || extractConst(dataSrc, 'EGG_GROUP') || {};
      const DEX = globalConst('DEX') || extractConst(dataSrc, 'DEX') || {};
""",
"""      const EGG_GROUP_SOURCE = globalConst('EGG_GROUP') || extractConst(dataSrc, 'EGG_GROUP');
      const EGG_GROUP = EGG_GROUP_SOURCE || {};
      const CLEANER_SAFETY_METADATA_ISSUES = [];
      if (!EGG_GROUP_SOURCE || typeof EGG_GROUP_SOURCE !== 'object' || !Object.keys(EGG_GROUP_SOURCE).length) {
        CLEANER_SAFETY_METADATA_ISSUES.push('EGG_GROUP_UNAVAILABLE');
      }
      const DEX = globalConst('DEX') || extractConst(dataSrc, 'DEX') || {};
""",
'metadata fail-closed marker')

# E3: community builds must not ship one player's family workflow choices as defaults.
sub_once(
    r"      function defaultFamilyMode\(info\) \{.*?\n      \}\n\n      function defaultBoxPolicy",
"""      function defaultFamilyMode(info) {
        // Community-safe neutral default. Personal workflow choices belong in
        // the player's saved local decisions, never in source-level species rules.
        return FAMILY_MODE.AUTO;
      }

      function defaultBoxPolicy""",
    'neutral family defaults')

# E2: preserve decisions for families temporarily absent from /api/box.
sub_once(
    r"      function loadFamilyDecisions\(\) \{.*?\n      \}\n\n      const familyDecisions = loadFamilyDecisions\(\);",
"""      function normalizeStoredFamilyDecision(key, raw, info = familyInfos.get(key)) {
        raw = raw && typeof raw === 'object' ? raw : {};
        const savedMode = raw.mode === 'DONE (finished)' ? FAMILY_MODE.DONE : raw.mode;
        const mode = Object.values(FAMILY_MODE).includes(savedMode)
          ? savedMode
          : defaultFamilyMode(info);
        const boxPolicy = Object.values(BOX_POLICY).includes(raw.boxPolicy)
          ? raw.boxPolicy
          : defaultBoxPolicy(info, mode);
        const retention = Object.values(RETENTION).includes(raw.retention)
          ? raw.retention
          : RETENTION.AUTO;
        return { mode, boxPolicy, retention };
      }

      function loadFamilyDecisions() {
        let saved = {};
        try { saved = JSON.parse(localStorage.getItem(FAMILY_STORE_KEY) || '{}') || {}; } catch {}
        const out = new Map();

        // Keep every persisted family decision even when all of that family's
        // Pokémon are currently in Nursery / Team and therefore absent from PC.
        for (const [key, raw] of Object.entries(saved)) {
          out.set(key, normalizeStoredFamilyDecision(key, raw, familyInfos.get(key)));
        }

        // Add neutral defaults only for currently visible families that have no
        // persisted policy yet. Saving another family can no longer erase an
        // absent family's explicit mode / retention / box policy.
        for (const [key, info] of familyInfos.entries()) {
          if (!out.has(key)) out.set(key, normalizeStoredFamilyDecision(key, {}, info));
        }
        return out;
      }

      const familyDecisions = loadFamilyDecisions();""",
    'persistent absent-family decisions')

# C1: safety fingerprint includes every live field that can affect hard protection
# or task/source selection, not merely identity + IVs.
sub_once(
    r"      function monFingerprint\(m\) \{.*?\n      \}\n\n      function rebuildAnalysis",
"""      function monFingerprint(m) {
        if (!m) return null;
        return JSON.stringify({
          id: Number(m.id),
          dex: Number(m.dex),
          species: String(m.species || ''),
          form: m.form == null ? null : String(m.form),
          gender: m.gender == null ? null : String(m.gender),
          nature: String(m.nature || ''),
          ability: String(m.ability || ''),
          ivs: STATS.map(k => Number(m?.ivs?.[k] || 0)),
          evs: STATS.map(k => Number(m?.evs?.[k] || 0)),
          level: Number(m?.lvl ?? m?.level ?? 0),
          friendship: Number(m?.friendship || 0),
          favourite: !!m?.favourite,
          shiny: !!m?.shiny,
          shadow: !!m?.shadow,
          rainbow: !!m?.rainbow,
          nick: String(m?.nick || ''),
          item: m?.item == null ? null : m.item
        });
      }

      // Destructive jobs use a whole-PC expected snapshot, not only selected IDs.
      // A keeper disappearing, a new Pokémon appearing, or any safety-relevant
      // property changing invalidates the batch and requires a fresh review.
      let expectedLiveFingerprints = new Map(
        mons.map(m => [Number(m.id), monFingerprint(m)])
      );

      function rebuildAnalysis""",
    'expanded safety fingerprint')

# C2: a donor needed by another active family is protected regardless of the
# donor's own family mode.
replace_once(
"""          } else if (explicitBreeding && activeEggDonor) {
            reason = eggReasons.join(', ') || 'ACTIVE_EGG_DONOR';
""",
"""          } else if (activeEggDonor) {
            reason = eggReasons.join(', ') || 'ACTIVE_EGG_DONOR';
""",
'cross-family donor analysis')

# E1: synchronize planner-managed family modes before the first candidate build.
replace_once(
"""      rebuildAnalysis(true);

      function printSummary() {
""",
"""      syncBreedPlanFamilyModes(true);
      rebuildAnalysis(true);

      function printSummary() {
""",
'project sync before initial analysis')

# Remove the late duplicate sync that caused the original stale candidate state.
replace_once(
"""      // Repair/synchronize projects saved by v1.16 as soon as live Nursery data
      // is available. This fixes projects that incorrectly showed AUTO after reload.
      syncBreedPlanFamilyModes(true);

      function escAttr(v) {
""",
"""      function escAttr(v) {
""",
'remove late project sync')

# F1: allocate distinct consumable evolution sources when alternatives exist,
# and avoid consuming the current Living Dex representative when a duplicate can do it.
replace_once(
"""        // ── EVOLVE: exactly one eligible source ───────────────────
        for (const [target,pool] of evoPools.entries()) {
""",
"""        // ── EVOLVE: allocate one consumable source per missing branch ───────
        const reservedEvolutionSourceIds = new Set();
        for (const [target,pool] of evoPools.entries()) {
""",
'dex task allocation set')

replace_once(
"""          const best = (eligible.length ? eligible : [...pool]).sort((a,b) =>
            Number(b.lvl||0)-Number(a.lvl||0) ||
            breederScore(b)-breederScore(a) ||
            Number(a.id)-Number(b.id)
          )[0];

          if (!best) continue;

          addMap(evoParents, Number(best.id), target);
""",
"""          const ranked = (eligible.length ? eligible : [...pool]).sort((a,b) =>
            Number(b.lvl||0)-Number(a.lvl||0) ||
            breederScore(b)-breederScore(a) ||
            Number(a.id)-Number(b.id)
          );

          // Evolution is irreversible. Prefer a source not already committed to
          // another missing branch, and preserve the current Living Dex copy when
          // another eligible duplicate exists.
          const best =
            ranked.find(m => !reservedEvolutionSourceIds.has(Number(m.id)) && !livingDexCore.ids.has(Number(m.id))) ||
            ranked.find(m => !reservedEvolutionSourceIds.has(Number(m.id))) ||
            ranked.find(m => !livingDexCore.ids.has(Number(m.id))) ||
            ranked[0];

          if (!best) continue;
          reservedEvolutionSourceIds.add(Number(best.id));

          addMap(evoParents, Number(best.id), target);
""",
'distinct dex evolution source')

# F3: compatibility tier truly dominates donor quality, as documented.
replace_once(
"""          pairCandidates.sort((a,b) =>
            b.score-a.score ||
            parentRank(a.producer,b.producer) ||
            parentRank(a.donor,b.donor)
          );
""",
"""          pairCandidates.sort((a,b) =>
            b.tier-a.tier ||
            b.score-a.score ||
            parentRank(a.producer,b.producer) ||
            parentRank(a.donor,b.donor)
          );
""",
'dex donor tier ordering')

# D1: null is not a numeric Dex. Fall back to the target egg Dex.
replace_once(
"""        const nextDex=Number.isFinite(Number(breedDex)) ? Number(breedDex) : Number(target.eggDex);
""",
"""        const nextDex=breedDex != null && Number.isFinite(Number(breedDex))
          ? Number(breedDex)
          : Number(target.eggDex);
""",
'virtual offspring dex fallback')

# C1: whole-PC live validation. Any dependency/safety change invalidates the job.
sub_once(
    r"      async function validateSelectedLive\(ids\) \{.*?\n      \}\n\n      function parseRetryAfterMs",
"""      async function validateSelectedLive(ids) {
        const liveMap = await fetchLiveBoxMap();
        const problems = [];

        for (const [id, expectedFp] of expectedLiveFingerprints.entries()) {
          const live = liveMap.get(id);
          if (!live) {
            problems.push(`#${id}: PC inventory changed since analysis (expected Pokémon missing)`);
            continue;
          }
          if (monFingerprint(live) !== expectedFp) {
            problems.push(`#${id} ${live.species || ''}: safety-relevant live data changed since analysis`);
          }
        }

        for (const [id, live] of liveMap.entries()) {
          if (!expectedLiveFingerprints.has(id)) {
            problems.push(`#${id} ${live.species || ''}: new or unexpected PC Pokémon appeared since analysis`);
          }
        }

        for (const id of ids) {
          const row = candidateById.get(id);
          const live = liveMap.get(id);
          if (!row) problems.push(`#${id}: no longer in the current cleanup list`);
          if (!live) problems.push(`#${id}: selected Pokémon is no longer present in PC`);
        }

        return { liveMap, problems:[...new Set(problems)] };
      }

      function parseRetryAfterMs""",
    'whole inventory live validation')

# H3 + C3 + C2 at the final local interlock.
replace_once(
"""        if (!Number.isFinite(id)) blocks.push('INVALID_ID');
        if (releasedIds.has(id)) blocks.push('ALREADY_RELEASED');
""",
"""        if (!Number.isFinite(id)) blocks.push('INVALID_ID');
        for (const issue of CLEANER_SAFETY_METADATA_ISSUES) {
          blocks.push(`SAFETY_METADATA_${issue}`);
        }
        if (releasedIds.has(id)) blocks.push('ALREADY_RELEASED');
""",
'metadata release interlock')

replace_once(
"""              ((exactCoreWhy.get(id) || ['CORE']).join('+'))
""",
"""              ([...(exactCoreWhy.get(id) || ['CORE'])].join('+'))
""",
'exact core Set join')

replace_once(
"""          const activeEggDonor =
            explicitBreeding &&
            maleEggCore.has(id) &&
            groupsOf(m).some(g => activeEggGroups.has(g));
""",
"""          const activeEggDonor =
            maleEggCore.has(id) &&
            groupsOf(m).some(g => activeEggGroups.has(g));
""",
'cross-family donor interlock')

replace_once(
"""              ((maleEggWhy.get(id) || ['DONOR']).join('+'))
""",
"""              ([...(maleEggWhy.get(id) || ['DONOR'])].join('+'))
""",
'male egg Set join')

# Revalidate immediately before every irreversible request. This also runs again
# after a 429 wait because releaseOneWithBackoff retries releaseOne().
replace_once(
"""      async function releaseOne(id) {
        // Independent last gate immediately before the irreversible request.
        assertReleaseInterlock(id);

        const r = await fetch('/api/box/release', {
""",
"""      async function releaseOne(id) {
        // Independent live + local gates immediately before the irreversible
        // request. A 429 retry returns here and revalidates again after the wait.
        const liveCheck = await validateSelectedLive([Number(id)]);
        if (liveCheck.problems.length) {
          const err = new Error(`LIVE SAFETY VALIDATION blocked #${id}: ${liveCheck.problems.slice(0, 5).join('; ')}`);
          err.code = 'LOCAL_LIVE_VALIDATION';
          err.liveProblems = liveCheck.problems;
          throw err;
        }
        assertReleaseInterlock(id);

        const r = await fetch('/api/box/release', {
""",
'per-request live revalidation')

replace_once(
"""              releasedIds.add(id);
              selectedIds.delete(id);
              releaseErrors.delete(id);
""",
"""              releasedIds.add(id);
              // The server confirmed this ID was removed. Advance the expected
              // whole-PC snapshot so the next release can still be validated.
              expectedLiveFingerprints.delete(id);
              selectedIds.delete(id);
              releaseErrors.delete(id);
""",
'advance expected live snapshot')

if src == original:
    raise SystemExit('box-manager.js patch produced no changes')
JS.write_text(src, encoding='utf-8')

# Permanent regression gate: execute the two pure helpers we can safely isolate
# and assert the high-risk integration markers in the real source.
TEST.parent.mkdir(parents=True, exist_ok=True)
TEST.write_text(r'''const fs = require('fs');
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
assert(src.includes('for (const issue of CLEANER_SAFETY_METADATA_ISSUES)'));
assert(src.includes('[...(exactCoreWhy.get(id) || [\'CORE\'])].join(\'+\')'));
assert(src.includes('[...(maleEggWhy.get(id) || [\'DONOR\'])].join(\'+\')'));
assert(src.includes('const reservedEvolutionSourceIds = new Set()'));
assert(src.includes('b.tier-a.tier ||'));
assert(src.includes('for (const [key, raw] of Object.entries(saved))'));
assert(src.includes('syncBreedPlanFamilyModes(true);\n      rebuildAnalysis(true);'));

const donorAnalysis = between("const activeEggDonor = maleEggCore.has", "let status = 'KEEP'");
assert(!donorAnalysis.includes('explicitBreeding &&'), 'cross-family active donor must not depend on donor family mode');
const donorInterlock = between('const activeEggDonor =\n            maleEggCore.has', 'if (activeEggDonor)');
assert(!donorInterlock.includes('explicitBreeding &&'));

console.log('v1.18.8 safety regression contract passed');
''', encoding='utf-8')

# Permanent CI now runs the behavioral/regression contract on pushes and PRs.
build = BUILD.read_text(encoding='utf-8')
build = build.replace(
"""on:
  workflow_dispatch:
  push:
    branches:
      - main
    paths:
      - \"box-manager.js\"
      - \".github/workflows/build.yml\"
""",
"""on:
  workflow_dispatch:
  push:
    branches:
      - main
    paths:
      - \"box-manager.js\"
      - \"tests/safety-regressions.cjs\"
      - \".github/workflows/build.yml\"
  pull_request:
    branches:
      - main
    paths:
      - \"box-manager.js\"
      - \"tests/safety-regressions.cjs\"
      - \".github/workflows/build.yml\"
""")
build = build.replace('Verify Box Manager v1.18.7', 'Verify Box Manager v1.18.8')
build = build.replace('grep -Fq "BOX MANAGER v1.18.7" box-manager.js', 'grep -Fq "BOX MANAGER v1.18.8" box-manager.js')
build = build.replace(
"""          node --check box-manager.js

          grep -Fq \"BOX MANAGER v1.18.8\" box-manager.js
""",
"""          node --check box-manager.js
          node tests/safety-regressions.cjs

          grep -Fq \"BOX MANAGER v1.18.8\" box-manager.js
""")
build = build.replace(
'echo "Box Manager v1.18.7 syntax, release-safety, live Breed Planner rerank, Living Dex and regional Dex-task markers verified."',
'echo "Box Manager v1.18.8 syntax and behavioral safety regressions verified."')
BUILD.write_text(build, encoding='utf-8')

readme = README.read_text(encoding='utf-8')
readme = readme.replace('> **Current version: v1.18.7**', '> **Current version: v1.18.8**', 1)
needle = 'Nothing is released automatically. You review the list and confirm before anything is removed.\n'
addition = (
    needle +
    '\nBefore every irreversible release request, v1.18.8 revalidates the full PC safety snapshot. '
    'If a keeper disappears, a new Pokémon appears, or a safety-relevant property such as favourite, nickname, held item, EVs, friendship or rare status changes, the batch stops and requires a fresh review. Required breeding metadata also fails closed instead of silently weakening cleanup protection.\n'
)
if needle not in readme:
    raise SystemExit('README cleanup safety anchor missing')
readme = readme.replace(needle, addition, 1)
README.write_text(readme, encoding='utf-8')

changelog = CHANGELOG.read_text(encoding='utf-8')
entry = '''## v1.18.8\n\n- **Safety hardening:** Cleaner now revalidates a whole-PC safety snapshot before every irreversible release request, including after 429 backoff; keeper disappearance, new inventory, or safety-relevant property changes stop the batch.\n- Expanded live fingerprints to include EVs, level, friendship, favourite, Shiny/Shadow/Rainbow, nickname and held item in addition to identity/IV fields.\n- Required Egg Group metadata now fails closed at the release interlock instead of silently treating unavailable metadata as an empty ruleset.\n- Active cross-family Egg Group donors are protected by project demand even when the donor's own family is AUTO/DONE/NO BREED.\n- Fixed Cleaner interlock reason formatting for Set-backed breeder-core reasons.\n- Breeding Project auto-mode synchronization now runs before the initial Cleaner analysis, eliminating stale AUTO candidate rows after load.\n- Persisted family decisions survive when a family is temporarily absent from PC because all copies are in Team/Nursery; community defaults are neutral AUTO instead of source-hardcoded personal species choices.\n- Pokédex evolution tasks allocate distinct irreversible sources when alternatives exist and prefer not to consume the current Living Dex representative. Same-species donor tier now truly outranks cross-species/ Ditto quality as documented.\n- Fixed unrestricted multi-step Breed Planner virtual offspring incorrectly becoming Dex 0 when no explicit breed Dex is supplied.\n- Added permanent safety regression checks to CI while preserving `doneMarketHardIVPct: 90`, `protectFourPerfectIVsHard: true`, double confirmation and the no-auto-release invariant.\n\n'''
if '## v1.18.8' not in changelog:
    changelog = changelog.replace('# Changelog\n\n', '# Changelog\n\n' + entry, 1)
CHANGELOG.write_text(changelog, encoding='utf-8')

print('Applied Box Manager v1.18.8 safety hardening')
