import React, { useEffect, useRef } from 'react';
import { QUEEN_PARTICLES } from '../data/queenParticles';

interface QueenParticleCanvasProps {
  className?: string;
}

interface Particle3D {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  size: number;
  brightness: number;
  isCyanAccent?: boolean;
}

interface Sparkle {
  x: number;
  y: number;
  vy: number;
  size: number;
  alpha: number;
  maxAlpha: number;
}

export const QueenParticleCanvas: React.FC<QueenParticleCanvasProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let isMounted = true;
    let angle = 0;
    let mouseX = 0;
    let mouseY = 0;
    let targetTiltX = 0;
    let targetTiltY = 0;

    // Load authentic 3D particles extracted from Queen particle artwork
    const particles: Particle3D[] = QUEEN_PARTICLES.map((p) => ({
      x: p.x,
      y: p.y,
      z: p.z,
      baseX: p.x,
      baseY: p.y,
      baseZ: p.z,
      size: p.s,
      brightness: p.b,
      isCyanAccent: p.y < -92 || (p.y > 115 && Math.random() < 0.25) || Math.random() < 0.08
    }));

    const sparkles: Sparkle[] = [];

    // Ambient floating sparkles
    for (let i = 0; i < 40; i++) {
      sparkles.push({
        x: (Math.random() - 0.5) * 280,
        y: (Math.random() - 0.5) * 360,
        vy: 0.3 + Math.random() * 0.6,
        size: 0.8 + Math.random() * 1.5,
        alpha: Math.random(),
        maxAlpha: 0.4 + Math.random() * 0.5
      });
    }

    // Pointer hover parallax
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      mouseX = ((clientX - rect.left) / rect.width - 0.5) * 2;
      mouseY = ((clientY - rect.top) / rect.height - 0.5) * 2;
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });

    // Main render loop
    const render = () => {
      if (!isMounted) return;

      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvas.clientWidth || 340;
      const displayHeight = canvas.clientHeight || 420;

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Clear with dark subtle fade
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      // Central digital glow
      const cx = displayWidth / 2;
      const cy = displayHeight / 2 - 10;
      const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, 160);
      glow.addColorStop(0, 'rgba(27, 172, 166, 0.14)');
      glow.addColorStop(0.5, 'rgba(10, 40, 38, 0.08)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, 160, 0, Math.PI * 2);
      ctx.fill();

      // Smooth slow majestic rotation + subtle interactive tilt
      angle += 0.006;
      targetTiltX += (mouseX * 0.35 - targetTiltX) * 0.06;
      targetTiltY += (mouseY * 0.18 - targetTiltY) * 0.06;

      const cosY = Math.cos(angle + targetTiltX);
      const sinY = Math.sin(angle + targetTiltX);
      const cosX = Math.cos(targetTiltY - 0.08); // slight down-tilt to see crown
      const sinX = Math.sin(targetTiltY - 0.08);

      const fov = 320;

      // Update & render floating ambient sparkles
      for (let i = 0; i < sparkles.length; i++) {
        const s = sparkles[i];
        s.y -= s.vy;
        s.alpha += 0.01;
        if (s.y < -180) {
          s.y = 180;
          s.x = (Math.random() - 0.5) * 260;
        }
        const currentAlpha = Math.sin(s.alpha) * s.maxAlpha;
        if (currentAlpha > 0) {
          ctx.fillStyle = `rgba(27, 172, 166, ${currentAlpha * 0.6})`;
          ctx.beginPath();
          ctx.arc(cx + s.x, cy + s.y, s.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Rotate, sort and draw particles
      const renderList: Array<{
        sx: number;
        sy: number;
        size: number;
        alpha: number;
        color: string;
        depth: number;
      }> = [];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // 3D Rotation
        const rx = p.baseX * cosY + p.baseZ * sinY;
        const rz = -p.baseX * sinY + p.baseZ * cosY;

        const ry = p.baseY * cosX - rz * sinX;
        const fz = p.baseY * sinX + rz * cosX;

        // Perspective projection
        const scale = fov / (fov + fz);
        const sx = cx + rx * scale;
        const sy = cy + ry * scale;
        const pSize = Math.max(0.6, p.size * scale);

        // Alpha calculation based on depth (closer = brighter, back = dimmer)
        const depthNorm = (fz + 80) / 160;
        const alpha = Math.max(0.18, Math.min(1.0, 0.35 + depthNorm * 0.65));

        const color = p.isCyanAccent
          ? `rgba(27, 172, 166, ${alpha})`
          : `rgba(240, 244, 250, ${alpha * p.brightness})`;

        renderList.push({ sx, sy, size: pSize, alpha, color, depth: fz });
      }

      // Depth sort for authentic 3D layering
      renderList.sort((a, b) => b.depth - a.depth);

      for (let i = 0; i < renderList.length; i++) {
        const item = renderList[i];
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(item.sx, item.sy, item.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      if (isMounted) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
    };
  }, []);

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-[280px] h-[350px] sm:w-[320px] sm:h-[400px] lg:w-[360px] lg:h-[440px] cursor-grab active:cursor-grabbing"
        title="Интерактивная 3D-ферзь из частиц (поворачивайте мышью или пальцем)"
      />
      {/* Subtle bottom pedestal glow */}
      <div className="absolute bottom-4 w-48 h-6 bg-[#1baca6]/15 blur-xl rounded-full pointer-events-none" />
    </div>
  );
};
