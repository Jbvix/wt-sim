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
import { g, shipState, envState, mooringLines, devConfig } from '../state/globals.js';
import { tugs } from '../fleet/tugData.js';
import { checkCollisions } from './collision.js';
import { updateBuoys } from '../graphics/buoys.js';

// ─────────────────────────────────────────────────────────
// 1. CONSTANTES FÍSICAS
// ─────────────────────────────────────────────────────────

/** Força máxima de cada thruster (Bollard Pull Base x Multiplicador Real-time) */
// (Descartado: const THRUST_MULTIPLIER = 600) -> Substituído por devConfig.tugThrustMultiplier

/** Boost do binário de guinada (yaw) para os propulsores azimutais. */
const STEERING_BOOST = 2.5;

/** Coeficientes de drag local (por segundo). 1.0 = sem drag, 0.0 = para imediatamente. */
const TUG_DRAG = { surge: 0.90, sway: 0.10, angular: 0.60 };
const SHIP_DRAG = { surge: 0.99, sway: 0.95, angular: 0.98 }; // Drag orgânico de Navios (Não afundam no mel)

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
        const vWinchX = tState.velocity.x - rZ * tState.angularVelocity;
        const vWinchZ = tState.velocity.y + rX * tState.angularVelocity;

        // Velocidade do cabeço (dinâmico se estiver no navio)
        let vBolX = 0, vBolZ = 0, bRX = 0, bRZ = 0;
        if (tRope.connectedBollard.userData?.isDynamic) {
          const bPos = tRope.connectedBollard.position;
          const sCosH = Math.cos(shipState.heading);
          const sSinH = Math.sin(shipState.heading);
          bRX = bPos.x * sCosH - bPos.z * sSinH;
          bRZ = bPos.x * sSinH + bPos.z * sCosH;
          vBolX = shipState.velocity.x - bRZ * shipState.angularVelocity;
          vBolZ = shipState.velocity.y + bRX * shipState.angularVelocity;
        }

        const dirX = dx / distance;
        const dirZ = dz / distance;
        const vStretch = (vBolX - vWinchX) * dirX + (vBolZ - vWinchZ) * dirZ;

        let tension = tRope.k * stretch + tRope.damping * vStretch;
        if (tension < 0) tension = 0;
        if (tension > devConfig.ropeBreak) tension = devConfig.ropeBreak; // CAP: carga de rotura HMPE em tempo real
        tRope.tension = tension;

        ropeForce.set(dirX * tension, dirZ * tension);

        // Aplica reação ao Panamax (Newton III) -> T = Rx*Fz - Rz*Fx
        if (tRope.connectedBollard.userData?.isDynamic) {
          const sForX = -ropeForce.x;
          const sForZ = -ropeForce.y;
          shipForceGlobal.x += sForX;
          shipForceGlobal.y += sForZ;
          shipTorque += bRX * sForZ - bRZ * sForX;
        }

        // Torque no rebocador pelo cabo (Rx*Fz - Rz*Fx)
        tugTorque += rX * ropeForce.y - rZ * ropeForce.x;
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
        // Cada Thruster impulsiona até 80-100% * Multiplicador
        const force = t.thrust * devConfig.tugThrustMultiplier * 100; // Se thrustMultiplier=0.8 e t.thrust=1.0 -> 80 Ton-Force
        const fX = force * Math.cos(t.angle);
        const fZ = force * Math.sin(t.angle);

        tugForceX += fX;
        tugForceZ += fZ;
        // Binário = r × F (braço de popa) -> T = Rx*Fz - Rz*Fx
        tugTorque += (t.pos.x * fZ - t.pos.z * fX) * STEERING_BOOST;

        if (arrow) {
          arrow.setDirection(new THREE.Vector3(Math.cos(t.angle), 0, Math.sin(t.angle)).normalize());
          arrow.setLength(t.thrust * 12, 3, 2); // Mantém a cabeça da seta estática (visível) mesmo sob pouco Thrust
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
        tMeshes.resultantArrow.setLength(mag / 12, 4, 3); // Reduzida significativamente a poluição visual geométrica
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

    // Velocidades correntes locais
    const vRelInitX   = tState.velocity.x - curX;
    const vRelInitZ   = tState.velocity.y - curZ;
    const vLocalInitX = vRelInitX * cosH + vRelInitZ * sinH;
    const vLocalInitZ = -vRelInitX * sinH + vRelInitZ * cosH;

    // FÍSICA DO SKEG (Estabilidade Direcional ASD)
    const skegX = 12.0; // Distância do Skeg ao CG (+X, Proa)
    const vSkegLocalZ = vLocalInitZ + skegX * tState.angularVelocity;
    // Arrasto brutal focado na proa (Impede "patinar no gelo" e alinha com a rota)
    const skegForceZ = -devConfig.tugSkegReact * vSkegLocalZ * Math.abs(vSkegLocalZ);

    tugForceZ += skegForceZ;
    tugTorque += skegX * skegForceZ;

    // Força local → global. CORREÇÃO NA MATRIZ: R(h)*F_local
    const gFX = (tugForceX * cosH - tugForceZ * sinH) + ropeForce.x + tWX;
    const gFZ = (tugForceX * sinH + tugForceZ * cosH) + ropeForce.y + tWZ;

    tState.velocity.x        += (gFX / tState.mass) * dt;
    tState.velocity.y        += (gFZ / tState.mass) * dt;
    tState.angularVelocity   += (tugTorque / tState.inertia) * dt;

    // Drag hidrodinâmico restante (casco normal)
    const vRelX    = tState.velocity.x - curX;
    const vRelZ    = tState.velocity.y - curZ;
    // vLocal = R(-h)*vGlobal (Inverso)
    const vLocalX  = vRelX * cosH + vRelZ * sinH;
    const vLocalZ  = -vRelX * sinH + vRelZ * cosH;

    const dampedLX = vLocalX * Math.pow(TUG_DRAG.surge,   dt);
    const dampedLZ = vLocalZ * Math.pow(TUG_DRAG.sway,    dt);
    // Volta a converter a velocidade amortecida para Global: R(h)*vLocal_amortecido
    tState.velocity.x        = (dampedLX * cosH - dampedLZ * sinH) + curX;
    tState.velocity.y        = (dampedLX * sinH + dampedLZ * cosH) + curZ;
    tState.angularVelocity  *= Math.pow(devConfig.tugDragRot, dt);
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
      tug.meshes.tugboat.rotation.y = -ts.heading;
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

      const vBolX = shipState.velocity.x - bGlobal_rZ * shipState.angularVelocity;
      const vBolZ = shipState.velocity.y + bGlobal_rX * shipState.angularVelocity;
      const vStretch = (0 - vBolX) * dirX + (0 - vBolZ) * dirZ; // cais estático

      let tension = 60 * stretch + 250 * vStretch; // k=60 t/m, damp=250 — prev: 400/800 (explodia)
      if (tension < 0) tension = 0;
      if (tension > 350) tension = 350;             // CAP: carga de rotura espia HMPE
      line.tension = tension;

      if (tension > 0) {
        shipForceGlobal.x += dirX * tension;
        shipForceGlobal.y += dirZ * tension;
        shipTorque += bGlobal_rX * (dirZ * tension) - bGlobal_rZ * (dirX * tension);
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
    shipTorque += stern_rX * (fRudderLZ * sCosH) - stern_rZ * (fRudderLZ * -sSinH);
  }

  // Força do Vento no navio (Deriva Aerodinâmica Quadrática F = 1/2 * rho * Cd * A * V^2 / 1000)
  const windRads = envState.windDir * Math.PI / 180;
  const windMps  = envState.windMag * 0.5144;
  
  // Velocidade local relativa do vento
  const loc_Wx = windMps * Math.cos(windRads - shipState.heading);
  const loc_Wz = windMps * Math.sin(windRads - shipState.heading); 
  
  // Ar: 0.5 * 1.225 / 1000 = 0.0006125. Cdx ~ 0.8, Cdz ~ 1.0
  const swFx_local = 0.0006125 * 600  * loc_Wx * Math.abs(loc_Wx);
  const swFz_local = 0.0006125 * 4000 * loc_Wz * Math.abs(loc_Wz);

  // Arrasto Hidrodinâmico e Força da Corrente (Substitui o SHIP_DRAG)
  const relWaterX = curX - shipState.velocity.x;
  const relWaterZ = curZ - shipState.velocity.y;
  const loc_WaterX = relWaterX * sCosH + relWaterZ * sSinH;
  const loc_WaterZ = -relWaterX * sSinH + relWaterZ * sCosH;
  
  // Água: 0.5 * 1025 / 1000 = 0.5125. Áreas submersas: frontal 450m2, lateral 3150m2
  const hwFx_local = 0.5125 * 450  * loc_WaterX * Math.abs(loc_WaterX);
  const hwFz_local = 0.5125 * 3150 * loc_WaterZ * Math.abs(loc_WaterZ);
  
  // Integra todas as forças para o referencial Global
  const totalFx_local = swFx_local + hwFx_local;
  const totalFz_local = swFz_local + hwFz_local;
  
  shipForceGlobal.x += totalFx_local * sCosH - totalFz_local * sSinH;
  shipForceGlobal.y += totalFx_local * sSinH + totalFz_local * sCosH;

  // Torque induzido por vento e corrente (drag angular hidrãulic)
  // Amortecimento linear + quadrático: impede rotação descontrolada por corrente
  const angularDrag =
    -8000   * shipState.angularVelocity                                                     // linear  (dominante a ω baixo)
    - 0.5125 * 50000 * shipState.angularVelocity * Math.abs(shipState.angularVelocity);     // quadrático
  shipTorque += angularDrag;

  // ── 7. Integração e Cinemática do Panamax ───────────────────

  shipState.velocity.x      += (shipForceGlobal.x / shipState.mass) * dt;
  shipState.velocity.y      += (shipForceGlobal.y / shipState.mass) * dt;
  shipState.angularVelocity += (shipTorque         / shipState.inertia) * dt;

  // Hard cap na velocidade angular APÓS integração (≈3.4°/s — valor náutico plausível)
  const MAX_SHIP_ANG_VEL = 0.06; // rad/s
  if      (shipState.angularVelocity >  MAX_SHIP_ANG_VEL) shipState.angularVelocity =  MAX_SHIP_ANG_VEL;
  else if (shipState.angularVelocity < -MAX_SHIP_ANG_VEL) shipState.angularVelocity = -MAX_SHIP_ANG_VEL;

  shipState.position.x += shipState.velocity.x * dt;
  shipState.position.y += shipState.velocity.y * dt;
  shipState.heading    += shipState.angularVelocity * dt;

  if (g.merchantShip) {
    g.merchantShip.position.x = shipState.position.x;
    g.merchantShip.position.z = shipState.position.y;
    g.merchantShip.rotation.y = -shipState.heading;
  }

  // ── 8. Boias — Física de Inclinação ──────────────────
  updateBuoys(dt);

  // ── 9. Colisões ────────────────────────────────────

  checkCollisions();

  // ── 10. Telemetria HUD ─────────────────────────────

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
