import React, { useEffect, useRef } from 'react';
import { renderAvatarToCanvas, AvatarStyle } from '../utils/avatarUtils';

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
}: ProceduralAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderAvatarToCanvas(canvas, { name, role, goal, seed, style, hueOverride, width, height });
  }, [name, role, goal, seed, style, hueOverride, width, height]);

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
