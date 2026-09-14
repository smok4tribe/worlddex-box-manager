const fs = require('fs');
const assert = require('assert');
const src = fs.readFileSync('box-manager.js', 'utf8');

assert(src.includes('BOX MANAGER v1.18.9'));
assert(!src.includes("if (ownedLocation(a) === 'TEAM') score -= 3;"), 'parent A must not be penalized for living in Team');
assert(!src.includes("if (ownedLocation(b) === 'TEAM') score -= 3;"), 'parent B must not be penalized for living in Team');
assert(!src.includes("if (ownedLocation(donor) === 'TEAM') score -= 3;"), 'path donor must not be penalized for living in Team');

assert(src.includes('function breedPlannerInventorySignature(boxBody, stateBody, nurseryBody)'));
assert(src.includes("push('T',m)"), 'inventory signature must include Team rows');
assert(src.includes("getJSON('/api/state')"), 'live watcher must fetch current Team state');
assert(src.includes('breedPlannerInventorySignature(boxNow,stateNow,nurseryNow)'), 'live watcher must include Team in signature comparison');
assert(src.includes("{ team:state.team || [] }"), 'initial signature must include the current Team');

console.log('v1.18.9 Breed Planner Team regression contract passed');
