// ============================================================
//  01 Protocol — Procedural Avatar Generator
//  Generates a unique, deterministic AI portrait per agent
// ============================================================

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRNG(seed: number) {
  let s = seed >>> 0;
  return function () {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}

function drawHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const x = cx + size * Math.cos(a);
    const y = cy + size * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

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

export function renderAvatarToCanvas(
  canvas: HTMLCanvasElement,
  opts: AvatarOptions
): void {
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

  const baseSeed = hashString(`${name}${role}${goal}`) + seed * 7919;
  const rand = seededRNG(baseSeed);
  const hue = hueOverride !== undefined ? hueOverride : baseSeed % 360;
  const hue2 = (hue + 80 + Math.floor(rand() * 50)) % 360;

  const W = width;
  const H = height;
  const cx = W / 2;
  const cy = H * 0.42;

  // ── 1. BACKGROUND ────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  if (style === 'minimal') {
    bg.addColorStop(0, `hsl(${hue}, 10%, 6%)`);
    bg.addColorStop(1, `hsl(${hue}, 8%, 4%)`);
  } else if (style === 'abstract') {
    bg.addColorStop(0, `hsl(${hue}, 30%, 5%)`);
    bg.addColorStop(0.5, `hsl(${hue2}, 25%, 7%)`);
    bg.addColorStop(1, `hsl(${hue}, 20%, 4%)`);
  } else if (style === 'neon') {
    bg.addColorStop(0, `hsl(${hue}, 15%, 3%)`);
    bg.addColorStop(1, `hsl(${hue2}, 20%, 4%)`);
  } else {
    bg.addColorStop(0, `hsl(${hue}, 22%, 5%)`);
    bg.addColorStop(0.6, `hsl(${hue}, 16%, 6%)`);
    bg.addColorStop(1, `hsl(${hue2}, 20%, 3%)`);
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── 2. SCANLINE TEXTURE ──────────────────────────────────
  for (let y = 0; y < H; y += 3) {
    ctx.fillStyle = `rgba(0,0,0,0.06)`;
    ctx.fillRect(0, y, W, 1);
  }

  // ── 3. BACKGROUND PATTERN ────────────────────────────────
  if (style === 'futuristic') {
    // Hexagonal grid
    const hexSize = 20;
    const hexH = hexSize * Math.sqrt(3);
    ctx.strokeStyle = `hsla(${hue}, 60%, 50%, 0.05)`;
    ctx.lineWidth = 0.5;
    for (let row = -1; row < H / hexH + 2; row++) {
      for (let col = -1; col < W / (hexSize * 1.5) + 2; col++) {
        const px = col * hexSize * 1.5;
        const py = row * hexH + (col % 2 ? hexH / 2 : 0);
        drawHex(ctx, px, py, hexSize * 0.88);
        ctx.stroke();
      }
    }
  } else if (style === 'abstract') {
    // Flowing organic blobs
    for (let i = 0; i < 6; i++) {
      const bx = rand() * W;
      const by = rand() * H;
      const br = 80 + rand() * 120;
      const bGrad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      bGrad.addColorStop(0, `hsla(${(hue + i * 40) % 360}, 70%, 40%, 0.06)`);
      bGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = bGrad;
      ctx.fillRect(0, 0, W, H);
    }
  } else if (style === 'neon') {
    // Diagonal neon grid
    ctx.strokeStyle = `hsla(${hue}, 80%, 60%, 0.04)`;
    ctx.lineWidth = 0.5;
    for (let i = -H; i < W + H; i += 22) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + H, H);
      ctx.stroke();
    }
    for (let i = -H; i < W + H; i += 22) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i - H, H);
      ctx.stroke();
    }
  } else {
    // Minimal: subtle dot grid
    for (let gx = 0; gx < W; gx += 24) {
      for (let gy = 0; gy < H; gy += 24) {
        ctx.fillStyle = `hsla(${hue}, 50%, 60%, 0.06)`;
        ctx.beginPath();
        ctx.arc(gx, gy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ── 4. AMBIENT GLOW ──────────────────────────────────────
  const amb = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.6);
  amb.addColorStop(0, `hsla(${hue}, 80%, 55%, 0.18)`);
  amb.addColorStop(0.4, `hsla(${hue}, 60%, 35%, 0.08)`);
  amb.addColorStop(1, 'transparent');
  ctx.fillStyle = amb;
  ctx.fillRect(0, 0, W, H);

  // ── 5. CIRCUIT / ENERGY LINES ────────────────────────────
  if (style !== 'minimal') {
    const numLines = style === 'neon' ? 12 : 8;
    for (let i = 0; i < numLines; i++) {
      const angle = (i / numLines) * Math.PI * 2 + rand() * 0.3;
      const startR = style === 'futuristic' ? 105 : 85;
      const len = 40 + rand() * 80;
      const x1 = cx + Math.cos(angle) * startR;
      const y1 = cy + Math.sin(angle) * startR;

      // Segment 1
      const seg1len = len * (0.4 + rand() * 0.3);
      const x2 = x1 + Math.cos(angle) * seg1len;
      const y2 = y1 + Math.sin(angle) * seg1len;

      // 90-degree turn
      const turnAngle = angle + (rand() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
      const seg2len = 10 + rand() * 25;
      const x3 = x2 + Math.cos(turnAngle) * seg2len;
      const y3 = y2 + Math.sin(turnAngle) * seg2len;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      const alpha = style === 'neon' ? 0.3 + rand() * 0.3 : 0.12 + rand() * 0.15;
      ctx.strokeStyle = `hsla(${hue}, 80%, 65%, ${alpha})`;
      ctx.lineWidth = rand() > 0.6 ? 1 : 0.5;
      ctx.stroke();

      // Node dot
      if (rand() > 0.35) {
        ctx.beginPath();
        ctx.arc(x3, y3, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 80%, 70%, 0.5)`;
        ctx.fill();
      }
    }
  }

  // ── 6. OUTER DECORATIVE RING ─────────────────────────────
  const outerR = style === 'minimal' ? 90 : 110;

  if (style !== 'abstract') {
    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${hue}, 70%, 60%, 0.2)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Tick marks
    const ticks = style === 'minimal' ? 24 : 36;
    for (let i = 0; i < ticks; i++) {
      const a = (i / ticks) * Math.PI * 2;
      const isLong = i % (ticks / 6) === 0;
      const r1 = outerR + 4;
      const r2 = r1 + (isLong ? 9 : 4);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
      ctx.strokeStyle = `hsla(${hue}, 70%, 70%, ${isLong ? 0.45 : 0.15})`;
      ctx.lineWidth = isLong ? 1.5 : 0.5;
      ctx.stroke();
    }

    // Arc segments (style accents)
    const arcLen = Math.PI / 3;
    for (let i = 0; i < 3; i++) {
      const startA = (i / 3) * Math.PI * 2 + rand() * 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR + 14, startA, startA + arcLen);
      ctx.strokeStyle = `hsla(${hue}, 80%, 65%, ${0.2 + rand() * 0.2})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // ── 7. FACE / INNER SPHERE ───────────────────────────────
  const innerR = style === 'minimal' ? 72 : 84;

  // Inner face background
  const faceBg = ctx.createRadialGradient(cx, cy - innerR * 0.15, 0, cx, cy, innerR);
  faceBg.addColorStop(0, `hsla(${hue}, 25%, 14%, 0.98)`);
  faceBg.addColorStop(0.7, `hsla(${hue}, 18%, 9%, 0.95)`);
  faceBg.addColorStop(1, `hsla(${hue}, 15%, 6%, 0.9)`);
  ctx.fillStyle = faceBg;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fill();

  // Inner ring border
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.strokeStyle = `hsla(${hue}, 75%, 65%, 0.35)`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── 8. EYES ──────────────────────────────────────────────
  const eyeSpacing = style === 'minimal' ? 24 : 28;
  const eyeY = cy - (style === 'minimal' ? 14 : 18);
  const eyeR = style === 'minimal' ? 11 : 14;

  for (const dir of [-1, 1]) {
    const ex = cx + dir * eyeSpacing;
    const ey = eyeY;

    if (style === 'abstract') {
      // Diamond eyes
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.rect(-eyeR * 0.7, -eyeR * 0.7, eyeR * 1.4, eyeR * 1.4);
      const dGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, eyeR);
      dGrad.addColorStop(0, `hsla(${hue}, 100%, 90%, 0.95)`);
      dGrad.addColorStop(0.5, `hsla(${hue}, 85%, 60%, 0.5)`);
      dGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = dGrad;
      ctx.fill();
      ctx.restore();
    } else if (style === 'neon') {
      // Rectangular neon eyes
      ctx.fillStyle = `hsla(${hue}, 100%, 70%, 0.08)`;
      ctx.fillRect(ex - eyeR, ey - eyeR * 0.5, eyeR * 2, eyeR);
      ctx.strokeStyle = `hsla(${hue}, 100%, 80%, 0.7)`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ex - eyeR, ey - eyeR * 0.5, eyeR * 2, eyeR);
      // Neon fill
      ctx.fillStyle = `hsla(${hue}, 100%, 80%, 0.7)`;
      ctx.fillRect(ex - eyeR * 0.6, ey - eyeR * 0.2, eyeR * 1.2, eyeR * 0.4);
    } else {
      // Circle eyes (futuristic/minimal)
      const eyeGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, eyeR);
      eyeGrad.addColorStop(0, `hsla(${hue}, 100%, 92%, 0.9)`);
      eyeGrad.addColorStop(0.35, `hsla(${hue}, 90%, 65%, 0.6)`);
      eyeGrad.addColorStop(0.7, `hsla(${hue}, 70%, 45%, 0.25)`);
      eyeGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = eyeGrad;
      ctx.beginPath();
      ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
      ctx.fill();

      // Ring
      ctx.beginPath();
      ctx.arc(ex, ey, eyeR * 0.65, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue}, 90%, 78%, 0.75)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pupil
      ctx.beginPath();
      ctx.arc(ex, ey, eyeR * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 100%, 97%, 1)`;
      ctx.fill();

      // Glint
      ctx.beginPath();
      ctx.arc(ex - eyeR * 0.15, ey - eyeR * 0.2, eyeR * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();
    }
  }

  // ── 9. NOSE / SENSOR ─────────────────────────────────────
  if (style !== 'minimal') {
    const noseY = cy + 6;
    if (style === 'futuristic' || style === 'neon') {
      // Triangle sensor
      ctx.beginPath();
      ctx.moveTo(cx, noseY - 5);
      ctx.lineTo(cx - 6, noseY + 7);
      ctx.lineTo(cx + 6, noseY + 7);
      ctx.closePath();
      ctx.strokeStyle = `hsla(${hue}, 65%, 65%, 0.35)`;
      ctx.lineWidth = 1;
      ctx.stroke();
      // Center dot
      ctx.beginPath();
      ctx.arc(cx, noseY + 3, 2, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 80%, 70%, 0.5)`;
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(cx, noseY + 2, 3, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 60%, 60%, 0.3)`;
      ctx.fill();
    }
  }

  // ── 10. MOUTH / STATUS BAR ───────────────────────────────
  const mouthY = cy + (style === 'minimal' ? 20 : 26);
  const mouthW = style === 'minimal' ? 28 : 40;

  if (style === 'abstract') {
    // Wave line
    ctx.beginPath();
    ctx.moveTo(cx - mouthW / 2, mouthY);
    for (let xi = 0; xi <= 10; xi++) {
      const px = cx - mouthW / 2 + (xi / 10) * mouthW;
      const py = mouthY + Math.sin((xi / 10) * Math.PI * 2) * 3;
      ctx.lineTo(px, py);
    }
    ctx.strokeStyle = `hsla(${hue}, 80%, 65%, 0.6)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    // Segmented bar
    const segs = style === 'minimal' ? 4 : 5;
    const segW = mouthW / segs;
    for (let i = 0; i < segs; i++) {
      const active = i < segs - Math.floor(rand() * 2);
      ctx.fillStyle = active
        ? `hsla(${hue}, 90%, 68%, ${0.6 + rand() * 0.3})`
        : `hsla(${hue}, 40%, 40%, 0.18)`;
      ctx.beginPath();
      const rx = cx - mouthW / 2 + i * segW + 1;
      const ry = mouthY - 2.5;
      ctx.roundRect(rx, ry, segW - 2, 5, 1.5);
      ctx.fill();
    }
  }

  // ── 11. SCANNING LINE ────────────────────────────────────
  if (style === 'futuristic' || style === 'neon') {
    const scanY = cy - 28;
    const scanGrad = ctx.createLinearGradient(cx - innerR, scanY, cx + innerR, scanY);
    scanGrad.addColorStop(0, 'transparent');
    scanGrad.addColorStop(0.25, `hsla(${hue}, 90%, 70%, 0.2)`);
    scanGrad.addColorStop(0.5, `hsla(${hue}, 100%, 80%, 0.55)`);
    scanGrad.addColorStop(0.75, `hsla(${hue}, 90%, 70%, 0.2)`);
    scanGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = scanGrad;
    ctx.fillRect(cx - innerR, scanY, innerR * 2, 1.5);
  }

  // ── 12. BOTTOM VIGNETTE ──────────────────────────────────
  const vignette = ctx.createLinearGradient(0, H * 0.58, 0, H);
  vignette.addColorStop(0, 'transparent');
  vignette.addColorStop(0.4, `hsla(${hue}, 20%, 3%, 0.7)`);
  vignette.addColorStop(1, `hsl(${hue}, 20%, 3%)`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // ── 13. AGENT NAME ───────────────────────────────────────
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Name shadow/glow
  ctx.shadowColor = `hsla(${hue}, 90%, 60%, 0.6)`;
  ctx.shadowBlur = 18;
  ctx.fillStyle = `hsla(${hue}, 15%, 94%, 0.96)`;
  ctx.font = `700 30px "Inter", "Helvetica Neue", sans-serif`;
  ctx.fillText(name.toUpperCase(), W / 2, H * 0.77);
  ctx.shadowBlur = 0;

  ctx.fillStyle = `hsla(${hue}, 55%, 68%, 0.72)`;
  ctx.font = `400 11px "Inter", "Helvetica Neue", sans-serif`;
  ctx.fillText(role.toUpperCase(), W / 2, H * 0.83);

  ctx.fillStyle = `hsla(${hue}, 40%, 55%, 0.38)`;
  ctx.font = `400 9px "Inter", "Helvetica Neue", sans-serif`;
  ctx.fillText('01 PROTOCOL · v3.0', W / 2, H * 0.9);

  // ── 14. TOP VIGNETTE ─────────────────────────────────────
  const topVig = ctx.createLinearGradient(0, 0, 0, H * 0.1);
  topVig.addColorStop(0, `hsla(${hue}, 20%, 3%, 0.5)`);
  topVig.addColorStop(1, 'transparent');
  ctx.fillStyle = topVig;
  ctx.fillRect(0, 0, W, H);
}

export function generateAvatarDataUrl(opts: AvatarOptions): string {
  const canvas = document.createElement('canvas');
  renderAvatarToCanvas(canvas, opts);
  return canvas.toDataURL('image/png');
}
