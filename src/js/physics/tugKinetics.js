/**
 * @file        src/js/physics/tugKinetics.js
 * @description Integrador físico principal — propulsores azimutais, cabo HMPE
 *              (mola-amortecedor), drag hidrodinâmico, vento, corrente oceânica,
 *              governo do Panamax (motor + leme) e amarrações ao cais.
 *              Chamado a cada frame com dt (delta time em segundos).
 * @author      Jossian Brito <jossiancosta@gmail.com>
 * @version     2.0.0
 * @since       2026-03-28
 */

import * as THREE from 'three';
import { g, shipState, envState, mooringLines } from '../state/globals.js';
import { tugs } from '../fleet/tugData.js';
import { checkCollisions } from './collision.js';

// ─────────────────────────────────────────────────────────
// 1. CONSTANTES FÍSICAS
// ─────────────────────────────────────────────────────────

/** Força máxima de cada thruster (100% → thrustMultiplier N). */
const THRUST_MULTIPLIER = 600;

/** Boost do binário de guinada (yaw) para os propulsores azimutais. */
const STEERING_BOOST = 2.5;

/** Coeficientes de drag local (por segundo). 1.0 = sem drag, 0.0 = para imediatamente. */
const TUG_DRAG = { surge: 0.90, sway: 0.10, angular: 0.60 };
const SHIP_DRAG = { surge: 0.99, sway: 0.50, angular: 0.40 };

// ─────────────────────────────────────────────────────────
// 2. INTEGRADOR PRINCIPAL
// ─────────────────────────────────────────────────────────

/**
 * Atualiza toda a física da simulação para um passo de tempo dt.
 * Ordem:
 *   1. Sinc. Twin Control
 *   2. Física dos rebocadores (cabo, thrusters, drag, corrente)
 *   3. Posições finais dos rebocadores
 *   4. Física das amarrações fixas ao cais
 *   5. Governo do Panamax (motor + leme)
 *   6. Integração e posição do Panamax
 *   7. Deteção de colisões
 *   8. Atualização da telemetria UI
 *
 * @param {number} dt - Delta time em segundos (limitado a 0.1 s)
 */
