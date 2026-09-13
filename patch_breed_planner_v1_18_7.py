from pathlib import Path
import re


def replace_once(text, old, new, label):
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"{label}: expected 1 match, found {n}")
    return text.replace(old, new, 1)


p = Path('box-manager.js')
s = p.read_text(encoding='utf-8')

# Release label bump only; storage keys deliberately remain on their stable v1.18 namespace.
s = s.replace('v1.18.6', 'v1.18.7')

s = replace_once(
    s,
    "  function __wdManagerCleanupUI() {\n    [",
    "  function __wdManagerCleanupUI() {\n    if (window.__WD_BREED_PLANNER_WATCH) {\n      clearInterval(window.__WD_BREED_PLANNER_WATCH);\n      window.__WD_BREED_PLANNER_WATCH = null;\n    }\n    [",
    'cleanup watcher'
)

old_power = """        for (const [holder,item] of [[a,setup.a],[b,setup.b]]) {
          const stat = breedPlannerPowerStat(item);
          if (!stat) continue;
          if (required.includes(stat) && Number(holder?.ivs?.[stat]) === 31) score += 19;
          else score -= 4;
        }
"""
new_power = """        for (const [holder,item,partner] of [[a,setup.a,b],[b,setup.b,a]]) {
          const stat = breedPlannerPowerStat(item);
          if (!stat) continue;
          if (required.includes(stat) && Number(holder?.ivs?.[stat]) === 31) {
            // A forced 31 that only this parent supplies is a much stronger tie-break
            // than forcing a stat already guaranteed by either inherited parent.
            const sharedPerfect = Number(partner?.ivs?.[stat]) === 31;
            score += sharedPerfect ? 2 : 19;
          } else score -= 4;
        }
"""
s = replace_once(s, old_power, new_power, 'power-item tie break')

rank_re = re.compile(r"      function breedPlannerRank\(target, desired\) \{.*?\n      \}\n\n      function breedPlannerCombinations", re.S)
rank_new = r'''      function breedPlannerRank(target, desired) {
        const results = [];
        for (const pair of breedPlannerLegalPairs(target, desired)) {
          const a = pair.a, b = pair.b;
          const sameSpecies = Number(a.dex) === Number(b.dex) && Number(a.dex) !== 132;
          const currentNurseryPair = pairIsCurrentNurseryPair(a.id,b.id);
          const ability = breedPlannerAbilityScore(target,a,b,desired.ability);
          const setups = breedPlannerItemSetups(a,b,desired.nature,desired.requiredStats);

          let best = null;
          for (const setup of setups) {
            const ss = breedPlannerScoreSetup(a,b,setup,desired);
            const roll = breedPlannerEstimatedRoll(
              a,b,setup,ss.union,desired,desired.nature !== 'Any'
            );
            const rollProbability = Number(roll?.probability || 0);
            const setupCandidate = {
              ...ss,
              setup,
              setupScore:ss.score,
              rollProbability
            };

            // Item assignment is chosen by the actual estimated checkpoint roll first.
            // Heuristic scoring only breaks genuine probability ties.
            if (!best ||
                rollProbability > best.rollProbability + 1e-12 ||
                (Math.abs(rollProbability-best.rollProbability) <= 1e-12 && ss.score > best.setupScore)) {
              best = setupCandidate;
            }
          }
          if (!best) continue;

          let score = best.setupScore + ability.score;

          // Same-species breeding remains preferred because Worlddex produces Eggs
          // faster there. Per-Egg inheritance odds now contribute explicitly, so a
          // materially better newly-hatched breeder can replace a weaker old parent.
          score += sameSpecies ? 58 : -12;
          score += best.rollProbability > 0
            ? Math.log2(best.rollProbability) * 32
            : -10000;

          // Nursery presence is informational, not a ranking lock. Keeping the old
          // pair in the Nursery must never outweigh a better offspring's breeding odds.
          if (ownedLocation(a) === 'TEAM') score -= 3;
          if (ownedLocation(b) === 'TEAM') score -= 3;
          score += (ivSum(a)+ivSum(b))/120;

          results.push({
            target,
            a,b,
            sameSpecies,
            currentNurseryPair,
            abilityText:ability.text,
            ...best,
            score
          });
        }
        return results.sort((x,y) =>
          y.score-x.score ||
          y.rollProbability-x.rollProbability ||
          y.union.length-x.union.length ||
          breederScore(y.a)+breederScore(y.b)-breederScore(x.a)-breederScore(x.b) ||
          Number(y.currentNurseryPair)-Number(x.currentNurseryPair)
        );
      }

      function breedPlannerCombinations'''
