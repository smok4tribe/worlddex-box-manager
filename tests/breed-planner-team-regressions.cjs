const fs = require('fs');
const assert = require('assert');
const src = fs.readFileSync('box-manager.js', 'utf8');

assert(src.includes('BOX MANAGER v1.19.0'));
assert(!src.includes("if (ownedLocation(a) === 'TEAM') score -= 3;"), 'parent A must not be penalized for living in Team');
assert(!src.includes("if (ownedLocation(b) === 'TEAM') score -= 3;"), 'parent B must not be penalized for living in Team');
assert(!src.includes("if (ownedLocation(donor) === 'TEAM') score -= 3;"), 'path donor must not be penalized for living in Team');

assert(src.includes('function breedPlannerInventorySignature(boxBody, stateBody, nurseryBody)'));
assert(src.includes("push('T',m)"), 'inventory signature must include Team rows');
assert(src.includes("getJSON('/api/state')"), 'live watcher must fetch current Team state');
assert(src.includes("shell.dataset.view !== 'planner'"), 'automatic Team refresh must not reopen a planner that is no longer the active view');
assert(src.includes("shell.classList.contains('wdm-minimized')"), 'automatic Team refresh must not expand a minimized planner');
assert(src.includes("if (refreshed !== false) baseline=next;"), 'skipped hidden/minimized refresh must keep the old baseline for a later visible refresh');
assert(src.includes('breedPlannerInventorySignature(boxNow,stateNow,nurseryNow)'), 'live watcher must include Team in signature comparison');
assert(src.includes("{ team:state.team || [] }"), 'initial signature must include the current Team');

console.log('v1.19.0 Breed Planner Team regression contract passed');
