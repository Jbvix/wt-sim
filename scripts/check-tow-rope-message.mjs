import { readFileSync } from 'node:fs';

const main = readFileSync('src/js/main.js', 'utf8');
const collision = readFileSync('src/js/physics/collision.js', 'utf8');
const winchPanel = readFileSync('src/js/ui/winchPanel.js', 'utf8');
const models = readFileSync('src/js/graphics/models.js', 'utf8');
const towPrompt = readFileSync('src/js/ui/towPrompt.js', 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  /export function\s+getTowBollardPrompt/.test(towPrompt),
  'towPrompt.js must provide a tow bollard prompt helper'
);

assert(
  /popa do navio/.test(towPrompt),
  'stern tug prompt must ask for the ship stern bollard'
);

assert(
  /proa do navio/.test(towPrompt),
  'bow tug prompt must ask for the ship bow bollard'
);

assert(
  /msgEl\.innerText\s*=\s*getTowBollardPrompt\(userData\.tugId\)/.test(main),
  'selecting a tug winch must show the ship bollard prompt'
);

assert(
  /isTowBollardForTug\(userData,\s*g\.activeTugId\)/.test(main),
  'tug tow rope must only connect to the matching ship tow bollard'
);

assert(
  /towTarget:\s*label/.test(models),
  'ship tow bollards must identify whether they are proa or popa targets'
);

assert(
  /getTowBollardPrompt\(g\.activeTugId\)/.test(collision),
  'collision warning reset must preserve tow rope prompt while rope is in hand'
);

assert(
  /getTowBollardPrompt\(g\.activeTugId\)/.test(winchPanel),
  'winch disconnect warning reset must preserve tow rope prompt while rope is in hand'
);

console.log('Tow rope message guard checks OK');
