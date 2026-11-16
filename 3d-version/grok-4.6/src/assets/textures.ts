import * as THREE from "three";

export type TexKit = {
  skyDusk: THREE.Texture;
  skyNight: THREE.Texture;
  stone: THREE.Texture;
  water: THREE.Texture;
  gold: THREE.Texture;
  bird: THREE.Texture;
  birdBody: THREE.Texture;
  birdDown: THREE.Texture;
  wing: THREE.Texture;
  cloud: THREE.Texture;
  feather: THREE.Texture;
  lantern: THREE.Texture;
  ember: THREE.Texture;
  ray: THREE.Texture;
  soft: THREE.Texture;
};

function colorMap(tex: THREE.Texture, aniso: number): THREE.Texture {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = aniso;
  tex.needsUpdate = true;
  return tex;
}

function repeatMap(tex: THREE.Texture, aniso: number, x = 2, y = 2): THREE.Texture {
  colorMap(tex, aniso);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(x, y);
  return tex;
}

function canvasTex(draw: (ctx: CanvasRenderingContext2D, size: number) => void, size = 256): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeUtilityTextures(): { ray: THREE.Texture; soft: THREE.Texture } {
  const ray = canvasTex((ctx, s) => {
    const g = ctx.createLinearGradient(s * 0.5, 0, s * 0.5, s);
    g.addColorStop(0, "rgba(255,220,140,0)");
    g.addColorStop(0.18, "rgba(255,210,130,0.22)");
    g.addColorStop(0.55, "rgba(255,180,90,0.08)");
    g.addColorStop(1, "rgba(255,160,80,0)");
    ctx.fillStyle = g;
    ctx.fillRect(s * 0.35, 0, s * 0.3, s);
  }, 256);

  const soft = canvasTex((ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,230,170,1)");
    g.addColorStop(0.35, "rgba(255,200,110,0.55)");
    g.addColorStop(1, "rgba(255,180,80,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }, 128);

  return { ray, soft };
}

export function loadTextures(): Promise<TexKit> {
  const loader = new THREE.LoadingManager();
  const tl = new THREE.TextureLoader(loader);
  const aniso = 1;
  const { ray, soft } = makeUtilityTextures();

  return new Promise((resolve, reject) => {
    const kit: Partial<TexKit> = { ray, soft };
    loader.onError = (url) => reject(new Error(`Failed to load ${url}`));
    loader.onLoad = () => resolve(kit as TexKit);
    kit.skyDusk = colorMap(tl.load("/assets/sky-dusk.jpg"), aniso);
    kit.skyNight = colorMap(tl.load("/assets/sky-night.jpg"), aniso);
    kit.stone = repeatMap(tl.load("/assets/tex-stone.jpg"), aniso, 2.2, 3.4);
    kit.water = repeatMap(tl.load("/assets/tex-water.jpg"), aniso, 3.5, 3.5);
    kit.gold = repeatMap(tl.load("/assets/tex-gold.jpg"), aniso, 1.6, 1.6);
    kit.bird = colorMap(tl.load("/assets/bird.png"), aniso);
    kit.birdBody = colorMap(tl.load("/assets/bird-body.png"), aniso);
    kit.birdDown = colorMap(tl.load("/assets/bird-down.png"), aniso);
    kit.wing = colorMap(tl.load("/assets/wing.png"), aniso);
    kit.cloud = colorMap(tl.load("/assets/cloud.png"), 4);
    kit.feather = colorMap(tl.load("/assets/feather.png"), 4);
    kit.lantern = colorMap(tl.load("/assets/lantern.png"), 4);
    kit.ember = colorMap(tl.load("/assets/fx-ember.jpg"), 2);
  });
}
