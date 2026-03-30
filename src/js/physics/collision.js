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
 */
export function checkCollisions() {

  // ── A. Panamax vs. Cais ─────────────────────────────────

  const shipReachZ =
    SHIP_HALF_LENGTH * Math.abs(Math.sin(shipState.heading)) +
    SHIP_HALF_BEAM   * Math.abs(Math.cos(shipState.heading));

  if (shipState.position.y - shipReachZ < PIER_FACE_Z) {
    shipState.position.y = PIER_FACE_Z + shipReachZ;
    shipState.velocity.y *= -0.1;
    if (Math.abs(shipState.velocity.y) > 0.1) {
      showCrashWarning('IMPACTO: Panamax no Cais!');
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

      // Empurra o rebocador para fora do casco
      ts.position.x += normGlobalX * penetration;
      ts.position.y += normGlobalZ * penetration;

      // Reflexão da velocidade (impacto inelástico)
      const vDotN = ts.velocity.x * normGlobalX + ts.velocity.y * normGlobalZ;
      if (vDotN < 0) {
        ts.velocity.x -= 1.2 * vDotN * normGlobalX;
        ts.velocity.y -= 1.2 * vDotN * normGlobalZ;
        if (Math.abs(vDotN) > 0.5) {
          showCrashWarning('ALERTA: Colisão Transversal!');
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
