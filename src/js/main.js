/**
 * @file        src/js/main.js
 * @description Ponto de entrada do WT-SIM — orquestra a inicialização,
 *              o loop de animação, os eventos globais e o cenário inicial atracado.
 * @author      Jossian Brito <jossiancosta@gmail.com>
 * @version     2.0.0
 * @since       2026-03-28
 */

import * as THREE from 'three';

// ── Módulos internos ──────────────────────────────────────
import { g, shipState, mooringLines, raycaster, mouse, pointerDownPos } from './state/globals.js';
import { tugs }                from './fleet/tugData.js';
import { switchTug, setupFleetManager } from './fleet/fleetManager.js';
import { setupGraphics, onWindowResize } from './graphics/scene.js';
import { loadAllAssets }       from './graphics/assets.js';
import { buildWorld }          from './graphics/models.js';
import { updatePhysics }       from './physics/tugKinetics.js';
import { setupJoysticks }      from './ui/joysticks.js';
import { setupWinchPanel }     from './ui/winchPanel.js';
import { setupShipPanel }      from './ui/shipPanel.js';
import {
  setupEnvironmentPanel,
  animateWindsock,
  animateCurrentCompass,
} from './ui/envPanel.js';

// ── Dev Tool Temporária ──────────────────────────────────
function initDevTools() {
  const panel = document.getElementById('dev-calibration-panel');
  const handle = document.getElementById('dev-drag-handle');
  const select = document.getElementById('dev-target-select');
  const rx = document.getElementById('dev-range-x');
  const ry = document.getElementById('dev-range-y');
  const rz = document.getElementById('dev-range-z');
  const vx = document.getElementById('dev-val-x');
  const vy = document.getElementById('dev-val-y');
  const vz = document.getElementById('dev-val-z');
  const out = document.getElementById('dev-output');

  if (!panel || !select) return;

  // Lógica de Draggable
  let isDragging = false, startX, startY, initialLeft, initialTop;
  handle.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = panel.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    panel.style.right = 'auto'; // desativa right para left funcionar
    panel.style.bottom = 'auto';
  });
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panel.style.left = `${initialLeft + dx}px`;
    panel.style.top = `${initialTop + dy}px`;
  });
  window.addEventListener('mouseup', () => { isDragging = false; });

  function populateTargets() {
    select.innerHTML = '<option value="disabled">-- Selecione um alvo --</option>';
    select.innerHTML += '<optgroup label="Rebocadores (Guinchos)">';
    select.innerHTML += '<option value="tug-winch-stern">Rebocador Popa - Guincho</option>';
    select.innerHTML += '<option value="tug-winch-bow">Rebocador Proa - Guincho</option>';
    select.innerHTML += '</optgroup>';

    const shipBollards = g.hitboxes.filter(h => h.userData.isDynamic);
    select.innerHTML += '<optgroup label="Navio (Cabeços)">';
    shipBollards.forEach(h => {
      let name = h.userData.mooringId || h.userData.type;
      select.innerHTML += `<option value="${h.uuid}">${name}</option>`;
    });
    select.innerHTML += '</optgroup>';

    if (g.navLights && g.navLights.length > 0) {
      select.innerHTML += '<optgroup label="Luzes de Navegação">';
      g.navLights.forEach((l, i) => {
        const hex = l.userData.hexColor || 'Luz';
        select.innerHTML += `<option value="light-${l.uuid}">Luz ${hex} (${i})</option>`;
      });
      select.innerHTML += '</optgroup>';
    }
  }

  let currentTarget = null;
  let targetType = 'disabled';

  function updateTarget() {
    targetType = select.value;
    currentTarget = null;

    if (targetType === 'disabled') {
      updateText(true);
      return;
    }

    if (targetType === 'tug-winch-stern') {
      const tug = tugs['stern'];
      if (tug && tug.meshes.winchDrum) currentTarget = tug.meshes.winchDrum;
    } else if (targetType === 'tug-winch-bow') {
      const tug = tugs['bow'];
      if (tug && tug.meshes.winchDrum) currentTarget = tug.meshes.winchDrum;
    } else if (targetType.startsWith('light-')) {
      const uuid = targetType.replace('light-', '');
      currentTarget = g.navLights.find(l => l.uuid === uuid);
    } else {
      currentTarget = g.hitboxes.find(h => h.uuid === targetType);
    }

    if (currentTarget) {
      rx.value = currentTarget.position.x;
      ry.value = currentTarget.position.y;
      rz.value = currentTarget.position.z;
      updateText();
    }
  }

  function updateText(clear = false) {
    if (clear) {
      vx.innerText = '0'; vy.innerText = '0'; vz.innerText = '0';
      out.innerText = 'A aguardar seleção...';
      return;
    }
    vx.innerText = parseFloat(rx.value).toFixed(2);
    vy.innerText = parseFloat(ry.value).toFixed(2);
    vz.innerText = parseFloat(rz.value).toFixed(2);
    out.innerText = `x: ${rx.value}, y: ${ry.value}, z: ${rz.value}`;
  }

  function onSliderChange() {
    if (!currentTarget) return;
    const x = parseFloat(rx.value);
    const y = parseFloat(ry.value);
    const z = parseFloat(rz.value);
    currentTarget.position.set(x, y, z);

    if (targetType === 'tug-winch-stern' || targetType === 'tug-winch-bow') {
      const tugId = targetType.replace('tug-winch-', '');
      const tug = tugs[tugId];
      if (tug && tug.meshes.tugboat) {
         const winchHit = tug.meshes.tugboat.children.find(c => c.userData.type === 'winch');
         const winchBase = tug.meshes.tugboat.children.find(c => c.geometry && c.geometry.type === 'BoxGeometry'); // Approximation for winchBase
         if (winchHit) winchHit.position.set(x, y, z);
         if (winchBase) winchBase.position.set(x, y - 1.15, z); // Adjust base along with drum
      }
    } else if (!targetType.startsWith('light-') && currentTarget.userData && currentTarget.userData.ref) {
      currentTarget.userData.ref.position.set(x, y, z);
    }

    updateText();
  }

  select.addEventListener('change', updateTarget);
  rx.addEventListener('input', onSliderChange);
  ry.addEventListener('input', onSliderChange);
  rz.addEventListener('input', onSliderChange);

  setTimeout(() => {
    populateTargets();
    updateTarget();
  }, 1000);
}

