import { readFileSync } from 'node:fs';

const models = readFileSync('src/js/graphics/models.js', 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  /const\s+SHIP_SUPERSTRUCTURE_X\s*=\s*-8\b/.test(models),
  'ship navigation lights must be anchored at the calibrated superstructure x position'
);

assert(
  /const\s+SHIP_BRIDGE_NAV_LIGHT_Y\s*=\s*27\.5\b/.test(models),
  'ship side navigation lights must sit high on the bridge wings'
);

assert(
  /const\s+SHIP_BRIDGE_NAV_LIGHT_Z\s*=\s*11\b/.test(models),
  'ship side navigation lights must sit on the bridge wings (inboard of the beam)'
);

assert(
  /const\s+SHIP_MAST_NAV_LIGHT_Y\s*=\s*34\.5\b/.test(models),
  'ship mast navigation light must sit above the superstructure roof'
);

assert(
  /createNavLight\(g\.merchantShip,\s*0xff0000,\s*SHIP_SUPERSTRUCTURE_X,\s*SHIP_BRIDGE_NAV_LIGHT_Y,\s*-SHIP_BRIDGE_NAV_LIGHT_Z,\s*400\)/.test(models),
  'port navigation light must be on the port bridge wing'
);

assert(
  /createNavLight\(g\.merchantShip,\s*0x00ff00,\s*SHIP_SUPERSTRUCTURE_X,\s*SHIP_BRIDGE_NAV_LIGHT_Y,\s*SHIP_BRIDGE_NAV_LIGHT_Z,\s*400\)/.test(models),
  'starboard navigation light must be on the starboard bridge wing'
);

assert(
  /createNavLight\(g\.merchantShip,\s*0xffffff,\s*SHIP_SUPERSTRUCTURE_X,\s*SHIP_MAST_NAV_LIGHT_Y,\s*0,\s*800\)/.test(models),
  'mast navigation light must be centered above the superstructure'
);

assert(
  /createNavLight\(g\.merchantShip,\s*0xffffff,\s*SHIP_STERN_NAV_LIGHT_X,\s*SHIP_STERN_NAV_LIGHT_Y,\s*0,\s*400\)/.test(models),
  'stern navigation light must sit at the stern at deck level'
);

console.log('Ship navigation light position checks OK');
