import React, { useEffect, useRef } from 'react';
import { renderAvatarToCanvas, AvatarStyle, AvatarOptions } from '../utils/avatarUtils';

interface ProceduralAvatarProps {
  name: string;
  role: string;
  goal: string;
  seed?: number;
  style?: AvatarStyle;
  hueOverride?: number;
  width?: number;
  height?: number;
  className?: string;
  canvasStyle?: React.CSSProperties;
  tenureDays?: AvatarOptions['tenureDays'];
  specialization?: AvatarOptions['specialization'];
  rarityTier?: AvatarOptions['rarityTier'];
}

export function ProceduralAvatar({
  name, role, goal,
  seed = 0,
  style = 'futuristic',
  hueOverride,
  width = 400,
  height = 560,
  className,
  canvasStyle,
  tenureDays,
  specialization,
  rarityTier,
}: ProceduralAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderAvatarToCanvas(canvas, {
      name, role, goal, seed, style, hueOverride, width, height,
      tenureDays, specialization, rarityTier,
    });
  }, [name, role, goal, seed, style, hueOverride, width, height, tenureDays, specialization, rarityTier]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={canvasStyle}
    />
  );
}
