/**
 * @file        src/js/fleet/fleetManager.js
 * @description Gestão da frota — alternância entre rebocadores e
 *              sincronização de todos os ponteiros globais de estado.
 * @author      Jossian Brito <jossiancosta@gmail.com>
 * @version     2.0.0
 * @since       2026-03-28
 */

import { g } from '../state/globals.js';
import { tugs } from './tugData.js';
import { gsap } from 'gsap';

// ─────────────────────────────────────────────────────────
// 1. ALTERNÂNCIA DE REBOCADOR ATIVO
// ─────────────────────────────────────────────────────────

/**
 * Alterna o rebocador ativo e atualiza todos os ponteiros globais.
 * Quebra o Twin Mode por segurança ao trocar de embarcação.
 *
 * @param {'stern'|'bow'} id - ID do rebocador a ativar
 */
export function switchTug(id) {
  g.activeTugId = id;
  const tug = tugs[id];

  // ── Ponteiros de estado ───────────────────────────────
  g.tugState        = tug.state;
  g.thrusters       = tug.thrusters;
  g.ropeState       = tug.rope;
  g.tugboat         = tug.meshes.tugboat;
  g.winchDrum       = tug.meshes.winchDrum;
  g.ropeLine        = tug.meshes.ropeLine;
  g.jetArrowBB      = tug.meshes.jetArrowBB;
  g.jetArrowBE      = tug.meshes.jetArrowBE;
  g.resultantArrow  = tug.meshes.resultantArrow;

  // ── Panning Suave da Câmera (Sprint 1) ─────────────────
  if (g.camera && g.controls && g.tugboat) {
    const tPos = g.tugboat.position;
    
    // Anima a Posição da Câmera (Chase Cam overview lateral)
    gsap.to(g.camera.position, {
      x: tPos.x - 70,
      y: 45,
      z: tPos.z + 120,
      duration: 1.5,
      ease: "power2.inOut"
    });

    // Anima o Alvo do OrbitControls para focar exatamente no rebocador
    gsap.to(g.controls.target, {
      x: tPos.x,
      y: tPos.y + 5,
      z: tPos.z,
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: () => g.controls.update()
    });
  }

  // ── Atualização do botão de frota ─────────────────────
  const btnSwitch = document.getElementById('btn-switch-tug');
  if (btnSwitch) {
    if (id === 'stern') {
      btnSwitch.style.backgroundColor = 'var(--danger-color)';
      btnSwitch.style.color           = 'white';
      btnSwitch.innerText             = 'REBOCADOR POPA';
    } else {
      btnSwitch.style.backgroundColor = 'var(--safe-color)';
      btnSwitch.style.color           = '#000';
      btnSwitch.innerText             = 'REBOCADOR PROA';
    }
  }

  // ── Restaura posição dos manípulos UI ─────────────────
  ['bb', 'be'].forEach(side => {
    const slider = document.getElementById(`slider-${side}`);
    const stick  = document.getElementById(`stick-${side}`);
    if (!slider || !stick) return;

    slider.value = g.thrusters[side].thrust * 100;

    // A física grava forceAngle = azimuteVisual + PI / 2.
    // Portanto azimuteVisual = physAngle - PI / 2.
    const physAngle   = g.thrusters[side].angle;
    const visAngle    = physAngle - Math.PI / 2;
    const handleLimit = 25; // px — raio visual do dial
    const x = handleLimit * Math.cos(visAngle);
    const y = handleLimit * Math.sin(visAngle);
    
    // TEM QUE MANTER A TRANSLATION CENTRAL (-50%) DO CSS BASE!
    stick.style.transition = 'none'; // previne animação louca ao trocar
    stick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  });

  // ── Quebra Twin Control por segurança ─────────────────
  if (g.isTwinControl) {
    g.isTwinControl = false;
    document.getElementById('btn-twin')?.classList.remove('btn-toggle-active');
    document.getElementById('joystick-be')?.classList.remove('joystick-ghost');
    document.getElementById('slider-be')?.classList.remove('joystick-ghost');
  }

  // ── Sincroniza botão do freio ─────────────────────────
  const btnBrake = document.getElementById('btn-brake');
  if (btnBrake) {
    if (g.ropeState.brakeEngaged) {
      btnBrake.classList.add('btn-toggle-active');
      btnBrake.innerText = 'Freio: Travado';
    } else {
      btnBrake.classList.remove('btn-toggle-active');
      btnBrake.innerText = 'Freio: Solto';
    }
  }
}

// ─────────────────────────────────────────────────────────
// 2. SETUP DO BOTÃO DE TROCA DE FROTA
// ─────────────────────────────────────────────────────────

/**
 * Liga o evento de clique do botão "Rebocador Ativo" à lógica switchTug.
 * Deve ser chamado uma vez em init().
 */
export function setupFleetManager() {
  const btnSwitch = document.getElementById('btn-switch-tug');
  if (btnSwitch) {
    btnSwitch.addEventListener('click', () => {
      const newId = g.activeTugId === 'stern' ? 'bow' : 'stern';
      switchTug(newId);
    });
  }
}
