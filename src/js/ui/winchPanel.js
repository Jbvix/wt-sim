/**
 * @file        src/js/ui/winchPanel.js
 * @description Painel de controlo do Guincho — Caçar (Heave), Arriar (Pay),
 *              Freio (Brake) e Desconectar. Inclui interlock de segurança
 *              que bloqueia a largada sob tensão elevada.
 * @author      Jossian Brito <jossiancosta@gmail.com>
 * @version     2.0.0
 * @since       2026-03-28
 */

import { g } from '../state/globals.js';

// ─────────────────────────────────────────────────────────
// 1. SETUP DO PAINEL DO GUINCHO
// ─────────────────────────────────────────────────────────

/**
 * Liga os botões do painel do guincho ao estado do rope do tug ativo.
 * Deve ser chamado uma vez em init(). Os botões operam sempre sobre
 * g.ropeState (ponteiro atualizado por switchTug).
 */
export function setupWinchPanel() {
  const btnHeave      = document.getElementById('btn-heave');
  const btnPay        = document.getElementById('btn-pay');
  const btnBrake      = document.getElementById('btn-brake');
  const btnDisconnect = document.getElementById('btn-disconnect');

  // ── Heave / Pay (botões de pressão contínua) ───────────

  /** Reengata o freio automaticamente ao acionar o guincho. */
  const autoEngageBrake = () => {
    if (!g.ropeState.brakeEngaged) {
      g.ropeState.brakeEngaged = true;
      btnBrake.classList.add('btn-toggle-active');
      btnBrake.innerText = 'Freio: Travado';
    }
  };

  const startHeave = (e) => { e.preventDefault(); g.ropeState.winchAction = 1;  autoEngageBrake(); };
  const stopHeave  = (e) => { e.preventDefault(); g.ropeState.winchAction = 0; };
  btnHeave.addEventListener('mousedown', startHeave);
  btnHeave.addEventListener('touchstart', startHeave);
  btnHeave.addEventListener('mouseup',    stopHeave);
  btnHeave.addEventListener('touchend',   stopHeave);
  btnHeave.addEventListener('mouseleave', stopHeave);

  const startPay = (e) => { e.preventDefault(); g.ropeState.winchAction = -1; autoEngageBrake(); };
  const stopPay  = (e) => { e.preventDefault(); g.ropeState.winchAction = 0; };
  btnPay.addEventListener('mousedown', startPay);
  btnPay.addEventListener('touchstart', startPay);
  btnPay.addEventListener('mouseup',    stopPay);
  btnPay.addEventListener('touchend',   stopPay);
  btnPay.addEventListener('mouseleave', stopPay);

  // ── Freio (Toggle) ────────────────────────────────────

  btnBrake.addEventListener('click', () => {
    g.ropeState.brakeEngaged = !g.ropeState.brakeEngaged;
    if (g.ropeState.brakeEngaged) {
      btnBrake.classList.add('btn-toggle-active');
      btnBrake.innerText = 'Freio: Travado';
    } else {
      btnBrake.classList.remove('btn-toggle-active');
      btnBrake.innerText = 'Freio: Solto';
    }
  });

  // ── Desconectar (com interlock de segurança) ──────────

  /**
   * Tenta largar o cabo do cabeço.
   * Bloqueado se tensão > 1 t (interlock de segurança).
   * Exposto em window para ser chamado por handleInteraction.
   */
  window.attemptDisconnect = () => {
    if (g.ropeState.tension > 1.0) {
      // Interlock ativo — feedback visual
      const msgEl = document.getElementById('status-message');
      msgEl.innerText          = 'ERRO: Tensão demasiado alta para largar!';
      msgEl.style.display      = 'block';
      msgEl.style.background   = 'rgba(239, 68, 68, 0.9)';

      setTimeout(() => {
        if (g.ropeState.status === 2) msgEl.style.display = 'none';
        msgEl.style.background = 'rgba(234, 179, 8, 0.9)';
        msgEl.innerText        = 'Selecione o Cabeço no Cais';
      }, 3000);

    } else {
      // Largada segura
      g.ropeState.status           = 0;
      g.ropeState.connectedBollard = null;
      g.ropeLine.visible           = false;
      btnDisconnect.style.display  = 'none';
    }
  };

  btnDisconnect.addEventListener('click', window.attemptDisconnect);
}
