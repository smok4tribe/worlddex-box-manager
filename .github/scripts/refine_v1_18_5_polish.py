from pathlib import Path

p = Path('box-manager.js')
s = p.read_text(encoding='utf-8')

def rep(old, new, count=1, label=None):
    global s
    found = s.count(old)
    if found != count:
        raise SystemExit(f"{label or old[:80]!r}: expected {count} match(es), found {found}")
    s = s.replace(old, new, count)

# ------------------------------------------------------------------
# Version bump
# ------------------------------------------------------------------
s = s.replace('v1.18.4', 'v1.18.5')

# ------------------------------------------------------------------
# Standalone launcher: draggable, thresholded click, persisted position.
# ------------------------------------------------------------------
rep(
"""  const __WD_MANAGER_LAUNCHER_ID = 'wd-manager-launcher';
  const __WD_MANAGER_LAUNCHER_STYLE_ID = 'wd-manager-launcher-style';
""",
"""  const __WD_MANAGER_LAUNCHER_ID = 'wd-manager-launcher';
  const __WD_MANAGER_LAUNCHER_STYLE_ID = 'wd-manager-launcher-style';
  const __WD_MANAGER_LAUNCHER_POSITION_KEY = 'worlddex.boxManager.v1.18.launcherPosition';
""",
label='launcher constants')

rep(
"""    launcher = document.createElement('button');
    launcher.id = __WD_MANAGER_LAUNCHER_ID;
    launcher.type = 'button';
    launcher.textContent = 'Box Manager';
    launcher.title = 'Open Worlddex Box Manager';
    launcher.addEventListener('click', () => window.__WORLDDEX_BOX_MANAGER_OPEN?.());
    document.body.appendChild(launcher);
    return launcher;
""",
"""    launcher = document.createElement('button');
    launcher.id = __WD_MANAGER_LAUNCHER_ID;
    launcher.type = 'button';
    launcher.textContent = 'Box Manager';
    launcher.title = 'Drag to move · click to open Worlddex Box Manager';
    launcher.style.touchAction = 'none';
    document.body.appendChild(launcher);

    const MARGIN = 6;
    const DRAG_THRESHOLD = 5;
    let drag = null;
    let suppressClick = false;

    const clampLauncher = (left, top) => {
      const rect = launcher.getBoundingClientRect();
      const maxLeft = Math.max(MARGIN, window.innerWidth - rect.width - MARGIN);
      const maxTop = Math.max(MARGIN, window.innerHeight - rect.height - MARGIN);
      return {
        left: Math.min(Math.max(MARGIN, Number(left) || MARGIN), maxLeft),
        top: Math.min(Math.max(MARGIN, Number(top) || MARGIN), maxTop)
      };
    };

    const applyLauncherPosition = (left, top, save = false) => {
      const pos = clampLauncher(left, top);
      launcher.style.left = `${Math.round(pos.left)}px`;
      launcher.style.top = `${Math.round(pos.top)}px`;
      launcher.style.right = 'auto';
      if (save) {
        try {
          localStorage.setItem(__WD_MANAGER_LAUNCHER_POSITION_KEY, JSON.stringify({
            left: Math.round(pos.left),
            top: Math.round(pos.top)
          }));
        } catch {}
      }
    };

    try {
      const saved = JSON.parse(localStorage.getItem(__WD_MANAGER_LAUNCHER_POSITION_KEY) || 'null');
      if (saved && Number.isFinite(Number(saved.left)) && Number.isFinite(Number(saved.top))) {
        requestAnimationFrame(() => applyLauncherPosition(Number(saved.left), Number(saved.top), false));
      }
    } catch {}

    launcher.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const rect = launcher.getBoundingClientRect();
      drag = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        dx: e.clientX - rect.left,
        dy: e.clientY - rect.top,
        moved: false
      };
      try { launcher.setPointerCapture(e.pointerId); } catch {}
    });

    launcher.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const distance = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
      if (!drag.moved && distance < DRAG_THRESHOLD) return;
      drag.moved = true;
      launcher.style.cursor = 'grabbing';
      applyLauncherPosition(e.clientX - drag.dx, e.clientY - drag.dy, false);
      e.preventDefault();
    });

    const finishLauncherDrag = e => {
      if (!drag || (e?.pointerId != null && e.pointerId !== drag.pointerId)) return;
      if (drag.moved) {
        const rect = launcher.getBoundingClientRect();
        applyLauncherPosition(rect.left, rect.top, true);
        suppressClick = true;
      }
      try {
        if (e?.pointerId != null) launcher.releasePointerCapture(e.pointerId);
      } catch {}
      drag = null;
      launcher.style.cursor = 'pointer';
    };

    launcher.addEventListener('pointerup', finishLauncherDrag);
    launcher.addEventListener('pointercancel', finishLauncherDrag);
    launcher.addEventListener('click', e => {
      if (suppressClick) {
        suppressClick = false;
        e.preventDefault();
        return;
      }
      window.__WORLDDEX_BOX_MANAGER_OPEN?.();
    });

    window.addEventListener('resize', () => {
      if (!launcher.isConnected || launcher.style.right !== 'auto') return;
      const rect = launcher.getBoundingClientRect();
      applyLauncherPosition(rect.left, rect.top, true);
    });

    return launcher;
""",
label='launcher behavior')