// ── Dev Tool Física (Painel de Massas e Molas) ───────────
function initPhysicsDevTools() {
  const pPanel  = document.getElementById('dev-physics-panel');
  const pHandle = document.getElementById('dev-phys-drag-handle');
  const pBtnMin = document.getElementById('dev-phys-btn-min');
  const pContent = document.getElementById('dev-phys-content');

  if (!pPanel) return;

  // Draggable Física
  let pDragging = false, pStartX, pStartY, pInitLeft, pInitTop;
  pHandle.addEventListener('mousedown', (e) => {
    if (e.target.tagName.toLowerCase() === 'button') return;
    pDragging = true;
    pStartX = e.clientX; pStartY = e.clientY;
    const r = pPanel.getBoundingClientRect();
    pInitLeft = r.left; pInitTop = r.top;
    pPanel.style.right = 'auto'; pPanel.style.bottom = 'auto';
  });
  window.addEventListener('mousemove', (e) => {
    if (!pDragging) return;
    pPanel.style.left = `${pInitLeft + (e.clientX - pStartX)}px`;
    pPanel.style.top  = `${pInitTop + (e.clientY - pStartY)}px`;
  });
  window.addEventListener('mouseup', () => { pDragging = false; });

  // Toggle Minimize
  pBtnMin.addEventListener('click', () => {
    if (pContent.style.display === 'none') {
      pContent.style.display = 'block';
      pBtnMin.innerText = '[ - ]';
    } else {
      pContent.style.display = 'none';
      pBtnMin.innerText = '[ + ]';
    }
  });

  // Bindings Ship
  const valShipMass = document.getElementById('vcal-ship-mass');
  const inpShipMass = document.getElementById('cal-ship-mass');
  inpShipMass.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    valShipMass.innerText = v;
    shipState.mass = v;
  });

  const valShipInertia = document.getElementById('vcal-ship-inertia');
  const inpShipInertia = document.getElementById('cal-ship-inertia');
  inpShipInertia.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    valShipInertia.innerText = v;
    shipState.inertia = v * 1_000_000;
  });

  // Bindings Tug
  const valTugMass = document.getElementById('vcal-tug-mass');
  const inpTugMass = document.getElementById('cal-tug-mass');
  inpTugMass.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    valTugMass.innerText = v;
    Object.values(tugs).forEach(t => t.state.mass = v);
  });

  const valTugDrag = document.getElementById('vcal-tug-drag');
  const inpTugDrag = document.getElementById('cal-tug-drag');
  inpTugDrag.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    valTugDrag.innerText = v.toFixed(2);
    devConfig.tugDragRot = v;
  });

  const valTugThrust = document.getElementById('vcal-tug-thrust');
  const inpTugThrust = document.getElementById('cal-tug-thrust');
  inpTugThrust.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    valTugThrust.innerText = v.toFixed(1);
    devConfig.tugThrustMultiplier = v;
  });

  const valTugSkeg = document.getElementById('vcal-tug-skeg');
  const inpTugSkeg = document.getElementById('cal-tug-skeg');
  if (inpTugSkeg) {
    inpTugSkeg.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      valTugSkeg.innerText = v.toFixed(1);
      devConfig.tugSkegReact = v;
    });
  }

  // Bindings Rope
  const valRopeK = document.getElementById('vcal-rope-k');
  const inpRopeK = document.getElementById('cal-rope-k');
  inpRopeK.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    valRopeK.innerText = v;
    Object.values(tugs).forEach(t => t.rope.k = v);
  });

  const valRopeB = document.getElementById('vcal-rope-b');
  const inpRopeB = document.getElementById('cal-rope-b');
  inpRopeB.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    valRopeB.innerText = v;
    Object.values(tugs).forEach(t => t.rope.damping = v);
  });

  const valRopeCap = document.getElementById('vcal-rope-cap');
  const inpRopeCap = document.getElementById('cal-rope-cap');
  inpRopeCap.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    valRopeCap.innerText = v;
    devConfig.ropeBreak = v;
  });
}

