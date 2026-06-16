import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const main = read('src/js/main.js');
const topBar = read('src/components/TopBar.jsx');
const lint = read('lint.mjs');
const pkg = JSON.parse(read('package.json'));

expect(
  /import\s*\{[^}]*devConfig[^}]*\}\s*from\s*['"]\.\/state\/globals\.js['"]/.test(main),
  'src/js/main.js must import devConfig from state/globals.js'
);

expect(
  !topBar.includes('g.ship?.command') && !topBar.includes('g.ship.command'),
  'TopBar command panel must not write to g.ship.command'
);

expect(
  topBar.includes('shipState.engineThrust') && topBar.includes('shipState.rudderAngle'),
  'TopBar command panel must update shipState.engineThrust and shipState.rudderAngle'
);

expect(
  lint.includes("from 'acorn'") && !lint.includes('file:///C:/'),
  'lint.mjs must import acorn from local dependencies, not an absolute user path'
);

expect(pkg.license === 'MIT', 'package.json license must match README license');
expect(pkg.scripts?.lint === 'node lint.mjs', 'package.json must expose npm run lint');
expect(pkg.scripts?.check === 'npm run lint && npm run build', 'package.json must expose npm run check');

console.log('Phase 1 guard checks OK');
