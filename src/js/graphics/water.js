/**
 * @file        src/js/graphics/water.js
 * @description Oceano procedural leve: ondas por shader, variação de cor,
 *              brilho rasante e animação influenciada por vento/corrente.
 */

import * as THREE from 'three';
import { g, envState } from '../state/globals.js';

const WATER_VERTEX_SHADER = `
  uniform float uTime;
  uniform float uWindStrength;
  uniform vec2 uCurrentVector;

  varying vec2 vUv;
  varying float vWave;
  varying vec3 vWorldPosition;

  float wave(vec2 p, vec2 dir, float speed, float freq, float amp) {
    return sin(dot(p, normalize(dir)) * freq + uTime * speed) * amp;
  }

  void main() {
    vUv = uv;

    vec3 pos = position;
    vec2 current = length(uCurrentVector) > 0.001 ? normalize(uCurrentVector) : vec2(0.7, 0.3);
    vec2 crossCurrent = vec2(-current.y, current.x);

    float windAmp = 0.18 + min(uWindStrength, 60.0) * 0.012;
    float swell = wave(pos.xz, current, 0.75, 0.030, windAmp);
    float chop = wave(pos.xz + vec2(11.0, -7.0), crossCurrent, 1.85, 0.105, windAmp * 0.30);
    float ripple = wave(pos.xz, vec2(0.35, 0.92), 2.65, 0.185, windAmp * 0.11);

    pos.y += swell + chop + ripple;
    vWave = swell + chop + ripple;

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const WATER_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  uniform vec3 uFoamColor;
  uniform vec3 uSunDirection;

  varying vec2 vUv;
  varying float vWave;
  varying vec3 vWorldPosition;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    vec2 p = vWorldPosition.xz * 0.015;
    float broadNoise = noise(p + uTime * 0.025);
    float fineNoise = noise(p * 14.0 - uTime * 0.065);
    float streakNoise = noise(vec2(vWorldPosition.x * 0.10 + uTime * 0.32, vWorldPosition.z * 0.018 - uTime * 0.08));

    float colorMix = clamp(0.48 + vWave * 0.28 + broadNoise * 0.26, 0.0, 1.0);
    vec3 waterColor = mix(uDeepColor, uShallowColor, colorMix);

    float crestMask = smoothstep(0.18, 0.62, vWave + 0.26);
    float shimmer = smoothstep(0.66, 0.94, streakNoise + fineNoise * 0.22) * crestMask * 0.14;
    float glintBand = pow(max(0.0, dot(normalize(vec3(0.15, 0.92, 0.35)), normalize(uSunDirection))), 2.0);
    vec3 highlight = uFoamColor * shimmer * glintBand;

    float foam = smoothstep(0.70, 0.96, fineNoise + streakNoise * 0.18) * crestMask;
    vec3 foamTint = uFoamColor * foam * 0.018;

    gl_FragColor = vec4(waterColor + highlight + foamTint, 1.0);
  }
`;

function currentVectorFromEnv() {
  const radians = (envState.currentDir - 90) * Math.PI / 180;
  const magnitude = Math.max(0.15, envState.currentMag);
  return new THREE.Vector2(Math.cos(radians) * magnitude, Math.sin(radians) * magnitude);
}

export function createOcean() {
  const geometry = new THREE.PlaneGeometry(1600, 1600, 180, 180);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWindStrength: { value: envState.windMag },
      uCurrentVector: { value: currentVectorFromEnv() },
      uDeepColor: { value: new THREE.Color(0x00384f) },
      uShallowColor: { value: new THREE.Color(0x0c7b9b) },
      uFoamColor: { value: new THREE.Color(0xbcefff) },
      uSunDirection: { value: new THREE.Vector3(0.45, 0.85, 0.25).normalize() },
    },
    vertexShader: WATER_VERTEX_SHADER,
    fragmentShader: WATER_FRAGMENT_SHADER,
  });

  const ocean = new THREE.Mesh(geometry, material);
  ocean.rotation.x = -Math.PI / 2;
  ocean.receiveShadow = true;
  ocean.userData.isProceduralWater = true;
  g.ocean = ocean;
  return ocean;
}

export function updateOcean(dt) {
  const material = g.ocean?.material;
  if (!material?.uniforms) return;

  material.uniforms.uTime.value += dt;
  material.uniforms.uWindStrength.value = envState.windMag;
  material.uniforms.uCurrentVector.value.copy(currentVectorFromEnv());
}
