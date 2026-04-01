/**
 * @file        src/js/physics/collision.js
 * @description Deteção e resolução de colisões físicas:
 *              Rebocador vs. Cais, Panamax vs. Cais,
 *              Rebocador vs. Panamax (SAT — Separating Axis Theorem).
 * @author      Jossian Brito <jossiancosta@gmail.com>
 * @version     2.0.0
 * @since       2026-03-28
 */

import { g, shipState } from '../state/globals.js';
import { tugs } from '../fleet/tugData.js';

// ─────────────────────────────────────────────────────────
// 1. FEEDBACK VISUAL DE COLISÃO
// ─────────────────────────────────────────────────────────

let crashTimeout = null;

/**
 * Exibe uma mensagem de colisão no HUD com fundo vermelho.
 * Repõe automaticamente ao fim de 3 segundos.
 *
 * @param {string} msg - Texto do aviso de colisão
 */
export function showCrashWarning(msg) {
  const msgEl = document.getElementById('status-message');
  msgEl.innerText        = msg;
  msgEl.style.display    = 'block';
  msgEl.style.background = 'rgba(239, 68, 68, 0.9)';

  if (crashTimeout) clearTimeout(crashTimeout);

  crashTimeout = setTimeout(() => {
    if (g.ropeState?.status === 2) {
      msgEl.style.display = 'none';
    } else {
      msgEl.style.background = 'rgba(234, 179, 8, 0.9)';
      msgEl.innerText        = 'Selecione o Cabeço no Cais';
    }
  }, 3000);
}

// ─────────────────────────────────────────────────────────
// 2. VERIFICAÇÃO DE COLISÕES (chamada a cada frame)
// ─────────────────────────────────────────────────────────

/** Face frontal do cais em coordenadas mundo (Z negativo = cais). */
const PIER_FACE_Z = -10;

/** Metade do comprimento do Panamax (225 m / 2). */
const SHIP_HALF_LENGTH = 225 / 2;

/** Metade da boca do Panamax (32 m / 2). */
const SHIP_HALF_BEAM = 32 / 2;

/** Raio de colisão simplificado do rebocador. */
const TUG_RADIUS = 14;

/**
 * Verifica e resolve todas as colisões do frame atual.
 * Deve ser chamado ao final de updatePhysics() a cada frame.
 * @param {number} dt Delta time simulado
 */
