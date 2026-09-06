from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / 'box-manager.js'
README = ROOT / 'README.md'
CHANGELOG = ROOT / 'CHANGELOG.md'
BUILD = ROOT / '.github/workflows/build.yml'


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly 1 match, found {count}')
    return text.replace(old, new, 1)


js = JS.read_text(encoding='utf-8')
if 'BOX MANAGER v1.18.5' not in js:
    raise RuntimeError('Expected v1.18.5 source marker not found')

old_fetch = """      const [boxRes, stateRes, nurseryRes, dataSrc, pcSrc] = await Promise.all([
        getJSON('/api/box'),
        getJSON('/api/state'),
        getJSON('/api/nursery').catch(() => ({ held: [] })),
        getText('/js/data.js'),
        getText('/js/pc.js')
      ]);"""
new_fetch = """      const [boxRes, stateRes, nurseryRes, dataSrc, pcSrc, speciesSrc, battleCoreSrc, itemsSrc] = await Promise.all([
        getJSON('/api/box'),
        getJSON('/api/state'),
        getJSON('/api/nursery').catch(() => ({ held: [] })),
        getText('/js/data.js'),
        getText('/js/pc.js'),
        getText('/js/species.js').catch(() => ''),
        getText('/js/battle-core.js').catch(() => ''),
        getText('/js/items.js').catch(() => '')
      ]);"""
js = replace_once(js, old_fetch, new_fetch, 'same-origin metadata fetch')

old_consts = """      const EGG_GROUP = globalConst('EGG_GROUP') || extractConst(dataSrc, 'EGG_GROUP') || {};
      const DEX = globalConst('DEX') || extractConst(dataSrc, 'DEX') || {};
      const DEX_EXTRA = globalConst('DEX_EXTRA') || extractConst(dataSrc, 'DEX_EXTRA') || {};
      const FRIEND_INTO = extractConst(pcSrc, 'FRIEND_INTO') || {};"""
new_consts = """      const EGG_GROUP = globalConst('EGG_GROUP') || extractConst(dataSrc, 'EGG_GROUP') || {};
      const DEX = globalConst('DEX') || extractConst(dataSrc, 'DEX') || {};
      const DEX_EXTRA = globalConst('DEX_EXTRA') || extractConst(dataSrc, 'DEX_EXTRA') || {};
      const FRIEND_INTO = extractConst(pcSrc, 'FRIEND_INTO') || {};
      // Structured evolution metadata is loaded read-only from Worlddex itself.
      // It enriches the live mon.evolution payload with item / level / trade data
      // and mirrors the client's regional-source eligibility rules.
      const EVOLVE = globalConst('EVOLVE') || extractConst(speciesSrc, 'EVOLVE') || {};
      const REGION_ONLY = extractConst(battleCoreSrc, 'REGION_ONLY') || {};
      const ITEM_DB = globalConst('ITEM_DB') || extractConst(itemsSrc, 'ITEM_DB') || {};"""
js = replace_once(js, old_consts, new_consts, 'evolution metadata constants')

old_mon_evos = """      function monDirectEvos(m) {
        const out = [];
        for (const e of (m?.evolution || [])) {
          if (!e || e.to == null) continue;
          const to = Number(e.to);
          if (!Number.isFinite(to)) continue;
          if (!out.some(x => Number(x.to) === to)) out.push({ ...e, to });
        }
        return out;
      }"""
new_mon_evos = """      function monDirectEvos(m) {
        // Start from the exact live payload for THIS owned Pokémon, then enrich
        // matching targets with Worlddex's generated EVOLVE table. This gives
        // Pokédex Tasks item / level / trade metadata without losing form-specific
        // information present only on the owned Pokémon.
        const byTarget = new Map();
        const add = e => {
          if (!e || e.to == null) return;
          const to = Number(e.to);
          if (!Number.isFinite(to)) return;
          const previous = byTarget.get(to) || { to };
          const merged = { ...previous };
          for (const [key, value] of Object.entries(e)) {
            if (value != null || merged[key] == null) merged[key] = value;
          }
          merged.to = to;
          byTarget.set(to, merged);
        };

        for (const e of (m?.evolution || [])) add(e);

        const generated = EVOLVE[String(Number(m?.dex))] ?? EVOLVE[Number(m?.dex)];
        const generatedList = Array.isArray(generated) ? generated : generated ? [generated] : [];
        generatedList.forEach(add);

        try {
          if (BC?.evolutionsOf) (BC.evolutionsOf(Number(m?.dex)) || []).forEach(add);
        } catch {}

        friendTargets(Number(m?.dex)).forEach(add);
        return [...byTarget.values()];
      }"""
