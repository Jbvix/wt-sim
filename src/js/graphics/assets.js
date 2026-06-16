/**
 * @file        src/js/graphics/assets.js
 * @description Gestor central de carregamento de assets 3D (Modelos GLB). 
 *              Assegura que as pesadas malhas 3D descarregam antes de iniciar o loop.
 * @author      Jossian Brito <jossiancosta@gmail.com>
 * @version     2.1.0
 * @since       2026-03-30
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// Cache global de modelos carregados
export const modelsCache = {
  containerShip: null,
  tugboat: null
};

/**
 * Inicia o carregamento de todos os assets 3D necessários para a simulação.
 * Coneta-se à função global do UI window.updateLoadingProgress para a barra.
 * 
 * @returns {Promise<void>} Resolve quando todos os modelos estiverem carregados.
 */
export function loadAllAssets() {
  return new Promise((resolve, reject) => {
    
    // 1. Configuramos o LoadingManager para rastrear múltiplos downloads
    const manager = new THREE.LoadingManager();

    manager.onProgress = function (url, itemsLoaded, itemsTotal) {
      const percentage = (itemsLoaded / itemsTotal) * 100;
      // Atualiza a barra na Splash Screen
      if (typeof window.updateLoadingProgress === 'function') {
        window.updateLoadingProgress(percentage);
      }
    };

    manager.onLoad = function () {
      console.log('[Assets] Todos os modelos 3D carregados com sucesso.');
      // Ativa o botão Lançar da Splash Screen
      if (typeof window.enableLaunchButton === 'function') {
        window.enableLaunchButton();
      }
      resolve();
    };

    manager.onError = function (url) {
      console.error(`[Assets] Erro ao carregar o ficheiro: ${url}`);
      reject(new Error(`Falha no download via GLTFLoader: ${url}`));
    };

    // 2. Instanciamos o loader com suporte a Draco (geometria comprimida).
    //    Os GLB foram otimizados com KHR_draco_mesh_compression + EXT_texture_webp
    //    (~93MB → ~6.7MB). O WebP é descodificado nativamente pelo browser; o
    //    Draco requer este decoder WASM self-hosted em /public/draco/.
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('draco/');
    dracoLoader.setDecoderConfig({ type: 'wasm' });

    const loader = new GLTFLoader(manager);
    loader.setDRACOLoader(dracoLoader);

    // 3. Encomendamos o Navio
    loader.load(
      'Assets/container ship/container_ship.glb',
      (gltf) => {
        modelsCache.containerShip = gltf.scene;
      }
    );

    // 4. Encomendamos o Rebocador ASD
    loader.load(
      'Assets/tugboat/boat_ff_v2.glb',
      (gltf) => {
        modelsCache.tugboat = gltf.scene;
      }
    );
  });
}
