/**
 * @file        src/js/ui/envPanel.js
 * @description Painel de Atmosfera & Mar — sliders de vento, corrente e nevoeiro,
 *              toggle de luzes de navegação e animação da biruta (windsock).
 * @author      Jossian Brito <jossiancosta@gmail.com>
 * @version     2.0.0
 * @since       2026-03-28
 */

import { g, envState } from '../state/globals.js';

// ─────────────────────────────────────────────────────────
// 1. SETUP DO PAINEL METEOROLÓGICO
// ─────────────────────────────────────────────────────────

/**
 * Liga todos os controles do painel de Atmosfera & Mar.
 * Deve ser chamado uma vez em init(), após buildWorld().
 */
export function setupEnvironmentPanel() {
  // Mapeamento: id do slider → id do display → chave em envState → parser
  const sliders = [
    { sliderId: 'sl-wind-mag',  outId: 'val-wind-mag', key: 'windMag',    parse: parseInt   },
    { sliderId: 'sl-wind-dir',  outId: 'val-wind-dir', key: 'windDir',    parse: parseInt   },
    { sliderId: 'sl-cur-mag',   outId: 'val-cur-mag',  key: 'currentMag', parse: parseFloat },
    { sliderId: 'sl-cur-dir',   outId: 'val-cur-dir',  key: 'currentDir', parse: parseInt   },
    { sliderId: 'sl-fog',       outId: 'val-fog',       key: 'fogDensity', parse: parseInt   },
  ];

  sliders.forEach(({ sliderId, outId, key, parse }) => {
    const slider  = document.getElementById(sliderId);
    const display = document.getElementById(outId);

    slider.addEventListener('input', (e) => {
      const val = parse(e.target.value);
      display.innerText  = val;
      envState[key]      = val;
      if (key === 'fogDensity') updateFog();
    });
  });

  // Toggle de Luzes de Navegação
  document.getElementById('ui-lights').addEventListener('click', () => {
    envState.lightsOn = !envState.lightsOn;
    document.getElementById('ui-lights').style.color = envState.lightsOn
      ? '#ffeb3b'
      : 'var(--accent-color)';
    g.navLights.forEach(light => {
      light.intensity = envState.lightsOn ? light.userData.baseIntensity : 0;
    });
  });

  // ── Painel ocultável (Mobile-First collapse) ──────────────

  const weatherBtn     = document.getElementById('btn-toggle-weather');
  const weatherContent = document.getElementById('weather-content');

  const toggleWeatherPanel = (forceClose = false) => {
    const isHidden = weatherContent.style.display === 'none';
    if (isHidden && !forceClose) {
      weatherContent.style.display = 'flex';
      weatherBtn.innerText = '▼ Atmosfera & Mar';
    } else {
      weatherContent.style.display = 'none';
      weatherBtn.innerText = '▶ Atmosfera & Mar';
    }
  };

  weatherBtn.addEventListener('click', () => toggleWeatherPanel(false));

  // Começa fechado em ecrans pequenos
  if (window.innerWidth <= 850) toggleWeatherPanel(true);
}

// ─────────────────────────────────────────────────────────
// 2. ATUALIZAÇÃO DO NEVOEIRO
// ─────────────────────────────────────────────────────────

/**
 * Aplica a densidade de nevoeiro à cena e ajusta a luz ambiente.
 * Chamado automaticamente quando o slider de fog muda.
 */
export function updateFog() {
  if (!g.scene) return;
  if (!g.scene.fog) {
    g.scene.fog = new THREE.FogExp2(0x1e293b, 0);
  }
  g.scene.fog.density = envState.fogDensity * 0.0002; // máx ≈ 0.02
  if (g.ambientLight) {
    g.ambientLight.intensity = Math.max(0.2, 0.8 - (envState.fogDensity / 100) * 0.6);
  }
}

// ─────────────────────────────────────────────────────────
// 3. ANIMAÇÃO DA BIRUTA (chamada no animate loop)
// ─────────────────────────────────────────────────────────

/**
 * Anima a biruta de vento (windsock) com base em envState.
 * Deve ser chamado a cada frame no animate().
 */
export function animateWindsock() {
  if (!g.windsockFabric) return;

  const windRads = envState.windDir * Math.PI / 180;
  g.windsockFabric.rotation.y = -windRads;

  // 0 nós = pendulo vertical; 60 nós = horizontal
  const droop = Math.max(0, Math.min(1, (60 - envState.windMag) / 60));
  g.windsockFabric.rotation.z = -droop * (Math.PI / 2.2);
}

// ─────────────────────────────────────────────────────────
// 4. ANIMAÇÃO DA BÚSSOLA DE CORRENTE (chamada no animate loop)
// ─────────────────────────────────────────────────────────

/**
 * Atualiza a bússola de corrente no HUD.
 * Deve ser chamado a cada frame no animate().
 */
export function animateCurrentCompass() {
  if (!g.uiCurrentArrow) return;
  g.uiCurrentArrow.style.transform =
    `translate(-50%, -100%) rotate(${envState.currentDir}deg)`;
  g.uiCurrentCompass.style.opacity = envState.currentMag > 0.05 ? '1' : '0.2';
}
