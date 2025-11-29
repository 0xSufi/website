import React, { useEffect, useRef, useState } from "react";
import { Box } from "@chakra-ui/react";

type AttractorType = "lorenz" | "thomas" | "aizawa" | "chen-lee" | "wang-sun" | "dadras" | "rossler" | "halvorsen" | "simone" | "arneodo";

const attractorTypes: AttractorType[] = ["lorenz", "thomas", "aizawa", "chen-lee", "wang-sun", "dadras", "rossler", "halvorsen", "simone", "arneodo"];

const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
const randomAttractor = () => attractorTypes[Math.floor(Math.random() * attractorTypes.length)];

interface AttractorBackgroundProps {
  opacity?: number;
  interactive?: boolean;
}

const AttractorBackground: React.FC<AttractorBackgroundProps> = ({ opacity = 0.6, interactive = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [attractor] = useState<AttractorType>(() => randomAttractor());
  const [numParticles] = useState(() => Math.floor(randomInRange(3, 8)));
  const [thomasA] = useState(() => randomInRange(0.1, 0.25));
  const [aizawaA] = useState(() => randomInRange(0.5, 1.2));
  const [aizawaB] = useState(() => randomInRange(0.5, 1.0));
  const [aizawaC] = useState(() => randomInRange(0.4, 0.8));
  const [simoneA] = useState(() => randomInRange(4, 7));
  const [simoneB] = useState(() => randomInRange(3, 6));
  const [simoneScale] = useState(() => randomInRange(1.5, 3));
  const [arneodoA] = useState(() => -randomInRange(4, 7));
  const [arneodoB] = useState(() => randomInRange(2, 5));
  const [arneodoD] = useState(() => -randomInRange(0.5, 2));
  const [zoom] = useState(1);
  const [bloom] = useState(() => Math.random() > 0.3);
  const [motionBlur] = useState(true);
  const [glow] = useState(() => Math.random() > 0.3);
  const [particleMode] = useState(() => Math.random() > 0.5);
  const [singleColor] = useState(() => Math.random() > 0.7);
  const baseColors = ["#4ade80", "#60a5fa", "#f472b6", "#fbbf24", "#a78bfa", "#f87171", "#34d399", "#38bdf8"];
  const [selectedColor] = useState(() => baseColors[Math.floor(Math.random() * baseColors.length)]);
  const [mixedColors] = useState(() => Math.random() > 0.7);
  const [particleSize] = useState(() => randomInRange(0.5, 2));
  const [particleDensity] = useState(() => Math.floor(randomInRange(3, 15)));
  const [particleShape] = useState(() => Math.floor(randomInRange(0, 5)));
  const [randomShapes] = useState(() => Math.random() > 0.7);
  const [precompute] = useState(() => Math.floor(randomInRange(1500, 6000)));

  const rotationRef = useRef({ x: 0.5, y: 0, z: 0 });
  const autoRotateRef = useRef(true);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Mouse/touch handlers for rotation (only when interactive)
    const handleMouseDown = (e: MouseEvent) => {
      if (!interactive) return;
      isDraggingRef.current = true;
      autoRotateRef.current = false;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive || !isDraggingRef.current) return;
      const deltaX = e.clientX - lastMouseRef.current.x;
      const deltaY = e.clientY - lastMouseRef.current.y;
      rotationRef.current.y += deltaX * 0.005;
      rotationRef.current.x += deltaY * 0.005;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      if (!interactive) return;
      isDraggingRef.current = false;
      setTimeout(() => { autoRotateRef.current = true; }, 2000);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (!interactive || e.touches.length !== 1) return;
      isDraggingRef.current = true;
      autoRotateRef.current = false;
      lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!interactive || !isDraggingRef.current || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - lastMouseRef.current.x;
      const deltaY = e.touches[0].clientY - lastMouseRef.current.y;
      rotationRef.current.y += deltaX * 0.005;
      rotationRef.current.x += deltaY * 0.005;
      lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = () => {
      if (!interactive) return;
      isDraggingRef.current = false;
      setTimeout(() => { autoRotateRef.current = true; }, 2000);
    };

    if (interactive) {
      canvas.addEventListener("mousedown", handleMouseDown);
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      canvas.addEventListener("touchstart", handleTouchStart);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleTouchEnd);
    }

    const rotate3D = (x: number, y: number, z: number, rx: number, ry: number, rz: number) => {
      let y1 = y * Math.cos(rx) - z * Math.sin(rx);
      let z1 = y * Math.sin(rx) + z * Math.cos(rx);
      let x1 = x * Math.cos(ry) + z1 * Math.sin(ry);
      let z2 = -x * Math.sin(ry) + z1 * Math.cos(ry);
      let x2 = x1 * Math.cos(rz) - y1 * Math.sin(rz);
      let y2 = x1 * Math.sin(rz) + y1 * Math.cos(rz);
      return { x: x2, y: y2, z: z2 };
    };

    const attractors = {
      lorenz: {
        params: { sigma: 10, rho: 28, beta: 8 / 3 },
        dt: 0.005,
        scale: 12,
        update: (x: number, y: number, z: number, dt: number, p: any) => ({
          dx: p.sigma * (y - x) * dt,
          dy: (x * (p.rho - z) - y) * dt,
          dz: (x * y - p.beta * z) * dt,
        }),
        init: () => ({ x: 0.1, y: 0, z: 0 }),
      },
      thomas: {
        params: { a: thomasA },
        dt: 0.05,
        scale: 40,
        update: (x: number, y: number, z: number, dt: number, p: any) => ({
          dx: (-p.a * x + Math.sin(y)) * dt,
          dy: (-p.a * y + Math.sin(z)) * dt,
          dz: (-p.a * z + Math.sin(x)) * dt,
        }),
        init: () => ({ x: 1.1, y: 1.1, z: -0.01 }),
      },
      aizawa: {
        params: { a: aizawaA, b: aizawaB, c: aizawaC, d: 3.5, e: 0.1 },
        dt: 0.01,
        scale: 120,
        update: (x: number, y: number, z: number, dt: number, p: any) => ({
          dx: ((z - p.b) * x - p.d * y) * dt,
          dy: (p.d * x + (z - p.b) * y) * dt,
          dz: (p.c + p.a * z - (z * z * z) / 3 - (x * x) + p.e * z * (x * x * x)) * dt,
        }),
        init: () => ({ x: 0.1, y: 0, z: 0 }),
      },
      "chen-lee": {
        params: { a: 5, b: -10, c: -0.38 },
        dt: 0.003,
        scale: 8,
        update: (x: number, y: number, z: number, dt: number, p: any) => ({
          dx: (p.a * x - y * z) * dt,
          dy: (p.b * y + x * z) * dt,
          dz: (p.c * z + x * y / 3) * dt,
        }),
        init: () => ({ x: 1, y: 0, z: 4.5 }),
      },
      "wang-sun": {
        params: { a: 0.2, b: -0.03, c: 0.3, d: -0.4, e: -1.5, f: -1.5 },
        dt: 0.01,
        scale: 100,
        update: (x: number, y: number, z: number, dt: number, p: any) => ({
          dx: (p.a * x + p.c * y * z) * dt,
          dy: (p.b * x + p.d * y - x * z) * dt,
          dz: (p.e * z + p.f * x * y) * dt,
        }),
        init: () => ({ x: 0.5, y: 0.5, z: 0.5 }),
      },
      dadras: {
        params: { a: 3, b: 2.7, c: 1.7, d: 2, e: 9 },
        dt: 0.005,
        scale: 10,
        update: (x: number, y: number, z: number, dt: number, p: any) => ({
          dx: (y - p.a * x + p.b * y * z) * dt,
          dy: (p.c * y - x * z + z) * dt,
          dz: (p.d * x * y - p.e * z) * dt,
        }),
        init: () => ({ x: 1, y: 1, z: 1 }),
      },
      rossler: {
        params: { a: 0.2, b: 0.2, c: 5.7 },
        dt: 0.02,
        scale: 15,
        update: (x: number, y: number, z: number, dt: number, p: any) => ({
          dx: (-y - z) * dt,
          dy: (x + p.a * y) * dt,
          dz: (p.b + z * (x - p.c)) * dt,
        }),
        init: () => ({ x: 0.1, y: 0, z: 0 }),
      },
      halvorsen: {
        params: { a: 1.89 },
        dt: 0.005,
        scale: 20,
        update: (x: number, y: number, z: number, dt: number, p: any) => ({
          dx: (-p.a * x - 4 * y - 4 * z - y * y) * dt,
          dy: (-p.a * y - 4 * z - 4 * x - z * z) * dt,
          dz: (-p.a * z - 4 * x - 4 * y - x * x) * dt,
        }),
        init: () => ({ x: -1.48, y: -1.51, z: 2.04 }),
      },
      simone: {
        params: { a: simoneA, b: simoneB, s: simoneScale },
        dt: 0.005,
        scale: 80,
        update: (x: number, y: number, z: number, dt: number, p: any) => {
          const xn = Math.sin(p.a * y) + Math.cos(p.b * z);
          const yn = Math.sin(p.a * z) + Math.cos(p.b * x);
          const zn = Math.sin(p.a * x) + Math.cos(p.b * y);
          const nextX = p.s * xn;
          const nextY = p.s * yn;
          const nextZ = p.s * zn;
          return {
            dx: (nextX - x) * dt,
            dy: (nextY - y) * dt,
            dz: (nextZ - z) * dt,
          };
        },
        init: () => ({ x: 0.1, y: 0.1, z: 0.1 }),
      },
      arneodo: {
        params: { a: arneodoA, b: arneodoB, d: arneodoD },
        dt: 0.01,
        scale: 40,
        update: (x: number, y: number, z: number, dt: number, p: any) => ({
          dx: y * dt,
          dy: z * dt,
          dz: (-p.a * x - p.b * y - z + p.d * Math.pow(x, 3)) * dt,
        }),
        init: () => ({ x: 0.1, y: 0, z: 0 }),
      },
    };

    const config = attractors[attractor];
    const trailLength = 1000;

    const attractorInstances: {
      particles: { x: number; y: number; z: number; points: { x: number; y: number; z: number }[] }[];
      offset: { x: number; y: number };
      paramVariation: number;
    }[] = [];

    const instanceParticles: { x: number; y: number; z: number; points: { x: number; y: number; z: number }[] }[] = [];

    for (let i = 0; i < numParticles; i++) {
      const init = config.init();
      instanceParticles.push({
        x: init.x + i * 0.01,
        y: init.y + i * 0.01,
        z: init.z,
        points: [],
      });
    }

    attractorInstances.push({
      particles: instanceParticles,
      offset: { x: 0, y: 0 },
      paramVariation: 1,
    });

    const totalPrecompute = Math.max(trailLength, precompute);
    for (let step = 0; step < totalPrecompute; step++) {
      attractorInstances.forEach((instance) => {
        instance.particles.forEach((particle) => {
          const { dx, dy, dz } = config.update(
            particle.x,
            particle.y,
            particle.z,
            config.dt * instance.paramVariation,
            config.params
          );

          particle.x += dx * instance.paramVariation;
          particle.y += dy * instance.paramVariation;
          particle.z += dz * instance.paramVariation;

          if (step >= totalPrecompute - trailLength) {
            particle.points.push({ x: particle.x, y: particle.y, z: particle.z });
          }
        });
      });
    }

    const getColor = (index: number) => {
      if (singleColor) {
        return selectedColor;
      } else if (mixedColors) {
        return baseColors[Math.floor(Math.random() * baseColors.length)];
      } else {
        return baseColors[index % baseColors.length];
      }
    };

    const drawShape = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, shape: number) => {
      const actualShape = randomShapes ? Math.floor(Math.random() * 5) : shape;
      ctx.beginPath();
      switch (actualShape) {
        case 0:
          ctx.arc(x, y, size, 0, Math.PI * 2);
          break;
        case 1:
          ctx.rect(x - size, y - size, size * 2, size * 2);
          break;
        case 2:
          ctx.moveTo(x, y - size);
          ctx.lineTo(x + size, y + size);
          ctx.lineTo(x - size, y + size);
          ctx.closePath();
          break;
        case 3:
          ctx.moveTo(x, y - size);
          ctx.lineTo(x + size, y);
          ctx.lineTo(x, y + size);
          ctx.lineTo(x - size, y);
          ctx.closePath();
          break;
        case 4:
          for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const px = x + size * Math.cos(angle);
            const py = y + size * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          break;
        default:
          ctx.arc(x, y, size, 0, Math.PI * 2);
      }
    };

    let animationId: number;

    const animate = () => {
      if (motionBlur) {
        ctx.fillStyle = "rgba(10, 10, 10, 0.12)";
      } else {
        ctx.fillStyle = "#0a0a0a";
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const scale = Math.min(canvas.width, canvas.height) / 60 * (config.scale / 10) * zoom;

      const centerOffsets: Record<string, { x: number; y: number; z: number }> = {
        lorenz: { x: 0, y: 0, z: -27 },
        thomas: { x: 0, y: 0, z: 0 },
        aizawa: { x: 0, y: 0, z: 0 },
        "chen-lee": { x: 0, y: 0, z: 0 },
        "wang-sun": { x: 0, y: 0, z: 0 },
        dadras: { x: 0, y: 0, z: 0 },
        rossler: { x: 0, y: 5, z: 0 },
        halvorsen: { x: 0, y: 0, z: 0 },
        simone: { x: 0, y: 0, z: 0 },
        arneodo: { x: 0, y: 0, z: 0 },
      };
      const offset = centerOffsets[attractor] || { x: 0, y: 0, z: 0 };

      if (bloom) {
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, canvas.width / 2);
        gradient.addColorStop(0, "rgba(74, 222, 128, 0.05)");
        gradient.addColorStop(0.5, "rgba(96, 165, 250, 0.03)");
        gradient.addColorStop(1, "rgba(10, 10, 10, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (autoRotateRef.current) {
        rotationRef.current.y += 0.003;
        rotationRef.current.x += 0.001;
      }

      const rx = rotationRef.current.x;
      const ry = rotationRef.current.y;
      const rz = rotationRef.current.z;

      attractorInstances.forEach((instance) => {
        const drawCenterX = centerX + instance.offset.x;
        const drawCenterY = centerY + instance.offset.y;

        instance.particles.forEach((particle) => {
          const { dx, dy, dz } = config.update(
            particle.x,
            particle.y,
            particle.z,
            config.dt * instance.paramVariation,
            config.params
          );

          particle.x += dx * instance.paramVariation;
          particle.y += dy * instance.paramVariation;
          particle.z += dz * instance.paramVariation;

          particle.points.push({ x: particle.x, y: particle.y, z: particle.z });
          if (particle.points.length > trailLength) {
            particle.points.shift();
          }
        });

        instance.particles.forEach((particle, index) => {
          if (particle.points.length > 1) {
            if (particleMode) {
              for (let i = 0; i < particle.points.length; i += particleDensity) {
                const p = rotate3D(particle.points[i].x + offset.x, particle.points[i].y + offset.y, particle.points[i].z + offset.z, rx, ry, rz);
                const depth = (p.z + 50) / 100;
                const progress = i / particle.points.length;
                const alpha = progress * (0.3 + depth * 0.7);
                const pointSize = (1.5 + depth * 2.5 + progress * 2) * particleSize;

                const screenX = drawCenterX + p.x * scale;
                const screenY = drawCenterY + p.y * scale;

                const color = getColor(index);

                if (glow && i % (particleDensity * 3) === 0) {
                  drawShape(ctx, screenX, screenY, pointSize * 4, particleShape);
                  ctx.fillStyle = color;
                  ctx.globalAlpha = alpha * 0.15;
                  ctx.fill();
                }

                drawShape(ctx, screenX, screenY, pointSize, particleShape);
                ctx.fillStyle = color;
                ctx.globalAlpha = alpha;
                ctx.fill();
              }
              ctx.globalAlpha = 1;
            } else {
              ctx.lineCap = "round";
              ctx.lineJoin = "round";

              for (let i = 1; i < particle.points.length; i += 2) {
                const p1 = rotate3D(particle.points[i - 1].x + offset.x, particle.points[i - 1].y + offset.y, particle.points[i - 1].z + offset.z, rx, ry, rz);
                const p2 = rotate3D(particle.points[i].x + offset.x, particle.points[i].y + offset.y, particle.points[i].z + offset.z, rx, ry, rz);

                const depth = (p2.z + 50) / 100;
                const depthAlpha = 0.3 + depth * 0.7;
                const depthWidth = 1 + depth * 3;

                const progress = i / particle.points.length;
                const alpha = progress * depthAlpha;

                const color = getColor(index);
                ctx.beginPath();
                ctx.moveTo(drawCenterX + p1.x * scale, drawCenterY + p1.y * scale);
                ctx.lineTo(drawCenterX + p2.x * scale, drawCenterY + p2.y * scale);
                ctx.strokeStyle = color;
                ctx.lineWidth = depthWidth * (0.5 + progress);
                ctx.globalAlpha = alpha;
                ctx.stroke();
              }
              ctx.globalAlpha = 1;
            }
          }

          const currentRotated = rotate3D(particle.x + offset.x, particle.y + offset.y, particle.z + offset.z, rx, ry, rz);
          const currentDepth = (currentRotated.z + 50) / 100;
          const pointSize = 3 + currentDepth * 5;
          const screenX = drawCenterX + currentRotated.x * scale;
          const screenY = drawCenterY + currentRotated.y * scale;

          const currentColor = getColor(index);

          if (bloom) {
            for (let layer = 3; layer >= 1; layer--) {
              drawShape(ctx, screenX, screenY, pointSize * layer * 1.5, particleShape);
              ctx.fillStyle = currentColor;
              ctx.globalAlpha = 0.1 / layer;
              ctx.fill();
            }
            ctx.globalAlpha = 1;
          }

          drawShape(ctx, screenX, screenY, pointSize, particleShape);
          ctx.fillStyle = currentColor;
          if (glow) {
            ctx.shadowColor = currentColor;
            ctx.shadowBlur = 20 + currentDepth * 20;
          }
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      });

      animationId = requestAnimationFrame(animate);
    };

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (interactive) {
        canvas.removeEventListener("mousedown", handleMouseDown);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        canvas.removeEventListener("touchstart", handleTouchStart);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
      }
      cancelAnimationFrame(animationId);
    };
  }, [attractor, numParticles, thomasA, aizawaA, aizawaB, aizawaC, simoneA, simoneB, simoneScale, arneodoA, arneodoB, arneodoD, zoom, bloom, motionBlur, glow, particleMode, singleColor, selectedColor, mixedColors, particleSize, particleDensity, particleShape, randomShapes, precompute, interactive]);

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={0}
      pointerEvents={interactive ? "auto" : "none"}
      opacity={opacity}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          cursor: interactive ? "grab" : "default",
        }}
      />
    </Box>
  );
};

export default AttractorBackground;
