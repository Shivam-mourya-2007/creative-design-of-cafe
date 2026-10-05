import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION CONSTANTS — easy to tune after visual testing
// ═══════════════════════════════════════════════════════════════════════════════
const CAPPUCCINO_SECTION_HEIGHT = '400vh'; // total scroll distance for the pinned experience
const TOTAL_FRAMES = 298;
const AUTOPLAY_END_FRAME = 45;
const TARGET_ROSETTA_FRAME = 200;
const HOLD_END_FRAME = 230;
const AUTOPLAY_DURATION_MS = 1500; // slightly faster cinematic intro
const FRAME_PREFIX = '/cappuccino/frame_';
const FRAME_EXT = '.webp';

// Scroll-progress breakpoints (normalized 0–1 within the section)
const SCROLL_PHASE = {
  FRAME_START: 0.0,    // scroll-controlled frames begin
  FRAME_END: 0.65,     // frames 60 → 230 complete
  HOLD_END: 0.75,      // rosetta holds on screen
  REVEAL_END: 0.92,    // cup slides right, text fades in
};

// Frame cache settings
const CACHE_RANGE = 30;  // keep ±30 frames around current
const PRELOAD_AHEAD = 5; // eagerly decode 5 frames ahead

// ═══════════════════════════════════════════════════════════════════════════════
// FRAME CACHE — progressive loader with eviction
// ═══════════════════════════════════════════════════════════════════════════════
const frameCache = new Map();

