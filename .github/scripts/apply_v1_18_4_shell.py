from pathlib import Path

p = Path('box-manager.js')
s = p.read_text(encoding='utf-8')


def once(old: str, new: str, label: str) -> None:
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}')
    s = s.replace(old, new, 1)


# Public release version bump.
s = s.replace('v1.18.3', 'v1.18.4')
s = s.replace('1.18.3', '1.18.4')

once(
    """  let __wdManagerRefreshing = false;

  function __wdManagerCleanupUI() {""",
    """  let __wdManagerRefreshing = false;

  const __WD_MANAGER_LAUNCHER_ID = 'wd-manager-launcher';
  const __WD_MANAGER_LAUNCHER_STYLE_ID = 'wd-manager-launcher-style';

  function __wdManagerEnsureLauncher() {
    let launcher = document.getElementById(__WD_MANAGER_LAUNCHER_ID);
    if (launcher) return launcher;

    document.getElementById(__WD_MANAGER_LAUNCHER_STYLE_ID)?.remove();
    const style = document.createElement('style');
    style.id = __WD_MANAGER_LAUNCHER_STYLE_ID;
    style.textContent = `
      #${__WD_MANAGER_LAUNCHER_ID} {
        position:fixed;
        z-index:2147483647;
        top:88px;
        right:18px;
        padding:9px 12px;
        border:1px solid #3b485d;
        border-radius:9px;
        background:#12151b;
        color:#e8edf5;
        box-shadow:0 8px 24px rgba(0,0,0,.38);
        font:13px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;
        font-weight:650;
        cursor:pointer;
      }
      #${__WD_MANAGER_LAUNCHER_ID}:hover { background:#202938; }
    `;
    document.head.appendChild(style);

    launcher = document.createElement('button');
    launcher.id = __WD_MANAGER_LAUNCHER_ID;
    launcher.type = 'button';
    launcher.textContent = 'Box Manager';
    launcher.title = 'Open Worlddex Box Manager';
    launcher.addEventListener('click', () => window.__WORLDDEX_BOX_MANAGER_OPEN?.());
    document.body.appendChild(launcher);
    return launcher;
  }

  function __wdManagerShowLauncher() {
    const launcher = __wdManagerEnsureLauncher();
    launcher.hidden = false;
    return launcher;
  }

  function __wdManagerHideLauncher() {
    const launcher = document.getElementById(__WD_MANAGER_LAUNCHER_ID);
    if (launcher) launcher.hidden = true;
  }

  function __wdManagerCleanupUI() {""",
    'launcher helpers',
)

once(
    """      function managerDestroyShell() {
        managerClearViewPanels();
        document.getElementById('wd-manager-shell-v110')?.remove();
        document.getElementById('wd-manager-shell-v110-style')?.remove();
      }
""",
    """      function managerDestroyShell() {
        managerClearViewPanels();
        document.getElementById('wd-manager-shell-v110')?.remove();
        document.getElementById('wd-manager-shell-v110-style')?.remove();
        __wdManagerShowLauncher();
      }
""",
    'close to launcher',
)

once(
    """          #wd-manager-shell-v110.wdm-minimized {
            height:auto !important;
            max-height:none !important;
            min-height:0 !important;
            resize:none !important;
          }
          #wd-manager-shell-v110.wdm-minimized #wd-manager-view-slot {
            display:none !important;
          }
""",
    """          #wd-manager-shell-v110.wdm-minimized {
            width:340px !important;
            min-width:340px !important;
            max-width:calc(100vw - 12px) !important;
            height:auto !important;
            max-height:none !important;
            min-height:0 !important;
            resize:none !important;
          }
          #wd-manager-shell-v110.wdm-minimized #wd-manager-view-slot,
          #wd-manager-shell-v110.wdm-minimized .wdm-nav,
          #wd-manager-shell-v110.wdm-minimized #wd-manager-refresh,
          #wd-manager-shell-v110.wdm-minimized #wd-manager-current-view {
            display:none !important;
          }
          #wd-manager-shell-v110.wdm-minimized .wdm-brand {
            flex:1 1 auto;
            min-width:0;
          }
""",
    'compact minimize css',
)