js = replace_once(js, old_mon_evos, new_mon_evos, 'owned evolution enrichment')

old_allows = """      function evolutionAllowsMon(m, e) {
        const req = evolutionSexRequirement(e);
        if (!req) return true;
        return String(m?.gender || '').toLowerCase() === req;
      }"""
new_allows = """      const FORM_DEX_MIN = 10000;

      function normalizeRegionKey(value) {
        const s = String(value || '').trim().toLowerCase();
        if (!s) return '';
        if (s === 'galar' || s === 'galarian') return 'galar';
        if (s === 'hisui' || s === 'hisuian') return 'hisui';
        if (s === 'alola' || s === 'alolan') return 'alola';
        return s;
      }

      function regionalBranchRequirement(e) {
        if (!e || e.to == null) return '';
        return normalizeRegionKey(
          REGION_ONLY[String(Number(e.to))] ?? REGION_ONLY[Number(e.to)] ?? ''
        );
      }

      function evolutionSourceMatchesRegionalBranch(m, e) {
        const need = regionalBranchRequirement(e);
        if (!need) return true;

        // Mirror Worlddex battle-core.js: older regional sources may still carry
        // form='galar' / form='hisui', while newer regional species have their own
        // 10xxx Dex number and usually no form field at all.
        const sourceRegions = [m?.form, m?.region, m?.variant]
          .map(normalizeRegionKey)
          .filter(Boolean);
        if (sourceRegions.includes(need)) return true;
        return Number(m?.dex) >= FORM_DEX_MIN;
      }

      function evolutionAllowsMon(m, e) {
        const req = evolutionSexRequirement(e);
        if (req && String(m?.gender || '').toLowerCase() !== req) return false;
        return evolutionSourceMatchesRegionalBranch(m, e);
      }

      function titleCaseSlug(value) {
        return String(value || '')
          .replace(/[-_]+/g, ' ')
          .replace(/\\b\\w/g, c => c.toUpperCase());
      }

      function evolutionItemLabel(item) {
        const id = String(item || '').trim();
        if (!id) return '';
        return String(ITEM_DB?.[id]?.n || titleCaseSlug(id));
      }

      function regionalSourceLabel(region) {
        if (region === 'galar') return 'Galarian form';
        if (region === 'hisui') return 'Hisuian form';
        if (region === 'alola') return 'Alolan form';
        return region ? `${titleCaseSlug(region)} form` : '';
      }

      function evolutionRequirementParts(m, e) {
        if (!e || typeof e !== 'object') return [];
        const parts = [];
        const item = String(e.item || '').trim();
        if (item) parts.push(evolutionItemLabel(item));

        const level = Number(e.lv ?? e.level);
        if (Number.isFinite(level) && level > 0) parts.push(`Lv.${level}`);
        if (e.trade) parts.push('Trade');
        if (e.friendship) parts.push('Friendship 220+');

        const sexReq = evolutionSexRequirement(e);
        if (sexReq) parts.push(sexReq === 'f' ? '♀ female' : '♂ male');

        const regionalSource = regionalBranchRequirement(e);
        if (regionalSource && Number(m?.dex) < FORM_DEX_MIN) {
          parts.push(regionalSourceLabel(regionalSource));
        }

        // Confirmed Worlddex behavior: Island Shard branches are performed in
        // Alola. Ancient Shard is confirmed to create Hisuian evolutions, but a
        // physical Hisui-location requirement has NOT been confirmed, so we do
        // not invent one here.
        if (item === 'island-shard') parts.push('Alola region');

        return [...new Set(parts.filter(Boolean))];
      }"""
js = replace_once(js, old_allows, new_allows, 'regional evolution eligibility')

old_task = """          const evoRecord = monDirectEvos(best).find(e => Number(e.to) === Number(target));
          const sexReq = evolutionSexRequirement(evoRecord);

          tasks.push({
            Type:'EVOLVE',
            MissingDex:target,
            Missing:dexToName.get(target) || `#${target}`,
            UseID:Number(best.id),
            UseIDs:[Number(best.id)],
            Use:best.species,
            UseLabel:labelMon(best),
            Nature:best.nature || '',
            Ability:best.ability || '',
            RequiredSex:sexReq || '',
            Note:
              `Evolve ${labelMon(best)} into uncaught ${dexToName.get(target) || '#' + target}` +
              (sexReq ? ` · requires ${sexReq === 'f' ? '♀ female' : '♂ male'}` : '')
          });"""
