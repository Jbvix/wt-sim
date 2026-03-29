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

  // ── Atualização do botão de frota ─────────────────────
  const btnSwitch = document.getElementById('btn-switch-tug');
  if (btnSwitch) {
    if (id === 'stern') {
      btnSwitch.style.backgroundColor = 'var(--danger-color)';
      btnSwitch.style.color           = 'white';
      btnSwitch.innerText             = '[ POPA ] - VERMELHO';
    } else {
      btnSwitch.style.backgroundColor = 'var(--safe-color)';
      btnSwitch.style.color           = '#000';
      btnSwitch.innerText             = '[ PROA ] - VERDE';
    }
  }

  // ── Restaura posição dos manípulos UI ─────────────────
  ['bb', 'be'].forEach(side => {
    const slider = document.getElementById(`slider-${side}`);
    const stick  = document.getElementById(`stick-${side}`);
    if (!slider || !stick) return;

    slider.value = g.thrusters[side].thrust * 100;

    const ang         = g.thrusters[side].angle;
    const handleLimit = 25; // px — raio visual do dial
    const x = handleLimit * Math.cos(ang);
    const y = handleLimit * Math.sin(ang);
    stick.style.transform = `translate(${x}px, ${y}px)`;
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
  document.getElementById('btn-switch-tug').addEventListener('click', () => {
    const newId = g.activeTugId === 'stern' ? 'bow' : 'stern';
    switchTug(newId);
  });
}