export function checkCollisions(dt = 0.016) {

  // ── A. Panamax vs. Cais (Física de 4 Cantos / OBB) ──────

  const cosNav = Math.cos(shipState.heading);
  const sinNav = Math.sin(shipState.heading);
  
  const corners = [
    { x: SHIP_HALF_LENGTH, z: SHIP_HALF_BEAM },
    { x: SHIP_HALF_LENGTH, z: -SHIP_HALF_BEAM },
    { x: -SHIP_HALF_LENGTH, z: SHIP_HALF_BEAM },
    { x: -SHIP_HALF_LENGTH, z: -SHIP_HALF_BEAM }
  ];

  let maxPenetration = 0;
  let isGrindingPier = false;

  corners.forEach(c => {
    // Vetor do centro do navio ao canto (Global)
    const rX = c.x * cosNav - c.z * sinNav;
    const rZ = c.x * sinNav + c.z * cosNav;
    
    const cX = shipState.position.x + rX;
    const cornerZ = shipState.position.y + rZ;
    
    // Calcula Z e mecânica consoante o ponto de contato (Defensas vs Betão)
    let effectivePierZ = PIER_FACE_Z; // -10 (Concreto bruto)
    let k_pier = 200000; // ton/m (Rigidez extrema do Betão)
    let d_pier = 100000; // ton/(m/s) (Amortecimento seco)
    
    const fenderBases = [-100, -30, 30, 100];
    const hitFender = fenderBases.some(fx => Math.abs(cX - fx) < 4); // raio 4m para apanhar as defensas de borracha
    
    if (hitFender) {
      effectivePierZ = -7; // Defensas saem 3m do cais de betão
      k_pier = 20000;      // Borracha esmaga e absorve choque melhor
      d_pier = 25000;      // Amortecimento viscoso fluido da defesa
    }
    
    if (cornerZ < effectivePierZ) {
      isGrindingPier = true;
      const penetration = effectivePierZ - cornerZ;
      if (penetration > maxPenetration) maxPenetration = penetration;
      
      const vCornerZ = shipState.velocity.y + rX * shipState.angularVelocity;
      
      let pushZ = k_pier * penetration;
      if (vCornerZ < 0) {
        pushZ -= d_pier * vCornerZ; 
      }
      
      if (pushZ < 0) pushZ = 0;
      
      shipState.velocity.y += (pushZ / shipState.mass) * dt;
      
      // Torque induzido = rX * Fz
      const pushTorque = rX * pushZ;
      shipState.angularVelocity += (pushTorque / shipState.inertia) * dt;
    }
  });

  if (isGrindingPier) {
    // Fricção massiva do casco contra o betão do cais impede deslizar infinitamente no eixo X
    shipState.velocity.x *= 0.95;
    shipState.angularVelocity *= 0.90; // Amortece rotação enquanto raspa
  }

  // Correção posicional seca para evitar que o visual atravesse o muro
  if (maxPenetration > 0) {
    shipState.position.y += maxPenetration * 0.8;
    if (Math.abs(shipState.velocity.y) > 0.05) {
      showCrashWarning('IMPACTO: Casco a roçar no Cais!');
    }
  }

  // ── B. Rebocadores vs. Cais e vs. Panamax ───────────────

  Object.values(tugs).forEach(tug => {
    const ts = tug.state;

    // B.1 Rebocador vs. Cais
    const tugReachZ =
      16 * Math.abs(Math.sin(ts.heading)) +
       6 * Math.abs(Math.cos(ts.heading));

    if (ts.position.y - tugReachZ < PIER_FACE_Z) {
      ts.position.y  = PIER_FACE_Z + tugReachZ;
      ts.velocity.y *= -0.2;
      if (Math.abs(ts.velocity.y) > 0.5) {
        showCrashWarning('IMPACTO: Rebocador bateu no Cais!');
      }
    }

    // B.2 Rebocador vs. Panamax — SAT (OBB vs. Círculo)
    const dx = ts.position.x - shipState.position.x;
    const dz = ts.position.y - shipState.position.y;

    const cosInv = Math.cos(-shipState.heading);
    const sinInv = Math.sin(-shipState.heading);

    // Transforma o centro do tug para o referencial local do navio
    const localX = dx * cosInv - dz * sinInv;
    const localZ = dx * sinInv + dz * cosInv;

    // Ponto mais próximo no AABB do navio (-hx..hx, -hz..hz)
    const cx = Math.max(-SHIP_HALF_LENGTH, Math.min(SHIP_HALF_LENGTH, localX));
    const cz = Math.max(-SHIP_HALF_BEAM,   Math.min(SHIP_HALF_BEAM,   localZ));

    const distSq = (localX - cx) ** 2 + (localZ - cz) ** 2;

    if (distSq < TUG_RADIUS ** 2 && distSq > 0.001) {
      const dist        = Math.sqrt(distSq);
      const penetration = TUG_RADIUS - dist;

      // Normal de separação no referencial local do navio
      const normLocalX = (localX - cx) / dist;
      const normLocalZ = (localZ - cz) / dist;

      // Transforma de volta para referencial global
      const cosH = Math.cos(shipState.heading);
      const sinH = Math.sin(shipState.heading);
      const normGlobalX = normLocalX * cosH - normLocalZ * sinH;
      const normGlobalZ = normLocalX * sinH + normLocalZ * cosH;

      // Empurra o rebocador para fora do casco (impede travessia visual)
      ts.position.x += normGlobalX * penetration;
      ts.position.y += normGlobalZ * penetration;

      // [TAG: TUG-PUSH-HULL] Trata a Força de Empurre contínua pelas defensas
      const fenderStiffness = 65000; // rigidez das defensas cilíndricas maciças do casco (ton/m)
      const pushForce = fenderStiffness * penetration;
      
      const pushX = normGlobalX * pushForce;
      const pushZ = normGlobalZ * pushForce;
      
      // Injeciona F=m*a acelerativo instantâneo na massa total de 65.000t do Panamax
      // A normal (normGlobal) aponta do navio PARA o rebocador. Portanto a força NO navio
      // deve empurrá-lo no sentido OPOSTO (-pushX, -pushZ).
      shipState.velocity.x -= (pushX / shipState.mass) * dt;
      shipState.velocity.y -= (pushZ / shipState.mass) * dt;
      
      // Torque indutivo gerado pelo empurrão, convertendo braço r ao centro do navio
      const rGlobalX = cx * cosH - cz * sinH;
      const rGlobalZ = cx * sinH + cz * cosH;
      const pushTorque = (rGlobalX * pushZ) - (rGlobalZ * pushX);
      
      // Como a força aplicada no navio é inversa, o indutor do torque inverte o sinal
      shipState.angularVelocity -= (pushTorque / shipState.inertia) * dt;

      // Ricochete inelástico para subtrair momento do rebocador em grandes embalos
      const vDotN = ts.velocity.x * normGlobalX + ts.velocity.y * normGlobalZ;
      if (vDotN < 0) {
        ts.velocity.x -= 1.2 * vDotN * normGlobalX;
        ts.velocity.y -= 1.2 * vDotN * normGlobalZ;
        if (Math.abs(vDotN) > 0.5) {
          showCrashWarning('ALERTA: Colisão Transversal Pesada!');
        }
      }
    }

    // ── C. Rebocador vs. Boias Náuticas ─────────────────

    if (g.buoys) {
      g.buoys.forEach(b => {
        const bdx  = ts.position.x - b.position.x;
        const bdz  = ts.position.y - b.position.z;
        const bDist = Math.hypot(bdx, bdz);
        const minDist = b.radius + TUG_RADIUS;

        if (bDist < minDist && bDist > 0.01) {
          // Resolve penetração — empurra o rebocador para fora da boia
          const penetration = minDist - bDist;
          const nx = bdx / bDist;
          const nz = bdz / bDist;

          ts.position.x += nx * penetration;
          ts.position.y += nz * penetration;

          // Impulso de ricochete amortecido
          const vDotN = ts.velocity.x * nx + ts.velocity.y * nz;
          if (vDotN < 0) {
            ts.velocity.x -= 1.3 * vDotN * nx;
            ts.velocity.y -= 1.3 * vDotN * nz;
            if (Math.abs(vDotN) > 0.3) {
              showCrashWarning('⚠️ BOIA ATINGIDA! Atenção à Sinalização!');
            }
          }
        }
      });
    }
  });
}