new_task = """          const evoRecord = monDirectEvos(best).find(e => Number(e.to) === Number(target));
          const sexReq = evolutionSexRequirement(evoRecord);
          const requirementParts = evolutionRequirementParts(best, evoRecord);

          tasks.push({
            Type:'EVOLVE',
            MissingDex:target,
            Missing:dexToName.get(target) || `#${target}`,
            UseID:Number(best.id),
            UseIDs:[Number(best.id)],
            Use:best.species,
            UseLabel:labelMon(best),
            Nature:best.nature || '',
            Ability:best.ability || '',
            RequiredSex:sexReq || '',
            Item:String(evoRecord?.item || ''),
            Level:Number(evoRecord?.lv ?? evoRecord?.level) || 0,
            Trade:!!evoRecord?.trade,
            Requirements:requirementParts.join(' · ') || 'No special requirement',
            Note:`Evolve ${labelMon(best)} into uncaught ${dexToName.get(target) || '#' + target}`
          });"""
js = replace_once(js, old_task, new_task, 'Dex task evolution requirements')

old_counts = """        const previewTotal=document.getElementById('wd-clean-preview-total'), previewKeep=document.getElementById('wd-clean-preview-keep'), previewCandidates=document.getElementById('wd-clean-preview-candidates');
        if(previewTotal) previewTotal.textContent=String(activeCount);
        const liveCandidateCount=candidates.filter(r=>!releasedIds.has(Number(r.ID))).length;
        if(previewKeep) previewKeep.textContent=String(Math.max(0,activeCount-liveCandidateCount));
        if(previewCandidates) previewCandidates.textContent=String(liveCandidateCount);"""
new_counts = """        const previewTotal=document.getElementById('wd-clean-preview-total'), previewKeep=document.getElementById('wd-clean-preview-keep'), previewCandidates=document.getElementById('wd-clean-preview-candidates'), previewLiving=document.getElementById('wd-clean-preview-living');
        if(previewTotal) previewTotal.textContent=String(activeCount);
        const liveCandidateCount=candidates.filter(r=>!releasedIds.has(Number(r.ID))).length;
        if(previewKeep) previewKeep.textContent=String(Math.max(0,activeCount-liveCandidateCount));
        if(previewCandidates) previewCandidates.textContent=String(liveCandidateCount);
        if(previewLiving) previewLiving.textContent=String(livingDexCore.ids.size);"""
js = replace_once(js, old_counts, new_counts, 'Cleaner Living Dex counter')

js = replace_once(
    js,
    '#wd-box-cleaner-v13 .wdcl-preview {display:grid;grid-template-columns:repeat(3,minmax(130px,1fr));gap:8px;padding:9px 12px;border-bottom:1px solid #2d3849;}',
    '#wd-box-cleaner-v13 .wdcl-preview {display:grid;grid-template-columns:repeat(4,minmax(130px,1fr));gap:8px;padding:9px 12px;border-bottom:1px solid #2d3849;}',
    'Cleaner preview grid'
)

old_preview = """<div class=\"wdcl-preview\"><div class=\"wdcl-card\"><small>Pokémon checked</small><b id=\"wd-clean-preview-total\">0</b></div><div class=\"wdcl-card\"><small>Safe to keep</small><b id=\"wd-clean-preview-keep\">0</b></div><div class=\"wdcl-card\"><small>Cleanup candidates</small><b id=\"wd-clean-preview-candidates\">0</b></div></div>"""
new_preview = """<div class=\"wdcl-preview\"><div class=\"wdcl-card\"><small>Pokémon checked</small><b id=\"wd-clean-preview-total\">0</b></div><div class=\"wdcl-card\"><small>Safe to keep</small><b id=\"wd-clean-preview-keep\">0</b></div><div class=\"wdcl-card\"><small>Living Dex protected</small><b id=\"wd-clean-preview-living\">0</b></div><div class=\"wdcl-card\"><small>Cleanup candidates</small><b id=\"wd-clean-preview-candidates\">0</b></div></div>"""
js = replace_once(js, old_preview, new_preview, 'Cleaner preview cards')

