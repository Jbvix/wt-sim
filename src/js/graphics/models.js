/**
 * @file        src/js/graphics/models.js
 * @description Construção do mundo 3D: oceano, cais, cabeços do cais, biruta,
 *              Navio Mercante Panamax (casco, superestrutura, cabeços BB/BE,
 *              cabeços de reboque) e frota de rebocadores ASD.
 * @author      Jossian Brito <jossiancosta@gmail.com>
 * @version     2.0.0
 * @since       2026-03-28
 */

import * as THREE from 'three';
import { g, shipState, mooringLines } from '../state/globals.js';
import { tugs } from '../fleet/tugData.js';
import { createBuoys } from './buoys.js';
import { modelsCache } from './assets.js';

// ─────────────────────────────────────────────────────────
// 1. GEOMETRIAS PARTILHADAS (definidas uma vez, reutilizadas)
// ─────────────────────────────────────────────────────────

/** Geometria padrão dos cabeços de amarração (cilindro). */
const BOLLARD_GEO = new THREE.CylinderGeometry(0.5, 0.6, 1.5, 16);
/** Material padrão dos cabeços. */
const BOLLARD_MAT = new THREE.MeshStandardMaterial({ color: 0x222222 });
/** Material das hitboxes (invisível ao render). */
const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });
/** Hitbox esférica para deteção de cliques. */
const HIT_GEO = new THREE.SphereGeometry(4.5, 16, 16);

// ─────────────────────────────────────────────────────────
// 2. FUNÇÃO AUXILIAR — Luzes de Navegação
// ─────────────────────────────────────────────────────────

/**
 * Cria e adiciona uma luz de navegação a um parent Group.
 * A intensidade base é armazenada em userData.baseIntensity para
 * ser reposta quando o toggle de luzes for ativado.
 *
 * @param {THREE.Object3D} parent       - Objeto pai (navio ou rebocador)
 * @param {number}         color        - Cor da luz (hex)
 * @param {number}         x            - Posição local X
 * @param {number}         y            - Posição local Y
 * @param {number}         z            - Posição local Z
 * @param {number}         [reach=100]  - Alcance da PointLight (m)
 */
function createNavLight(parent, color, x, y, z, reach = 100) {
  const light = new THREE.PointLight(color, 0, reach);
  light.userData.baseIntensity = 3.0;
  light.position.set(x, y, z);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 8, 8),
    new THREE.MeshBasicMaterial({ color })
  );
  light.add(bulb);
  parent.add(light);
  g.navLights.push(light);
}

// ─────────────────────────────────────────────────────────
// 3. FACTORY — Malha 3D de um Rebocador ASD
// ─────────────────────────────────────────────────────────

/**
 * Constrói e adiciona à cena todas as malhas de um rebocador ASD.
 * Devolve um dicionário de referências de malhas para ser atribuído
 * a tugs[id].meshes.
 *
 * @param {string} tugId    - 'stern' | 'bow'
 * @param {number} colorHex - Cor do casco (0xRRGGBB)
 * @returns {{ tugboat, winchDrum, ropeLine, jetArrowBB, jetArrowBE, resultantArrow, hull, cabin }}
 */