# ------------------------------------------------------------------
# Cleaner / Organizer logs: bounded DOM + fixed 4-line viewport.
# ------------------------------------------------------------------
rep(
"""        line.className = `wdcl-logline wdcl-${kind}`;
        line.textContent = `[${t}] ${msg}`;
        el.prepend(line);
""",
"""        line.className = `wdcl-logline wdcl-${kind}`;
        line.textContent = `[${t}] ${msg}`;
        el.prepend(line);
        while (el.children.length > 160) el.lastElementChild?.remove();
""",
label='cleaner log cap')

rep(
"""        line.className = `wdorg-logline wdorg-${kind}`;
        line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        el.prepend(line);
""",
"""        line.className = `wdorg-logline wdorg-${kind}`;
        line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        el.prepend(line);
        while (el.children.length > 160) el.lastElementChild?.remove();
""",
label='organizer log cap')

rep(
"""          #wd-box-cleaner-v13 #wd-cleaner-log {
            border-left:1px solid #2d3849;
            padding:8px 10px;
            overflow:auto;
            font-family:ui-monospace, SFMono-Regular, Consolas, monospace;
            font-size:11px;
          }
""",
"""          #wd-box-cleaner-v13 #wd-cleaner-log {
            border-left:1px solid #2d3849;
            padding:8px 10px;
            height:76px;
            min-height:76px;
            max-height:76px;
            align-self:end;
            overflow-y:auto;
            overflow-x:hidden;
            overscroll-behavior:contain;
            font-family:ui-monospace, SFMono-Regular, Consolas, monospace;
            font-size:11px;
          }
""",
label='cleaner log css')

rep(
"""          #wd-box-organizer-v14 #wd-organizer-log { border-left:1px solid #2d3849; padding:8px 10px; overflow:auto; font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-size:11px; }
""",
"""          #wd-box-organizer-v14 #wd-organizer-log { border-left:1px solid #2d3849; padding:8px 10px; height:76px; min-height:76px; max-height:76px; align-self:end; overflow-y:auto; overflow-x:hidden; overscroll-behavior:contain; font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-size:11px; }
""",
label='organizer log css')

# ------------------------------------------------------------------
# Organizer defaults / persistence / direction.
# ------------------------------------------------------------------
# Keep the existing prefs key so real user choices survive this upgrade.
# New users get the v1.18.5 factory defaults below.
for block_label in ['minimal', 'recommended', 'functional']:
    pass

# Recommended factory threshold becomes 100; existing explicitly saved values stay saved.
old_recommended = """        recommended: {
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
"""
new_recommended = """        recommended: {
          keepTrainedTogether:true,
          trainedEv:true,
          trainedLevel:true,
          trainedLevelMin:100,
          keepBreedersTogether:true,
          keepSynchronizeTogether:false,
          keepDexTasksTogether:true,
          keepSpecialsTogether:true,
          renameBoxes:true,
          keepFavouritesInPlace:false,
          layoutPriority:'balanced',
          boxDirection:'descending',
          categoryOrder:[...ORGANIZER_SECTION_DEFAULT_ORDER]
        },
"""
rep(old_recommended, new_recommended, label='recommended organizer defaults')

# Direction defaults for the other presets too.
rep(
"""          keepFavouritesInPlace:true,
          layoutPriority:'balanced',
          categoryOrder:[...ORGANIZER_SECTION_DEFAULT_ORDER]
        },
        recommended:""",
"""          keepFavouritesInPlace:true,
          layoutPriority:'balanced',
          boxDirection:'descending',
          categoryOrder:[...ORGANIZER_SECTION_DEFAULT_ORDER]
        },
        recommended:""",
label='minimal box direction')

rep(
"""          keepFavouritesInPlace:false,
          layoutPriority:'balanced',
          categoryOrder:[...ORGANIZER_SECTION_DEFAULT_ORDER]
        }
      };
""",
"""          keepFavouritesInPlace:false,
          layoutPriority:'balanced',
          boxDirection:'descending',
          categoryOrder:[...ORGANIZER_SECTION_DEFAULT_ORDER]
        }
      };
""",
label='functional box direction')

rep(
"""          trainedLevelMin: Math.max(1, Math.min(100, Number(raw.trainedLevelMin ?? base.trainedLevelMin) || 80)),
""",
"""          trainedLevelMin: Math.max(1, Math.min(100, Number(raw.trainedLevelMin ?? base.trainedLevelMin) || 100)),
""",
label='organizer threshold normalize')