// ─────────────────────────────────────────────────────────
// 1. INICIALIZAÇÃO
// ─────────────────────────────────────────────────────────

/**
 * Ponto de entrada — carrega os assets, inicializa todos os subsistemas e aguarda 
 * o Botão "Lançar Simulação" para arrancar o loop de renderização e física.
 */
async function init() {
  console.log('DEBUG: Iniciando Pré-Load de Assets...');

  try {
    // 1. Aguarda que o Loader Manager (96MB de ficheiros GLB) termine
    await loadAllAssets();
    console.log('DEBUG: Pré-load concluído. Instanciando Mundo...');
  } catch (error) {
    document.getElementById('launch-text').innerText = 'ERRO NO DOWNLOAD (F5)';
    return;
  }

  // 2. Monta o cenário base na memória
  setupGraphics();
  buildWorld();
  setupJoysticks();
  setupWinchPanel();
  setupShipPanel();
  setupEnvironmentPanel();
  setupFleetManager();
  setupEventListeners();

  // Iniciar Painel DEV
  initDevTools();

  // Referências DOM para a bússola de corrente
  g.uiCurrentCompass = document.getElementById('current-compass');
  g.uiCurrentArrow   = document.getElementById('current-arrow');

  // Ativa o rebocador de popa como padrão e prepara o cenário
  switchTug('stern');
  setupDockedScenario();
  
  // Painel de Físicas
  initPhysicsDevTools();

  // 3. Aguarda clique do utilizador para iniciar a Física e Renderização 
  window.startSimulation = function () {
    console.log('DEBUG: START SIMULATION clicado. Loop iniciado.');
    
    g.lastTime = performance.now(); // reset para o dt não dar salto
    requestAnimationFrame(animate);
  };
}

// ─────────────────────────────────────────────────────────
// 2. CENÁRIO INICIAL — NAVIO ATRACADO
// ─────────────────────────────────────────────────────────

/**
 * Prepara a cena inicial: posiciona os rebocadores nos seus locais de largada
 * e liga as 4 espias do Panamax aos cabeços mais próximos do cais.
 */