function createTugboatMesh(tugId, colorHex) {
  const group  = new THREE.Group();
  const meshes = {};

  // ── Casco e Superestrutura (Modelo GLB ou Primitivas) ──
  if (modelsCache.tugboat) {
    const tugModel = modelsCache.tugboat.clone();

    // Aplica sombras
    tugModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Medir dimensões brutas para forçar comprimento de 32 metros
    const box = new THREE.Box3().setFromObject(tugModel);
    const size = new THREE.Vector3();
    box.getSize(size);

    const isZLong = size.z > size.x;
    const rawLength = isZLong ? size.z : size.x;
    const scale = 32 / rawLength;
    tugModel.scale.set(scale, scale, scale);

    if (isZLong) {
      tugModel.rotation.y = Math.PI / 2;
    }

    const scaledBox = new THREE.Box3().setFromObject(tugModel);
    const center = new THREE.Vector3();
    scaledBox.getCenter(center);

    // O fundo do casco fica submerso. Assumimos um calado de -1.5m para visual
    tugModel.position.set(-center.x, -scaledBox.min.y - 1.5, -center.z);

    const visualGroup = new THREE.Group();
    visualGroup.add(tugModel);
    group.add(visualGroup);
    meshes.hull = visualGroup; // Fallback ref

  } else {
    // ── Fallback Primitivas ────────────────────────────────
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(32, 6, 12),
      new THREE.MeshStandardMaterial({ color: colorHex })
    );
    hull.position.y = 3;
    hull.castShadow = true;
    group.add(hull);
    meshes.hull = hull;

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(10, 6, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    cabin.position.set(-5, 6 + 3, 0);
    cabin.castShadow = true;
    group.add(cabin);
    meshes.cabin = cabin;
  }

  // ── Guincho de Proa ────────────────────────────────────
  const winchBase = new THREE.Mesh(
    new THREE.BoxGeometry(3, 1.5, 4),
    new THREE.MeshStandardMaterial({ color: 0x444444 })
  );
  winchBase.position.set(12, 6 + 0.75, 0);
  winchBase.castShadow = true;
  group.add(winchBase);

  // Tambor do Guincho
  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 3, 16),
    new THREE.MeshStandardMaterial({ color: 0x444444 })
  );
  drum.rotation.x = Math.PI / 2;
  drum.position.set(12, 6 + 1.9, 0);
  drum.castShadow = true;
  group.add(drum);
  meshes.winchDrum = drum;

  // Hitbox do Guincho (clicável)
  const winchHitbox = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 16), HIT_MAT);
  winchHitbox.position.copy(drum.position);
  winchHitbox.userData = { type: 'winch', tugId };
  group.add(winchHitbox);
  g.hitboxes.push(winchHitbox);

  // ── Luzes de Navegação do Rebocador ────────────────────
  createNavLight(group, 0xff0000, -5, 10, -4.5, 150); // BB (vermelho)
  createNavLight(group, 0x00ff00, -5, 10,  4.5, 150); // BE (verde)
  createNavLight(group, 0xffffff, -4, 13,  0,   300); // Mastro
  createNavLight(group, 0xffffff, -16, 5,  0,   150); // Popa

  // ── Vetores Cinemáticos (ArrowHelpers) ─────────────────
  const arrowBB = new THREE.ArrowHelper(
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(-14, 0, -4),
    0.1, 0x00ffff, 1, 0.5
  );
  group.add(arrowBB);
  meshes.jetArrowBB = arrowBB;

  const arrowBE = new THREE.ArrowHelper(
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(-14, 0, 4),
    0.1, 0x00ffff, 1, 0.5
  );
  group.add(arrowBE);
  meshes.jetArrowBE = arrowBE;

  const resArrow = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 6, 0),
    0.1, 0x39ff14, 2, 1
  );
  group.add(resArrow);
  meshes.resultantArrow = resArrow;

  // ── Cabo HMPE (Curva Bézier dinâmica) ──────────────────
  const ropePoints = Array.from({ length: 21 }, () => new THREE.Vector3());
  const ropeGeo = new THREE.BufferGeometry().setFromPoints(ropePoints);
  const ropeL   = new THREE.Line(ropeGeo, new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2 }));
  ropeL.visible  = false;
  g.scene.add(ropeL);
  meshes.ropeLine = ropeL;

  meshes.tugboat = group;
  g.scene.add(group);

  return meshes;
}

// ─────────────────────────────────────────────────────────
// 4. CONSTRUÇÃO DO MUNDO (chamada uma vez em init)
// ─────────────────────────────────────────────────────────

/**
 * Povoa a cena Three.js: oceano, cais, cabeços do cais, biruta de vento,
 * Navio Mercante Panamax e frota de rebocadores ASD.
 * Deve ser chamado após setupGraphics() e antes de setupDockedScenario().
 */