rep(
"""          layoutPriority: ['balanced','min_moves','ordered'].includes(raw.layoutPriority)
            ? raw.layoutPriority
            : (base.layoutPriority || 'balanced'),
          categoryOrder: normalizeOrganizerSectionOrder(
""",
"""          layoutPriority: ['balanced','min_moves','ordered'].includes(raw.layoutPriority)
            ? raw.layoutPriority
            : (base.layoutPriority || 'balanced'),
          boxDirection: ['descending','ascending'].includes(raw.boxDirection)
            ? raw.boxDirection
            : (base.boxDirection || 'descending'),
          boxCount: Math.max(1, Math.min(100, Number(raw.boxCount ?? 32) || 32)),
          capacity: Math.max(1, Math.min(ORGANIZER_SAFE_CAPACITY, Number(raw.capacity ?? ORGANIZER_SAFE_CAPACITY) || ORGANIZER_SAFE_CAPACITY)),
          autoOwnMin: Math.max(1, Math.min(100, Number(raw.autoOwnMin ?? 12) || 12)),
          categoryOrder: normalizeOrganizerSectionOrder(
""",
label='organizer normalize extra fields')

# ORGANIZER_SAFE_CAPACITY is declared after normalizeOrganizerPrefs in the old source,
# so the normalizer cannot reference it during initial load. Replace with literal 99.
s = s.replace("Math.min(ORGANIZER_SAFE_CAPACITY, Number(raw.capacity ?? ORGANIZER_SAFE_CAPACITY) || ORGANIZER_SAFE_CAPACITY)", "Math.min(99, Number(raw.capacity ?? 99) || 99)", 1)

rep(
"""        organizerPrefsState = normalizeOrganizerPrefs({
          ...preset,
          categoryOrder:organizerPrefsState.categoryOrder,
          preset:name
        });
""",
"""        organizerPrefsState = normalizeOrganizerPrefs({
          ...preset,
          boxCount:organizerPrefsState.boxCount,
          capacity:organizerPrefsState.capacity,
          autoOwnMin:organizerPrefsState.autoOwnMin,
          categoryOrder:organizerPrefsState.categoryOrder,
          preset:name
        });
""",
label='preset preserves sizing prefs')

rep(
"""        const levelReady = prefs.trainedLevel && Number(m?.lvl || 0) >= Number(prefs.trainedLevelMin || 80);
""",
"""        const levelReady = prefs.trainedLevel && Number(m?.lvl || 0) >= Number(prefs.trainedLevelMin || 100);
""",
label='trained fallback')

rep(
"""          if (Number(m.lvl||0) >= Number(organizerPrefsState.trainedLevelMin||80)) parts.push(`Lv.${Number(m.lvl||0)}`);
""",
"""          if (Number(m.lvl||0) >= Number(organizerPrefsState.trainedLevelMin||100)) parts.push(`Lv.${Number(m.lvl||0)}`);
""",
label='trained details fallback')

# stableAssignOrganizerBoxes signature / direction logic.
rep(
"""        pinnedCounts = new Map(),
        layoutPriority = 'balanced'
      ) {
""",
"""        pinnedCounts = new Map(),
        layoutPriority = 'balanced',
        boxDirection = 'descending'
      ) {
""",
label='stable assign signature')

rep(
"""        const mode = ['balanced','min_moves','ordered'].includes(layoutPriority)
          ? layoutPriority
          : 'balanced';

        const weights = mode === 'min_moves'
""",
"""        const mode = ['balanced','min_moves','ordered'].includes(layoutPriority)
          ? layoutPriority
          : 'balanced';
        const direction = boxDirection === 'ascending' ? 'ascending' : 'descending';

        const weights = mode === 'min_moves'
""",
label='stable direction normalize')

rep(
"""            // Canonical physical placement is descending: logical group 0 ->
            // the highest PC box, then work backwards. In Balanced / Ordered this
            // is intentionally strong enough to keep the organized block at the
            // high end instead of sacrificing the buffer just to save a few moves.
            const canonicalBox = boxCount - 1 - defIndex;
""",
"""            // Canonical placement follows the player's selected physical
            // direction. Descending remains the recommended default because it
            // leaves low-numbered boxes as the natural Worlddex intake buffer.
            const canonicalBox = direction === 'ascending'
              ? defIndex
              : boxCount - 1 - defIndex;
""",
label='canonical direction')

rep(
"""        } else {
          // Balanced and Ordered both respect the user's Category order while
          // traversing physical boxes in reverse. This keeps the organized block
          // at the end of the PC (Box 32, 31, 30...) and leaves early boxes as the
          // natural landing zone for new captures.
          targets=maxScoreDescendingAssignment(scores);
        }
""",
"""        } else {
          // Balanced and Ordered respect the user's Category order. Physical
          // traversal follows the separate Box direction preference.
          targets = direction === 'ascending'
            ? maxScoreIncreasingAssignment(scores)
            : maxScoreDescendingAssignment(scores);
        }
""",
label='ordered direction assignment')

rep(
"""          prefs.layoutPriority
        );
""",
"""          prefs.layoutPriority,
          prefs.boxDirection
        );
""",
label='pass direction to stable assignment')

