(() => {
  'use strict';

  let __wdManagerRefreshing = false;

  function __wdManagerCleanupUI() {
    [
      'wd-manager-shell-v110',
      'wd-box-cleaner-v13',
      'wd-box-organizer-v14',
      'wd-family-decisions-v15',
      'wd-breed-planner-v116',
      'wd-special-manager-v18',
      'wd-dex-tasks-v16',
      'wd-manager-reloading-v151'
    ].forEach(id => document.getElementById(id)?.remove());

    [
      'wd-manager-shell-v110-style',
      'wd-box-cleaner-v13-style',
      'wd-box-organizer-v14-style',
      'wd-family-decisions-v15-style',
      'wd-breed-planner-v116-style',
      'wd-special-manager-v18-style',
      'wd-dex-tasks-v16-style'
    ].forEach(id => document.getElementById(id)?.remove());
  }

  function __wdManagerLoading() {
    const el = document.createElement('div');
    el.id = 'wd-manager-reloading-v151';
    el.style.cssText = [
      'position:fixed',
      'z-index:2147483647',
      'right:16px',
      'bottom:16px',
      'padding:12px 16px',
      'background:#11151d',
      'color:#e8edf5',
      'border:1px solid #344154',
      'border-radius:10px',
      'box-shadow:0 12px 40px rgba(0,0,0,.45)',
      'font:13px system-ui,-apple-system,Segoe UI,sans-serif'
    ].join(';');
    el.textContent = 'Worlddex Box Manager: reloading live data…';
    document.body.appendChild(el);
    return el;
  }

  async function __wdManagerRun() {
      'use strict';

      const CFG = {
        protectNoEggs: true,
        protectDitto: true,
        protectNickname: true,
        protectHeldItem: true,
        protectEVTrained: true,
        protectHighFriendship: true,
        highFriendship: 220,
        protectHighIV: true,
        highIVPct: 70,
        keepPerfectMaskMin: 2,
        keepFourPerfects: true
      };

      const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

      async function getJSON(url) {
        const r = await fetch(url, {
          credentials: 'same-origin',
          cache: 'no-store'
        });
        const text = await r.text();
        let body;
        try { body = JSON.parse(text); } catch { body = text; }
        if (!r.ok) throw new Error(`${url} -> ${r.status}: ${text.slice(0, 300)}`);
        return body;
      }

      async function getText(url) {
        const r = await fetch(url, {
          credentials: 'same-origin',
          cache: 'no-store'
        });
        if (!r.ok) throw new Error(`${url} -> ${r.status}`);
        return r.text();
      }

      function globalConst(name) {
        try { return window.eval(name); } catch { return null; }
      }

      function extractConst(source, name) {
        const re = new RegExp(`\\bconst\\s+${name}\\s*=\\s*(\\{[\\s\\S]*?\\});`);
        const m = source.match(re);
        if (!m) return null;
        try { return JSON.parse(m[1]); } catch {}
        try { return Function(`"use strict"; return (${m[1]});`)(); } catch {}
        return null;
      }

      function sex(m) {
        return m?.gender === 'f' ? '♀' : m?.gender === 'm' ? '♂' : '—';
      }

      function evTotal(m) {
        return STATS.reduce((n, k) => n + Number(m?.evs?.[k] || 0), 0);
      }

      function ivSum(m) {
        return STATS.reduce((n, k) => n + Number(m?.ivs?.[k] || 0), 0);
      }

      function ivPct(m) {
        return +(ivSum(m) / 186 * 100).toFixed(2);
      }

      function ivPctLabel(m) {
        const v = Number(ivPct(m));
        if (!Number.isFinite(v)) return '—';
        return `${v.toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1')}%`;
      }

      function publicSpeciesName(name) {
        // Worlddex exposes a few internal alternate-family labels such as
        // "Dratini-Alt". Keep those identifiers internally, but never leak them
        // into player-facing Box Manager text.
        return String(name ?? '').replace(/-Alt$/i, '');
      }

      function ivString(m) {
        return STATS.map(k => Number(m?.ivs?.[k] || 0)).join('/');
      }

      function perfectStats(m) {
        return STATS.filter(k => Number(m?.ivs?.[k] || 0) === 31);
      }

      function perfectCount(m) {
        return perfectStats(m).length;
      }

      function perfectMask(m) {
        const s = perfectStats(m);
        return s.length ? s.join('+') : '-';
      }

      function physicalScore(m) {
        return ['hp', 'atk', 'def', 'spd', 'spe']
          .reduce((n, k) => n + Number(m?.ivs?.[k] || 0), 0);
      }

      function specialScore(m) {
        return ['hp', 'spa', 'def', 'spd', 'spe']
          .reduce((n, k) => n + Number(m?.ivs?.[k] || 0), 0);
      }

      function breederScore(m) {
        return perfectCount(m) * 10000 + ivSum(m) * 10 + Math.max(physicalScore(m), specialScore(m));
      }

      function formKey(m) {
        return m?.form == null ? '' : String(m.form);
      }

      function exactKey(m) {
        return [
          Number(m.dex),
          formKey(m),
          m.gender || '-',
          String(m.ability || '').toLowerCase(),
          String(m.nature || '')
        ].join('|');
      }

      function looseKey(m) {
        return [
          Number(m.dex),
          formKey(m),
          m.gender || '-',
          String(m.ability || '').toLowerCase()
        ].join('|');
      }

      function bestBy(pool, fn) {
        if (!pool.length) return null;
        return [...pool].sort((a, b) => {
          const d = fn(b) - fn(a);
          return d || breederScore(b) - breederScore(a) || Number(a.id) - Number(b.id);
        })[0];
      }

      function dominates(a, b) {
        if (!a?.ivs || !b?.ivs) return false;
        let better = false;
        for (const k of STATS) {
          const av = Number(a.ivs[k] || 0);
          const bv = Number(b.ivs[k] || 0);
          if (av < bv) return false;
          if (av > bv) better = true;
        }
        return better;
      }

      console.log(
        '%cBOX MANAGER v1.17.1 — BREED PATHS + ODDS + PROJECTS + CLEANER + ORGANIZER',
        'font-weight:bold;color:#8be9fd;font-size:14px'
      );
      console.log('%cNO AUTOMATIC RELEASES — release only from review panel after double confirmation', 'font-weight:bold;color:#ffb86c');

      const [boxRes, stateRes, nurseryRes, dataSrc, pcSrc] = await Promise.all([
        getJSON('/api/box'),
        getJSON('/api/state'),
        getJSON('/api/nursery').catch(() => ({ held: [] })),
        getText('/js/data.js'),
        getText('/js/pc.js')
      ]);

      const mons = Array.isArray(boxRes.mons) ? boxRes.mons : [];
      const state = stateRes.state || stateRes;
      const caught = new Set(Object.keys(state.dexCaught || {}).map(Number));
      const seen = new Set(Object.keys(state.dexSeen || {}).map(Number));

      const EGG_GROUP = globalConst('EGG_GROUP') || extractConst(dataSrc, 'EGG_GROUP') || {};
      const DEX = globalConst('DEX') || extractConst(dataSrc, 'DEX') || {};
      const DEX_EXTRA = globalConst('DEX_EXTRA') || extractConst(dataSrc, 'DEX_EXTRA') || {};
      const FRIEND_INTO = extractConst(pcSrc, 'FRIEND_INTO') || {};

      const nameToDex = new Map();
      const dexToName = new Map();

      for (const [name, id] of Object.entries({ ...DEX, ...DEX_EXTRA })) {
        const n = Number(id);
        if (!Number.isFinite(n)) continue;
        nameToDex.set(String(name).toLowerCase(), n);
        if (!dexToName.has(n)) dexToName.set(n, name);
      }

      for (const m of mons) {
        nameToDex.set(String(m.species || '').toLowerCase(), Number(m.dex));
        if (!dexToName.has(Number(m.dex))) dexToName.set(Number(m.dex), m.species);
        for (const e of (m.evolution || [])) {
          if (e?.to == null || !e?.name) continue;
          const to = Number(e.to);
          nameToDex.set(String(e.name).toLowerCase(), to);
          if (!dexToName.has(to)) dexToName.set(to, e.name);
        }
      }

      function friendTargets(dex) {
        const raw = FRIEND_INTO[String(dex)] ?? FRIEND_INTO[dex];
        if (!raw) return [];
        return String(raw)
          .split(/\s+or\s+/i)
          .map(s => nameToDex.get(s.trim().toLowerCase()))
          .filter(Number.isFinite)
          .map(to => ({
            to,
            name: dexToName.get(to) || `#${to}`,
            friendship: true
          }));
      }

      const BC = window.BattleCore || null;
      const boxEvos = new Map();

      for (const m of mons) {
        const d = Number(m.dex);
        if (!boxEvos.has(d)) boxEvos.set(d, []);
        for (const e of (m.evolution || [])) {
          if (e?.to == null) continue;
          const to = Number(e.to);
          if (!Number.isFinite(to)) continue;
          if (!boxEvos.get(d).some(x => Number(x.to) === to)) boxEvos.get(d).push(e);
        }
      }

      function directEvos(dex) {
        const out = [];
        const add = e => {
          if (!e || e.to == null) return;
          const to = Number(e.to);
          if (!Number.isFinite(to)) return;
          if (!out.some(x => Number(x.to) === to)) out.push({ ...e, to });
        };

        try {
          if (BC?.evolutionsOf) (BC.evolutionsOf(Number(dex)) || []).forEach(add);
        } catch {}

        (boxEvos.get(Number(dex)) || []).forEach(add);
        friendTargets(Number(dex)).forEach(add);
        return out;
      }

      const knownDex = new Set([
        ...caught,
        ...seen,
        ...mons.map(m => Number(m.dex)),
        ...Object.values(DEX).map(Number),
        ...Object.values(DEX_EXTRA).map(Number)
      ].filter(Number.isFinite));

      for (const d of [...knownDex]) {
        for (const e of directEvos(d)) knownDex.add(Number(e.to));
      }

      const reverse = new Map();
      for (const d of knownDex) {
        for (const e of directEvos(d)) {
          const to = Number(e.to);
          if (!reverse.has(to)) reverse.set(to, new Set());
          reverse.get(to).add(Number(d));
        }
      }

      function descendants(dex) {
        const start = Number(dex);
        const out = new Set();
        const q = [start];
        const visited = new Set([start]);

        while (q.length) {
          const cur = q.shift();
          for (const e of directEvos(cur)) {
            const to = Number(e.to);
            if (!Number.isFinite(to) || visited.has(to)) continue;
            visited.add(to);
            out.add(to);
            q.push(to);
          }
        }
        return [...out];
      }

      function rootsOf(dex) {
        const start = Number(dex);
        const roots = new Set();
        const q = [start];
        const visited = new Set();

        while (q.length) {
          const cur = q.shift();
          if (visited.has(cur)) continue;
          visited.add(cur);
          const prev = [...(reverse.get(cur) || [])];
          if (!prev.length) roots.add(cur);
          else prev.forEach(p => q.push(p));
        }
        return [...roots];
      }

      function groupsOf(m) {
        const g = EGG_GROUP[String(m.dex)] || EGG_GROUP[Number(m.dex)] || [];
        return Array.isArray(g) ? g : [];
      }

      function canBreedSpecies(m) {
        const g = groupsOf(m);
        return g.length > 0 && !g.includes('no-eggs');
      }

      function shareEggGroup(a, b) {
        const ga = groupsOf(a).filter(x => x !== 'no-eggs' && x !== 'ditto');
        const gb = groupsOf(b).filter(x => x !== 'no-eggs' && x !== 'ditto');
        return ga.some(x => gb.includes(x));
      }

      const allOwnedMap = new Map();
      for (const m of mons) if (m?.id != null) allOwnedMap.set(Number(m.id), m);
      for (const m of (state.team || [])) if (m?.id != null) allOwnedMap.set(Number(m.id), m);
      for (const m of (nurseryRes.held || [])) if (m?.id != null) allOwnedMap.set(Number(m.id), m);

      const allOwned = [...allOwnedMap.values()];
      const dittos = allOwned.filter(m => Number(m.dex) === 132);

      // Breed Planner needs to know where an owned Pokémon currently lives.
      // Nursery Pokémon are NOT returned by /api/box, so they are deliberately
      // merged into allOwned above but kept unavailable for normal box actions.
      const boxOwnedIds = new Set(mons.map(m => Number(m.id)).filter(Number.isFinite));
      const teamOwnedIds = new Set((state.team || []).map(m => Number(m.id)).filter(Number.isFinite));
      const nurseryHeld = Array.isArray(nurseryRes.held) ? nurseryRes.held : [];
      const nurseryOwnedIds = new Set(nurseryHeld.map(m => Number(m.id)).filter(Number.isFinite));

      function ownedLocation(m) {
        const id = Number(m?.id);
        if (nurseryOwnedIds.has(id)) return 'NURSERY';
        if (teamOwnedIds.has(id)) return 'TEAM';
        if (boxOwnedIds.has(id)) return 'BOX';
        return 'OTHER';
      }

      function pairIsCurrentNurseryPair(aId, bId) {
        const a = Number(aId), b = Number(bId);
        if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
        return nurseryOwnedIds.has(a) && nurseryOwnedIds.has(b) && nurseryOwnedIds.size === 2;
      }

      function hasBreedingPartner(m) {
        if (!canBreedSpecies(m)) return false;
        if (Number(m.dex) === 132) return false;

        if (dittos.some(d => Number(d.id) !== Number(m.id))) return true;
        if (m.gender !== 'm' && m.gender !== 'f') return false;

        const wanted = m.gender === 'f' ? 'm' : 'f';
        return allOwned.some(p =>
          Number(p.id) !== Number(m.id) &&
          p.gender === wanted &&
          Number(p.dex) !== 132 &&
          canBreedSpecies(p) &&
          shareEggGroup(m, p)
        );
      }

      function monDirectEvos(m) {
        const out = [];
        for (const e of (m?.evolution || [])) {
          if (!e || e.to == null) continue;
          const to = Number(e.to);
          if (!Number.isFinite(to)) continue;
          if (!out.some(x => Number(x.to) === to)) out.push({ ...e, to });
        }
        return out;
      }

      function normalizeSexRequirement(v) {
        if (v == null) return null;
        const s = String(v).trim().toLowerCase();
        if (['m','male','♂','man','boy'].includes(s)) return 'm';
        if (['f','female','♀','woman','girl'].includes(s)) return 'f';
        return null;
      }

      function evolutionSexRequirement(e) {
        if (!e || typeof e !== 'object') return null;

        if (e.maleOnly === true || e.onlyMale === true) return 'm';
        if (e.femaleOnly === true || e.onlyFemale === true) return 'f';

        const directKeys = [
          'sex','gender','requiredSex','requiredGender',
          'sexRequired','genderRequired'
        ];
        for (const key of directKeys) {
          const req = normalizeSexRequirement(e[key]);
          if (req) return req;
        }

        for (const nested of [e.condition, e.conditions, e.require, e.requires]) {
          if (!nested || typeof nested !== 'object' || Array.isArray(nested)) continue;
          for (const key of directKeys) {
            const req = normalizeSexRequirement(nested[key]);
            if (req) return req;
          }
          if (nested.maleOnly === true || nested.onlyMale === true) return 'm';
          if (nested.femaleOnly === true || nested.onlyFemale === true) return 'f';
        }

        return null;
      }

      function evolutionAllowsMon(m, e) {
        const req = evolutionSexRequirement(e);
        if (!req) return true;
        return String(m?.gender || '').toLowerCase() === req;
      }

      function dexEvolutionMissing(m) {
        // Use the exact live evolution list attached to THIS Pokémon/form.
        // Do not merge BattleCore branches by base dex here: that was the source
        // of false positives such as regular Linoone being kept for Obstagoon.
        //
        // Also honor explicit male/female requirements when the evolution record
        // exposes them. EVOLVE tasks therefore keep one actually eligible source.
        return monDirectEvos(m)
          .filter(e => evolutionAllowsMon(m, e))
          .map(e => Number(e.to))
          .filter(Number.isFinite)
          .filter(d => !caught.has(d));
      }

      function dexBreedMissing(m) {
        if (!hasBreedingPartner(m)) return [];
        return rootsOf(m.dex).filter(d => !caught.has(Number(d)));
      }

      function hardProtection(m) {
        const reasons = [];
        const eggGroups = groupsOf(m);

        // no-eggs duplicate retention is handled by the user-visible Copies policy;
        if (CFG.protectDitto && Number(m.dex) === 132) reasons.push('DITTO_PROTECTED');
        if (m.favourite) reasons.push('FAVOURITE');
        if (m.shiny) reasons.push('SHINY');
        if (m.shadow) reasons.push('SHADOW');
        if (m.rainbow) reasons.push('RAINBOW');
        if (CFG.protectNickname && String(m.nick || '').trim()) reasons.push('NICKNAME_LOCKED');
        if (CFG.protectHeldItem && m.item) reasons.push('HELD_ITEM');
        if (CFG.protectEVTrained && evTotal(m) > 0) reasons.push('EV_TRAINED');
        if (CFG.protectHighIV && ivPct(m) >= CFG.highIVPct) {
          reasons.push(`HIGH_IV_${CFG.highIVPct}PLUS`);
        }
        if (CFG.protectHighFriendship && Number(m.friendship || 0) >= CFG.highFriendship) {
          reasons.push('HIGH_FRIENDSHIP');
        }

        const evoMissing = dexEvolutionMissing(m);
        const breedMissing = dexBreedMissing(m);

        // Dex completion is handled by a dedicated task core. Only ONE selected
        // source/parent per missing target is protected, instead of every mon that
        // could theoretically help.
        return { reasons, evoMissing, breedMissing };
      }

      const hardById = new Map();
      for (const m of mons) hardById.set(Number(m.id), hardProtection(m));

      const exactPools = new Map();
      const loosePools = new Map();

      for (const m of mons) {
        if (!m.ivs) continue;
        const ek = exactKey(m);
        const lk = looseKey(m);
        if (!exactPools.has(ek)) exactPools.set(ek, []);
        if (!loosePools.has(lk)) loosePools.set(lk, []);
        exactPools.get(ek).push(m);
        loosePools.get(lk).push(m);
      }

      const exactCore = new Set();
      const exactCoreWhy = new Map();

      function markCore(mon, reason) {
        if (!mon) return;
        const id = Number(mon.id);
        exactCore.add(id);
        if (!exactCoreWhy.has(id)) exactCoreWhy.set(id, new Set());
        exactCoreWhy.get(id).add(reason);
      }

      for (const pool of exactPools.values()) {
        if (!pool.length) continue;

        markCore(bestBy(pool, ivSum), 'CORE_BEST_OVERALL');
        markCore(bestBy(pool, physicalScore), 'CORE_PHYSICAL');
        markCore(bestBy(pool, specialScore), 'CORE_SPECIAL');

        for (const stat of STATS) {
          markCore(bestBy(pool, m => Number(m?.ivs?.[stat] || 0)), `CORE_BEST_${stat.toUpperCase()}`);
        }

        const masks = new Map();
        for (const m of pool) {
          const pc = perfectCount(m);
          if (pc < CFG.keepPerfectMaskMin) continue;
          const mask = perfectMask(m);
          if (!masks.has(mask)) masks.set(mask, []);
          masks.get(mask).push(m);
        }

        for (const [mask, list] of masks.entries()) {
          markCore(bestBy(list, breederScore), `CORE_MASK_${mask}`);
        }

        if (CFG.keepFourPerfects) {
          for (const m of pool) {
            if (perfectCount(m) >= 4) markCore(m, 'CORE_4PLUS_PERFECT');
          }
        }
      }

      // Male breeders can matter beyond their own species: preserve an egg-group donor core.
      const maleEggCore = new Set();
      const maleEggWhy = new Map();

      function markEggCore(mon, group, reason) {
        if (!mon) return;
        const id = Number(mon.id);
        maleEggCore.add(id);
        if (!maleEggWhy.has(id)) maleEggWhy.set(id, new Set());
        maleEggWhy.get(id).add(`${reason}:${group}`);
      }

      const eggMalePools = new Map();
      for (const m of mons) {
        if (!m.ivs || m.gender !== 'm' || Number(m.dex) === 132 || !canBreedSpecies(m)) continue;
        for (const g of groupsOf(m).filter(x => x !== 'no-eggs' && x !== 'ditto')) {
          if (!eggMalePools.has(g)) eggMalePools.set(g, []);
          eggMalePools.get(g).push(m);
        }
      }

      for (const [g, pool] of eggMalePools.entries()) {
        markEggCore(bestBy(pool, breederScore), g, 'EGG_BEST_OVERALL');
        markEggCore(bestBy(pool, physicalScore), g, 'EGG_PHYSICAL');
        markEggCore(bestBy(pool, specialScore), g, 'EGG_SPECIAL');

        for (const stat of STATS) {
          const perfect = pool.filter(m => Number(m?.ivs?.[stat] || 0) === 31);
          if (perfect.length) markEggCore(bestBy(perfect, breederScore), g, `EGG_31_${stat.toUpperCase()}`);
        }
      }

      // ─────────────────────────────────────────────────────────────
      // FAMILY / BREEDING DECISIONS v1.17.1
      // A family is an evolution line (Ralts/Gardevoir/Gallade, Charmander/
      // Charmeleon/Charizard, etc.). The user decides whether each line is
      // actively being bred, parked for later, finished, or not worth breeding.
      // Decisions are saved in localStorage and affect BOTH Cleaner and Organizer.
      // ─────────────────────────────────────────────────────────────

      const FAMILY_MODE = {
        AUTO: 'AUTO',
        BREED: 'BREED',
        TO_BE: 'TO_BE',
        DONE: 'DONE',
        NO_BREED: 'NO_BREED',
        KEEP_ALL: 'KEEP_ALL'
      };

      const FAMILY_MODE_LABEL = {
        AUTO: 'AUTO (collection / Dex)',
        BREED: 'BREED NOW',
        TO_BE: 'TO-BE / later',
        DONE: 'DONE (finished)',
        NO_BREED: 'NO BREED / stop',
        KEEP_ALL: 'KEEP ALL'
      };

      const BOX_POLICY = {
        AUTO: 'AUTO',
        OWN: 'OWN',
        MIX: 'MIX'
      };

      const BOX_POLICY_LABEL = {
        AUTO: 'AUTO (smart fit)',
        OWN: 'OWN BOX',
        MIX: 'CAN MIX'
      };

      const RETENTION = {
        AUTO: 'AUTO',
        BEST1: 'BEST1',
        BEST2: 'BEST2',
        ALL: 'ALL'
      };

      const RETENTION_LABEL = {
        AUTO: 'AUTO',
        BEST1: 'KEEP BEST 1',
        BEST2: 'KEEP BEST 2',
        ALL: 'KEEP ALL COPIES'
      };

      const FAMILY_STORE_KEY = 'worlddex.boxManager.v1.5.familyDecisions';
      const SPECIAL_STORE_KEY = 'worlddex.boxManager.v1.8.specialDecisions';

      function specialEntryKey(m) {
        return `${Number(m.dex)}|${m.form == null ? '' : String(m.form)}`;
      }

      function loadSpecialDecisions() {
        let raw = {};
        try { raw = JSON.parse(localStorage.getItem(SPECIAL_STORE_KEY) || '{}') || {}; } catch {}
        const out = new Map();
        for (const [key, value] of Object.entries(raw)) {
          if (Object.values(RETENTION).includes(value)) out.set(key, value);
        }
        return out;
      }

      const specialDecisions = loadSpecialDecisions();

      function saveSpecialDecisions() {
        const obj = {};
        for (const [key, value] of specialDecisions.entries()) obj[key] = value;
        try { localStorage.setItem(SPECIAL_STORE_KEY, JSON.stringify(obj)); } catch {}
      }

      function specialRetention(mOrKey) {
        const key = typeof mOrKey === 'string' ? mOrKey : specialEntryKey(mOrKey);
        return specialDecisions.get(key) || RETENTION.AUTO;
      }

      function setSpecialRetention(key, value) {
        if (!Object.values(RETENTION).includes(value)) return;
        if (value === RETENTION.AUTO) specialDecisions.delete(key);
        else specialDecisions.set(key, value);
        saveSpecialDecisions();
        rebuildAnalysis(true);
        organizerPlan = null;
        updatePanelCounts?.();
        renderCandidateRows?.();
        renderSpecialRows?.();
        updateSpecialButtons?.();
      }

      function familyRootDexes(dex) {
        const r = rootsOf(Number(dex)).map(Number).filter(Number.isFinite).sort((a,b) => a-b);
        return r.length ? r : [Number(dex)];
      }

      function familyKeyFromDex(dex) {
        return familyRootDexes(dex).join('+');
      }

      function familyKeyOf(m) {
        return familyKeyFromDex(Number(m.dex));
      }

      function familyLabelFromKey(key) {
        const roots = String(key).split('+').map(Number).filter(Number.isFinite);
        return roots.map(d => dexToName.get(d) || `#${d}`).join('/') || String(key);
      }

      const familyInfos = new Map();
      for (const m of mons) {
        const key = familyKeyOf(m);
        if (!familyInfos.has(key)) {
          familyInfos.set(key, {
            key,
            label: familyLabelFromKey(key),
            roots: familyRootDexes(Number(m.dex)),
            mons: [],
            species: new Set(),
            breedable: false
          });
        }
        const f = familyInfos.get(key);
        f.mons.push(m);
        f.species.add(String(m.species || 'Unknown'));
        if (canBreedSpecies(m) && Number(m.dex) !== 132) f.breedable = true;
      }

      function defaultFamilyMode(info) {
        const n = String(info?.label || '').toLowerCase();
        // Defaults requested in this session. They only apply when the user has
        // never saved an explicit decision for the family.
        if (n === 'ralts' || n === 'abra') return FAMILY_MODE.DONE;
        if (n === 'deino' || n === 'dratini') return FAMILY_MODE.TO_BE;
        return FAMILY_MODE.AUTO;
      }

      function defaultBoxPolicy(info, mode = defaultFamilyMode(info)) {
        // AUTO does not mean "give everybody a private box". The organizer decides
        // which families deserve one based on size, breeding status and the actual
        // 32-box budget. OWN and MIX are explicit user overrides.
        return BOX_POLICY.AUTO;
      }

      function loadFamilyDecisions() {
        let saved = {};
        try { saved = JSON.parse(localStorage.getItem(FAMILY_STORE_KEY) || '{}') || {}; } catch {}
        const out = new Map();
        for (const [key, info] of familyInfos.entries()) {
          const raw = saved[key] || {};
          // v1.5.4 bug: the UI emitted "DONE" but FAMILY_MODE.DONE was
          // "DONE (finished)". Reload therefore rejected the saved value.
          // Accept the old representation too, then normalize to DONE.
          const savedMode = raw.mode === 'DONE (finished)' ? FAMILY_MODE.DONE : raw.mode;
          const mode = Object.values(FAMILY_MODE).includes(savedMode) ? savedMode : defaultFamilyMode(info);
          // v1.5/v1.5.1 stored a boolean `dedicated` whose default was far too
          // aggressive (almost every repeated family became private). We
          // intentionally migrate old booleans to AUTO so the 32-box layout can
          // smart-fit. New explicit choices are stored as boxPolicy.
          const boxPolicy = Object.values(BOX_POLICY).includes(raw.boxPolicy)
            ? raw.boxPolicy
            : defaultBoxPolicy(info, mode);
          const retention = Object.values(RETENTION).includes(raw.retention)
            ? raw.retention
            : RETENTION.AUTO;
          out.set(key, { mode, boxPolicy, retention });
        }
        return out;
      }

      const familyDecisions = loadFamilyDecisions();

      // Saved Breed Planner targets are separate from family cleanup settings,
      // but saving a plan automatically promotes the family to TO-BE or BREED NOW.
      const BREED_PLAN_STORE_KEY = 'worlddex.boxManager.v1.16.breedPlans';

      function loadBreedPlans() {
        let raw = {};
        try { raw = JSON.parse(localStorage.getItem(BREED_PLAN_STORE_KEY) || '{}') || {}; } catch {}
        const out = new Map();
        for (const [key, plan] of Object.entries(raw)) {
          if (!plan || typeof plan !== 'object') continue;
          out.set(key, plan);
        }
        return out;
      }

      const breedPlans = loadBreedPlans();

      function saveBreedPlans() {
        const obj = {};
        for (const [key, plan] of breedPlans.entries()) obj[key] = plan;
        try { localStorage.setItem(BREED_PLAN_STORE_KEY, JSON.stringify(obj)); } catch {}
      }

      function breedPlanNurseryActive(plan) {
        if (!plan || nurseryHeld.length !== 2) return false;
        const [a,b] = nurseryHeld;
        const matchesProducer = (producer, partner) => {
          if (!producer || !partner) return false;
          if (familyKeyOf(producer) !== String(plan.familyKey || '')) return false;
          if (Number(partner.dex) === 132) return canBreedSpecies(producer);
          return producer.gender === 'f' && partner.gender === 'm' && shareEggGroup(producer, partner);
        };
        return matchesProducer(a,b) || matchesProducer(b,a);
      }

      function breedPlanSuggestedMode(plan) {
        return breedPlanNurseryActive(plan) ? FAMILY_MODE.BREED : FAMILY_MODE.TO_BE;
      }

      function collectBreedPlanProtectedIds() {
        const ids = new Set();
        for (const [key, plan] of breedPlans.entries()) {
          const mode = familyDecision(key).mode;
          if (mode !== FAMILY_MODE.BREED && mode !== FAMILY_MODE.TO_BE) continue;
          for (const id of [plan?.parentAId, plan?.parentBId, ...(plan?.protectedIds || [])]) {
            const n = Number(id);
            if (Number.isFinite(n)) ids.add(n);
          }
          for (const step of (plan?.pathSteps || [])) {
            for (const id of [step?.parentAId, step?.parentBId, step?.donorId]) {
              const n = Number(id);
              if (Number.isFinite(n)) ids.add(n);
            }
          }
        }
        return ids;
      }

      function saveFamilyDecisions() {
        const obj = {};
        for (const [key, d] of familyDecisions.entries()) {
          obj[key] = {
            mode: d.mode,
            boxPolicy: d.boxPolicy || BOX_POLICY.AUTO,
            retention: d.retention || RETENTION.AUTO
          };
        }
        try { localStorage.setItem(FAMILY_STORE_KEY, JSON.stringify(obj)); } catch {}
      }

      function syncBreedPlanFamilyModes(persist = true) {
        let changed = false;
        let plansChanged = false;
        for (const [key, plan] of breedPlans.entries()) {
          if (!plan || plan.autoManagedMode === false) continue;
          const d = familyDecision(key);
          const suggested = breedPlanSuggestedMode(plan);
          // Existing v1.16 projects could remain AUTO after reload. Treat
          // AUTO/TO-BE/BREED as planner-managed states; explicit DONE/NO-BREED/
          // KEEP-ALL choices remain user overrides.
          if ([FAMILY_MODE.AUTO, FAMILY_MODE.TO_BE, FAMILY_MODE.BREED].includes(d.mode) && d.mode !== suggested) {
            familyDecisions.set(key, { ...d, mode:suggested });
            changed = true;
          }
          if (plan.lastAutoMode !== suggested) {
            breedPlans.set(key, { ...plan, lastAutoMode:suggested, autoManagedMode:true });
            plansChanged = true;
          }
        }
        if (persist && changed) saveFamilyDecisions();
        if (persist && plansChanged) saveBreedPlans();
        return changed || plansChanged;
      }

      function familyDecision(mOrKey) {
        const key = typeof mOrKey === 'string' ? mOrKey : familyKeyOf(mOrKey);
        const info = familyInfos.get(key);
        if (!familyDecisions.has(key)) {
          const mode = defaultFamilyMode(info);
          familyDecisions.set(key, {
            mode,
            boxPolicy: defaultBoxPolicy(info, mode),
            retention: RETENTION.AUTO
          });
        }
        return familyDecisions.get(key);
      }

      function familyMode(m) {
        return familyDecision(m).mode;
      }

      function familyBoxPolicy(mOrKey) {
        return familyDecision(mOrKey).boxPolicy || BOX_POLICY.AUTO;
      }

      function familyRetention(mOrKey) {
        return familyDecision(mOrKey).retention || RETENTION.AUTO;
      }

      function isAggressiveFamilyMode(mode) {
        return mode === FAMILY_MODE.DONE || mode === FAMILY_MODE.NO_BREED;
      }

      function isFinalDex(dex) {
        return directEvos(Number(dex)).length === 0;
      }

      function absoluteReasonsFor(m) {
        const hard = hardById.get(Number(m.id)) || { reasons: [], evoMissing: [], breedMissing: [] };
        return hard.reasons.filter(x => x !== 'DEX_EVOLUTION' && x !== 'DEX_BREED');
      }

      function dynamicProtection(m) {
        const hard = hardById.get(Number(m.id)) || { reasons: [], evoMissing: [], breedMissing: [] };
        return {
          reasons: absoluteReasonsFor(m),
          evoMissing: hard.evoMissing || [],
          breedMissing: hard.breedMissing || []
        };
      }

      function activeBreedingEggGroups() {
        const out = new Set();
        for (const [key, info] of familyInfos.entries()) {
          const mode = familyDecision(key).mode;
          if (mode !== FAMILY_MODE.BREED && mode !== FAMILY_MODE.TO_BE) continue;
          for (const m of info.mons) {
            for (const g of groupsOf(m)) if (g !== 'no-eggs' && g !== 'ditto') out.add(g);
          }
        }
        return out;
      }

      function computeSyncUtilityCore() {
        // Synchronize utility: keep ONE best Pokémon per nature globally, not a
        // whole army of Abra/Ralts duplicates. Hard-protected Pokémon are allowed
        // to satisfy the slot so they do not cause an extra keeper.
        const byNature = new Map();
        for (const m of mons) {
          if (String(m.ability || '').toLowerCase().replace(/[\s_-]+/g, '') !== 'synchronize') continue;
          const nature = String(m.nature || 'Unknown');
          if (!byNature.has(nature)) byNature.set(nature, []);
          byNature.get(nature).push(m);
        }
        const out = new Set();
        const why = new Map();
        for (const [nature, pool] of byNature.entries()) {
          const best = [...pool].sort((a,b) => {
            const fa = isFinalDex(a.dex) ? 1 : 0;
            const fb = isFinalDex(b.dex) ? 1 : 0;
            return (fb-fa) || breederScore(b)-breederScore(a) || Number(b.lvl||0)-Number(a.lvl||0) || Number(a.id)-Number(b.id);
          })[0];
          if (best) {
            out.add(Number(best.id));
            why.set(Number(best.id), `SYNCRO_CORE_${nature}`);
          }
        }
        return { ids: out, why };
      }

      function livingDexKey(m) {
        return `${Number(m.dex)}|${m.form == null ? '' : String(m.form)}`;
      }

      function computeLivingDexCore() {
        // Keep one representative for every exact Dex entry/form currently owned.
        // This is the "living collection" floor: one Vaporeon, one Zigzagoon,
        // one Linoone, one Gardevoir, one Gallade, etc.
        const byEntry = new Map();
        for (const m of mons) {
          const key = livingDexKey(m);
          if (!byEntry.has(key)) byEntry.set(key, []);
          byEntry.get(key).push(m);
        }

        const ids = new Set();
        const why = new Map();

        for (const pool of byEntry.values()) {
          const best = [...pool].sort((a,b) => {
            const aa = absoluteReasonsFor(a).length ? 1 : 0;
            const ab = absoluteReasonsFor(b).length ? 1 : 0;
            if (aa !== ab) return ab - aa; // let an already-protected mon fill the slot
            const sa = syncUtilityCore.ids.has(Number(a.id)) ? 1 : 0;
            const sb = syncUtilityCore.ids.has(Number(b.id)) ? 1 : 0;
            if (sa !== sb) return sb - sa; // same for the global Synchronize core
            return breederScore(b)-breederScore(a) ||
                   Number(b.lvl||0)-Number(a.lvl||0) ||
                   Number(a.id)-Number(b.id);
          })[0];

          if (best) {
            ids.add(Number(best.id));
            why.set(
              Number(best.id),
              `LIVING_DEX_${best.species}${best.form ? '_' + best.form : ''}`
            );
          }
        }
        return { ids, why };
      }


      function retentionEntryKey(m) {
        return `${Number(m.dex)}|${m.form == null ? '' : String(m.form)}`;
      }

      function familyContainsNoEggs(mOrKey) {
        const key = typeof mOrKey === 'string' ? mOrKey : familyKeyOf(mOrKey);
        const info = familyInfos.get(key);
        return !!info?.mons?.some(m => groupsOf(m).includes('no-eggs'));
      }

      function effectiveRetention(m) {
        if (groupsOf(m).includes('no-eggs')) {
          // No-eggs is deliberately controlled per exact species/form in the
          // Specials panel. AUTO is the safe default: keep every copy.
          const special = specialRetention(m);
          if (special !== RETENTION.AUTO) return special;
          return RETENTION.ALL;
        }

        const configured = familyRetention(m);
        if (configured !== RETENTION.AUTO) return configured;

        // Ordinary collection mode: one representative per exact Dex/form.
        return RETENTION.BEST1;
      }

      function retentionRank(a, b) {
        const absA = absoluteReasonsFor(a).length ? 1 : 0;
        const absB = absoluteReasonsFor(b).length ? 1 : 0;
        if (absA !== absB) return absB - absA;

        const syncA = syncUtilityCore.ids.has(Number(a.id)) ? 1 : 0;
        const syncB = syncUtilityCore.ids.has(Number(b.id)) ? 1 : 0;
        if (syncA !== syncB) return syncB - syncA;

        return breederScore(b)-breederScore(a) ||
               Number(b.lvl||0)-Number(a.lvl||0) ||
               Number(a.id)-Number(b.id);
      }

      function computeRetentionCore() {
        const ids = new Set();
        const why = new Map();
        const pools = new Map();

        for (const m of mons) {
          const key = retentionEntryKey(m);
          if (!pools.has(key)) pools.set(key, []);
          pools.get(key).push(m);
        }

        for (const pool of pools.values()) {
          if (!pool.length) continue;
          const policy = effectiveRetention(pool[0]);

          if (policy === RETENTION.ALL) {
            for (const m of pool) {
              ids.add(Number(m.id));
              why.set(Number(m.id), 'RETENTION_KEEP_ALL');
            }
            continue;
          }

          const keepN = policy === RETENTION.BEST2 ? 2 : 1;
          const ranked = [...pool].sort(retentionRank);

          ranked.slice(0, keepN).forEach((m, i) => {
            ids.add(Number(m.id));
            why.set(Number(m.id), `RETENTION_BEST_${keepN}_${i + 1}`);
          });
        }

        return { ids, why };
      }

      function computeDexTaskCore() {
        // Dex-completion tasks are separate from personal breeding projects:
        //
        // EVOLVE: preserve ONE source that can actually perform the missing
        // evolution (including explicit sex requirements when exposed by data).
        //
        // BREED: preserve a usable PAIR when possible: one female + one male.
        // This prevents finished/NO-BREED cleanup from reducing a Dex breeding
        // line (e.g. Typhlosion -> Cyndaquil) to a single parent.
        const evoPools = new Map();
        const breedPools = new Map();

        for (const m of mons) {
          const hard = hardById.get(Number(m.id)) || { evoMissing:[], breedMissing:[] };

          for (const target of (hard.evoMissing || [])) {
            const d = Number(target);
            if (!Number.isFinite(d) || caught.has(d)) continue;
            if (!evoPools.has(d)) evoPools.set(d, []);
            evoPools.get(d).push(m);
          }

          for (const target of (hard.breedMissing || [])) {
            const d = Number(target);
            if (!Number.isFinite(d) || caught.has(d)) continue;
            if (!breedPools.has(d)) breedPools.set(d, []);
            breedPools.get(d).push(m);
          }
        }

        const evoParents = new Map();   // monId -> target dex[]
        const breedParents = new Map(); // monId -> target dex[]
        const tasks = [];

        const addMap = (map,id,target) => {
          id = Number(id);
          if (!map.has(id)) map.set(id, []);
          if (!map.get(id).includes(target)) map.get(id).push(target);
        };

        const parentRank = (a,b) =>
          breederScore(b)-breederScore(a) ||
          Number(b.lvl||0)-Number(a.lvl||0) ||
          Number(a.id)-Number(b.id);

        const labelMon = m =>
          `#${Number(m.id)} ${m.species} ${sex(m)}`;

        // ── EVOLVE: exactly one eligible source ───────────────────
        for (const [target,pool] of evoPools.entries()) {
          const eligible = [...pool].filter(m =>
            monDirectEvos(m).some(e =>
              Number(e.to) === Number(target) &&
              evolutionAllowsMon(m, e)
            )
          );

          const best = (eligible.length ? eligible : [...pool]).sort((a,b) =>
            Number(b.lvl||0)-Number(a.lvl||0) ||
            breederScore(b)-breederScore(a) ||
            Number(a.id)-Number(b.id)
          )[0];

          if (!best) continue;

          addMap(evoParents, Number(best.id), target);

          const evoRecord = monDirectEvos(best).find(e => Number(e.to) === Number(target));
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
          });
        }

        // ── BREED: preserve ♀ + ♂ whenever the owned pool allows it ─
        for (const [target,poolRaw] of breedPools.entries()) {
          const pool = [...new Map(
            poolRaw.map(m => [Number(m.id), m])
          ).values()];

          const females = pool.filter(m => m.gender === 'f').sort(parentRank);
          const males = pool.filter(m => m.gender === 'm').sort(parentRank);
          const neutral = pool
            .filter(m => m.gender !== 'f' && m.gender !== 'm')
            .sort(parentRank);

          // Find the strongest actually compatible F/M pair rather than just the
          // individually strongest two if their egg groups somehow differ.
          let bestPair = null;
          for (const f of females) {
            for (const m of males) {
              if (!shareEggGroup(f, m)) continue;
              const score =
                breederScore(f) + breederScore(m) +
                (Number(f.lvl||0) + Number(m.lvl||0)) / 1000;
              if (!bestPair || score > bestPair.score) {
                bestPair = { female:f, male:m, score };
              }
            }
          }

          let selected = [];
          let pairStatus = '';

          if (bestPair) {
            selected = [bestPair.female, bestPair.male];
            pairStatus = 'PAIR_OK';
          } else {
            // No compatible M/F pair currently exists in the box. Preserve the
            // best available Dex parent instead of deleting the last usable one.
            // Ditto is separately hard-protected elsewhere.
            const fallback = [...females, ...males, ...neutral].sort(parentRank)[0];
            if (fallback) selected = [fallback];

            if (!females.length && !males.length) pairStatus = 'GENDERLESS_OR_DITTO';
            else if (!females.length) pairStatus = 'MISSING_FEMALE';
            else if (!males.length) pairStatus = 'MISSING_MALE';
            else pairStatus = 'NO_COMPATIBLE_MF_PAIR';
          }

          if (!selected.length) continue;

          for (const p of selected) addMap(breedParents, Number(p.id), target);

          const missingName = dexToName.get(target) || `#${target}`;
          const labels = selected.map(labelMon);

          let note;
          if (bestPair) {
            note = `Breed ${labelMon(bestPair.female)} + ${labelMon(bestPair.male)} to obtain uncaught ${missingName}`;
          } else if (pairStatus === 'MISSING_FEMALE') {
            note = `Breed task for ${missingName}: keeping ${labels[0]} but no eligible ♀ parent is currently owned in this Dex-parent pool`;
          } else if (pairStatus === 'MISSING_MALE') {
            note = `Breed task for ${missingName}: keeping ${labels[0]} but no eligible ♂ parent is currently owned in this Dex-parent pool`;
          } else if (pairStatus === 'GENDERLESS_OR_DITTO') {
            note = `Breed task for ${missingName}: keeping ${labels[0]} · genderless/unisex line, use Ditto where applicable`;
          } else {
            note = `Breed task for ${missingName}: no compatible owned ♀/♂ pair found; keeping ${labels[0]} as the safest available parent`;
          }

          tasks.push({
            Type:'BREED',
            MissingDex:target,
            Missing:missingName,
            UseID:Number(selected[0].id), // backwards-compatible primary ID
            UseIDs:selected.map(m => Number(m.id)),
            Use:selected.map(m => m.species).join(' + '),
            UseLabel:labels.join(' + '),
            Nature:selected.map(m => `${sex(m)} ${m.nature || '?'}`).join(' / '),
            Ability:selected.map(m => `${sex(m)} ${m.ability || '?'}`).join(' / '),
            PairStatus:pairStatus,
            Note:note
          });
        }

        tasks.sort((a,b) =>
          String(a.Type).localeCompare(String(b.Type)) ||
          String(a.Missing).localeCompare(String(b.Missing))
        );

        return { evoParents, breedParents, tasks };
      }

      const monById = new Map(mons.map(m => [Number(m.id), m]));
      let rows = [];
      let candidates = [];
      let keep = [];
      let candidateById = new Map();
      let candidateFingerprints = new Map();
      let syncUtilityCore = { ids:new Set(), why:new Map() };
      let livingDexCore = { ids:new Set(), why:new Map() };
      let retentionCore = { ids:new Set(), why:new Map() };
      let dexTaskCore = { evoParents:new Map(), breedParents:new Map(), tasks:[] };
      let activeEggGroups = new Set();
      let activeBreedPlanProtectedIds = new Set();

      const selectedIds = new Set();
      const releasedIds = new Set();
      const releaseErrors = new Map();

      function monFingerprint(m) {
        if (!m) return null;
        return JSON.stringify({
          id: Number(m.id),
          dex: Number(m.dex),
          species: String(m.species || ''),
          form: m.form == null ? null : String(m.form),
          gender: m.gender == null ? null : String(m.gender),
          nature: String(m.nature || ''),
          ability: String(m.ability || ''),
          ivs: STATS.map(k => Number(m?.ivs?.[k] || 0))
        });
      }

      function rebuildAnalysis(resetSelection = true) {
        activeEggGroups = activeBreedingEggGroups();
        activeBreedPlanProtectedIds = collectBreedPlanProtectedIds();
        syncUtilityCore = computeSyncUtilityCore();
        retentionCore = computeRetentionCore();
        livingDexCore = computeLivingDexCore();
        dexTaskCore = computeDexTaskCore();

        const nextRows = [];

        for (const m of mons) {
          if (releasedIds.has(Number(m.id))) continue;

          const hard = dynamicProtection(m);
          const mode = familyMode(m);
          const coreReasons = [...(exactCoreWhy.get(Number(m.id)) || [])];
          const eggReasons = [...(maleEggWhy.get(Number(m.id)) || [])];
          const activeEggDonor = maleEggCore.has(Number(m.id)) &&
            groupsOf(m).some(g => activeEggGroups.has(g));
          const explicitBreeding = mode === FAMILY_MODE.BREED || mode === FAMILY_MODE.TO_BE;

          let status = 'KEEP';
          let reason = '';
          let dominatedBy = '';

          if (mode === FAMILY_MODE.KEEP_ALL) {
            reason = 'FAMILY_KEEP_ALL';
          } else if (hard.reasons.length) {
            reason = hard.reasons.join(', ');
          } else if (activeBreedPlanProtectedIds.has(Number(m.id))) {
            reason = 'BREED_PLAN_RESERVED';
          } else if (dexTaskCore.evoParents.has(Number(m.id))) {
            reason = 'DEX_TASK_EVOLVE_' + dexTaskCore.evoParents.get(Number(m.id))
              .map(d => dexToName.get(Number(d)) || `#${d}`).join('+');
          } else if (dexTaskCore.breedParents.has(Number(m.id))) {
            reason = 'DEX_TASK_BREED_' + dexTaskCore.breedParents.get(Number(m.id))
              .map(d => dexToName.get(Number(d)) || `#${d}`).join('+');
          } else if (syncUtilityCore.ids.has(Number(m.id))) {
            reason = syncUtilityCore.why.get(Number(m.id)) || 'SYNCRO_CORE';
          } else if (retentionCore.ids.has(Number(m.id))) {
            reason = retentionCore.why.get(Number(m.id)) || 'RETENTION_CORE';
          } else if (livingDexCore.ids.has(Number(m.id))) {
            reason = livingDexCore.why.get(Number(m.id)) || 'LIVING_DEX';
          } else if (explicitBreeding && exactCore.has(Number(m.id))) {
            reason = coreReasons.join(', ') || 'BREEDING_CORE';
          } else if (explicitBreeding && activeEggDonor) {
            reason = eggReasons.join(', ') || 'ACTIVE_EGG_DONOR';
          } else {
            // AUTO/DONE/NO_BREED are collection modes now: once the living-dex
            // representative, Syncro utility slot, Dex task mon and absolute
            // protections are accounted for, duplicates are release candidates.
            status = 'RELEASE_CANDIDATE';
            if (mode === FAMILY_MODE.DONE) reason = 'FAMILY_DONE_DUPLICATE';
            else if (mode === FAMILY_MODE.NO_BREED) reason = 'NO_BREED_DUPLICATE';
            else if (mode === FAMILY_MODE.AUTO) reason = 'AUTO_COLLECTION_DUPLICATE';
            else reason = 'BREEDING_REDUNDANT_OUTSIDE_CORE';

            const family = familyInfos.get(familyKeyOf(m));
            const kept = family?.mons
              ?.filter(x =>
                retentionCore.ids.has(Number(x.id)) ||
                livingDexCore.ids.has(Number(x.id)) ||
                syncUtilityCore.ids.has(Number(x.id)) ||
                dexTaskCore.evoParents.has(Number(x.id)) ||
                dexTaskCore.breedParents.has(Number(x.id)) ||
                (explicitBreeding && exactCore.has(Number(x.id)))
              )
              ?.sort((a,b) => breederScore(b)-breederScore(a))[0];
            if (kept) dominatedBy = `kept #${kept.id} ${kept.species} ${ivPct(kept)}%`;
          }

          let crossNatureBetter = '';
          if (status === 'KEEP' && !hard.reasons.length) {
            const loosePool = loosePools.get(looseKey(m)) || [];
            const cross = loosePool
              .filter(x => String(x.nature || '') !== String(m.nature || '') && dominates(x, m))
              .sort((a, b) => breederScore(b) - breederScore(a))[0] || null;
            if (cross) crossNatureBetter = `#${cross.id} ${cross.nature} ${ivPct(cross)}%`;
          }

          nextRows.push({
            ID: Number(m.id),
            Pokemon: m.species,
            Family: familyInfos.get(familyKeyOf(m))?.label || m.species,
            FamilyMode: FAMILY_MODE_LABEL[mode] || mode,
            Sex: sex(m),
            Lv: Number(m.lvl),
            Nature: m.nature || '',
            Ability: m.ability || '',
            IVpct: ivPct(m),
            Perfect: perfectCount(m),
            PerfectMask: perfectMask(m),
            IVs: ivString(m),
            Box: m.box,
            Status: status,
            Reason: reason,
            DominatedBy: dominatedBy,
            CrossNatureBetter: crossNatureBetter,
            EvoMissing: hard.evoMissing.map(d => `${dexToName.get(d) || '#' + d}(${d})`).join(', '),
            BreedMissing: hard.breedMissing.map(d => `${dexToName.get(d) || '#' + d}(${d})`).join(', '),
            EggGroups: groupsOf(m).join('/'),
            Friendship: Number(m.friendship || 0),
            EVs: evTotal(m)
          });
        }

        rows = nextRows;
        candidates = rows.filter(r => r.Status === 'RELEASE_CANDIDATE');
        keep = rows.filter(r => r.Status === 'KEEP');
        candidateById = new Map(candidates.map(r => [Number(r.ID), r]));
        candidateFingerprints = new Map(candidates.map(r => {
          const id = Number(r.ID);
          return [id, monFingerprint(monById.get(id))];
        }));

        if (resetSelection) {
          selectedIds.clear();
          for (const r of candidates) if (!releasedIds.has(Number(r.ID))) selectedIds.add(Number(r.ID));
        } else {
          for (const id of [...selectedIds]) if (!candidateById.has(id)) selectedIds.delete(id);
        }

        updateDexTaskButtons?.();
        updateSpecialButtons?.();
        return { rows, candidates, keep };
      }

      rebuildAnalysis(true);

      function printSummary() {
        const reasonCounts = {};
        for (const r of rows) {
          for (const x of String(r.Reason || '').split(/,\s*/).filter(Boolean)) reasonCounts[x] = (reasonCounts[x] || 0) + 1;
        }
        console.log('%c=== SUMMARY v1.17.1 ===', 'font-weight:bold;color:#50fa7b');
        console.table([{
          BoxPokemon: rows.length,
          DexCaught: caught.size,
          DexSeen: seen.size,
          Keep: keep.length,
          ReleaseCandidates: candidates.length,
          SyncUtilityCore: syncUtilityCore.ids.size,
          LivingDexCore: livingDexCore.ids.size,
          HighIV70Plus: mons.filter(m => ivPct(m) >= CFG.highIVPct).length,
          DexTasks: dexTaskCore.tasks.length,
          OwnBoxFamilies: [...familyInfos.values()].filter(f => familyBoxPolicy(f.key) === BOX_POLICY.OWN).length
        }]);
        console.log('%c=== FAMILY DECISIONS ===', 'font-weight:bold;color:#bd93f9');
        console.table([...familyInfos.values()]
          .filter(f => f.breedable && (f.mons.length >= 2 || familyDecision(f.key).mode !== FAMILY_MODE.AUTO))
          .map(f => ({
            Family:f.label,
            Owned:f.mons.length,
            Mode:FAMILY_MODE_LABEL[familyDecision(f.key).mode],
            Retention:familyRetention(f.key),
          BoxPolicy:familyBoxPolicy(f.key),
            Species:[...f.species].join(', ')
          }))
          .sort((a,b) => b.Owned-a.Owned || a.Family.localeCompare(b.Family)));
        console.log('%c=== RELEASE CANDIDATES (first 150) ===', 'font-weight:bold;color:#ff5555');
        console.table(candidates.slice(0,150));
      }

      printSummary();

      function show(query) {
        const q = String(query).trim().toLowerCase();
        const out = rows.filter(r => String(r.ID) === q || String(r.Pokemon).toLowerCase().includes(q) || String(r.Family).toLowerCase().includes(q));
        console.table(out);
        return out;
      }

      function showCandidates(query = '') {
        const q = String(query).trim().toLowerCase();
        const out = candidates.filter(r => !q || String(r.ID) === q || String(r.Pokemon).toLowerCase().includes(q) || String(r.Family).toLowerCase().includes(q));
        console.table(out);
        return out;
      }

      function toTSV(list = rows) {
        if (!list.length) return '';
        const cols = Object.keys(list[0]);
        const clean = v => String(v ?? '').replace(/\t/g, ' ').replace(/[\r\n]+/g, ' ');
        return [cols.join('\t'), ...list.map(r => cols.map(c => clean(r[c])).join('\t'))].join('\n');
      }

      function download(list = rows, filename = 'worlddex_box_manager_v1_15_1_analysis.tsv') {
        const blob = new Blob([toTSV(list)], { type:'text/tab-separated-values;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }

      function familyDecisionRows() {
        const candidateCounts = new Map();
        const keptReasonCounts = new Map();

        for (const r of rows) {
          const m = monById.get(Number(r.ID));
          if (!m) continue;
          const k = familyKeyOf(m);

          if (r.Status === 'RELEASE_CANDIDATE') {
            candidateCounts.set(k, (candidateCounts.get(k) || 0) + 1);
          } else {
            if (!keptReasonCounts.has(k)) keptReasonCounts.set(k, new Map());
            const bucket = keptReasonCounts.get(k);
            const reason = String(r.Reason || 'KEEP');
            bucket.set(reason, (bucket.get(reason) || 0) + 1);
          }
        }

        return [...familyInfos.values()]
          .filter(f => f.breedable && (f.mons.length >= 2 || familyDecision(f.key).mode !== FAMILY_MODE.AUTO))
          .map(f => {
            const reasonMap = keptReasonCounts.get(f.key) || new Map();
            const keptWhy = [...reasonMap.entries()]
              .sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]))
              .slice(0,4)
              .map(([reason,n]) => `${reason} ×${n}`)
              .join(' · ');
            return {
              ...f,
              decision:familyDecision(f.key),
              candidateCount:candidateCounts.get(f.key)||0,
              keptCount:f.mons.length-(candidateCounts.get(f.key)||0),
              keptWhy
            };
          })
          .sort((a,b) => b.mons.length-a.mons.length || a.label.localeCompare(b.label));
      }

      function setFamilyDecision(key, patch) {
        const current = familyDecision(key);
        familyDecisions.set(key, { ...current, ...patch });
        if (patch && Object.prototype.hasOwnProperty.call(patch, 'mode') && breedPlans.has(key)) {
          // A manual status choice (DONE / NO BREED / etc.) takes precedence over
          // the automatic TO-BE ↔ BREED NOW nursery sync until the plan is saved again.
          const plan = breedPlans.get(key);
          breedPlans.set(key, { ...plan, autoManagedMode:false });
          saveBreedPlans();
        }
        saveFamilyDecisions();
        rebuildAnalysis(true);
        organizerPlan = null;
        updatePanelCounts?.();
        renderCandidateRows?.();
        renderFamilyDecisionRows?.();
      }

      function removeBreedPlan(key) {
        const plan = breedPlans.get(key);
        if (!plan) return;
        if (!confirm(`Remove the saved breeding project for ${publicSpeciesName(plan.targetName || familyLabelFromKey(key))}?

No Pokémon will be moved or released.`)) return;

        breedPlans.delete(key);
        saveBreedPlans();

        if (plan.autoManagedMode !== false) {
          const current = familyDecision(key);
          const previous = Object.values(FAMILY_MODE).includes(plan.previousFamilyMode)
            ? plan.previousFamilyMode
            : FAMILY_MODE.AUTO;
          familyDecisions.set(key, { ...current, mode:previous });
          saveFamilyDecisions();
        }

        rebuildAnalysis(true);
        organizerPlan = null;
        updatePanelCounts?.();
        renderCandidateRows?.();
        renderFamilyDecisionRows?.();
        managerUpdateNav?.();
      }

      // Repair/synchronize projects saved by v1.16 as soon as live Nursery data
      // is available. This fixes projects that incorrectly showed AUTO after reload.
      syncBreedPlanFamilyModes(true);

      function escAttr(v) {
        return String(v ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      }

      function renderFamilyDecisionRows() {
        const tbody = document.getElementById('wd-family-tbody');
        if (!tbody) return;
        const q = String(document.getElementById('wd-family-filter')?.value || '').trim().toLowerCase();
        const list = familyDecisionRows().filter(f => !q || f.label.toLowerCase().includes(q) || [...f.species].join(' ').toLowerCase().includes(q));
        const opts = Object.entries(FAMILY_MODE_LABEL).map(([value,label]) => ({value,label}));
        const boxOpts = Object.entries(BOX_POLICY_LABEL).map(([value,label]) => ({value,label}));
        const retentionOpts = Object.entries(RETENTION_LABEL).map(([value,label]) => ({value,label}));
        tbody.innerHTML = list.map(f => {
          const d = familyDecision(f.key);
          const savedPlan = breedPlans.get(f.key);
          const autoMode = savedPlan && savedPlan.autoManagedMode !== false
            ? breedPlanSuggestedMode(savedPlan)
            : d.mode;
          const modeForUi = savedPlan && savedPlan.autoManagedMode !== false && [FAMILY_MODE.AUTO,FAMILY_MODE.TO_BE,FAMILY_MODE.BREED].includes(d.mode)
            ? autoMode
            : d.mode;
          const planSummary = savedPlan
            ? `<small class="wdf-plan-target"><b>Target:</b> ${escAttr(publicSpeciesName(savedPlan.targetName || f.label))} · ${escAttr(savedPlan.nature || 'Any nature')} · ${escAttr(savedPlan.ivLabel || '')}<span class="wdf-plan-state">${escAttr(FAMILY_MODE_LABEL[modeForUi] || modeForUi)}</span></small><div class="wdf-plan-actions"><button data-open-breed-plan="${escAttr(f.key)}">Open planner</button><button class="wdf-danger" data-remove-breed-plan="${escAttr(f.key)}">Remove project</button></div>`
            : '';
          return `<tr data-family="${escAttr(f.key)}">
            <td><b>${escAttr(publicSpeciesName(f.label))}</b><small>${escAttr([...f.species].sort().map(publicSpeciesName).join(' → '))}</small>${planSummary}</td>
            <td>${f.mons.length}</td>
            <td><select data-family-mode="${escAttr(f.key)}">${opts.map(o => `<option value="${o.value}" ${modeForUi===o.value?'selected':''}>${escAttr(o.label)}</option>`).join('')}</select></td>
            <td><select data-family-retention="${escAttr(f.key)}">${retentionOpts.map(o => `<option value="${o.value}" ${familyRetention(f.key)===o.value?'selected':''}>${escAttr(o.label)}</option>`).join('')}</select></td>
            <td><select data-family-boxpolicy="${escAttr(f.key)}">${boxOpts.map(o => `<option value="${o.value}" ${familyBoxPolicy(f.key)===o.value?'selected':''}>${escAttr(o.label)}</option>`).join('')}</select></td>
            <td><b>${f.candidateCount}</b></td>
            <td>${f.keptCount}<small title="${escAttr(f.keptWhy)}">${escAttr(f.keptWhy || '—')}</small></td>
          </tr>`;
        }).join('');

        tbody.querySelectorAll('[data-family-mode]').forEach(el => el.addEventListener('change', () => {
          setFamilyDecision(el.dataset.familyMode, { mode: el.value });
        }));
        tbody.querySelectorAll('[data-family-retention]').forEach(el => el.addEventListener('change', () => {
          setFamilyDecision(el.dataset.familyRetention, { retention:el.value });
        }));
        tbody.querySelectorAll('[data-family-boxpolicy]').forEach(el => el.addEventListener('change', () => {
          setFamilyDecision(el.dataset.familyBoxpolicy, { boxPolicy:el.value });
        }));
        tbody.querySelectorAll('[data-open-breed-plan]').forEach(el => el.addEventListener('click', () => {
          mountBreedPlannerPanel(el.dataset.openBreedPlan);
        }));
        tbody.querySelectorAll('[data-remove-breed-plan]').forEach(el => el.addEventListener('click', () => {
          removeBreedPlan(el.dataset.removeBreedPlan);
        }));
        const shown = document.getElementById('wd-family-shown');
        if (shown) shown.textContent = String(list.length);
      }


      // ─────────────────────────────────────────────────────────────
      // BREED PLANNER v1.17.1
      // Goal-first planner: choose the Pokémon you want, then rank legal pairs
      // from BOX + TEAM + NURSERY. Same-species pairs receive a strong efficiency
      // preference because Worlddex warns that different species produce Eggs
      // much more slowly. Until the exact nursery timing formula is confirmed,
      // this is deliberately a ranking heuristic, NOT an advertised egg-odds %.
      // ─────────────────────────────────────────────────────────────

      const BREED_NATURES = [
        'Hardy','Lonely','Brave','Adamant','Naughty',
        'Bold','Docile','Relaxed','Impish','Lax',
        'Timid','Hasty','Serious','Jolly','Naive',
        'Modest','Mild','Quiet','Bashful','Rash',
        'Calm','Gentle','Sassy','Careful','Quirky'
      ];

      const POWER_ITEMS = {
        hp:  { id:'power-weight', label:'Power Weight', stat:'HP' },
        atk: { id:'power-bracer', label:'Power Bracer', stat:'Atk' },
        def: { id:'power-belt', label:'Power Belt', stat:'Def' },
        spa: { id:'power-lens', label:'Power Lens', stat:'SpA' },
        spd: { id:'power-band', label:'Power Band', stat:'SpD' },
        spe: { id:'power-anklet', label:'Power Anklet', stat:'Spe' }
      };

      const BREED_ITEM_LABELS = {
        '': 'No item',
        'destiny-knot': 'Destiny Knot',
        'everstone': 'Everstone',
        ...Object.fromEntries(Object.values(POWER_ITEMS).map(x => [x.id, x.label]))
      };

      function breedPlannerGroupsForDex(dex) {
        const direct = groupsOf({ dex:Number(dex) }).filter(g => g !== 'no-eggs');
        if (direct.length) return direct;
        const key = familyKeyFromDex(Number(dex));
        const fromOwned = allOwned
          .filter(m => familyKeyOf(m) === key)
          .flatMap(m => groupsOf(m))
          .filter(g => g !== 'no-eggs');
        return [...new Set(fromOwned)];
      }

      function breedPlannerSpeciesOptions() {
        const byDex = new Map();
        for (const [name, dex] of nameToDex.entries()) {
          const d = Number(dex);
          if (!Number.isFinite(d) || d === 132 || byDex.has(d)) continue;
          if (!breedPlannerGroupsForDex(d).length) continue;
          byDex.set(d, publicSpeciesName(dexToName.get(d) || name));
        }
        return [...byDex.entries()]
          .map(([dex,name]) => ({ dex, name:String(name) }))
          .sort((a,b) => a.name.localeCompare(b.name));
      }

      function breedPlannerResolveTarget(raw) {
        const q = String(raw || '').trim().toLowerCase();
        if (!q) return null;
        let dex = nameToDex.get(q);
        if (!Number.isFinite(Number(dex)) && /^#?\d+$/.test(q)) dex = Number(q.replace('#',''));
        dex = Number(dex);
        if (!Number.isFinite(dex)) return null;
        const groups = breedPlannerGroupsForDex(dex);
        if (!groups.length) return { error:'This Pokémon does not appear breedable with the currently loaded Worlddex data.' };
        const roots = rootsOf(dex).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
        const eggDex = roots[0] || dex;
        return {
          dex,
          name:publicSpeciesName(dexToName.get(dex) || String(raw).trim()),
          familyKey:familyKeyFromDex(dex),
          eggDex,
          eggName:publicSpeciesName(dexToName.get(eggDex) || `#${eggDex}`),
          groups
        };
      }

      function breedPlannerTargetFamilyOwned(target) {
        return allOwned.filter(m => m?.ivs && familyKeyOf(m) === target.familyKey && Number(m.dex) !== 132 && canBreedSpecies(m));
      }

      function breedPlannerLegalPairs(target, desired={}) {
        const familyOwned = breedPlannerTargetFamilyOwned(target);
        const pairMap = new Map();
        const add = (producer, partner) => {
          if (!producer || !partner || Number(producer.id) === Number(partner.id)) return;
          const key = [Number(producer.id), Number(partner.id)].sort((a,b)=>a-b).join('|');
          if (pairMap.has(key)) return;
          pairMap.set(key, { a:producer, b:partner });
        };

        // Female target-family parent + compatible male gives the desired family.
        for (const female of familyOwned.filter(m => m.gender === 'f')) {
          for (const male of allOwned) {
            if (!male?.ivs || male.gender !== 'm' || Number(male.dex) === 132 || !canBreedSpecies(male)) continue;
            if (shareEggGroup(female, male)) add(female, male);
          }
          for (const ditto of dittos.filter(m => m?.ivs)) add(female, ditto);
        }

        // Target-family male / genderless + Ditto can also produce the target family.
        for (const producer of familyOwned.filter(m => m.gender !== 'f')) {
          for (const ditto of dittos.filter(m => m?.ivs)) add(producer, ditto);
        }
        const pairs = [...pairMap.values()];
        return desired.sameSpeciesOnly
          ? pairs.filter(({a,b}) => Number(a?.dex) === Number(b?.dex) && Number(a?.dex) !== 132)
          : pairs;
      }

      function breedPlannerAbilityScore(target, a, b, desiredAbility) {
        const want = String(desiredAbility || '').trim().toLowerCase();
        if (!want || want === 'any') return { score:0, text:'Any ability' };
        const producer = Number(a.dex) === 132 ? b : a;
        if (String(producer.ability || '').toLowerCase() === want) {
          return { score:26, text:`${desiredAbility} already present on the species parent` };
        }
        if (String(b.ability || '').toLowerCase() === want) {
          return { score:5, text:`${desiredAbility} exists on the partner only` };
        }
        return { score:-22, text:`${desiredAbility} is not present on the species parent` };
      }

      function breedPlannerItemSetups(a, b, nature, requiredStats) {
        const setups = [{a:'',b:''},{a:'destiny-knot',b:''},{a:'',b:'destiny-knot'}];
        const wantNature = String(nature || '') && nature !== 'Any';
        const aNature = wantNature && String(a.nature || '').toLowerCase() === String(nature).toLowerCase();
        const bNature = wantNature && String(b.nature || '').toLowerCase() === String(nature).toLowerCase();
        if (aNature) setups.push({a:'everstone',b:''},{a:'everstone',b:'destiny-knot'});
        if (bNature) setups.push({a:'',b:'everstone'},{a:'destiny-knot',b:'everstone'});

        for (const stat of requiredStats) {
          const power = POWER_ITEMS[stat];
          if (!power) continue;
          if (Number(a?.ivs?.[stat]) === 31) {
            setups.push({a:power.id,b:''},{a:power.id,b:'destiny-knot'});
            if (bNature) setups.push({a:power.id,b:'everstone'});
          }
          if (Number(b?.ivs?.[stat]) === 31) {
            setups.push({a:'',b:power.id},{a:'destiny-knot',b:power.id});
            if (aNature) setups.push({a:'everstone',b:power.id});
          }
        }
        const seen = new Set();
        return setups.filter(x => {
          const k=`${x.a}|${x.b}`;
          if (seen.has(k)) return false;
          seen.add(k); return true;
        });
      }

      function breedPlannerPowerStat(item) {
        for (const [stat, meta] of Object.entries(POWER_ITEMS)) if (meta.id === item) return stat;
        return null;
      }

      function breedPlannerScoreSetup(a, b, setup, desired) {
        const required = desired.requiredStats;
        const union = required.filter(stat => Number(a?.ivs?.[stat]) === 31 || Number(b?.ivs?.[stat]) === 31);
        const overlap = required.filter(stat => Number(a?.ivs?.[stat]) === 31 && Number(b?.ivs?.[stat]) === 31);
        const missing = required.filter(stat => Number(a?.ivs?.[stat]) !== 31 && Number(b?.ivs?.[stat]) !== 31);
        let score = union.length * 22 + overlap.length * 7 - missing.length * 46;

        const hasKnot = setup.a === 'destiny-knot' || setup.b === 'destiny-knot';
        if (hasKnot) score += 18 + Math.max(0, union.length - 2) * 4;

        for (const [holder,item] of [[a,setup.a],[b,setup.b]]) {
          const stat = breedPlannerPowerStat(item);
          if (!stat) continue;
          if (required.includes(stat) && Number(holder?.ivs?.[stat]) === 31) score += 19;
          else score -= 4;
        }

        let natureText = 'Any nature';
        if (desired.nature !== 'Any') {
          const locked = (setup.a === 'everstone' && String(a.nature).toLowerCase() === desired.nature.toLowerCase()) ||
                         (setup.b === 'everstone' && String(b.nature).toLowerCase() === desired.nature.toLowerCase());
          const present = String(a.nature).toLowerCase() === desired.nature.toLowerCase() || String(b.nature).toLowerCase() === desired.nature.toLowerCase();
          if (locked) { score += 48; natureText = `${desired.nature} locked with Everstone`; }
          else if (present) { score += 8; natureText = `${desired.nature} exists, but is not locked`; }
          else { score -= 24; natureText = `${desired.nature} is not present on either parent`; }
        }

        return { score, union, overlap, missing, hasKnot, natureText };
      }

      function breedPlannerRank(target, desired) {
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
            let score = ss.score + ability.score;

            // Efficiency preference. This is intentionally not presented as an
            // exact speed multiplier until Worlddex's nursery formula is confirmed.
            score += sameSpecies ? 58 : -12;
            if (currentNurseryPair) score += 24;
            else {
              if (ownedLocation(a) === 'NURSERY') score -= 18;
              if (ownedLocation(b) === 'NURSERY') score -= 18;
            }
            if (ownedLocation(a) === 'TEAM') score -= 3;
            if (ownedLocation(b) === 'TEAM') score -= 3;
            score += (ivSum(a)+ivSum(b))/120;

            if (!best || score > best.score) best = { ...ss, setup, score };
          }
          if (!best) continue;
          results.push({
            target,
            a,b,
            sameSpecies,
            currentNurseryPair,
            abilityText:ability.text,
            ...best
          });
        }
        return results.sort((x,y) => y.score-x.score || y.union.length-x.union.length || breederScore(y.a)+breederScore(y.b)-breederScore(x.a)-breederScore(x.b));
      }

      function breedPlannerCombinations(items, choose) {
        const out=[];
        const arr=[...items];
        const walk=(start,pick)=>{
          if (pick.length === choose) { out.push([...pick]); return; }
          for (let i=start; i<=arr.length-(choose-pick.length); i++) {
            pick.push(arr[i]); walk(i+1,pick); pick.pop();
          }
        };
        if (choose === 0) return [[]];
        if (choose < 0 || choose > arr.length) return [];
        walk(0,[]); return out;
      }

      function breedPlannerEstimatedRoll(a, b, setup, outputStats, desired, requireNature=false) {
        // Estimate using the standard modern Pokémon IV inheritance model:
        // 3 inherited IVs normally, 5 with Destiny Knot; a Power item forces
        // its holder's stat and counts as one inherited IV. Worlddex's exact
        // server-side RNG has not been independently confirmed, so this is
        // deliberately shown as an estimate rather than an exact guarantee.
        const required=[...new Set(outputStats || [])].filter(stat => STATS.includes(stat));
        const inheritedCount=(setup?.a === 'destiny-knot' || setup?.b === 'destiny-knot') ? 5 : 3;
        let forcedStat=null, forcedHolder=null;
        const aPower=breedPlannerPowerStat(setup?.a);
        const bPower=breedPlannerPowerStat(setup?.b);
        if (aPower) { forcedStat=aPower; forcedHolder=a; }
        else if (bPower) { forcedStat=bPower; forcedHolder=b; }

        const selectable=STATS.filter(stat => stat !== forcedStat);
        const randomInherited=Math.max(0, Math.min(selectable.length, inheritedCount-(forcedStat ? 1 : 0)));
        const subsets=breedPlannerCombinations(selectable, randomInherited);
        if (!subsets.length) return { probability:0, ivProbability:0, natureProbability:1, model:'estimate' };

        let ivProbability=0;
        for (const subset of subsets) {
          const inherited=new Set(subset);
          if (forcedStat) inherited.add(forcedStat);
          let p=1;
          for (const stat of required) {
            if (forcedStat === stat) {
              p *= Number(forcedHolder?.ivs?.[stat]) === 31 ? 1 : 0;
            } else if (inherited.has(stat)) {
              const pa=Number(a?.ivs?.[stat]) === 31 ? 1 : 0;
              const pb=Number(b?.ivs?.[stat]) === 31 ? 1 : 0;
              p *= (pa+pb)/2;
            } else {
              p *= 1/32;
            }
            if (!p) break;
          }
          ivProbability += p / subsets.length;
        }

        let natureProbability=1;
        if (requireNature && desired?.nature && desired.nature !== 'Any') {
          natureProbability=breedPlannerNatureLocked(a,b,setup,desired.nature) ? 1 : 1/25;
        }
        return {
          probability:ivProbability*natureProbability,
          ivProbability,
          natureProbability,
          model:'estimate'
        };
      }

      function breedPlannerOddsLabel(estimate) {
        const p=Number(estimate?.probability || 0);
        if (!(p > 0)) return '0% · no valid roll under this setup';
        const pct=p*100;
        const digits=pct >= 10 ? 1 : pct >= 1 ? 2 : pct >= .1 ? 3 : 4;
        const pctText=pct.toFixed(digits).replace(/0+$/,'').replace(/\.$/,'');
        const oneIn=Math.max(1,Math.round(1/p));
        return `${pctText}% · ≈ 1 in ${oneIn.toLocaleString()}`;
      }

      function breedPlannerIvLabel(stats) {
        const names={hp:'HP',atk:'Atk',def:'Def',spa:'SpA',spd:'SpD',spe:'Spe'};
        return stats.length === 6 ? '6×31' : stats.map(s=>names[s]).join('/') + ' = 31';
      }

      const BREED_STAT_LABELS = { hp:'HP', atk:'Atk', def:'Def', spa:'SpA', spd:'SpD', spe:'Spe' };

      function breedPlannerMaskIvString(stats) {
        const set = new Set(stats || []);
        return STATS.map(stat => set.has(stat) ? '31' : '*').join('/');
      }

      function breedPlannerNatureLocked(a, b, setup, nature) {
        if (!nature || nature === 'Any') return true;
        const want = String(nature).toLowerCase();
        return (setup?.a === 'everstone' && String(a?.nature || '').toLowerCase() === want) ||
               (setup?.b === 'everstone' && String(b?.nature || '').toLowerCase() === want);
      }

      function breedPlannerVirtualMon(target, stats, desired, natureReady, label='Previous offspring', breedDex=null) {
        const mask = new Set(stats || []);
        const nextDex=Number.isFinite(Number(breedDex)) ? Number(breedDex) : Number(target.eggDex);
        return {
          __virtual:true,
          id:null,
          dex:nextDex,
          species:publicSpeciesName(dexToName.get(nextDex) || target.eggName),
          gender:'f',
          nature:natureReady && desired.nature !== 'Any' ? desired.nature : 'Any',
          ability:desired.ability !== 'Any' ? desired.ability : 'Any',
          ivs:Object.fromEntries(STATS.map(stat => [stat, mask.has(stat) ? 31 : 0])),
          __label:label
        };
      }

      function breedPlannerBestSetupForPair(a, b, desired) {
        let best = null;
        for (const setup of breedPlannerItemSetups(a,b,desired.nature,desired.requiredStats)) {
          const score = breedPlannerScoreSetup(a,b,setup,desired);
          if (!best || score.score > best.score) best = { ...score, setup };
        }
        return best;
      }

      function breedPlannerPathDonors(target, virtual, missingStats, desired, natureReady) {
        const wantNature = desired.nature !== 'Any' && !natureReady;
        const out = [];
        for (const donor of allOwned) {
          if (!donor?.ivs || Number(donor.id) === 0) continue;
          const isDitto = Number(donor.dex) === 132;
          if (!isDitto) {
            if (donor.gender !== 'm' || !canBreedSpecies(donor) || !shareEggGroup(virtual, donor)) continue;
          }
          const adds = missingStats.filter(stat => Number(donor?.ivs?.[stat]) === 31);
          const addsNature = wantNature && String(donor.nature || '').toLowerCase() === String(desired.nature).toLowerCase();
          if (!adds.length && !addsNature) continue;

          const sameSpecies = Number(donor.dex) === Number(virtual.dex) && !isDitto;
          if (desired.sameSpeciesOnly && !sameSpecies) continue;
          let score = adds.length * 220 + (addsNature ? 95 : 0) + (sameSpecies ? 60 : 0) + ivPct(donor) / 2;
          if (ownedLocation(donor) === 'NURSERY') score -= 20;
          if (ownedLocation(donor) === 'TEAM') score -= 3;
          if (isDitto) score -= 8;
          out.push({ donor, adds, addsNature, sameSpecies, score });
        }
        return out.sort((a,b) => b.score-a.score || breederScore(b.donor)-breederScore(a.donor));
      }

      function breedPlannerBuildPath(result, desired) {
        const target = result.target;
        const required = [...desired.requiredStats];
        let mask = new Set(result.union);
        let natureReady = breedPlannerNatureLocked(result.a, result.b, result.setup, desired.nature);
        const steps = [{
          index:1,
          actual:true,
          a:result.a,
          b:result.b,
          setup:result.setup,
          outputStats:[...mask],
          addedStats:[...mask],
          natureReady,
          sameSpecies:result.sameSpecies,
          currentNurseryPair:result.currentNurseryPair,
          evolveBeforeNext: desired.sameSpeciesOnly && Number(result.a?.dex) !== Number(target.eggDex)
            ? publicSpeciesName(dexToName.get(Number(result.a.dex)) || result.a.species)
            : ''
        }];

        let blocker = '';
        for (let i=2; i<=5; i++) {
          const missing = required.filter(stat => !mask.has(stat));
          if (!missing.length && natureReady) break;

          const sameSpeciesBreedDex = desired.sameSpeciesOnly ? Number(result.a?.dex) : null;
          const virtual = breedPlannerVirtualMon(target, [...mask], desired, natureReady, `Step ${i-1} offspring`, sameSpeciesBreedDex);
          const donors = breedPlannerPathDonors(target, virtual, missing, desired, natureReady);
          if (!donors.length) {
            const bits=[];
            if (missing.length) bits.push(`no owned compatible breeder supplies ${missing.map(s=>BREED_STAT_LABELS[s]).join(', ')} at 31`);
            if (desired.nature !== 'Any' && !natureReady) bits.push(`no compatible owned breeder currently carries ${desired.nature}`);
            blocker = bits.join(' and ') || 'no useful next breeder was found';
            break;
          }

          const choice = donors[0];
          const setupInfo = breedPlannerBestSetupForPair(virtual, choice.donor, desired);
          if (!setupInfo) { blocker='no valid item setup was found for the next step'; break; }

          const nextMask = new Set(mask);
          for (const stat of required) if (Number(choice.donor?.ivs?.[stat]) === 31) nextMask.add(stat);
          const nextNatureReady = natureReady || breedPlannerNatureLocked(virtual, choice.donor, setupInfo.setup, desired.nature);
          const addedStats = [...nextMask].filter(stat => !mask.has(stat));
          const madeProgress = addedStats.length || (!natureReady && nextNatureReady);
          if (!madeProgress) { blocker='the next owned breeder does not improve the planned checkpoint'; break; }

          steps.push({
            index:i,
            actual:false,
            a:virtual,
            b:choice.donor,
            donorId:Number(choice.donor.id),
            setup:setupInfo.setup,
            outputStats:[...nextMask],
            addedStats,
            natureReady:nextNatureReady,
            sameSpecies:choice.sameSpecies,
            currentNurseryPair:false,
            evolveBeforeNext: desired.sameSpeciesOnly && Number(virtual.dex) !== Number(target.eggDex)
              ? publicSpeciesName(dexToName.get(Number(virtual.dex)) || virtual.species)
              : ''
          });
          mask = nextMask;
          natureReady = nextNatureReady;
        }

        const missingStats = required.filter(stat => !mask.has(stat));
        const complete = !missingStats.length && (desired.nature === 'Any' || natureReady);
        for (let i=0;i<steps.length;i++) {
          const next = steps[i+1];
          steps[i].final = complete && i === steps.length-1;
          steps[i].sexHint = next && Number(next?.b?.dex) !== 132 ? 'Female needed for the next cross' : 'Any sex';
          if (!next) steps[i].evolveBeforeNext='';
        }
        return { steps, complete, missingStats, natureReady, blocker };
      }

      function breedPlannerDesiredOutputHtml(step, desired, target) {
        const outputStats = step?.outputStats || [];
        const final = !!step?.final;
        const added = step?.addedStats || [];
        const nature = desired.nature === 'Any'
          ? 'Any'
          : (step?.natureReady ? desired.nature : `${desired.nature} preferred — not locked yet`);
        const ability = desired.ability === 'Any' ? 'Any' : desired.ability;
        const sixRng = final && desired.requiredStats.length === 6
          ? '<small>6×31 is still an RNG roll even when all six 31 sources are available.</small>'
          : '';
        const odds=breedPlannerEstimatedRoll(step?.a,step?.b,step?.setup,outputStats,desired,desired.nature !== 'Any' && !!step?.natureReady);
        const abilityNote=desired.ability !== 'Any' ? ' · ability chance not included' : '';
        const evolveNote=step?.evolveBeforeNext
          ? `<span><b>Before next step:</b> evolve offspring to ${escHtml(step.evolveBeforeNext)}</span>`
          : '';
        return `<div class="wdbp-output ${final?'final':''}">
          <div class="wdbp-output-title"><b>${final?'FINAL DESIRED OUTPUT':'DESIRED OUTPUT'}</b><span>${escHtml(publicSpeciesName(target.eggName))}</span></div>
          <div class="wdbp-output-iv"><b>${escHtml(breedPlannerMaskIvString(outputStats))}</b><small>${outputStats.length}/${desired.requiredStats.length} target 31s</small></div>
          <div class="wdbp-output-meta">
            <span><b>Nature:</b> ${escHtml(nature)}</span>
            <span><b>Ability:</b> ${escHtml(ability)}</span>
            <span><b>Sex:</b> ${escHtml(step?.sexHint || 'Any sex')}</span>
            ${added.length ? `<span><b>This step adds:</b> ${escHtml(added.map(s=>BREED_STAT_LABELS[s]).join(', '))}</span>` : ''}
            ${evolveNote}
            <span class="wdbp-odds"><b>Estimated roll:</b> ${escHtml(breedPlannerOddsLabel(odds))}</span>
          </div><small>Per-Egg IV${desired.nature !== 'Any' && step?.natureReady ? ' + required nature' : ''} estimate using standard inheritance${abilityNote}; Egg production speed is separate.</small>${sixRng}
        </div>`;
      }

      function breedPlannerMonCard(m, item, compact=false) {
        if (m?.__virtual) {
          return `<div class="wdbp-parent virtual">
            <div><b>${escHtml(m.__label || 'Previous offspring')}</b> <span class="wdbp-id">${escHtml(publicSpeciesName(m.species))}</span></div>
            <div class="wdbp-ivline">${escHtml(ivString(m))} <span>planned checkpoint</span></div>
            <small>${escHtml(m.nature || 'Any')} · ${escHtml(m.ability || 'Any')} · PLANNED</small>
            <div class="wdbp-item">Use: ${escHtml(BREED_ITEM_LABELS[item] || item || 'No item')}</div>
          </div>`;
        }
        return `<div class="wdbp-parent">
          <div><b>${escHtml(publicSpeciesName(m.species))} ${sex(m)}</b> <span class="wdbp-id">#${Number(m.id)}</span></div>
          <div class="wdbp-ivline"><b>${escHtml(ivString(m))}</b> <span>${escHtml(ivPctLabel(m))} IV</span></div>
          <small>${escHtml(m.nature || '—')} · ${escHtml(m.ability || '—')} · ${escHtml(ownedLocation(m))}</small>
          <div class="wdbp-item">Use: ${escHtml(BREED_ITEM_LABELS[item] || item || 'No item')}</div>
        </div>`;
      }

      function breedPlannerExplanationHtml(r, desired) {
        const coverage = `${r.union.length}/${desired.requiredStats.length}`;
        const missing = r.missing.length ? `Missing 31 sources: ${r.missing.map(s=>BREED_STAT_LABELS[s]).join(', ')}` : 'All requested 31s are represented by the pair';
        const compat = r.sameSpecies ? 'FAST preference · same species' : 'SLOW warning · different species';
        const firstStep=r.path?.steps?.[0] || {a:r.a,b:r.b,setup:r.setup,outputStats:r.union,natureReady:breedPlannerNatureLocked(r.a,r.b,r.setup,desired.nature)};
        const odds=breedPlannerEstimatedRoll(firstStep.a,firstStep.b,firstStep.setup,firstStep.outputStats,desired,desired.nature !== 'Any' && !!firstStep.natureReady);
        return `<div class="wdbp-explain">
          <span><b>Egg:</b> ${escHtml(publicSpeciesName(r.target.eggName))}</span>
          <span><b>Target IV coverage:</b> ${coverage}</span>
          <span><b>Compatibility:</b> ${compat}</span>
          <span><b>Nature:</b> ${escHtml(r.natureText)}</span>
          <span><b>Ability:</b> ${escHtml(r.abilityText)}</span>
          <span><b>Estimated current roll:</b> ${escHtml(breedPlannerOddsLabel(odds))}</span>
          <span class="${r.missing.length?'warn':'ok'}"><b>${escHtml(missing)}</b></span>
        </div>`;
      }

      function breedPlannerResultHtml(r, idx, desired) {
        const coverage = `${r.union.length}/${desired.requiredStats.length}`;
        const compatShort = r.sameSpecies ? 'FAST' : 'SLOW';
        const nursery = r.currentNurseryPair ? '<span class="wdbp-live">CURRENTLY IN NURSERY</span>' : '';
        const firstStep = r.path?.steps?.[0] || { outputStats:r.union, natureReady:breedPlannerNatureLocked(r.a,r.b,r.setup,desired.nature), final:false, sexHint:'Any sex' };

        if (idx > 0) {
          return `<details class="wdbp-result wdbp-alt">
            <summary><span><b>OPTION ${idx+1}</b> · ${escHtml(publicSpeciesName(r.a.species))} ${sex(r.a)} #${Number(r.a.id)} × ${escHtml(publicSpeciesName(r.b.species))} ${sex(r.b)} #${Number(r.b.id)}</span><span>${coverage} · ${compatShort} · ${escHtml(ivPctLabel(r.a))}/${escHtml(ivPctLabel(r.b))}</span></summary>
            <div class="wdbp-result-tools"><button data-save-breed-result="${idx}">Save as project</button></div>
            <div class="wdbp-pair">${breedPlannerMonCard(r.a,r.setup.a)}<div class="wdbp-x">×</div>${breedPlannerMonCard(r.b,r.setup.b)}</div>
            ${breedPlannerDesiredOutputHtml(firstStep,desired,r.target)}
            <details class="wdbp-why"><summary>Why this pairing?</summary>${breedPlannerExplanationHtml(r,desired)}</details>
          </details>`;
        }

        return `<div class="wdbp-result best">
          <div class="wdbp-result-head"><div><b>BEST MATCH</b> ${nursery}</div><button data-save-breed-result="${idx}">Save as project</button></div>
          <div class="wdbp-pair">${breedPlannerMonCard(r.a,r.setup.a)}<div class="wdbp-x">×</div>${breedPlannerMonCard(r.b,r.setup.b)}</div>
          ${breedPlannerDesiredOutputHtml(firstStep,desired,r.target)}
          <details class="wdbp-why"><summary>Why this pairing?</summary>${breedPlannerExplanationHtml(r,desired)}</details>
        </div>`;
      }

      function breedPlannerPathHtml(path, desired, target) {
        if (!path?.steps?.length) return '';
        const status = path.complete
          ? `<span class="wdbp-path-ok">PATH REACHES TARGET</span>`
          : `<span class="wdbp-path-warn">PATH NEEDS ANOTHER BREEDER</span>`;
        const steps = path.steps.map((step,i) => {
          const label = step.currentNurseryPair ? 'CURRENTLY IN NURSERY' : (i===0 ? 'START HERE' : 'PLANNED');
          const compat = step.sameSpecies ? 'FAST · same species' : 'SLOW · different species';
          return `<div class="wdbp-step ${step.final?'final':''}">
            <div class="wdbp-step-head"><b>STEP ${step.index}</b><span>${label}</span><small>${compat}</small></div>
            <div class="wdbp-pair compact">${breedPlannerMonCard(step.a,step.setup?.a,true)}<div class="wdbp-x">×</div>${breedPlannerMonCard(step.b,step.setup?.b,true)}</div>
            ${breedPlannerDesiredOutputHtml(step,desired,target)}
          </div>`;
        }).join('');
        const blocker = path.blocker ? `<div class="wdbp-path-blocker"><b>Planner note:</b> ${escHtml(path.blocker)}.</div>` : '';
        return `<section class="wdbp-path">
          <div class="wdbp-path-head"><div><b>FULL BREEDING PATH</b><small>Each step tells you which offspring profile to keep. Reload after hatching and the planner will recalculate from your new owned Pokémon.</small></div>${status}</div>
          ${steps}${blocker}
        </section>`;
      }

      let breedPlannerLastResults = [];
      let breedPlannerLastDesired = null;
      let breedPlannerLastTarget = null;

      function breedPlannerReadForm() {
        const target = breedPlannerResolveTarget(document.getElementById('wd-breed-target')?.value);
        if (!target || target.error) return { error:target?.error || 'Choose a valid Pokémon first.' };
        const requiredStats = STATS.filter(stat => document.querySelector(`[data-breed-iv="${stat}"]`)?.checked);
        if (!requiredStats.length) return { error:'Select at least one target IV.' };
        const nature = String(document.getElementById('wd-breed-nature')?.value || 'Any');
        const ability = String(document.getElementById('wd-breed-ability')?.value || 'Any').trim() || 'Any';
        const sameSpeciesOnly = !!document.getElementById('wd-breed-same-only')?.checked;
        return { target, desired:{ nature, ability, requiredStats, sameSpeciesOnly } };
      }

      function renderBreedPlannerResults() {
        const out = document.getElementById('wd-breed-results');
        const status = document.getElementById('wd-breed-status');
        if (!out) return;
        const form = breedPlannerReadForm();
        if (form.error) {
          breedPlannerLastResults=[]; breedPlannerLastDesired=null; breedPlannerLastTarget=null;
          out.innerHTML=`<div class="wdbp-empty">${escHtml(form.error)}</div>`;
          if(status) status.textContent='';
          return;
        }
        const {target,desired}=form;
        breedPlannerLastTarget=target; breedPlannerLastDesired=desired;

        const enriched = breedPlannerRank(target,desired).slice(0,30).map(r => ({ ...r, path:breedPlannerBuildPath(r,desired) }));
        enriched.sort((a,b) =>
          Number(b.path?.complete)-Number(a.path?.complete) ||
          (a.path?.missingStats?.length||0)-(b.path?.missingStats?.length||0) ||
          (a.path?.steps?.length||99)-(b.path?.steps?.length||99) ||
          b.score-a.score
        );
        breedPlannerLastResults=enriched.slice(0,3);
        if (!breedPlannerLastResults.length) {
          out.innerHTML=`<div class="wdbp-empty">No legal ${desired.sameSpeciesOnly?'same-species ':''}pair was found in Box + Team + Nursery for ${escHtml(publicSpeciesName(target.name))}.${desired.sameSpeciesOnly?' Disable “Only same species” to allow compatible Egg Group crosses.':''}</div>`;
          if(status) status.textContent=`Egg species: ${publicSpeciesName(target.eggName)}`;
          return;
        }
        if(status) status.textContent=`Final target: ${publicSpeciesName(target.name)} · Egg species: ${publicSpeciesName(target.eggName)} · ${breedPlannerIvLabel(desired.requiredStats)}${desired.sameSpeciesOnly?' · SAME-SPECIES ONLY':''}`;
        const [best,...alts]=breedPlannerLastResults;
        out.innerHTML=breedPlannerResultHtml(best,0,desired) + breedPlannerPathHtml(best.path,desired,target) + alts.map((r,i)=>breedPlannerResultHtml(r,i+1,desired)).join('');
        out.querySelectorAll('[data-save-breed-result]').forEach(btn => btn.addEventListener('click',()=>saveBreedPlannerResult(Number(btn.dataset.saveBreedResult))));
      }

      function saveBreedPlannerResult(index) {
        const r=breedPlannerLastResults[index];
        const desired=breedPlannerLastDesired;
        if(!r || !desired) return;
        const key=r.target.familyKey;
        const current=familyDecision(key);
        const previousPlan=breedPlans.get(key);
        const pathSteps=(r.path?.steps || []).map(step => ({
          index:Number(step.index),
          parentAId:Number.isFinite(Number(step.a?.id)) ? Number(step.a.id) : null,
          parentBId:Number.isFinite(Number(step.b?.id)) ? Number(step.b.id) : null,
          donorId:Number.isFinite(Number(step.donorId)) ? Number(step.donorId) : null,
          outputStats:[...(step.outputStats || [])],
          itemA:step.setup?.a || '',
          itemB:step.setup?.b || '',
          final:!!step.final
        }));
        const protectedIds=[...new Set(pathSteps.flatMap(step => [step.parentAId,step.parentBId,step.donorId]).filter(Number.isFinite))];
        const plan={
          familyKey:key,
          targetDex:r.target.dex,
          targetName:publicSpeciesName(r.target.name),
          eggDex:r.target.eggDex,
          eggName:publicSpeciesName(r.target.eggName),
          nature:desired.nature,
          ability:desired.ability,
          requiredStats:[...desired.requiredStats],
          ivLabel:breedPlannerIvLabel(desired.requiredStats),
          parentAId:Number(r.a.id), parentBId:Number(r.b.id),
          parentASpecies:publicSpeciesName(r.a.species), parentBSpecies:publicSpeciesName(r.b.species),
          itemA:r.setup.a, itemB:r.setup.b,
          sameSpecies:r.sameSpecies,
          sameSpeciesOnly:!!desired.sameSpeciesOnly,
          pathSteps,
          protectedIds,
          autoManagedMode:true,
          previousFamilyMode:previousPlan?.previousFamilyMode || (previousPlan ? FAMILY_MODE.AUTO : current.mode),
          savedAt:new Date().toISOString()
        };
        breedPlans.set(key,plan); saveBreedPlans();
        const mode=breedPlanSuggestedMode(plan);
        plan.lastAutoMode=mode; breedPlans.set(key,plan); saveBreedPlans();
        familyDecisions.set(key,{...current,mode});
        saveFamilyDecisions();
        rebuildAnalysis(true); organizerPlan=null;
        renderCandidateRows?.(); renderFamilyDecisionRows?.(); updatePanelCounts?.(); managerUpdateNav?.();
        const msg=document.getElementById('wd-breed-save-msg');
        if(msg) msg.innerHTML=`Saved <b>${escHtml(plan.targetName)}</b> as <b>${mode===FAMILY_MODE.BREED?'BREED NOW':'TO-BE'}</b> in Breeding Projects.`;
      }

      function breedPlannerApplyPreset(name) {
        const sets={
          physical:['hp','atk','def','spd','spe'],
          special:['hp','def','spa','spd','spe'],
          six:[...STATS]
        };
        const wanted=sets[name];
        if(!wanted) return;
        for(const stat of STATS){
          const el=document.querySelector(`[data-breed-iv="${stat}"]`);
          if(el) el.checked=wanted.includes(stat);
        }
        renderBreedPlannerResults();
      }

      function breedPlannerPrefillFromPlan(plan) {
        if(!plan) return;
        const target=document.getElementById('wd-breed-target');
        const nature=document.getElementById('wd-breed-nature');
        const ability=document.getElementById('wd-breed-ability');
        if(target) target.value=plan.targetName || '';
        if(nature) nature.value=plan.nature || 'Any';
        if(ability) ability.value=plan.ability || 'Any';
        const sameOnly=document.getElementById('wd-breed-same-only');
        if(sameOnly) sameOnly.checked=!!plan.sameSpeciesOnly;
        const req=new Set(plan.requiredStats || []);
        for(const stat of STATS){
          const el=document.querySelector(`[data-breed-iv="${stat}"]`);
          if(el) el.checked=req.has(stat);
        }
      }

      function mountBreedPlannerPanel(familyKeyToOpen=null) {
        managerPrepareView('planner');
        document.getElementById('wd-breed-planner-v116')?.remove();
        document.getElementById('wd-breed-planner-v116-style')?.remove();

        const style=document.createElement('style');
        style.id='wd-breed-planner-v116-style';
        style.textContent=`
          #wd-breed-planner-v116{height:100%;display:flex;flex-direction:column;background:#11151d;color:#e8edf5;font:13px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;min-width:0}
          #wd-breed-planner-v116 *{box-sizing:border-box} #wd-breed-planner-v116 button,#wd-breed-planner-v116 input,#wd-breed-planner-v116 select{font:inherit}
          #wd-breed-planner-v116 .wdbp-head{display:none}
          #wd-breed-planner-v116 .wdbp-form{padding:10px 12px;border-bottom:1px solid #2d3849;background:#121822;display:grid;grid-template-columns:minmax(190px,1.3fr) minmax(150px,.8fr) minmax(170px,1fr);gap:8px;align-items:end}
          #wd-breed-planner-v116 label{display:flex;flex-direction:column;gap:4px;color:#9eacbf} #wd-breed-planner-v116 input,#wd-breed-planner-v116 select{background:#0b1017;border:1px solid #344154;color:#fff;border-radius:7px;padding:7px 9px;min-width:0}
          #wd-breed-planner-v116 .wdbp-ivs{grid-column:1/-1;display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding-top:2px}
          #wd-breed-planner-v116 .wdbp-ivs label{display:flex;flex-direction:row;align-items:center;gap:4px;background:#171f2b;border:1px solid #334156;border-radius:7px;padding:5px 7px;color:#dce5f0}
          #wd-breed-planner-v116 .wdbp-ivs input{width:auto;margin:0;padding:0}
          #wd-breed-planner-v116 button{border:1px solid #3b485d;background:#202938;color:#e8edf5;border-radius:7px;padding:6px 9px;cursor:pointer} #wd-breed-planner-v116 button:hover{background:#2a3648}
          #wd-breed-planner-v116 .wdbp-presets{display:flex;gap:5px;margin-left:4px;flex-wrap:wrap}
          #wd-breed-planner-v116 .wdbp-fast-only{display:flex;flex-direction:row;align-items:center;gap:6px;margin-left:5px;background:#172417;border:1px solid #365f3c;border-radius:7px;padding:5px 8px;color:#bfe5c4;white-space:nowrap}#wd-breed-planner-v116 .wdbp-fast-only input{width:auto;margin:0;padding:0}
          #wd-breed-planner-v116 .wdbp-meta{padding:7px 12px;border-bottom:1px solid #2d3849;color:#9eacbf;display:flex;gap:12px;align-items:center;flex-wrap:wrap}.wdbp-meta .msg{color:#9fd6b9}
          #wd-breed-planner-v116 .wdbp-results{flex:1;min-height:0;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:10px;scrollbar-gutter:stable}
          #wd-breed-planner-v116 .wdbp-result{border:1px solid #303d50;background:#151c27;border-radius:10px;overflow:hidden;flex:0 0 auto} #wd-breed-planner-v116 .wdbp-result.best{border-color:#4d7897}
          #wd-breed-planner-v116 .wdbp-result-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;background:#1a2431;border-bottom:1px solid #303d50}
          #wd-breed-planner-v116 .wdbp-result-tools{display:flex;justify-content:flex-end;padding:7px 9px 0}
          #wd-breed-planner-v116 .wdbp-pair{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:9px;align-items:stretch;padding:9px}
          #wd-breed-planner-v116 .wdbp-pair.compact{padding:8px}.wdbp-pair.compact .wdbp-parent{padding:8px}
          #wd-breed-planner-v116 .wdbp-x{display:flex;align-items:center;justify-content:center;font-size:18px;color:#8292a7}
          #wd-breed-planner-v116 .wdbp-parent{min-width:0;background:#0f151e;border:1px solid #283548;border-radius:8px;padding:9px}
          #wd-breed-planner-v116 .wdbp-parent.virtual{border-style:dashed;background:#111925}
          #wd-breed-planner-v116 .wdbp-parent small{display:block;color:#8fa0b5;margin-top:3px;white-space:normal}.wdbp-id{color:#7f91a8}.wdbp-item{margin-top:6px;color:#b9dcff;font-weight:700}
          #wd-breed-planner-v116 .wdbp-ivline{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;margin-top:2px}.wdbp-ivline span{color:#9fd6b9;font-weight:700}
          #wd-breed-planner-v116 .wdbp-live{font-size:11px;color:#8ee6ad;border:1px solid #39704b;border-radius:999px;padding:2px 6px;margin-left:6px}
          #wd-breed-planner-v116 .wdbp-output{margin:0 9px 9px;padding:9px 10px;border:1px solid #34475e;border-radius:8px;background:#111a25}
          #wd-breed-planner-v116 .wdbp-output.final{border-color:#46745a;background:#102019}
          #wd-breed-planner-v116 .wdbp-output-title{display:flex;justify-content:space-between;gap:8px;align-items:center;color:#9eb2c9}.wdbp-output-title b{color:#dceaff}.wdbp-output-title span{color:#fff}
          #wd-breed-planner-v116 .wdbp-output-iv{display:flex;align-items:baseline;gap:9px;margin:5px 0}.wdbp-output-iv b{font:700 15px ui-monospace,SFMono-Regular,Consolas,monospace;color:#fff}.wdbp-output-iv small{color:#8fa0b5}
          #wd-breed-planner-v116 .wdbp-output-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px 12px;color:#aeb9c8}.wdbp-output-meta b{color:#e8edf5}.wdbp-output-meta .wdbp-odds{color:#9fd6b9}.wdbp-output>small{display:block;color:#8fa0b5;margin-top:5px}
          #wd-breed-planner-v116 .wdbp-why{margin:0 9px 9px;border-top:1px solid #293547;padding-top:6px;color:#aeb9c8}.wdbp-why>summary{cursor:pointer;color:#b9dcff;font-weight:650;user-select:none}
          #wd-breed-planner-v116 .wdbp-explain{padding:8px 0 2px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 12px;color:#aeb9c8}.wdbp-explain b{color:#e8edf5}.wdbp-explain .ok{color:#9fd6b9}.wdbp-explain .warn{color:#e9bd7a}
          #wd-breed-planner-v116 details.wdbp-alt>summary{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:9px 11px;background:#18212d;cursor:pointer;list-style:none;color:#b8c5d6;min-width:0}
          #wd-breed-planner-v116 details.wdbp-alt>summary::-webkit-details-marker{display:none} #wd-breed-planner-v116 details.wdbp-alt>summary span{min-width:0;white-space:normal}.wdbp-alt[open]>summary{border-bottom:1px solid #303d50}
          #wd-breed-planner-v116 .wdbp-path{border:1px solid #3a4b61;background:#121923;border-radius:10px;overflow:hidden;flex:0 0 auto}
          #wd-breed-planner-v116 .wdbp-path-head{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:9px 11px;background:#192332;border-bottom:1px solid #34445a}.wdbp-path-head>div{min-width:0}.wdbp-path-head b{display:block}.wdbp-path-head small{display:block;color:#92a1b5;margin-top:2px}
          #wd-breed-planner-v116 .wdbp-path-ok,#wd-breed-planner-v116 .wdbp-path-warn{font-size:11px;border-radius:999px;padding:3px 7px;white-space:nowrap}.wdbp-path-ok{color:#99e7b2;border:1px solid #3b7550}.wdbp-path-warn{color:#efc98f;border:1px solid #806337}
          #wd-breed-planner-v116 .wdbp-step{padding:9px 0 0;border-bottom:1px solid #2b3748}.wdbp-step:last-of-type{border-bottom:0}.wdbp-step.final{background:rgba(63,112,78,.08)}
          #wd-breed-planner-v116 .wdbp-step-head{display:flex;gap:8px;align-items:center;padding:0 10px;color:#9eb0c5}.wdbp-step-head b{color:#fff}.wdbp-step-head span{font-size:11px;border:1px solid #41526a;border-radius:999px;padding:2px 6px}.wdbp-step-head small{margin-left:auto;color:#8999ad}
          #wd-breed-planner-v116 .wdbp-path-blocker{padding:9px 11px;color:#e4bd80;background:#211b13;border-top:1px solid #59472f}
          #wd-breed-planner-v116 .wdbp-empty{padding:28px;text-align:center;color:#8e9caf;border:1px dashed #334156;border-radius:9px}
          #wd-breed-planner-v116 .wdbp-foot{padding:7px 12px;border-top:1px solid #2d3849;color:#8392a5;background:#101620;flex:0 0 auto}
          @media(max-width:900px){
            #wd-breed-planner-v116 .wdbp-form{grid-template-columns:1fr}#wd-breed-planner-v116 .wdbp-ivs{grid-column:1}
            #wd-breed-planner-v116 .wdbp-pair{grid-template-columns:1fr}.wdbp-x{justify-content:center}
            #wd-breed-planner-v116 .wdbp-explain,#wd-breed-planner-v116 .wdbp-output-meta{grid-template-columns:1fr}
            #wd-breed-planner-v116 details.wdbp-alt>summary{align-items:flex-start;flex-direction:column;gap:3px}
            #wd-breed-planner-v116 .wdbp-path-head{align-items:flex-start;flex-direction:column}
          }
        `;
        document.head.appendChild(style);

        const species=breedPlannerSpeciesOptions();
        const natureOpts=['Any',...BREED_NATURES].map(n=>`<option value="${escAttr(n)}">${escHtml(n)}</option>`).join('');
        const panel=document.createElement('div'); panel.id='wd-breed-planner-v116';
        panel.innerHTML=`<div class="wdbp-head"></div>
          <div class="wdbp-form">
            <label>Desired Pokémon<input id="wd-breed-target" list="wd-breed-species-list" placeholder="e.g. Charizard"><datalist id="wd-breed-species-list">${species.map(x=>`<option value="${escAttr(x.name)}"></option>`).join('')}</datalist></label>
            <label>Desired nature<select id="wd-breed-nature">${natureOpts}</select></label>
            <label>Desired ability<input id="wd-breed-ability" list="wd-breed-ability-list" value="Any" placeholder="Any"><datalist id="wd-breed-ability-list"></datalist></label>
            <div class="wdbp-ivs"><b style="color:#e8edf5">Desired 31s:</b>${STATS.map(stat=>`<label><input type="checkbox" data-breed-iv="${stat}" checked>${stat.toUpperCase()}</label>`).join('')}<label class="wdbp-fast-only" title="Restrict the entire planned path to same-species pairings for faster Egg production. The planner may tell you to evolve an offspring before the next cross."><input type="checkbox" id="wd-breed-same-only">Only same species</label><div class="wdbp-presets"><button data-breed-preset="physical">Physical 5×31</button><button data-breed-preset="special">Special 5×31</button><button data-breed-preset="six">6×31</button></div><button id="wd-breed-calculate" style="margin-left:auto;background:#315878;border-color:#4c7ca3"><b>Find best pair</b></button></div>
          </div>
          <div class="wdbp-meta"><span id="wd-breed-status"></span><span id="wd-breed-save-msg" class="msg"></span></div>
          <div id="wd-breed-results" class="wdbp-results"><div class="wdbp-empty">Choose a target Pokémon to rank your best owned breeding pairs.</div></div>
          <div class="wdbp-foot">“Only same species” restricts the full path to fast same-species pairings. Per-Egg odds are estimates from the standard Destiny Knot / Power Item IV inheritance model; ability inheritance and Worlddex Egg-generation timing are not included until their exact server rules are confirmed.</div>`;
        managerAttachView(panel,'.wdbp-head');

        const updateAbilities=()=>{
          const target=breedPlannerResolveTarget(document.getElementById('wd-breed-target')?.value);
          const dl=document.getElementById('wd-breed-ability-list');
          if(!dl || !target || target.error){ if(dl) dl.innerHTML=''; return; }
          const vals=[...new Set(breedPlannerTargetFamilyOwned(target).map(m=>String(m.ability||'')).filter(Boolean))].sort();
          dl.innerHTML=vals.map(v=>`<option value="${escAttr(v)}"></option>`).join('');
        };
        document.getElementById('wd-breed-target').addEventListener('change',()=>{updateAbilities();renderBreedPlannerResults();});
        document.getElementById('wd-breed-nature').addEventListener('change',renderBreedPlannerResults);
        document.getElementById('wd-breed-ability').addEventListener('change',renderBreedPlannerResults);
        document.getElementById('wd-breed-same-only').addEventListener('change',renderBreedPlannerResults);
        document.getElementById('wd-breed-calculate').addEventListener('click',()=>{updateAbilities();renderBreedPlannerResults();});
        document.querySelectorAll('[data-breed-iv]').forEach(el=>el.addEventListener('change',renderBreedPlannerResults));
        document.querySelectorAll('[data-breed-preset]').forEach(el=>el.addEventListener('click',()=>breedPlannerApplyPreset(el.dataset.breedPreset)));

        // Better default than 6×31 for most physical attackers.
        breedPlannerApplyPreset('physical');
        if(familyKeyToOpen && breedPlans.has(familyKeyToOpen)){
          breedPlannerPrefillFromPlan(breedPlans.get(familyKeyToOpen)); updateAbilities(); renderBreedPlannerResults();
        }
      }


      // ─────────────────────────────────────────────────────────────
      // UNIFIED FLOATING MANAGER SHELL
      // Cleaner / Specials / Dex Tasks / Breeding / Organizer are views
      // inside ONE draggable panel. The navigation bar never changes.
      // ─────────────────────────────────────────────────────────────

      const MANAGER_VIEW_STORAGE_KEY = 'worlddex.boxManager.v1.10.activeView';
      const MANAGER_SHELL_POSITION_KEY = 'worlddex.boxManager.v1.10.shellPosition';

      const MANAGER_VIEW_META = {
        cleaner:   { label:'Clean Up', mount:() => mountReviewPanel() },
        planner:   { label:'Breed Planner', mount:() => mountBreedPlannerPanel() },
        specials:  { label:'Special Pokémon', mount:() => mountSpecialPanel() },
        dex:       { label:'Pokédex Tasks', mount:() => mountDexTaskPanel() },
        breeding:  { label:'Breeding Projects', mount:() => mountFamilyDecisionPanel() },
        organizer: { label:'Organize Boxes', mount:() => mountOrganizerPanel() }
      };

      const MANAGER_VIEW_PANEL_IDS = [
        'wd-box-cleaner-v13',
        'wd-box-organizer-v14',
        'wd-family-decisions-v15',
        'wd-breed-planner-v116',
        'wd-special-manager-v18',
        'wd-dex-tasks-v16'
      ];

      const MANAGER_VIEW_STYLE_IDS = [
        'wd-box-cleaner-v13-style',
        'wd-box-organizer-v14-style',
        'wd-family-decisions-v15-style',
        'wd-breed-planner-v116-style',
        'wd-special-manager-v18-style',
        'wd-dex-tasks-v16-style'
      ];

      function managerActiveView() {
        const raw = String(localStorage.getItem(MANAGER_VIEW_STORAGE_KEY) || 'cleaner');
        return MANAGER_VIEW_META[raw] ? raw : 'cleaner';
      }

      function managerUpdateNav() {
        const shell = document.getElementById('wd-manager-shell-v110');
        if (!shell) return;

        const dexN = dexTaskCore?.tasks?.length || 0;
        let specialN = 0;
        try { specialN = specialEntryRows().filter(r => r.count > 1).length; } catch {}

        const candidateN = candidates?.length || 0;

        const cleanerBtn = shell.querySelector('[data-manager-view="cleaner"]');
        const specialsBtn = shell.querySelector('[data-manager-view="specials"]');
        const dexBtn = shell.querySelector('[data-manager-view="dex"]');

        if (cleanerBtn) cleanerBtn.textContent = `Clean Up (${candidateN})`;
        if (specialsBtn) specialsBtn.textContent = `Special Pokémon (${specialN})`;
        if (dexBtn) dexBtn.textContent = `Pokédex Tasks (${dexN})`;
      }

      function managerSetActiveView(view) {
        const shell = document.getElementById('wd-manager-shell-v110');
        if (!shell) return;

        const meta = MANAGER_VIEW_META[view] || MANAGER_VIEW_META.cleaner;
        shell.dataset.view = view;

        const label = shell.querySelector('#wd-manager-current-view');
        if (label) label.textContent = meta.label;

        shell.querySelectorAll('[data-manager-view]').forEach(btn => {
          const active = btn.dataset.managerView === view;
          btn.classList.toggle('wdm-active', active);
          btn.setAttribute('aria-current', active ? 'page' : 'false');
        });

        try { localStorage.setItem(MANAGER_VIEW_STORAGE_KEY, view); } catch {}
        managerUpdateNav();
      }

      function managerClearViewPanels() {
        MANAGER_VIEW_PANEL_IDS.forEach(id => document.getElementById(id)?.remove());
        MANAGER_VIEW_STYLE_IDS.forEach(id => document.getElementById(id)?.remove());
        const slot = document.getElementById('wd-manager-view-slot');
        if (slot) slot.replaceChildren();
      }

      function managerDestroyShell() {
        managerClearViewPanels();
        document.getElementById('wd-manager-shell-v110')?.remove();
        document.getElementById('wd-manager-shell-v110-style')?.remove();
      }

      function ensureManagerShell() {
        let shell = document.getElementById('wd-manager-shell-v110');
        if (shell) return shell;

        document.getElementById('wd-manager-shell-v110-style')?.remove();

        const style = document.createElement('style');
        style.id = 'wd-manager-shell-v110-style';
        style.textContent = `
          #wd-manager-shell-v110 {
            position:fixed;
            z-index:2147483647;
            right:16px;
            bottom:16px;
            width:min(1260px, calc(100vw - 32px));
            height:min(82vh, 860px);

            /* Start exactly as before, but allow the manager to grow.
               The normal starting size is also the minimum desktop size. */
            min-width:min(1260px, calc(100vw - 32px));
            min-height:min(82vh, 860px);
            max-width:calc(100vw - 12px);
            max-height:calc(100vh - 12px);
            resize:both;

            display:flex;
            flex-direction:column;
            overflow:hidden;
            background:#11151d;
            color:#e8edf5;
            border:1px solid #344154;
            border-radius:12px;
            box-shadow:0 18px 60px rgba(0,0,0,.55);
            font:13px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;
          }
          #wd-manager-shell-v110 * { box-sizing:border-box; }
          #wd-manager-shell-v110::after {
            content:'↘';
            position:absolute;
            right:4px;
            bottom:1px;
            z-index:20;
            color:#64758b;
            font-size:12px;
            line-height:1;
            pointer-events:none;
            opacity:.8;
          }
          #wd-manager-shell-v110.wdm-minimized::after { display:none; }
          #wd-manager-shell-v110.wdm-minimized {
            height:auto !important;
            max-height:none !important;
            min-height:0 !important;
            resize:none !important;
          }
          #wd-manager-shell-v110.wdm-minimized #wd-manager-view-slot {
            display:none !important;
          }
          #wd-manager-shell-v110 .wdm-head {
            flex:0 0 auto;
            display:flex;
            gap:7px;
            align-items:center;
            flex-wrap:nowrap;
            padding:8px 10px;
            background:#171d27;
            border-bottom:1px solid #2d3849;
            cursor:grab;
            user-select:none;
          }
          #wd-manager-shell-v110 .wdm-brand {
            flex:0 0 205px;
            min-width:205px;
            margin-right:1px;
          }
          #wd-manager-shell-v110 .wdm-brand b {
            display:block;
            font-size:14px;
          }
          #wd-manager-shell-v110 .wdm-brand small {
            display:block;
            color:#92a1b5;
          }
          #wd-manager-shell-v110 .wdm-nav {
            display:flex;
            gap:4px;
            align-items:center;
            flex:1 1 auto;
            min-width:0;
            flex-wrap:nowrap;
            overflow-x:auto;
            scrollbar-width:none;
          }
          #wd-manager-shell-v110 .wdm-nav::-webkit-scrollbar { display:none; }
          #wd-manager-shell-v110 .wdm-nav-group {
            display:flex;
            gap:4px;
            align-items:center;
            flex-wrap:nowrap;
            flex:0 0 auto;
          }
          #wd-manager-shell-v110 .wdm-nav-divider {
            width:1px;
            height:26px;
            background:#39475b;
            margin:0 3px;
            flex:0 0 auto;
          }
          #wd-manager-shell-v110 .wdm-primary-action {
            border-color:#53677f;
            background:#243143;
            font-weight:650;
          }
          #wd-manager-shell-v110 .wdm-primary-action:hover {
            background:#2d3b50;
          }
          #wd-manager-shell-v110 .wdm-spacer { display:none; }
          #wd-manager-shell-v110 button {
            font:inherit;
            border:1px solid #3b485d;
            background:#202938;
            color:#e8edf5;
            border-radius:7px;
            padding:6px 8px;
            cursor:pointer;
            white-space:nowrap;
          }
          #wd-manager-shell-v110 button:hover { background:#2a3648; }
          #wd-manager-shell-v110 button.wdm-active {
            background:#315878;
            border-color:#4c7ca3;
            color:#fff;
            font-weight:700;
          }
          #wd-manager-shell-v110 #wd-manager-refresh {
            background:#26354b;
          }
          #wd-manager-shell-v110 #wd-manager-close {
            min-width:34px;
            font-weight:700;
          }
          #wd-manager-view-slot {
            flex:1 1 auto;
            min-height:0;
            overflow:hidden;
            position:relative;
            background:#11151d;
          }

          /* Every old panel is now only an embedded VIEW. */
          #wd-manager-view-slot > .wd-manager-embedded-view {
            position:relative !important;
            z-index:auto !important;
            left:auto !important;
            right:auto !important;
            top:auto !important;
            bottom:auto !important;
            width:100% !important;
            height:100% !important;
            max-width:none !important;
            max-height:none !important;
            min-width:0 !important;
            min-height:0 !important;
            margin:0 !important;
            border:0 !important;
            border-radius:0 !important;
            box-shadow:none !important;
          }

          @media(max-width:900px) {
            #wd-manager-shell-v110 {
              right:6px;
              bottom:6px;
              width:calc(100vw - 12px);
              height:90vh;
              min-width:calc(100vw - 12px);
              min-height:90vh;
              max-width:calc(100vw - 12px);
              max-height:90vh;
              resize:none;
            }
            #wd-manager-shell-v110 .wdm-head {
              flex-wrap:wrap;
            }
            #wd-manager-shell-v110 .wdm-brand {
              flex:1 1 160px;
              min-width:150px;
            }
            #wd-manager-shell-v110 .wdm-nav {
              order:3;
              flex:1 0 100%;
              width:100%;
              padding-top:2px;
            }
            #wd-manager-shell-v110 .wdm-nav-divider {
              display:none;
            }
          }
        `;
        document.head.appendChild(style);

        shell = document.createElement('div');
        shell.id = 'wd-manager-shell-v110';
        shell.title = 'Drag the top bar to move · drag the bottom-right corner to resize';
        shell.innerHTML = `
          <div class="wdm-head">
            <div class="wdm-brand">
              <b>Worlddex Box Manager v1.17.1</b>
              <small id="wd-manager-current-view">Clean Up</small>
            </div>
            <div class="wdm-nav">
              <div class="wdm-nav-group" aria-label="Actions">
                <button class="wdm-primary-action" data-manager-view="organizer">Organize Boxes</button>
                <button class="wdm-primary-action" data-manager-view="cleaner">Clean Up</button>
                <button class="wdm-primary-action" data-manager-view="planner">Breed Planner</button>
              </div>
              <span class="wdm-nav-divider" aria-hidden="true"></span>
              <div class="wdm-nav-group" aria-label="Setup and review">
                <button data-manager-view="breeding">Breeding Projects</button>
                <button data-manager-view="dex">Pokédex Tasks</button>
                <button data-manager-view="specials">Special Pokémon</button>
              </div>
            </div>
            <div class="wdm-spacer"></div>
            <button id="wd-manager-refresh" title="Check your current PC again and refresh this section">Reload</button>
            <button id="wd-manager-minimize">Minimize</button>
            <button id="wd-manager-close">×</button>
          </div>
          <div id="wd-manager-view-slot"></div>
        `;
        document.body.appendChild(shell);

        // Migrate one of the old floating positions the first time the unified
        // shell is used, so the panel does not unexpectedly jump away.
        try {
          if (!localStorage.getItem(MANAGER_SHELL_POSITION_KEY)) {
            const oldPos =
              localStorage.getItem('worlddex.boxManager.v1.8.cleanerPosition') ||
              localStorage.getItem('worlddex.boxManager.v1.8.organizerPosition');
            if (oldPos) localStorage.setItem(MANAGER_SHELL_POSITION_KEY, oldPos);
          }
        } catch {}

        makeFloatingDraggable(
          shell,
          shell.querySelector('.wdm-head'),
          MANAGER_SHELL_POSITION_KEY
        );

        shell.querySelectorAll('[data-manager-view]').forEach(btn => {
          btn.addEventListener('click', () => {
            const view = btn.dataset.managerView;
            if (!MANAGER_VIEW_META[view]) return;

            // Clicking the current tab only refreshes its visible counters.
            if (shell.dataset.view === view &&
                document.getElementById('wd-manager-view-slot')?.children.length) {
              managerUpdateNav();
              return;
            }

            MANAGER_VIEW_META[view].mount();
          });
        });

        shell.querySelector('#wd-manager-refresh').addEventListener('click', () => {
          window.__WORLDDEX_BOX_MANAGER_REFRESH?.();
        });

        shell.querySelector('#wd-manager-minimize').addEventListener('click', e => {
          const minimized = shell.classList.toggle('wdm-minimized');
          e.currentTarget.textContent = minimized ? 'Restore' : 'Minimize';
          e.currentTarget.setAttribute('aria-expanded', String(!minimized));
        });

        shell.querySelector('#wd-manager-close').addEventListener('click', managerDestroyShell);

        managerUpdateNav();
        return shell;
      }

      function managerPrepareView(view) {
        const shell = ensureManagerShell();

        // Switching a top-level tab should restore the content if the panel was
        // minimized. The shell itself and its position never change.
        if (shell.classList.contains('wdm-minimized')) {
          shell.classList.remove('wdm-minimized');
          const min = shell.querySelector('#wd-manager-minimize');
          if (min) min.textContent = 'Minimize';
        }

        managerClearViewPanels();
        managerSetActiveView(view);
        return shell.querySelector('#wd-manager-view-slot');
      }

      function managerAttachView(panel, legacyHeaderSelector) {
        const slot = document.getElementById('wd-manager-view-slot') ||
          ensureManagerShell().querySelector('#wd-manager-view-slot');

        panel.classList.add('wd-manager-embedded-view');

        // Inline !important is intentional: older view CSS contains fixed
        // positioning and mobile rules with ID selectors.
        const embeddedStyles = {
          position:'relative',
          zIndex:'auto',
          left:'auto',
          right:'auto',
          top:'auto',
          bottom:'auto',
          width:'100%',
          height:'100%',
          maxWidth:'none',
          maxHeight:'none',
          minWidth:'0',
          minHeight:'0',
          margin:'0',
          border:'0',
          borderRadius:'0',
          boxShadow:'none'
        };
        for (const [prop, value] of Object.entries(embeddedStyles)) {
          const cssProp = prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
          panel.style.setProperty(cssProp, value, 'important');
        }

        const legacyHeader = panel.querySelector(legacyHeaderSelector);
        if (legacyHeader) legacyHeader.style.setProperty('display', 'none', 'important');

        slot.appendChild(panel);
        managerUpdateNav();
        return panel;
      }

      function mountFamilyDecisionPanel() {
        managerPrepareView('breeding');
        document.getElementById('wd-family-decisions-v15')?.remove();
        document.getElementById('wd-family-decisions-v15-style')?.remove();
        const cleaner = document.getElementById('wd-box-cleaner-v13');
        const org = document.getElementById('wd-box-organizer-v14');
        if (cleaner) cleaner.style.display='none';
        if (org) org.style.display='none';

        const style = document.createElement('style');
        style.id='wd-family-decisions-v15-style';
        style.textContent=`
          #wd-family-decisions-v15{position:fixed;z-index:2147483647;right:16px;bottom:16px;width:min(1050px,calc(100vw - 32px));height:min(82vh,850px);display:flex;flex-direction:column;background:#11151d;color:#e8edf5;border:1px solid #344154;border-radius:12px;box-shadow:0 18px 60px rgba(0,0,0,.55);font:13px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;overflow:hidden}
          #wd-family-decisions-v15 *{box-sizing:border-box} #wd-family-decisions-v15 button,#wd-family-decisions-v15 input,#wd-family-decisions-v15 select{font:inherit}
          #wd-family-decisions-v15 .wdf-head{display:flex;gap:10px;align-items:center;padding:12px 14px;background:#171d27;border-bottom:1px solid #2d3849}.wdf-head .sp{flex:1}
          #wd-family-decisions-v15 button{border:1px solid #3b485d;background:#202938;color:#e8edf5;border-radius:7px;padding:7px 10px;cursor:pointer}
          #wd-family-decisions-v15 .wdf-tools{display:flex;gap:8px;align-items:center;padding:9px 12px;border-bottom:1px solid #2d3849;background:#121822;flex-wrap:wrap}
          #wd-family-decisions-v15 .wdf-tools input{min-width:260px;flex:1;background:#0b1017;border:1px solid #344154;color:#fff;border-radius:7px;padding:7px 9px}
          #wd-family-decisions-v15 .wdf-note{padding:9px 12px;color:#aab6c6;border-bottom:1px solid #2d3849}.wdf-note b{color:#fff}
          #wd-family-decisions-v15 .wdf-wrap{flex:1;min-height:0;overflow:auto;scrollbar-gutter:stable}
          #wd-family-decisions-v15 table{width:100%;border-collapse:collapse}#wd-family-decisions-v15 th{position:sticky;top:0;background:#19212d;color:#aeb9c8;text-align:left;padding:8px;border-bottom:1px solid #344154}
          #wd-family-decisions-v15 td{padding:8px;border-bottom:1px solid #252f3e;vertical-align:top}#wd-family-decisions-v15 td small{display:block;color:#8e9caf;margin-top:2px}
          #wd-family-decisions-v15 select{background:#0b1017;border:1px solid #344154;color:#fff;border-radius:6px;padding:5px 7px}
          #wd-family-decisions-v15 .wdf-plan-target{color:#9fd6b9;margin-top:5px;line-height:1.35}.wdf-plan-state{display:inline-block;margin-left:6px;padding:1px 5px;border:1px solid #3f6b50;border-radius:999px;font-size:10px;color:#a8e8bc}
          #wd-family-decisions-v15 .wdf-plan-actions{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px}.wdf-plan-actions button{padding:4px 7px}.wdf-plan-actions .wdf-danger{border-color:#6e4148;color:#f0b3bb;background:#24191c}.wdf-plan-actions .wdf-danger:hover{background:#352126}
        `;
        document.head.appendChild(style);
        const panel=document.createElement('div');panel.id='wd-family-decisions-v15';
        panel.innerHTML=`<div class="wdf-head"><div><b>Breeding Projects</b><small style="display:block;color:#9ba9bc">Saved Breed Planner targets and families you still want to breed.</small></div><div class="sp"></div><button id="wd-family-planner">Breed Planner</button><button id="wd-family-specials">Special Pokémon</button><button id="wd-family-dex">Pokédex Tasks</button><button id="wd-family-refresh">Reload</button><button id="wd-family-back">Back</button><button id="wd-family-close">×</button></div>
          <div class="wdf-note">
            Use this page to tell the cleaner which evolution lines you are still working on.
            <b>BREED NOW</b> means you are actively breeding that line; <b>TO-BE</b> means you want to breed it later.
            <b>DONE</b> means the project is finished, while <b>NO BREED</b> means you only want a clean collection copy.
            <b>KEEP ALL</b> prevents cleanup for that line.
            Pokémon with a nickname or at least <b>70% IVs</b> are always kept.
            Pokédex completion is handled separately in <b>Pokédex Tasks</b>, so you can immediately see what still needs breeding or evolving.
            <b>Box policy</b> only affects organization: AUTO chooses for you, OWN BOX forces a dedicated family box, and CAN MIX allows the family to share.
          </div>
          <div class="wdf-tools"><input id="wd-family-filter" type="search" placeholder="Filter family/species…"><span>Shown <b id="wd-family-shown">0</b></span><button id="wd-family-reset">Reset shown families</button></div>
          <div class="wdf-wrap"><table><thead><tr><th>Evolution family</th><th>Owned</th><th>Your plan</th><th>Copies</th><th>Box policy</th><th>Can be removed</th><th>Kept because</th></tr></thead><tbody id="wd-family-tbody"></tbody></table></div>`;
        managerAttachView(panel, '.wdf-head');
        document.getElementById('wd-family-filter').addEventListener('input',renderFamilyDecisionRows);
        document.getElementById('wd-family-planner').addEventListener('click',()=>mountBreedPlannerPanel());
        document.getElementById('wd-family-specials').addEventListener('click',mountSpecialPanel);
        document.getElementById('wd-family-dex').addEventListener('click',mountDexTaskPanel);
        document.getElementById('wd-family-refresh').addEventListener('click',()=>window.__WORLDDEX_BOX_MANAGER_REFRESH?.());
        document.getElementById('wd-family-back').addEventListener('click',()=>mountReviewPanel());
        document.getElementById('wd-family-close').addEventListener('click',managerDestroyShell);
        document.getElementById('wd-family-reset').addEventListener('click',()=>{
          const q=String(document.getElementById('wd-family-filter')?.value||'').trim().toLowerCase();
          for(const f of familyDecisionRows()){
            if(q && !f.label.toLowerCase().includes(q) && ![...f.species].join(' ').toLowerCase().includes(q)) continue;
            const plan=breedPlans.get(f.key); const mode=plan ? breedPlanSuggestedMode(plan) : defaultFamilyMode(f);familyDecisions.set(f.key,{mode,boxPolicy:defaultBoxPolicy(f,mode),retention:RETENTION.AUTO});
          }
          saveFamilyDecisions();rebuildAnalysis(true);organizerPlan=null;renderFamilyDecisionRows();renderCandidateRows?.();updatePanelCounts?.();
        });
        renderFamilyDecisionRows();
      }

      // ─────────────────────────────────────────────────────────────
      // REVIEW PANEL + GUARDED RELEASE
      // Nothing is released unless the user explicitly selects the button,
      // types the exact confirmation phrase, and accepts a second confirm().
      // Releases are sequential and stop on the first unexpected response.
      // ─────────────────────────────────────────────────────────────

      // Candidate maps/fingerprints are rebuilt whenever a family decision changes.

      function escHtml(v) {
        return String(v ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }

      function logPanel(msg, kind = 'info') {
        const el = document.getElementById('wd-cleaner-log');
        if (!el) return;
        const t = new Date().toLocaleTimeString();
        const line = document.createElement('div');
        line.className = `wdcl-logline wdcl-${kind}`;
        line.textContent = `[${t}] ${msg}`;
        el.prepend(line);
      }

      function selectedCount() {
        let n = 0;
        for (const id of selectedIds) {
          if (!releasedIds.has(id)) n++;
        }
        return n;
      }

      function friendlyProtectionReason(reason) {
        const r=String(reason||''); if(!r) return '';
        if(r.startsWith('HIGH_IV_')) return 'High IVs'; if(r.startsWith('SYNCRO_CORE_') || r==='SYNCRO_CORE') return 'Useful Synchronize nature';
        if(r.includes('NICKNAME')) return 'Nicknamed'; if(r.includes('FAVOURITE')) return 'Favourite'; if(r.includes('SHINY')) return 'Shiny';
        if(r.includes('SHADOW')) return 'Shadow'; if(r.includes('RAINBOW')) return 'Rainbow'; if(r.includes('EV_TRAINED')) return 'Trained Pokémon';
        if(r.includes('HELD_ITEM')) return 'Holding an item'; if(r.includes('HIGH_FRIENDSHIP')) return 'High friendship';
        if(r.includes('DEX_') || r.includes('EVOLVE') || r.includes('BREED_PARENT')) return 'Needed for Pokédex';
        if(r.includes('BREED') || r.includes('EGG_') || r.includes('CORE_')) return 'Needed for breeding / collection'; if(r.includes('BEST')) return 'Best copy kept';
        return r.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
      }

      function updatePanelCounts() {
        const c = document.getElementById('wd-cleaner-candidate-count');
        const s = document.getElementById('wd-cleaner-selected-count');
        const r = document.getElementById('wd-cleaner-released-count');
        const e = document.getElementById('wd-cleaner-error-count');
        if (c) c.textContent = String(candidates.length);
        if (s) s.textContent = String(selectedCount());
        if (r) r.textContent = String(releasedIds.size);
        if (e) e.textContent = String(releaseErrors.size);
        const activeCount=mons.filter(m=>!releasedIds.has(Number(m.id))).length;
        const previewTotal=document.getElementById('wd-clean-preview-total'), previewKeep=document.getElementById('wd-clean-preview-keep'), previewCandidates=document.getElementById('wd-clean-preview-candidates');
        if(previewTotal) previewTotal.textContent=String(activeCount);
        const liveCandidateCount=candidates.filter(r=>!releasedIds.has(Number(r.ID))).length;
        if(previewKeep) previewKeep.textContent=String(Math.max(0,activeCount-liveCandidateCount));
        if(previewCandidates) previewCandidates.textContent=String(liveCandidateCount);
        managerUpdateNav?.();

        const btn = document.getElementById('wd-cleaner-release-btn');
        if (btn) {
          const n = selectedCount();
          btn.textContent = n ? `RELEASE SELECTED (${n})` : 'RELEASE SELECTED';
          btn.disabled = n === 0 || btn.dataset.busy === '1';
        }
      }

      function candidateMatchesFilter(row, q) {
        if (!q) return true;
        q = q.toLowerCase();
        return [
          row.ID,
          row.Pokemon,
          row.Nature,
          row.Ability,
          row.IVs,
          row.PerfectMask,
          row.DominatedBy,
          row.Reason,
          row.EggGroups
        ].some(v => String(v ?? '').toLowerCase().includes(q));
      }

      function renderCandidateRows() {
        const tbody = document.getElementById('wd-cleaner-tbody');
        if (!tbody) return;

        const q = String(document.getElementById('wd-cleaner-filter')?.value || '').trim();
        const visible = candidates
          .filter(r => candidateMatchesFilter(r, q))
          .sort((a, b) =>
            String(a.Pokemon).localeCompare(String(b.Pokemon)) ||
            Number(b.IVpct) - Number(a.IVpct) ||
            Number(a.ID) - Number(b.ID)
          );

        tbody.innerHTML = visible.map(r => {
          const id = Number(r.ID);
          const isReleased = releasedIds.has(id);
          const hasError = releaseErrors.has(id);
          const checked = selectedIds.has(id) && !isReleased;
          const state = isReleased ? 'RELEASED' : hasError ? 'ERROR' : 'READY';
          const stateClass = isReleased ? 'released' : hasError ? 'error' : 'ready';

          return `
            <tr data-id="${id}" class="wdcl-${stateClass}">
              <td class="wdcl-check">
                <input type="checkbox" data-select-id="${id}" ${checked ? 'checked' : ''} ${isReleased ? 'disabled' : ''}>
              </td>
              <td><b>#${id}</b></td>
              <td>
                <b>${escHtml(r.Pokemon)}</b>
                <span class="wdcl-sex">${escHtml(r.Sex)}</span>
                <small>Box ${escHtml(r.Box)} · Lv.${escHtml(r.Lv)}</small>
              </td>
              <td>${escHtml(r.Nature)}<small>${escHtml(r.Ability)}</small></td>
              <td class="wdcl-ivs">
                <b>${escHtml(r.IVpct)}%</b>
                <span>${escHtml(r.IVs)}</span>
                <small>${r.Perfect ? `${escHtml(r.Perfect)}×31 · ${escHtml(r.PerfectMask)}` : '0×31'}</small>
              </td>
              <td>
                <span title="${escAttr(r.Reason)}">${escHtml(friendlyProtectionReason(r.Reason))}</span>
                <small>${escHtml(r.DominatedBy ? `Better copy: ${r.DominatedBy}` : 'Duplicate no longer needed')}</small>
              </td>
              <td><span class="wdcl-state wdcl-state-${stateClass}">${state}</span></td>
            </tr>
          `;
        }).join('');

        tbody.querySelectorAll('input[data-select-id]').forEach(cb => {
          cb.addEventListener('change', () => {
            const id = Number(cb.dataset.selectId);
            if (cb.checked) selectedIds.add(id);
            else selectedIds.delete(id);
            updatePanelCounts();
          });
        });

        const shown = document.getElementById('wd-cleaner-shown-count');
        if (shown) shown.textContent = String(visible.length);
        updatePanelCounts();
      }

      async function fetchLiveBoxMap() {
        const live = await getJSON('/api/box');
        const list = Array.isArray(live.mons) ? live.mons : [];
        return new Map(list.map(m => [Number(m.id), m]));
      }

      async function validateSelectedLive(ids) {
        const liveMap = await fetchLiveBoxMap();
        const problems = [];

        for (const id of ids) {
          const row = candidateById.get(id);
          const live = liveMap.get(id);

          if (!row) {
            problems.push(`#${id}: no longer in the current cleanup list`);
            continue;
          }

          if (!live) {
            problems.push(`#${id}: no longer present in PC`);
            continue;
          }

          const oldFp = candidateFingerprints.get(id);
          const liveFp = monFingerprint(live);

          if (!oldFp || oldFp !== liveFp) {
            problems.push(`#${id} ${row.Pokemon}: live data changed since analysis`);
          }
        }

        return { liveMap, problems };
      }

      function parseRetryAfterMs(r, body) {
        const h = r.headers?.get?.('retry-after');
        if (h) {
          const seconds = Number(h);
          if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);

          const when = Date.parse(h);
          if (Number.isFinite(when)) return Math.max(0, when - Date.now());
        }

        if (body && typeof body === 'object') {
          const ms = Number(body.retryAfterMs);
          if (Number.isFinite(ms) && ms >= 0) return Math.ceil(ms);

          const generic = Number(body.retryAfter);
          if (Number.isFinite(generic) && generic >= 0) {
            // Worlddex endpoints have used millisecond-style retryAfter values in
            // some places. Small numbers are more plausibly seconds.
            return generic <= 300 ? Math.ceil(generic * 1000) : Math.ceil(generic);
          }
        }

        return null;
      }

      function releaseInterlock(id) {
        id = Number(id);
        const row = candidateById.get(id);
        const m = monById.get(id);
        const blocks = [];

        if (!Number.isFinite(id)) blocks.push('INVALID_ID');
        if (releasedIds.has(id)) blocks.push('ALREADY_RELEASED');
        if (!row) blocks.push('NOT_IN_CANDIDATE_SET');
        if (row && row.Status !== 'RELEASE_CANDIDATE') blocks.push(`STATUS_${row.Status}`);
        if (!m) blocks.push('MISSING_ANALYSIS_MON');

        if (m) {
          const mode = familyMode(m);

          if (mode === FAMILY_MODE.KEEP_ALL) blocks.push('FAMILY_KEEP_ALL');
          if (activeBreedPlanProtectedIds.has(id)) blocks.push('BREED_PLAN_RESERVED');

          for (const reason of absoluteReasonsFor(m)) {
            blocks.push(`ABSOLUTE_${reason}`);
          }

          if (syncUtilityCore.ids.has(id)) {
            blocks.push(syncUtilityCore.why.get(id) || 'SYNCRO_CORE');
          }

          if (retentionCore.ids.has(id)) {
            blocks.push(retentionCore.why.get(id) || 'RETENTION_CORE');
          }

          if (livingDexCore.ids.has(id)) {
            blocks.push(livingDexCore.why.get(id) || 'LIVING_DEX_CORE');
          }

          if (dexTaskCore.evoParents.has(id)) {
            blocks.push(
              'DEX_TASK_EVOLVE_' +
              dexTaskCore.evoParents.get(id)
                .map(d => dexToName.get(Number(d)) || `#${d}`)
                .join('+')
            );
          }

          if (dexTaskCore.breedParents.has(id)) {
            blocks.push(
              'DEX_TASK_BREED_' +
              dexTaskCore.breedParents.get(id)
                .map(d => dexToName.get(Number(d)) || `#${d}`)
                .join('+')
            );
          }

          const explicitBreeding =
            mode === FAMILY_MODE.BREED ||
            mode === FAMILY_MODE.TO_BE;

          if (explicitBreeding && exactCore.has(id)) {
            blocks.push(
              'ACTIVE_BREEDING_CORE_' +
              ((exactCoreWhy.get(id) || ['CORE']).join('+'))
            );
          }

          const activeEggDonor =
            explicitBreeding &&
            maleEggCore.has(id) &&
            groupsOf(m).some(g => activeEggGroups.has(g));

          if (activeEggDonor) {
            blocks.push(
              'ACTIVE_EGG_DONOR_' +
              ((maleEggWhy.get(id) || ['DONOR']).join('+'))
            );
          }
        }

        return {
          ok: blocks.length === 0,
          id,
          row,
          mon: m,
          blocks
        };
      }

      function assertReleaseInterlock(id) {
        const check = releaseInterlock(id);
        if (!check.ok) {
          const name = check.row?.Pokemon || check.mon?.species || '';
          const err = new Error(
            `LOCAL SAFETY INTERLOCK blocked #${check.id} ${name}: ${check.blocks.join(', ')}`
          );
          err.code = 'LOCAL_RELEASE_INTERLOCK';
          err.interlock = check;
          throw err;
        }
        return check;
      }

      async function releaseOne(id) {
        // Independent last gate immediately before the irreversible request.
        assertReleaseInterlock(id);

        const r = await fetch('/api/box/release', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ monId: Number(id) })
        });

        const text = await r.text();
        let body;
        try { body = JSON.parse(text); } catch { body = text; }

        if (!r.ok) {
          const err = new Error(`HTTP ${r.status}: ${text.slice(0, 250)}`);
          err.status = r.status;
          err.retryAfterMs = parseRetryAfterMs(r, body);
          err.responseBody = body;
          throw err;
        }

        if (!body || body.ok !== true || Number(body.id) !== Number(id)) {
          const err = new Error(`Unexpected response: ${text.slice(0, 250)}`);
          err.status = r.status;
          err.responseBody = body;
          throw err;
        }

        return body;
      }

      async function releaseOneWithBackoff(id, row, max429Retries = 5) {
        for (let attempt = 0; ; attempt++) {
          try {
            return await releaseOne(id);
          } catch (err) {
            if (Number(err?.status) !== 429 || attempt >= max429Retries) throw err;

            // Generic release throttling appears to trip around a one-minute
            // window. Prefer the server's own Retry-After when available; when it
            // is absent, wait long enough for that window to drain instead of
            // hammering the same endpoint.
            const serverWait = Number(err?.retryAfterMs);
            const waitMs = Number.isFinite(serverWait) && serverWait >= 0
              ? Math.max(5000, serverWait + 1500)
              : 65000;

            const seconds = Math.ceil(waitMs / 1000);
            logPanel(
              `Worlddex is busy. Waiting ${seconds}s before continuing with #${id} ${row?.Pokemon || ''}…`,
              'warn'
            );

            await sleep(waitMs);
          }
        }
      }

      async function releaseSelected() {
        const btn = document.getElementById('wd-cleaner-release-btn');
        if (!btn || btn.dataset.busy === '1') return;

        const ids = [...selectedIds]
          .filter(id => candidateById.has(id) && !releasedIds.has(id))
          .sort((a, b) => a - b);

        if (!ids.length) {
          alert('No release candidates selected.');
          return;
        }

        btn.dataset.busy = '1';
        updatePanelCounts();

        try {
          // First independent safety gate: every selected ID must still be
          // unprotected in the current analysis before we even ask for confirmation.
          const interlockProblems = [];
          for (const id of ids) {
            const guard = releaseInterlock(id);
            if (!guard.ok) {
              interlockProblems.push(
                `#${id} ${guard.row?.Pokemon || guard.mon?.species || ''}: ${guard.blocks.join(', ')}`
              );
            }
          }

          if (interlockProblems.length) {
            logPanel(`Stopped: ${interlockProblems.length} selected Pokémon are protected.`, 'error');
            console.error('BOX CLEANER LOCAL INTERLOCK FAILED:', interlockProblems);
            alert(
              'Release cancelled before anything was removed.\n\n' +
              'One or more selected Pokémon is protected:\n\n' +
              interlockProblems.slice(0, 10).join('\n') +
              (interlockProblems.length > 10 ? `\n… +${interlockProblems.length - 10} more` : '') +
              '\n\nPress Reload before trying again.'
            );
            return;
          }

          logPanel(`Safety check passed for ${ids.length} Pokémon.`, 'ok');
          logPanel(`Checking the ${ids.length} selected Pokémon one more time…`, 'info');
          const check = await validateSelectedLive(ids);

          if (check.problems.length) {
            logPanel(`ABORTED: ${check.problems.length} live validation problem(s).`, 'error');
            console.error('BOX CLEANER LIVE VALIDATION FAILED:', check.problems);
            alert(
              'Release aborted. Some selected Pokémon changed or disappeared since the analysis.\n\n' +
              check.problems.slice(0, 10).join('\n') +
              (check.problems.length > 10 ? `\n… +${check.problems.length - 10} more` : '') +
              '\n\nRe-run the cleaner before releasing anything.'
            );
            return;
          }

          const phrase = `RELEASE ${ids.length}`;
          const typed = prompt(
            `You are about to permanently release ${ids.length} Pokémon.\n\n` +
            `They have been checked again and are still safe to remove.\n` +
            `Type exactly:\n\n${phrase}\n\n` +
            `Anything else cancels.`
          );

          if (typed !== phrase) {
            logPanel('Release cancelled at typed confirmation.', 'warn');
            return;
          }

          if (!confirm(
            `FINAL CONFIRMATION\n\nPermanently release ${ids.length} selected Pokémon?\n\n` +
            `They will be removed one at a time. If Worlddex is busy or anything unexpected changes, the cleanup pauses or stops instead of continuing blindly.`
          )) {
            logPanel('Release cancelled at final confirmation.', 'warn');
            return;
          }

          logPanel(`Starting sequential release of ${ids.length} Pokémon…`, 'warn');

          let done = 0;
          for (const id of ids) {
            const row = candidateById.get(id);
            try {
              const result = await releaseOneWithBackoff(id, row);
              releasedIds.add(id);
              selectedIds.delete(id);
              releaseErrors.delete(id);
              done++;
              logPanel(`RELEASED #${id} ${result.species || row?.Pokemon || ''} (${done}/${ids.length})`, 'ok');
              renderCandidateRows();
            } catch (err) {
              releaseErrors.set(id, String(err?.message || err));
              logPanel(`STOPPED on #${id} ${row?.Pokemon || ''}: ${err?.message || err}`, 'error');
              console.error('BOX CLEANER RELEASE STOP:', { id, row, error: err });
              renderCandidateRows();
              alert(
                `Release stopped after ${done} successful release(s).\n\n` +
                `Problem on #${id} ${row?.Pokemon || ''}:\n${err?.message || err}\n\n` +
                `Nothing after this Pokémon was attempted.`
              );
              return;
            }

            // Deliberately conservative pacing; no concurrent deletes. 1.35s keeps
            // the batch below an apparent ~60 release/minute throttle even before
            // adaptive 429 backoff is needed.
            await sleep(1350);
          }

          // Final server-side verification: every released ID must be absent.
          const after = await fetchLiveBoxMap();
          const stillThere = ids.filter(id => after.has(id));

          if (stillThere.length) {
            logPanel(`WARNING: ${stillThere.length} released ID(s) still appear in live box.`, 'error');
            console.error('BOX CLEANER POST-RELEASE VERIFY FAILED:', stillThere);
            alert(
              `Cleanup finished, but ${stillThere.length} Pokémon still appear in the PC.\n` +
              `Do not run another batch yet. Check console.`
            );
            return;
          }

          logPanel(`DONE — ${done}/${ids.length} releases verified absent from live box.`, 'ok');

          try {
            if (window.PCSystem?.reload) await window.PCSystem.reload();
          } catch {}

          alert(
            `Done. ${done} Pokémon released and verified.\n\n` +
            `Press Reload data (or re-run Box Manager v1.17.1) before another batch so all protection cores are recalculated from the new box.`
          );
        } finally {
          btn.dataset.busy = '0';
          updatePanelCounts();
        }
      }




      // ─────────────────────────────────────────────────────────────
      // SPECIAL / NO-EGGS RETENTION
      // Explicit per species/form decisions for risky non-breedables.
      // ─────────────────────────────────────────────────────────────

      function specialEntryRows() {
        const groups = new Map();

        for (const m of mons) {
          if (!groupsOf(m).includes('no-eggs')) continue;
          const key = specialEntryKey(m);
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(m);
        }

        return [...groups.entries()].map(([key, pool]) => {
          const first = pool[0];
          const candidateCount = pool.filter(m => candidateById.has(Number(m.id))).length;
          const hardLocked = pool.filter(m => absoluteReasonsFor(m).length > 0).length;
          const highIv = pool.filter(m => ivPct(m) >= CFG.highIVPct).length;
          const named = pool.filter(m => String(m.nick || '').trim()).length;
          const shinyish = pool.filter(m => m.shiny || m.shadow || m.rainbow).length;

          return {
            key,
            dex: Number(first.dex),
            form: first.form == null ? '' : String(first.form),
            species: first.species,
            count: pool.length,
            policy: specialRetention(key),
            effective: effectiveRetention(first),
            candidateCount,
            keptCount: pool.length - candidateCount,
            hardLocked,
            highIv,
            named,
            shinyish,
            best: [...pool].sort(retentionRank)[0] || null
          };
        }).sort((a,b) => b.count-a.count || a.species.localeCompare(b.species));
      }

      function updateSpecialButtons() {
        const rows = specialEntryRows();
        const dupes = rows.filter(r => r.count > 1).length;
        ['wd-cleaner-specials','wd-organizer-specials','wd-family-specials'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.textContent = `Special Pokémon (${dupes})`;
        });
        managerUpdateNav?.();
      }

      function renderSpecialRows() {
        const tbody = document.getElementById('wd-special-tbody');
        if (!tbody) return;

        const q = String(document.getElementById('wd-special-filter')?.value || '').trim().toLowerCase();
        const onlyDupes = !!document.getElementById('wd-special-dupes')?.checked;
        const list = specialEntryRows().filter(r => {
          if (onlyDupes && r.count < 2) return false;
          if (!q) return true;
          return r.species.toLowerCase().includes(q) ||
                 String(r.dex) === q ||
                 r.form.toLowerCase().includes(q);
        });

        const opts = Object.entries(RETENTION_LABEL)
          .filter(([value]) => [RETENTION.AUTO, RETENTION.BEST1, RETENTION.BEST2, RETENTION.ALL].includes(value))
          .map(([value,label]) => ({value,label}));

        tbody.innerHTML = list.map(r => {
          const best = r.best
            ? `#${r.best.id} · ${ivPct(r.best)}% · ${escAttr(r.best.nature || '')}`
            : '—';

          const lockParts = [];
          if (r.highIv) lockParts.push(`70%+ ×${r.highIv}`);
          if (r.named) lockParts.push(`named ×${r.named}`);
          if (r.shinyish) lockParts.push(`rare ×${r.shinyish}`);
          const otherHard = Math.max(0, r.hardLocked - Math.max(r.highIv, 0));
          if (otherHard && !r.named && !r.shinyish) lockParts.push(`other locks ×${otherHard}`);

          return `<tr>
            <td><b>${escAttr(r.species)}</b><small>#${r.dex}${r.form ? ` · ${escAttr(r.form)}` : ''}</small></td>
            <td>${r.count}</td>
            <td>
              <select data-special-retention="${escAttr(r.key)}">
                ${opts.map(o => `<option value="${o.value}" ${r.policy===o.value?'selected':''}>${escAttr(o.label)}</option>`).join('')}
              </select>
              <small>AUTO keeps every copy</small>
            </td>
            <td><b>${r.candidateCount}</b><small>${r.keptCount} kept</small></td>
            <td>${escAttr(lockParts.join(' · ') || '—')}<small>Protected copies are kept in addition to this choice</small></td>
            <td>${escAttr(best)}</td>
          </tr>`;
        }).join('');

        tbody.querySelectorAll('[data-special-retention]').forEach(el => {
          el.addEventListener('change', () => {
            setSpecialRetention(el.dataset.specialRetention, el.value);
          });
        });

        const shown = document.getElementById('wd-special-shown');
        if (shown) shown.textContent = String(list.length);
      }

      function mountSpecialPanel() {
        managerPrepareView('specials');
        document.getElementById('wd-special-manager-v18')?.remove();
        document.getElementById('wd-special-manager-v18-style')?.remove();

        const candidatesPanels = [
          document.getElementById('wd-family-decisions-v15'),
          document.getElementById('wd-box-organizer-v14'),
          document.getElementById('wd-box-cleaner-v13')
        ];
        const returnPanel = candidatesPanels.find(x => x && x.style.display !== 'none') || null;
        candidatesPanels.forEach(x => { if (x) x.style.display='none'; });

        const style = document.createElement('style');
        style.id='wd-special-manager-v18-style';
        style.textContent=`
          #wd-special-manager-v18{position:fixed;z-index:2147483647;right:16px;bottom:16px;width:min(1050px,calc(100vw - 32px));height:min(82vh,850px);display:flex;flex-direction:column;background:#11151d;color:#e8edf5;border:1px solid #344154;border-radius:12px;box-shadow:0 18px 60px rgba(0,0,0,.55);font:13px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;overflow:hidden}
          #wd-special-manager-v18 *{box-sizing:border-box}#wd-special-manager-v18 button,#wd-special-manager-v18 input,#wd-special-manager-v18 select{font:inherit}
          #wd-special-manager-v18 .wds-head{display:flex;gap:9px;align-items:center;padding:12px 14px;background:#171d27;border-bottom:1px solid #2d3849}.wds-head .sp{flex:1}
          #wd-special-manager-v18 button{border:1px solid #3b485d;background:#202938;color:#e8edf5;border-radius:7px;padding:7px 10px;cursor:pointer}
          #wd-special-manager-v18 .wds-note{padding:10px 12px;color:#aab6c6;border-bottom:1px solid #2d3849}.wds-note b{color:#fff}
          #wd-special-manager-v18 .wds-tools{display:flex;gap:8px;align-items:center;padding:9px 12px;border-bottom:1px solid #2d3849;background:#121822}
          #wd-special-manager-v18 .wds-tools input[type=search]{min-width:260px;flex:1;background:#0b1017;border:1px solid #344154;color:#fff;border-radius:7px;padding:7px 9px}
          #wd-special-manager-v18 .wds-wrap{flex:1;min-height:0;overflow:auto;scrollbar-gutter:stable}
          #wd-special-manager-v18 table{width:100%;border-collapse:collapse}#wd-special-manager-v18 th{position:sticky;top:0;background:#19212d;color:#aeb9c8;text-align:left;padding:8px;border-bottom:1px solid #344154}
          #wd-special-manager-v18 td{padding:8px;border-bottom:1px solid #252f3e;vertical-align:top}#wd-special-manager-v18 td small{display:block;color:#8e9caf;margin-top:2px}
          #wd-special-manager-v18 select{background:#0b1017;border:1px solid #344154;color:#fff;border-radius:6px;padding:5px 7px}
        `;
        document.head.appendChild(style);

        const panel = document.createElement('div');
        panel.id='wd-special-manager-v18';
        panel.innerHTML=`
          <div class="wds-head">
            <div><b>Special Pokémon</b><small style="display:block;color:#9ba9bc">Choose how many copies to keep for Pokémon that cannot normally be bred.</small></div>
            <div class="sp"></div>
            <button id="wd-special-refresh">Reload</button>
            <button id="wd-special-back">Back</button>
            <button id="wd-special-close">×</button>
          </div>
          <div class="wds-note">
            By default, the manager keeps every copy here because these Pokémon are harder or impossible to replace through breeding.
            If you have many duplicates, you can choose <b>KEEP BEST 1</b> or <b>KEEP BEST 2</b> for that species.
            Important Pokémon are still protected even when you choose a lower number: nicknamed Pokémon, 70%+ IV Pokémon, favourites, rare variants, trained Pokémon and anything needed for your Pokédex will not be removed.
          </div>
          <div class="wds-tools">
            <input id="wd-special-filter" type="search" placeholder="Search Pokémon…">
            <label><input id="wd-special-dupes" type="checkbox" checked> show duplicates only</label>
            <span>Shown <b id="wd-special-shown">0</b></span>
          </div>
          <div class="wds-wrap">
            <table>
              <thead><tr><th>Species / form</th><th>Owned</th><th>Keep policy</th><th>Can be removed</th><th>Hard locks</th><th>Best copy</th></tr></thead>
              <tbody id="wd-special-tbody"></tbody>
            </table>
          </div>`;
        managerAttachView(panel, '.wds-head');

        document.getElementById('wd-special-filter').addEventListener('input', renderSpecialRows);
        document.getElementById('wd-special-dupes').addEventListener('change', renderSpecialRows);
        document.getElementById('wd-special-refresh').addEventListener('click',()=>window.__WORLDDEX_BOX_MANAGER_REFRESH?.());
        document.getElementById('wd-special-back').addEventListener('click',mountReviewPanel);
        document.getElementById('wd-special-close').addEventListener('click',managerDestroyShell);

        renderSpecialRows();
      }


      // ─────────────────────────────────────────────────────────────
      // DEX COMPLETION TASKS
      // Separate from personal breeding decisions by design.
      // ─────────────────────────────────────────────────────────────

      function updateDexTaskButtons() {
        const n = dexTaskCore?.tasks?.length || 0;
        ['wd-cleaner-dex','wd-organizer-dex','wd-family-dex'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.textContent = `Pokédex Tasks (${n})`;
        });
        managerUpdateNav?.();
      }

      function mountDexTaskPanel() {
        managerPrepareView('dex');
        document.getElementById('wd-dex-tasks-v16')?.remove();
        document.getElementById('wd-dex-tasks-v16-style')?.remove();

        const candidatesPanels = [
          document.getElementById('wd-family-decisions-v15'),
          document.getElementById('wd-box-organizer-v14'),
          document.getElementById('wd-box-cleaner-v13')
        ];
        const returnPanel = candidatesPanels.find(x => x && x.style.display !== 'none') || null;
        candidatesPanels.forEach(x => { if (x) x.style.display='none'; });

        const style=document.createElement('style');
        style.id='wd-dex-tasks-v16-style';
        style.textContent=`
          #wd-dex-tasks-v16{position:fixed;z-index:2147483647;right:16px;bottom:16px;width:min(980px,calc(100vw - 32px));height:min(76vh,760px);display:flex;flex-direction:column;background:#11151d;color:#e8edf5;border:1px solid #344154;border-radius:12px;box-shadow:0 18px 60px rgba(0,0,0,.55);font:13px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;overflow:hidden}
          #wd-dex-tasks-v16 *{box-sizing:border-box}#wd-dex-tasks-v16 button{font:inherit;border:1px solid #3b485d;background:#202938;color:#e8edf5;border-radius:7px;padding:7px 10px;cursor:pointer}
          #wd-dex-tasks-v16 .wdd-head{display:flex;gap:9px;align-items:center;padding:12px 14px;background:#171d27;border-bottom:1px solid #2d3849}.wdd-head .sp{flex:1}
          #wd-dex-tasks-v16 .wdd-note{padding:10px 12px;color:#aab6c6;border-bottom:1px solid #2d3849}
          #wd-dex-tasks-v16 .wdd-wrap{flex:1;min-height:0;overflow:auto;scrollbar-gutter:stable}
          #wd-dex-tasks-v16 table{width:100%;border-collapse:collapse}#wd-dex-tasks-v16 th{position:sticky;top:0;background:#19212d;color:#aeb9c8;text-align:left;padding:8px;border-bottom:1px solid #344154}
          #wd-dex-tasks-v16 td{padding:8px;border-bottom:1px solid #252f3e;vertical-align:top}#wd-dex-tasks-v16 td small{display:block;color:#8e9caf;margin-top:2px}
          #wd-dex-tasks-v16 .tag{display:inline-block;padding:2px 6px;border:1px solid #3b485d;border-radius:999px;font-size:11px}
        `;
        document.head.appendChild(style);

        const panel=document.createElement('div');
        panel.id='wd-dex-tasks-v16';
        const tasks=dexTaskCore.tasks || [];
        panel.innerHTML=`
          <div class="wdd-head"><div><b>Pokédex Tasks</b><small style="display:block;color:#9ba9bc">Pokémon you still need to breed or evolve to complete your collection.</small></div><div class="sp"></div><button id="wd-dex-refresh">Reload</button><button id="wd-dex-back">Back</button><button id="wd-dex-close">×</button></div>
          <div class="wdd-note">This list is generated from the Pokédex entries you are still missing.
            For <b>EVOLVE</b>, the manager keeps one Pokémon that can become the missing entry.
            For <b>BREED</b>, it keeps a compatible female and male whenever possible.
            Once you obtain the missing Pokémon, press <b>Reload</b> and the completed task disappears automatically.</div>
          <div class="wdd-wrap"><table><thead><tr><th>Action</th><th>Missing Pokémon</th><th>Use this Pokémon</th><th>Nature / Ability</th><th>What to do</th></tr></thead><tbody>
            ${tasks.length ? tasks.map(t=>`<tr><td><span class="tag">${escHtml(t.Type)}</span>${t.PairStatus && t.Type==='BREED' ? `<small>${escHtml(t.PairStatus)}</small>` : ''}</td><td><b>#${t.MissingDex} ${escHtml(t.Missing)}</b></td><td><b>${escHtml(t.UseLabel || `#${t.UseID} ${t.Use}`)}</b></td><td>${escHtml(t.Nature)}<small>${escHtml(t.Ability)}</small></td><td>${escHtml(t.Note)}</td></tr>`).join('') : '<tr><td colspan="5" style="padding:22px;text-align:center;color:#8e9caf">No Pokédex breeding or evolution tasks right now.</td></tr>'}
          </tbody></table></div>`;
        managerAttachView(panel, '.wdd-head');

        document.getElementById('wd-dex-refresh').addEventListener('click',()=>window.__WORLDDEX_BOX_MANAGER_REFRESH?.());
        document.getElementById('wd-dex-back').addEventListener('click',mountReviewPanel);
        document.getElementById('wd-dex-close').addEventListener('click',managerDestroyShell);
      }

      // ─────────────────────────────────────────────────────────────
      // BOX ORGANIZER v1.17.1
      // Uses the game's own endpoints discovered in pc.js:
      //   POST /api/box/move     { monId, box }
      //   POST /api/pc/box-name  { box, name }
      // There is no slot/order parameter in /api/box/move, so this can
      // group species/categories into boxes but cannot force exact tile order.
      // ─────────────────────────────────────────────────────────────


      const ORGANIZER_PREFS_KEY = 'worlddex.boxManager.v1.12.organizerPrefs';

      const ORGANIZER_SECTION_DEFAULT_ORDER = [
        'SPECIAL',
        'BATTLE_READY',
        'DEX_TASK',
        'BREED_NOW',
        'TO_BE',
        'SYNCRO',
        'FINAL',
        'STORAGE',
        'RELEASE'
      ];

      const ORGANIZER_SECTION_LABEL = {
        SPECIAL:'SPECIAL',
        BATTLE_READY:'BATTLE READY',
        DEX_TASK:'POKÉDEX TASKS',
        BREED_NOW:'BREEDING',
        TO_BE:'BREED LATER',
        SYNCRO:'SYNCHRONIZE',
        FINAL:'FINAL EVOLUTIONS',
        STORAGE:'STORAGE',
        RELEASE:'CLEANUP CANDIDATES'
      };

      function normalizeOrganizerSectionOrder(raw) {
        const incoming = Array.isArray(raw) ? raw.map(String) : [];
        const out = [];

        for (const key of incoming) {
          if (
            ORGANIZER_SECTION_DEFAULT_ORDER.includes(key) &&
            !out.includes(key)
          ) out.push(key);
        }

        for (const key of ORGANIZER_SECTION_DEFAULT_ORDER) {
          if (!out.includes(key)) out.push(key);
        }

        return out;
      }

      const ORGANIZER_PRESETS = {
        minimal: {
          keepTrainedTogether:false,
          trainedEv:true,
          trainedLevel:true,
          trainedLevelMin:80,
          keepBreedersTogether:false,
          keepSynchronizeTogether:false,
          keepDexTasksTogether:false,
          keepSpecialsTogether:false,
          renameBoxes:false,
          keepFavouritesInPlace:true,
          layoutPriority:'balanced',
          categoryOrder:[...ORGANIZER_SECTION_DEFAULT_ORDER]
        },
        recommended: {
          keepTrainedTogether:true,
          trainedEv:true,
          trainedLevel:true,
          trainedLevelMin:80,
          keepBreedersTogether:true,
          keepSynchronizeTogether:false,
          keepDexTasksTogether:true,
          keepSpecialsTogether:true,
          renameBoxes:true,
          keepFavouritesInPlace:false,
          layoutPriority:'balanced',
          categoryOrder:[...ORGANIZER_SECTION_DEFAULT_ORDER]
        },
        functional: {
          keepTrainedTogether:true,
          trainedEv:true,
          trainedLevel:true,
          trainedLevelMin:80,
          keepBreedersTogether:true,
          keepSynchronizeTogether:true,
          keepDexTasksTogether:true,
          keepSpecialsTogether:true,
          renameBoxes:true,
          keepFavouritesInPlace:false,
          layoutPriority:'balanced',
          categoryOrder:[...ORGANIZER_SECTION_DEFAULT_ORDER]
        }
      };

      function normalizeOrganizerPrefs(raw = {}) {
        const base = ORGANIZER_PRESETS.recommended;
        return {
          keepTrainedTogether: raw.keepTrainedTogether ?? base.keepTrainedTogether,
          trainedEv: raw.trainedEv ?? base.trainedEv,
          trainedLevel: raw.trainedLevel ?? base.trainedLevel,
          trainedLevelMin: Math.max(1, Math.min(100, Number(raw.trainedLevelMin ?? base.trainedLevelMin) || 80)),
          keepBreedersTogether: raw.keepBreedersTogether ?? base.keepBreedersTogether,
          keepSynchronizeTogether: raw.keepSynchronizeTogether ?? base.keepSynchronizeTogether,
          keepDexTasksTogether: raw.keepDexTasksTogether ?? base.keepDexTasksTogether,
          keepSpecialsTogether: raw.keepSpecialsTogether ?? base.keepSpecialsTogether,
          renameBoxes: raw.renameBoxes ?? base.renameBoxes,
          keepFavouritesInPlace: raw.keepFavouritesInPlace ?? base.keepFavouritesInPlace,
          layoutPriority: ['balanced','min_moves','ordered'].includes(raw.layoutPriority)
            ? raw.layoutPriority
            : (base.layoutPriority || 'balanced'),
          categoryOrder: normalizeOrganizerSectionOrder(
            raw.categoryOrder || base.categoryOrder
          ),
          preset: ['minimal','recommended','functional','custom'].includes(raw.preset) ? raw.preset : 'recommended'
        };
      }

      function loadOrganizerPrefs() {
        try { return normalizeOrganizerPrefs(JSON.parse(localStorage.getItem(ORGANIZER_PREFS_KEY) || '{}')); }
        catch { return normalizeOrganizerPrefs(); }
      }

      let organizerPrefsState = loadOrganizerPrefs();

      function saveOrganizerPrefs() {
        try { localStorage.setItem(ORGANIZER_PREFS_KEY, JSON.stringify(organizerPrefsState)); } catch {}
      }

      function organizerPrefs() { return { ...organizerPrefsState }; }

      function setOrganizerPreset(name) {
        const preset = ORGANIZER_PRESETS[name];
        if (!preset) return;

        organizerPrefsState = normalizeOrganizerPrefs({
          ...preset,
          categoryOrder:organizerPrefsState.categoryOrder,
          preset:name
        });
        saveOrganizerPrefs();
      }

      function organizerMaxEV(m) {
        return Math.max(...STATS.map(k => Number(m?.evs?.[k] || 0)));
      }

      function organizerIsTrained(m, prefs = organizerPrefsState) {
        if (!prefs.keepTrainedTogether) return false;
        const evReady = prefs.trainedEv && (evTotal(m) >= 200 || organizerMaxEV(m) >= 100);
        const levelReady = prefs.trainedLevel && Number(m?.lvl || 0) >= Number(prefs.trainedLevelMin || 80);
        return evReady || levelReady;
      }

      function organizerIsSpecial(m) {
        return !!(m.shiny || m.shadow || m.rainbow || m.favourite || Number(m.dex) === 132 || groupsOf(m).includes('no-eggs'));
      }

      const ORGANIZER_CATEGORY_ORDER = [
        'PINNED','SPECIAL','BATTLE_READY','DEX_TASK','BREED_NOW','TO_BE','SYNCRO','FAMILY','FINAL','STORAGE','RELEASE'
      ];

      const ORGANIZER_CATEGORY_LABEL = {
        PINNED:'FAVOURITE (PINNED)', SPECIAL:'SPECIAL', BATTLE_READY:'BATTLE READY', DEX_TASK:'POKÉDEX TASKS',
        BREED_NOW:'BREEDING', TO_BE:'BREED LATER', SYNCRO:'SYNCHRONIZE', FAMILY:'FAMILY',
        FINAL:'FINAL EVOLUTIONS', STORAGE:'STORAGE', RELEASE:'CLEANUP CANDIDATES'
      };

      function detectedPCConfig() {
        try { const p=globalConst('PC'); return p && typeof p==='object' ? p : {}; } catch { return {}; }
      }

      function detectBoxCount(list = mons) {
        // Current game setup confirmed by user: 32 boxes.
        // Keep the UI field editable in case Phoenix changes it again, but do not
        // infer a larger count from stale box names / old client configuration.
        return 32;
      }

      const SERVER_BOX_MOVE_CAPACITY = 100;
      const ORGANIZER_SAFE_CAPACITY = 99; // always leave 1 backend slot free per box
      function detectBoxCapacity() { return ORGANIZER_SAFE_CAPACITY; }

      function familyCategoryForMode(mode) {
        if (mode===FAMILY_MODE.BREED) return 'BREED_NOW';
        if (mode===FAMILY_MODE.TO_BE) return 'TO_BE';
        return 'FAMILY';
      }

      function organizerCategory(m, prefs = organizerPrefsState) {
        const id=Number(m.id);
        if (candidateById.has(id)) return 'RELEASE';
        if (prefs.keepFavouritesInPlace && m.favourite) return 'PINNED';
        if (prefs.keepSpecialsTogether && organizerIsSpecial(m)) return 'SPECIAL';
        if (organizerIsTrained(m, prefs)) return 'BATTLE_READY';
        if (prefs.keepDexTasksTogether && (dexTaskCore.evoParents.has(id) || dexTaskCore.breedParents.has(id))) return 'DEX_TASK';
        const mode=familyMode(m);
        if (prefs.keepBreedersTogether) {
          if (mode===FAMILY_MODE.BREED) return 'BREED_NOW';
          if (mode===FAMILY_MODE.TO_BE) return 'TO_BE';
        }
        const isSynchronize = String(m.ability||'').toLowerCase().replace(/[\s_-]+/g,'') === 'synchronize';
        if (prefs.keepSynchronizeTogether && isSynchronize) return 'SYNCRO';
        if (isFinalDex(m.dex)) return 'FINAL';
        return 'STORAGE';
      }

      function organizerDetails(m, category=organizerCategory(m)) {
        const info=familyInfos.get(familyKeyOf(m));
        if (['BREED_NOW','TO_BE','FAMILY'].includes(category)) return info?.label||m.species;
        if (category==='DEX_TASK') {
          return (dexTaskCore.tasks || [])
            .filter(t => {
              const ids = Array.isArray(t.UseIDs) && t.UseIDs.length
                ? t.UseIDs.map(Number)
                : [Number(t.UseID)];
              return ids.includes(Number(m.id));
            })
            .map(t => `${t.Type} → ${t.Missing}`)
            .join(' · ');
        }
        if (category==='SYNCRO') return m.nature||'Unknown nature';
        if (category==='BATTLE_READY') {
          const parts=[];
          if (evTotal(m) >= 200 || organizerMaxEV(m) >= 100) parts.push(`${evTotal(m)} EVs`);
          if (Number(m.lvl||0) >= Number(organizerPrefsState.trainedLevelMin||80)) parts.push(`Lv.${Number(m.lvl||0)}`);
          return parts.join(' · ') || 'Trained';
        }
        if (category==='PINNED') return 'Favourite — stays in its current box';
        if (category==='RELEASE') return candidateById.get(Number(m.id))?.Reason||'Cleanup candidate';
        return '';
      }

      function organizerSort(a,b) {
        let d=String(familyInfos.get(familyKeyOf(a))?.label||a.species).localeCompare(String(familyInfos.get(familyKeyOf(b))?.label||b.species));
        if(d)return d;
        d=String(a.species||'').localeCompare(String(b.species||''));if(d)return d;
        d=perfectCount(b)-perfectCount(a);if(d)return d;
        d=ivPct(b)-ivPct(a);if(d)return d;
        return Number(a.id)-Number(b.id);
      }

      function cleanOrganizerBoxBase(base) {
        let name = String(base || 'BOX').trim() || 'BOX';

        // Internal alternate-family labels such as "Dratini-Alt" are useful
        // for data handling but not for a player's physical PC box name.
        name = name
          .replace(/\s*[-_]\s*alt(?:\s+[a-z0-9]+)?\s*$/i, '')
          .trim();

        return name || 'BOX';
      }

      function safeBoxName(base, index, part=0, parts=1) {
        // Worlddex already displays the physical box number separately.
        let name=cleanOrganizerBoxBase(base);
        if(parts>1) name += ` ${part+1}`;
        return name.slice(0,16);
      }

      function familyBoxBase(info, mode) {
        return cleanOrganizerBoxBase(info?.label || 'FAMILY');
      }

      function singleFamilyBoxName(base, part=0, parts=1) {
        let name=cleanOrganizerBoxBase(base || 'FAMILY');
        if (parts > 1) name += ` ${part + 1}`;
        return name.slice(0, 16);
      }


      function hungarianMin(cost) {
        // Rectangular Hungarian algorithm, rows <= columns.
        // Returns: assignment[row] = column.
        const n = cost.length;
        const m = n ? cost[0].length : 0;
        if (!n) return [];
        if (n > m) throw new Error(`Hungarian assignment requires rows <= columns (${n} > ${m}).`);

        const u = Array(n + 1).fill(0);
        const v = Array(m + 1).fill(0);
        const p = Array(m + 1).fill(0);
        const way = Array(m + 1).fill(0);

        for (let i = 1; i <= n; i++) {
          p[0] = i;
          let j0 = 0;
          const minv = Array(m + 1).fill(Infinity);
          const used = Array(m + 1).fill(false);

          do {
            used[j0] = true;
            const i0 = p[j0];
            let delta = Infinity;
            let j1 = 0;

            for (let j = 1; j <= m; j++) {
              if (used[j]) continue;
              const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];

              if (cur < minv[j]) {
                minv[j] = cur;
                way[j] = j0;
              }

              if (minv[j] < delta) {
                delta = minv[j];
                j1 = j;
              }
            }

            for (let j = 0; j <= m; j++) {
              if (used[j]) {
                u[p[j]] += delta;
                v[j] -= delta;
              } else {
                minv[j] -= delta;
              }
            }

            j0 = j1;
          } while (p[j0] !== 0);

          do {
            const j1 = way[j0];
            p[j0] = p[j1];
            j0 = j1;
          } while (j0 !== 0);
        }

        const assignment = Array(n).fill(-1);
        for (let j = 1; j <= m; j++) {
          if (p[j] > 0 && p[j] <= n) {
            assignment[p[j] - 1] = j - 1;
          }
        }
        return assignment;
      }

      function normalizedOrganizerBoxName(name) {
        return String(name || '')
          .replace(/^\s*\d{1,2}\s+/, '')
          .trim()
          .toLowerCase();
      }

      function maxScoreIncreasingAssignment(scores) {
        // Assign each logical box-group to a unique physical box while preserving
        // logical order: group 0 < group 1 < group 2 ...
        //
        // This is what the Category order UI actually promises. We still allow
        // gaps between sections in Balanced mode so the planner can save moves.
        const n=scores.length;
        const m=n ? scores[0].length : 0;
        if(!n) return [];
        if(n>m) throw new Error(`Cannot place ${n} logical boxes into ${m} physical boxes.`);

        const NEG=-1e30;
        const dp=Array.from({length:n+1},()=>Array(m+1).fill(NEG));
        const take=Array.from({length:n+1},()=>Array(m+1).fill(false));

        for(let j=0;j<=m;j++) dp[0][j]=0;

        for(let i=1;i<=n;i++){
          for(let j=1;j<=m;j++){
            // Option 1: leave physical box j-1 unused by logical groups.
            let best=dp[i][j-1];
            let choose=false;

            // Option 2: place logical group i-1 into physical box j-1.
            const s=Number(scores[i-1][j-1]);
            if(dp[i-1][j-1]>NEG/2 && Number.isFinite(s)){
              const candidate=dp[i-1][j-1]+s;
              if(candidate>best){
                best=candidate;
                choose=true;
              }
            }

            dp[i][j]=best;
            take[i][j]=choose;
          }
        }

        if(dp[n][m]<=NEG/2){
          throw new Error('No valid ordered box placement could be found with the current capacity / pinned-box settings.');
        }

        const assignment=Array(n).fill(-1);
        let i=n,j=m;

        while(i>0 && j>0){
          if(take[i][j]){
            assignment[i-1]=j-1;
            i--;
            j--;
          } else {
            j--;
          }
        }

        if(assignment.some(x=>x<0)){
          throw new Error('Ordered placement backtracking failed.');
        }

        return assignment;
      }

      function stableAssignOrganizerBoxes(
        boxDefs,
        boxCount,
        capacity = ORGANIZER_SAFE_CAPACITY,
        pinnedCounts = new Map(),
        layoutPriority = 'balanced'
      ) {
        if (!boxDefs.length) return {
          targets: [],
          stayed: 0,
          total: 0,
          strategy: 'empty'
        };

        if (boxDefs.length > boxCount) {
          throw new Error(`Cannot assign ${boxDefs.length} logical boxes into ${boxCount} physical boxes.`);
        }

        const currentNames =
          (window.Game && window.Game.state && window.Game.state.boxNames) || {};

        // Choose how much we care about preserving current physical positions
        // versus keeping the logical Organizer sections visually ordered.
        //
        // min_moves: current v1.11/v1.12 behavior — aggressively preserve boxes.
        // balanced:  preserve established groups, but fix obvious stragglers.
        // ordered:   strongly follow logical order, accepting more moves.
        const mode = ['balanced','min_moves','ordered'].includes(layoutPriority)
          ? layoutPriority
          : 'balanced';

        const weights = mode === 'min_moves'
          ? { stay:1_000_000, name:5_000, exact:100, nearPerBox:1 }
          : mode === 'ordered'
            ? { stay:200, name:50, exact:2_000_000, nearPerBox:100_000 }
            : { stay:4_000, name:1_000, exact:20_000, nearPerBox:1_000 };

        const SCORE_PER_STAY = weights.stay;
        const SCORE_NAME_MATCH = weights.name;
        const SCORE_CANONICAL_EXACT = weights.exact;
        const SCORE_CANONICAL_NEAR = weights.nearPerBox;

        const scores = boxDefs.map((def, defIndex) => {
          const currentCounts = new Map();

          for (const m of def.items) {
            const b = Number(m.box) || 0;
            currentCounts.set(b, (currentCounts.get(b) || 0) + 1);
          }

          const expectedBase = normalizedOrganizerBoxName(def.base);

          return Array.from({ length: boxCount }, (_, physicalBox) => {
            const pinned = Number(pinnedCounts.get(physicalBox) || 0);
            const free = Math.max(0, Number(capacity) - pinned);
            if (def.items.length > free) return -1_000_000_000_000;
            const overlap = currentCounts.get(physicalBox) || 0;

            const currentName = normalizedOrganizerBoxName(
              currentNames[physicalBox] ?? currentNames[String(physicalBox)] ?? ''
            );

            const nameMatch =
              expectedBase &&
              currentName &&
              (
                currentName === expectedBase ||
                currentName.startsWith(expectedBase) ||
                expectedBase.startsWith(currentName)
              )
                ? SCORE_NAME_MATCH
                : 0;

            // This only resolves ties. It can never beat one extra Pokémon stay.
            const distance = Math.abs(physicalBox - defIndex);
            const canonical =
              physicalBox === defIndex
                ? SCORE_CANONICAL_EXACT
                : Math.max(0, boxCount - distance) * SCORE_CANONICAL_NEAR;

            return overlap * SCORE_PER_STAY + nameMatch + canonical;
          });
        });

        let maxScore = 0;
        for (const row of scores) {
          for (const score of row) maxScore = Math.max(maxScore, score);
        }

        let targets;

        if(mode==='min_moves'){
          // This is the only mode that may ignore category order entirely.
          // It answers one question only: "how few Pokémon can I move?"
          const cost=scores.map(row=>row.map(score=>maxScore-score));
          targets=hungarianMin(cost);
        } else {
          // Balanced and Ordered both respect the user's Category order.
          // Balanced may leave gaps to preserve existing boxes; Ordered's score
          // heavily prefers the earliest canonical positions.
          targets=maxScoreIncreasingAssignment(scores);
        }

        let stayed = 0;
        let total = 0;
        boxDefs.forEach((def, i) => {
          const target = targets[i];
          const pinned = Number(pinnedCounts.get(target) || 0);
          if (def.items.length > Number(capacity) - pinned) {
            throw new Error(`The current favourite-lock settings leave too little room in Box ${target + 1}. Try another organization style or disable “Keep favourites where they are”.`);
          }
          for (const m of def.items) {
            total++;
            if ((Number(m.box) || 0) === target) stayed++;
          }
        });

        return {
          targets,
          stayed,
          total,
          strategy: mode
        };
      }

      function buildOrganizerPlan(boxCount=detectBoxCount(), capacity=detectBoxCapacity(), autoOwnMin=12, prefs=organizerPrefs()) {
        boxCount=Math.max(1,Math.floor(Number(boxCount)||0));
        capacity=Math.min(
          ORGANIZER_SAFE_CAPACITY,
          Math.max(1,Math.floor(Number(capacity)||ORGANIZER_SAFE_CAPACITY))
        );
        autoOwnMin=Math.max(1,Math.floor(Number(autoOwnMin)||12));

        prefs=normalizeOrganizerPrefs(prefs);
        const active=mons.filter(m=>!releasedIds.has(Number(m.id))).slice();
        if(active.length>boxCount*capacity) throw new Error(`Not enough room: ${active.length} Pokémon for ${boxCount} boxes at the selected capacity.`);

        const pinned = prefs.keepFavouritesInPlace ? active.filter(m => !!m.favourite) : [];
        const pinnedIds = new Set(pinned.map(m => Number(m.id)));
        const pinnedCounts = new Map();
        for (const m of pinned) {
          const b = Number(m.box) || 0;
          pinnedCounts.set(b, (pinnedCounts.get(b) || 0) + 1);
        }
        const movable = active.filter(m => !pinnedIds.has(Number(m.id)));

        const special=[];
        const battleReady=[];
        const sync=[];
        const dexTasks=[];
        const release=[];

        // If Breeding Projects are ignored for organization, ordinary Pokémon are
        // pooled by function instead of being kept as family blobs.
        const ordinaryFinal=[];
        const ordinaryStorage=[];

        const familyGroups=new Map();

        for(const m of movable){
          const cat=organizerCategory(m,prefs);
          if(cat==='SPECIAL'){special.push(m);continue;}
          if(cat==='BATTLE_READY'){battleReady.push(m);continue;}
          if(cat==='SYNCRO'){sync.push(m);continue;}
          if(cat==='DEX_TASK'){dexTasks.push(m);continue;}
          if(cat==='RELEASE'){release.push(m);continue;}

          // Breeding Projects OFF means exactly that for the Organizer:
          // no family grouping, no family-size promotion, no family box policy.
          if(!prefs.keepBreedersTogether){
            if(cat==='FINAL') ordinaryFinal.push(m);
            else ordinaryStorage.push(m);
            continue;
          }

          const familyKey=familyKeyOf(m);
          const mode=familyMode(m);
          const forceOwn=familyBoxPolicy(familyKey)===BOX_POLICY.OWN;

          // Finished / unwanted lines should not remain artificial "family blobs".
          // Let their final evolutions go to FINAL and their remaining living-Dex
          // representatives go to STORAGE. A manually forced OWN BOX still wins.
          const splitByFunction =
            !forceOwn &&
            (mode===FAMILY_MODE.DONE || mode===FAMILY_MODE.NO_BREED);

          const groupKey = splitByFunction
            ? `${familyKey}::${cat}`
            : familyKey;

          if(!familyGroups.has(groupKey)) familyGroups.set(groupKey,[]);
          familyGroups.get(groupKey).push(m);
        }

        const categoryPriority = {
          BREED_NOW:0, TO_BE:1, FINAL:2, STORAGE:3
        };

        function groupCategory(items){
          const cats=[...new Set(items.map(m=>organizerCategory(m,prefs)))];
          cats.sort((a,b)=>(categoryPriority[a]??99)-(categoryPriority[b]??99));
          return cats[0] || 'STORAGE';
        }

        function familyGroup(groupKey,items){
          const key=familyKeyOf(items[0]);
          const info=familyInfos.get(key);
          const mode=familyDecision(key).mode;
          const policy=familyBoxPolicy(key);
          return {
            key, groupKey, items:items.slice().sort(organizerSort), info, mode, policy,
            category:groupCategory(items),
            count:items.length
          };
        }

        const groups=[...familyGroups.entries()].map(([key,items])=>familyGroup(key,items));

        function chunkFamily(group){
          const chunks=[];
          const parts=Math.ceil(group.items.length/capacity);
          for(let p=0;p<parts;p++){
            const chunk=group.items.slice(p*capacity,(p+1)*capacity);
            if(!chunk.length) continue;
            chunks.push({
              kind:'FAMILY',
              section:group.category,
              familyKey:group.key,
              mode:group.mode,
              base:familyBoxBase(group.info,group.mode),
              items:chunk,
              part:p,
              parts,
              exclusive:true,
              autoOwn:false
            });
          }
          return chunks;
        }

        function chunkSimple(items,meta){
          const sorted=items.slice().sort(organizerSort);
          const out=[];
          const parts=Math.ceil(sorted.length/capacity);
          for(let p=0;p<parts;p++){
            const chunk=sorted.slice(p*capacity,(p+1)*capacity);
            if(!chunk.length) continue;
            out.push({...meta,items:chunk,part:p,parts,exclusive:true});
          }
          return out;
        }

        function packShared(sharedGroups){
          const defs=[];
          const buckets=new Map();

          for(const g of sharedGroups){
            // A single family larger than one physical box must own however many
            // boxes it needs; it is never fragmented across unrelated family bins.
            if(g.count>capacity){
              defs.push(...chunkFamily(g));
              continue;
            }
            if(!buckets.has(g.category)) buckets.set(g.category,[]);
            buckets.get(g.category).push(g);
          }

          const bucketOrder=['BREED_NOW','TO_BE','FINAL','STORAGE'];
          for(const cat of bucketOrder){
            const list=(buckets.get(cat)||[]).slice().sort((a,b)=>b.count-a.count||String(a.info?.label||'').localeCompare(String(b.info?.label||'')));
            const bins=[];

            // First-fit decreasing, but the indivisible item is an entire family.
            for(const g of list){
              let bin=bins.find(x=>x.count+g.count<=capacity);
              if(!bin){
                bin={count:0,groups:[]};
                bins.push(bin);
              }
              bin.groups.push(g);
              bin.count+=g.count;
            }

            bins.forEach((bin,i)=>{
              const items=bin.groups.flatMap(g=>g.items);
              const familyKeys=bin.groups.map(g=>g.key);
              defs.push({
                kind:cat,
                section:cat,
                base:ORGANIZER_CATEGORY_LABEL[cat]||cat,
                items,
                groups:bin.groups,
                familyKeys,
                part:i,
                parts:bins.length,
                exclusive:false
              });
            });
          }
          return defs;
        }

        const fixedDefs=[];
        if(special.length) fixedDefs.push(...chunkSimple(special,{kind:'SPECIAL',section:'SPECIAL',base:'SPECIAL'}));
        if(battleReady.length) fixedDefs.push(...chunkSimple(battleReady,{kind:'BATTLE_READY',section:'BATTLE_READY',base:'BATTLE READY'}));
        if(dexTasks.length) fixedDefs.push(...chunkSimple(dexTasks,{kind:'DEX_TASK',section:'DEX_TASK',base:'POKÉDEX TASKS'}));

        // Breeding Projects OFF: these are ordinary collection pools, not family boxes.
        if(ordinaryFinal.length) fixedDefs.push(
          ...chunkSimple(ordinaryFinal,{kind:'FINAL',section:'FINAL',base:'FINAL EVOLUTIONS'})
        );
        if(ordinaryStorage.length) fixedDefs.push(
          ...chunkSimple(ordinaryStorage,{kind:'STORAGE',section:'STORAGE',base:'STORAGE'})
        );
        if(sync.length){
          sync.sort((a,b)=>String(a.nature||'').localeCompare(String(b.nature||''))||organizerSort(a,b));
          fixedDefs.push(...chunkSimple(sync,{kind:'SYNCRO',section:'SYNCRO',base:'SYNCHRONIZE'}));
        }
        if(release.length) fixedDefs.push(...chunkSimple(release,{kind:'RELEASE',section:'RELEASE',base:'RELEASE'}));

        const forcedOwn=[];
        const neverOwn=[];
        const smartCandidates=[];

        for(const g of groups){
          if(g.policy===BOX_POLICY.OWN) forcedOwn.push(g);
          else if(g.policy===BOX_POLICY.MIX) neverOwn.push(g);
          else smartCandidates.push(g);
        }

        const forcedDefs=forcedOwn.flatMap(chunkFamily);

        // AUTO candidate priority:
        // 1) explicit breeding workflow statuses, even if the family is small;
        // 2) larger families;
        // 3) alphabetical stability.
        smartCandidates.sort((a,b)=>{
          // Only active/planned breeding projects get priority for a private box.
          // DONE / NO_BREED are collection-cleanup states, not reasons to waste a
          // whole box on a single fossil/evolution.
          const workflowA=(a.mode===FAMILY_MODE.BREED || a.mode===FAMILY_MODE.TO_BE)?1:0;
          const workflowB=(b.mode===FAMILY_MODE.BREED || b.mode===FAMILY_MODE.TO_BE)?1:0;
          if(workflowA!==workflowB) return workflowB-workflowA;
          if(a.count!==b.count) return b.count-a.count;
          return String(a.info?.label||'').localeCompare(String(b.info?.label||''));
        });

        const selectedAutoOwn=[];
        const sharedAuto=[];

        // Start with everything AUTO sharing. Promote a family to a private box
        // only if it is important enough AND the resulting complete plan still
        // fits the real box budget. This is why 87 repeated families no longer
        // create a 96-box plan.
        for(let i=0;i<smartCandidates.length;i++){
          const g=smartCandidates[i];
          // AUTO box policy:
          // - BREED NOW / TO-BE may receive a private box even when small.
          // - DONE / NO_BREED / ordinary AUTO only qualify by family size.
          //   If the user truly wants a tiny family isolated, they can set OWN BOX.
          const isBreedingProject =
            g.mode===FAMILY_MODE.BREED ||
            g.mode===FAMILY_MODE.TO_BE;
          const eligible=isBreedingProject || g.count>=autoOwnMin;

          if(!eligible){
            sharedAuto.push(g);
            continue;
          }

          const tentOwn=[...selectedAutoOwn,g];
          const remaining=[
            ...neverOwn,
            ...sharedAuto,
            ...smartCandidates.slice(i+1)
          ];
          const tentCount =
            fixedDefs.length +
            forcedDefs.length +
            tentOwn.flatMap(chunkFamily).length +
            packShared(remaining).length;

          if(tentCount<=boxCount) selectedAutoOwn.push(g);
          else sharedAuto.push(g);
        }

        const privateDefs=[
          ...forcedDefs,
          ...selectedAutoOwn.flatMap(g=>chunkFamily(g).map(d=>({...d,autoOwn:true})))
        ];

        const sharedGroups=[
          ...neverOwn,
          ...sharedAuto
        ];

        const sharedDefs=packShared(sharedGroups);

        const unsortedBoxDefs=[...fixedDefs,...privateDefs,...sharedDefs]
          .map((def,originalIndex)=>({
            ...def,
            originalIndex,
            section:def.section || def.kind || 'STORAGE'
          }));

        const sectionOrder=normalizeOrganizerSectionOrder(prefs.categoryOrder);
        const sectionRank=new Map(sectionOrder.map((key,i)=>[key,i]));

        const boxDefs=unsortedBoxDefs
          .slice()
          .sort((a,b)=>{
            const ra=sectionRank.get(a.section) ?? 999;
            const rb=sectionRank.get(b.section) ?? 999;
            return ra-rb || a.originalIndex-b.originalIndex;
          });

        const activeSections=[...new Set(boxDefs.map(def=>def.section))]
          .filter(key=>ORGANIZER_SECTION_DEFAULT_ORDER.includes(key));

        if(boxDefs.length>boxCount){
          const forcedNames=forcedOwn.map(g=>g.info?.label||g.key);
          throw new Error(
            `This layout needs ${boxDefs.length} boxes but only ${boxCount} are available. ` +
            `Forced OWN BOX families: ${forcedOwn.length}` +
            (forcedNames.length ? ` (${forcedNames.slice(0,8).join(', ')}${forcedNames.length>8?'…':''})` : '') +
            `. Change some OWN BOX policies to AUTO/CAN MIX.`
          );
        }

        const assignments=[];
        const targetById=new Map();
        const boxes=new Map();
        const boxNames=new Map();
        const boxSummaries=[];

        // IMPORTANT: logical box order is NOT physical box order anymore.
        // Pick the physical destinations that keep the largest possible number
        // of already-correct Pokémon in place.
        const stablePlacement = stableAssignOrganizerBoxes(
          boxDefs,
          boxCount,
          capacity,
          pinnedCounts,
          prefs.layoutPriority
        );

        boxDefs.forEach((def,defIndex)=>{
          const targetBox = stablePlacement.targets[defIndex];
          if (!Number.isFinite(targetBox) || targetBox < 0 || targetBox >= boxCount) {
            throw new Error(`Stable organizer produced invalid target box ${targetBox} for logical group ${defIndex}.`);
          }

          const entries=[];
          for(const m of def.items){
            const category=organizerCategory(m,prefs);
            const entry={
              id:Number(m.id),
              mon:m,
              category,
              details:organizerDetails(m,category),
              currentBox:Number(m.box)||0,
              targetBox,
              stickyGroup:def.familyKey||def.kind
            };
            assignments.push(entry);
            targetById.set(entry.id,targetBox);
            entries.push(entry);
          }

          boxes.set(targetBox,entries);

          let base=def.base;
          let singleFamilyName = null;

          if(def.kind==='FAMILY' && def.familyKey){
            const info=familyInfos.get(def.familyKey);
            base=familyBoxBase(info,def.mode);
            singleFamilyName = base;
          } else if(def.groups?.length===1){
            // Even if this family reached the box through a shared category bin,
            // don't call a one-family box "TO-BE" or "BREED NOW".
            singleFamilyName = familyBoxBase(def.groups[0].info, def.groups[0].mode);
          }

          const name = singleFamilyName
            ? singleFamilyBoxName(singleFamilyName, def.part||0, def.parts||1)
            : safeBoxName(base,targetBox,def.part||0,def.parts||1);

          boxNames.set(targetBox,name);

          const species=new Map();
          for(const x of entries) species.set(x.mon.species,(species.get(x.mon.species)||0)+1);
          const speciesText=[...species.entries()]
            .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
            .map(([s,n])=>`${s}×${n}`).join(', ');

          const cats=[...new Set(entries.map(x=>ORGANIZER_CATEGORY_LABEL[x.category]||x.category))].join(', ');
          let policyNote='';
          if(def.kind==='FAMILY' && def.familyKey){
            const p=familyBoxPolicy(def.familyKey);
            policyNote=p===BOX_POLICY.OWN?'OWN BOX':def.autoOwn?'AUTO→OWN':'';
          } else if(def.groups?.length){
            policyNote=`${def.groups.length} families`;
          }

          boxSummaries.push({
            Box:targetBox+1,
            Name:name,
            Count:entries.length,
            Categories:cats+(policyNote?` · ${policyNote}`:''),
            Species:speciesText
          });
        });

        for (const m of pinned) {
          const targetBox = Number(m.box) || 0;
          const entry = {id:Number(m.id),mon:m,category:'PINNED',details:'Favourite — stays in its current box',currentBox:targetBox,targetBox,stickyGroup:'PINNED'};
          assignments.push(entry);
          targetById.set(entry.id,targetBox);
          if (!boxes.has(targetBox)) boxes.set(targetBox,[]);
          boxes.get(targetBox).push(entry);
          let summary = boxSummaries.find(r => Number(r.Box) === targetBox + 1);
          if (!summary) {
            const existingName = window.Game?.state?.boxNames?.[targetBox] ?? window.Game?.state?.boxNames?.[String(targetBox)] ?? `Box ${targetBox + 1}`;
            summary = {Box:targetBox+1,Name:String(existingName || `Box ${targetBox + 1}`),Count:0,Categories:'',Species:''};
            boxSummaries.push(summary);
          }
          summary.Count += 1;
          const pinCat='FAVOURITE (PINNED)';
          if (!String(summary.Categories||'').includes(pinCat)) summary.Categories=[summary.Categories,pinCat].filter(Boolean).join(', ');
          const speciesMap=new Map();
          for(const x of boxes.get(targetBox)) speciesMap.set(x.mon.species,(speciesMap.get(x.mon.species)||0)+1);
          summary.Species=[...speciesMap.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([sp,n])=>`${sp}×${n}`).join(', ');
        }

        boxSummaries.sort((a,b)=>Number(a.Box)-Number(b.Box));
        const moves=assignments.filter(x=>x.currentBox!==x.targetBox);
        const usedBoxes=new Set(assignments.map(x=>x.targetBox)).size;
        const alreadyPlaced = assignments.length - moves.length;

        // UI summary counters. v1.5.2 accidentally dropped this object while the
        // Organizer panel still expected plan.categoryCounts.
        const categoryCounts={};
        for(const x of assignments){
          categoryCounts[x.category]=(categoryCounts[x.category]||0)+1;
        }

        const currentNames=(window.Game && window.Game.state && window.Game.state.boxNames) || {};
        const renameChanges = prefs.renameBoxes
          ? [...boxNames.entries()].filter(([b,name]) => String(currentNames[b] ?? currentNames[String(b)] ?? '') !== String(name || '')).length
          : 0;

        return {
          boxCount,capacity,autoOwnMin,total:active.length,usedBoxes,
          assignments,targetById,boxes,boxNames,boxSummaries,moves,categoryCounts,
          alreadyPlaced,
          pinnedCount:pinned.length,
          prefs:{...prefs},
          renameEnabled:!!prefs.renameBoxes,
          renameChanges,
          layoutPriority:prefs.layoutPriority,
          categoryOrder:[...sectionOrder],
          activeSections:[...activeSections],
          breedingOrganizationEnabled:!!prefs.keepBreedersTogether,
          stablePlacement,
          physicalUsedBoxes:[...boxNames.keys()].sort((a,b)=>a-b),
          autoOwnFamilies:selectedAutoOwn.map(g=>g.info?.label||g.key),
          forcedOwnFamilies:forcedOwn.map(g=>g.info?.label||g.key),
          sharedFamilies:sharedGroups.map(g=>g.info?.label||g.key)
        };
      }

      let organizerPlan = null;
      let organizerBusy = false;

      function organizerPlanTSV(plan = organizerPlan) {
        if (!plan) return '';
        const cols = ['ID','Pokemon','Sex','Nature','Ability','IVs','Perfect','Category','Details','CurrentBox','TargetBox','TargetName'];
        const clean = v => String(v ?? '').replace(/\t/g, ' ').replace(/[\r\n]+/g, ' ');
        const lines = [cols.join('\t')];
        for (const x of plan.assignments) {
          const row = {
            ID: x.id,
            Pokemon: x.mon.species,
            Sex: sex(x.mon),
            Nature: x.mon.nature || '',
            Ability: x.mon.ability || '',
            IVs: ivString(x.mon),
            Perfect: perfectCount(x.mon),
            Category: ORGANIZER_CATEGORY_LABEL[x.category] || x.category,
            Details: x.details,
            CurrentBox: x.currentBox + 1,
            TargetBox: x.targetBox + 1,
            TargetName: plan.boxNames.get(x.targetBox) || ''
          };
          lines.push(cols.map(c => clean(row[c])).join('\t'));
        }
        return lines.join('\n');
      }

      function downloadOrganizerPlan(plan = organizerPlan) {
        if (!plan) return;
        const blob = new Blob([organizerPlanTSV(plan)], { type:'text/tab-separated-values;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'worlddex_box_organizer_v1_15_1_plan.tsv';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }

      function logOrganizer(msg, kind = 'info') {
        const el = document.getElementById('wd-organizer-log');
        if (!el) return;
        const line = document.createElement('div');
        line.className = `wdorg-logline wdorg-${kind}`;
        line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        el.prepend(line);
      }

      function renderOrganizerBoxRows(plan = organizerPlan) {
        const tbody = document.getElementById('wd-organizer-tbody');
        if (!tbody || !plan) return;
        tbody.innerHTML = plan.boxSummaries.map(r => `
          <tr>
            <td><b>${r.Box}</b></td>
            <td><b>${escHtml(r.Name)}</b></td>
            <td>${r.Count}/${plan.capacity}</td>
            <td>${escHtml(r.Categories)}</td>
            <td>${escHtml(r.Species)}</td>
          </tr>
        `).join('');

        const stats = {
          total: document.getElementById('wd-organizer-total'),
          moves: document.getElementById('wd-organizer-moves'),
          used: document.getElementById('wd-organizer-used')
        };
        if (stats.total) stats.total.textContent = String(plan.total);
        if (stats.moves) stats.moves.textContent = String(plan.moves.length);
        if (stats.used) stats.used.textContent = `${plan.usedBoxes}/${plan.boxCount}`;
        const pTotal=document.getElementById('wd-org-preview-total'), pStay=document.getElementById('wd-org-preview-stay'), pMove=document.getElementById('wd-org-preview-move'), pBoxes=document.getElementById('wd-org-preview-boxes'), pRenames=document.getElementById('wd-org-preview-renames');
        if(pTotal) pTotal.textContent=String(plan.total);
        if(pStay) pStay.textContent=String(plan.alreadyPlaced);
        if(pMove) pMove.textContent=String(plan.moves.length);
        if(pBoxes) pBoxes.textContent=`${plan.usedBoxes}/${plan.boxCount}`;
        if(pRenames) pRenames.textContent=String(plan.renameChanges||0);

      }

      function updateOrganizerApplyButton(plan = organizerPlan, completed = false) {
        const btn = document.getElementById('wd-organizer-apply');
        if (!btn) return;

        if (!plan) {
          btn.textContent = 'APPLY ORGANIZATION';
          btn.disabled = true;
          return;
        }

        const moveN = Number(plan.moves?.length || 0);
        const renameN = Number(plan.renameChanges || 0);
        const nothingToDo = moveN === 0 && renameN === 0;

        if (completed && nothingToDo) {
          btn.textContent = 'ORGANIZED ✓';
          btn.disabled = true;
          return;
        }

        if (nothingToDo) {
          btn.textContent = 'NOTHING TO ORGANIZE ✓';
          btn.disabled = true;
          return;
        }

        btn.textContent =
          `APPLY ORGANIZATION (${moveN} moves${renameN ? ` · ${renameN} names` : ''})`;
        btn.disabled = organizerBusy;
      }

      function rebuildOrganizerPlanFromUI() {
        const boxCount = Number(document.getElementById('wd-organizer-boxes')?.value || detectBoxCount());
        const capEl = document.getElementById('wd-organizer-cap');
        const requestedCapacity = Number(capEl?.value || detectBoxCapacity());
        const capacity = Math.min(
          ORGANIZER_SAFE_CAPACITY,
          Math.max(1, Math.floor(requestedCapacity || ORGANIZER_SAFE_CAPACITY))
        );
        if (capEl && Number(capEl.value) !== capacity) capEl.value = String(capacity);

        const autoOwnMin = Number(document.getElementById('wd-organizer-ownmin')?.value || 12);
        try {
          organizerPlan = buildOrganizerPlan(boxCount, capacity, autoOwnMin, organizerPrefsState);
          renderOrganizerBoxRows(organizerPlan);
          const layoutLabel = organizerPlan.layoutPriority === 'ordered'
            ? 'Keep boxes ordered'
            : organizerPlan.layoutPriority === 'min_moves'
              ? 'Minimize moves'
              : 'Balanced';
          logOrganizer(
            `Preview updated: ${organizerPlan.moves.length} move(s), ` +
            `${organizerPlan.alreadyPlaced} already in place · ${layoutLabel}.`,
            'ok'
          );
          updateOrganizerApplyButton(organizerPlan, false);
          return organizerPlan;
        } catch (err) {
          organizerPlan = null;
          updateOrganizerApplyButton(null, false);
          logOrganizer(`PLAN ERROR: ${err?.message || err}`, 'error');
          alert(`Organizer plan error:\n\n${err?.message || err}`);
          return null;
        }
      }

      const ORGANIZER_REQUEST_GAP_MS = 500;
      const ORGANIZER_429_FALLBACK_MS = 65000;
      const ORGANIZER_REFRESH_EVERY_MOVES = 10;
      let organizerLastRequestAt = 0;

      function organizerRetryAfterMs(r, data) {
        const h = r?.headers?.get?.('retry-after');
        if (h) {
          const seconds = Number(h);
          if (Number.isFinite(seconds) && seconds >= 0) {
            return Math.ceil(seconds * 1000);
          }

          const when = Date.parse(h);
          if (Number.isFinite(when)) {
            return Math.max(0, when - Date.now());
          }
        }

        if (data && typeof data === 'object') {
          const ms = Number(data.retryAfterMs);
          if (Number.isFinite(ms) && ms >= 0) return Math.ceil(ms);

          const generic = Number(data.retryAfter);
          if (Number.isFinite(generic) && generic >= 0) {
            return generic <= 300 ? Math.ceil(generic * 1000) : Math.ceil(generic);
          }
        }

        return null;
      }

      async function organizerRequestGap() {
        const elapsed = Date.now() - organizerLastRequestAt;
        const wait = ORGANIZER_REQUEST_GAP_MS - elapsed;
        if (wait > 0) await sleep(wait);
      }

      async function organizerFetch(url, options = {}) {
        await organizerRequestGap();
        const r = await fetch(url, options);
        organizerLastRequestAt = Date.now();
        return r;
      }

      async function postOrganizerJSON(url, body) {
        const r = await organizerFetch(url, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        const text = await r.text();
        let data;
        try { data = JSON.parse(text); } catch { data = text; }

        if (!r.ok) {
          const err = new Error(`${url} -> HTTP ${r.status}: ${text.slice(0, 250)}`);
          err.status = Number(r.status);
          err.url = url;
          err.responseBody = data;
          err.retryAfterMs = organizerRetryAfterMs(r, data);
          throw err;
        }

        if (!data || data.ok !== true) {
          const err = new Error(`${url} -> unexpected response: ${text.slice(0, 250)}`);
          err.status = Number(r.status);
          err.url = url;
          err.responseBody = data;
          throw err;
        }

        return data;
      }

      async function organizerGetJSON(url) {
        const r = await organizerFetch(url, {
          credentials: 'same-origin',
          cache: 'no-store'
        });

        const text = await r.text();
        let data;
        try { data = JSON.parse(text); } catch { data = text; }

        if (!r.ok) {
          const err = new Error(`${url} -> HTTP ${r.status}: ${text.slice(0, 250)}`);
          err.status = Number(r.status);
          err.url = url;
          err.responseBody = data;
          err.retryAfterMs = organizerRetryAfterMs(r, data);
          throw err;
        }

        return data;
      }

      async function organizerWith429Backoff(label, fn, maxRetries = 5) {
        for (let attempt = 0; ; attempt++) {
          try {
            return await fn();
          } catch (err) {
            if (Number(err?.status) !== 429 || attempt >= maxRetries) throw err;

            const serverWait = Number(err?.retryAfterMs);
            const waitMs = Number.isFinite(serverWait) && serverWait >= 0
              ? Math.max(5000, serverWait + 1500)
              : ORGANIZER_429_FALLBACK_MS;

            const seconds = Math.ceil(waitMs / 1000);
            logOrganizer(
              `Worlddex is receiving a lot of requests. Waiting ${seconds}s, then continuing automatically…`,
              'warn'
            );

            await sleep(waitMs);

            // Force the ordinary request-gap clock to start fresh after a long
            // server-requested pause.
            organizerLastRequestAt = 0;
          }
        }
      }

      async function moveOrganizerMon(id, box) {
        return organizerWith429Backoff(
          `Move #${Number(id)} → Box ${Number(box)+1}`,
          async () => {
            try {
              const data = await postOrganizerJSON('/api/box/move', {
                monId: Number(id),
                box: Number(box)
              });

              if (data.box != null && Number(data.box) !== Number(box)) {
                throw new Error(`Move #${id}: server returned box ${data.box}, expected ${box}.`);
              }

              return data;
            } catch (err) {
              const msg = String(err?.message || err);
              if (msg.includes('"error":"box_full"')) {
                const max = Number((msg.match(/"max":(\d+)/) || [])[1] || SERVER_BOX_MOVE_CAPACITY);
                const e = new Error(
                  `Move #${id} -> Box ${Number(box)+1}: backend reports box_full (max ${max}).`
                );
                e.code = 'BOX_FULL';
                e.box = Number(box);
                e.monId = Number(id);
                e.serverMax = max;
                throw e;
              }
              throw err;
            }
          }
        );
      }

      async function renameOrganizerBox(box, name) {
        const data = await organizerWith429Backoff(
          `Rename Box ${Number(box)+1}`,
          () => postOrganizerJSON('/api/pc/box-name', {
            box: Number(box),
            name: String(name || '').slice(0, 16)
          })
        );

        if (window.Game && window.Game.state) {
          if (!window.Game.state.boxNames) window.Game.state.boxNames = {};
          if (data.name) window.Game.state.boxNames[box] = data.name;
          else delete window.Game.state.boxNames[box];
        }
        return data;
      }

      function compareLiveToSnapshot(liveList, plan) {
        const problems = [];
        const plannedIds = new Set(plan.assignments.map(x => Number(x.id)));
        const liveIds = new Set(liveList.map(m => Number(m.id)));

        for (const id of plannedIds) if (!liveIds.has(id)) problems.push(`#${id}: missing from live box`);
        for (const id of liveIds) if (!plannedIds.has(id)) problems.push(`#${id}: new/unplanned Pokémon in live box`);

        const liveMap = new Map(liveList.map(m => [Number(m.id), m]));
        for (const x of plan.assignments) {
          const old = monById.get(Number(x.id));
          const live = liveMap.get(Number(x.id));
          if (!old || !live) continue;
          if (monFingerprint(old) !== monFingerprint(live)) {
            problems.push(`#${x.id} ${x.mon.species}: data changed since analysis`);
          }
        }

        return { problems, liveMap };
      }


      function organizerCountsFromMap(boxMap, boxCount) {
        const counts = new Map();
        for (let b=0; b<boxCount; b++) counts.set(b, 0);
        for (const b of boxMap.values()) {
          const box = Number(b);
          if (!Number.isFinite(box)) continue;
          counts.set(box, (counts.get(box) || 0) + 1);
        }
        return counts;
      }

      function organizerTargetCounts(plan) {
        const counts = new Map();
        for (let b=0; b<plan.boxCount; b++) counts.set(b, 0);
        for (const x of plan.assignments) {
          counts.set(x.targetBox, (counts.get(x.targetBox) || 0) + 1);
        }
        return counts;
      }

      function validateOrganizerOccupancy(liveCurrent, plan) {
        const liveCounts = organizerCountsFromMap(liveCurrent, plan.boxCount);
        const targetCounts = organizerTargetCounts(plan);
        const problems = [];

        for (let b=0; b<plan.boxCount; b++) {
          const target = targetCounts.get(b) || 0;
          if (target > ORGANIZER_SAFE_CAPACITY) {
            problems.push(`Box ${b+1}: target ${target}/${ORGANIZER_SAFE_CAPACITY} safe planner cap`);
          }
        }

        return { liveCounts, targetCounts, problems };
      }

      async function applyOrganizerPlan() {
        if (organizerBusy) return;
        const plan = rebuildOrganizerPlanFromUI();
        if (!plan) return;

        const btn = document.getElementById('wd-organizer-apply');
        let organizerCompletedSuccessfully = false;
        organizerBusy = true;
        if (btn) { btn.disabled = true; btn.textContent = 'VALIDATING…'; }

        try {
          logOrganizer('Checking your current PC before moving anything…', 'info');
          const liveRes = await organizerWith429Backoff(
            'Initial organizer live-box check',
            () => organizerGetJSON('/api/box')
          );
          const liveList = Array.isArray(liveRes.mons) ? liveRes.mons : [];
          const check = compareLiveToSnapshot(liveList, plan);
          if (check.problems.length) {
            console.error('BOX ORGANIZER VALIDATION FAILED', check.problems);
            throw new Error(
              `Your PC changed after this preview was created (${check.problems.length} difference(s)). Press Reload and update the preview.\n` +
              check.problems.slice(0, 8).join('\n')
            );
          }

          const liveCurrent = new Map(liveList.map(m => [Number(m.id), Number(m.box) || 0]));

          // Strict occupancy preflight against the LIVE box state and the final
          // target layout. The organizer is not allowed to target >100 in any box.
          if (plan.capacity > ORGANIZER_SAFE_CAPACITY) {
            throw new Error(
              `The selected box capacity is too high for the safety margin. Use ${ORGANIZER_SAFE_CAPACITY} or lower.`
            );
          }

          const occupancy = validateOrganizerOccupancy(liveCurrent, plan);
          if (occupancy.problems.length) {
            throw new Error(
              `One or more destination boxes would be too full:\n${occupancy.problems.join('\n')}`
            );
          }

          const occupancyRows = [];
          for (let b=0; b<plan.boxCount; b++) {
            const liveN = occupancy.liveCounts.get(b) || 0;
            const targetN = occupancy.targetCounts.get(b) || 0;
            if (liveN || targetN) {
              occupancyRows.push({
                Box:b+1,
                Live:`${liveN}/${SERVER_BOX_MOVE_CAPACITY}`,
                Target:`${targetN}/${ORGANIZER_SAFE_CAPACITY}`,
                FreeNow:Math.max(0, SERVER_BOX_MOVE_CAPACITY-liveN)
              });
            }
          }
          console.table(occupancyRows);
          logOrganizer('Safety check passed: every destination has enough room.', 'ok');

          const actualMoves = plan.assignments.filter(x => liveCurrent.get(x.id) !== x.targetBox);
          if (!actualMoves.length) {
            logOrganizer('Everything is already in the planned boxes. Only names may need updating.', 'ok');
          }

          const phrase = `ORGANIZE ${actualMoves.length}`;
          const renameCount = plan.renameEnabled ? Number(plan.renameChanges || 0) : 0;
          const typed = prompt(
            `This will move ${actualMoves.length} Pokémon between boxes` +
            (renameCount ? ` and rename ${renameCount} box(es)` : '') + `.\n\n` +
            `No Pokémon will be released. The manager checks available space before and during the process and stops if your PC changes unexpectedly.\n\n` +
            `Type exactly:\n\n${phrase}`
          );
          if (typed !== phrase) {
            logOrganizer('Organization cancelled at typed confirmation.', 'warn');
            return;
          }

          if (!confirm(
            `FINAL CONFIRMATION\n\nApply this box organization?\n\n` +
            `${actualMoves.length} Pokémon will be moved one at a time.\n` +
            `If anything changes unexpectedly, the organizer stops.`
          )) {
            logOrganizer('Organization cancelled at final confirmation.', 'warn');
            return;
          }

          const current = new Map(liveCurrent);
          const target = plan.targetById;
          const counts = organizerCountsFromMap(current, plan.boxCount);
          const effectiveCapacity = Math.min(plan.capacity, ORGANIZER_SAFE_CAPACITY);

          const pending = new Set(
            plan.assignments
              .filter(x => current.get(x.id) !== x.targetBox)
              .map(x => x.id)
          );

          const initialPending = pending.size;
          let ops = 0;
          let tempOps = 0;
          const maxOps = Math.max(100, initialPending * 4 + 100);
          const backendFullBoxes = new Set();
          let successfulMovesSinceRefresh = 0;

          async function refreshSchedulerState() {
            const live = await organizerWith429Backoff(
              'Refresh live box state',
              () => organizerGetJSON('/api/box')
            );
            const list = Array.isArray(live.mons) ? live.mons : [];
            current.clear();
            for (const m of list) current.set(Number(m.id), Number(m.box) || 0);

            counts.clear();
            for (let b=0; b<plan.boxCount; b++) counts.set(b, 0);
            for (const b of current.values()) {
              counts.set(b, (counts.get(b) || 0) + 1);
            }

            // Recalculate pending from server truth, not from our local assumptions.
            pending.clear();
            for (const x of plan.assignments) {
              if (current.get(x.id) !== x.targetBox) pending.add(x.id);
            }
            successfulMovesSinceRefresh = 0;
          }

          if (btn) btn.textContent = `MOVING 0/${initialPending}`;
          logOrganizer(`Starting ${initialPending} planned moves at conservative pacing…`, 'warn');

          while (pending.size) {
            if (++ops > maxOps) throw new Error('Move scheduler safety limit reached. Re-run the organizer.');

            // Fast server-truth mode: update local occupancy after each successful
            // move, and re-read /api/box every N moves. A backend inconsistency
            // triggers an immediate refresh.
            if (successfulMovesSinceRefresh >= ORGANIZER_REFRESH_EVERY_MOVES) {
              logOrganizer(
                `Quick safety refresh after ${successfulMovesSinceRefresh} moves…`,
                'info'
              );
              await refreshSchedulerState();
            }
            if (!pending.size) break;

            let id = null;
            let dest = null;
            let temporary = false;

            // Normal move: only move into a box that currently has a free slot.
            for (const pid of pending) {
              const t = target.get(pid);
              if (
                !backendFullBoxes.has(t) &&
                (counts.get(t) || 0) < effectiveCapacity
              ) {
                id = pid;
                dest = t;
                break;
              }
            }

            // Full-box cycle. Use any free slot as a temporary buffer to break it.
            if (id == null) {
              const tempBox = [...Array(plan.boxCount).keys()]
                .find(b =>
                  !backendFullBoxes.has(b) &&
                  (counts.get(b) || 0) < effectiveCapacity
                );
              if (tempBox == null) {
                throw new Error('No free slot exists to break a full-box move cycle. Increase available boxes or lower occupancy first.');
              }
              id = [...pending].find(pid => current.get(pid) !== tempBox);
              if (id == null) throw new Error('Move scheduler deadlock: no Pokémon can use the available temporary slot.');
              dest = tempBox;
              temporary = true;
              tempOps++;
            }

            const from = current.get(id);
            const entry = plan.assignments.find(x => x.id === id);

            const destCount = counts.get(dest) || 0;
            if (destCount >= ORGANIZER_SAFE_CAPACITY) {
              throw new Error(
                `LOCAL SAFE-CAPACITY INTERLOCK blocked #${id} -> Box ${dest+1}: ` +
                `${destCount}/${SERVER_BOX_MOVE_CAPACITY} physically occupied; organizer only allows incoming moves below ${ORGANIZER_SAFE_CAPACITY}. No move was sent.`
              );
            }

            try {
              await moveOrganizerMon(id, dest);
            } catch (err) {
              if (err?.code === 'BOX_FULL') {
                // Do not abort the whole organizer. Treat the backend as authority,
                // quarantine that destination for incoming moves, then let the next
                // scheduler pass move something OUT of it first if possible.
                backendFullBoxes.add(dest);
                logOrganizer(
                  `Box ${dest+1} is currently full. Rechecking the PC and finding another safe step…`,
                  'warn'
                );
                await sleep(250);
                await refreshSchedulerState();
                continue;
              }
              throw err;
            }

            current.set(id, dest);
            counts.set(from, Math.max(0, (counts.get(from) || 0) - 1));
            counts.set(dest, (counts.get(dest) || 0) + 1);

            // A successful outgoing move definitively created backend room there.
            if (from !== dest) backendFullBoxes.delete(from);
            successfulMovesSinceRefresh++;

            if (dest === target.get(id)) pending.delete(id);

            const completed = initialPending - pending.size;
            if (btn) btn.textContent = `MOVING ${completed}/${initialPending}`;
            logOrganizer(
              `${temporary ? 'BUFFER' : 'MOVE'} #${id} ${entry?.mon?.species || ''}: Box ${from + 1} → ${dest + 1}`,
              temporary ? 'warn' : 'info'
            );
            await sleep(100);
          }

          logOrganizer(`Moves complete. Checking the final layout…`, 'info');
          const afterMoveRes = await organizerWith429Backoff(
            'Verify moved boxes',
            () => organizerGetJSON('/api/box')
          );
          const afterMove = Array.isArray(afterMoveRes.mons) ? afterMoveRes.mons : [];
          const afterMap = new Map(afterMove.map(m => [Number(m.id), Number(m.box) || 0]));
          const mismatches = plan.assignments.filter(x => afterMap.get(x.id) !== x.targetBox);
          if (mismatches.length) {
            console.error('BOX ORGANIZER VERIFY MISMATCH', mismatches);
            throw new Error(`${mismatches.length} Pokémon are not in their planned target box after moving.`);
          }

          // IMPORTANT: update the analysis snapshot itself. The old code verified
          // the backend correctly, but kept mons[].box at the pre-organization
          // values. The Organizer UI therefore rebuilt from stale positions and
          // showed the same N moves forever after a successful run.
          for (const m of mons) {
            const liveBox = afterMap.get(Number(m.id));
            if (liveBox != null) m.box = Number(liveBox);
          }

          let renamed = 0;
          const renameErrors = [];
          const boxesToRename = [...plan.boxNames.keys()].sort((a,b)=>a-b);
          if (plan.renameEnabled) {
            if (btn) btn.textContent = 'RENAMING BOXES…';
            for (const b of boxesToRename) {
              const name = plan.boxNames.get(b) || '';
              try { await renameOrganizerBox(b, name); renamed++; logOrganizer(`Box ${b + 1} renamed to ${name}`, 'ok'); }
              catch (err) { renameErrors.push({ box:b, name, error:String(err?.message||err) }); logOrganizer(`Could not rename Box ${b + 1}.`, 'error'); }
              await sleep(100);
            }
          } else logOrganizer('Box renaming is turned off. Existing names were left unchanged.', 'info');

          try {
            if (window.PCSystem?.reload) await window.PCSystem.reload();
          } catch {}

          logOrganizer(
            `Done — ${initialPending} Pokémon moved.` + (plan.renameEnabled ? ` ${renamed} box name(s) updated.` : ' Box names were left unchanged.') + (renameErrors.length ? ` ${renameErrors.length} name(s) could not be changed.` : ''),
            renameErrors.length ? 'warn' : 'ok'
          );

          // Rebuild now, while the verified box positions are already mirrored in
          // mons[].box. This refreshes the plan table/counts and clears the stale
          // "APPLY ORGANIZATION (N moves)" state.
          organizerCompletedSuccessfully = true;
          organizerPlan = rebuildOrganizerPlanFromUI() || organizerPlan;

          const remainingMoves = organizerPlan?.moves?.length || 0;
          if (remainingMoves) {
            logOrganizer(
              `The refreshed preview still shows ${remainingMoves} move(s). Review it before applying again.`,
              'warn'
            );
          } else {
            logOrganizer('Post-run plan refreshed: 0 moves remaining.', 'ok');
          }

          alert(
            `Box organization complete.\n\n` +
            `${initialPending} Pokémon placed in their target boxes.\n` +
            (plan.renameEnabled ? `${renamed} box name(s) updated.\n` : `Box names were left unchanged.\n`) +
            (renameErrors.length ? `\n${renameErrors.length} box name(s) could not be changed.` : '')
          );
        } catch (err) {
          logOrganizer(`STOPPED: ${err?.message || err}`, 'error');
          console.error('BOX ORGANIZER STOP', err);
          alert(
            `Organizer stopped.\n\n${err?.message || err}\n\n` +
            `Organizing never releases Pokémon. If some moves already happened, press Reload and update the preview before trying again.`
          );
        } finally {
          organizerBusy = false;
          updateOrganizerApplyButton(
            organizerPlan,
            organizerCompletedSuccessfully
          );
        }
      }


      function makeFloatingDraggable(panel, handle, storageKey) {
        if (!panel || !handle) return;

        const INTERACTIVE = 'button,input,select,textarea,a,label,[contenteditable="true"]';
        const MARGIN = 6;
        let drag = null;

        handle.style.cursor = 'grab';
        handle.style.touchAction = 'none';

        function clamp(left, top) {
          const rect = panel.getBoundingClientRect();
          const maxLeft = Math.max(MARGIN, window.innerWidth - Math.min(rect.width, window.innerWidth - MARGIN * 2) - MARGIN);
          const maxTop = Math.max(MARGIN, window.innerHeight - Math.min(rect.height, window.innerHeight - MARGIN * 2) - MARGIN);
          return {
            left: Math.min(Math.max(MARGIN, left), maxLeft),
            top: Math.min(Math.max(MARGIN, top), maxTop)
          };
        }

        function applyPosition(left, top, save = false) {
          const p = clamp(left, top);
          panel.style.left = `${Math.round(p.left)}px`;
          panel.style.top = `${Math.round(p.top)}px`;
          panel.style.right = 'auto';
          panel.style.bottom = 'auto';

          if (save) {
            try {
              localStorage.setItem(storageKey, JSON.stringify({
                left: Math.round(p.left),
                top: Math.round(p.top)
              }));
            } catch {}
          }
        }

        // Restore the last position for this panel if it still fits the viewport.
        try {
          const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
          if (saved && Number.isFinite(Number(saved.left)) && Number.isFinite(Number(saved.top))) {
            requestAnimationFrame(() => applyPosition(Number(saved.left), Number(saved.top), false));
          }
        } catch {}

        handle.addEventListener('pointerdown', e => {
          if (e.button !== 0) return;
          if (e.target.closest(INTERACTIVE)) return;

          const rect = panel.getBoundingClientRect();
          drag = {
            pointerId: e.pointerId,
            dx: e.clientX - rect.left,
            dy: e.clientY - rect.top
          };

          // Convert right/bottom positioning to explicit left/top at drag start.
          panel.style.left = `${rect.left}px`;
          panel.style.top = `${rect.top}px`;
          panel.style.right = 'auto';
          panel.style.bottom = 'auto';

          try { handle.setPointerCapture(e.pointerId); } catch {}
          handle.style.cursor = 'grabbing';
          document.documentElement.style.userSelect = 'none';
          e.preventDefault();
        });

        handle.addEventListener('pointermove', e => {
          if (!drag || e.pointerId !== drag.pointerId) return;
          applyPosition(e.clientX - drag.dx, e.clientY - drag.dy, false);
          e.preventDefault();
        });

        const finishDrag = e => {
          if (!drag || (e && e.pointerId != null && e.pointerId !== drag.pointerId)) return;
          const rect = panel.getBoundingClientRect();
          applyPosition(rect.left, rect.top, true);

          try {
            if (e?.pointerId != null) handle.releasePointerCapture(e.pointerId);
          } catch {}

          drag = null;
          handle.style.cursor = 'grab';
          document.documentElement.style.userSelect = '';
        };

        handle.addEventListener('pointerup', finishDrag);
        handle.addEventListener('pointercancel', finishDrag);

        // Double-click empty header space to reset to the default bottom-right.
        handle.addEventListener('dblclick', e => {
          if (e.target.closest(INTERACTIVE)) return;
          try { localStorage.removeItem(storageKey); } catch {}
          panel.style.left = 'auto';
          panel.style.top = 'auto';
          panel.style.right = '16px';
          panel.style.bottom = '16px';
        });

        const keepOnScreen = () => {
          if (panel.style.left === 'auto' || !panel.style.left) return;
          const rect = panel.getBoundingClientRect();
          applyPosition(rect.left, rect.top, false);
        };
        window.addEventListener('resize', keepOnScreen);

        return {
          reset() {
            try { localStorage.removeItem(storageKey); } catch {}
            panel.style.left = 'auto';
            panel.style.top = 'auto';
            panel.style.right = '16px';
            panel.style.bottom = '16px';
          }
        };
      }

      function mountOrganizerPanel() {
        managerPrepareView('organizer');
        const cleaner = document.getElementById('wd-box-cleaner-v13');
        if (cleaner) cleaner.style.display = 'none';

        document.getElementById('wd-box-organizer-v14')?.remove();
        document.getElementById('wd-box-organizer-v14-style')?.remove();

        const initialBoxes = detectBoxCount();
        const initialCap = detectBoxCapacity();

        const style = document.createElement('style');
        style.id = 'wd-box-organizer-v14-style';
        style.textContent = `
          #wd-box-organizer-v14 {
            position:fixed; z-index:2147483647; right:16px; bottom:16px;
            width:min(1180px, calc(100vw - 32px)); height:min(82vh, 860px); max-height:min(82vh, 860px);
            display:flex; flex-direction:column; min-height:380px; overflow:hidden;
            background:#11151d; color:#e8edf5; border:1px solid #344154; border-radius:12px;
            box-shadow:0 18px 60px rgba(0,0,0,.55); font:13px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;
          }
          #wd-box-organizer-v14 * { box-sizing:border-box; }
          #wd-box-organizer-v14.wd-minimized {
            height:auto !important;
            max-height:none !important;
            min-height:0 !important;
          }
          #wd-box-organizer-v14.wd-minimized .wdorg-body {
            display:none !important;
          }
          #wd-box-organizer-v14 .wdorg-head { display:flex; gap:10px; align-items:center; padding:12px 14px; background:#171d27; border-bottom:1px solid #2d3849; cursor:grab; user-select:none; }
          #wd-box-organizer-v14 .wdorg-title { min-width:220px; }
          #wd-box-organizer-v14 .wdorg-title b { display:block; font-size:15px; }
          #wd-box-organizer-v14 .wdorg-title small { color:#9ba9bc; }
          #wd-box-organizer-v14 .wdorg-stats { display:flex; gap:12px; flex-wrap:wrap; color:#b7c2d1; }
          #wd-box-organizer-v14 .wdorg-stats b { color:#fff; }
          #wd-box-organizer-v14 .wdorg-spacer { flex:1; }
          #wd-box-organizer-v14 button,#wd-box-organizer-v14 input { font:inherit; }
          #wd-box-organizer-v14 button { border:1px solid #3b485d; background:#202938; color:#e8edf5; border-radius:7px; padding:7px 10px; cursor:pointer; }
          #wd-box-organizer-v14 button:hover { background:#2a3648; }
          #wd-box-organizer-v14 button:disabled { opacity:.45; cursor:not-allowed; }
          #wd-box-organizer-v14 #wd-organizer-apply { background:#245a3a; border-color:#327d50; font-weight:700; }
          #wd-box-organizer-v14 #wd-organizer-apply:hover { background:#2d7148; }
          #wd-box-organizer-v14 .wdorg-body { display:flex; flex-direction:column; flex:1 1 auto; min-height:0; overflow:hidden; }
          #wd-box-organizer-v14 .wdorg-tools { display:flex; gap:8px; align-items:end; flex-wrap:wrap; padding:9px 12px; background:#121822; border-bottom:1px solid #2d3849; }
          #wd-box-organizer-v14 .wdorg-options { padding:10px 12px; border-bottom:1px solid #2d3849; background:#101620; }
          #wd-box-organizer-v14 .wdorg-options-top { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:8px; }
          #wd-box-organizer-v14 .wdorg-options select { background:#0b1017; border:1px solid #344154; color:#fff; border-radius:7px; padding:6px 8px; }
          #wd-box-organizer-v14 .wdorg-checks { display:flex; gap:10px 16px; flex-wrap:wrap; align-items:center; }
          #wd-box-organizer-v14 .wdorg-checks label { display:flex; gap:6px; align-items:center; color:#c3cfde; }
          #wd-box-organizer-v14 .wdorg-checks .sub { color:#93a3b7; }
          #wd-box-organizer-v14 .wdorg-checks input[type=number] { width:58px; background:#0b1017; border:1px solid #344154; color:#fff; border-radius:6px; padding:4px 6px; }
          #wd-box-organizer-v14 .wdorg-help { margin-top:7px; color:#8fa0b5; font-size:12px; }
          #wd-box-organizer-v14 .wdorg-orderbar {
            margin-top:8px;
            display:flex;
            align-items:center;
            gap:8px;
            flex-wrap:wrap;
          }
          #wd-box-organizer-v14 .wdorg-order-summary {
            color:#91a2b7;
            font-size:12px;
            min-width:0;
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
            flex:1 1 320px;
          }
          #wd-box-organizer-v14 .wdorg-order-editor {
            margin-top:8px;
            width:min(520px,100%);
            padding:8px;
            background:#0d131c;
            border:1px solid #2d3849;
            border-radius:9px;
          }
          #wd-box-organizer-v14 .wdorg-order-editor[hidden] {
            display:none !important;
          }
          #wd-box-organizer-v14 .wdorg-order-list {
            display:flex;
            flex-direction:column;
            gap:5px;
          }
          #wd-box-organizer-v14 .wdorg-order-row {
            display:grid;
            grid-template-columns:30px 22px minmax(150px,1fr) 34px 34px;
            gap:5px;
            align-items:center;
            padding:6px 7px;
            background:#171f2b;
            border:1px solid #344154;
            border-radius:7px;
            color:#dbe5f2;
            cursor:grab;
            user-select:none;
          }
          #wd-box-organizer-v14 .wdorg-order-row.wd-dragging {
            opacity:.45;
          }
          #wd-box-organizer-v14 .wdorg-order-row.wd-drop-before {
            border-top-color:#73a9d2;
            box-shadow:0 -2px 0 #73a9d2;
          }
          #wd-box-organizer-v14 .wdorg-order-row .wdorg-order-num {
            color:#7f90a5;
            font-variant-numeric:tabular-nums;
            text-align:right;
          }
          #wd-box-organizer-v14 .wdorg-order-row .wdorg-drag {
            color:#6f8197;
            font-size:15px;
            text-align:center;
          }
          #wd-box-organizer-v14 .wdorg-order-row b {
            font-size:12px;
            min-width:0;
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
          }
          #wd-box-organizer-v14 .wdorg-order-row button {
            padding:3px 5px;
            min-width:30px;
            line-height:1.1;
            border-radius:5px;
          }
          #wd-box-organizer-v14 .wdorg-order-actions {
            margin-top:7px;
            display:flex;
            justify-content:flex-end;
            gap:6px;
          }
          #wd-box-organizer-v14 .wdorg-explain {
            margin-top:7px;
            color:#92a2b6;
            font-size:12px;
          }
          #wd-box-organizer-v14 .wdorg-explain summary {
            cursor:pointer;
            color:#b9c6d6;
            user-select:none;
          }
          #wd-box-organizer-v14 .wdorg-explain > div {
            margin-top:7px;
            padding:8px 9px;
            border:1px solid #2d3849;
            border-radius:7px;
            background:#0d131c;
            line-height:1.45;
          }
          #wd-box-organizer-v14 .wdorg-preview { display:grid; grid-template-columns:repeat(5,minmax(110px,1fr)); gap:8px; padding:9px 12px; border-bottom:1px solid #2d3849; }
          #wd-box-organizer-v14 .wdorg-card { background:#171f2b; border:1px solid #2d3849; border-radius:8px; padding:8px 10px; }
          #wd-box-organizer-v14 .wdorg-card small { display:block; color:#8fa0b5; }
          #wd-box-organizer-v14 .wdorg-card b { display:block; margin-top:2px; font-size:16px; color:#fff; }

          #wd-box-organizer-v14 .wdorg-field { display:flex; flex-direction:column; gap:3px; color:#9ba9bc; }
          #wd-box-organizer-v14 .wdorg-field input { width:100px; background:#0b1017; border:1px solid #344154; color:#fff; border-radius:7px; padding:7px 9px; }
          #wd-box-organizer-v14 .wdorg-tablewrap { flex:1 1 auto; min-height:0; overflow-x:auto; overflow-y:scroll; scrollbar-gutter:stable; }
          #wd-box-organizer-v14 table { width:100%; border-collapse:collapse; }
          #wd-box-organizer-v14 th { position:sticky; top:0; z-index:2; background:#19212d; color:#aeb9c8; text-align:left; padding:8px; border-bottom:1px solid #344154; white-space:nowrap; }
          #wd-box-organizer-v14 td { padding:8px; border-bottom:1px solid #252f3e; vertical-align:top; }
          #wd-box-organizer-v14 tr:hover td { background:#161e29; }
          #wd-box-organizer-v14 .wdorg-foot { display:grid; grid-template-columns:1fr minmax(300px,40%); flex:0 0 auto; max-height:190px; border-top:1px solid #2d3849; background:#0e141c; }
          #wd-box-organizer-v14 .wdorg-note { padding:10px 12px; color:#aab6c6; }
          #wd-box-organizer-v14 .wdorg-note b { color:#fff; }
          #wd-box-organizer-v14 #wd-organizer-log { border-left:1px solid #2d3849; padding:8px 10px; overflow:auto; font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-size:11px; }
          #wd-box-organizer-v14 .wdorg-logline { margin-bottom:3px; }
          #wd-box-organizer-v14 .wdorg-ok { color:#72df9b; }
          #wd-box-organizer-v14 .wdorg-warn { color:#f1c46c; }
          #wd-box-organizer-v14 .wdorg-error { color:#ff8391; }
          #wd-box-organizer-v14 .wdorg-info { color:#9bc8ff; }
          @media(max-width:760px){
            #wd-box-organizer-v14{right:6px;bottom:6px;width:calc(100vw - 12px);height:90vh;max-height:90vh;}
            #wd-box-organizer-v14 .wdorg-preview{grid-template-columns:repeat(2,minmax(120px,1fr));}
            #wd-box-organizer-v14 .wdorg-head{flex-wrap:wrap;}
            #wd-box-organizer-v14 .wdorg-foot{grid-template-columns:1fr;}
            #wd-box-organizer-v14 #wd-organizer-log{border-left:0;border-top:1px solid #2d3849;}
          }
        `;
        document.head.appendChild(style);

        const panel = document.createElement('div');
        panel.id = 'wd-box-organizer-v14';
        panel.innerHTML = `
          <div class="wdorg-head">
            <div class="wdorg-title">
              <b>Organize Boxes</b>
              <small>Choose how you want your PC arranged, preview the result, then apply it.</small>
            </div>
            <div class="wdorg-stats">
              <span>Pokémon <b id="wd-organizer-total">0</b></span>
              <span>Moves <b id="wd-organizer-moves">0</b></span>
              <span>Boxes <b id="wd-organizer-used">0</b></span>
            </div>
            <div class="wdorg-spacer"></div>
            <button id="wd-organizer-refresh">Reload</button>
            <button id="wd-organizer-specials">Special Pokémon</button>
            <button id="wd-organizer-dex">Pokédex Tasks</button>
            <button id="wd-organizer-decisions">Breeding Projects</button>
            <button id="wd-organizer-back">Clean Up</button>
            <button id="wd-organizer-collapse">Minimize</button>
            <button id="wd-organizer-close">×</button>
          </div>
          <div class="wdorg-body" id="wd-organizer-body">
            <div class="wdorg-tools">
              <label class="wdorg-field">Boxes
                <input id="wd-organizer-boxes" type="number" min="1" max="100" value="${initialBoxes}">
              </label>
              <label class="wdorg-field">Max Pokémon / box
                <input id="wd-organizer-cap" type="number" min="1" max="99" value="${initialCap}">
              </label>
              <label class="wdorg-field">Private breeding-family box from
                <input id="wd-organizer-ownmin" type="number" min="1" max="100" value="12" title="Only used when Breeding Projects are enabled for organization.">
              </label>
              <button id="wd-organizer-rebuild">Update preview</button>
              <button id="wd-organizer-export">Export plan</button>
              <div style="flex:1"></div>
              <button id="wd-organizer-apply">APPLY ORGANIZATION</button>
            </div>
            <div class="wdorg-options">
              <div class="wdorg-options-top">
                <b>Organization style</b>
                <select id="wd-organizer-preset">
                  <option value="minimal">Minimal</option>
                  <option value="recommended">Recommended</option>
                  <option value="functional">Functional</option>
                  <option value="custom">Custom</option>
                </select>
                <b style="margin-left:10px">Layout priority</b>
                <select id="wd-organizer-layout-priority">
                  <option value="balanced">Balanced (recommended)</option>
                  <option value="min_moves">Minimize moves</option>
                  <option value="ordered">Keep boxes ordered</option>
                </select>
              </div>
              <div class="wdorg-checks">
                <label><input id="wd-org-trained" type="checkbox"> Keep trained Pokémon together</label>
                <label class="sub"><input id="wd-org-trained-ev" type="checkbox"> EV-trained</label>
                <label class="sub"><input id="wd-org-trained-level" type="checkbox"> Level <input id="wd-org-level-min" type="number" min="1" max="100" value="80">+</label>
                <label><input id="wd-org-breeders" type="checkbox"> Use Breeding Projects when organizing</label>
                <label><input id="wd-org-sync" type="checkbox"> Keep Synchronize Pokémon together</label>
                <label><input id="wd-org-dex" type="checkbox"> Keep Pokédex tasks together</label>
                <label><input id="wd-org-special" type="checkbox"> Keep Special Pokémon together</label>
                <label><input id="wd-org-favourites" type="checkbox"> Keep favourites where they are</label>
                <label><input id="wd-org-rename" type="checkbox"> Rename boxes automatically</label>
              </div>
              <div class="wdorg-orderbar">
                <button id="wd-organizer-order-toggle">Customize box order</button>
                <span class="wdorg-order-summary" id="wd-organizer-order-summary"></span>
              </div>

              <div class="wdorg-order-editor" id="wd-organizer-order-editor" hidden>
                <div class="wdorg-order-list" id="wd-organizer-category-order"></div>
                <div class="wdorg-order-actions">
                  <button id="wd-organizer-order-reset" title="Restore the default category order">Reset order</button>
                  <button id="wd-organizer-order-done">Done</button>
                </div>
              </div>

              <details class="wdorg-explain">
                <summary>What do these options mean?</summary>
                <div>
                  <b>Organization style:</b> Minimal keeps fewer separate groups; Recommended is the normal default; Functional separates every useful group.<br>
                  <b>Layout priority:</b> all three modes use the section order you choose. Balanced keeps that order while allowing gaps to save moves. Keep boxes ordered follows it as tightly as possible from the earliest boxes. Minimize moves treats it as a preference and may bend it only when doing so avoids extra moves.<br>
                  <b>Customize box order:</b> the editor only shows sections that actually exist in the current preview, so a Minimal setup stays minimal instead of showing unused categories.<br>
                  <b>Breeding Projects:</b> when disabled, breeding families are treated like normal collection Pokémon for organization. Cleaner protection is unchanged.<br>
                  <b>Battle Ready:</b> a Pokémon qualifies through the selected EV or level rules.<br>
                  These settings only change placement. They never make a protected Pokémon eligible for release.
                </div>
              </details>
            </div>
            <div class="wdorg-preview">
              <div class="wdorg-card"><small>Pokémon checked</small><b id="wd-org-preview-total">0</b></div>
              <div class="wdorg-card"><small>Already in place</small><b id="wd-org-preview-stay">0</b></div>
              <div class="wdorg-card"><small>Will be moved</small><b id="wd-org-preview-move">0</b></div>
              <div class="wdorg-card"><small>Boxes used</small><b id="wd-org-preview-boxes">0</b></div>
              <div class="wdorg-card"><small>Boxes to rename</small><b id="wd-org-preview-renames">0</b></div>
            </div>
            <div class="wdorg-tablewrap">
              <table>
                <thead><tr><th>Box</th><th>Box name</th><th>Count</th><th>Purpose</th><th>Pokémon here</th></tr></thead>
                <tbody id="wd-organizer-tbody"></tbody>
              </table>
            </div>
            <div class="wdorg-foot">
              <div class="wdorg-note">
                <b>Safe:</b> Organize Boxes never releases Pokémon. It only moves them and optionally renames boxes.
              </div>
              <div id="wd-organizer-log"></div>
            </div>
          </div>
        `;
        managerAttachView(panel, '.wdorg-head');


        function organizerVisibleSectionOrder(plan=organizerPlan, prefs=organizerPrefsState) {
          const full=normalizeOrganizerSectionOrder(prefs.categoryOrder);
          const active=Array.isArray(plan?.activeSections) && plan.activeSections.length
            ? new Set(plan.activeSections)
            : null;

          if(!active) return full;
          return full.filter(key=>active.has(key));
        }

        function mergeOrganizerVisibleOrder(visibleOrder, prefs=organizerPrefsState, plan=organizerPlan) {
          const full=normalizeOrganizerSectionOrder(prefs.categoryOrder);
          const active=new Set(
            Array.isArray(plan?.activeSections) && plan.activeSections.length
              ? plan.activeSections
              : visibleOrder
          );

          const normalizedVisible=visibleOrder
            .map(String)
            .filter(key=>active.has(key));

          let cursor=0;
          return full.map(key=>{
            if(!active.has(key)) return key;
            return normalizedVisible[cursor++] || key;
          });
        }

        function renderOrganizerPreferences() {
          const p=organizerPrefsState;
          const setChecked=(id,v)=>{const el=document.getElementById(id);if(el)el.checked=!!v;};
          setChecked('wd-org-trained',p.keepTrainedTogether); setChecked('wd-org-trained-ev',p.trainedEv); setChecked('wd-org-trained-level',p.trainedLevel);
          setChecked('wd-org-breeders',p.keepBreedersTogether); setChecked('wd-org-sync',p.keepSynchronizeTogether); setChecked('wd-org-dex',p.keepDexTasksTogether);
          setChecked('wd-org-special',p.keepSpecialsTogether); setChecked('wd-org-favourites',p.keepFavouritesInPlace); setChecked('wd-org-rename',p.renameBoxes);
          const level=document.getElementById('wd-org-level-min'); if(level) level.value=String(p.trainedLevelMin||80);
          ['wd-org-trained-ev','wd-org-trained-level','wd-org-level-min'].forEach(id=>{
            const el=document.getElementById(id);
            if(el) el.disabled=!p.keepTrainedTogether;
          });

          const ownMin=document.getElementById('wd-organizer-ownmin');
          if(ownMin){
            ownMin.disabled=!p.keepBreedersTogether;
            ownMin.title=p.keepBreedersTogether
              ? 'Larger breeding families can receive their own box when there is enough room.'
              : 'Ignored because Breeding Projects are not being used for organization.';
          }

          const preset=document.getElementById('wd-organizer-preset');
          if(preset) preset.value=p.preset||'custom';
          const layout=document.getElementById('wd-organizer-layout-priority');
          if(layout) layout.value=p.layoutPriority||'balanced';

          const order=organizerVisibleSectionOrder(organizerPlan,p);

          const orderSummary=document.getElementById('wd-organizer-order-summary');
          if(orderSummary){
            const labels=order.map(key=>ORGANIZER_SECTION_LABEL[key]||key);
            const shown=labels.slice(0,4).join(' → ');

            orderSummary.textContent=labels.length
              ? (labels.length>4 ? `${shown} → +${labels.length-4} more` : shown)
              : 'No active sections';

            orderSummary.title=p.layoutPriority==='min_moves'
              ? `Preferred section order (Minimize moves may bend it): ${labels.join(' → ')}`
              : `Section order: ${labels.join(' → ')}`;
          }

          const orderWrap=document.getElementById('wd-organizer-category-order');
          if(orderWrap){
            orderWrap.innerHTML=order.length
              ? order.map((key,index)=>{
                  const label=ORGANIZER_SECTION_LABEL[key]||key;
                  return `<div class="wdorg-order-row" draggable="true" data-order-key="${escAttr(key)}">
                    <span class="wdorg-order-num">${index+1}</span>
                    <span class="wdorg-drag" title="Drag to reorder">☰</span>
                    <b>${escHtml(label)}</b>
                    <button data-order-move="-1" ${index===0?'disabled':''} title="Move earlier">↑</button>
                    <button data-order-move="1" ${index===order.length-1?'disabled':''} title="Move later">↓</button>
                  </div>`;
                }).join('')
              : `<div style="color:#8292a7;padding:6px 3px">No active sections in this preview.</div>`;
          }
        }
        function readOrganizerPreferencesFromUI(markCustom=true) {
          const checked=id=>!!document.getElementById(id)?.checked;
          organizerPrefsState=normalizeOrganizerPrefs({...organizerPrefsState,
            keepTrainedTogether:checked('wd-org-trained'), trainedEv:checked('wd-org-trained-ev'), trainedLevel:checked('wd-org-trained-level'),
            trainedLevelMin:Number(document.getElementById('wd-org-level-min')?.value||80), keepBreedersTogether:checked('wd-org-breeders'),
            keepSynchronizeTogether:checked('wd-org-sync'), keepDexTasksTogether:checked('wd-org-dex'), keepSpecialsTogether:checked('wd-org-special'),
            keepFavouritesInPlace:checked('wd-org-favourites'), renameBoxes:checked('wd-org-rename'),
            layoutPriority:String(document.getElementById('wd-organizer-layout-priority')?.value || 'balanced'),
            categoryOrder:organizerPrefsState.categoryOrder,
            preset:markCustom?'custom':organizerPrefsState.preset});
          saveOrganizerPrefs();
          organizerPlan=null;
          rebuildOrganizerPlanFromUI();
          renderOrganizerPreferences();
        }
        renderOrganizerPreferences();

        function applyOrganizerCategoryOrder(nextVisibleOrder, source='manual') {
          const currentVisible=organizerVisibleSectionOrder(
            organizerPlan,
            organizerPrefsState
          );

          const requested=nextVisibleOrder
            .map(String)
            .filter(key=>currentVisible.includes(key));

          const merged=mergeOrganizerVisibleOrder(
            requested,
            organizerPrefsState,
            organizerPlan
          );

          organizerPrefsState=normalizeOrganizerPrefs({
            ...organizerPrefsState,
            categoryOrder:merged,
            // Keep the layout mode selected by the player.
            preset:'custom'
          });

          saveOrganizerPrefs();

          organizerPlan=null;
          const plan=rebuildOrganizerPlanFromUI();
          renderOrganizerPreferences();

          if(plan){
            updateOrganizerApplyButton(plan,false);

            const modeLabel=organizerPrefsState.layoutPriority==='ordered'
              ? 'Keep boxes ordered'
              : organizerPrefsState.layoutPriority==='min_moves'
                ? 'Minimize moves'
                : 'Balanced';

            logOrganizer(
              `Section order updated · ${modeLabel} · ${plan.moves.length} move(s).`,
              'info'
            );
          }

          return plan;
        }

        const bindOrganizer = (id, event, fn) => {
          const el = document.getElementById(id);
          if (!el) {
            console.warn(`[Worlddex Box Manager v1.17.1] Organizer control missing: #${id}`);
            return null;
          }
          el.addEventListener(event, fn);
          return el;
        };

        bindOrganizer('wd-organizer-rebuild', 'click', rebuildOrganizerPlanFromUI);
        bindOrganizer('wd-organizer-ownmin', 'change', rebuildOrganizerPlanFromUI);
        bindOrganizer('wd-organizer-preset', 'change', e => {
          const name=String(e.currentTarget.value||'recommended'); if(name==='custom') return;
          setOrganizerPreset(name);
          organizerPlan=null;
          rebuildOrganizerPlanFromUI();
          renderOrganizerPreferences();
        });
        ['wd-org-trained','wd-org-trained-ev','wd-org-trained-level','wd-org-breeders','wd-org-sync','wd-org-dex','wd-org-special','wd-org-favourites','wd-org-rename'].forEach(id => bindOrganizer(id,'change',()=>readOrganizerPreferencesFromUI(true)));
        bindOrganizer('wd-org-level-min','change',()=>readOrganizerPreferencesFromUI(true));
        bindOrganizer('wd-organizer-layout-priority','change',()=>readOrganizerPreferencesFromUI(true));

        bindOrganizer('wd-organizer-order-toggle','click',()=>{
          const editor=document.getElementById('wd-organizer-order-editor');
          const btn=document.getElementById('wd-organizer-order-toggle');
          if(!editor) return;
          const opening=editor.hidden;
          editor.hidden=!opening;
          if(btn) btn.textContent=opening ? 'Hide box order' : 'Customize box order';
        });

        bindOrganizer('wd-organizer-order-done','click',()=>{
          const editor=document.getElementById('wd-organizer-order-editor');
          const btn=document.getElementById('wd-organizer-order-toggle');
          if(editor) editor.hidden=true;
          if(btn) btn.textContent='Customize box order';
        });

        bindOrganizer('wd-organizer-category-order','click',e=>{
          const btn=e.target.closest('button[data-order-move]');
          if(!btn) return;

          const row=btn.closest('[data-order-key]');
          const key=row?.dataset?.orderKey;
          const delta=Number(btn.dataset.orderMove||0);
          if(!key || !delta) return;

          const order=organizerVisibleSectionOrder(organizerPlan,organizerPrefsState);
          const from=order.indexOf(key);
          const to=from+delta;
          if(from<0 || to<0 || to>=order.length) return;

          [order[from],order[to]]=[order[to],order[from]];
          applyOrganizerCategoryOrder(order,'button');
        });

        {
          const orderEl=document.getElementById('wd-organizer-category-order');
          let draggedKey=null;

          orderEl?.addEventListener('dragstart',e=>{
            const row=e.target.closest('[data-order-key]');
            if(!row) return;
            draggedKey=row.dataset.orderKey;
            row.classList.add('wd-dragging');
            try { e.dataTransfer.effectAllowed='move'; } catch {}
          });

          orderEl?.addEventListener('dragend',()=>{
            orderEl.querySelectorAll('.wd-dragging,.wd-drop-before')
              .forEach(el=>el.classList.remove('wd-dragging','wd-drop-before'));
            draggedKey=null;
          });

          orderEl?.addEventListener('dragover',e=>{
            const row=e.target.closest('[data-order-key]');
            if(!row || !draggedKey || row.dataset.orderKey===draggedKey) return;
            e.preventDefault();
            orderEl.querySelectorAll('.wd-drop-before')
              .forEach(el=>el.classList.remove('wd-drop-before'));
            row.classList.add('wd-drop-before');
            try { e.dataTransfer.dropEffect='move'; } catch {}
          });

          orderEl?.addEventListener('drop',e=>{
            const target=e.target.closest('[data-order-key]');
            if(!target || !draggedKey) return;
            e.preventDefault();

            const order=organizerVisibleSectionOrder(organizerPlan,organizerPrefsState);
            const from=order.indexOf(draggedKey);
            let to=order.indexOf(target.dataset.orderKey);
            if(from<0 || to<0 || from===to) return;

            const [moved]=order.splice(from,1);
            if(from<to) to--;
            order.splice(to,0,moved);

            applyOrganizerCategoryOrder(order,'drag');
          });
        }

        bindOrganizer('wd-organizer-order-reset','click',()=>{
          const active=new Set(
            organizerVisibleSectionOrder(organizerPlan,organizerPrefsState)
          );
          const defaultVisible=ORGANIZER_SECTION_DEFAULT_ORDER
            .filter(key=>active.has(key));

          applyOrganizerCategoryOrder(defaultVisible,'reset');
        });

        bindOrganizer('wd-organizer-refresh', 'click', () => window.__WORLDDEX_BOX_MANAGER_REFRESH?.());
        bindOrganizer('wd-organizer-specials', 'click', mountSpecialPanel);
        bindOrganizer('wd-organizer-dex', 'click', mountDexTaskPanel);
        bindOrganizer('wd-organizer-export', 'click', () => downloadOrganizerPlan(organizerPlan));
        bindOrganizer('wd-organizer-apply', 'click', applyOrganizerPlan);
        bindOrganizer('wd-organizer-decisions', 'click', mountFamilyDecisionPanel);
        bindOrganizer('wd-organizer-back', 'click', mountReviewPanel);
        bindOrganizer('wd-organizer-collapse', 'click', e => {
          const minimized = panel.classList.toggle('wd-minimized');
          e.currentTarget.textContent = minimized ? 'Restore' : 'Minimize';
          e.currentTarget.setAttribute('aria-expanded', String(!minimized));
        });
        bindOrganizer('wd-organizer-close', 'click', managerDestroyShell);

        organizerPlan = null;
        const initialPlan = rebuildOrganizerPlanFromUI();
        updateOrganizerApplyButton(initialPlan, false);
        renderOrganizerPreferences();
        if (initialPlan) {
          logOrganizer(
            `Detected ${initialBoxes} box(es), ${initialCap} slots/box. Clean family-first plan uses ${initialPlan.usedBoxes} box(es) and requires ${initialPlan.moves.length} move(s).`,
            'info'
          );
        }
        return initialPlan;
      }


      function mountReviewPanel() {
        managerPrepareView('cleaner');
        const old = document.getElementById('wd-box-cleaner-v13');
        if (old) old.remove();
        const oldStyle = document.getElementById('wd-box-cleaner-v13-style');
        if (oldStyle) oldStyle.remove();

        const style = document.createElement('style');
        style.id = 'wd-box-cleaner-v13-style';
        style.textContent = `
          #wd-box-cleaner-v13 {
            position: fixed;
            z-index: 2147483647;
            right: 16px;
            bottom: 16px;
            width: min(1120px, calc(100vw - 32px));
            height: min(78vh, 820px);
            max-height: min(78vh, 820px);
            display: flex;
            flex-direction: column;
            min-height: 360px;
            background: #11151d;
            color: #e8edf5;
            border: 1px solid #344154;
            border-radius: 12px;
            box-shadow: 0 18px 60px rgba(0,0,0,.55);
            font: 13px/1.35 system-ui, -apple-system, Segoe UI, sans-serif;
            overflow: hidden;
          }
          #wd-box-cleaner-v13 * { box-sizing: border-box; }
          #wd-box-cleaner-v13.wd-minimized {
            height:auto !important;
            max-height:none !important;
            min-height:0 !important;
          }
          #wd-box-cleaner-v13.wd-minimized #wd-cleaner-body {
            display:none !important;
          }
          #wd-box-cleaner-v13 .wdcl-head {
            padding: 12px 14px;
            display: flex;
            gap: 12px;
            align-items: center;
            background: #171d27;
            border-bottom: 1px solid #2d3849;
          }
          #wd-box-cleaner-v13 .wdcl-title { min-width: 190px; }
          #wd-box-cleaner-v13 .wdcl-title b { display:block; font-size:15px; }
          #wd-box-cleaner-v13 .wdcl-title small { color:#9ba9bc; }
          #wd-box-cleaner-v13 .wdcl-stats {
            display:flex; gap:12px; flex-wrap:wrap; color:#b7c2d1;
          }
          #wd-box-cleaner-v13 .wdcl-stats b { color:#fff; }
          #wd-box-cleaner-v13 .wdcl-spacer { flex:1; }
          #wd-box-cleaner-v13 button,
          #wd-box-cleaner-v13 input {
            font: inherit;
          }
          #wd-box-cleaner-v13 button {
            border:1px solid #3b485d;
            background:#202938;
            color:#e8edf5;
            border-radius:7px;
            padding:7px 10px;
            cursor:pointer;
          }
          #wd-box-cleaner-v13 button:hover { background:#2a3648; }
          #wd-box-cleaner-v13 button:disabled { opacity:.45; cursor:not-allowed; }
          #wd-box-cleaner-v13 #wd-cleaner-release-btn {
            background:#7e2430;
            border-color:#a53a49;
            font-weight:700;
          }
          #wd-box-cleaner-v13 #wd-cleaner-release-btn:hover { background:#96303d; }
          #wd-box-cleaner-v13 #wd-cleaner-body {
            display:flex;
            flex-direction:column;
            flex:1 1 auto;
            min-height:0;
            overflow:hidden;
          }
          #wd-box-cleaner-v13 .wdcl-tools {
            display:flex;
            flex:0 0 auto;
            align-items:center;
            gap:8px;
            padding:9px 12px;
            border-bottom:1px solid #2d3849;
            background:#121822;
          }
          #wd-box-cleaner-v13 .wdcl-tools input[type="search"] {
            min-width:180px;
            flex:1;
            background:#0b1017;
            border:1px solid #344154;
            color:#fff;
            border-radius:7px;
            padding:7px 9px;
          }
          #wd-box-cleaner-v13 .wdcl-preview {display:grid;grid-template-columns:repeat(3,minmax(130px,1fr));gap:8px;padding:9px 12px;border-bottom:1px solid #2d3849;}
          #wd-box-cleaner-v13 .wdcl-card {background:#171f2b;border:1px solid #2d3849;border-radius:8px;padding:8px 10px;}
          #wd-box-cleaner-v13 .wdcl-card small{display:block;color:#8fa0b5} #wd-box-cleaner-v13 .wdcl-card b{display:block;margin-top:2px;font-size:16px;color:#fff}
          #wd-box-cleaner-v13 .wdcl-tablewrap {
            flex:1 1 auto;
            min-height:0;
            overflow-x:auto;
            overflow-y:scroll;
            scrollbar-gutter:stable;
            overscroll-behavior:contain;
          }
          #wd-box-cleaner-v13 table { width:100%; border-collapse:collapse; }
          #wd-box-cleaner-v13 th {
            position:sticky;
            top:0;
            z-index:2;
            background:#19212d;
            color:#aeb9c8;
            text-align:left;
            padding:8px;
            border-bottom:1px solid #344154;
            white-space:nowrap;
          }
          #wd-box-cleaner-v13 td {
            padding:8px;
            border-bottom:1px solid #252f3e;
            vertical-align:top;
          }
          #wd-box-cleaner-v13 tr:hover td { background:#161e29; }
          #wd-box-cleaner-v13 td small,
          #wd-box-cleaner-v13 td span { display:block; }
          #wd-box-cleaner-v13 td small { color:#8e9caf; margin-top:2px; }
          #wd-box-cleaner-v13 .wdcl-check { width:36px; text-align:center; }
          #wd-box-cleaner-v13 .wdcl-sex { display:inline; margin-left:5px; }
          #wd-box-cleaner-v13 .wdcl-ivs span { font-family:ui-monospace, SFMono-Regular, Consolas, monospace; }
          #wd-box-cleaner-v13 .wdcl-state {
            display:inline-block;
            border-radius:999px;
            padding:3px 7px;
            font-size:11px;
            font-weight:700;
          }
          #wd-box-cleaner-v13 .wdcl-state-ready { background:#26354b; color:#c9d9ee; }
          #wd-box-cleaner-v13 .wdcl-state-released { background:#1d5536; color:#bdf5ce; }
          #wd-box-cleaner-v13 .wdcl-state-error { background:#682833; color:#ffd2d8; }
          #wd-box-cleaner-v13 tr.wdcl-released td { opacity:.55; }
          #wd-box-cleaner-v13 .wdcl-foot {
            display:grid;
            flex:0 0 auto;
            grid-template-columns: 1fr minmax(260px, 38%);
            border-top:1px solid #2d3849;
            max-height:170px;
            background:#0e141c;
          }
          #wd-box-cleaner-v13 .wdcl-note {
            padding:10px 12px;
            color:#aab6c6;
          }
          #wd-box-cleaner-v13 .wdcl-note b { color:#fff; }
          #wd-box-cleaner-v13 #wd-cleaner-log {
            border-left:1px solid #2d3849;
            padding:8px 10px;
            overflow:auto;
            font-family:ui-monospace, SFMono-Regular, Consolas, monospace;
            font-size:11px;
          }
          #wd-box-cleaner-v13 .wdcl-logline { margin-bottom:3px; }
          #wd-box-cleaner-v13 .wdcl-ok { color:#72df9b; }
          #wd-box-cleaner-v13 .wdcl-warn { color:#f1c46c; }
          #wd-box-cleaner-v13 .wdcl-error { color:#ff8391; }
          #wd-box-cleaner-v13 .wdcl-info { color:#9bc8ff; }
          @media (max-width: 760px) {
            #wd-box-cleaner-v13 { right:6px; bottom:6px; width:calc(100vw - 12px); height:88vh; max-height:88vh; }
            #wd-box-cleaner-v13 .wdcl-head { flex-wrap:wrap; }
            #wd-box-cleaner-v13 .wdcl-foot { grid-template-columns:1fr; }
            #wd-box-cleaner-v13 #wd-cleaner-log { border-left:0; border-top:1px solid #2d3849; }
          }
        `;
        document.head.appendChild(style);

        const panel = document.createElement('div');
        panel.id = 'wd-box-cleaner-v13';
        panel.innerHTML = `
          <div class="wdcl-head">
            <div class="wdcl-title">
              <b>Clean Up</b>
              <small>Review duplicate Pokémon before removing anything.</small>
            </div>
            <div class="wdcl-stats">
              <span>Candidates <b id="wd-cleaner-candidate-count">${candidates.length}</b></span>
              <span>Selected <b id="wd-cleaner-selected-count">${selectedCount()}</b></span>
              <span>Released <b id="wd-cleaner-released-count">0</b></span>
              <span>Errors <b id="wd-cleaner-error-count">0</b></span>
            </div>
            <div class="wdcl-spacer"></div>
            <button id="wd-cleaner-refresh" title="Check your current PC again and refresh all cleanup rules">Reload</button>
            <button id="wd-cleaner-specials">Special Pokémon</button>
            <button id="wd-cleaner-dex">Pokédex Tasks</button>
            <button id="wd-cleaner-decisions">Breeding Projects</button>
            <button id="wd-cleaner-organizer">Organize Boxes</button>
            <button id="wd-cleaner-collapse">Minimize</button>
            <button id="wd-cleaner-close">×</button>
          </div>
          <div id="wd-cleaner-body">
            <div class="wdcl-tools">
              <input id="wd-cleaner-filter" type="search" placeholder="Search Pokémon, nature or ability…">
              <span>Shown <b id="wd-cleaner-shown-count">${candidates.length}</b></span>
              <span style="color:#8e9caf;white-space:nowrap">↕ scroll list</span>
              <button id="wd-cleaner-select-all">Select shown</button>
              <button id="wd-cleaner-select-none">Clear shown</button>
              <button id="wd-cleaner-export">Export list</button>
              <button id="wd-cleaner-release-btn">RELEASE SELECTED (${selectedCount()})</button>
            </div>
            <div class="wdcl-preview"><div class="wdcl-card"><small>Pokémon checked</small><b id="wd-clean-preview-total">0</b></div><div class="wdcl-card"><small>Safe to keep</small><b id="wd-clean-preview-keep">0</b></div><div class="wdcl-card"><small>Cleanup candidates</small><b id="wd-clean-preview-candidates">0</b></div></div>
            <div class="wdcl-tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>✓</th>
                    <th>ID</th>
                    <th>Pokémon</th>
                    <th>Nature / Ability</th>
                    <th>IVs</th>
                    <th>Why it can be removed</th>
                    <th>State</th>
                  </tr>
                </thead>
                <tbody id="wd-cleaner-tbody"></tbody>
              </table>
            </div>
            <div class="wdcl-foot">
              <div class="wdcl-note"><b>Nothing is removed automatically.</b> The list above is only a preview. You choose which Pokémon to remove and confirm the action before it starts. Protected Pokémon — including nicknamed Pokémon, high-IV Pokémon, favourites, trained Pokémon, breeding needs and Pokédex needs — are kept out of the cleanup list. If your PC changes while this window is open, press <b>Reload</b> before removing anything.</div>
              <div id="wd-cleaner-log"></div>
            </div>
          </div>
        `;
        managerAttachView(panel, '.wdcl-head');

        document.getElementById('wd-cleaner-filter').addEventListener('input', renderCandidateRows);

        document.getElementById('wd-cleaner-select-all').addEventListener('click', () => {
          const q = String(document.getElementById('wd-cleaner-filter')?.value || '').trim();
          for (const r of candidates) {
            if (candidateMatchesFilter(r, q) && !releasedIds.has(Number(r.ID))) {
              selectedIds.add(Number(r.ID));
            }
          }
          renderCandidateRows();
        });

        document.getElementById('wd-cleaner-select-none').addEventListener('click', () => {
          const q = String(document.getElementById('wd-cleaner-filter')?.value || '').trim();
          for (const r of candidates) {
            if (candidateMatchesFilter(r, q)) selectedIds.delete(Number(r.ID));
          }
          renderCandidateRows();
        });

        document.getElementById('wd-cleaner-export').addEventListener('click', () => {
          download(candidates, 'worlddex_cleanup_candidates_v1_15_1.tsv');
        });

        document.getElementById('wd-cleaner-release-btn').addEventListener('click', releaseSelected);

        document.getElementById('wd-cleaner-refresh').addEventListener('click', () => {
          window.__WORLDDEX_BOX_MANAGER_REFRESH?.();
        });
        document.getElementById('wd-cleaner-specials').addEventListener('click', mountSpecialPanel);
        document.getElementById('wd-cleaner-dex').addEventListener('click', mountDexTaskPanel);
        document.getElementById('wd-cleaner-decisions').addEventListener('click', mountFamilyDecisionPanel);
        document.getElementById('wd-cleaner-organizer').addEventListener('click', mountOrganizerPanel);

        document.getElementById('wd-cleaner-collapse').addEventListener('click', e => {
          const minimized = panel.classList.toggle('wd-minimized');
          e.currentTarget.textContent = minimized ? 'Restore' : 'Minimize';
          e.currentTarget.setAttribute('aria-expanded', String(!minimized));
        });

        document.getElementById('wd-cleaner-close').addEventListener('click', managerDestroyShell);

        renderCandidateRows();
        logPanel(`Loaded ${candidates.length} release candidates using current family decisions. Nothing has been released.`, 'info');
      }

      window.__BOX_CLEANER = {
        version: '1.16',
        cfg: CFG,
        get rows() { return rows; },
        get candidates() { return candidates; },
        get keep() { return keep; },
        caught,
        seen,
        exactCore,
        maleEggCore,
        selectedIds,
        releasedIds,
        releaseErrors,
        show,
        showCandidates,
        openPanel: mountReviewPanel,
        refresh: () => window.__WORLDDEX_BOX_MANAGER_REFRESH?.(),
        openFamilyDecisions: mountFamilyDecisionPanel,
        openBreedPlanner: mountBreedPlannerPanel,
        get breedPlans() { return breedPlans; },
        openDexTasks: mountDexTaskPanel,
        get dexTasks() { return dexTaskCore.tasks; },
        auditDexTasks() {
          const out=(dexTaskCore.tasks || []).map(t=>({
            Type:t.Type,
            Missing:`#${t.MissingDex} ${t.Missing}`,
            Parents:t.UseLabel || `#${t.UseID} ${t.Use}`,
            PairStatus:t.PairStatus || '',
            Note:t.Note
          }));
          console.table(out);
          return out;
        },
        get livingDexCore() { return livingDexCore; },
        releaseInterlock,
        assertReleaseInterlock,
        familyRows: () => familyDecisionRows(),
        boxPolicy: BOX_POLICY,
        retentionPolicy: RETENTION,
        familyRetention,
        specialRetention,
        setSpecialRetention,
        get specialDecisions() { return specialDecisions; },
        get retentionCore() { return retentionCore; },
        auditSpecies(name) {
          const q=String(name||'').trim().toLowerCase();
          const list=rows
            .filter(r=>String(r.Pokemon||'').toLowerCase()===q)
            .map(r=>({
              ID:r.ID,
              Pokemon:r.Pokemon,
              Status:r.Status,
              Reason:r.Reason,
              Nature:r.Nature,
              Ability:r.Ability,
              IVpct:r.IVpct,
              Box:r.Box
            }));
          console.table(list);
          return list;
        },
        openSpecials: mountSpecialPanel,
        familyInfos,
        familyDecisions,
        rebuildAnalysis,
        releaseSelected,
        openOrganizer: mountOrganizerPanel,
        openView(view) {
          const key = String(view || '').trim().toLowerCase();
          const aliases = {
            cleaner:'cleaner',
            specials:'specials',
            special:'specials',
            dex:'dex',
            'dex tasks':'dex',
            planner:'planner',
            'breed planner':'planner',
            breeding:'breeding',
            projects:'breeding',
            breed:'planner',
            organizer:'organizer'
          };
          const target = aliases[key];
          if (!target || !MANAGER_VIEW_META[target]) {
            throw new Error(`Unknown manager view: ${view}`);
          }
          MANAGER_VIEW_META[target].mount();
        },
        buildOrganizerPlan,
        stableAssignOrganizerBoxes,
        get organizerPreferences() { return organizerPrefs(); },
        setOrganizerPreset,
        setOrganizerPreferences(next={}) {
          organizerPrefsState=normalizeOrganizerPrefs({...organizerPrefsState,...next,preset:'custom'}); saveOrganizerPrefs(); organizerPlan=null; return organizerPrefs();
        },
        download: () => download(rows, 'worlddex_box_manager_v1_15_1_analysis.tsv'),
        downloadCandidates: () => download(candidates, 'worlddex_cleanup_candidates_v1_15_1.tsv'),
        descendants,
        rootsOf,
        groupsOf,
        directEvos,
        monDirectEvos
      };

      window.__BOX_ORGANIZER = {
        version: '1.12',
        detectBoxCount,
        detectBoxCapacity,
        SERVER_BOX_MOVE_CAPACITY,
        ORGANIZER_SAFE_CAPACITY,
        ORGANIZER_REQUEST_GAP_MS,
        ORGANIZER_429_FALLBACK_MS,
        ORGANIZER_REFRESH_EVERY_MOVES,
        validateOrganizerOccupancy,
        buildPlan: buildOrganizerPlan,
        openPanel: mountOrganizerPanel,
        apply: applyOrganizerPlan,
        downloadPlan: () => downloadOrganizerPlan(organizerPlan),
        get plan() { return organizerPlan; }
      };

      const startupView = managerActiveView();
      (MANAGER_VIEW_META[startupView]?.mount || mountReviewPanel)();

      console.log('%cANALYSIS COMPLETED — NOTHING RELEASED AUTOMATICALLY.', 'font-weight:bold;color:#50fa7b');
      console.log('Panel opened with candidates selected by default.');
      console.log('Commands:');
      console.log('__BOX_CLEANER.show("Charmander")');
      console.log('__BOX_CLEANER.showCandidates("Charmander")');
      console.log('__BOX_CLEANER.openPanel()');
      console.log('__BOX_CLEANER.openFamilyDecisions()');
      console.log('__BOX_CLEANER.openDexTasks()');
      console.log('__BOX_CLEANER.auditDexTasks()');
      console.log('__BOX_CLEANER.openSpecials()');
      console.log('__BOX_CLEANER.auditSpecies("Abra")');
      console.log('__BOX_CLEANER.openOrganizer()');
      console.log('__BOX_CLEANER.openView("specials")');
      console.log('__BOX_ORGANIZER.buildPlan()');
      console.log('__BOX_CLEANER.download()');
  }

  window.__WORLDDEX_BOX_MANAGER_REFRESH = async function () {
    if (__wdManagerRefreshing) return false;
    __wdManagerRefreshing = true;

    __wdManagerCleanupUI();
    const loading = __wdManagerLoading();

    try {
      await __wdManagerRun();
      return true;
    } catch (err) {
      console.error('[Worlddex Box Manager v1.17.1] reload failed', err);
      alert('Worlddex Box Manager reload failed. Check the console; no release was started.');
      throw err;
    } finally {
      loading?.remove();
      __wdManagerRefreshing = false;
    }
  };

  window.__WORLDDEX_BOX_MANAGER_REFRESH().catch(() => {});
})();
