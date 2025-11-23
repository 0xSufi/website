import React, { useEffect, useRef, useState } from "react";
import { Box, Container, NativeSelect, Text, HStack, VStack } from "@chakra-ui/react";
import { Slider } from "../components/ui/slider";
import { Switch } from "../components/ui/switch";
import { FaGripVertical } from 'react-icons/fa';
import { FiX, FiSettings } from 'react-icons/fi';
import { isMobile } from 'react-device-detect';

type AttractorType = "lorenz" | "thomas" | "aizawa" | "chen-lee" | "wang-sun" | "dadras" | "rossler" | "halvorsen" | "simone" | "arneodo";

const attractorTypes: AttractorType[] = ["lorenz", "thomas", "aizawa", "chen-lee", "wang-sun", "dadras", "rossler", "halvorsen", "simone", "arneodo"];

// Random initialization functions
const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
const randomAttractor = () => attractorTypes[Math.floor(Math.random() * attractorTypes.length)];

// Load saved settings or generate random
const loadSetting = <T,>(key: string, randomFn: () => T): T => {
  const saved = localStorage.getItem(`splash_${key}`);
  if (saved !== null && localStorage.getItem('splash_remember') === 'true') {
    try {
      return JSON.parse(saved) as T;
    } catch {
      return randomFn();
    }
  }
  return randomFn();
};

