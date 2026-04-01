/**
 * @file        src/js/ui/joysticks.js
 * @description Joysticks Virtuais Azimutais — Dial direcional (UI de Timão)
 *              e Slider de RPM. Suporta mouse e touch com Twin Mode.
 * @author      Jossian Brito <jossiancosta@gmail.com>
 * @version     2.0.0
 * @since       2026-03-28
 */

import { g } from '../state/globals.js';

// ─────────────────────────────────────────────────────────
// 1. SETUP GERAL DOS JOYSTICKS
// ─────────────────────────────────────────────────────────

/**
 * Inicializa os dois controles azimutais (BB e BE) e o botão Twin Mode.
 * Deve ser chamado uma vez em init().
 */
export function setupJoysticks() {
  createAzimuthControl('joystick-bb', 'stick-bb', 'slider-bb', 'bb');
  createAzimuthControl('joystick-be', 'stick-be', 'slider-be', 'be');

  // ── Twin Mode ─────────────────────────────────────────
  const btnTwin   = document.getElementById('btn-twin');
  const jsBE      = document.getElementById('joystick-be');
  const sliderBE  = document.getElementById('slider-be');

  if (btnTwin) {
    btnTwin.addEventListener('click', () => {
      g.isTwinControl = !g.isTwinControl;

      if (g.isTwinControl) {
        btnTwin.classList.add('btn-toggle-active');
        if(jsBE) jsBE.classList.add('joystick-ghost');
        if(sliderBE) sliderBE.classList.add('joystick-ghost');
      } else {
        btnTwin.classList.remove('btn-toggle-active');
        if(jsBE) jsBE.classList.remove('joystick-ghost');
        if(sliderBE) sliderBE.classList.remove('joystick-ghost');
        // Zera BE ao sair do Twin
        if (g.thrusters?.be) g.thrusters.be.thrust = 0;
        if(sliderBE) sliderBE.value = 0;
      }
    });
  }
}

// ─────────────────────────────────────────────────────────
// 2. FACTORY — Controle Azimutal Individual
// ─────────────────────────────────────────────────────────

/**
 * Cria e liga um controle azimutal completo (Dial + Slider).
 * O Dial define a direção; o Slider define a potência (RPM).
 * Duplo clique no dial zera a potência (para máquina).
 *
 * @param {string} baseId   - ID do elemento base do joystick (.joystick-base)
 * @param {string} stickId  - ID do punho visual (.joystick-stick)
 * @param {string} sliderId - ID do slider de RPM (.rpm-slider)
 * @param {'bb'|'be'} side  - Lado: 'bb' (Bombordo) ou 'be' (Estibordo)
 */
export function createAzimuthControl(baseId, stickId, sliderId, side) {
  const base   = document.getElementById(baseId);
  const stick  = document.getElementById(stickId);
  const slider = document.getElementById(sliderId);

  // Raio fixo: o stick fica sempre na borda (estilo Timão)
  const radius = base.clientWidth / 2 - stick.clientWidth / 2;
  let active      = false;
  let lastTapTime = 0;

  // ── Slider de RPM ─────────────────────────────────────

  slider.addEventListener('input', (e) => {
    if (g.thrusters?.[side]) {
      g.thrusters[side].thrust = e.target.value / 100;
    }
  });

  // ── Função de atualização do Dial ─────────────────────

  function updateDial(event) {
    if (!active) return;

    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    const rect    = base.getBoundingClientRect();
    const centerX = rect.left + rect.width  / 2;
    const centerY = rect.top  + rect.height / 2;

    const angle = Math.atan2(clientY - centerY, clientX - centerX);

    // Stick permanece na borda (timão / helm)
    const stickX = radius * Math.cos(angle);
    const stickY = radius * Math.sin(angle);

    stick.style.transition = 'none';
    stick.style.transform  = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;

    if (g.thrusters?.[side]) {
      g.thrusters[side].angle = angle + Math.PI / 2;
    }
  }

  /** Para a máquina (apenas RPM — não redefine o azimute). */
  function resetMachine() {
    active = false;
    if (g.thrusters?.[side]) g.thrusters[side].thrust = 0;
    slider.value = 0;
  }

  function handleStart(e) {
    const now     = Date.now();
    const tapGap  = now - lastTapTime;
    lastTapTime   = now;

    // Duplo clique (< 300 ms) → Para a Máquina
    if (tapGap > 0 && tapGap < 300) {
      if (e.cancelable) e.preventDefault();
      resetMachine();
      return;
    }

    active = true;
    updateDial(e);
  }

  function handleEnd() { active = false; }

  // ── Eventos Mouse ─────────────────────────────────────
  base.addEventListener('mousedown', handleStart);
  window.addEventListener('mousemove', updateDial);
  window.addEventListener('mouseup',   handleEnd);

  // ── Eventos Touch (Mobile) ────────────────────────────
  base.addEventListener('touchstart', (e) => {
    if (e.cancelable) e.preventDefault();
    handleStart(e);
  }, { passive: false });
  window.addEventListener('touchmove', updateDial, { passive: false });
  window.addEventListener('touchend',  handleEnd);
}
