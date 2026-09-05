from pathlib import Path

p = Path('box-manager.js')
s = p.read_text(encoding='utf-8')

old = """  function __wdManagerShowLauncher() {
    const launcher = __wdManagerEnsureLauncher();
    launcher.hidden = false;
    return launcher;
  }
"""
new = """  function __wdManagerShowLauncher() {
    // Embedded hosts (currently the QA Toolbox) already provide their own
    // Box Manager entry point, so they can suppress the standalone launcher.
    if (window.__WORLDDEX_BOX_MANAGER_EMBEDDED === true) {
      document.getElementById(__WD_MANAGER_LAUNCHER_ID)?.remove();
      return null;
    }
    const launcher = __wdManagerEnsureLauncher();
    launcher.hidden = false;
    return launcher;
  }
"""
if s.count(old) != 1:
    raise SystemExit(f'show launcher anchor: expected 1 match, found {s.count(old)}')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

c = Path('CHANGELOG.md')
text = c.read_text(encoding='utf-8')
needle = '- Added `window.__WORLDDEX_BOX_MANAGER_OPEN()` / `CLOSE()` hooks for future Tampermonkey, extension and embedded integrations.\n'
replacement = needle + '- Embedded hosts can set `window.__WORLDDEX_BOX_MANAGER_EMBEDDED = true` to use their own launcher while keeping the same shell behavior.\n'
if text.count(needle) != 1:
    raise SystemExit('changelog anchor not found')
c.write_text(text.replace(needle, replacement, 1), encoding='utf-8')
