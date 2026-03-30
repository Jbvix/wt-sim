/**
 * @file        src/js/graphics/buoys.js
 * @description Boias náuticas de canal (CEVNI): geometria 3D e física de
 *              inclinação por vento e corrente.
 *              - 3 Boias Verdes  → Bombordo (esquerda do canal de entrada)
 *              - 3 Boias Encarnadas → Estibordo (direita do canal de entrada)
 *
 *              Modelo físico de inclinação:
 *              A força resultante (corrente dominante + 30% do vento) inclina
 *              o pivot da boia na direção do fluxo. A inclinação máxima é ~55°
 *              (π × 0.31 rad), atingida com ventos/correntes de ~6 m/s (≈11 kn).
 *              A transição é suavizada por interpolação linear exponencial.
 *
 * @author      Jossian Brito <jossiancosta@gmail.com>
 * @version     2.0.0
 * @since       2026-03-29
 */

import * as THREE from 'three';
import { g, envState } from '../state/globals.js';

// ─────────────────────────────────────────────────────────
// 1. DEFINIÇÃO DAS BOIAS
// ─────────────────────────────────────────────────────────

/** @type {Array<{id:string, color:number, topColor:number, x:number, z:number}>} */
const BUOY_DEFS = [
  // Verdes — Bombordo (lado esquerdo do canal de entrada)
  { id: 'green-1', color: 0x00bb44, topColor: 0x00ff66, x: -120, z: 55 },
  { id: 'green-2', color: 0x00bb44, topColor: 0x00ff66, x:    0, z: 55 },
  { id: 'green-3', color: 0x00bb44, topColor: 0x00ff66, x:  120, z: 55 },
  // Encarnadas — Estibordo (lado direito do canal de entrada)
  { id: 'red-1',   color: 0xcc1111, topColor: 0xff3333, x: -120, z: 75 },
  { id: 'red-2',   color: 0xcc1111, topColor: 0xff3333, x:    0, z: 75 },
  { id: 'red-3',   color: 0xcc1111, topColor: 0xff3333, x:  120, z: 75 },
];

// ─────────────────────────────────────────────────────────
// 2. CONSTANTES FÍSICAS DE INCLINAÇÃO
// ─────────────────────────────────────────────────────────

/** Coeficiente de inclinação: rad / (m/s). 1 m/s ≈ 18°. */
const TILT_K = 0.32;

/** Inclinação máxima ≈ 55° (quase horizontal em condições extremas). */
const MAX_TILT = Math.PI * 0.31;

/** Velocidade de interpolação da inclinação (mais alto = mais ágil). */
const LERP_SPEED = 1.5;

/** Peso relativo do vento vs. corrente no cálculo da inclinação. */
const WIND_WEIGHT = 0.30;

// ─────────────────────────────────────────────────────────
// 3. FACTORY — Geometria 3D de uma Boia
// ─────────────────────────────────────────────────────────

/**
 * Constrói um Group Three.js representando uma boia náutica de canal CEVNI.
 * A boia é composta por:
 *  - Corrente de ancoragem (desce 6 m ao fundo)
 *  - Pivot group (inclina com vento/corrente)
 *    ├─ Corpo cônico invertido (ponta em baixo — padrão CEVNI)
 *    ├─ Faixa branca de identificação (a meio do cone)
 *    └─ Topo esférico reflexivo (visível a grande distância)
 *
 * @param {object} def - Definição da boia (id, color, topColor, x, z)
 * @returns {{ mesh: THREE.Group, pivot: THREE.Group }}
 */
