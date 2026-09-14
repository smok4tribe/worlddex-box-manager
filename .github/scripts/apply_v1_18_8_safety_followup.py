from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
JS = ROOT / 'box-manager.js'
TEST = ROOT / 'tests/safety-regressions.cjs'

src = JS.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str):
    global src
    count = src.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, got {count}')
    src = src.replace(old, new, 1)

# A Nursery read failure is uncertainty, not an empty Nursery. Keep the manager
# usable for review, but make destructive cleanup fail closed.
replace_once(
    "getJSON('/api/nursery').catch(() => ({ held: [] })),",
    "getJSON('/api/nursery').catch(err => ({ held: [], __wdUnavailable:true, __wdError:String(err?.message || err) })),",
    'nursery unknown state'
)

replace_once(
"""      const CLEANER_SAFETY_METADATA_ISSUES = [];
      if (!EGG_GROUP_SOURCE || typeof EGG_GROUP_SOURCE !== 'object' || !Object.keys(EGG_GROUP_SOURCE).length) {
        CLEANER_SAFETY_METADATA_ISSUES.push('EGG_GROUP_UNAVAILABLE');
      }
""",
"""      const CLEANER_SAFETY_METADATA_ISSUES = [];
      if (nurseryRes?.__wdUnavailable) {
        CLEANER_SAFETY_METADATA_ISSUES.push('NURSERY_UNAVAILABLE');
      }
      if (!EGG_GROUP_SOURCE || typeof EGG_GROUP_SOURCE !== 'object' || !Object.keys(EGG_GROUP_SOURCE).length) {
        CLEANER_SAFETY_METADATA_ISSUES.push('EGG_GROUP_UNAVAILABLE');
      }
""",
    'nursery fail-closed issue'
)

# directEvos() can use several sources. Only block destructive cleanup when every
# evolution provider is unavailable; otherwise keep the available provenance.
replace_once(
"""      const BC = window.BattleCore || null;
      const boxEvos = new Map();
""",
"""      const BC = window.BattleCore || null;
      const hasAnyEvolutionMetadata =
        Object.keys(EVOLVE || {}).length > 0 ||
        typeof BC?.evolutionsOf === 'function' ||
        Object.keys(FRIEND_INTO || {}).length > 0 ||
        mons.some(m => Array.isArray(m?.evolution) && m.evolution.length > 0);
      if (!hasAnyEvolutionMetadata) {
        CLEANER_SAFETY_METADATA_ISSUES.push('EVOLUTION_METADATA_UNAVAILABLE');
      }
      const boxEvos = new Map();
""",
    'evolution metadata availability'
)

# If the Egg Group table loaded but has no entry for an owned Dex, do not treat
# that absence as proof that the Pokémon has no breeding/no-eggs obligations.
replace_once(
"""      const allOwned = [...allOwnedMap.values()];
      const dittos = allOwned.filter(m => Number(m.dex) === 132);
""",
"""      const allOwned = [...allOwnedMap.values()];
      const missingEggGroupDexes = [...new Set(
        allOwned
          .map(m => Number(m?.dex))
          .filter(Number.isFinite)
          .filter(d => EGG_GROUP[String(d)] == null && EGG_GROUP[d] == null)
      )];
      if (missingEggGroupDexes.length) {
        CLEANER_SAFETY_METADATA_ISSUES.push(
          `EGG_GROUP_INCOMPLETE_${missingEggGroupDexes.slice(0, 8).join('_')}`
        );
      }
      const dittos = allOwned.filter(m => Number(m.dex) === 132);
""",
    'incomplete egg group table'
)

JS.write_text(src, encoding='utf-8')

# Extend the permanent regression contract with the fail-closed availability
# cases. These are source-level gates; live API failure itself remains mocked in
# the audit harness / browser QA.
test = TEST.read_text(encoding='utf-8')
anchor = "assert(src.includes(\"CLEANER_SAFETY_METADATA_ISSUES.push('EGG_GROUP_UNAVAILABLE')\"));\n"
extra = anchor + (
    "assert(src.includes(\"CLEANER_SAFETY_METADATA_ISSUES.push('NURSERY_UNAVAILABLE')\"));\n"
    "assert(src.includes(\"CLEANER_SAFETY_METADATA_ISSUES.push('EVOLUTION_METADATA_UNAVAILABLE')\"));\n"
    "assert(src.includes('EGG_GROUP_INCOMPLETE_'));\n"
    "assert(src.includes('__wdUnavailable:true'));\n"
)
if anchor not in test:
    raise SystemExit('regression test anchor missing')
test = test.replace(anchor, extra, 1)
TEST.write_text(test, encoding='utf-8')

print('Applied v1.18.8 metadata availability follow-up')