function getFrame(index) {
  const i = Math.max(1, Math.min(index, TOTAL_FRAMES));
  if (frameCache.has(i)) return frameCache.get(i);

  const img = new Image();
  img.src = `${FRAME_PREFIX}${i.toString().padStart(4, '0')}${FRAME_EXT}`;
  frameCache.set(i, img);

  // Evict distant frames to bound memory
  for (const key of frameCache.keys()) {
    if (key < i - CACHE_RANGE || key > i + CACHE_RANGE) {
      frameCache.delete(key);
    }
  }

  // Preload upcoming frames
  for (let n = 1; n <= PRELOAD_AHEAD; n++) {
    const nextIdx = i + n;
    if (nextIdx <= TOTAL_FRAMES && !frameCache.has(nextIdx)) {
      const nextImg = new Image();
      nextImg.src = `${FRAME_PREFIX}${nextIdx.toString().padStart(4, '0')}${FRAME_EXT}`;
      frameCache.set(nextIdx, nextImg);
    }
  }

  return img;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANVAS DRAW HELPER
// ═══════════════════════════════════════════════════════════════════════════════
function drawFrameToCanvas(canvas, img) {
  if (!canvas || !img || !img.naturalWidth) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // object-fit: contain — show the full frame without cropping
  const scale = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const x = (canvas.width - w) / 2;
  const y = (canvas.height - h) / 2;

  ctx.drawImage(img, x, y, w, h);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function CappuccinoExperience() {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const currentFrameRef = useRef(1);
  const autoplayRef = useRef(null);
  const autoplayDoneRef = useRef(false);

  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [scrollActive, setScrollActive] = useState(false);

  // ─── Scroll tracking ───────────────────────────────────────────────────────
  // Track how far we've scrolled through the tall outer <section>.
  // 0 = section top aligns with viewport top
  // 1 = section bottom aligns with viewport bottom
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // ─── Reduced-motion detection ──────────────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mq.matches);
    const handler = (e) => setIsReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ─── Resize canvas to fill the sticky viewport ────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      // Redraw after resize
      const img = getFrame(currentFrameRef.current);
      if (img.complete) drawFrameToCanvas(canvas, img);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ─── Phase 1: Autoplay 0 → 60 ─────────────────────────────────────────────
  useEffect(() => {
    if (isReducedMotion) {
      // Reduced-motion: just render the final rosetta immediately
      const img = getFrame(TARGET_ROSETTA_FRAME);
      const tryDraw = () => drawFrameToCanvas(canvasRef.current, img);
      if (img.complete) tryDraw(); else img.onload = tryDraw;
      autoplayDoneRef.current = true;
      return;
    }

    let startTime = null;

    const tick = (timestamp) => {
      // If user has started scrolling, hand off cleanly
      if (scrollActive) {
        autoplayDoneRef.current = true;
        return;
      }

      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / AUTOPLAY_DURATION_MS, 1);

      const frame = Math.max(1, Math.floor(progress * AUTOPLAY_END_FRAME));
      currentFrameRef.current = frame;

      const img = getFrame(frame);
      if (img.complete) {
        drawFrameToCanvas(canvasRef.current, img);
      } else {
        img.onload = () => drawFrameToCanvas(canvasRef.current, img);
      }

      if (progress < 1) {
        autoplayRef.current = requestAnimationFrame(tick);
      } else {
        autoplayDoneRef.current = true;
      }
    };

    autoplayRef.current = requestAnimationFrame(tick);

    return () => {
      if (autoplayRef.current) cancelAnimationFrame(autoplayRef.current);
    };
  }, [isReducedMotion, scrollActive]);

  // ─── Scroll interruption detection ─────────────────────────────────────────
  useEffect(() => {
    if (isReducedMotion) return;

    const handleScroll = () => {
      if (window.scrollY > 10 && !scrollActive) {
        setScrollActive(true);
        if (autoplayRef.current) {
          cancelAnimationFrame(autoplayRef.current);
          autoplayDoneRef.current = true;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isReducedMotion, scrollActive]);

  // ─── Phase 2–3: Scroll-driven frame rendering ─────────────────────────────
  useEffect(() => {
    if (isReducedMotion || !scrollActive) return;

    let rafId;

    const renderLoop = () => {
      const p = smoothProgress.get();

      // Map scroll progress → frame index
      let targetFrame;

      if (p <= SCROLL_PHASE.FRAME_END) {
        // Progress 0.0 → 0.65 maps to frames AUTOPLAY_END_FRAME → TARGET_ROSETTA_FRAME
        const t = p / SCROLL_PHASE.FRAME_END; // normalize to 0–1
        targetFrame = Math.round(
          AUTOPLAY_END_FRAME + t * (TARGET_ROSETTA_FRAME - AUTOPLAY_END_FRAME)
        );
      } else if (p <= SCROLL_PHASE.HOLD_END) {
        // Hold the completed rosetta from 0.65 to 0.75
        targetFrame = TARGET_ROSETTA_FRAME;
      } else {
        // Transition from 200 to 298 during the final scroll phase
        const t = (p - SCROLL_PHASE.HOLD_END) / (1 - SCROLL_PHASE.HOLD_END);
        targetFrame = Math.round(
          TARGET_ROSETTA_FRAME + t * (TOTAL_FRAMES - TARGET_ROSETTA_FRAME)
        );
      }

      // Clamp and update
      targetFrame = Math.max(1, Math.min(targetFrame, TOTAL_FRAMES));
      currentFrameRef.current = targetFrame;

      const img = getFrame(targetFrame);
      if (img.complete) {
        drawFrameToCanvas(canvasRef.current, img);
      }

      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafId);
  }, [scrollActive, smoothProgress, isReducedMotion]);

  // ─── Phase 4: Cup movement + content reveal (Framer Motion transforms) ────
  // Cup slides from center → right during the reveal phase
  const cupX = useTransform(
    smoothProgress,
    [SCROLL_PHASE.HOLD_END, SCROLL_PHASE.REVEAL_END],
    ['0%', '25%']
  );
  const cupScale = useTransform(
    smoothProgress,
    [SCROLL_PHASE.HOLD_END, SCROLL_PHASE.REVEAL_END],
    [1, 0.85]
  );

  // Text fades/slides in from the left
  const textOpacity = useTransform(
    smoothProgress,
    [SCROLL_PHASE.HOLD_END + 0.03, SCROLL_PHASE.REVEAL_END],
    [0, 1]
  );
  const textX = useTransform(
    smoothProgress,
    [SCROLL_PHASE.HOLD_END + 0.03, SCROLL_PHASE.REVEAL_END],
    [-40, 0]
  );

  // Hero Intro fading out
  const heroOpacity = useTransform(smoothProgress, [0, 0.2], [1, 0]);
  const heroY = useTransform(smoothProgress, [0, 0.2], [0, -30]);

  // ─── Mobile detection (simple, avoids SSR issues) ──────────────────────────
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  //
  // Architecture:
  //   <section>          — tall scroll container (e.g. 400vh), drives scroll progress
  //     <div sticky>     — pinned to viewport (100vh), stays put while section scrolls
  //       <canvas>       — frame renderer
  //       <text content> — fades in during Phase 4
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <section
      ref={sectionRef}
      style={{ height: CAPPUCCINO_SECTION_HEIGHT }}
      className="relative w-full"
    >
      {/* ── Sticky viewport: stays fixed in place while parent section scrolls ── */}
      <div className="sticky top-0 left-0 w-full h-screen overflow-hidden flex justify-center">

        {/* ── Hero Intro Text (fades out on scroll) ───────────────────────── */}
        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="absolute top-[15%] md:top-[12%] z-20 flex flex-col items-center pointer-events-none w-full text-center"
        >
          <h2 className="font-display text-6xl md:text-8xl italic font-light tracking-wide text-cafe-brown mb-4">
            Shimo
          </h2>
          <p className="font-sans text-sm md:text-base font-light tracking-[0.2em] uppercase text-cafe-muted">
            Coffee · Pastry · Slow Mornings
          </p>
        </motion.div>

        {/* ── Canvas / Cup container ──────────────────────────────────────── */}
        <motion.div
          style={{
            x: isReducedMotion ? '25%' : (isMobile ? '0%' : cupX),
            scale: isReducedMotion ? 0.85 : (isMobile ? 1 : cupScale),
          }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        >
          <canvas
            ref={canvasRef}
            className="block w-full h-full"
          />
        </motion.div>

        {/* ── Text content overlay ────────────────────────────────────────── */}
        <motion.div
          style={{
            opacity: isReducedMotion ? 1 : textOpacity,
            x: isReducedMotion ? 0 : textX,
          }}
          className="absolute top-1/2 left-6 md:left-[10%] -translate-y-1/2 z-20 max-w-md flex flex-col gap-8 pointer-events-auto"
        >
          <div className="space-y-4">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-cafe-accent">
              Our Signature Pour
            </p>
            <h2 className="font-display text-5xl md:text-7xl italic font-light tracking-wide leading-tight text-cafe-brown">
              Shimo<br />Cappuccino
            </h2>
          </div>

          <p className="font-sans text-base md:text-lg font-light leading-relaxed text-cafe-muted max-w-sm">
            "Espresso, silky milk and a delicate rosetta — poured slowly, made to be remembered."
          </p>

          <p className="font-display text-3xl font-light text-cafe-brown">₹180</p>

          <button className="group relative flex items-center justify-center gap-3 w-fit bg-cafe-brown text-cafe-cream px-8 py-4 rounded-xl overflow-hidden hover:bg-[#1a1614] transition-colors duration-300">
            <span className="uppercase tracking-[0.2em] text-xs font-medium z-10">Order Now</span>
            <span className="transition-transform duration-300 group-hover:translate-x-1 z-10">→</span>
          </button>
        </motion.div>

      </div>
    </section>
  );
}