rep(
"""          layoutPriority:prefs.layoutPriority,
          physicalDirection:prefs.layoutPriority === 'min_moves' ? 'move-optimized' : 'descending-high-boxes-first',
""",
"""          layoutPriority:prefs.layoutPriority,
          boxDirection:prefs.boxDirection,
          physicalDirection:prefs.layoutPriority === 'min_moves'
            ? 'move-optimized'
            : (prefs.boxDirection === 'ascending' ? 'ascending-low-boxes-first' : 'descending-high-boxes-first'),
""",
label='plan direction metadata')

# Mount fields from saved prefs instead of factory values every time.
rep(
"""        const initialBoxes = detectBoxCount();
        const initialCap = detectBoxCapacity();
""",
"""        const initialBoxes = Number(organizerPrefsState.boxCount || detectBoxCount());
        const initialCap = Math.min(ORGANIZER_SAFE_CAPACITY, Number(organizerPrefsState.capacity || detectBoxCapacity()));
        const initialOwnMin = Number(organizerPrefsState.autoOwnMin || 12);
""",
label='organizer saved sizing mount')

rep(
"""                <input id=\"wd-organizer-ownmin\" type=\"number\" min=\"1\" max=\"100\" value=\"12\" title=\"Only used when Breeding Projects are enabled for organization.\">
""",
"""                <input id=\"wd-organizer-ownmin\" type=\"number\" min=\"1\" max=\"100\" value=\"${initialOwnMin}\" title=\"Only used when Breeding Projects are enabled for organization.\">
""",
label='organizer own min initial')

# Direction-neutral layout labels + compact direction select.
rep(
"""                <b style=\"margin-left:10px\">Layout priority</b>
                <select id=\"wd-organizer-layout-priority\">
                  <option value=\"balanced\">Balanced (recommended · Box 32 → 1)</option>
                  <option value=\"min_moves\">Minimize moves</option>
                  <option value=\"ordered\">Keep boxes ordered (32 → 1)</option>
                </select>
""",
"""                <b style=\"margin-left:10px\">Layout priority</b>
                <select id=\"wd-organizer-layout-priority\">
                  <option value=\"balanced\">Balanced (recommended)</option>
                  <option value=\"min_moves\">Minimize moves</option>
                  <option value=\"ordered\">Keep boxes ordered</option>
                </select>
                <b>Box direction</b>
                <select id=\"wd-organizer-box-direction\" title=\"32 → 1 is recommended because Worlddex fills the first available PC space.\">
                  <option value=\"descending\">32 → 1 (recommended)</option>
                  <option value=\"ascending\">1 → 32</option>
                </select>
""",
label='organizer direction UI')

rep(
"""                <label class=\"sub\"><input id=\"wd-org-trained-level\" type=\"checkbox\"> Level <input id=\"wd-org-level-min\" type=\"number\" min=\"1\" max=\"100\" value=\"80\">+</label>
""",
"""                <label class=\"sub\"><input id=\"wd-org-trained-level\" type=\"checkbox\"> Level <input id=\"wd-org-level-min\" type=\"number\" min=\"1\" max=\"100\" value=\"100\">+</label>
""",
label='organizer level field default')

rep(
"""                  <b>Organization style:</b> Minimal keeps fewer separate groups; Recommended is the normal default; Functional separates every useful group.<br>
                  <b>Layout priority:</b> Balanced and Keep boxes ordered fill the PC from Box 32 downward, leaving the earliest boxes free for new captures. Balanced may leave a small gap when it meaningfully saves moves; Keep boxes ordered follows the selected section order as tightly as possible. Minimize moves prioritizes keeping Pokémon where they already are and may ignore the high-box-first layout.<br>
""",
"""                  <b>Organization style:</b> Minimal keeps fewer separate groups; Recommended is the normal default; Functional separates every useful group.<br>
                  <b>Layout priority:</b> Balanced may leave a small gap when it meaningfully saves moves; Keep boxes ordered follows the selected section order as tightly as possible; Minimize moves prioritizes keeping Pokémon where they already are.<br>
                  <b>Box direction:</b> 32 → 1 is recommended because it leaves the earliest boxes free for new captures / received Pokémon. 1 → 32 is available if you prefer the traditional low-box-first layout. Minimize moves may ignore this preference when fewer moves conflict with physical direction.<br>
""",
label='organizer direction help')

# render organizer preference direction + disable in min_moves.
rep(
"""          const level=document.getElementById('wd-org-level-min'); if(level) level.value=String(p.trainedLevelMin||80);
""",
"""          const level=document.getElementById('wd-org-level-min'); if(level) level.value=String(p.trainedLevelMin||100);
""",
label='render level default')

rep(
"""          const layout=document.getElementById('wd-organizer-layout-priority');
          if(layout) layout.value=p.layoutPriority||'balanced';

          const order=organizerVisibleSectionOrder(organizerPlan,p);
""",
"""          const layout=document.getElementById('wd-organizer-layout-priority');
          if(layout) layout.value=p.layoutPriority||'balanced';
          const direction=document.getElementById('wd-organizer-box-direction');
          if(direction){
            direction.value=p.boxDirection||'descending';
            direction.disabled=(p.layoutPriority==='min_moves');
            direction.title=p.layoutPriority==='min_moves'
              ? 'Minimize moves can ignore physical direction to preserve more Pokémon in place.'
              : '32 → 1 is recommended because Worlddex fills the first available PC space.';
          }

          const order=organizerVisibleSectionOrder(organizerPlan,p);
""",
label='render direction preference')

