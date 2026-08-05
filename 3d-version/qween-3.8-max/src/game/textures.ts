import * as THREE from 'three';

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

export function makeGrassTopTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#5cbb45';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const l = Math.random();
    g.fillStyle = l > 0.66 ? 'rgba(140,225,105,0.5)' : l > 0.33 ? 'rgba(70,160,50,0.45)' : 'rgba(96,196,70,0.5)';
    g.fillRect(x, y, 1 + Math.random() * 2, 2 + Math.random() * 4);
  }
  for (let i = 0; i < 26; i++) {
    g.fillStyle = 'rgba(60,140,44,0.35)';
    g.beginPath();
    g.ellipse(Math.random() * 256, Math.random() * 256, 8 + Math.random() * 18, 4 + Math.random() * 9, Math.random() * 3, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

export function makePipeTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(256, 64);
  const grad = g.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0, '#1e7d32');
  grad.addColorStop(0.14, '#43b649');
  grad.addColorStop(0.3, '#8fe08a');
  grad.addColorStop(0.46, '#5ecb5f');
  grad.addColorStop(0.72, '#35953d');
  grad.addColorStop(1, '#1a6329');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = 'rgba(255,255,255,0.14)';
  g.fillRect(44, 0, 10, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

export function makeGrassTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(256, 64);
  g.fillStyle = '#8a5a2b';
  g.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 340; i++) {
    const x = Math.random() * 256;
    const y = 10 + Math.random() * 54;
    g.fillStyle = Math.random() > 0.5 ? 'rgba(60,36,14,0.35)' : 'rgba(214,164,100,0.3)';
    g.fillRect(x, y, 2 + Math.random() * 3, 1 + Math.random() * 2);
  }
  g.fillStyle = '#67c33f';
  g.fillRect(0, 0, 256, 12);
  g.fillStyle = '#8fe05f';
  g.fillRect(0, 0, 256, 4);
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 256;
    g.fillStyle = Math.random() > 0.5 ? '#5aab34' : '#a4ef7a';
    g.fillRect(x, 4, 2, 4 + Math.random() * 7);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

export function makeSoftCircle(): THREE.CanvasTexture {
  const [c, g] = canvas(64, 64);
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.65)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeSparkle(): THREE.CanvasTexture {
  const [c, g] = canvas(64, 64);
  g.translate(32, 32);
  g.fillStyle = '#fff';
  for (let i = 0; i < 4; i++) {
    g.rotate(Math.PI / 2);
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(5, 8, 0, 28);
    g.quadraticCurveTo(-5, 8, 0, 0);
    g.fill();
  }
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, 9);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(0, 0, 9, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeBlobShadow(): THREE.CanvasTexture {
  const [c, g] = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0, 'rgba(20,40,20,0.55)');
  grad.addColorStop(0.7, 'rgba(20,40,20,0.22)');
  grad.addColorStop(1, 'rgba(20,40,20,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export function makeSunGlow(): THREE.CanvasTexture {
  const [c, g] = canvas(256, 256);
  const grad = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  grad.addColorStop(0, 'rgba(255,244,214,1)');
  grad.addColorStop(0.25, 'rgba(255,238,170,0.85)');
  grad.addColorStop(0.55, 'rgba(255,226,130,0.28)');
  grad.addColorStop(1, 'rgba(255,220,120,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeStripeAlpha(): THREE.CanvasTexture {
  const [c, g] = canvas(64, 128);
  g.clearRect(0, 0, 64, 128);
  g.fillStyle = '#fff';
  for (let i = 0; i < 9; i++) {
    const x = 2 + Math.random() * 56;
    const w = 2 + Math.random() * 3;
    const h = 22 + Math.random() * 60;
    g.globalAlpha = 0.5 + Math.random() * 0.5;
    g.beginPath();
    g.moveTo(x, 128);
    g.quadraticCurveTo(x - w, 128 - h * 0.55, x + (Math.random() - 0.5) * 6, 128 - h);
    g.quadraticCurveTo(x + w, 128 - h * 0.55, x + w * 0.7, 128);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}
