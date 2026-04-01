/**
 * @file        src/js/graphics/scene.js
 * @description Inicialização do motor Three.js: cena, câmara, renderer,
 *              luzes e OrbitControls.
 * @author      Jossian Brito <jossiancosta@gmail.com>
 * @version     2.0.0
 * @since       2026-03-28
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { g } from '../state/globals.js';

// ─────────────────────────────────────────────────────────
// 1. SETUP GRÁFICO PRINCIPAL
// ─────────────────────────────────────────────────────────

/**
 * Cria e configura todos os objetos Three.js essenciais.
 * Deve ser chamado uma única vez em init(), antes de buildWorld().
 */
export function setupGraphics() {
  // Cena
  g.scene = new THREE.Scene();
  g.scene.background = new THREE.Color(0x87ceeb); // Azul céu

  // Câmara perspectiva — FOV 60°, near=1, far=3000
  g.camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    3000
  );
  g.camera.position.set(-80, 80, 250); // Vista panorâmica ampla para o Navio (Sprint 1)

  // Renderer WebGL com anti-aliasing e buffer logarítmico (reduz z-fighting)
  g.renderer = new THREE.WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: true,
  });
  g.renderer.setPixelRatio(window.devicePixelRatio || 1);
  g.renderer.setSize(window.innerWidth, window.innerHeight);
  g.renderer.shadowMap.enabled = true;
  g.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Sombras suaves
  document.getElementById('canvas-container').appendChild(g.renderer.domElement);

  // ── Iluminação ────────────────────────────────────────

  // Luz ambiente (iluminação base difusa)
  g.ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  g.scene.add(g.ambientLight);

  // Luz direcional com sombras (simula o sol)
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(200, 300, 100);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width  = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near   = 50;
  dirLight.shadow.camera.far    = 1000;
  const shadowArea = 300;
  dirLight.shadow.camera.left   = -shadowArea;
  dirLight.shadow.camera.right  =  shadowArea;
  dirLight.shadow.camera.top    =  shadowArea;
  dirLight.shadow.camera.bottom = -shadowArea;
  g.scene.add(dirLight);

  // ── Controles de Câmara ───────────────────────────────

  g.controls = new OrbitControls(g.camera, g.renderer.domElement);
  g.controls.enableDamping = true;
  g.controls.dampingFactor = 0.05;
  g.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Impede atravessar a água
  g.controls.target.set(0, 0, 0);
  g.controls.minDistance =   20;
  g.controls.maxDistance = 1500;
}

// ─────────────────────────────────────────────────────────
// 2. EVENTO DE REDIMENSIONAMENTO
// ─────────────────────────────────────────────────────────

/**
 * Atualiza a câmara e o renderer quando a janela é redimensionada.
 * Ligado a window 'resize' em setupEventListeners().
 */
export function onWindowResize() {
  g.camera.aspect = window.innerWidth / window.innerHeight;
  g.camera.updateProjectionMatrix();
  g.renderer.setSize(window.innerWidth, window.innerHeight);
}
