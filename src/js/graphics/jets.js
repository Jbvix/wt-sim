/**
 * @file        src/js/graphics/jets.js
 * @description Efeito visual de jato de água dos propulsores azimutais.
 *              Sistema de partículas (espuma/borrifo) emitido em cada propulsor,
 *              na direção do jato (inverso do empuxo), com intensidade proporcional
 *              à potência (RPM). Cada partícula tem alpha e tamanho próprios via
 *              ShaderMaterial. As partículas vivem no referencial local do grupo
 *              do rebocador (acompanham o casco no campo próximo do propulsor).
 * @author      Jossian Brito <jossiancosta@gmail.com>
 */

import * as THREE from 'three';

/** Partículas por propulsor. 2 propulsores → 2× este valor por rebocador. */
const PER_THRUSTER = 70;

/** Posição local dos bocais dos propulsores (popa do rebocador). */
const EMITTERS = [
  { x: -14, y: 0.6, z: -4 }, // BB (bombordo)
  { x: -14, y: 0.6, z:  4 }, // BE (boreste/estibordo)
];

const VERT = `
  attribute float aAlpha;
  attribute float aSize;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (320.0 / max(-mv.z, 1.0));
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = length(c);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, d); // disco suave (espuma)
    gl_FragColor = vec4(uColor, vAlpha * soft);
  }
`;

/**
 * Cria o sistema de partículas de jato para um rebocador.
 * O THREE.Points devolvido deve ser adicionado ao grupo do rebocador.
 *
 * @returns {Object} estado do jato (points + buffers CPU)
 */
export function createTugJet() {
  const total = PER_THRUSTER * EMITTERS.length;

  const positions = new Float32Array(total * 3);
  const alphas    = new Float32Array(total);
  const sizes     = new Float32Array(total);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aAlpha',   new THREE.BufferAttribute(alphas, 1));
  geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms:      { uColor: { value: new THREE.Color(0xdcefff) } },
    vertexShader:  VERT,
    fragmentShader: FRAG,
    transparent:   true,
    depthWrite:    false,
    blending:      THREE.NormalBlending,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false; // emissor sempre perto da ação

  return {
    points, positions, alphas, sizes,
    vel:     new Float32Array(total * 3),
    age:     new Float32Array(total).fill(99),
    life:    new Float32Array(total).fill(1),
    emitter: Uint8Array.from({ length: total }, (_, i) => (i < PER_THRUSTER ? 0 : 1)),
  };
}

/** (Re)nasce uma partícula no bocal do propulsor `em`, com velocidade no jato. */
function respawn(s, i, em, thrust, angle) {
  const e = EMITTERS[em];
  const o = i * 3;

  // Direção do jato (água ejetada) — inverso do empuxo, no referencial local.
  const jx = -Math.cos(angle);
  const jz = -Math.sin(angle);
  // Perpendicular para abrir o leque do jato.
  const px = -jz, pz = jx;
  const lat = (Math.random() - 0.5) * 0.6;

  const speed = (7 + Math.random() * 7) * (0.4 + thrust * 0.6);

  s.positions[o]     = e.x + (Math.random() - 0.5) * 1.2;
  s.positions[o + 1] = e.y + (Math.random() - 0.5) * 0.3;
  s.positions[o + 2] = e.z + (Math.random() - 0.5) * 1.2;

  s.vel[o]     = (jx + px * lat) * speed;
  s.vel[o + 1] = 0.6 + Math.random() * 1.4; // borrifo leve para cima
  s.vel[o + 2] = (jz + pz * lat) * speed;

  s.age[i]  = 0;
  s.life[i] = 0.45 + Math.random() * 0.7;
}

/**
 * Avança o sistema de partículas de um rebocador.
 * @param {Object} s          Estado devolvido por createTugJet()
 * @param {Object} thrusters  { bb, be } com { thrust (0-1), angle (rad) }
 * @param {number} dt         Delta time (s)
 */
export function updateTugJet(s, thrusters, dt) {
  if (!s || dt <= 0) return;
  if (dt > 0.1) dt = 0.1; // estabilidade

  const sides = ['bb', 'be'];
  const dragXZ = Math.pow(0.10, dt); // espuma desacelera depressa na água
  const dragY  = Math.pow(0.40, dt);

  for (let i = 0; i < s.age.length; i++) {
    const t = thrusters[sides[s.emitter[i]]];
    s.age[i] += dt;

    if (s.age[i] >= s.life[i]) {
      // Emissão: só renasce se houver potência; taxa ∝ thrust.
      if (t && t.thrust > 0.02 && Math.random() < 0.25 + t.thrust * 0.75) {
        respawn(s, i, s.emitter[i], t.thrust, t.angle);
      } else {
        s.alphas[i] = 0;
        s.sizes[i]  = 0;
        s.age[i]    = s.life[i]; // permanece morta/invisível
        continue;
      }
    }

    const o = i * 3;
    s.positions[o]     += s.vel[o]     * dt;
    s.positions[o + 1] += s.vel[o + 1] * dt;
    s.positions[o + 2] += s.vel[o + 2] * dt;

    s.vel[o]     *= dragXZ;
    s.vel[o + 2] *= dragXZ;
    s.vel[o + 1]  = s.vel[o + 1] * dragY - 2.5 * dt; // borrifo cai e assenta
    if (s.positions[o + 1] < 0.1) s.positions[o + 1] = 0.1; // fica à tona

    const f = s.age[i] / s.life[i]; // 0 → 1
    s.alphas[i] = (1 - f) * 0.85;   // desvanece
    s.sizes[i]  = 2.5 + f * 6.0;    // espalha-se ao dispersar
  }

  s.points.geometry.attributes.position.needsUpdate = true;
  s.points.geometry.attributes.aAlpha.needsUpdate   = true;
  s.points.geometry.attributes.aSize.needsUpdate    = true;
}
