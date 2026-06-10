import {
  Color,
  MeshStandardMaterial,
  type MeshStandardMaterialParameters,
  SRGBColorSpace,
  Texture
} from "three";

export function standardMaterial(params: MeshStandardMaterialParameters): MeshStandardMaterial {
  return new MeshStandardMaterial({
    roughness: 0.62,
    metalness: 0.04,
    ...params
  });
}

export function makeStripeTexture(primary: string, secondary: string): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;

  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    return new Texture();
  }

  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = secondary;

  for (let y = -64; y < 96; y += 18) {
    ctx.save();
    ctx.translate(32, y);
    ctx.rotate(-Math.PI / 7);
    ctx.fillRect(-80, -4, 160, 8);
    ctx.restore();
  }

  const texture = new Texture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function colorFromTone(tone: number): Color {
  if (tone === 1) {
    return new Color("#fff176");
  }

  if (tone === 2) {
    return new Color("#ff6b6b");
  }

  return new Color("#ffffff");
}