s, n = rank_re.subn(rank_new, s, count=1)
if n != 1:
    raise SystemExit(f'rank function: expected 1 replacement, got {n}')

old_best_setup = """      function breedPlannerBestSetupForPair(a, b, desired) {
        let best = null;
        for (const setup of breedPlannerItemSetups(a,b,desired.nature,desired.requiredStats)) {
          const score = breedPlannerScoreSetup(a,b,setup,desired);
          if (!best || score.score > best.score) best = { ...score, setup };
        }
        return best;
      }
"""
new_best_setup = """      function breedPlannerBestSetupForPair(a, b, desired) {
        let best = null;
        for (const setup of breedPlannerItemSetups(a,b,desired.nature,desired.requiredStats)) {
          const score = breedPlannerScoreSetup(a,b,setup,desired);
          const roll = breedPlannerEstimatedRoll(
            a,b,setup,score.union,desired,desired.nature !== 'Any'
          );
          const rollProbability = Number(roll?.probability || 0);
          const candidate = { ...score, setup, setupScore:score.score, rollProbability };
          if (!best ||
              rollProbability > best.rollProbability + 1e-12 ||
              (Math.abs(rollProbability-best.rollProbability) <= 1e-12 && score.score > best.setupScore)) {
            best = candidate;
          }
        }
        return best;
      }
"""
s = replace_once(s, old_best_setup, new_best_setup, 'best setup')

s = replace_once(
    s,
    'Each step tells you which offspring profile to keep. Reload after hatching and the planner will recalculate from your new owned Pokémon.',
    'Each step tells you which offspring profile to keep. While this view is open, Box + Nursery changes are detected automatically and the planner refreshes from live data.',
    'path helper text'
)

helper_anchor = """      function breedPlannerPrefillFromPlan(plan) {
        if(!plan) return;
        breedPlannerPrefillFromState({
          targetName:plan.targetName || '',
          nature:plan.nature || 'Any',
          ability:plan.ability || 'Any',
          requiredStats:[...(plan.requiredStats || [])],
          sameSpeciesOnly:!!plan.sameSpeciesOnly
        });
      }

      function mountBreedPlannerPanel(familyKeyToOpen=null) {
"""
helper_new = """      function breedPlannerPrefillFromPlan(plan) {
        if(!plan) return;
        breedPlannerPrefillFromState({
          targetName:plan.targetName || '',
          nature:plan.nature || 'Any',
          ability:plan.ability || 'Any',
          requiredStats:[...(plan.requiredStats || [])],
          sameSpeciesOnly:!!plan.sameSpeciesOnly
        });
      }

      const BREED_PLANNER_LIVE_REFRESH_MS = 4000;

      function breedPlannerInventorySignature(boxBody, nurseryBody) {
        const rows=[];
        const push=(where,m)=>{
          if (m?.id == null) return;
          rows.push([
            where,
            Number(m.id),
            Number(m.dex),
            String(m.gender || ''),
            String(m.nature || ''),
            String(m.ability || ''),
            ...STATS.map(stat => Number(m?.ivs?.[stat] || 0))
          ].join(':'));
        };
        for (const m of (Array.isArray(boxBody?.mons) ? boxBody.mons : [])) push('B',m);
        for (const m of (Array.isArray(nurseryBody?.held) ? nurseryBody.held : [])) push('N',m);
        return rows.sort().join('|');
      }

      function breedPlannerCurrentInventorySignature() {
        return breedPlannerInventorySignature({ mons }, { held:nurseryHeld });
      }

      async function breedPlannerRefreshLiveData(reason='manual') {
        saveBreedPlannerFormState();
        const calculated=document.getElementById('wd-breed-calculated');
        if(calculated) calculated.textContent = reason === 'manual'
          ? 'Reloading current Box + Team + Nursery…'
          : 'New hatch / inventory change detected · refreshing…';
        return window.__WORLDDEX_BOX_MANAGER_REFRESH?.();
      }

      function breedPlannerStartLiveWatch() {
        if (window.__WD_BREED_PLANNER_WATCH) clearInterval(window.__WD_BREED_PLANNER_WATCH);
        let baseline=breedPlannerCurrentInventorySignature();
        let checking=false;
        window.__WD_BREED_PLANNER_WATCH=setInterval(async()=>{
          if (checking) return;
          if (!document.getElementById('wd-breed-planner-v116')) {
            clearInterval(window.__WD_BREED_PLANNER_WATCH);
            window.__WD_BREED_PLANNER_WATCH=null;
            return;
          }
          checking=true;
          try {
            const [boxNow,nurseryNow]=await Promise.all([
              getJSON('/api/box'),
              getJSON('/api/nursery').catch(()=>({held:[]}))
            ]);
            const next=breedPlannerInventorySignature(boxNow,nurseryNow);
            if (next !== baseline) {
              baseline=next;
              await breedPlannerRefreshLiveData('inventory-change');
            }
          } catch (err) {
            console.warn('[Worlddex Box Manager v1.18.7] Breed Planner live refresh check failed', err);
          } finally {
            checking=false;
          }
        },BREED_PLANNER_LIVE_REFRESH_MS);
      }

      function mountBreedPlannerPanel(familyKeyToOpen=null) {
"""
s = replace_once(s, helper_anchor, helper_new, 'live refresh helpers')

