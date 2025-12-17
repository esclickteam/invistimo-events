"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export default function ThankYouPage() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const particles = [];
    const colors = ["#ffcc70", "#ff758c", "#c9b48f", "#ffffff"];

    function hexToRgb(hex) {
      const bigint = parseInt(hex.slice(1), 16);
      return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255].join(
        ","
      );
    }

    function createBurst(x, y) {
      const count = 34;
      for (let i = 0; i < count; i++) {
        particles.push({
          x,
          y,
          r: Math.random() * 2.2 + 0.9,
          c: colors[(Math.random() * colors.length) | 0],
          vx: (Math.random() * 2 - 1) * (2.2 + Math.random() * 2.2),
          vy: -(2.0 + Math.random() * 3.2),
          g: 0.06 + Math.random() * 0.04,
          a: 1,
          fade: 0.012 + Math.random() * 0.012,
        });
      }
    }

    function draw() {
      // זנב עדין (לא מוחק בחדות)
      ctx.fillStyle = "rgba(250, 249, 246, 0.12)";
      ctx.fillRect(0, 0, w, h);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.a -= p.fade;

        if (p.a <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${hexToRgb(p.c)},${p.a})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    function onResize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }

    window.addEventListener("resize", onResize);

    // יצירת "פיצוצים" רכים כל חצי שנייה באזור המרכזי
    intervalRef.current = setInterval(() => {
      createBurst(
        Math.random() * w,
        Math.random() * (h * 0.55) + h * 0.15
      );
    }, 520);

    // התחלה: מנקה רקע פעם אחת
    ctx.fillStyle = "#faf9f6";
    ctx.fillRect(0, 0, w, h);
    draw();

    return () => {
      window.removeEventListener("resize", onResize);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#faf9f6] text-[#4a413a] flex items-center justify-center">
      {/* 🎇 Canvas background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      />

      {/* ✨ Content */}
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 text-center px-6"
      >
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="text-4xl md:text-6xl font-bold mb-6 text-[#c9b48f]"
        >
          תודה שבחרתם להיות חלק מהשמחה שלנו 🎉
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.8, ease: "easeOut" }}
          className="text-lg md:text-2xl"
        >
          נתראה באירוע – מחכים לכם באהבה ❤️
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="mt-10 text-sm md:text-base text-[#6b6046]"
        >
        </motion.div>
      </motion.div>
    </div>
  );
}