once(
    """            <button id=\"wd-manager-refresh\" title=\"Check your current PC again and refresh this section\">Reload</button>
            <button id=\"wd-manager-minimize\">Minimize</button>
            <button id=\"wd-manager-close\">×</button>""",
    """            <button id=\"wd-manager-refresh\" title=\"Check your current PC again and refresh this section\">Reload</button>
            <button id=\"wd-manager-minimize\" title=\"Minimize to a compact title bar\">_</button>
            <button id=\"wd-manager-close\" title=\"Hide Box Manager\">×</button>""",
    'header controls',
)

once(
    """        shell.querySelector('#wd-manager-minimize').addEventListener('click', e => {
          const minimized = shell.classList.toggle('wdm-minimized');
          e.currentTarget.textContent = minimized ? 'Restore' : 'Minimize';
          e.currentTarget.setAttribute('aria-expanded', String(!minimized));
        });
""",
    """        const setManagerMinimized = minimized => {
          const btn = shell.querySelector('#wd-manager-minimize');

          if (minimized) {
            if (!shell.classList.contains('wdm-minimized')) {
              const r = shell.getBoundingClientRect();
              shell.dataset.fullWidth = String(Math.round(r.width));
              shell.dataset.fullHeight = String(Math.round(r.height));
            }
            shell.classList.add('wdm-minimized');
            if (btn) {
              btn.textContent = '+';
              btn.title = 'Restore Box Manager';
              btn.setAttribute('aria-expanded', 'false');
            }
            return;
          }

          shell.classList.remove('wdm-minimized');
          const w = Number(shell.dataset.fullWidth);
          const h = Number(shell.dataset.fullHeight);
          if (Number.isFinite(w) && w > 0) shell.style.width = `${Math.min(window.innerWidth - 12, w)}px`;
          if (Number.isFinite(h) && h > 0) shell.style.height = `${Math.min(window.innerHeight - 12, h)}px`;
          if (btn) {
            btn.textContent = '_';
            btn.title = 'Minimize to a compact title bar';
            btn.setAttribute('aria-expanded', 'true');
          }
        };
        shell.__wdSetMinimized = setManagerMinimized;

        shell.querySelector('#wd-manager-minimize').addEventListener('click', () => {
          setManagerMinimized(!shell.classList.contains('wdm-minimized'));
        });
""",
    'minimize behavior',
)

once(
    """        // Switching a top-level tab should restore the content if the panel was
        // minimized. The shell itself and its position never change.
        if (shell.classList.contains('wdm-minimized')) {
          shell.classList.remove('wdm-minimized');
          const min = shell.querySelector('#wd-manager-minimize');
          if (min) min.textContent = 'Minimize';
        }
""",
    """        // Switching a top-level tab restores the full shell first.
        if (shell.classList.contains('wdm-minimized')) {
          if (typeof shell.__wdSetMinimized === 'function') shell.__wdSetMinimized(false);
          else shell.classList.remove('wdm-minimized');
        }
""",
    'tab restore behavior',
)

once(
    """      const startupView = managerActiveView();
      (MANAGER_VIEW_META[startupView]?.mount || mountReviewPanel)();
""",
    """      const startupView = managerActiveView();
      (MANAGER_VIEW_META[startupView]?.mount || mountReviewPanel)();
      __wdManagerHideLauncher();
""",
    'hide launcher after manager mounts',
)

old_tail = """  window.__WORLDDEX_BOX_MANAGER_REFRESH = async function () {
    if (__wdManagerRefreshing) return false;
    __wdManagerRefreshing = true;

    __wdManagerCleanupUI();
    const loading = __wdManagerLoading();

    try {
      await __wdManagerRun();
      return true;
    } catch (err) {
      console.error('[Worlddex Box Manager v1.18.4] reload failed', err);
      alert('Worlddex Box Manager reload failed. Check the console; no release was started.');
      throw err;
    } finally {
      loading?.remove();
      __wdManagerRefreshing = false;
    }
  };

  window.__WORLDDEX_BOX_MANAGER_REFRESH().catch(() => {});
})();"""

