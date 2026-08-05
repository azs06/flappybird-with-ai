import * as THREE from 'three';

// ---------------------------------------------------------------------------
// SparkPool — one draw call of additive, shader-driven points.
// CPU integrates a fixed pool; the shader handles size attenuation + fade.
// ---------------------------------------------------------------------------

function softCircleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.85)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class SparkPool {
  constructor(scene, capacity = 700) {
    this.capacity = capacity;
    this.cursor = 0;
    this.pos = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 3);
    this.size = new Float32Array(capacity);
    this.fade = new Float32Array(capacity); // remaining life 0..1
    this.vel = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.grav = new Float32Array(capacity);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('aFade', new THREE.BufferAttribute(this.fade, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 500);

    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: softCircleTexture() } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aFade;
        varying vec3 vColor;
        varying float vFade;
        void main() {
          vColor = aColor;
          vFade = aFade;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (240.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        varying vec3 vColor;
        varying float vFade;
        void main() {
          vec4 tex = texture2D(uMap, gl_PointCoord);
          gl_FragColor = vec4(vColor, tex.a * vFade);
        }
      `,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 20;
    scene.add(this.points);
    this._tmpColor = new THREE.Color();
  }

  spawn(x, y, z, { count = 8, color = 0xffd23f, color2 = null, speed = 4, spread = 1, up = 1.5, life = 0.7, size = 1.4, gravity = -6 } = {}) {
    for (let n = 0; n < count; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.capacity;
      const i3 = i * 3;
      this.pos[i3] = x + (Math.random() - 0.5) * spread;
      this.pos[i3 + 1] = y + (Math.random() - 0.5) * spread;
      this.pos[i3 + 2] = z + (Math.random() - 0.5) * spread * 0.6;
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * speed;
      this.vel[i3] = Math.cos(a) * r;
      this.vel[i3 + 1] = Math.sin(a) * r * 0.7 + up;
      this.vel[i3 + 2] = (Math.random() - 0.5) * speed * 0.6;
      this._tmpColor.set(color2 && Math.random() < 0.5 ? color2 : color);
      this.col[i3] = this._tmpColor.r;
      this.col[i3 + 1] = this._tmpColor.g;
      this.col[i3 + 2] = this._tmpColor.b;
      this.maxLife[i] = this.life[i] = life * (0.6 + Math.random() * 0.6);
      this.size[i] = size * (0.7 + Math.random() * 0.7);
      this.grav[i] = gravity;
      this.fade[i] = 1;
    }
  }

  update(dt) {
    const { pos, vel, life, maxLife, fade, grav, capacity } = this;
    for (let i = 0; i < capacity; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      const i3 = i * 3;
      if (life[i] <= 0) {
        fade[i] = 0;
        pos[i3 + 1] = -999;
        continue;
      }
      vel[i3 + 1] += grav[i] * dt;
      pos[i3] += vel[i3] * dt;
      pos[i3 + 1] += vel[i3 + 1] * dt;
      pos[i3 + 2] += vel[i3 + 2] * dt;
      fade[i] = life[i] / maxLife[i];
    }
    const geo = this.points.geometry;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aFade.needsUpdate = true;
    geo.attributes.aColor.needsUpdate = true;
    geo.attributes.aSize.needsUpdate = true;
  }
}

// ---------------------------------------------------------------------------
// FeatherPool — instanced paper-cut feathers for crash bursts and flap puffs.
// ---------------------------------------------------------------------------

function featherGeometry() {
  // Stylized feather: a rounded blade with a notch, extruded paper-thin.
  const s = new THREE.Shape();
  s.moveTo(0, -0.16);
  s.quadraticCurveTo(0.12, -0.05, 0.09, 0.1);
  s.quadraticCurveTo(0.07, 0.2, 0, 0.24);
  s.quadraticCurveTo(-0.07, 0.2, -0.09, 0.1);
  s.quadraticCurveTo(-0.12, -0.05, 0, -0.16);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.015, bevelEnabled: false });
  geo.translate(0, 0, -0.0075);
  return geo;
}

export class FeatherPool {
  constructor(scene, capacity = 30) {
    this.capacity = capacity;
    const geo = featherGeometry();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffe9a8,
      roughness: 0.9,
      metalness: 0,
      side: THREE.DoubleSide,
      emissive: 0x332200,
      emissiveIntensity: 0.25,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = capacity;
    scene.add(this.mesh);

    this.items = Array.from({ length: capacity }, () => ({
      alive: false, life: 0, maxLife: 1,
      p: new THREE.Vector3(), v: new THREE.Vector3(),
      rot: new THREE.Euler(), rv: new THREE.Vector3(), scale: 1,
    }));
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._s = new THREE.Vector3();
    this._hidden = new THREE.Matrix4().makeTranslation(0, -999, 0);
    for (let i = 0; i < capacity; i++) this.mesh.setMatrixAt(i, this._hidden);
  }

  burst(origin, { count = 10, speed = 5, life = 1.6, scale = 1 } = {}) {
    let spawned = 0;
    for (let i = 0; i < this.capacity && spawned < count; i++) {
      const it = this.items[i];
      if (it.alive) continue;
      it.alive = true;
      spawned++;
      it.p.copy(origin);
      const a = Math.random() * Math.PI * 2;
      it.v.set(Math.cos(a) * speed * Math.random(), 2 + Math.random() * speed * 0.8, Math.sin(a) * speed * 0.6 * Math.random());
      it.rot.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      it.rv.set((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9);
      it.maxLife = it.life = life * (0.7 + Math.random() * 0.6);
      it.scale = scale * (0.7 + Math.random() * 0.8);
    }
  }

  update(dt) {
    for (let i = 0; i < this.capacity; i++) {
      const it = this.items[i];
      if (!it.alive) continue;
      it.life -= dt;
      if (it.life <= 0) {
        it.alive = false;
        this.mesh.setMatrixAt(i, this._hidden);
        continue;
      }
      // Feathers flutter: light gravity + air drag + tumble.
      it.v.y -= 4.5 * dt;
      it.v.multiplyScalar(1 - 1.6 * dt);
      it.p.addScaledVector(it.v, dt);
      it.rot.x += it.rv.x * dt;
      it.rot.y += it.rv.y * dt;
      it.rot.z += it.rv.z * dt;
      const k = it.scale * Math.min(1, it.life / (it.maxLife * 0.3));
      this._q.setFromEuler(it.rot);
      this._s.setScalar(k);
      this._m.compose(it.p, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
