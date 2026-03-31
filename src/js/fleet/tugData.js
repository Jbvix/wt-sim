/**
 * @file        src/js/fleet/tugData.js
 * @description Definição da estrutura de dados de cada rebocador (factory)
 *              e inicialização da frota de dois rebocadores ASD.
 * @author      Jossian Brito <jossiancosta@gmail.com>
 * @version     2.0.0
 * @since       2026-03-28
 */

import * as THREE from 'three';

// ─────────────────────────────────────────────────────────
// 1. FACTORY — Estrutura de dados de um rebocador
// ─────────────────────────────────────────────────────────

/**
 * Cria um objeto de estado inicial para um rebocador ASD.
 * Cada chamada produz objetos independentes (sem partilha de referências).
 *
 * @returns {{
 *   state:    { position: THREE.Vector2, velocity: THREE.Vector2,
 *               heading: number, angularVelocity: number,
 *               mass: number, inertia: number },
 *   thrusters:{ bb: ThrusterState, be: ThrusterState },
 *   rope:     RopeState,
 *   meshes:   {}
 * }}
 */
export function createTugData() {
  return {
    state: {
      position:        new THREE.Vector2(0, 0), // preenchido por setupDockedScenario
      velocity:        new THREE.Vector2(0, 0),
      heading:         -Math.PI / 2, // Guincho (+X local) virado para o navio (-Z mundo)
      angularVelocity: 0,
      mass:            400,         // toneladas (mais ágil que o Panamax)
      inertia:         50_000,
    },

    /** @type {{ bb: ThrusterState, be: ThrusterState }} */
    thrusters: {
      bb: { thrust: 0, angle: 0, pos: { x: -14, z: -4 } }, // Bombordo (Popa)
      be: { thrust: 0, angle: 0, pos: { x: -14, z:  4 } }, // Estibordo (Popa)
    },

    /**
     * @typedef {Object} RopeState
     * @property {number}           status          0=Solto, 1=Na Mão, 2=Conectado
     * @property {number}           lengthL0        Comprimento frouxo (m)
     * @property {number}           tension         Tensão atual (t)
     * @property {number}           k               Constante elástica (N/m)
     * @property {number}           damping         Amortecimento
     * @property {number}           winchAction     1=Heave, -1=Pay, 0=Parado
     * @property {boolean}          brakeEngaged    Freio travado
     * @property {number}           winchSpeed      Velocidade do guincho (m/s)
     * @property {THREE.Mesh|null}  connectedBollard Cabeço ligado
     */
    rope: {
      status:           0,
      lengthL0:         10.0,
      tension:          0,
      k:                18,    // t/m — cabo HMPE: 5m stretch → 90t (prev: 200 → explodia)
      damping:          120,   // t·s/m — amortecimento crítico calibrado para mass=400t
      winchAction:      0,
      brakeEngaged:     true,
      winchSpeed:       2.0,
      connectedBollard: null,
    },

    meshes: {}, // preenchido por createTugboatMesh() em models.js
  };
}

// ─────────────────────────────────────────────────────────
// 2. FROTA — Dois rebocadores ASD
// ─────────────────────────────────────────────────────────

/**
 * Frota de 2 rebocadores indexada por ID.
 * startPos alinhado com os cabeços de reboque do Panamax:
 *   stern → x = -110 (cabeço de reboque da popa)
 *   bow   → x = +105 (cabeço de reboque da proa)
 *
 * @type {{ stern: TugObject, bow: TugObject }}
 */
export const tugs = {
  stern: {
    ...createTugData(),
    id:       'stern',
    color:    0xcc0000,                          // Vermelho
    startPos: new THREE.Vector2(-110, 45),       // Lado do mar, alinhado c/ popa
  },
  bow: {
    ...createTugData(),
    id:       'bow',
    color:    0x00cc00,                          // Verde
    startPos: new THREE.Vector2(105, 45),        // Lado do mar, alinhado c/ proa
  },
};
