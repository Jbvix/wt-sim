/**
 * @file        src/js/ui/shipPanel.js
 * @description Painel de Comando do Navio Panamax — telegrafo (motor),
 *              leme (rudder) e toggle de visibilidade.
 * @author      Jossian Brito <jossiancosta@gmail.com>
 * @version     2.0.0
 * @since       2026-03-28
 */

import { shipState } from '../state/globals.js';

// ─────────────────────────────────────────────────────────
// 1. SETUP DO PAINEL DO NAVIO
// ─────────────────────────────────────────────────────────

/**
 * Liga os controlos do painel de pilotagem do Panamax.
 * Deve ser chamado uma vez em init().
 */
export function setupShipPanel() {
  const slEngine  = document.getElementById('sl-ship-engine');
  const slRudder  = document.getElementById('sl-ship-rudder');
  const valEngine = document.getElementById('val-ship-engine');
  const valRudder = document.getElementById('val-ship-rudder');

  // ── Telegrafo (Motor) ─────────────────────────────────

  slEngine.addEventListener('input', (e) => {
    shipState.engineThrust = parseFloat(e.target.value);
    valEngine.innerText    = shipState.engineThrust;
  });

  document.getElementById('btn-ship-stop').addEventListener('click', () => {
    slEngine.value         = 0;
    shipState.engineThrust = 0;
    valEngine.innerText    = '0';
  });

  // ── Leme (Rudder) ─────────────────────────────────────

  slRudder.addEventListener('input', (e) => {
    shipState.rudderAngle = parseFloat(e.target.value);
    valRudder.innerText   = shipState.rudderAngle;
  });

  document.getElementById('btn-ship-midships').addEventListener('click', () => {
    slRudder.value        = 0;
    shipState.rudderAngle = 0;
    valRudder.innerText   = '0';
  });

  // ── Painel Ocultável ──────────────────────────────────

  const btnToggle = document.getElementById('btn-toggle-ship');
  const content   = document.getElementById('ship-content');

  btnToggle.addEventListener('click', () => {
    const hidden = content.style.display === 'none';
    content.style.display = hidden ? 'flex' : 'none';
    btnToggle.innerText   = hidden ? '▼ Comando Panamax' : '► Comando Panamax';
  });
}
