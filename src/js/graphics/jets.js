/**
 * @file        src/js/graphics/jets.js
 * @description Efeito visual de jato de água dos propulsores azimutais.
 *              Partículas (espuma/borrifo) emitidas em cada propulsor na direção
 *              do jato (inverso do empuxo). O COMPRIMENTO do jato é proporcional
 *              à força de propulsão (RPM) e ao regime:
 *                · a empurrar (rebocador parado, sob carga) → comprimento ≈ casco
 *                · a navegar  (rebocador em seguimento)      → metade do casco
 *              A distância de cada partícula é parametrizada diretamente pelo
 *              comprimento-alvo, garantindo controlo visual preciso.
 * @author      Jossian Brito <jossiancosta@gmail.com>
 */

import * as THREE from 'three';

/** Partículas por propulsor. 2 propulsores → 2× este valor por rebocador. */
const PER_THRUSTER = 80;

/** Comprimento do rebocador (m) — jato máximo a empurrar a toda a força. */
const TUG_LENGTH = 32;

/** Velocidade (nós) a partir da qual se considera "a navegar" (jato a metade). */
const CRUISE_KN = 6;

/** Abertura total do cone do jato (graus). */
const CONE_FULL_DEG = 20;
/** Fração lateral máxima = tan(meio-ângulo); usada para um cone de ângulo constante. */
const CONE_SPREAD = 2 * Math.tan((CONE_FULL_DEG / 2) * Math.PI / 180);

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
    age:     new Float32Array(total).fill(99),
    life:    new Float32Array(total).fill(1),
    // parâmetros congelados no nascimento (referencial local do grupo):
    ox: new Float32Array(total), oy: new Float32Array(total), oz: new Float32Array(total),
    dx: new Float32Array(total), dz: new Float32Array(total),  // direção do jato
    reach:   new Float32Array(total),  // distância-alvo (m)
    lateral: new Float32Array(total),  // amplitude do leque (m)
    emitter: Uint8Array.from({ length: total }, (_, i) => (i < PER_THRUSTER ? 0 : 1)),
  };
}

/** (Re)nasce uma partícula no bocal do propulsor `em`, com alcance `L` metros. */
function respawn(s, i, em, angle, L) {
  const e = EMITTERS[em];

  // Direção do jato (água ejetada) — inverso do empuxo, no referencial local.
  const jx = -Math.cos(angle);
  const jz = -Math.sin(angle);

  s.ox[i] = e.x + (Math.random() - 0.5) * 1.2;
  s.oy[i] = e.y + (Math.random() - 0.5) * 0.3;
  s.oz[i] = e.z + (Math.random() - 0.5) * 1.2;
  s.dx[i] = jx;
  s.dz[i] = jz;
  // Cada partícula chega a uma fração do alcance (espalha o jato em comprimento).
  s.reach[i]   = L * (0.55 + Math.random() * 0.45);
  // Fração lateral (tan do ângulo) — cone de abertura total CONE_FULL_DEG.
  s.lateral[i] = (Math.random() - 0.5) * CONE_SPREAD;
  s.age[i]  = 0;
  s.life[i] = 0.5 + Math.random() * 0.6;
}

/**
 * Avança o sistema de partículas de um rebocador.
 * @param {Object} s          Estado devolvido por createTugJet()
 * @param {Object} thrusters  { bb, be } com { thrust (0-1), angle (rad) }
 * @param {Object} tugState   { velocity: THREE.Vector2 } para detetar empurrar/navegar
 * @param {number} dt         Delta time (s)
 */
export function updateTugJet(s, thrusters, tugState, dt) {
  if (!s || dt <= 0) return;
  if (dt > 0.1) dt = 0.1; // estabilidade

  // Regime: parado (a empurrar) → fator 1.0 ; em velocidade (a navegar) → 0.5.
  const speedKn = tugState
    ? Math.hypot(tugState.velocity.x, tugState.velocity.y) * 1.94384
    : 0;
  const pushFactor = 1.0 - 0.5 * Math.min(speedKn / CRUISE_KN, 1);

  const sides = ['bb', 'be'];

  for (let i = 0; i < s.age.length; i++) {
    const t = thrusters[sides[s.emitter[i]]];
    s.age[i] += dt;

    if (s.age[i] >= s.life[i]) {
      // Emissão: só renasce se houver potência; taxa ∝ thrust.
      if (t && t.thrust > 0.02 && Math.random() < 0.25 + t.thrust * 0.75) {
        // Comprimento-alvo = casco × potência × regime (empurrar/navegar).
        const L = TUG_LENGTH * t.thrust * pushFactor;
        respawn(s, i, s.emitter[i], t.angle, L);
      } else {
        s.alphas[i] = 0;
        s.sizes[i]  = 0;
        s.age[i]    = s.life[i]; // permanece morta/invisível
        continue;
      }
    }

    const o = i * 3;
    const f = s.age[i] / s.life[i];        // 0 → 1
    const dist = s.reach[i] * Math.pow(f, 0.8); // distância ao longo do jato
    const px = -s.dz[i], pz = s.dx[i];     // perpendicular (leque)
    const lat = s.lateral[i] * dist;       // offset = tan(ângulo)·distância → cone de ângulo constante

    s.positions[o]     = s.ox[i] + s.dx[i] * dist + px * lat;
    s.positions[o + 1] = 0.15 + 0.5 * Math.sin(f * Math.PI); // ligeiro borrifo à tona
    s.positions[o + 2] = s.oz[i] + s.dz[i] * dist + pz * lat;

    s.alphas[i] = (1 - f) * 0.85;          // desvanece
    s.sizes[i]  = 2.0 + f * 6.0;           // espalha-se ao dispersar
  }

  s.points.geometry.attributes.position.needsUpdate = true;
  s.points.geometry.attributes.aAlpha.needsUpdate   = true;
  s.points.geometry.attributes.aSize.needsUpdate    = true;
}
