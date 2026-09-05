from pathlib import Path

p = Path('box-manager.js')
s = p.read_text(encoding='utf-8')
old = '''          if (Number.isFinite(w) && w > 0) shell.style.width = `${Math.min(window.innerWidth - 12, w)}px`;
          if (Number.isFinite(h) && h > 0) shell.style.height = `${Math.min(window.innerHeight - 12, h)}px`;
          if (btn) {
            btn.textContent = '_';
            btn.title = 'Minimize to a compact title bar';
            btn.setAttribute('aria-expanded', 'true');
          }
'''
new = '''          if (Number.isFinite(w) && w > 0) shell.style.width = `${Math.min(window.innerWidth - 12, w)}px`;
          if (Number.isFinite(h) && h > 0) shell.style.height = `${Math.min(window.innerHeight - 12, h)}px`;

          // A minimized 340px bar can be dragged much farther right than the
          // full panel. Clamp the restored shell back into the viewport so it
          // can never reopen partly off-screen.
          requestAnimationFrame(() => {
            const r = shell.getBoundingClientRect();
            const maxLeft = Math.max(6, window.innerWidth - shell.offsetWidth - 6);
            const maxTop = Math.max(6, window.innerHeight - 44);
            if (r.left > maxLeft) shell.style.left = `${maxLeft}px`;
            if (r.left < 6) shell.style.left = '6px';
            if (r.top > maxTop) shell.style.top = `${maxTop}px`;
            if (r.top < 6) shell.style.top = '6px';
          });

          if (btn) {
            btn.textContent = '_';
            btn.title = 'Minimize to a compact title bar';
            btn.setAttribute('aria-expanded', 'true');
          }
'''
if s.count(old) != 1:
    raise SystemExit(f'restore anchor expected 1, found {s.count(old)}')
p.write_text(s.replace(old, new, 1), encoding='utf-8')

c = Path('CHANGELOG.md')
text = c.read_text(encoding='utf-8')
needle = '- Restoring preserves the full panel dimensions from before minimize.\n'
replacement = '- Restoring preserves the full panel dimensions from before minimize and clamps the restored panel back inside the viewport.\n'
if text.count(needle) != 1:
    raise SystemExit('changelog restore line not found')
c.write_text(text.replace(needle, replacement, 1), encoding='utf-8')
