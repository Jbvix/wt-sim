import { readFileSync } from 'node:fs';

const models = readFileSync('src/js/graphics/models.js', 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  /const\s+SHIP_BOW_SIDE_BOLLARD_Z\s*=\s*9\.5/.test(models),
  'bow side bollards must keep the current visible inboard offset'
);

assert(
  /const\s+SHIP_OUTBOARD_SIDE_BOLLARD_Z\s*=\s*17\.0/.test(models),
  'spring and stern side bollards must move farther outboard for visibility'
);

assert(
  /const\s+SHIP_BOW_SIDE_BOLLARD_Y\s*=\s*14\.75/.test(models),
  'bow side bollards must keep the current vertical position'
);

assert(
  /const\s+SHIP_OUTBOARD_SIDE_BOLLARD_Y\s*=\s*14\.75/.test(models),
  'spring and stern side bollards must sit at the same height as bow side bollards'
);

for (const id of ['bow-spring', 'stern-spring', 'stern-head']) {
  assert(
    new RegExp(`id: '${id}'.*yPos: SHIP_OUTBOARD_SIDE_BOLLARD_Y.*zPos: -SHIP_OUTBOARD_SIDE_BOLLARD_Z`).test(models),
    `${id} BB must use the outboard visible deck position`
  );
}

for (const id of ['bow-spring-be', 'stern-spring-be', 'stern-head-be']) {
  assert(
    new RegExp(`id: '${id}'.*yPos: SHIP_OUTBOARD_SIDE_BOLLARD_Y.*zPos: \\+SHIP_OUTBOARD_SIDE_BOLLARD_Z`).test(models),
    `${id} BE must use the outboard visible deck position`
  );
}

assert(
  /id: 'bow-head'.*yPos: SHIP_BOW_SIDE_BOLLARD_Y.*zPos: -SHIP_BOW_SIDE_BOLLARD_Z/.test(models),
  'bow-head BB must keep the bow side offset'
);

assert(
  /id: 'bow-head-be'.*yPos: SHIP_BOW_SIDE_BOLLARD_Y.*zPos: \+SHIP_BOW_SIDE_BOLLARD_Z/.test(models),
  'bow-head BE must keep the bow side offset'
);

assert(
  /b\.position\.set\(m\.xPos,\s*m\.yPos,\s*m\.zPos\)/.test(models),
  'mooring bollards must use per-position vertical coordinates'
);

console.log('Ship side bollard position checks OK');