export function buildWorld() {

  // ── A. Oceano ─────────────────────────────────────────

  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(1000, 1000),
    new THREE.MeshStandardMaterial({ color: 0x006994, roughness: 0.1, metalness: 0.1 })
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.receiveShadow = true;
  g.scene.add(ocean);

  // ── B. Cais de Betão ─────────────────────────────────

  g.pier = new THREE.Mesh(
    new THREE.BoxGeometry(400, 5, 20),
    new THREE.MeshStandardMaterial({ color: 0x808080 })
  );
  g.pier.position.set(0, 2.5, -20); // Face frontal em Z = -10
  g.pier.castShadow    = true;
  g.pier.receiveShadow = true;
  g.scene.add(g.pier);

  // ── C. Cabeços do Cais ────────────────────────────────

  [-150, -100, -50, 0, 50, 100, 150].forEach(xPos => {
    const b = new THREE.Mesh(BOLLARD_GEO, BOLLARD_MAT);
    b.position.set(xPos, 5 + 0.75, -15);
    b.castShadow = true;
    g.scene.add(b);
    g.pierBollards.push({ x: xPos, ref: b });

    const bHit = new THREE.Mesh(HIT_GEO, HIT_MAT);
    bHit.position.copy(b.position);
    bHit.userData = { type: 'bollard', ref: b, isDynamic: false };
    g.scene.add(bHit);
    g.hitboxes.push(bHit);
  });

  // ── D. Biruta de Vento (Windsock) ────────────────────

  const windsockGroup = new THREE.Group();
  windsockGroup.position.set(50, 5, -20);

  // Poste Metálico
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
  );
  pole.position.y = 5;
  pole.castShadow = true;
  windsockGroup.add(pole);

  // Tecido cônico (fabric)
  g.windsockFabric = new THREE.Group();
  g.windsockFabric.position.set(0, 10, 0);

  const sockGeo = new THREE.CylinderGeometry(0.8, 0.3, 5, 16, 1, true);
  sockGeo.translate(0, -2.5, 0);
  sockGeo.rotateZ(Math.PI / 2);

  const sock = new THREE.Mesh(
    sockGeo,
    new THREE.MeshStandardMaterial({ color: 0xff4500, side: THREE.DoubleSide })
  );
  sock.castShadow = true;
  g.windsockFabric.add(sock);
  windsockGroup.add(g.windsockFabric);
  g.scene.add(windsockGroup);

  // ── E. Navio Mercante Panamax ─────────────────────────

  g.merchantShip = new THREE.Group();

  // E.1 & E.2 Modelo GLB do Porta-Contentores
  if (modelsCache.containerShip) {
    const shipModel = modelsCache.containerShip.clone();

    // Habilita sombras e corrige materiais
    shipModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Medir as dimensões brutas do modelo
    const box = new THREE.Box3().setFromObject(shipModel);
    const size = new THREE.Vector3();
    box.getSize(size);

    // Identificar o eixo longitudinal (maior) e calcular escala para 225 metros
    const isZLong = size.z > size.x;
    const rawLength = isZLong ? size.z : size.x;
    const scale = 225 / rawLength;
    shipModel.scale.set(scale, scale, scale);

    // Alinhar ao eixo X físico se o modelo vier alinhado com Z
    if (isZLong) {
      shipModel.rotation.y = Math.PI / 2;
    }

    // Recalcular a Box atual após a escala e rotação para centralizar
    const scaledBox = new THREE.Box3().setFromObject(shipModel);
    const center = new THREE.Vector3();
    scaledBox.getCenter(center);
    
    // Alinha o pivô ao centro X,Z. O navio fica com o fundo abaixo de Y=0 para afundar na água.
    shipModel.position.set(-center.x, -scaledBox.min.y - 4, -center.z); // -4 calado forçado

    const visualGroup = new THREE.Group();
    visualGroup.add(shipModel);
    g.merchantShip.add(visualGroup);
  } else {
    // Fallback Geometrias Primitivas (se falhar carregamento)
    const shipHull = new THREE.Mesh(
      new THREE.BoxGeometry(225, 14, 32),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a })
    );
    shipHull.position.y = 7;
    shipHull.castShadow = true;
    g.merchantShip.add(shipHull);

    const shipCabin = new THREE.Mesh(
      new THREE.BoxGeometry(32, 12, 20),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    shipCabin.position.set(-90, 14 + 6, 0);
    shipCabin.castShadow = true;
    g.merchantShip.add(shipCabin);
  }

  // E.3 Cabeços de Amarração — BB (cais) e BE (mar)
  const mooringPositions = [
    // ── Bombordo (BB) — Costado do Cais (z = -14) ──────
    { id: 'bow-head',        xPos:  105, zPos: -14, type: 'mooring' }, // Lançante Proa BB
    { id: 'bow-spring',      xPos:   80, zPos: -14, type: 'mooring' }, // Espringue Proa BB
    { id: 'stern-spring',    xPos:  -80, zPos: -14, type: 'mooring' }, // Espringue Popa BB
    { id: 'stern-head',      xPos: -105, zPos: -14, type: 'mooring' }, // Lançante Popa BB
    // ── Boreste (BE) — Costado do Mar (z = +14) ─────────
    { id: 'bow-head-be',     xPos:  105, zPos: +14, type: 'bollard' }, // Lançante Proa BE
    { id: 'bow-spring-be',   xPos:   80, zPos: +14, type: 'bollard' }, // Espringue Proa BE
    { id: 'stern-spring-be', xPos:  -80, zPos: +14, type: 'bollard' }, // Espringue Popa BE
    { id: 'stern-head-be',   xPos: -105, zPos: +14, type: 'bollard' }, // Lançante Popa BE
  ];

  mooringPositions.forEach(m => {
    const b = new THREE.Mesh(BOLLARD_GEO, BOLLARD_MAT);
    b.position.set(m.xPos, 14 + 0.75, m.zPos);
    b.castShadow = true;
    b.userData = { isDynamic: true };
    g.merchantShip.add(b);

    const bHit = new THREE.Mesh(HIT_GEO, HIT_MAT);
    bHit.position.copy(b.position);
    bHit.userData = { type: m.type, ref: b, isDynamic: true, mooringId: m.id };
    g.merchantShip.add(bHit);
    g.hitboxes.push(bHit);

    // Liga física: apenas BB tem espia ao cais
    const mooring = mooringLines.find(l => l.id === m.id);
    if (mooring) mooring.shipRef = b;
  });

  // E.4 Cabeços de Reboque (Proa e Popa — eixo longitudinal)
  [
    { x: -110, label: 'popa' },  // Popa: dentro do casco (±112.5 m)
    { x:  105, label: 'proa' },  // Proa
  ].forEach(({ x }) => {
    const b = new THREE.Mesh(BOLLARD_GEO, BOLLARD_MAT);
    b.position.set(x, 14 + 0.75, 0);
    b.castShadow = true;
    b.userData = { isDynamic: true };
    g.merchantShip.add(b);

    const bHit = new THREE.Mesh(HIT_GEO, HIT_MAT);
    bHit.position.copy(b.position);
    bHit.userData = { type: 'bollard', ref: b, isDynamic: true };
    g.merchantShip.add(bHit);
    g.hitboxes.push(bHit);
  });

  // E.5 Luzes de Navegação do Panamax
  createNavLight(g.merchantShip, 0xff0000, -85, 20, -16.5, 400); // BB
  createNavLight(g.merchantShip, 0x00ff00, -85, 20,  16.5, 400); // BE
  createNavLight(g.merchantShip, 0xffffff, -70, 26,     0, 800); // Mastro
  createNavLight(g.merchantShip, 0xffffff, -112.5, 10,  0, 400); // Popa

  // Posiciona navio de acordo com o estado físico inicial
  g.merchantShip.position.set(shipState.position.x, 0, shipState.position.y);
  g.scene.add(g.merchantShip);

  // ── F. Frota de Rebocadores ───────────────────────────

  Object.values(tugs).forEach(tug => {
    tug.meshes = createTugboatMesh(tug.id, tug.color);
  });

  // ── G. Malhas das Espias de Amarração ─────────────────

  mooringLines.forEach(line => {
    const points = Array.from({ length: 21 }, () => new THREE.Vector3());
    const geo    = new THREE.BufferGeometry().setFromPoints(points);
    line.ropeLine = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: line.color, linewidth: 2 }));
    line.ropeLine.visible = false;
    g.scene.add(line.ropeLine);
  });

  // ── H. Boias Náuticas do Canal de Manobra ─────────────
  createBuoys();
}