rep(
"""            trainedLevelMin:Number(document.getElementById('wd-org-level-min')?.value||80), keepBreedersTogether:checked('wd-org-breeders'),
""",
"""            trainedLevelMin:Number(document.getElementById('wd-org-level-min')?.value||100), keepBreedersTogether:checked('wd-org-breeders'),
""",
label='read threshold default')

rep(
"""            layoutPriority:String(document.getElementById('wd-organizer-layout-priority')?.value || 'balanced'),
            categoryOrder:organizerPrefsState.categoryOrder,
""",
"""            layoutPriority:String(document.getElementById('wd-organizer-layout-priority')?.value || 'balanced'),
            boxDirection:String(document.getElementById('wd-organizer-box-direction')?.value || organizerPrefsState.boxDirection || 'descending'),
            categoryOrder:organizerPrefsState.categoryOrder,
""",
label='read direction pref')

rep(
"""        bindOrganizer('wd-org-level-min','change',()=>readOrganizerPreferencesFromUI(true));
        bindOrganizer('wd-organizer-layout-priority','change',()=>readOrganizerPreferencesFromUI(true));
""",
"""        bindOrganizer('wd-org-level-min','change',()=>readOrganizerPreferencesFromUI(true));
        bindOrganizer('wd-organizer-layout-priority','change',()=>readOrganizerPreferencesFromUI(true));
        bindOrganizer('wd-organizer-box-direction','change',()=>readOrganizerPreferencesFromUI(true));
""",
label='bind direction control')

# Persist size/capacity/own threshold whenever preview is rebuilt.
rep(
"""        const autoOwnMin = Number(document.getElementById('wd-organizer-ownmin')?.value || 12);
        try {
""",
"""        const autoOwnMin = Math.max(1, Math.min(100, Number(document.getElementById('wd-organizer-ownmin')?.value || 12) || 12));
        organizerPrefsState = normalizeOrganizerPrefs({
          ...organizerPrefsState,
          boxCount,
          capacity,
          autoOwnMin
        });
        saveOrganizerPrefs();
        try {
""",
label='persist organizer sizing')

# Log selected direction instead of hardcoded 32 -> 1.
rep(
"""          logOrganizer(
            `Preview updated: ${organizerPlan.moves.length} move(s), ` +
            `${organizerPlan.alreadyPlaced} already in place · ${layoutLabel}` +
            `${organizerPlan.layoutPriority === 'min_moves' ? '' : ' · Box 32 → 1'}.`,
            'ok'
          );
""",
"""          const directionLabel = organizerPlan.boxDirection === 'ascending'
            ? 'Box 1 → 32'
            : 'Box 32 → 1';
          logOrganizer(
            `Preview updated: ${organizerPlan.moves.length} move(s), ` +
            `${organizerPlan.alreadyPlaced} already in place · ${layoutLabel}` +
            `${organizerPlan.layoutPriority === 'min_moves' ? '' : ` · ${directionLabel}`}.`,
            'ok'
          );
""",
label='direction-aware preview log')

# ------------------------------------------------------------------
# Breed Planner last-intent persistence + explicit green recalc.
# ------------------------------------------------------------------
rep(
"""      let breedPlannerLastResults = [];
      let breedPlannerLastDesired = null;
      let breedPlannerLastTarget = null;

      function breedPlannerReadForm() {
""",
"""      const BREED_PLANNER_FORM_KEY = 'worlddex.boxManager.v1.18.breedPlannerForm';
      let breedPlannerLastResults = [];
      let breedPlannerLastDesired = null;
      let breedPlannerLastTarget = null;

      function loadBreedPlannerFormState() {
        try {
          const raw = JSON.parse(localStorage.getItem(BREED_PLANNER_FORM_KEY) || 'null');
          if (!raw || typeof raw !== 'object') return null;
          return {
            targetName:String(raw.targetName || ''),
            nature:BREED_NATURES.includes(raw.nature) ? raw.nature : 'Any',
            ability:String(raw.ability || 'Any') || 'Any',
            requiredStats:Array.isArray(raw.requiredStats)
              ? raw.requiredStats.filter(stat => STATS.includes(stat))
              : [],
            sameSpeciesOnly:!!raw.sameSpeciesOnly
          };
        } catch { return null; }
      }

      function saveBreedPlannerFormState() {
        const targetName=String(document.getElementById('wd-breed-target')?.value || '').trim();
        const nature=String(document.getElementById('wd-breed-nature')?.value || 'Any');
        const ability=String(document.getElementById('wd-breed-ability')?.value || 'Any').trim() || 'Any';
        const requiredStats=STATS.filter(stat => document.querySelector(`[data-breed-iv=\"${stat}\"]`)?.checked);
        const sameSpeciesOnly=!!document.getElementById('wd-breed-same-only')?.checked;
        try {
          localStorage.setItem(BREED_PLANNER_FORM_KEY, JSON.stringify({
            targetName,nature,ability,requiredStats,sameSpeciesOnly
          }));
        } catch {}
      }

      function breedPlannerPrefillFromState(state) {
        if(!state) return false;
        const target=document.getElementById('wd-breed-target');
        const nature=document.getElementById('wd-breed-nature');
        const ability=document.getElementById('wd-breed-ability');
        if(target) target.value=state.targetName || '';
        if(nature) nature.value=state.nature || 'Any';
        if(ability) ability.value=state.ability || 'Any';
        const sameOnly=document.getElementById('wd-breed-same-only');
        if(sameOnly) sameOnly.checked=!!state.sameSpeciesOnly;
        const req=new Set((state.requiredStats || []).filter(stat=>STATS.includes(stat)));
        if(req.size){
          for(const stat of STATS){
            const el=document.querySelector(`[data-breed-iv=\"${stat}\"]`);
            if(el) el.checked=req.has(stat);
          }
        }
        return !!String(state.targetName || '').trim();
      }

      function breedPlannerReadForm() {
""",
label='planner form persistence helpers')