function setupDockedScenario() {
  // Posiciona as meshes dos rebocadores nos startPos físicos
  Object.values(tugs).forEach(tug => {
    tug.state.position.copy(tug.startPos);
    if (tug.meshes?.tugboat) {
      tug.meshes.tugboat.position.set(tug.startPos.x, 0, tug.startPos.y);
      tug.meshes.tugboat.rotation.y = -tug.state.heading; // [TAG: PIVOT-VISUAL-SYNC]
    }
  });

  // Sincroniza o navio com o seu estado físico inicial
  if (g.merchantShip) {
    g.merchantShip.position.set(shipState.position.x, 0, shipState.position.y);
    g.merchantShip.rotation.y = -shipState.heading; // [TAG: PIVOT-VISUAL-SYNC]
  }

  // Liga as 4 espias BB do navio ao cais (Lançantes e Espringues)
  mooringLines.forEach(line => {
    if (!line.shipRef) return;

    const shipX = line.shipRef.position.x; // posição local no navio
    let targetOffset = 0;
    // Lançantes esticam para fora, Espringues cruzam para dentro
    if (line.id === 'bow-head')          targetOffset = 45;
    else if (line.id === 'bow-spring')   targetOffset = -45;
    else if (line.id === 'stern-spring') targetOffset = 45;
    else if (line.id === 'stern-head')   targetOffset = -45;

    const targetX = shipX + targetOffset;

    const closestBollard = g.pierBollards.reduce((best, cur) => {
      return Math.abs(cur.x - targetX) < Math.abs(best.x - targetX) ? cur : best;
    });

    line.pierRef = closestBollard.ref;
    line.active  = true;

    // Comprimento frouxo = distância inicial (espia tensa = L0 da distância atual)
    const shipWorld = new THREE.Vector3();
    line.shipRef.getWorldPosition(shipWorld);
    const pierWorld = new THREE.Vector3();
    line.pierRef.getWorldPosition(pierWorld);
    line.lengthL0 = shipWorld.distanceTo(pierWorld);

    if (line.ropeLine) line.ropeLine.visible = true;
  });
}

// ─────────────────────────────────────────────────────────
// 3. LOOP DE ANIMAÇÃO
// ─────────────────────────────────────────────────────────

/**
 * Loop principal — chamado pelo browser via requestAnimationFrame.
 * Executa física, atualiza cabos e renderiza a cena.
 *
 * @param {number} timestamp - Tempo atual em ms (fornecido pelo browser)
 */
function animate(timestamp) {
  requestAnimationFrame(animate);

  try {
    const dt = (timestamp - g.lastTime) / 1000;
    g.lastTime = timestamp;

    if (dt > 0 && dt < 1) {
      updatePhysics(dt);
    }

    // ── Renderização dos Cabos dos Rebocadores (Bézier) ──

    Object.values(tugs).forEach(tug => {
      const tRope   = tug.rope;
      const tMeshes = tug.meshes;

      if (!tRope || !tMeshes?.ropeLine) return;

      if (tRope.status >= 1 && tMeshes.winchDrum && tRope.connectedBollard) {
        const startPos = new THREE.Vector3();
        tMeshes.winchDrum.getWorldPosition(startPos);

        const endPos = new THREE.Vector3();
        tRope.connectedBollard.getWorldPosition(endPos);

        // Ponto de controle da Bézier — catenária invertida correta: Alta tensão = Sag 0.
        // Se tension < 1, Sag = max (ex: 5). Se tension > 10, Sag = 0.
        let sag = 5 - (tRope.tension * 0.5);
        if (sag < 0) sag = 0; 
        
        const half  = new THREE.Vector3().lerpVectors(startPos, endPos, 0.5);
        const ctrl  = new THREE.Vector3(half.x, Math.min(startPos.y, endPos.y) - sag, half.z);
        const curve = new THREE.QuadraticBezierCurve3(startPos, ctrl, endPos);

        const pts = curve.getPoints(20);
        tMeshes.ropeLine.geometry.setFromPoints(pts);

        // Feedback de Tensão (Cores Rígidas)
        if (tRope.tension > 150) {
          tMeshes.ropeLine.material.color.setHex(0xff0000); // Risco Rotura Em Tempo Real
        } else if (tRope.tension > 10) {
          tMeshes.ropeLine.material.color.setHex(0xffff00); // Rígida e Tensa
        } else {
          tMeshes.ropeLine.material.color.setHex(0xffffff); // Frouxa / Normal
        }

        tMeshes.ropeLine.visible = true;

      } else if (tRope.status === 0) {
        tMeshes.ropeLine.visible = false;
      }
    });

    // ── Renderização das Espias de Amarração (Bézier) ────

    mooringLines.forEach(line => {
      if (!line.active || !line.ropeLine || !line.shipRef || !line.pierRef) return;

      const startPos = new THREE.Vector3();
      line.shipRef.getWorldPosition(startPos);
      const endPos = new THREE.Vector3();
      line.pierRef.getWorldPosition(endPos);

      const half = new THREE.Vector3().lerpVectors(startPos, endPos, 0.5);
      const ctrl = new THREE.Vector3(half.x, Math.min(startPos.y, endPos.y) - 1, half.z);
      const pts  = new THREE.QuadraticBezierCurve3(startPos, ctrl, endPos).getPoints(20);

      line.ropeLine.geometry.setFromPoints(pts);
      line.ropeLine.visible = true;
    });

    // ── Animações de Ambiente ─────────────────────────────
    animateWindsock();
    animateCurrentCompass();

    // ── Render ────────────────────────────────────────────
    g.controls?.update();
    g.renderer.render(g.scene, g.camera);

  } catch (err) {
    const errLog = document.getElementById('error-log');
    if (errLog) {
      errLog.style.display = 'block';
      errLog.innerText     = `ERRO: ${err.message}\n${err.stack?.slice(0, 300)}`;
    }
    console.error('[WT-SIM] Erro no animate():', err);
  }
}

