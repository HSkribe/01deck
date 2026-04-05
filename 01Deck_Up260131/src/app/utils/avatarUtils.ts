// ============================================================
//  01 Protocol — Procedural Avatar Generator v2
//  Realistic AI portrait — 14-step deterministic render pipeline
// ============================================================

export type AvatarStyle = 'futuristic' | 'abstract' | 'minimal' | 'neon';

export interface AvatarOptions {
  name: string;
  role: string;
  goal: string;
  seed?: number;
  style?: AvatarStyle;
  hueOverride?: number;
  width?: number;
  height?: number;
}

// ─── RNG ──────────────────────────────────────────────────
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRNG(seed: number) {
  let s = (seed >>> 0) || 1;
  return function (): number {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── Bezier helper ─────────────────────────────────────────
function cubicBezier(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number
) {
  ctx.moveTo(x0, y0);
  ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
}

// ─── Skin palette ─────────────────────────────────────────
interface SkinTone {
  base: string; mid: string; shadow: string;
  highlight: string; lip: string; cheek: string;
  sclera: string;
}

function getSkinTone(rand: () => number, hue: number, style: AvatarStyle): SkinTone {
  const v = rand();

  if (style === 'neon') {
    // Synthetic / android skin — blue or green toned
    const sh = hue;
    return {
      base: `hsl(${sh}, 30%, 22%)`,
      mid: `hsl(${sh}, 25%, 16%)`,
      shadow: `hsl(${sh}, 40%, 10%)`,
      highlight: `hsl(${sh}, 50%, 38%)`,
      lip: `hsl(${sh}, 80%, 55%)`,
      cheek: `hsla(${sh}, 70%, 45%, 0.15)`,
      sclera: `hsl(${sh}, 20%, 88%)`,
    };
  }

  if (style === 'abstract') {
    // Stylized painterly — hue-shifted
    return {
      base: `hsl(${(hue + 180) % 360}, 15%, 48%)`,
      mid: `hsl(${(hue + 180) % 360}, 15%, 35%)`,
      shadow: `hsl(${(hue + 200) % 360}, 20%, 22%)`,
      highlight: `hsl(${(hue + 160) % 360}, 20%, 65%)`,
      lip: `hsl(${(hue + 30) % 360}, 40%, 52%)`,
      cheek: `hsla(${(hue + 20) % 360}, 40%, 55%, 0.12)`,
      sclera: `hsl(0, 0%, 90%)`,
    };
  }

  // Realistic human spectrum
  if (v < 0.18) {
    // Very light / fair
    return { base: 'hsl(27,50%,84%)', mid: 'hsl(24,40%,74%)', shadow: 'hsl(20,35%,60%)', highlight: 'hsl(30,60%,92%)', lip: 'hsl(355,45%,62%)', cheek: 'hsla(5,60%,65%,0.18)', sclera: 'hsl(0,0%,97%)' };
  } else if (v < 0.36) {
    // Light
    return { base: 'hsl(26,42%,78%)', mid: 'hsl(22,36%,68%)', shadow: 'hsl(18,32%,54%)', highlight: 'hsl(28,55%,87%)', lip: 'hsl(350,42%,58%)', cheek: 'hsla(8,55%,62%,0.15)', sclera: 'hsl(0,0%,96%)' };
  } else if (v < 0.54) {
    // Medium / olive
    return { base: 'hsl(24,40%,66%)', mid: 'hsl(20,34%,54%)', shadow: 'hsl(16,30%,40%)', highlight: 'hsl(26,48%,78%)', lip: 'hsl(345,38%,50%)', cheek: 'hsla(10,50%,55%,0.13)', sclera: 'hsl(0,0%,95%)' };
  } else if (v < 0.72) {
    // Tan / brown
    return { base: 'hsl(22,38%,52%)', mid: 'hsl(18,32%,40%)', shadow: 'hsl(14,28%,28%)', highlight: 'hsl(24,44%,66%)', lip: 'hsl(340,36%,40%)', cheek: 'hsla(12,45%,45%,0.12)', sclera: 'hsl(0,0%,94%)' };
  } else if (v < 0.88) {
    // Dark brown
    return { base: 'hsl(20,35%,34%)', mid: 'hsl(16,28%,24%)', shadow: 'hsl(12,24%,15%)', highlight: 'hsl(22,40%,48%)', lip: 'hsl(335,30%,30%)', cheek: 'hsla(15,38%,35%,0.15)', sclera: 'hsl(0,0%,93%)' };
  } else {
    // Deep / ebony
    return { base: 'hsl(18,30%,22%)', mid: 'hsl(14,24%,14%)', shadow: 'hsl(10,20%,8%)', highlight: 'hsl(20,35%,34%)', lip: 'hsl(330,25%,22%)', cheek: 'hsla(18,30%,28%,0.18)', sclera: 'hsl(0,0%,92%)' };
  }
}

// ─── Face shape ───────────────────────────────────────────
interface FaceShape {
  top: number; bottom: number; halfW: number; cx: number; cy: number;
  jawW: number; jawY: number; cheekW: number;
}

function getFaceShape(W: number, H: number, rand: () => number): FaceShape {
  const t = rand();
  const cx = W / 2;
  const faceTop = H * 0.13;
  const faceBot = H * (0.68 + rand() * 0.03);
  const halfW = W * (0.22 + rand() * 0.04);
  const jawW = halfW * (0.55 + rand() * 0.15);
  const jawY = faceBot - H * 0.03;
  const cheekW = halfW * (0.92 + rand() * 0.08);
  const cy = (faceTop + faceBot) / 2;
  return { top: faceTop, bottom: faceBot, halfW, cx, cy, jawW, jawY, cheekW };
}

// ─── Draw realistic face outline ──────────────────────────
function drawFaceOutline(ctx: CanvasRenderingContext2D, f: FaceShape): void {
  const { top, bottom, halfW, cx, jawW, jawY, cheekW } = f;
  ctx.beginPath();
  // Crown
  ctx.moveTo(cx, top);
  // Right temple to cheek
  ctx.bezierCurveTo(cx + halfW * 0.85, top, cx + cheekW, top + (jawY - top) * 0.35, cx + cheekW, top + (jawY - top) * 0.55);
  // Right cheek to jaw
  ctx.bezierCurveTo(cx + cheekW, jawY * 0.96 + top * 0.04, cx + jawW * 1.1, jawY, cx + jawW * 0.5, bottom);
  // Chin
  ctx.bezierCurveTo(cx + jawW * 0.2, bottom + (bottom - jawY) * 0.3, cx - jawW * 0.2, bottom + (bottom - jawY) * 0.3, cx - jawW * 0.5, bottom);
  // Left jaw to cheek
  ctx.bezierCurveTo(cx - jawW * 1.1, jawY, cx - cheekW, jawY * 0.96 + top * 0.04, cx - cheekW, top + (jawY - top) * 0.55);
  // Left cheek to crown
  ctx.bezierCurveTo(cx - cheekW, top + (jawY - top) * 0.35, cx - halfW * 0.85, top, cx, top);
  ctx.closePath();
}

// ─── Eye drawing ──────────────────────────────────────────
function drawRealisticEye(
  ctx: CanvasRenderingContext2D,
  ex: number, ey: number,
  eW: number, eH: number,
  irisHue: number, skin: SkinTone, rand: () => number,
  style: AvatarStyle, flip: boolean
) {
  ctx.save();
  ctx.translate(ex, ey);
  if (flip) ctx.scale(-1, 1);

  // Eye socket depth shadow
  const sockGrad = ctx.createRadialGradient(0, eH * 0.2, 0, 0, 0, eW * 1.1);
  sockGrad.addColorStop(0, 'transparent');
  sockGrad.addColorStop(0.6, 'rgba(0,0,0,0.06)');
  sockGrad.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = sockGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, eW * 1.1, eH * 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Create eye clipping path (almond shape)
  ctx.beginPath();
  ctx.moveTo(-eW, 0);
  ctx.bezierCurveTo(-eW * 0.8, -eH * 1.05, eW * 0.8, -eH * 1.05, eW, 0);
  ctx.bezierCurveTo(eW * 0.8, eH * 0.7, -eW * 0.8, eH * 0.7, -eW, 0);
  ctx.closePath();
  ctx.save();
  ctx.clip();

  // Sclera
  const scleraGrad = ctx.createRadialGradient(-eW * 0.25, -eH * 0.2, 0, 0, 0, eW);
  scleraGrad.addColorStop(0, skin.sclera);
  scleraGrad.addColorStop(0.7, `hsl(0,0%,${style === 'neon' ? '75' : '88'}%)`);
  scleraGrad.addColorStop(1, `hsl(0,0%,${style === 'neon' ? '60' : '78'}%)`);
  ctx.fillStyle = scleraGrad;
  ctx.fillRect(-eW * 1.2, -eH * 1.2, eW * 2.4, eH * 2.4);

  // Iris — outer ring
  const irisR = eH * 0.85;
  const irisBg = ctx.createRadialGradient(0, -irisR * 0.12, 0, 0, 0, irisR);
  irisBg.addColorStop(0, `hsl(${irisHue}, ${style === 'neon' ? 95 : 70}%, ${style === 'neon' ? 75 : 45}%)`);
  irisBg.addColorStop(0.45, `hsl(${irisHue}, 65%, ${style === 'neon' ? 55 : 30}%)`);
  irisBg.addColorStop(0.75, `hsl(${irisHue}, 50%, ${style === 'neon' ? 40 : 20}%)`);
  irisBg.addColorStop(1, `hsl(${irisHue}, 40%, 10%)`);
  ctx.fillStyle = irisBg;
  ctx.beginPath();
  ctx.arc(0, 0, irisR, 0, Math.PI * 2);
  ctx.fill();

  // Iris texture (radial fibers)
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * irisR * 0.25, Math.sin(a) * irisR * 0.25);
    ctx.lineTo(Math.cos(a) * irisR * 0.96, Math.sin(a) * irisR * 0.96);
    ctx.strokeStyle = `hsla(${irisHue}, 60%, 70%, ${0.06 + rand() * 0.08})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Iris limbal ring
  ctx.beginPath();
  ctx.arc(0, 0, irisR, 0, Math.PI * 2);
  ctx.strokeStyle = `hsla(${irisHue}, 40%, 10%, 0.8)`;
  ctx.lineWidth = irisR * 0.12;
  ctx.stroke();

  // Pupil
  const pupilR = irisR * (style === 'neon' ? 0.42 : 0.38);
  const pupilGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, pupilR);
  pupilGrad.addColorStop(0, '#000');
  pupilGrad.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = pupilGrad;
  ctx.beginPath();
  ctx.arc(0, 0, pupilR, 0, Math.PI * 2);
  ctx.fill();

  // Catchlight 1 (main)
  ctx.beginPath();
  ctx.arc(-irisR * 0.28, -irisR * 0.3, irisR * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fill();

  // Catchlight 2 (small secondary)
  ctx.beginPath();
  ctx.arc(irisR * 0.22, -irisR * 0.1, irisR * 0.07, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();

  // Neon iris glow
  if (style === 'neon') {
    ctx.beginPath();
    ctx.arc(0, 0, irisR * 0.6, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${irisHue}, 100%, 70%, 0.5)`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.restore(); // End clipping

  // Upper eyelid crease shadow
  ctx.beginPath();
  ctx.moveTo(-eW * 0.95, -eH * 0.1);
  ctx.bezierCurveTo(-eW * 0.6, -eH * 1.4, eW * 0.5, -eH * 1.45, eW * 0.9, -eH * 0.05);
  ctx.strokeStyle = `rgba(0,0,0,0.18)`;
  ctx.lineWidth = eH * 0.5;
  ctx.stroke();

  // Upper lid dark line
  ctx.beginPath();
  ctx.moveTo(-eW * 0.98, 0);
  ctx.bezierCurveTo(-eW * 0.7, -eH * 1.2, eW * 0.65, -eH * 1.22, eW, 0);
  ctx.strokeStyle = `rgba(0,0,0,${style === 'neon' ? 0.9 : 0.75})`;
  ctx.lineWidth = eH * 0.22;
  ctx.stroke();

  // Upper lash line extension
  ctx.beginPath();
  ctx.moveTo(eW * 0.88, -eH * 0.1);
  ctx.lineTo(eW * 1.08, -eH * 0.4);
  ctx.strokeStyle = `rgba(0,0,0,0.7)`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Lower lid shadow
  ctx.beginPath();
  ctx.moveTo(-eW, 0);
  ctx.bezierCurveTo(-eW * 0.8, eH * 0.7, eW * 0.8, eH * 0.7, eW, 0);
  ctx.strokeStyle = `rgba(0,0,0,0.12)`;
  ctx.lineWidth = eH * 0.25;
  ctx.stroke();

  // Neon eye glow overlay
  if (style === 'neon' || style === 'futuristic') {
    ctx.beginPath();
    ctx.arc(0, 0, irisR * 1.05, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${irisHue}, 90%, 65%, ${style === 'neon' ? 0.5 : 0.15})`;
    ctx.lineWidth = style === 'neon' ? 1.5 : 0.8;
    ctx.stroke();
  }

  ctx.restore();
}

// ─── Nose ─────────────────────────────────────────────────
function drawNose(ctx: CanvasRenderingContext2D, nx: number, ny: number, nW: number, skin: SkinTone) {
  // Bridge shadow (subtle vertical shadow line)
  const bridgeGrad = ctx.createLinearGradient(nx - nW * 0.5, ny - nW * 1.8, nx + nW * 0.5, ny - nW * 1.8);
  bridgeGrad.addColorStop(0, 'rgba(0,0,0,0.10)');
  bridgeGrad.addColorStop(0.35, 'rgba(0,0,0,0.0)');
  bridgeGrad.addColorStop(1, 'rgba(0,0,0,0.0)');
  ctx.fillStyle = bridgeGrad;
  ctx.fillRect(nx - nW * 0.5, ny - nW * 2, nW, nW * 2);

  // Nose tip highlight
  const tipGrad = ctx.createRadialGradient(nx - nW * 0.12, ny - nW * 0.08, 0, nx, ny, nW * 0.55);
  tipGrad.addColorStop(0, 'rgba(255,255,255,0.14)');
  tipGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = tipGrad;
  ctx.beginPath();
  ctx.ellipse(nx, ny, nW * 0.55, nW * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  // Left nostril
  ctx.beginPath();
  ctx.ellipse(nx - nW * 0.6, ny + nW * 0.08, nW * 0.28, nW * 0.2, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fill();
  // Right nostril
  ctx.beginPath();
  ctx.ellipse(nx + nW * 0.6, ny + nW * 0.08, nW * 0.28, nW * 0.2, 0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fill();

  // Nose bottom shadow
  ctx.beginPath();
  ctx.ellipse(nx, ny + nW * 0.12, nW * 0.7, nW * 0.22, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fill();
}

// ─── Lips ─────────────────────────────────────────────────
function drawLips(ctx: CanvasRenderingContext2D, lx: number, ly: number, lW: number, skin: SkinTone) {
  // Upper lip
  ctx.beginPath();
  ctx.moveTo(lx - lW * 0.5, ly);
  // Left upper
  ctx.bezierCurveTo(lx - lW * 0.35, ly - lW * 0.18, lx - lW * 0.15, ly - lW * 0.22, lx, ly - lW * 0.1);
  // Cupid's bow right
  ctx.bezierCurveTo(lx + lW * 0.15, ly - lW * 0.22, lx + lW * 0.35, ly - lW * 0.18, lx + lW * 0.5, ly);
  // Bottom of upper lip
  ctx.bezierCurveTo(lx + lW * 0.42, ly + lW * 0.14, lx + lW * 0.12, ly + lW * 0.2, lx, ly + lW * 0.18);
  ctx.bezierCurveTo(lx - lW * 0.12, ly + lW * 0.2, lx - lW * 0.42, ly + lW * 0.14, lx - lW * 0.5, ly);
  ctx.closePath();
  ctx.fillStyle = skin.lip;
  ctx.fill();

  // Upper lip shadow
  ctx.beginPath();
  ctx.moveTo(lx - lW * 0.5, ly);
  ctx.bezierCurveTo(lx - lW * 0.35, ly - lW * 0.18, lx - lW * 0.15, ly - lW * 0.22, lx, ly - lW * 0.1);
  ctx.bezierCurveTo(lx + lW * 0.15, ly - lW * 0.22, lx + lW * 0.35, ly - lW * 0.18, lx + lW * 0.5, ly);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Lower lip
  const lowerY = ly + lW * 0.19;
  ctx.beginPath();
  ctx.moveTo(lx - lW * 0.5, ly);
  ctx.bezierCurveTo(lx - lW * 0.42, ly + lW * 0.14, lx - lW * 0.12, ly + lW * 0.2, lx, ly + lW * 0.18);
  ctx.bezierCurveTo(lx + lW * 0.12, ly + lW * 0.2, lx + lW * 0.42, ly + lW * 0.14, lx + lW * 0.5, ly);
  // Lower lip bottom
  ctx.bezierCurveTo(lx + lW * 0.4, lowerY + lW * 0.26, lx + lW * 0.1, lowerY + lW * 0.32, lx, lowerY + lW * 0.3);
  ctx.bezierCurveTo(lx - lW * 0.1, lowerY + lW * 0.32, lx - lW * 0.4, lowerY + lW * 0.26, lx - lW * 0.5, ly);
  ctx.closePath();
  // Lower lip is slightly lighter / fuller
  const lipGrad = ctx.createLinearGradient(lx, ly, lx, lowerY + lW * 0.32);
  lipGrad.addColorStop(0, skin.lip);
  lipGrad.addColorStop(0.35, `hsl(0,0%,100%)`);
  lipGrad.addColorStop(1, skin.lip);
  ctx.fillStyle = skin.lip;
  ctx.fill();

  // Lower lip highlight
  ctx.beginPath();
  ctx.ellipse(lx + lW * 0.05, lowerY + lW * 0.16, lW * 0.2, lW * 0.08, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fill();

  // Mouth corner shadows
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(lx + side * lW * 0.5, ly, lW * 0.06, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fill();
  }

  // Philtrum shadow (subtle)
  const philtGrad = ctx.createLinearGradient(lx - lW * 0.12, ly - lW * 0.5, lx + lW * 0.12, ly - lW * 0.5);
  philtGrad.addColorStop(0, 'rgba(0,0,0,0.07)');
  philtGrad.addColorStop(0.5, 'transparent');
  philtGrad.addColorStop(1, 'rgba(0,0,0,0.07)');
  ctx.fillStyle = philtGrad;
  ctx.fillRect(lx - lW * 0.12, ly - lW * 0.5, lW * 0.24, lW * 0.5);
}

// ─── Hair styles ──────────────────────────────────────────
function drawHair(
  ctx: CanvasRenderingContext2D,
  f: FaceShape, W: number, H: number,
  hairHue: number, rand: () => number, style: AvatarStyle, hairStyle: number
) {
  const { cx, top, halfW } = f;
  const hairDark = `hsl(${hairHue}, ${style === 'neon' ? 70 : 20}%, ${style === 'neon' ? 15 : 8}%)`;
  const hairMid = `hsl(${hairHue}, ${style === 'neon' ? 60 : 20}%, ${style === 'neon' ? 25 : 18}%)`;
  const hairLight = `hsl(${hairHue}, ${style === 'neon' ? 80 : 25}%, ${style === 'neon' ? 40 : 32}%)`;

  ctx.save();

  if (hairStyle === 0) {
    // Short/tapered — classic tight cut
    const grad = ctx.createLinearGradient(cx - halfW, top - H * 0.08, cx + halfW * 0.3, top + H * 0.04);
    grad.addColorStop(0, hairMid);
    grad.addColorStop(0.5, hairDark);
    grad.addColorStop(1, hairDark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx, top - H * 0.005);
    ctx.bezierCurveTo(cx + halfW * 0.6, top - H * 0.02, cx + halfW * 0.95, top - H * 0.01, cx + halfW * 0.95, top + H * 0.04);
    ctx.bezierCurveTo(cx + halfW * 0.95, top + H * 0.015, cx + halfW * 0.5, top - H * 0.03, cx, top - H * 0.005);
    ctx.bezierCurveTo(cx - halfW * 0.5, top - H * 0.03, cx - halfW * 0.95, top + H * 0.015, cx - halfW * 0.95, top + H * 0.04);
    ctx.bezierCurveTo(cx - halfW * 0.95, top - H * 0.01, cx - halfW * 0.6, top - H * 0.02, cx, top - H * 0.005);
    ctx.fill();

  } else if (hairStyle === 1) {
    // Medium parted — side part
    const grad = ctx.createRadialGradient(cx - halfW * 0.3, top - H * 0.06, 0, cx, top, H * 0.15);
    grad.addColorStop(0, hairLight);
    grad.addColorStop(0.4, hairMid);
    grad.addColorStop(1, hairDark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx + halfW * 0.12, top - H * 0.005);
    ctx.bezierCurveTo(cx + halfW, top - H * 0.02, cx + halfW * 1.0, top, cx + halfW, top + H * 0.05);
    ctx.bezierCurveTo(cx + halfW * 0.95, top + H * 0.12, cx + halfW * 0.75, top + H * 0.18, cx + halfW * 0.5, top + H * 0.21);
    ctx.lineTo(cx + halfW * 0.12, top + H * 0.01);
    ctx.bezierCurveTo(cx, top - H * 0.01, cx - halfW * 0.2, top - H * 0.04, cx - halfW * 0.6, top - H * 0.01);
    ctx.bezierCurveTo(cx - halfW * 0.9, top + H * 0.01, cx - halfW, top + H * 0.02, cx - halfW, top + H * 0.05);
    ctx.bezierCurveTo(cx - halfW, top, cx - halfW, top - H * 0.02, cx - halfW * 0.6, top - H * 0.06);
    ctx.bezierCurveTo(cx - halfW * 0.3, top - H * 0.09, cx - halfW * 0.1, top - H * 0.1, cx + halfW * 0.12, top - H * 0.005);
    ctx.fill();
    // Hair strand lines
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      const x1 = cx - halfW + i * halfW * 0.3;
      ctx.moveTo(x1, top - H * 0.06 + i * H * 0.01);
      ctx.bezierCurveTo(x1 + 5, top, x1 + 10, top + H * 0.04, x1 + 15 + i * 8, top + H * 0.08);
      ctx.strokeStyle = `hsla(${hairHue}, 20%, ${40 + i * 5}%, 0.25)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

  } else if (hairStyle === 2) {
    // Cyber helmet / headset
    const helmGrad = ctx.createLinearGradient(cx - halfW * 1.1, top - H * 0.05, cx + halfW * 0.5, top + H * 0.15);
    helmGrad.addColorStop(0, `hsl(${hairHue}, 30%, 25%)`);
    helmGrad.addColorStop(0.3, `hsl(${hairHue}, 25%, 18%)`);
    helmGrad.addColorStop(1, `hsl(${hairHue}, 20%, 8%)`);
    ctx.fillStyle = helmGrad;
    ctx.beginPath();
    ctx.arc(cx, top + H * 0.04, halfW * 1.08, Math.PI * 1.05, Math.PI * 1.95);
    ctx.bezierCurveTo(cx + halfW * 1.15, top + H * 0.04, cx + halfW * 1.05, top + H * 0.12, cx + halfW, top + H * 0.15);
    ctx.bezierCurveTo(cx - halfW, top + H * 0.15, cx - halfW * 1.05, top + H * 0.12, cx - halfW * 1.15, top + H * 0.04);
    ctx.fill();
    // Helmet visor strip
    ctx.beginPath();
    ctx.rect(cx - halfW * 0.85, top + H * 0.015, halfW * 1.7, H * 0.025);
    const visorGrad = ctx.createLinearGradient(cx - halfW * 0.85, 0, cx + halfW * 0.85, 0);
    visorGrad.addColorStop(0, `hsla(${hairHue}, 80%, 50%, 0.0)`);
    visorGrad.addColorStop(0.2, `hsla(${hairHue}, 90%, 65%, 0.5)`);
    visorGrad.addColorStop(0.8, `hsla(${hairHue}, 90%, 65%, 0.5)`);
    visorGrad.addColorStop(1, `hsla(${hairHue}, 80%, 50%, 0.0)`);
    ctx.fillStyle = visorGrad;
    ctx.fill();

  } else if (hairStyle === 3) {
    // Long flowing — frame face (stylized)
    // Right side flow
    const rGrad = ctx.createLinearGradient(cx + halfW * 0.6, top, cx + halfW * 1.1, H * 0.8);
    rGrad.addColorStop(0, hairLight);
    rGrad.addColorStop(0.5, hairMid);
    rGrad.addColorStop(1, `hsla(${hairHue}, 20%, 5%, 0)`);
    ctx.fillStyle = rGrad;
    ctx.beginPath();
    ctx.moveTo(cx, top - H * 0.01);
    ctx.bezierCurveTo(cx + halfW * 0.8, top - H * 0.03, cx + halfW * 1.1, top, cx + halfW * 1.15, top + H * 0.15);
    ctx.bezierCurveTo(cx + halfW * 1.2, top + H * 0.35, cx + halfW * 1.1, H * 0.65, cx + halfW * 0.9, H * 0.82);
    ctx.bezierCurveTo(cx + halfW * 0.85, H * 0.85, cx + halfW * 0.65, H * 0.7, cx + halfW * 0.6, H * 0.65);
    ctx.bezierCurveTo(cx + halfW * 0.75, H * 0.45, cx + halfW * 0.82, top + H * 0.18, cx + halfW * 0.7, top + H * 0.08);
    ctx.bezierCurveTo(cx + halfW * 0.6, top + H * 0.02, cx + halfW * 0.3, top - H * 0.01, cx, top - H * 0.01);
    ctx.fill();
    // Left side
    const lGrad = ctx.createLinearGradient(cx - halfW * 0.6, top, cx - halfW * 1.1, H * 0.8);
    lGrad.addColorStop(0, hairLight);
    lGrad.addColorStop(0.5, hairMid);
    lGrad.addColorStop(1, `hsla(${hairHue}, 20%, 5%, 0)`);
    ctx.fillStyle = lGrad;
    ctx.beginPath();
    ctx.moveTo(cx, top - H * 0.01);
    ctx.bezierCurveTo(cx - halfW * 0.8, top - H * 0.03, cx - halfW * 1.1, top, cx - halfW * 1.15, top + H * 0.15);
    ctx.bezierCurveTo(cx - halfW * 1.2, top + H * 0.35, cx - halfW * 1.1, H * 0.65, cx - halfW * 0.9, H * 0.82);
    ctx.bezierCurveTo(cx - halfW * 0.85, H * 0.85, cx - halfW * 0.65, H * 0.7, cx - halfW * 0.6, H * 0.65);
    ctx.bezierCurveTo(cx - halfW * 0.75, H * 0.45, cx - halfW * 0.82, top + H * 0.18, cx - halfW * 0.7, top + H * 0.08);
    ctx.bezierCurveTo(cx - halfW * 0.6, top + H * 0.02, cx - halfW * 0.3, top - H * 0.01, cx, top - H * 0.01);
    ctx.fill();
    // Top crown
    const topGrad = ctx.createRadialGradient(cx, top - H * 0.03, 0, cx, top, halfW * 0.8);
    topGrad.addColorStop(0, hairLight);
    topGrad.addColorStop(0.5, hairMid);
    topGrad.addColorStop(1, hairDark);
    ctx.fillStyle = topGrad;
    ctx.beginPath();
    ctx.ellipse(cx, top - H * 0.01, halfW * 0.85, H * 0.075, 0, Math.PI, Math.PI * 2);
    ctx.fill();

  } else {
    // style 4: Bald / shaved with circuit overlay
    // Very tight, close to scalp
    const baldGrad = ctx.createRadialGradient(cx - halfW * 0.2, top - H * 0.02, 0, cx, top + H * 0.04, halfW);
    baldGrad.addColorStop(0, hairLight);
    baldGrad.addColorStop(0.6, hairDark);
    baldGrad.addColorStop(1, hairDark);
    ctx.fillStyle = baldGrad;
    ctx.beginPath();
    ctx.arc(cx, top + H * 0.04, halfW * 1.01, Math.PI * 1.08, Math.PI * 1.92);
    ctx.closePath();
    ctx.fill();
    // Circuit lines on scalp
    for (let i = 0; i < 4; i++) {
      const startX = cx - halfW * (0.5 - i * 0.2);
      ctx.beginPath();
      ctx.moveTo(startX, top + H * 0.01);
      ctx.lineTo(startX + 20, top - H * 0.01);
      ctx.lineTo(startX + 20, top - H * 0.03);
      ctx.lineTo(startX + 35, top - H * 0.03);
      ctx.strokeStyle = `hsla(${hairHue}, 70%, 55%, ${0.15 + rand() * 0.1})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ─── Eyebrows ─────────────────────────────────────────────
function drawEyebrows(
  ctx: CanvasRenderingContext2D,
  cx: number, eyeY: number, spacing: number,
  eW: number, hairHue: number, rand: () => number
) {
  for (const side of [-1, 1]) {
    const bx = cx + side * spacing;
    const by = eyeY - eW * 1.1;
    // Eyebrow shape — tapered arch
    ctx.beginPath();
    ctx.moveTo(bx - eW * (side > 0 ? 1.1 : 0.9), by + eW * 0.2);
    ctx.bezierCurveTo(
      bx - eW * (side > 0 ? 0.5 : 0.3), by - eW * 0.3,
      bx + eW * (side > 0 ? 0.3 : 0.5), by - eW * 0.3,
      bx + eW * (side > 0 ? 0.9 : 1.1), by + eW * 0.15
    );
    ctx.bezierCurveTo(
      bx + eW * (side > 0 ? 0.5 : 0.7), by + eW * 0.1,
      bx - eW * (side > 0 ? 0.2 : 0.0), by - eW * 0.05,
      bx - eW * (side > 0 ? 1.1 : 0.9), by + eW * 0.2
    );
    ctx.closePath();
    ctx.fillStyle = `hsl(${hairHue}, 20%, 12%)`;
    ctx.fill();
    // Eyebrow highlight
    ctx.beginPath();
    ctx.moveTo(bx - eW * 0.6, by - eW * 0.1);
    ctx.bezierCurveTo(bx, by - eW * 0.35, bx + eW * 0.4, by - eW * 0.28, bx + eW * 0.7, by - eW * 0.04);
    ctx.strokeStyle = `rgba(255,255,255,0.08)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

// ─── Clothing / shoulders ─────────────────────────────────
function drawClothing(
  ctx: CanvasRenderingContext2D,
  W: number, H: number, cx: number,
  hue: number, rand: () => number, style: AvatarStyle
) {
  const shoulderY = H * 0.78;
  const shoulderW = W * 0.62;
  const neckW = W * 0.1;
  const neckY = H * 0.70;

  // Neck
  const neckGrad = ctx.createLinearGradient(cx - neckW * 0.6, neckY, cx + neckW * 0.4, neckY);
  neckGrad.addColorStop(0, 'rgba(0,0,0,0.25)');
  neckGrad.addColorStop(0.3, 'transparent');
  neckGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
  ctx.fillStyle = neckGrad;
  ctx.fillRect(cx - neckW * 0.7, neckY, neckW * 1.4, H - neckY);

  // Clothing silhouette
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, shoulderY + H * 0.04);
  ctx.bezierCurveTo(cx - shoulderW * 0.65, shoulderY, cx - shoulderW * 0.35, shoulderY - H * 0.03, cx - neckW, neckY + H * 0.01);
  ctx.bezierCurveTo(cx - neckW * 0.5, neckY, cx + neckW * 0.5, neckY, cx + neckW, neckY + H * 0.01);
  ctx.bezierCurveTo(cx + shoulderW * 0.35, shoulderY - H * 0.03, cx + shoulderW * 0.65, shoulderY, W, shoulderY + H * 0.04);
  ctx.lineTo(W, H);
  ctx.closePath();

  const clothGrad = ctx.createLinearGradient(0, shoulderY, W, H);
  if (style === 'neon') {
    clothGrad.addColorStop(0, `hsl(${hue}, 30%, 8%)`);
    clothGrad.addColorStop(0.3, `hsl(${hue}, 22%, 6%)`);
    clothGrad.addColorStop(1, `hsl(${hue}, 15%, 4%)`);
  } else if (style === 'abstract') {
    clothGrad.addColorStop(0, `hsl(${hue}, 20%, 12%)`);
    clothGrad.addColorStop(1, `hsl(${hue}, 15%, 5%)`);
  } else {
    clothGrad.addColorStop(0, `hsl(${hue}, 12%, 10%)`);
    clothGrad.addColorStop(0.4, `hsl(${hue}, 10%, 7%)`);
    clothGrad.addColorStop(1, `hsl(${hue}, 8%, 4%)`);
  }
  ctx.fillStyle = clothGrad;
  ctx.fill();

  // Collar / neckline detail
  ctx.beginPath();
  ctx.moveTo(cx - neckW * 1.5, neckY + H * 0.02);
  ctx.bezierCurveTo(cx - neckW * 0.8, neckY + H * 0.04, cx - neckW * 0.3, neckY + H * 0.06, cx, neckY + H * 0.05);
  ctx.bezierCurveTo(cx + neckW * 0.3, neckY + H * 0.06, cx + neckW * 0.8, neckY + H * 0.04, cx + neckW * 1.5, neckY + H * 0.02);
  ctx.strokeStyle = `hsla(${hue}, 40%, 55%, 0.2)`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Tech accent on shoulder (futuristic/neon)
  if (style === 'futuristic' || style === 'neon') {
    const aR = 5;
    for (const side of [-1, 1]) {
      const sx = cx + side * shoulderW * 0.45;
      const sy = shoulderY + H * 0.02;
      ctx.beginPath();
      ctx.roundRect(sx - 12, sy - 3, 24, 6, aR);
      ctx.fillStyle = `hsla(${hue}, 80%, 55%, ${style === 'neon' ? 0.45 : 0.18})`;
      ctx.fill();
    }
  }
}

// ─── Tech / overlay decorations ───────────────────────────
function drawTechOverlay(
  ctx: CanvasRenderingContext2D,
  W: number, H: number, cx: number, cy: number,
  hue: number, rand: () => number, style: AvatarStyle
) {
  if (style === 'minimal') return;

  // Corner scan lines
  const corners = [{ x: 16, y: 16 }, { x: W - 16, y: 16 }, { x: 16, y: H - 16 }, { x: W - 16, y: H - 16 }];
  corners.forEach(({ x, y }) => {
    const dx = x < W / 2 ? 1 : -1;
    const dy = y < H / 2 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(x + dx * 14, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * 14);
    ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${style === 'neon' ? 0.5 : 0.25})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // Data readout text (left side)
  ctx.font = `600 7px monospace`;
  ctx.fillStyle = `hsla(${hue}, 60%, 60%, 0.3)`;
  ctx.textAlign = 'left';
  const lines = ['01-PROTOCOL', 'v3.0-ALPHA', 'ID:VERIFIED', 'NET:SECURE'];
  lines.forEach((l, i) => ctx.fillText(l, 12, H - 60 + i * 10));

  // Protocol ID bottom right
  ctx.textAlign = 'right';
  ctx.fillText('01AI.AI', W - 12, H - 12);

  // Floating data particles (abstract/neon)
  if (style === 'neon' || style === 'abstract') {
    for (let i = 0; i < 8; i++) {
      const px = 20 + rand() * (W - 40);
      const py = 20 + rand() * (H * 0.12);
      ctx.beginPath();
      ctx.arc(px, py, 0.8 + rand() * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${(hue + i * 30) % 360}, 80%, 65%, ${0.2 + rand() * 0.3})`;
      ctx.fill();
    }
  }
}

// ═══════════════════════════════════════════════════════════
//  MAIN RENDER FUNCTION
// ═══════════════════════════════════════════════════════════
export function renderAvatarToCanvas(canvas: HTMLCanvasElement, opts: AvatarOptions): void {
  const {
    name, role, goal,
    seed = 0,
    style = 'futuristic',
    hueOverride,
    width = 400,
    height = 560,
  } = opts;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = width;
  const H = height;
  const baseSeed = hashString(`${name}${role}${goal}`) + seed * 7919;
  const rand = seededRNG(baseSeed);

  const hue = hueOverride !== undefined ? hueOverride : baseSeed % 360;
  const hue2 = (hue + 120 + Math.floor(rand() * 80)) % 360;
  const irisHue = (hue + 40 + Math.floor(rand() * 120)) % 360;
  const hairHue = Math.floor(rand() * 40); // mostly desaturated browns/blacks
  const hairStyle = Math.floor(rand() * 5);
  const skin = getSkinTone(rand, hue, style);
  const face = getFaceShape(W, H, rand);

  // ── STEP 1: BACKGROUND ────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W * 0.5, H);
  if (style === 'neon') {
    bg.addColorStop(0, `hsl(${hue}, 25%, 4%)`);
    bg.addColorStop(0.5, `hsl(${hue2}, 18%, 3%)`);
    bg.addColorStop(1, `hsl(${hue}, 20%, 2%)`);
  } else if (style === 'abstract') {
    bg.addColorStop(0, `hsl(${hue2}, 25%, 7%)`);
    bg.addColorStop(0.6, `hsl(${hue}, 18%, 5%)`);
    bg.addColorStop(1, `hsl(${hue2}, 15%, 3%)`);
  } else {
    bg.addColorStop(0, `hsl(${hue}, 18%, 5%)`);
    bg.addColorStop(0.7, `hsl(${hue}, 12%, 4%)`);
    bg.addColorStop(1, `hsl(${hue2}, 15%, 3%)`);
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── STEP 2: ENVIRONMENT LIGHT / BG GLOW ──────────────────
  // Main environment light behind subject
  const envGlow = ctx.createRadialGradient(face.cx, face.top + H * 0.1, 0, face.cx, face.top + H * 0.15, H * 0.55);
  envGlow.addColorStop(0, `hsla(${hue}, 60%, 30%, 0.25)`);
  envGlow.addColorStop(0.35, `hsla(${hue}, 50%, 20%, 0.1)`);
  envGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = envGlow;
  ctx.fillRect(0, 0, W, H);

  // Rim light (colored back-light from upper-right)
  const rimGlow = ctx.createRadialGradient(W * 0.85, H * 0.05, 0, W * 0.75, H * 0.2, H * 0.45);
  rimGlow.addColorStop(0, `hsla(${hue2}, 70%, 40%, 0.15)`);
  rimGlow.addColorStop(0.4, `hsla(${hue2}, 60%, 30%, 0.06)`);
  rimGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = rimGlow;
  ctx.fillRect(0, 0, W, H);

  // ── STEP 3: BACKGROUND PATTERN ───────────────────────────
  if (style === 'futuristic') {
    // Subtle hexagonal grid
    const hS = 18;
    const hH = hS * Math.sqrt(3);
    ctx.strokeStyle = `hsla(${hue}, 50%, 50%, 0.04)`;
    ctx.lineWidth = 0.5;
    for (let row = -1; row < H / hH + 2; row++) {
      for (let col = -1; col < W / (hS * 1.5) + 2; col++) {
        const px = col * hS * 1.5;
        const py = row * hH + (col % 2 ? hH / 2 : 0);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i;
          const x = px + hS * 0.88 * Math.cos(a);
          const y = py + hS * 0.88 * Math.sin(a);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  } else if (style === 'neon') {
    // Grid lines
    ctx.strokeStyle = `hsla(${hue}, 70%, 55%, 0.05)`;
    ctx.lineWidth = 0.5;
    for (let gx = 0; gx < W; gx += 28) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += 28) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }
  } else if (style === 'abstract') {
    for (let i = 0; i < 4; i++) {
      const bx = rand() * W, by = rand() * H, br = 100 + rand() * 120;
      const bGrad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      bGrad.addColorStop(0, `hsla(${(hue + i * 60) % 360}, 60%, 35%, 0.06)`);
      bGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = bGrad;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ── STEP 4: CLOTHING / SHOULDERS ─────────────────────────
  drawClothing(ctx, W, H, face.cx, hue, rand, style);

  // ── STEP 5: NECK SKIN ────────────────────────────────────
  const neckX = face.cx;
  const neckTopY = face.bottom - H * 0.02;
  const neckBotY = H * 0.74;
  const neckW = face.halfW * 0.28;
  const neckGrad = ctx.createLinearGradient(neckX - neckW, 0, neckX + neckW, 0);
  neckGrad.addColorStop(0, skin.shadow);
  neckGrad.addColorStop(0.3, skin.mid);
  neckGrad.addColorStop(0.6, skin.base);
  neckGrad.addColorStop(0.85, skin.mid);
  neckGrad.addColorStop(1, skin.shadow);
  ctx.fillStyle = neckGrad;
  ctx.beginPath();
  ctx.roundRect(neckX - neckW, neckTopY, neckW * 2, neckBotY - neckTopY, neckW);
  ctx.fill();

  // ── STEP 6: HAIR (behind face) ────────────────────────────
  drawHair(ctx, face, W, H, hairHue, rand, style, hairStyle);

  // ── STEP 7: FACE SKIN ─────────────────────────────────────
  drawFaceOutline(ctx, face);
  ctx.save();
  ctx.clip(); // Clip skin layers to face outline

  // Base skin fill
  const skinBase = ctx.createRadialGradient(
    face.cx - face.halfW * 0.15, face.top + (face.bottom - face.top) * 0.3, 0,
    face.cx, face.cy, face.halfW * 1.2
  );
  skinBase.addColorStop(0, skin.highlight);
  skinBase.addColorStop(0.35, skin.base);
  skinBase.addColorStop(0.7, skin.mid);
  skinBase.addColorStop(1, skin.shadow);
  ctx.fillStyle = skinBase;
  ctx.fillRect(0, 0, W, H);

  // Key light (upper-left)
  const keyLight = ctx.createRadialGradient(
    face.cx - face.halfW * 0.55, face.top + (face.bottom - face.top) * 0.2, 0,
    face.cx - face.halfW * 0.3, face.top + (face.bottom - face.top) * 0.35,
    face.halfW * 1.1
  );
  keyLight.addColorStop(0, 'rgba(255,255,255,0.12)');
  keyLight.addColorStop(0.5, 'rgba(255,255,255,0.04)');
  keyLight.addColorStop(1, 'transparent');
  ctx.fillStyle = keyLight;
  ctx.fillRect(0, 0, W, H);

  // Shadow side (right-ish)
  const shadowSide = ctx.createLinearGradient(face.cx + face.halfW * 0.3, 0, face.cx + face.halfW * 0.9, 0);
  shadowSide.addColorStop(0, 'transparent');
  shadowSide.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = shadowSide;
  ctx.fillRect(0, 0, W, H);

  // Under-chin shadow
  const chinShadow = ctx.createLinearGradient(0, face.bottom - H * 0.06, 0, face.bottom);
  chinShadow.addColorStop(0, 'transparent');
  chinShadow.addColorStop(1, 'rgba(0,0,0,0.30)');
  ctx.fillStyle = chinShadow;
  ctx.fillRect(0, 0, W, H);

  // Temple shadows
  const leftTemple = ctx.createRadialGradient(face.cx - face.halfW * 0.92, face.top + H * 0.04, 0, face.cx - face.halfW * 0.85, face.top + H * 0.06, face.halfW * 0.5);
  leftTemple.addColorStop(0, 'rgba(0,0,0,0.18)');
  leftTemple.addColorStop(1, 'transparent');
  ctx.fillStyle = leftTemple;
  ctx.fillRect(0, 0, W, H);

  // Cheekbone highlights
  for (const side of [-1, 1]) {
    const chGrad = ctx.createRadialGradient(
      face.cx + side * face.halfW * 0.55, face.cy - H * 0.02, 0,
      face.cx + side * face.halfW * 0.55, face.cy - H * 0.02, face.halfW * 0.45
    );
    chGrad.addColorStop(0, skin.cheek);
    chGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = chGrad;
    ctx.fillRect(0, 0, W, H);
  }

  // Forehead specular
  const foreSpec = ctx.createRadialGradient(face.cx - face.halfW * 0.1, face.top + H * 0.035, 0, face.cx, face.top + H * 0.05, face.halfW * 0.65);
  foreSpec.addColorStop(0, 'rgba(255,255,255,0.1)');
  foreSpec.addColorStop(1, 'transparent');
  ctx.fillStyle = foreSpec;
  ctx.fillRect(0, 0, W, H);

  ctx.restore(); // End face clip

  // Face outline border (subtle)
  drawFaceOutline(ctx, face);
  ctx.strokeStyle = `rgba(0,0,0,0.15)`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // ── STEP 8: EYEBROWS ──────────────────────────────────────
  const faceH = face.bottom - face.top;
  const eyeY = face.top + faceH * 0.40;
  const eyeSpacing = face.halfW * 0.52;
  const eyeW = face.halfW * 0.36;
  const eyeH = eyeW * 0.38;

  drawEyebrows(ctx, face.cx, eyeY, eyeSpacing, eyeW, hairHue, rand);

  // ── STEP 9: EYES ──────────────────────────────────────────
  drawRealisticEye(ctx, face.cx - eyeSpacing, eyeY, eyeW, eyeH, irisHue, skin, rand, style, false);
  drawRealisticEye(ctx, face.cx + eyeSpacing, eyeY, eyeW, eyeH, irisHue, skin, rand, style, true);

  // ── STEP 10: NOSE ─────────────────────────────────────────
  const noseY = face.top + faceH * 0.615;
  drawNose(ctx, face.cx, noseY, face.halfW * 0.14, skin);

  // ── STEP 11: LIPS / MOUTH ─────────────────────────────────
  const mouthY = face.top + faceH * 0.765;
  drawLips(ctx, face.cx, mouthY, face.halfW * 0.52, skin);

  // ── STEP 12: TECH/STYLE OVERLAYS ──────────────────────────
  drawTechOverlay(ctx, W, H, face.cx, face.cy, hue, rand, style);

  // Neon scan line across eyes
  if (style === 'neon' || style === 'futuristic') {
    const scanGrad = ctx.createLinearGradient(face.cx - face.halfW, eyeY, face.cx + face.halfW, eyeY);
    scanGrad.addColorStop(0, 'transparent');
    scanGrad.addColorStop(0.3, `hsla(${irisHue}, 90%, 70%, ${style === 'neon' ? 0.25 : 0.1})`);
    scanGrad.addColorStop(0.5, `hsla(${irisHue}, 100%, 80%, ${style === 'neon' ? 0.35 : 0.12})`);
    scanGrad.addColorStop(0.7, `hsla(${irisHue}, 90%, 70%, ${style === 'neon' ? 0.25 : 0.1})`);
    scanGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = scanGrad;
    ctx.fillRect(face.cx - face.halfW, eyeY - 0.5, face.halfW * 2, 1.5);
  }

  // ── STEP 13: BOTTOM VIGNETTE + NAME ──────────────────────
  const bottomVig = ctx.createLinearGradient(0, H * 0.6, 0, H);
  bottomVig.addColorStop(0, 'transparent');
  bottomVig.addColorStop(0.5, `hsla(${hue}, 15%, 3%, 0.6)`);
  bottomVig.addColorStop(1, `hsl(${hue}, 18%, 2%)`);
  ctx.fillStyle = bottomVig;
  ctx.fillRect(0, 0, W, H);

  // Name
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = `hsla(${hue}, 80%, 55%, 0.7)`;
  ctx.shadowBlur = 20;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = `700 28px "Inter", "Helvetica Neue", sans-serif`;
  ctx.fillText(name.toUpperCase(), W / 2, H * 0.876);
  ctx.shadowBlur = 0;

  ctx.fillStyle = `hsla(${irisHue}, 65%, 70%, 0.75)`;
  ctx.font = `400 10px "Inter", "Helvetica Neue", sans-serif`;
  ctx.fillText(role.toUpperCase(), W / 2, H * 0.916);

  ctx.fillStyle = `hsla(${hue}, 35%, 50%, 0.35)`;
  ctx.font = `400 8px "Inter", monospace`;
  ctx.fillText('01AI.AI · 01PROTOCOL', W / 2, H * 0.948);

  // ── STEP 14: EDGE VIGNETTE + FINAL POLISH ─────────────────
  // Radial edge darkening
  const edgeVig = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.75);
  edgeVig.addColorStop(0, 'transparent');
  edgeVig.addColorStop(0.7, 'transparent');
  edgeVig.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = edgeVig;
  ctx.fillRect(0, 0, W, H);

  // Top vignette
  const topVig = ctx.createLinearGradient(0, 0, 0, H * 0.1);
  topVig.addColorStop(0, `rgba(0,0,0,0.4)`);
  topVig.addColorStop(1, 'transparent');
  ctx.fillStyle = topVig;
  ctx.fillRect(0, 0, W, H);

  // Neon border glow
  if (style === 'neon') {
    ctx.beginPath();
    ctx.rect(1, 1, W - 2, H - 2);
    ctx.strokeStyle = `hsla(${hue}, 80%, 60%, 0.3)`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Scanline texture
  for (let y = 0; y < H; y += 3) {
    ctx.fillStyle = 'rgba(0,0,0,0.035)';
    ctx.fillRect(0, y, W, 1);
  }
}

export function generateAvatarDataUrl(opts: AvatarOptions): string {
  const canvas = document.createElement('canvas');
  renderAvatarToCanvas(canvas, opts);
  return canvas.toDataURL('image/png');
}