const Splash: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [attractor, setAttractor] = useState<AttractorType>(() => loadSetting('attractor', randomAttractor));
  const [numParticles, setNumParticles] = useState(() => loadSetting('numParticles', () => Math.floor(randomInRange(3, 10))));
  const [thomasA, setThomasA] = useState(() => loadSetting('thomasA', () => randomInRange(0.1, 0.25)));
  const [aizawaA, setAizawaA] = useState(() => loadSetting('aizawaA', () => randomInRange(0.5, 1.2)));
  const [aizawaB, setAizawaB] = useState(() => loadSetting('aizawaB', () => randomInRange(0.5, 1.0)));
  const [aizawaC, setAizawaC] = useState(() => loadSetting('aizawaC', () => randomInRange(0.4, 0.8)));
  const [simoneA, setSimoneA] = useState(() => loadSetting('simoneA', () => randomInRange(4, 7)));
  const [simoneB, setSimoneB] = useState(() => loadSetting('simoneB', () => randomInRange(3, 6)));
  const [simoneScale, setSimoneScale] = useState(() => loadSetting('simoneScale', () => randomInRange(1.5, 3)));
  const [arneodoA, setArneodoA] = useState(() => loadSetting('arneodoA', () => -randomInRange(4, 7)));
  const [arneodoB, setArneodoB] = useState(() => loadSetting('arneodoB', () => randomInRange(2, 5)));
  const [arneodoD, setArneodoD] = useState(() => loadSetting('arneodoD', () => -randomInRange(0.5, 2)));
  const [zoom, setZoom] = useState(() => loadSetting('zoom', () => 1));
  const [bloom, setBloom] = useState(() => loadSetting('bloom', () => Math.random() > 0.3));
  const [motionBlur, setMotionBlur] = useState(() => loadSetting('motionBlur', () => Math.random() > 0.3));
  const [glow, setGlow] = useState(() => loadSetting('glow', () => Math.random() > 0.3));
  const [particleMode, setParticleMode] = useState(() => loadSetting('particleMode', () => Math.random() > 0.5));
  const [singleColor, setSingleColor] = useState(() => loadSetting('singleColor', () => Math.random() > 0.7));
  const baseColors = ["#4ade80", "#60a5fa", "#f472b6", "#fbbf24", "#a78bfa", "#f87171", "#34d399", "#38bdf8"];
  const [selectedColor, setSelectedColor] = useState(() => loadSetting('selectedColor', () => baseColors[Math.floor(Math.random() * baseColors.length)]));
  const [mixedColors, setMixedColors] = useState(() => loadSetting('mixedColors', () => Math.random() > 0.7));
  const [particleSize, setParticleSize] = useState(() => loadSetting('particleSize', () => randomInRange(0.5, 2)));
  const [particleDensity, setParticleDensity] = useState(() => loadSetting('particleDensity', () => Math.floor(randomInRange(3, 15))));
  const [particleShape, setParticleShape] = useState(() => loadSetting('particleShape', () => Math.floor(randomInRange(0, 5))));
  const [randomShapes, setRandomShapes] = useState(() => loadSetting('randomShapes', () => Math.random() > 0.7));
  const [parallel, setParallel] = useState(() => loadSetting('parallel', () => false));
  const [precompute, setPrecompute] = useState(() => loadSetting('precompute', () => Math.floor(randomInRange(1500, 6000))));
  const [showModal, setShowModal] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [timeProgress, setTimeProgress] = useState(100);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInteractingRef = useRef(false);
  const pausedTimeRef = useRef(0);
  const [remember, setRemember] = useState(() => {
    return localStorage.getItem('splash_remember') === 'true';
  });

  // Auto-hide controls after 5 seconds
  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    setControlsVisible(true);
    setTimeProgress(100);
    pausedTimeRef.current = 0;

    // Update progress bar every 50ms
    const startTime = Date.now();
    const duration = 5000;
    progressIntervalRef.current = setInterval(() => {
      if (isInteractingRef.current) return; // Skip update while interacting
      const elapsed = Date.now() - startTime - pausedTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setTimeProgress(remaining);
      if (remaining <= 0) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      }
    }, 50);

    controlsTimeoutRef.current = setTimeout(() => {
      if (!isInteractingRef.current) {
        setControlsVisible(false);
        setTimeProgress(0);
      }
    }, duration);
  };

  // Pause timer while interacting with controls
  const handleInteractionStart = () => {
    isInteractingRef.current = true;
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  };

  // Resume timer when interaction ends
  const handleInteractionEnd = () => {
    isInteractingRef.current = false;
    // Restart timer with remaining time
    const remainingMs = (timeProgress / 100) * 5000;
    if (remainingMs > 0) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
        setTimeProgress(0);
      }, remainingMs);
    }
  };

  // Initial auto-hide
  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Save settings when they change
  useEffect(() => {
    if (remember) {
      localStorage.setItem('splash_attractor', JSON.stringify(attractor));
      localStorage.setItem('splash_numParticles', JSON.stringify(numParticles));
      localStorage.setItem('splash_thomasA', JSON.stringify(thomasA));
      localStorage.setItem('splash_aizawaA', JSON.stringify(aizawaA));
      localStorage.setItem('splash_aizawaB', JSON.stringify(aizawaB));
      localStorage.setItem('splash_aizawaC', JSON.stringify(aizawaC));
      localStorage.setItem('splash_simoneA', JSON.stringify(simoneA));
      localStorage.setItem('splash_simoneB', JSON.stringify(simoneB));
      localStorage.setItem('splash_simoneScale', JSON.stringify(simoneScale));
      localStorage.setItem('splash_arneodoA', JSON.stringify(arneodoA));
      localStorage.setItem('splash_arneodoB', JSON.stringify(arneodoB));
      localStorage.setItem('splash_arneodoD', JSON.stringify(arneodoD));
      localStorage.setItem('splash_zoom', JSON.stringify(zoom));
      localStorage.setItem('splash_bloom', JSON.stringify(bloom));
      localStorage.setItem('splash_motionBlur', JSON.stringify(motionBlur));
      localStorage.setItem('splash_glow', JSON.stringify(glow));
      localStorage.setItem('splash_particleMode', JSON.stringify(particleMode));
      localStorage.setItem('splash_singleColor', JSON.stringify(singleColor));
      localStorage.setItem('splash_selectedColor', JSON.stringify(selectedColor));
      localStorage.setItem('splash_mixedColors', JSON.stringify(mixedColors));
      localStorage.setItem('splash_particleSize', JSON.stringify(particleSize));
      localStorage.setItem('splash_particleDensity', JSON.stringify(particleDensity));
      localStorage.setItem('splash_particleShape', JSON.stringify(particleShape));
      localStorage.setItem('splash_randomShapes', JSON.stringify(randomShapes));
      localStorage.setItem('splash_parallel', JSON.stringify(parallel));
      localStorage.setItem('splash_precompute', JSON.stringify(precompute));
    }
  }, [remember, attractor, numParticles, thomasA, aizawaA, aizawaB, aizawaC, simoneA, simoneB, simoneScale, arneodoA, arneodoB, arneodoD, zoom, bloom, motionBlur, glow, particleMode, singleColor, selectedColor, mixedColors, particleSize, particleDensity, particleShape, randomShapes, parallel, precompute]);

  // Handle remember toggle
  const handleRememberChange = (checked: boolean) => {
    setRemember(checked);
    localStorage.setItem('splash_remember', String(checked));
    if (!checked) {
      // Clear saved settings
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('splash_') && key !== 'splash_remember') {
          localStorage.removeItem(key);
        }
      });
    }
  };

  // Draggable controls state
  const [controlsPosition, setControlsPosition] = useState({ x: window.innerWidth - 170, y: 70 });
  const [isControlsDragging, setIsControlsDragging] = useState(false);
  const [controlsDragStart, setControlsDragStart] = useState({ x: 0, y: 0 });

  // Drag handlers for controls
  const handleControlsMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsControlsDragging(true);
    setControlsDragStart({
      x: e.clientX - controlsPosition.x,
      y: e.clientY - controlsPosition.y
    });
  };

  const handleControlsMouseMove = (e: React.MouseEvent) => {
    if (isControlsDragging) {
      setControlsPosition({
        x: e.clientX - controlsDragStart.x,
        y: e.clientY - controlsDragStart.y
      });
    }
  };

  const handleControlsMouseUp = () => {
    setIsControlsDragging(false);
  };

  const handleControlsTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    setIsControlsDragging(true);
    setControlsDragStart({
      x: touch.clientX - controlsPosition.x,
      y: touch.clientY - controlsPosition.y
    });
  };

  const handleControlsTouchMove = (e: React.TouchEvent) => {
    if (isControlsDragging) {
      e.preventDefault();
      const touch = e.touches[0];
      setControlsPosition({
        x: touch.clientX - controlsDragStart.x,
        y: touch.clientY - controlsDragStart.y
      });
    }
  };

  const handleControlsTouchEnd = () => {
    setIsControlsDragging(false);
  };

  // Rotation state
  const rotationRef = useRef({ x: 0.5, y: 0, z: 0 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const autoRotateRef = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Mouse/touch handlers for rotation
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      autoRotateRef.current = false;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const deltaX = e.clientX - lastMouseRef.current.x;
      const deltaY = e.clientY - lastMouseRef.current.y;

      rotationRef.current.y += deltaX * 0.005;
      rotationRef.current.x += deltaY * 0.005;

      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      setTimeout(() => { autoRotateRef.current = true; }, 2000);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        autoRotateRef.current = false;
        lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return;

      const deltaX = e.touches[0].clientX - lastMouseRef.current.x;
      const deltaY = e.touches[0].clientY - lastMouseRef.current.y;

      rotationRef.current.y += deltaX * 0.005;
      rotationRef.current.x += deltaY * 0.005;

      lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
      setTimeout(() => { autoRotateRef.current = true; }, 2000);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.max(0.2, Math.min(5, prev * delta)));
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);

    // Right-click handler for modal
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setShowModal(true);
    };
    canvas.addEventListener("contextmenu", handleContextMenu);

    // 3D rotation function
    const rotate3D = (x: number, y: number, z: number, rx: number, ry: number, rz: number) => {
      // Rotate around X axis
      let y1 = y * Math.cos(rx) - z * Math.sin(rx);
      let z1 = y * Math.sin(rx) + z * Math.cos(rx);

      // Rotate around Y axis
      let x1 = x * Math.cos(ry) + z1 * Math.sin(ry);
      let z2 = -x * Math.sin(ry) + z1 * Math.cos(ry);

      // Rotate around Z axis
      let x2 = x1 * Math.cos(rz) - y1 * Math.sin(rz);
      let y2 = x1 * Math.sin(rz) + y1 * Math.cos(rz);

      return { x: x2, y: y2, z: z2 };
    };

    // Attractor equations
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

    // Store 3D points for particles
    const particles: { x: number; y: number; z: number; points: { x: number; y: number; z: number }[] }[] = [];
    const trailLength = 1000;

    // Create attractor instances (1 or 3 depending on parallel mode)
    const attractorInstances: {
      particles: { x: number; y: number; z: number; points: { x: number; y: number; z: number }[] }[];
      offset: { x: number; y: number };
      paramVariation: number;
    }[] = [];

    const numInstances = parallel ? 3 : 1;

    for (let inst = 0; inst < numInstances; inst++) {
      const instanceParticles: { x: number; y: number; z: number; points: { x: number; y: number; z: number }[] }[] = [];

      // Initialize particles for this instance
      for (let i = 0; i < numParticles; i++) {
        const init = config.init();
        instanceParticles.push({
          x: init.x + i * 0.01 + (inst * 0.05),
          y: init.y + i * 0.01 + (inst * 0.05),
          z: init.z + (inst * 0.05),
          points: [],
        });
      }

      attractorInstances.push({
        particles: instanceParticles,
        offset: inst === 0
          ? { x: 0, y: 0 }
          : { x: (Math.random() - 0.5) * canvas.width * 0.5, y: (Math.random() - 0.5) * canvas.height * 0.5 },
        paramVariation: inst === 0 ? 1 : 0.7 + Math.random() * 0.6, // 0.7 to 1.3 variation
      });
    }

    // Precompute trails - more steps = more developed attractor
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

          // Only keep trail points for the last trailLength steps
          if (step >= totalPrecompute - trailLength) {
            particle.points.push({ x: particle.x, y: particle.y, z: particle.z });
          }
        });
      });
    }

    // Generate colors for particles
    const baseColors = ["#4ade80", "#60a5fa", "#f472b6", "#fbbf24", "#a78bfa", "#f87171", "#34d399", "#38bdf8"];
    const getColor = (index: number) => {
      if (singleColor) {
        return selectedColor;
      } else if (mixedColors) {
        return baseColors[Math.floor(Math.random() * baseColors.length)];
      } else {
        return baseColors[index % baseColors.length];
      }
    };
    const colors = Array.from({ length: numParticles }, (_, i) => baseColors[i % baseColors.length]);

    // Shape drawing function
    const drawShape = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, shape: number) => {
      const actualShape = randomShapes ? Math.floor(Math.random() * 5) : shape;
      ctx.beginPath();
      switch (actualShape) {
        case 0: // Circle
          ctx.arc(x, y, size, 0, Math.PI * 2);
          break;
        case 1: // Square
          ctx.rect(x - size, y - size, size * 2, size * 2);
          break;
        case 2: // Triangle
          ctx.moveTo(x, y - size);
          ctx.lineTo(x + size, y + size);
          ctx.lineTo(x - size, y + size);
          ctx.closePath();
          break;
        case 3: // Diamond
          ctx.moveTo(x, y - size);
          ctx.lineTo(x + size, y);
          ctx.lineTo(x, y + size);
          ctx.lineTo(x - size, y);
          ctx.closePath();
          break;
        case 4: // Star
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
      // Background clear with optional motion blur
      if (motionBlur) {
        ctx.fillStyle = "rgba(10, 10, 10, 0.12)";
      } else {
        ctx.fillStyle = "#0a0a0a";
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const scale = Math.min(canvas.width, canvas.height) / 60 * (config.scale / 10) * zoom;

      // Per-attractor center offsets to keep visualization centered
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

      // Background glow effect
      if (bloom) {
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, canvas.width / 2);
        gradient.addColorStop(0, "rgba(74, 222, 128, 0.05)");
        gradient.addColorStop(0.5, "rgba(96, 165, 250, 0.03)");
        gradient.addColorStop(1, "rgba(10, 10, 10, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Auto-rotate when not dragging
      if (autoRotateRef.current) {
        rotationRef.current.y += 0.003;
        rotationRef.current.x += 0.001;
      }

      const rx = rotationRef.current.x;
      const ry = rotationRef.current.y;
      const rz = rotationRef.current.z;

      // Update and draw all attractor instances
      attractorInstances.forEach((instance) => {
        const drawCenterX = centerX + instance.offset.x;
        const drawCenterY = centerY + instance.offset.y;

        // Update simulation for this instance
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

        // Draw particles for this instance
        instance.particles.forEach((particle, index) => {

        // Draw trail with 3D rotation and depth
        if (particle.points.length > 1) {
          if (particleMode) {
            // Particle mode: draw individual glowing points with more spacing
            for (let i = 0; i < particle.points.length; i += particleDensity) {
              const p = rotate3D(particle.points[i].x + offset.x, particle.points[i].y + offset.y, particle.points[i].z + offset.z, rx, ry, rz);
              const depth = (p.z + 50) / 100;
              const progress = i / particle.points.length;
              const alpha = progress * (0.3 + depth * 0.7);
              const pointSize = (1.5 + depth * 2.5 + progress * 2) * particleSize;

              const screenX = drawCenterX + p.x * scale;
              const screenY = drawCenterY + p.y * scale;

              const color = getColor(index);

              // Glow effect for every few particles
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
            // Ray mode: draw connected lines
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            for (let i = 1; i < particle.points.length; i += 2) {
              const p1 = rotate3D(particle.points[i - 1].x + offset.x, particle.points[i - 1].y + offset.y, particle.points[i - 1].z + offset.z, rx, ry, rz);
              const p2 = rotate3D(particle.points[i].x + offset.x, particle.points[i].y + offset.y, particle.points[i].z + offset.z, rx, ry, rz);

              // Depth-based effects (z ranges roughly -50 to 50)
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

        // Draw glowing current point with depth
        const currentRotated = rotate3D(particle.x + offset.x, particle.y + offset.y, particle.z + offset.z, rx, ry, rz);
        const currentDepth = (currentRotated.z + 50) / 100;
        const pointSize = 3 + currentDepth * 5;
        const screenX = drawCenterX + currentRotated.x * scale;
        const screenY = drawCenterY + currentRotated.y * scale;

        const currentColor = getColor(index);

        // Bloom effect - multiple layers
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
      }); // end attractorInstances.forEach

      // Draw connections between parallel attractors when in parallel mode
      if (parallel && attractorInstances.length > 1) {
        ctx.globalAlpha = 0.15;
        ctx.lineWidth = 0.5;

        // Connect current points between instances
        for (let i = 0; i < attractorInstances.length; i++) {
          for (let j = i + 1; j < attractorInstances.length; j++) {
            const inst1 = attractorInstances[i];
            const inst2 = attractorInstances[j];

            // Connect corresponding particles between instances
            for (let p = 0; p < Math.min(inst1.particles.length, inst2.particles.length); p++) {
              const p1 = rotate3D(
                inst1.particles[p].x + offset.x,
                inst1.particles[p].y + offset.y,
                inst1.particles[p].z + offset.z,
                rx, ry, rz
              );
              const p2 = rotate3D(
                inst2.particles[p].x + offset.x,
                inst2.particles[p].y + offset.y,
                inst2.particles[p].z + offset.z,
                rx, ry, rz
              );

              const x1 = centerX + inst1.offset.x + p1.x * scale;
              const y1 = centerY + inst1.offset.y + p1.y * scale;
              const x2 = centerX + inst2.offset.x + p2.x * scale;
              const y2 = centerY + inst2.offset.y + p2.y * scale;

              // Skip if any coordinate is non-finite
              if (!isFinite(x1) || !isFinite(y1) || !isFinite(x2) || !isFinite(y2)) continue;

              // Create gradient for connection
              const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
              gradient.addColorStop(0, getColor(p));
              gradient.addColorStop(1, getColor((p + 1) % numParticles));

              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.strokeStyle = gradient;
              ctx.stroke();
            }
          }
        }
        ctx.globalAlpha = 1;
      }

      animationId = requestAnimationFrame(animate);
    };

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("contextmenu", handleContextMenu);
      cancelAnimationFrame(animationId);
    };
  }, [attractor, numParticles, thomasA, aizawaA, aizawaB, aizawaC, simoneA, simoneB, simoneScale, arneodoA, arneodoB, arneodoD, zoom, bloom, motionBlur, glow, particleMode, singleColor, selectedColor, mixedColors, particleSize, particleDensity, particleShape, randomShapes, parallel, precompute]);

  return (
    <Container maxW="100%" px={0} py={0} bg="#0a0a0a" minH="100vh" position="relative">
      {/* Toggle Controls Button */}
      {!showControls && (
        <Box
          position="fixed"
          right="16px"
          top="70px"
          zIndex={10}
        >
          <Box
            as="button"
            onClick={() => setShowControls(true)}
            bg="#1a1a1a"
            border="1px solid #2a2a2a"
            color="#888"
            p={2}
            borderRadius="md"
            cursor="pointer"
            _hover={{ borderColor: '#4ade80', color: '#4ade80' }}
            transition="all 0.2s"
          >
            <FiSettings size={16} />
          </Box>
        </Box>
      )}

      {/* Draggable Controls */}
      {showControls && (
      <Box
        position="fixed"
        left={`${controlsPosition.x}px`}
        top={`${controlsPosition.y}px`}
        zIndex={10}
        maxH={isMobile ? "70vh" : "auto"}
        overflowY="auto"
        opacity={controlsVisible ? 1 : 0.15}
        transform={controlsVisible ? "scale(1) translateY(0)" : "scale(0.98) translateY(-5px)"}
        transition="all 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
        filter={controlsVisible ? "blur(0px)" : "blur(2px)"}
        pointerEvents={controlsVisible ? "auto" : "none"}
        onMouseEnter={resetControlsTimeout}
        onTouchStart={resetControlsTimeout}
        _hover={{
          opacity: 1,
          transform: "scale(1) translateY(0)",
          filter: "blur(0px)",
        }}
      >
        {/* Drag Handle - only this part is draggable */}
        <Box
          bg="#1a1a1a"
          border="1px solid #2a2a2a"
          borderBottom="none"
          borderTopRadius="md"
          p={2}
          pb={1}
          position="relative"
          overflow="hidden"
          cursor={isControlsDragging ? 'grabbing' : 'grab'}
          onMouseDown={handleControlsMouseDown}
          onMouseMove={handleControlsMouseMove}
          onMouseUp={handleControlsMouseUp}
          onMouseLeave={handleControlsMouseUp}
          onTouchStart={handleControlsTouchStart}
          onTouchMove={handleControlsTouchMove}
          onTouchEnd={handleControlsTouchEnd}
          userSelect="none"
          style={{ touchAction: 'none' }}
        >
          {/* Time progress bar */}
          <Box
            position="absolute"
            bottom={0}
            left={0}
            h="2px"
            bg="#4ade80"
            w={`${timeProgress}%`}
            transition="width 0.05s linear"
            opacity={0.8}
          />
          <Box>
            <HStack gap={2} justify="space-between" w="100%">
              <Box>
                <HStack gap={1}>
                  <Box><FaGripVertical size={10} color="#555" /></Box>
                  <Box><Text color="#888" fontSize="2xs" fontWeight="600">Controls</Text></Box>
                </HStack>
              </Box>
              <Box
                as="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowControls(false);
                }}
                color="#888"
                _hover={{ color: '#ff6b6b' }}
                cursor="pointer"
                transition="color 0.2s"
                p={1}
              >
                <FiX size={14} />
              </Box>
            </HStack>
          </Box>
        </Box>

        <Box
          bg="#1a1a1a"
          border="1px solid #2a2a2a"
          borderBottomRadius="md"
          p={2}
          onMouseDown={handleInteractionStart}
          onMouseUp={handleInteractionEnd}
          onMouseLeave={handleInteractionEnd}
          onTouchStart={handleInteractionStart}
          onTouchEnd={handleInteractionEnd}
        >
        <Box mb={3}>
          <NativeSelect.Root size="sm" width="150px">
            <NativeSelect.Field
              value={attractor}
              onChange={(e) => setAttractor(e.target.value as AttractorType)}
              bg="#1a1a1a"
              color="white"
              border="1px solid #2a2a2a"
              _hover={{ borderColor: "#4ade80" }}
            >
              <option value="lorenz" style={{ background: "#1a1a1a" }}>Lorenz</option>
              <option value="thomas" style={{ background: "#1a1a1a" }}>Thomas</option>
              <option value="aizawa" style={{ background: "#1a1a1a" }}>Aizawa</option>
              <option value="chen-lee" style={{ background: "#1a1a1a" }}>Chen-Lee</option>
              <option value="wang-sun" style={{ background: "#1a1a1a" }}>Wang-Sun</option>
              <option value="dadras" style={{ background: "#1a1a1a" }}>Dadras</option>
              <option value="rossler" style={{ background: "#1a1a1a" }}>Rössler</option>
              <option value="halvorsen" style={{ background: "#1a1a1a" }}>Halvorsen</option>
              <option value="simone" style={{ background: "#1a1a1a" }}>Simone</option>
              <option value="arneodo" style={{ background: "#1a1a1a" }}>Arneodo</option>
            </NativeSelect.Field>
          </NativeSelect.Root>
        </Box>

        <Box bg="#1a1a1a" p={3} borderRadius="md" border="1px solid #2a2a2a" width="150px">
          <Box>
            <HStack justify="space-between" mb={2}>
              <Text fontSize="xs" color="#888">Particles</Text>
              <Text fontSize="xs" color="#4ade80" fontWeight="600">{numParticles}</Text>
            </HStack>
          </Box>
          <Slider
            value={[numParticles]}
            min={1}
            max={20}
            step={1}
            onValueChange={(e) => setNumParticles(e.value[0])}
            size="sm"
          />
        </Box>

        <Box bg="#1a1a1a" p={3} borderRadius="md" border="1px solid #2a2a2a" width="150px" mt={3}>
          <Box>
            <HStack justify="space-between" mb={2}>
              <Text fontSize="xs" color="#888">Zoom</Text>
              <Text fontSize="xs" color="#fbbf24" fontWeight="600">{zoom.toFixed(1)}x</Text>
            </HStack>
          </Box>
          <Slider
            value={[zoom * 10]}
            min={2}
            max={50}
            step={1}
            onValueChange={(e) => setZoom(e.value[0] / 10)}
            size="sm"
          />
        </Box>

        <Box bg="#1a1a1a" p={3} borderRadius="md" border="1px solid #2a2a2a" width="150px" mt={3}>
          <Box>
            <HStack justify="space-between" mb={2}>
              <Text fontSize="xs" color="#888">Evolution</Text>
              <Text fontSize="xs" color="#a78bfa" fontWeight="600">{precompute}</Text>
            </HStack>
          </Box>
          <Slider
            value={[precompute]}
            min={1000}
            max={10000}
            step={500}
            onValueChange={(e) => setPrecompute(e.value[0])}
            size="sm"
          />
        </Box>

        <Box bg="#1a1a1a" p={3} borderRadius="md" border="1px solid #2a2a2a" width="150px" mt={3}>
          <Box>
            <HStack justify="space-between">
              <Text fontSize="xs" color="#888">Remember</Text>
              <Switch size="sm" checked={remember} onCheckedChange={(e) => handleRememberChange(e.checked)} colorPalette="purple" />
            </HStack>
          </Box>
        </Box>

        <Box bg="#1a1a1a" p={3} borderRadius="md" border="1px solid #2a2a2a" width="150px" mt={3}>
          <VStack align="stretch" gap={2}>
            <HStack justify="space-between">
              <Text fontSize="xs" color="#888">Bloom</Text>
              <Switch size="sm" checked={bloom} onCheckedChange={(e) => setBloom(e.checked)} colorPalette="green" />
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="xs" color="#888">Motion Blur</Text>
              <Switch size="sm" checked={motionBlur} onCheckedChange={(e) => setMotionBlur(e.checked)} colorPalette="green" />
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="xs" color="#888">Glow</Text>
              <Switch size="sm" checked={glow} onCheckedChange={(e) => setGlow(e.checked)} colorPalette="green" />
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="xs" color="#888">Parallel</Text>
              <Switch size="sm" checked={parallel} onCheckedChange={(e) => setParallel(e.checked)} colorPalette="green" />
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="xs" color="#888">Particles</Text>
              <Switch size="sm" checked={particleMode} onCheckedChange={(e) => setParticleMode(e.checked)} colorPalette="green" />
            </HStack>
            {particleMode && (
              <>
                <Box>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="xs" color="#888">Size</Text>
                    <Text fontSize="xs" color="#fbbf24" fontWeight="600">{particleSize.toFixed(1)}x</Text>
                  </HStack>
                  <Slider
                    value={[particleSize * 10]}
                    min={2}
                    max={30}
                    step={1}
                    onValueChange={(e) => setParticleSize(e.value[0] / 10)}
                    size="sm"
                  />
                </Box>
                <Box>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="xs" color="#888">3D Density</Text>
                    <Text fontSize="xs" color="#a78bfa" fontWeight="600">{Math.round(100 / particleDensity)}%</Text>
                  </HStack>
                  <Slider
                    value={[particleDensity]}
                    min={1}
                    max={20}
                    step={1}
                    onValueChange={(e) => setParticleDensity(e.value[0])}
                    size="sm"
                  />
                </Box>
                <Box>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="xs" color="#888">Shape</Text>
                    <Text fontSize="xs" color="#f87171" fontWeight="600">
                      {randomShapes ? "?" : ["●", "■", "▲", "◆", "★"][particleShape]}
                    </Text>
                  </HStack>
                  <Slider
                    value={[particleShape]}
                    min={0}
                    max={4}
                    step={1}
                    onValueChange={(e) => setParticleShape(e.value[0])}
                    size="sm"
                    disabled={randomShapes}
                  />
                </Box>
                <HStack justify="space-between">
                  <Text fontSize="xs" color="#888">Random</Text>
                  <Switch size="sm" checked={randomShapes} onCheckedChange={(e) => setRandomShapes(e.checked)} colorPalette="green" />
                </HStack>
              </>
            )}
            <HStack justify="space-between">
              <Text fontSize="xs" color="#888">Single Color</Text>
              <Switch size="sm" checked={singleColor} onCheckedChange={(e) => { setSingleColor(e.checked); if (e.checked) setMixedColors(false); }} colorPalette="green" />
            </HStack>
            {singleColor && (
              <HStack gap={1} flexWrap="wrap" mt={1}>
                {["#4ade80", "#60a5fa", "#f472b6", "#fbbf24", "#a78bfa", "#f87171", "#34d399", "#38bdf8"].map((color) => (
                  <Box
                    key={color}
                    w="18px"
                    h="18px"
                    bg={color}
                    borderRadius="sm"
                    cursor="pointer"
                    border={selectedColor === color ? "2px solid white" : "2px solid transparent"}
                    onClick={() => setSelectedColor(color)}
                    _hover={{ transform: "scale(1.1)" }}
                    transition="all 0.1s"
                  />
                ))}
              </HStack>
            )}
            {!singleColor && (
              <HStack justify="space-between">
                <Text fontSize="xs" color="#888">Mixed Colors</Text>
                <Switch size="sm" checked={mixedColors} onCheckedChange={(e) => setMixedColors(e.checked)} colorPalette="green" />
              </HStack>
            )}
          </VStack>
        </Box>

        {attractor === "thomas" && (
          <Box bg="#1a1a1a" p={3} borderRadius="md" border="1px solid #2a2a2a" width="150px" mt={3}>
            <HStack justify="space-between" mb={2}>
              <Text fontSize="xs" color="#888">Damping (a)</Text>
              <Text fontSize="xs" color="#60a5fa" fontWeight="600">{thomasA.toFixed(2)}</Text>
            </HStack>
            <Slider
              value={[thomasA * 100]}
              min={1}
              max={30}
              step={1}
              onValueChange={(e) => setThomasA(e.value[0] / 100)}
              size="sm"
            />
          </Box>
        )}

        {attractor === "aizawa" && (
          <Box bg="#1a1a1a" p={3} borderRadius="md" border="1px solid #2a2a2a" width="150px" mt={3}>
            <VStack align="stretch" gap={3}>
              <Box>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="xs" color="#888">Constant a</Text>
                  <Text fontSize="xs" color="#f472b6" fontWeight="600">{aizawaA.toFixed(2)}</Text>
                </HStack>
                <Slider
                  value={[aizawaA * 100]}
                  min={10}
                  max={150}
                  step={1}
                  onValueChange={(e) => setAizawaA(e.value[0] / 100)}
                  size="sm"
                />
              </Box>
              <Box>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="xs" color="#888">Constant b</Text>
                  <Text fontSize="xs" color="#34d399" fontWeight="600">{aizawaB.toFixed(2)}</Text>
                </HStack>
                <Slider
                  value={[aizawaB * 100]}
                  min={10}
                  max={150}
                  step={1}
                  onValueChange={(e) => setAizawaB(e.value[0] / 100)}
                  size="sm"
                />
              </Box>
              <Box>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="xs" color="#888">Constant c</Text>
                  <Text fontSize="xs" color="#38bdf8" fontWeight="600">{aizawaC.toFixed(2)}</Text>
                </HStack>
                <Slider
                  value={[aizawaC * 100]}
                  min={10}
                  max={150}
                  step={1}
                  onValueChange={(e) => setAizawaC(e.value[0] / 100)}
                  size="sm"
                />
              </Box>
            </VStack>
          </Box>
        )}

        {attractor === "simone" && (
          <Box bg="#1a1a1a" p={3} borderRadius="md" border="1px solid #2a2a2a" width="150px" mt={3}>
            <VStack align="stretch" gap={3}>
              <Box>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="xs" color="#888">Constant a</Text>
                  <Text fontSize="xs" color="#f472b6" fontWeight="600">{simoneA.toFixed(2)}</Text>
                </HStack>
                <Slider
                  value={[simoneA * 10]}
                  min={10}
                  max={100}
                  step={1}
                  onValueChange={(e) => setSimoneA(e.value[0] / 10)}
                  size="sm"
                />
              </Box>
              <Box>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="xs" color="#888">Constant b</Text>
                  <Text fontSize="xs" color="#34d399" fontWeight="600">{simoneB.toFixed(2)}</Text>
                </HStack>
                <Slider
                  value={[simoneB * 10]}
                  min={10}
                  max={100}
                  step={1}
                  onValueChange={(e) => setSimoneB(e.value[0] / 10)}
                  size="sm"
                />
              </Box>
              <Box>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="xs" color="#888">Scale</Text>
                  <Text fontSize="xs" color="#38bdf8" fontWeight="600">{simoneScale.toFixed(1)}</Text>
                </HStack>
                <Slider
                  value={[simoneScale * 10]}
                  min={5}
                  max={50}
                  step={1}
                  onValueChange={(e) => setSimoneScale(e.value[0] / 10)}
                  size="sm"
                />
              </Box>
            </VStack>
          </Box>
        )}

        {attractor === "arneodo" && (
          <Box bg="#1a1a1a" p={3} borderRadius="md" border="1px solid #2a2a2a" width="150px" mt={3}>
            <VStack align="stretch" gap={3}>
              <Box>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="xs" color="#888">Constant a</Text>
                  <Text fontSize="xs" color="#f472b6" fontWeight="600">{arneodoA.toFixed(1)}</Text>
                </HStack>
                <Slider
                  value={[arneodoA * -10]}
                  min={10}
                  max={100}
                  step={1}
                  onValueChange={(e) => setArneodoA(-e.value[0] / 10)}
                  size="sm"
                />
              </Box>
              <Box>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="xs" color="#888">Constant b</Text>
                  <Text fontSize="xs" color="#34d399" fontWeight="600">{arneodoB.toFixed(1)}</Text>
                </HStack>
                <Slider
                  value={[arneodoB * 10]}
                  min={10}
                  max={100}
                  step={1}
                  onValueChange={(e) => setArneodoB(e.value[0] / 10)}
                  size="sm"
                />
              </Box>
              <Box>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="xs" color="#888">Constant d</Text>
                  <Text fontSize="xs" color="#38bdf8" fontWeight="600">{arneodoD.toFixed(1)}</Text>
                </HStack>
                <Slider
                  value={[arneodoD * -10]}
                  min={1}
                  max={50}
                  step={1}
                  onValueChange={(e) => setArneodoD(-e.value[0] / 10)}
                  size="sm"
                />
              </Box>
            </VStack>
          </Box>
        )}
        </Box>
      </Box>
      )}

      {/* Instructions */}
      <Box position="absolute" bottom={4} left={4} zIndex={10}>
        <Box color="#666" fontSize="xs">
          Drag to rotate • Scroll to zoom
        </Box>
      </Box>

      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        overflow="hidden"
        onMouseMove={resetControlsTimeout}
        onTouchStart={resetControlsTimeout}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            cursor: "grab",
          }}
        />
      </Box>

      {/* Right-click Modal */}
      {showModal && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(0, 0, 0, 0.6)"
          backdropFilter="blur(8px)"
          zIndex={100}
          display="flex"
          alignItems="center"
          justifyContent="center"
          onClick={() => setShowModal(false)}
        >
          <Box
            bg="rgba(26, 26, 26, 0.7)"
            border="2px solid"
            borderColor="#a78bfa"
            borderRadius="xl"
            p={8}
            maxW="500px"
            mx={4}
            boxShadow="0 0 40px rgba(167, 139, 250, 0.3)"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <Text color="white" fontSize="lg" fontWeight="600" mb={4} textAlign="center">
              Strange Attractors
            </Text>
            <Text color="#888" fontSize="sm" lineHeight="1.7" textAlign="center">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
            </Text>
            <Box mt={6} textAlign="center">
              <Box
                as="button"
                px={6}
                py={2}
                bg="transparent"
                border="1px solid #a78bfa"
                borderRadius="md"
                color="#a78bfa"
                fontSize="sm"
                cursor="pointer"
                _hover={{ bg: "rgba(167, 139, 250, 0.1)" }}
                transition="all 0.2s"
                onClick={() => setShowModal(false)}
              >
                Close
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </Container>
  );
};

export default Splash;