// ─────────────────────────────────────────────────────────
// 4. EVENTOS GLOBAIS & UTILITARIOS DA UI
// ─────────────────────────────────────────────────────────

/**
 * Utilitário genérico para tornar painéis HTML arrastáveis (drag & drop)
 */
function makeDraggable(panelId, handleId) {
  const panel = document.getElementById(panelId);
  const handle = document.getElementById(handleId);
  if (!panel || !handle) return;

  let isDragging = false, startX, startY, initLeft, initTop;

  handle.addEventListener('pointerdown', (e) => {
    // Não arrastar se o clique foi num botão interno ou toggle
    if (e.target.tagName.toLowerCase() === 'button' || e.target.tagName.toLowerCase() === 'span') return;
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = panel.getBoundingClientRect();
    initLeft = rect.left;
    initTop = rect.top;
    
    // Converte posicao do elemento para pixels fixos e remove transforms que atrapalham o drag
    panel.style.transform = 'none';
    panel.style.bottom = 'auto'; // desativa bottom para usar top livremente
    panel.style.left = `${initLeft}px`;
    panel.style.top = `${initTop}px`;
    
    handle.setPointerCapture(e.pointerId); // Garante drag mesmo arrastando fora do ecran
  });

  handle.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    panel.style.left = `${initLeft + (e.clientX - startX)}px`;
    panel.style.top  = `${initTop + (e.clientY - startY)}px`;
  });

  handle.addEventListener('pointerup', (e) => {
    isDragging = false;
    handle.releasePointerCapture(e.pointerId);
  });
}


/**
 * Regista todos os event listeners globais da aplicação:
 * redimensionamento, zoom e raycasting de interação.
 */
function setupEventListeners() {
  window.addEventListener('resize', onWindowResize, false);
  
  makeDraggable('winch-panel', 'winch-drag-handle');
  makeDraggable('weather-panel', 'weather-drag-handle');
  makeDraggable('ship-panel', 'ship-drag-handle');

  // ── Zoom Rápido ───────────────────────────────────────

  document.getElementById('btn-zoom-in').addEventListener('click', () => {
    const dir = new THREE.Vector3()
      .subVectors(g.controls.target, g.camera.position)
      .normalize()
      .multiplyScalar(20);
    g.camera.position.add(dir);
    g.controls.update();
  });

  document.getElementById('btn-zoom-out').addEventListener('click', () => {
    const dir = new THREE.Vector3()
      .subVectors(g.camera.position, g.controls.target)
      .normalize()
      .multiplyScalar(20);
    g.camera.position.add(dir);
    g.controls.update();
  });

  // ── Raycasting (Clique / Toque na cena 3D) ────────────

  const canvasEl = g.renderer.domElement;

  canvasEl.addEventListener('pointerdown', (e) => {
    pointerDownPos.set(e.clientX, e.clientY);
  });

  canvasEl.addEventListener('pointerup', (e) => {
    // Ignora drags > 10 px (rotação de câmara)
    if (Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y) > 10) return;

    mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, g.camera);
    const intersects = raycaster.intersectObjects(g.hitboxes);

    if (intersects.length > 0) {
      handleInteraction(intersects[0].object.userData);
    } else if (g.ropeState?.status === 1) {
      // Clicou no vazio com cabo na mão — aborta
      g.ropeState.status   = 0;
      g.ropeLine.visible   = false;
      document.getElementById('status-message').style.display = 'none';
    } else if (g.activeMooringLineId) {
      // Clicou no vazio com espia do navio na mão — aborta (larga na água)
      g.activeMooringLineId = null;
      document.getElementById('status-message').style.display = 'none';
    }
  });
}