old_click = """        document.getElementById('wd-breed-calculate').addEventListener('click',()=>{saveBreedPlannerFormState();updateAbilities();renderBreedPlannerResults();});
"""
new_click = """        document.getElementById('wd-breed-calculate').addEventListener('click',()=>breedPlannerRefreshLiveData('manual'));
"""
s = replace_once(s, old_click, new_click, 'recalculate live refresh')

old_mount_end = """        updateAbilities();
        if(hasRememberedTarget) renderBreedPlannerResults();
      }
"""
new_mount_end = """        updateAbilities();
        if(hasRememberedTarget) renderBreedPlannerResults();
        breedPlannerStartLiveWatch();
      }
"""
s = replace_once(s, old_mount_end, new_mount_end, 'start live watcher')

p.write_text(s, encoding='utf-8')

# README release/docs.
rp = Path('README.md')
r = rp.read_text(encoding='utf-8')
r = replace_once(r, '> **Current version: v1.18.6**', '> **Current version: v1.18.7**', 'README version')
r = replace_once(
    r,
    'The last planner target / filters are remembered locally. Reopening Breed Planner or using **Reload** recalculates recommendations from the current PC + team + Nursery instead of trusting an old pair. A green **Recalculate best pair** button is also available for an explicit fresh check.',
    'The last planner target / filters are remembered locally. While Breed Planner is open it watches Box + Nursery inventory changes and refreshes from live data when a hatch or breeder change appears. **Recalculate best pair** now performs a full live Box + Team + Nursery reload instead of re-ranking a stale snapshot. Pair and held-item ranking use the estimated inheritance roll so a materially better new offspring can replace an older breeder even when both pairs cover the same theoretical target IVs.',
    'README planner refresh paragraph'
)
r = r.replace('current v1.18.6 source', 'current v1.18.7 source')
r = r.replace('What is not present in v1.18.6:', 'What is not present in v1.18.7:')
rp.write_text(r, encoding='utf-8')

cp = Path('CHANGELOG.md')
c = cp.read_text(encoding='utf-8')
entry = """## v1.18.7

- Breed Planner now ranks held-item assignments by the estimated inheritance roll instead of flat Power Item bonuses, preventing redundant shared-31 Power Item recommendations when a better forced IV exists.
- Pair ranking now incorporates estimated per-Egg checkpoint odds and no longer gives the current Nursery pair a ranking lock; materially stronger newly hatched breeders can replace weaker parents immediately.
- **Recalculate best pair** now performs a full live Box + Team + Nursery reload instead of reusing the manager's old inventory snapshot.
- While Breed Planner is open, Box + Nursery inventory is checked every 4 seconds; a hatch or breeder change triggers an automatic safe refresh while preserving the saved planner target and filters.
- Cleaner release protections, the 90%+ / 4×31+ hard safeguards, and Organizer behavior are unchanged.

"""
if '## v1.18.7' not in c:
    c = c.replace('# Changelog\n\n', '# Changelog\n\n' + entry, 1)
cp.write_text(c, encoding='utf-8')

wp = Path('.github/workflows/build.yml')
w = wp.read_text(encoding='utf-8').replace('v1.18.6','v1.18.7')
needle = '          grep -Fq "BREED_PLANNER_FORM_KEY" box-manager.js\n'
extra = needle + '          grep -Fq "BREED_PLANNER_LIVE_REFRESH_MS" box-manager.js\n          grep -Fq "rollProbability" box-manager.js\n'
if 'BREED_PLANNER_LIVE_REFRESH_MS' not in w:
    w = replace_once(w, needle, extra, 'workflow breed markers')
wp.write_text(w, encoding='utf-8')

print('Patched Box Manager v1.18.7 Breed Planner rerank/live refresh.')