old_footer_phrase = """The list above is only a preview. You choose which Pokémon to remove and confirm the action before it starts. Protected Pokémon — including nicknamed Pokémon, favourites, trained Pokémon, breeding needs and Pokédex needs — are kept out of the cleanup list."""
new_footer_phrase = """The list above is only a preview. You choose which Pokémon to remove and confirm the action before it starts. <b>Living Dex protection keeps at least one copy of every owned Pokédex species/form.</b> Protected Pokémon — including nicknamed Pokémon, favourites, trained Pokémon, breeding needs and Pokédex needs — are kept out of the cleanup list."""
js = replace_once(js, old_footer_phrase, new_footer_phrase, 'Cleaner Living Dex explanation')

old_dex_note = """For <b>EVOLVE</b>, the manager keeps one Pokémon that can become the missing entry.
            For <b>BREED</b>, it keeps a compatible female and male whenever possible."""
new_dex_note = """For <b>EVOLVE</b>, the manager keeps one Pokémon that can become the missing entry and shows known item, level, trade and regional-form requirements.
            Confirmed regional mechanics such as <b>Island Shard</b>, <b>Ancient Shard</b> and Galar evolution items are read from Worlddex's own evolution data.
            For <b>BREED</b>, it keeps a compatible female and male whenever possible."""
js = replace_once(js, old_dex_note, new_dex_note, 'Dex Tasks help text')

old_dex_table = """<div class=\"wdd-wrap\"><table><thead><tr><th>Action</th><th>Missing Pokémon</th><th>Use this Pokémon</th><th>Nature / Ability</th><th>What to do</th></tr></thead><tbody>
            ${tasks.length ? tasks.map(t=>`<tr><td><span class=\"tag\">${escHtml(t.Type)}</span>${t.PairStatus && t.Type==='BREED' ? `<small>${escHtml(t.PairStatus)}</small>` : ''}</td><td><b>#${t.MissingDex} ${escHtml(t.Missing)}</b></td><td><b>${escHtml(t.UseLabel || `#${t.UseID} ${t.Use}`)}</b></td><td>${escHtml(t.Nature)}<small>${escHtml(t.Ability)}</small></td><td>${escHtml(t.Note)}</td></tr>`).join('') : '<tr><td colspan=\"5\" style=\"padding:22px;text-align:center;color:#8e9caf\">No Pokédex breeding or evolution tasks right now.</td></tr>'}"""
new_dex_table = """<div class=\"wdd-wrap\"><table><thead><tr><th>Action</th><th>Missing Pokémon</th><th>Use this Pokémon</th><th>Nature / Ability</th><th>Requirements</th><th>What to do</th></tr></thead><tbody>
            ${tasks.length ? tasks.map(t=>`<tr><td><span class=\"tag\">${escHtml(t.Type)}</span>${t.PairStatus && t.Type==='BREED' ? `<small>${escHtml(t.PairStatus)}</small>` : ''}</td><td><b>#${t.MissingDex} ${escHtml(t.Missing)}</b></td><td><b>${escHtml(t.UseLabel || `#${t.UseID} ${t.Use}`)}</b></td><td>${escHtml(t.Nature)}<small>${escHtml(t.Ability)}</small></td><td>${escHtml(t.Requirements || '—')}</td><td>${escHtml(t.Note)}</td></tr>`).join('') : '<tr><td colspan=\"6\" style=\"padding:22px;text-align:center;color:#8e9caf\">No Pokédex breeding or evolution tasks right now.</td></tr>'}"""
js = replace_once(js, old_dex_table, new_dex_table, 'Dex Tasks requirements column')

old_audit = """            Parents:t.UseLabel || `#${t.UseID} ${t.Use}`,
            PairStatus:t.PairStatus || '',
            Note:t.Note"""
new_audit = """            Parents:t.UseLabel || `#${t.UseID} ${t.Use}`,
            PairStatus:t.PairStatus || '',
            Requirements:t.Requirements || '',
            Note:t.Note"""
js = replace_once(js, old_audit, new_audit, 'Dex task audit requirements')

# Preserve every existing safety/control path; only bump player-facing version text.
js = js.replace('v1.18.5', 'v1.18.6')
JS.write_text(js, encoding='utf-8')

