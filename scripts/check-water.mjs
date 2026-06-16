import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const exists = (path) => fs.existsSync(path);

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

expect(exists('src/js/graphics/water.js'), 'water.js module must exist');

const water = read('src/js/graphics/water.js');
const models = read('src/js/graphics/models.js');
const main = read('src/js/main.js');
const globals = read('src/js/state/globals.js');

expect(water.includes('export function createOcean'), 'water.js must export createOcean');
expect(water.includes('export function updateOcean'), 'water.js must export updateOcean');
expect(water.includes('ShaderMaterial'), 'water.js must use a shader material');
expect(water.includes('uTime'), 'water shader must expose a uTime uniform');
expect(water.includes('uWindStrength'), 'water shader must react to wind');
expect(water.includes('uCurrentVector'), 'water shader must react to current direction');

expect(models.includes("import { createOcean } from './water.js'"), 'models.js must import createOcean');
expect(models.includes('createOcean()'), 'models.js must build the ocean through createOcean');

expect(
  /import\s*\{\s*updateOcean\s*\}\s*from\s*['"]\.\/graphics\/water\.js['"]/.test(main),
  'main.js must import updateOcean'
);
expect(main.includes('updateOcean(dt)'), 'main.js must update ocean animation each frame');

expect(globals.includes('ocean:'), 'globals.js must keep an ocean reference');

console.log('Water rendering guard checks OK');