# Add timestamp + button mode to render.
rep(
"""      function renderBreedPlannerResults() {
        const out = document.getElementById('wd-breed-results');
        const status = document.getElementById('wd-breed-status');
        if (!out) return;
        const form = breedPlannerReadForm();
        if (form.error) {
          breedPlannerLastResults=[]; breedPlannerLastDesired=null; breedPlannerLastTarget=null;
          out.innerHTML=`<div class=\"wdbp-empty\">${escHtml(form.error)}</div>`;
          if(status) status.textContent='';
          return;
        }
""",
"""      function renderBreedPlannerResults() {
        const out = document.getElementById('wd-breed-results');
        const status = document.getElementById('wd-breed-status');
        const calculated = document.getElementById('wd-breed-calculated');
        const recalc = document.getElementById('wd-breed-calculate');
        if (!out) return;
        const form = breedPlannerReadForm();
        if (form.error) {
          breedPlannerLastResults=[]; breedPlannerLastDesired=null; breedPlannerLastTarget=null;
          out.innerHTML=`<div class=\"wdbp-empty\">${escHtml(form.error)}</div>`;
          if(status) status.textContent='';
          if(calculated) calculated.textContent='';
          if(recalc) recalc.innerHTML='<b>Find best pair</b>';
          return;
        }
        saveBreedPlannerFormState();
        if(recalc) recalc.innerHTML='<b>Recalculate best pair</b>';
""",
label='planner render metadata start')

rep(
"""        if (!breedPlannerLastResults.length) {
          out.innerHTML=`<div class=\"wdbp-empty\">No legal ${desired.sameSpeciesOnly?'same-species ':''}pair was found in Box + Team + Nursery for ${escHtml(publicSpeciesName(target.name))}.${desired.sameSpeciesOnly?' Disable “Only same species” to allow compatible Egg Group crosses.':''}</div>`;
          if(status) status.textContent=`Egg species: ${publicSpeciesName(target.eggName)}`;
          return;
        }
        if(status) status.textContent=`Final target: ${publicSpeciesName(target.name)} · Egg species: ${publicSpeciesName(target.eggName)} · ${breedPlannerIvLabel(desired.requiredStats)}${desired.sameSpeciesOnly?' · SAME-SPECIES ONLY':''}`;
""",
"""        if (!breedPlannerLastResults.length) {
          out.innerHTML=`<div class=\"wdbp-empty\">No legal ${desired.sameSpeciesOnly?'same-species ':''}pair was found in Box + Team + Nursery for ${escHtml(publicSpeciesName(target.name))}.${desired.sameSpeciesOnly?' Disable “Only same species” to allow compatible Egg Group crosses.':''}</div>`;
          if(status) status.textContent=`Egg species: ${publicSpeciesName(target.eggName)}`;
          if(calculated) calculated.textContent=`Calculated from current Box + Team + Nursery · ${new Date().toLocaleTimeString()}`;
          return;
        }
        if(status) status.textContent=`Final target: ${publicSpeciesName(target.name)} · Egg species: ${publicSpeciesName(target.eggName)} · ${breedPlannerIvLabel(desired.requiredStats)}${desired.sameSpeciesOnly?' · SAME-SPECIES ONLY':''}`;
        if(calculated) calculated.textContent=`Calculated from current Box + Team + Nursery · ${new Date().toLocaleTimeString()}`;
""",
label='planner calculated stamp')

# Make presets optionally render so mount can establish defaults without erasing persisted form.
rep(
"""      function breedPlannerApplyPreset(name) {
""",
"""      function breedPlannerApplyPreset(name, render=true) {
""",
label='planner preset signature')
rep(
"""        renderBreedPlannerResults();
      }

      function breedPlannerPrefillFromPlan(plan) {
""",
"""        if(render){ saveBreedPlannerFormState(); renderBreedPlannerResults(); }
      }

      function breedPlannerPrefillFromPlan(plan) {
""",
label='planner preset render')