new_tail = """  window.__WORLDDEX_BOX_MANAGER_REFRESH = async function () {
    if (__wdManagerRefreshing) return false;
    __wdManagerRefreshing = true;

    __wdManagerCleanupUI();
    __wdManagerHideLauncher();
    const loading = __wdManagerLoading();

    try {
      await __wdManagerRun();
      return true;
    } catch (err) {
      console.error('[Worlddex Box Manager v1.18.4] reload failed', err);
      __wdManagerShowLauncher();
      alert('Worlddex Box Manager reload failed. Check the console; no release was started.');
      throw err;
    } finally {
      loading?.remove();
      __wdManagerRefreshing = false;
    }
  };

  window.__WORLDDEX_BOX_MANAGER_OPEN = async function () {
    const shell = document.getElementById('wd-manager-shell-v110');
    if (shell) {
      __wdManagerHideLauncher();
      if (typeof shell.__wdSetMinimized === 'function') shell.__wdSetMinimized(false);
      return true;
    }
    __wdManagerHideLauncher();
    return window.__WORLDDEX_BOX_MANAGER_REFRESH();
  };

  window.__WORLDDEX_BOX_MANAGER_CLOSE = function () {
    const shell = document.getElementById('wd-manager-shell-v110');
    if (shell) {
      const close = shell.querySelector('#wd-manager-close');
      if (close) close.click();
      else shell.remove();
    }
    __wdManagerShowLauncher();
  };

  // Public builds stay dormant until the player asks for the manager. This is
  // friendly to future Tampermonkey / extension packaging and avoids box/state
  // API reads on every Worlddex page refresh.
  __wdManagerCleanupUI();
  __wdManagerShowLauncher();
})();"""

once(old_tail, new_tail, 'lazy startup lifecycle')

p.write_text(s, encoding='utf-8')

# README
r = Path('README.md')
readme = r.read_text(encoding='utf-8')
readme = readme.replace('> **Current version: v1.18.3**', '> **Current version: v1.18.4**', 1)
readme = readme.replace(
    'It adds a floating PC-management panel that helps you organize large boxes, clean duplicates, plan breeding projects and track Pokédex needs without changing how Worlddex itself works.',
    'It adds an on-demand floating PC-management panel that helps you organize large boxes, clean duplicates, plan breeding projects and track Pokédex needs without changing how Worlddex itself works.',
    1,
)
readme = readme.replace(
    '- dragged around the page;\n- minimized;\n- enlarged by dragging the bottom-right corner;',
    '- opened on demand from a small **Box Manager** launcher;\n- dragged around the page;\n- truly minimized to a compact title bar;\n- hidden with `×`, which returns it to the small launcher;\n- enlarged by dragging the bottom-right corner;',
    1,
)
readme = readme.replace(
    '4. Paste it into the Worlddex console and run it.',
    '4. Paste it into the Worlddex console and run it.\n5. A small **Box Manager** button appears; click it when you want to load the manager.',
    1,
)
r.write_text(readme, encoding='utf-8')

# CHANGELOG
c = Path('CHANGELOG.md')
changelog = c.read_text(encoding='utf-8')
heading = '# Changelog\n\n'
if not changelog.startswith(heading):
    raise SystemExit('Unexpected CHANGELOG header')
section = '''## v1.18.4\n\n- Added an on-demand **Box Manager** launcher: loading the script no longer opens the full manager or reads Box/State data until the player clicks it.\n- `×` now hides the manager back to the launcher instead of making the UI disappear permanently.\n- `_` is now a true compact minimize; the minimized shell keeps only the title and restore/close controls visible.\n- Restoring preserves the full panel dimensions from before minimize.\n- Added `window.__WORLDDEX_BOX_MANAGER_OPEN()` / `CLOSE()` hooks for future Tampermonkey, extension and embedded integrations.\n- Cleaner and Organizer safety behavior is unchanged.\n\n'''
changelog = heading + section + changelog[len(heading):]
c.write_text(changelog, encoding='utf-8')
