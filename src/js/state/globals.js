/**
 * @file        src/js/state/globals.js
 * @description Estado global partilhado (singleton pattern via object mutation).
 *              Todos os módulos importam e mutam este objeto — nenhum módulo
 *              re-exporta state para outro, evitando dependências circulares.
 * @author      Jossian Brito <jossiancosta@gmail.com>
 * @version     2.0.0
 * @since       2026-03-28
 */

import * as THREE from 'three';

// ─────────────────────────────────────────────────────────
// 1. ESTADO DO MOTOR THREE.JS (referências nulas até init)
// ─────────────────────────────────────────────────────────

/**
 * Núcleo do motor 3D e meshes da cena.
 * Todas as propriedades são null no arranque e preenchidas por setupGraphics()
 * e buildWorld() antes do primeiro frame.
 * @type {Object}
 */
export const g = {
  // Three.js core
  scene:         null,
  camera:        null,
  renderer:      null,
  controls:      null,
  ambientLight:  null,

  // Meshes da cena
  merchantShip:    null,
  windsockFabric:  null,
  pier:            null,

  // Ponteiros do rebocador ATIVO (atualizados por switchTug)
  tugboat:         null,
  winchDrum:       null,
  ropeLine:        null,
  jetArrowBB:      null,
  jetArrowBE:      null,
  resultantArrow:  null,

  // Elementos DOM (atribuídos em init)
  uiCurrentCompass: null,
  uiCurrentArrow:   null,

  // Coleções da cena
  hitboxes:      [],  /** @type {THREE.Mesh[]} Hitboxes clicáveis */
  navLights:     [],  /** @type {THREE.PointLight[]} Luzes de navegação */
  pierBollards:  [],  /** @type {Array<{x:number, ref:THREE.Mesh}>} Cabeços do cais */

  // Controlo da frota
  activeTugId:    'stern',  /** @type {'stern'|'bow'} */
  isTwinControl:  false,

  // Ponteiros de estado do tug ativo (apontam para tugs[activeTugId].*)
  tugState:   null,
  thrusters:  null,
  ropeState:  null,

  // Temporização
  lastTime: 0,
};

// ─────────────────────────────────────────────────────────
// 2. ESTADO FÍSICO DO NAVIO MERCANTE (Panamax Dead-Ship)
// ─────────────────────────────────────────────────────────

/**
 * Estado cinemático e de controlo do navio mercante.
 * Posição em metros no plano (X, Z) — Z positivo = lado do mar.
 */
export const shipState = {
  position:        new THREE.Vector2(0, 11),
  velocity:        new THREE.Vector2(0, 0),
  heading:         0,           // radianos
  angularVelocity: 0,
  mass:            5000,        // toneladas simuladas
  inertia:         20_000_000,  // inércia proporcional escalada
  engineThrust:    0,           // -100 a +100 (% telegrafo)
  rudderAngle:     0,           // -35 a +35 graus
};

// ─────────────────────────────────────────────────────────
// 3. ESTADO METEOROLÓGICO E OCEÂNICO
// ─────────────────────────────────────────────────────────

/** Condições ambientais que afetam forças no rebocador e no navio. */
export const envState = {
  windMag:    0,      // nós
  windDir:    0,      // graus náuticos globais
  currentMag: 0,      // nós
  currentDir: 0,      // graus náuticos globais
  fogDensity: 0,      // 0–100 %
  lightsOn:   false,
};

// ─────────────────────────────────────────────────────────
// 4. LINHAS DE AMARRAÇÃO DO NAVIO AO CAIS
// ─────────────────────────────────────────────────────────

/**
 * 4 espias de amarração — Bombordo (cais).
 * shipRef e pierRef são preenchidos em buildWorld() e pairMooring().
 * @type {Array<{id:string, type:string, shipRef:THREE.Mesh|null,
 *               pierRef:THREE.Mesh|null, lengthL0:number, tension:number,
 *               active:boolean, ropeLine:THREE.Line|null, color:number}>}
 */
export const mooringLines = [
  { id: 'bow-head',    type: 'Lançante Proa',  shipRef: null, pierRef: null, lengthL0: 0, tension: 0, active: false, ropeLine: null, color: 0xffaa00 },
  { id: 'bow-spring',  type: 'Espringue Proa', shipRef: null, pierRef: null, lengthL0: 0, tension: 0, active: false, ropeLine: null, color: 0x00ffaa },
  { id: 'stern-spring',type: 'Espringue Popa', shipRef: null, pierRef: null, lengthL0: 0, tension: 0, active: false, ropeLine: null, color: 0x00aaff },
  { id: 'stern-head',  type: 'Lançante Popa',  shipRef: null, pierRef: null, lengthL0: 0, tension: 0, active: false, ropeLine: null, color: 0xff00aa },
];

// ─────────────────────────────────────────────────────────
// 5. OBJETOS DE RAYCASTING (reutilizados a cada frame)
// ─────────────────────────────────────────────────────────

export const raycaster    = new THREE.Raycaster();
export const mouse        = new THREE.Vector2();
export const pointerDownPos = new THREE.Vector2();