// ─────────────────────────────────────────────────────────
// 5. INTERAÇÃO — MÁQUINA DE ESTADOS DO CABO
// ─────────────────────────────────────────────────────────

/**
 * Máquina de estados para a ligação do cabo do guincho:
 *   0 (Solto) → 1 (Na Mão) → 2 (Conectado) → 0 (Largado)
 *
 * Também trata a desamarração das espias do navio.
 *
 * @param {Object}  userData
 * @param {string}  userData.type           - 'winch' | 'bollard' | 'mooring'
 * @param {string}  [userData.tugId]        - ID do rebocador (type='winch')
 * @param {THREE.Mesh} [userData.ref]       - Referência ao cabeço (type='bollard')
 * @param {string}  [userData.mooringId]    - ID da espia (type='mooring')
 */
function handleInteraction(userData) {
  const msgEl       = document.getElementById('status-message');
  const btnDisconn  = document.getElementById('btn-disconnect');

  // ── Estado 0: Seleciona o Guincho ─────────────────────
  if (g.ropeState?.status === 0 && userData.type === 'winch') {
    if (userData.tugId) switchTug(userData.tugId);

    g.ropeState.status = 1;
    g.ropeLine.visible = true;
    msgEl.style.display = 'block';

  // ── Estado 1: Liga ao Cabeço ──────────────────────────
  } else if (g.ropeState?.status === 1 && userData.type === 'bollard') {
    g.ropeState.status           = 2;
    g.ropeState.connectedBollard = userData.ref;
    msgEl.style.display          = 'none';
    btnDisconn.style.display     = 'block';

    // Comprimento inicial = distância exata no momento da ligação
    const wPos = new THREE.Vector3();
    g.winchDrum.getWorldPosition(wPos);
    const bPos = new THREE.Vector3();
    userData.ref.getWorldPosition(bPos);
    g.ropeState.lengthL0 = wPos.distanceTo(bPos);

  // ── Estado 2: Desconectar clicando no cabeço ligado ───
  } else if (g.ropeState?.status === 2 && userData.type === 'bollard'
             && userData.ref === g.ropeState.connectedBollard) {
    window.attemptDisconnect?.();

  // ── Interação com Espias do Navio (Selecionar para ligar) ───
  } else if (g.ropeState?.status === 0 && userData.type === 'mooring') {
    const line = mooringLines.find(l => l.id === userData.mooringId);
    if (line) {
      line.active           = false;
      line.pierRef          = null;
      line.ropeLine.visible = false;
      g.activeMooringLineId = line.id;

      msgEl.innerText             = `${line.type.toUpperCase()} SELECIONADO!\nSelecione um cabeço no cais.`;
      msgEl.style.display         = 'block';
      msgEl.style.background      = 'rgba(239, 68, 68, 0.9)'; // Vermelho
    }

  // ── Ligar Espia do Navio ao Cabeço do Cais ────────────────
  } else if (g.ropeState?.status === 0 && g.activeMooringLineId && userData.type === 'bollard' && userData.isDynamic === false) {
    const line = mooringLines.find(l => l.id === g.activeMooringLineId);
    if (line) {
      line.pierRef          = userData.ref;
      line.active           = true;
      line.ropeLine.visible = true;

      const shipWorld = new THREE.Vector3();
      line.shipRef.getWorldPosition(shipWorld);
      const pierWorld = new THREE.Vector3();
      line.pierRef.getWorldPosition(pierWorld);
      line.lengthL0 = shipWorld.distanceTo(pierWorld);

      g.activeMooringLineId = null;

      msgEl.innerText             = `${line.type.toUpperCase()} CONECTADO!`;
      msgEl.style.display         = 'block';
      msgEl.style.background      = 'rgba(16, 185, 129, 0.9)'; // Verde

      setTimeout(() => {
        if (g.ropeState?.status === 0 && !g.activeMooringLineId) msgEl.style.display = 'none';
        msgEl.style.background = 'rgba(234, 179, 8, 0.9)';
        msgEl.innerText        = 'Selecione o Cabeço no Cais';
      }, 2000);
    }
  }
}

// ─────────────────────────────────────────────────────────
// 6. ARRANQUE
// ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