readme = README.read_text(encoding='utf-8')
readme = readme.replace('v1.18.5', 'v1.18.6')
readme = replace_once(
    readme,
    """The cleaner protects important copies, including:

- nicknamed Pokémon;""",
    """The cleaner protects important copies, including:

- at least one **Living Dex** copy of every owned Pokédex species/form;
- nicknamed Pokémon;""",
    'README Living Dex bullet'
)
readme = replace_once(
    readme,
    """- **EVOLVE** keeps one suitable Pokémon for the missing evolution.
- **BREED** now searches owned Pokémon across the PC, team and Nursery and chooses a legal donor with this practical priority: **same species → compatible shared Egg Group → Ditto fallback**.""",
    """- **EVOLVE** keeps one suitable Pokémon for the missing evolution and shows known level, item, trade, sex and regional-form requirements.
- Regional evolution data is read from Worlddex itself, including confirmed **Island Shard** Alolan branches, **Ancient Shard** Hisuian branches, Galarica Cuff/Wreath, and Galar-only source-form branches.
- Island Shard tasks explicitly show the confirmed **Alola region** requirement; Ancient Shard is identified as a Hisuian evolution item without inventing an unconfirmed Hisui-location requirement.
- **BREED** searches owned Pokémon across the PC, team and Nursery and chooses a legal donor with this practical priority: **same species → compatible shared Egg Group → Ditto fallback**.""",
    'README regional Dex tasks'
)
readme = replace_once(
    readme,
    """- reads Worlddex data from same-origin endpoints: `/api/box`, `/api/state`, `/api/nursery`, `/js/data.js` and `/js/pc.js`;""",
    """- reads Worlddex data from same-origin endpoints: `/api/box`, `/api/state`, `/api/nursery`, `/js/data.js`, `/js/pc.js`, `/js/species.js`, `/js/battle-core.js` and `/js/items.js`;""",
    'README same-origin reads'
)
readme = readme.replace(
    "The SHA-256 check in GitHub Actions verifies that the published `box-manager.js` is the exact reviewed build; it is an integrity check, not a security certification.",
    "GitHub Actions syntax-checks the published `box-manager.js` and verifies release-safety / feature markers; this is an integrity sanity check, not a security certification."
)
readme = readme.replace(
    "The repository verifies `box-manager.js` with a JavaScript syntax check and an exact SHA-256 check.\n\nCurrent v1.18.6 SHA-256:\n\n`Updated by the release workflow after final review.`",
    "The repository verifies `box-manager.js` with a JavaScript syntax check plus release-safety and current-feature marker checks."
)
README.write_text(readme, encoding='utf-8')

changelog = CHANGELOG.read_text(encoding='utf-8')
entry = """## v1.18.6

- Surfaced **Living Dex protection** directly in Clean Up: at least one copy of every owned Pokédex species/form remains protected, and the preview shows the protected Living Dex core count.
- Pokédex **EVOLVE** tasks now enrich live Pokémon evolution data with Worlddex's own `species.js` metadata and display known item, level, trade, sex and regional-source requirements.
- Added confirmed **Island Shard** handling for Alolan Raichu, Alolan Exeggutor and Alolan Marowak, including the verified **Alola region** requirement.
- Added confirmed **Ancient Shard** handling for Hisuian evolution branches without inventing an unverified Hisui-location requirement.
- Added Galar evolution support including **Galarica Cuff**, **Galarica Wreath**, Ice Stone branches and the client's `REGION_ONLY` source-form eligibility rules.
- Regional-only branches now mirror Worlddex's `form` / 10xxx-Dex source checks, preventing ordinary Meowth, Corsola, Yamask, Linoone and similar base forms from being falsely protected for Galar-only evolutions.
- Cleaner release safeguards, premium-IV protections, Organizer capacity/interlocks and breeding-ranking behavior are unchanged.

"""
changelog = replace_once(changelog, '# Changelog\n\n', '# Changelog\n\n' + entry, 'CHANGELOG header')
CHANGELOG.write_text(changelog, encoding='utf-8')

build = BUILD.read_text(encoding='utf-8')
build = build.replace('v1.18.5', 'v1.18.6')
needle = '          grep -Fq "keepSynchronizeTogether:false" box-manager.js\n'
extra = """          grep -Fq \"keepSynchronizeTogether:false\" box-manager.js
          grep -Fq \"const REGION_ONLY\" box-manager.js
          grep -Fq \"island-shard\" box-manager.js
          grep -Fq \"ancient-shard\" box-manager.js
          grep -Fq \"galarica-cuff\" box-manager.js
          grep -Fq \"Living Dex protected\" box-manager.js
"""
build = replace_once(build, needle, extra, 'build regional markers')
BUILD.write_text(build, encoding='utf-8')

print('Applied Worlddex Box Manager v1.18.6 regional Dex test patch.')