# Existing project prefill delegates to generic state semantics unchanged.
rep(
"""      function breedPlannerPrefillFromPlan(plan) {
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
          const el=document.querySelector(`[data-breed-iv=\"${stat}\"]`);
          if(el) el.checked=req.has(stat);
        }
      }
""",
"""      function breedPlannerPrefillFromPlan(plan) {
        if(!plan) return;
        breedPlannerPrefillFromState({
          targetName:plan.targetName || '',
          nature:plan.nature || 'Any',
          ability:plan.ability || 'Any',
          requiredStats:[...(plan.requiredStats || [])],
          sameSpeciesOnly:!!plan.sameSpeciesOnly
        });
      }
""",
label='project prefill reuse')

# Planner CSS: green compact recalc + metadata.
rep(
"""          #wd-breed-planner-v116 button{border:1px solid #3b485d;background:#202938;color:#e8edf5;border-radius:7px;padding:6px 9px;cursor:pointer} #wd-breed-planner-v116 button:hover{background:#2a3648}
""",
"""          #wd-breed-planner-v116 button{border:1px solid #3b485d;background:#202938;color:#e8edf5;border-radius:7px;padding:6px 9px;cursor:pointer} #wd-breed-planner-v116 button:hover{background:#2a3648}
          #wd-breed-planner-v116 #wd-breed-calculate{margin-left:auto;background:#245a3a;border-color:#327d50;font-weight:700}#wd-breed-planner-v116 #wd-breed-calculate:hover{background:#2d7148}
""",
label='planner recalc css')

rep(
"""          #wd-breed-planner-v116 .wdbp-meta{padding:7px 12px;border-bottom:1px solid #2d3849;color:#9eacbf;display:flex;gap:12px;align-items:center;flex-wrap:wrap}.wdbp-meta .msg{color:#9fd6b9}
""",
"""          #wd-breed-planner-v116 .wdbp-meta{padding:7px 12px;border-bottom:1px solid #2d3849;color:#9eacbf;display:flex;gap:12px;align-items:center;flex-wrap:wrap}.wdbp-meta .msg{color:#9fd6b9}#wd-breed-planner-v116 .wdbp-meta .calc{margin-left:auto;color:#7fbf93;font-size:11px;white-space:nowrap}
""",
label='planner calculated css')

# Replace inline blue button with CSS-controlled green one and add calculated span.
rep(
"""<button id=\"wd-breed-calculate\" style=\"margin-left:auto;background:#315878;border-color:#4c7ca3\"><b>Find best pair</b></button></div>
          </div>
          <div class=\"wdbp-meta\"><span id=\"wd-breed-status\"></span><span id=\"wd-breed-save-msg\" class=\"msg\"></span></div>
""",
"""<button id=\"wd-breed-calculate\"><b>Find best pair</b></button></div>
          </div>
          <div class=\"wdbp-meta\"><span id=\"wd-breed-status\"></span><span id=\"wd-breed-save-msg\" class=\"msg\"></span><span id=\"wd-breed-calculated\" class=\"calc\"></span></div>
""",
label='planner recalc button html')

# Save intent on changes, keep existing live recalc behavior.
rep(
"""        document.getElementById('wd-breed-target').addEventListener('change',()=>{updateAbilities();renderBreedPlannerResults();});
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
""",
"""        const persistAndRender=()=>{ saveBreedPlannerFormState(); renderBreedPlannerResults(); };
        document.getElementById('wd-breed-target').addEventListener('change',()=>{saveBreedPlannerFormState();updateAbilities();renderBreedPlannerResults();});
        document.getElementById('wd-breed-nature').addEventListener('change',persistAndRender);
        document.getElementById('wd-breed-ability').addEventListener('change',persistAndRender);
        document.getElementById('wd-breed-same-only').addEventListener('change',persistAndRender);
        document.getElementById('wd-breed-calculate').addEventListener('click',()=>{saveBreedPlannerFormState();updateAbilities();renderBreedPlannerResults();});
        document.querySelectorAll('[data-breed-iv]').forEach(el=>el.addEventListener('change',persistAndRender));
        document.querySelectorAll('[data-breed-preset]').forEach(el=>el.addEventListener('click',()=>breedPlannerApplyPreset(el.dataset.breedPreset,true)));

        // Establish the physical 5×31 checkbox pattern without rendering yet;
        // a saved last intent or explicit saved project may replace it below.
        breedPlannerApplyPreset('physical',false);
        let hasRememberedTarget=false;
        if(familyKeyToOpen && breedPlans.has(familyKeyToOpen)){
          breedPlannerPrefillFromPlan(breedPlans.get(familyKeyToOpen));
          hasRememberedTarget=true;
        } else {
          hasRememberedTarget=breedPlannerPrefillFromState(loadBreedPlannerFormState());
        }
        updateAbilities();
        if(hasRememberedTarget) renderBreedPlannerResults();
""",
label='planner mount persistence')

