import * as THREE from "three";
import type { TexKit } from "./textures.ts";

export type MatKit = {
  enamel: THREE.MeshPhysicalMaterial;
  enamelDark: THREE.MeshPhysicalMaterial;
  gold: THREE.MeshPhysicalMaterial;
  copper: THREE.MeshPhysicalMaterial;
  amber: THREE.MeshPhysicalMaterial;
  stone: THREE.MeshStandardMaterial;
  stoneDark: THREE.MeshStandardMaterial;
  water: THREE.ShaderMaterial;
  sky: THREE.ShaderMaterial;
  cloud: THREE.MeshBasicMaterial;
  lantern: THREE.MeshBasicMaterial;
  feather: THREE.MeshBasicMaterial;
  ember: THREE.MeshBasicMaterial;
  ray: THREE.MeshBasicMaterial;
  soft: THREE.MeshBasicMaterial;
  gate: THREE.MeshPhysicalMaterial;
  moss: THREE.MeshStandardMaterial;
};

const waterVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const waterFrag = /* glsl */ `
  uniform sampler2D map;
  uniform float time;
  uniform float scroll;
  uniform float night;
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vec2 uv = vUv * 3.4;
    uv.x += scroll * 0.045 + time * 0.018;
    uv.y += sin(vWorld.x * 0.35 + time * 0.6) * 0.02;
    vec2 uv2 = vUv * 2.1 + vec2(-scroll * 0.02, time * 0.01);
    vec3 a = texture2D(map, uv).rgb;
    vec3 b = texture2D(map, uv2).rgb;
    vec3 col = mix(a, b, 0.35);
    vec3 teal = vec3(0.08, 0.22, 0.28);
    col = mix(teal, col, 0.28);
    float spec = pow(0.55 + 0.45 * sin(vWorld.x * 0.8 - time * 1.4), 8.0);
    col += vec3(1.0, 0.78, 0.42) * spec * 0.22;
    float fres = pow(1.0 - abs(normalize(cameraPosition - vWorld).y), 2.2);
    vec3 dusk = vec3(0.95, 0.58, 0.42);
    vec3 midn = vec3(0.12, 0.12, 0.28);
    col = mix(col, mix(dusk, midn, night), fres * 0.38);
    gl_FragColor = vec4(col, 0.94);
  }
`;

const skyVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFrag = /* glsl */ `
  uniform sampler2D dusk;
  uniform sampler2D night;
  uniform float mixAmt;
  varying vec2 vUv;
  void main() {
    vec2 uv = vec2(vUv.x, mix(0.42, 1.0, vUv.y));
    vec3 d = texture2D(dusk, uv).rgb;
    vec3 n = texture2D(night, uv).rgb;
    vec3 col = mix(d, n, mixAmt);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createMaterials(tex: TexKit): MatKit {
  const enamel = new THREE.MeshPhysicalMaterial({
    color: 0xf3e6c8,
    roughness: 0.32,
    metalness: 0.12,
    clearcoat: 0.7,
    clearcoatRoughness: 0.22,
    sheen: 0.55,
    sheenColor: new THREE.Color(0xffd9a0),
    sheenRoughness: 0.4,
    iridescence: 0.18,
    iridescenceIOR: 1.6,
  });

  const enamelDark = new THREE.MeshPhysicalMaterial({
    color: 0xd8c4a0,
    roughness: 0.42,
    metalness: 0.08,
    clearcoat: 0.35,
  });

  const gold = new THREE.MeshPhysicalMaterial({
    color: 0xe6b84d,
    map: tex.gold,
    bumpMap: tex.gold,
    bumpScale: 0.025,
    metalness: 0.92,
    roughness: 0.28,
    envMapIntensity: 1.3,
  });

  const copper = new THREE.MeshPhysicalMaterial({
    color: 0xc47b4a,
    metalness: 0.85,
    roughness: 0.38,
  });

  const amber = new THREE.MeshPhysicalMaterial({
    color: 0xffb030,
    emissive: 0xff7a12,
    emissiveIntensity: 0.85,
    roughness: 0.18,
    metalness: 0.05,
    transmission: 0.15,
    thickness: 0.4,
  });

  const stone = new THREE.MeshStandardMaterial({
    map: tex.stone,
    bumpMap: tex.stone,
    bumpScale: 0.06,
    roughness: 0.78,
    metalness: 0.12,
    color: 0xcfd8cc,
  });

  const stoneDark = new THREE.MeshStandardMaterial({
    map: tex.stone,
    bumpMap: tex.stone,
    bumpScale: 0.08,
    roughness: 0.88,
    metalness: 0.06,
    color: 0x8a9388,
  });

  const water = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: tex.water },
      time: { value: 0 },
      scroll: { value: 0 },
      night: { value: 0 },
    },
    vertexShader: waterVert,
    fragmentShader: waterFrag,
    transparent: true,
  });

  const sky = new THREE.ShaderMaterial({
    uniforms: {
      dusk: { value: tex.skyDusk },
      night: { value: tex.skyNight },
      mixAmt: { value: 0 },
    },
    vertexShader: skyVert,
    fragmentShader: skyFrag,
    side: THREE.BackSide,
    depthWrite: false,
  });

  const cloud = new THREE.MeshBasicMaterial({
    map: tex.cloud,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const lantern = new THREE.MeshBasicMaterial({
    map: tex.lantern,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const feather = new THREE.MeshBasicMaterial({
    map: tex.feather,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const ember = new THREE.MeshBasicMaterial({
    map: tex.ember,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const ray = new THREE.MeshBasicMaterial({
    map: tex.ray,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const soft = new THREE.MeshBasicMaterial({
    map: tex.soft,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const gate = new THREE.MeshPhysicalMaterial({
    color: 0xe8c36a,
    metalness: 0.95,
    roughness: 0.22,
    emissive: 0x5a3a08,
    emissiveIntensity: 0.25,
  });

  const moss = new THREE.MeshStandardMaterial({
    color: 0x3d7a66,
    roughness: 0.9,
    metalness: 0.04,
  });

  return {
    enamel,
    enamelDark,
    gold,
    copper,
    amber,
    stone,
    stoneDark,
    water,
    sky,
    cloud,
    lantern,
    feather,
    ember,
    ray,
    soft,
    gate,
    moss,
  };
}

export const vignetteShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    grain: { value: 0.045 },
    vig: { value: 0.42 },
    time: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float grain;
    uniform float vig;
    uniform float time;
    varying vec2 vUv;
    float n(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    void main() {
      vec2 uv = vUv;
      vec2 ca = (uv - 0.5) * 0.0028;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - ca).b;
      float d = distance(uv, vec2(0.5));
      col *= 1.0 - smoothstep(0.35, 1.05, d) * vig;
      col += (n(uv * vec2(1920.0, 1080.0) + time) - 0.5) * grain;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