function buildBuoyMesh(def) {
  const group = new THREE.Group();

  // ── Corrente de Ancoragem ────────────────────────────
  const chain = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0x777777 })
  );
  chain.position.y = -3; // Centro a -3 m ⟹ cobre de -6 m a 0 m
  group.add(chain);

  // ── Pivot (parte que inclina) ────────────────────────
  const pivot = new THREE.Group();
  group.add(pivot);

  // Corpo cônico invertido (ponta em baixo)
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(1.8, 4.5, 12),
    new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.4, metalness: 0.3 })
  );
  body.rotation.x = Math.PI;  // Inverte: ponta virada para baixo
  body.position.y = 2.25;     // Centro do cone a 2.25 m acima da água
  body.castShadow = true;
  pivot.add(body);

  // Faixa branca de identificação
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(1.85, 1.4, 0.55, 12),
    new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.6 })
  );
  band.position.y = 2.5;
  pivot.add(band);

  // Topo esférico (reflexivo — visível a distância)
  const top = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 12, 12),
    new THREE.MeshStandardMaterial({ color: def.topColor, roughness: 0.2, metalness: 0.6 })
  );
  top.position.y = 4.8;
  top.castShadow = true;
  pivot.add(top);

  group.position.set(def.x, 0, def.z);
  return { mesh: group, pivot };
}

// ─────────────────────────────────────────────────────────
// 4. INICIALIZAÇÃO — Popula g.buoys e adiciona à cena
// ─────────────────────────────────────────────────────────

/**
 * Cria as 6 boias náuticas e adiciona-as à cena Three.js.
 * Deve ser chamado no final de buildWorld().
 */
export function createBuoys() {
  BUOY_DEFS.forEach(def => {
    const { mesh, pivot } = buildBuoyMesh(def);
    g.scene.add(mesh);
    g.buoys.push({
      id:       def.id,
      position: { x: def.x, z: def.z },
      pivot,
      mesh,
      radius:   3.0,  // Raio de colisão (m)
    });
  });
}

// ─────────────────────────────────────────────────────────
// 5. ATUALIZAÇÃO — Física de Inclinação (chamada por frame)
// ─────────────────────────────────────────────────────────

/**
 * Atualiza a inclinação de todas as boias com base nas condições ambientais.
 * Deve ser chamado em updatePhysics(dt) antes de checkCollisions().
 *
 * Modelo físico simplificado:
 *   F_total = V_corrente + WIND_WEIGHT × V_vento
 *   tilt_X  = clamp( F_totalZ × TILT_K, -MAX_TILT, MAX_TILT )
 *   tilt_Z  = clamp(-F_totalX × TILT_K, -MAX_TILT, MAX_TILT )
 *
 * @param {number} dt - Delta time em segundos
 */
export function updateBuoys(dt) {
  if (!g.buoys || g.buoys.length === 0) return;

  // Vetor de vento (m/s) no referencial global
  const windRads = envState.windDir * Math.PI / 180;
  const windMps  = envState.windMag * 0.5144;
  const windX = windMps * Math.cos(windRads);
  const windZ = windMps * Math.sin(windRads);

  // Vetor de corrente (m/s) no referencial global
  const curRads = envState.currentDir * Math.PI / 180;
  const curMps  = envState.currentMag * 0.5144;
  const curX = curMps * Math.cos(curRads);
  const curZ = curMps * Math.sin(curRads);

  // Força resultante combinada (corrente domina; vento contribui WIND_WEIGHT)
  const fX = curX + windX * WIND_WEIGHT;
  const fZ = curZ + windZ * WIND_WEIGHT;

  // Interpolação exponencial (lerp) para transição suave
  const alpha = Math.min(1, LERP_SPEED * dt);

  g.buoys.forEach(b => {
    // Força em Z → inclina em X; Força em X → inclina em Z (produto vetorial 2D)
    const targetTiltX = Math.max(-MAX_TILT, Math.min(MAX_TILT,  fZ * TILT_K));
    const targetTiltZ = Math.max(-MAX_TILT, Math.min(MAX_TILT, -fX * TILT_K));

    b.pivot.rotation.x += (targetTiltX - b.pivot.rotation.x) * alpha;
    b.pivot.rotation.z += (targetTiltZ - b.pivot.rotation.z) * alpha;
  });
}