# Responsive polish for new button/timestamp.
rep(
"""            #wd-breed-planner-v116 .wdbp-path-head{align-items:flex-start;flex-direction:column}
          }
""",
"""            #wd-breed-planner-v116 .wdbp-path-head{align-items:flex-start;flex-direction:column}
            #wd-breed-planner-v116 #wd-breed-calculate{margin-left:0}
            #wd-breed-planner-v116 .wdbp-meta .calc{margin-left:0;white-space:normal}
          }
""",
label='planner responsive recalc')

p.write_text(s, encoding='utf-8')

# ------------------------------------------------------------------
# Documentation
# ------------------------------------------------------------------
readme = Path('README.md')
r = readme.read_text(encoding='utf-8')
r = r.replace('> **Current version: v1.18.4**', '> **Current version: v1.18.5**', 1)
r = r.replace(
    '- choose how strongly the manager should preserve your current layout;\n- customize the order of the sections that actually exist in your current setup.\n- keep the organized block at the **high end of the 32-box PC** so the early boxes remain a landing zone for new captures / received Pokémon.\n',
    '- choose how strongly the manager should preserve your current layout;\n- choose physical box direction: **32 → 1 (recommended)** or **1 → 32**;\n- customize the order of the sections that actually exist in your current setup;\n- keep the organized block at the **high end of the 32-box PC** by default so the early boxes remain a landing zone for new captures / received Pokémon.\n',
    1
)
r = r.replace(
    'A result can be saved directly as a Breeding Project.\n',
    'The last planner target / filters are remembered locally. Reopening Breed Planner or using **Reload** recalculates recommendations from the current PC + team + Nursery instead of trusting an old pair. A green **Recalculate best pair** button is also available for an explicit fresh check.\n\nA result can be saved directly as a Breeding Project.\n',
    1
)
r = r.replace(
    '## Layout priority\n\nThe PC currently has **32 boxes**. In the normal Balanced / Ordered layouts, the Organizer works **backwards from Box 32** so routine catches do not immediately spill into the organized block.\n\n- **Balanced** keeps your section order and strongly prefers `Box 32 → Box 31 → Box 30...`, while still allowing a small gap when it meaningfully reduces unnecessary moves.\n- **Keep boxes ordered** follows the chosen order as tightly as possible from the high end of the PC.\n- **Minimize moves** prioritizes leaving Pokémon where they already are and may ignore the high-box-first layout when that avoids extra moves.\n',
    '## Layout priority and box direction\n\nThe PC currently has **32 boxes**. Layout priority and physical direction are separate controls. The factory direction is **32 → 1 (recommended)** so routine catches do not immediately spill into the organized block, but players who prefer the traditional layout can select **1 → 32**.\n\n- **Balanced** keeps your section order while allowing a small gap when it meaningfully reduces unnecessary moves.\n- **Keep boxes ordered** follows the chosen order as tightly as possible.\n- **Minimize moves** prioritizes leaving Pokémon where they already are and can ignore physical direction when that avoids extra moves.\n',
    1
)
r = r.replace(
    '- opened on demand from a small **Box Manager** launcher;\n- dragged around the page;\n',
    '- opened on demand from a small **Box Manager** launcher;\n- moved by dragging either the launcher or the full panel, with both positions remembered locally;\n',
    1
)
r = r.replace('The current v1.18.3 source remains same-origin-only', 'The current v1.18.5 source remains same-origin-only')
r = r.replace('What is not present in v1.18.3:', 'What is not present in v1.18.5:')
r = r.replace('Current v1.18.3 SHA-256:', 'Current v1.18.5 SHA-256:')
r = r.replace('`5a42af9ddc512438b6d584ba382d21a6591addc9af7ad96dd297bd3d50502288`', '`Updated by the release workflow after final review.`')
readme.write_text(r, encoding='utf-8')

ch = Path('CHANGELOG.md')
c = ch.read_text(encoding='utf-8')
head = '# Changelog\n\n'
if not c.startswith(head):
    raise SystemExit('Unexpected changelog header')
section = '''## v1.18.5\n\n- The standalone **Box Manager** launcher is now draggable and remembers its screen position; click-vs-drag uses a movement threshold so repositioning does not accidentally open the panel.\n- Added a separate Organizer **Box direction** preference: `32 → 1 (recommended)` remains the default, while `1 → 32` is available without duplicating Layout priority modes.\n- Organizer sizing controls and preferences are persisted locally; new users keep the safe `32 boxes / 99 per box / private family from 12` factory values.\n- Recommended Battle Ready defaults now use EV-trained + **Level 100+** while Synchronize grouping remains off by default.\n- Cleaner and Organizer action logs now stay at a fixed compact height with scrollable history and a bounded in-DOM event count.\n- Breed Planner remembers the last target / Nature / Ability / IV mask / same-species preference, but recalculates pair recommendations from current Box + Team + Nursery data whenever reopened or reloaded.\n- Added a green **Recalculate best pair** action and a small “Calculated from current Box + Team + Nursery” timestamp.\n- No Cleaner release-safety, Organizer interlock/pacing, or breeding-ranking rules were weakened.\n\n'''
ch.write_text(head + section + c[len(head):], encoding='utf-8')