export function updatePhysics(dt) {
  if (dt > 0.1) dt = 0.1; // estabilidade numérica mínima a 10 FPS

  // ── 1. Twin Control (BB espelha para BE) ──────────────

  if (g.isTwinControl && g.thrusters) {
    g.thrusters.be.thrust = g.thrusters.bb.thrust;
    g.thrusters.be.angle  = g.thrusters.bb.angle;

    const stickBE  = document.getElementById('stick-be');
    const sliderBE = document.getElementById('slider-be');
    if (stickBE && sliderBE) {
      stickBE.style.transform = document.getElementById('stick-bb').style.transform;
      sliderBE.value          = document.getElementById('slider-bb').value;
    }
  }

  // ── 2. Corrente Oceânica (vetor global) ───────────────

  const curRads = envState.currentDir * Math.PI / 180;
  const curX = (envState.currentMag * 0.5144) * Math.cos(curRads);
  const curZ = (envState.currentMag * 0.5144) * Math.sin(curRads);

  // Forças acumuladas para o Panamax (somadas por rebocadores e amarrações)
  let shipForceGlobal = new THREE.Vector2(0, 0);
  let shipTorque      = 0;

  // ── 3. Física de cada Rebocador ───────────────────────

  Object.values(tugs).forEach(tug => {
    const tState    = tug.state;
    const tThrusters = tug.thrusters;
    const tRope     = tug.rope;
    const tMeshes   = tug.meshes;

    let tugForceX = 0;
    let tugForceZ = 0;
    let tugTorque = 0;
    let ropeForce = new THREE.Vector2(0, 0); // Força do cabo no referencial global

    // ── 3a. Física do Cabo HMPE (Mola-Amortecedor) ──────

    if (tRope.status === 2 && tRope.connectedBollard) {
      // Atuação do guincho (Heave / Pay)
      if (tRope.winchAction ===  1) tRope.lengthL0 -= tRope.winchSpeed * dt;
      if (tRope.winchAction === -1) tRope.lengthL0 += tRope.winchSpeed * dt;
      if (tRope.lengthL0 < 0) tRope.lengthL0 = 0;

      const winchPos = new THREE.Vector3();
      if (tMeshes.winchDrum) tMeshes.winchDrum.getWorldPosition(winchPos);

      const bolPos = new THREE.Vector3();
      tRope.connectedBollard.getWorldPosition(bolPos);

      const dx = bolPos.x - winchPos.x;
      const dz = bolPos.z - winchPos.z;
      const distance = Math.hypot(dx, dz);

      // Freio solto → comprimento frouxo acompanha a distância
      if (!tRope.brakeEngaged && distance > tRope.lengthL0) {
        tRope.lengthL0 = distance;
      }

      if (distance > tRope.lengthL0 && tRope.lengthL0 > 0) {
        const stretch = distance - tRope.lengthL0;

        // Velocidade do ponto de ligação no guincho (referencial global)
        const cosH = Math.cos(tState.heading);
        const sinH = Math.sin(tState.heading);
        const rX = 12 * cosH; // braço do guincho (x=12 local)
        const rZ = 12 * sinH;
        const vWinchX = tState.velocity.x + rZ * tState.angularVelocity;
        const vWinchZ = tState.velocity.y - rX * tState.angularVelocity;

        // Velocidade do cabeço (dinâmico se estiver no navio)
        let vBolX = 0, vBolZ = 0, bRX = 0, bRZ = 0;
        if (tRope.connectedBollard.userData?.isDynamic) {
          const bPos = tRope.connectedBollard.position;
          const sCosH = Math.cos(shipState.heading);
          const sSinH = Math.sin(shipState.heading);
          bRX = bPos.x * sCosH - bPos.z * sSinH;
          bRZ = bPos.x * sSinH + bPos.z * sCosH;
          vBolX = shipState.velocity.x + bRZ * shipState.angularVelocity;
          vBolZ = shipState.velocity.y - bRX * shipState.angularVelocity;
        }

        const dirX = dx / distance;
        const dirZ = dz / distance;
        const vStretch = (vBolX - vWinchX) * dirX + (vBolZ - vWinchZ) * dirZ;

        let tension = tRope.k * stretch + tRope.damping * vStretch;
        if (tension < 0) tension = 0;
        tRope.tension = tension;

        ropeForce.set(dirX * tension, dirZ * tension);

        // Aplica reação ao Panamax (Newton III)
        if (tRope.connectedBollard.userData?.isDynamic) {
          const sForX = -ropeForce.x;
          const sForZ = -ropeForce.y;
          shipForceGlobal.x += sForX;
          shipForceGlobal.y += sForZ;
          shipTorque += bRZ * sForX - bRX * sForZ;
        }

        // Torque no rebocador pelo cabo
        tugTorque += rZ * ropeForce.x - rX * ropeForce.y;
      } else {
        tRope.tension = 0;
      }

    } else {
      tRope.tension = 0;
    }

    // ── 3b. Física dos Propulsores Azimutais ─────────────

    ['bb', 'be'].forEach(side => {
      const t = tThrusters[side];
      const arrow = side === 'bb' ? tMeshes.jetArrowBB : tMeshes.jetArrowBE;

      if (t.thrust > 0) {
        const force = t.thrust * THRUST_MULTIPLIER;
        const fX = force * Math.cos(t.angle);
        const fZ = force * Math.sin(t.angle);

        tugForceX += fX;
        tugForceZ += fZ;
        // Binário = r × F (braço de popa)
        tugTorque += (t.pos.z * fX - t.pos.x * fZ) * STEERING_BOOST;

        if (arrow) {
          arrow.setDirection(new THREE.Vector3(-Math.cos(t.angle), 0, -Math.sin(t.angle)).normalize());
          arrow.setLength(t.thrust * 12);
          arrow.visible = true;
        }
      } else {
        if (arrow) arrow.visible = false;
      }
    });

    // Seta resultante
    if (tMeshes.resultantArrow) {
      const mag = Math.hypot(tugForceX, tugForceZ);
      if (mag > 0) {
        tMeshes.resultantArrow.setDirection(new THREE.Vector3(tugForceX, 0, tugForceZ).normalize());
        tMeshes.resultantArrow.setLength(mag / 4);
        tMeshes.resultantArrow.visible = true;
      } else {
        tMeshes.resultantArrow.visible = false;
      }
    }

    // ── 3c. Força do Vento no Rebocador ──────────────────

    const windRads = envState.windDir * Math.PI / 180;
    const windMps  = envState.windMag * 0.5144;
    const wX = windMps * Math.cos(windRads);
    const wZ = windMps * Math.sin(windRads);

    const cosH = Math.cos(tState.heading);
    const sinH = Math.sin(tState.heading);
    const cWx = wX * cosH + wZ * sinH;
    const cWz = -wX * sinH + wZ * cosH;
    const tWX = (0.00006 * 60  * cWx * Math.abs(cWx)) * cosH - (0.00006 * 150 * cWz * Math.abs(cWz)) * sinH;
    const tWZ = (0.00006 * 60  * cWx * Math.abs(cWx)) * sinH + (0.00006 * 150 * cWz * Math.abs(cWz)) * cosH;

    // ── 3d. Integração do Rebocador ───────────────────────

    // Força local → global
    const gFX = (tugForceX * cosH + tugForceZ * sinH) + ropeForce.x + tWX;
    const gFZ = (-tugForceX * sinH + tugForceZ * cosH) + ropeForce.y + tWZ;

    tState.velocity.x        += (gFX / tState.mass) * dt;
    tState.velocity.y        += (gFZ / tState.mass) * dt;
    tState.angularVelocity   += (tugTorque / tState.inertia) * dt;

    // Drag hidrodinâmico no referencial local
    const vRelX    = tState.velocity.x - curX;
    const vRelZ    = tState.velocity.y - curZ;
    const vLocalX  = vRelX * cosH + vRelZ * sinH;
    const vLocalZ  = -vRelX * sinH + vRelZ * cosH;

    const dampedLX = vLocalX * Math.pow(TUG_DRAG.surge,   dt);
    const dampedLZ = vLocalZ * Math.pow(TUG_DRAG.sway,    dt);
    tState.velocity.x        = (dampedLX * cosH - dampedLZ * sinH) + curX;
    tState.velocity.y        = (dampedLX * sinH + dampedLZ * cosH) + curZ;
    tState.angularVelocity  *= Math.pow(TUG_DRAG.angular, dt);
  });

  // ── 4. Atualiza posições e meshes dos rebocadores ─────

  Object.values(tugs).forEach(tug => {
    const ts = tug.state;
    ts.position.x += ts.velocity.x * dt;
    ts.position.y += ts.velocity.y * dt;
    ts.heading    += ts.angularVelocity * dt;

    if (tug.meshes?.tugboat) {
      tug.meshes.tugboat.position.x = ts.position.x;
      tug.meshes.tugboat.position.z = ts.position.y;
      tug.meshes.tugboat.rotation.y = ts.heading;
    }
  });

  // ── 5. Física das Amarrações Fixas ao Cais ────────────

  const m_cosH = Math.cos(shipState.heading);
  const m_sinH = Math.sin(shipState.heading);

  mooringLines.forEach(line => {
    if (!line.active || !line.shipRef || !line.pierRef) return;

    const bLocal   = line.shipRef.position.clone();
    const bGlobal_rX = bLocal.x * m_cosH - bLocal.z * m_sinH;
    const bGlobal_rZ = bLocal.x * m_sinH + bLocal.z * m_cosH;

    const bGlobalPos = new THREE.Vector3(
      shipState.position.x + bGlobal_rX,
      0,
      shipState.position.y + bGlobal_rZ
    );

    const pierPos = new THREE.Vector3();
    line.pierRef.getWorldPosition(pierPos);

    const dist = bGlobalPos.distanceTo(pierPos);

    if (dist > line.lengthL0) {
      const stretch = dist - line.lengthL0;
      const dirX = (pierPos.x - bGlobalPos.x) / dist;
      const dirZ = (pierPos.z - bGlobalPos.z) / dist;

      const vBolX = shipState.velocity.x + bGlobal_rZ * shipState.angularVelocity;
      const vBolZ = shipState.velocity.y - bGlobal_rX * shipState.angularVelocity;
      const vStretch = (0 - vBolX) * dirX + (0 - vBolZ) * dirZ; // cais estático

      let tension = 200 * stretch + 400 * vStretch;
      if (tension < 0) tension = 0;
      line.tension = tension;

      if (tension > 0) {
        shipForceGlobal.x += dirX * tension;
        shipForceGlobal.y += dirZ * tension;
        shipTorque += bGlobal_rZ * (dirX * tension) - bGlobal_rX * (dirZ * tension);
      }
    } else {
      line.tension = 0;
    }
  });

  // ── 6. Governo do Panamax (Motor + Leme) ──────────────

  const sCosH = Math.cos(shipState.heading);
  const sSinH = Math.sin(shipState.heading);

  // Motor (empurra no eixo longitudinal)
  shipForceGlobal.x += shipState.engineThrust * sCosH;
  shipForceGlobal.y += shipState.engineThrust * sSinH;

  // Leme (força lateral na popa)
  if (Math.abs(shipState.rudderAngle) > 0.1) {
    const speed = Math.max(Math.abs(shipState.engineThrust), Math.abs(shipState.velocity.x * 20));
    const fRudderLZ = 0.5 * speed * Math.sin(shipState.rudderAngle * Math.PI / 180);
    shipForceGlobal.x += fRudderLZ * -sSinH;
    shipForceGlobal.y += fRudderLZ *  sCosH;
    const stern_rX = -110 * sCosH;
    const stern_rZ = -110 * sSinH;
    shipTorque += stern_rZ * (fRudderLZ * -sSinH) - stern_rX * (fRudderLZ * sCosH);
  }

  // Força do Vento no navio
  const windRads = envState.windDir * Math.PI / 180;
  const windMps  = envState.windMag * 0.5144;
  const swFx = 0.00006 * 1000 * (windMps * Math.cos(windRads) * sCosH + windMps * Math.sin(windRads) * sSinH);
  const swFz = 0.00006 * 6000 * (-windMps * Math.cos(windRads) * sSinH + windMps * Math.sin(windRads) * sCosH);
  shipForceGlobal.x += swFx * sCosH - swFz * sSinH;
  shipForceGlobal.y += swFx * sSinH + swFz * sCosH;

  // ── 7. Integração e Drag do Panamax ───────────────────

  shipState.velocity.x      += (shipForceGlobal.x / shipState.mass) * dt;
  shipState.velocity.y      += (shipForceGlobal.y / shipState.mass) * dt;
  shipState.angularVelocity += (shipTorque         / shipState.inertia) * dt;

  const sVRelX   = shipState.velocity.x - curX;
  const sVRelZ   = shipState.velocity.y - curZ;
  const sLocalX  = sVRelX * sCosH + sVRelZ * sSinH;
  const sLocalZ  = -sVRelX * sSinH + sVRelZ * sCosH;

  const sDampLX  = sLocalX * Math.pow(SHIP_DRAG.surge,   dt);
  const sDampLZ  = sLocalZ * Math.pow(SHIP_DRAG.sway,    dt);
  shipState.velocity.x      = (sDampLX * sCosH - sDampLZ * sSinH) + curX;
  shipState.velocity.y      = (sDampLX * sSinH + sDampLZ * sCosH) + curZ;
  shipState.angularVelocity *= Math.pow(SHIP_DRAG.angular, dt);

  shipState.position.x += shipState.velocity.x * dt;
  shipState.position.y += shipState.velocity.y * dt;
  shipState.heading    += shipState.angularVelocity * dt;

  if (g.merchantShip) {
    g.merchantShip.position.x = shipState.position.x;
    g.merchantShip.position.z = shipState.position.y;
    g.merchantShip.rotation.y = shipState.heading;
  }

  // ── 8. Colisões ───────────────────────────────────────

  checkCollisions();

  // ── 9. Telemetria HUD ─────────────────────────────────

  if (!g.ropeState) return;

  document.getElementById('ui-tension').innerText = g.ropeState.tension.toFixed(1) + ' t';
  document.getElementById('ui-length').innerText  = g.ropeState.lengthL0.toFixed(1) + ' m';

  const tensionEl = document.getElementById('ui-tension');
  if      (g.ropeState.tension > 90) tensionEl.style.color = 'var(--danger-color)';
  else if (g.ropeState.tension > 45) tensionEl.style.color = '#eab308';
  else                               tensionEl.style.color = 'var(--safe-color)';

  ['bb', 'be'].forEach(side => {
    if (!g.thrusters) return;
    const t   = g.thrusters[side];
    const rpm = Math.round(t.thrust * 100);
    let deg   = ((t.angle * 180 / Math.PI) % 360 + 360) % 360;
    const hud = document.getElementById(`hud-${side}`);
    if (hud) hud.innerText = `${side.toUpperCase()} | ${String(rpm).padStart(3, '0')}% | ${String(Math.round(deg)).padStart(3, '0')}°`;
  });
}
