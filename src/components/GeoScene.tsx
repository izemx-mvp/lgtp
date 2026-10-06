import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";

// "Géo-Vision": procedural geological cut-away with drilling sequence, CPT curve and seismic pulses.
const STRATA = [
  { name: "Remblai / terre végétale", day: [150, 120, 85], night: [40, 52, 78], h: 0.08 },
  { name: "Sable", day: [217, 199, 163], night: [52, 66, 96], h: 0.14 },
  { name: "Argile", day: [185, 139, 94], night: [44, 56, 88], h: 0.18 },
  { name: "Graves", day: [160, 142, 118], night: [36, 50, 82], h: 0.14 },
  { name: "Calcaire / marne", day: [196, 186, 160], night: [30, 44, 74], h: 0.2 },
  { name: "Substratum rocheux", day: [107, 114, 128], night: [20, 32, 60], h: 0.26 },
];
const QC = [2, 3, 4, 6, 5, 7, 9, 11, 10, 13, 14, 16, 18, 17, 21, 24, 26, 25, 28, 31];

export function GeoScene({ level = "ambient", className = "" }: { level?: "hero" | "ambient"; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dark = useStore((s) => s.dark);
  const reduce = useStore((s) => s.reduceMotion);

  useEffect(() => {
    const cv = ref.current!; const ctx = cv.getContext("2d")!;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches || reduce;
    let w = 0, h = 0, raf = 0, last = 0, mx = 0, my = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    let pulseT = -10; const fpsS: number[] = [];
    const parts = Array.from({ length: level === "hero" ? 70 : 30 }, () => ({ x: Math.random(), y: Math.random() * 0.25, v: 0.2 + Math.random() * 0.6, r: 0.5 + Math.random() * 1.6 }));
    const resize = () => { const r = cv.getBoundingClientRect(); w = r.width; h = r.height; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(cv);
    const onMove = (e: PointerEvent) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; };
    const onPulse = () => { pulseT = performance.now() / 1000; };
    window.addEventListener("pointermove", onMove); window.addEventListener("lgtp-pulse", onPulse);

    const draw = (tms: number) => {
      const t = tms / 1000;
      if (!prefersReduced && level === "ambient" && tms - last < 36) { raf = requestAnimationFrame(draw); return; }
      if (last) { fpsS.push(1000 / (tms - last)); if (fpsS.length > 60) { const avg = fpsS.reduce((a, b) => a + b) / fpsS.length; fpsS.length = 0; if (avg < 28 && dpr > 1) { dpr = 1; resize(); } } }
      last = tms;
      const px = mx * 18, py = my * 10;
      const top = h * (level === "hero" ? 0.3 : 0.25);
      const left = w * 0.06 + px, right = w * 0.94 + px, depth = h - top;
      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, top);
      if (dark) { sky.addColorStop(0, "#07142a"); sky.addColorStop(1, "#0f2a52"); } else { sky.addColorStop(0, "#f7ecd6"); sky.addColorStop(1, "#efd9ae"); }
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      // light rays
      ctx.save(); ctx.globalAlpha = dark ? 0.06 : 0.18;
      for (let i = 0; i < 5; i++) { ctx.fillStyle = dark ? "#2F7BDB" : "#fff6dc"; ctx.beginPath(); const x0 = w * (0.15 + i * 0.18) + Math.sin(t * 0.2 + i) * 20; ctx.moveTo(x0, 0); ctx.lineTo(x0 + 60, 0); ctx.lineTo(x0 + 200, top + 40); ctx.lineTo(x0 + 120, top + 40); ctx.fill(); }
      ctx.restore();
      // strata
      let acc = 0; const bounds: number[] = [];
      const yAt = (k: number, x: number) => top + py * (k / 6) + depth * k + Math.sin(x * 0.006 + k * 1.7) * 10 * (k > 0 ? 1 : 0.3) + Math.sin(x * 0.017 + k) * 4 + (x - w / 2) * 0.03 * k;
      STRATA.forEach((s, i) => {
        const k0 = acc, k1 = acc + s.h; acc = k1; bounds.push(k1);
        ctx.beginPath();
        for (let x = left; x <= right; x += 8) ctx.lineTo(x, yAt(k0, x));
        for (let x = right; x >= left; x -= 8) ctx.lineTo(x, yAt(k1, x));
        ctx.closePath();
        const c = dark ? s.night : s.day;
        const g = ctx.createLinearGradient(0, yAt(k0, w / 2), 0, yAt(k1, w / 2));
        g.addColorStop(0, `rgb(${c.join(",")})`); g.addColorStop(1, `rgb(${c.map((v) => v * 0.82).join(",")})`);
        ctx.fillStyle = g; ctx.fill();
        // grain
        ctx.fillStyle = dark ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.05)";
        for (let n = 0; n < 50; n++) { const gx = left + ((n * 97.3 + i * 31) % (right - left)); const gy = yAt(k0, gx) + ((n * 13.7) % 1) * 0 + ((n * 7.1 + i * 11) % (depth * s.h)); ctx.fillRect(gx, gy, 1.6, 1.6); }
        // contour
        ctx.strokeStyle = dark ? "rgba(47,123,219,0.7)" : "rgba(31,95,173,0.55)"; ctx.lineWidth = 1;
        ctx.beginPath(); for (let x = left; x <= right; x += 8) ctx.lineTo(x, yAt(k1, x)); ctx.stroke();
      });
      // fault line
      ctx.strokeStyle = dark ? "rgba(246,185,33,0.25)" : "rgba(11,31,58,0.25)"; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(w * 0.72 + px, top); ctx.lineTo(w * 0.62 + px, h); ctx.stroke(); ctx.setLineDash([]);
      // water table
      const wy = yAt(0.36, w / 2);
      ctx.fillStyle = `rgba(47,123,219,${0.12 + Math.sin(t * 1.5) * 0.04})`; ctx.fillRect(left, wy, right - left, 6);
      ctx.strokeStyle = "rgba(47,123,219,0.6)"; ctx.beginPath(); for (let x = left; x <= right; x += 6) ctx.lineTo(x, wy + Math.sin(x * 0.05 + t * 2) * 1.2); ctx.stroke();
      // drilling cycle
      const cyc = prefersReduced ? 0.6 : (t % 24) / 24;
      const bx = w * 0.32 + px; const drillD = Math.min(1, cyc / 0.8) * depth * 0.92;
      ctx.fillStyle = dark ? "#cfd8e6" : "#0B1F3A";
      ctx.fillRect(bx - 18, top - 46, 4, 46); ctx.fillRect(bx + 14, top - 46, 4, 46); ctx.fillRect(bx - 22, top - 50, 44, 5); ctx.fillRect(bx - 26, top - 8, 52, 8);
      ctx.fillStyle = "#F6B921"; ctx.fillRect(bx - 8, top - 40 + (Math.sin(t * 6) * 3), 16, 10);
      ctx.strokeStyle = dark ? "#cfd8e6" : "#0B1F3A"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, top - 30); ctx.lineTo(bx, top + drillD); ctx.stroke(); ctx.lineWidth = 1;
      // current stratum highlight
      const curK = drillD / depth; const si = bounds.findIndex((b) => curK < b);
      if (si >= 0) { const k0 = si ? bounds[si - 1] : 0; ctx.strokeStyle = "#F6B921"; ctx.lineWidth = 2; ctx.beginPath(); for (let x = left; x <= right; x += 8) ctx.lineTo(x, yAt(k0, x)); ctx.stroke(); ctx.lineWidth = 1;
        ctx.font = "600 11px Inter, sans-serif"; ctx.fillStyle = "#F6B921"; ctx.fillText(`▶ ${STRATA[si].name}`, bx + 12, top + drillD + 4); }
      // ruler + log
      const rx = w * 0.12 + px;
      ctx.fillStyle = dark ? "rgba(255,255,255,0.75)" : "rgba(11,31,58,0.8)"; ctx.font = "10px Inter, sans-serif";
      for (let m = 0; m <= 30; m += 5) { const yy = top + (m / 30) * depth * 0.92; ctx.fillRect(rx, yy, 8, 1); ctx.fillText(`${m} m`, rx + 11, yy + 3); }
      // core box
      const cbx = w * 0.45 + px, cby = top - 34;
      const cores = Math.floor(curK * 12);
      for (let c = 0; c < cores; c++) { const kk = (c + 0.5) / 12; const idx = Math.max(0, bounds.findIndex((b) => kk < b)); const col = dark ? STRATA[idx].night : STRATA[idx].day; ctx.fillStyle = `rgb(${col.map((v) => (dark ? v * 1.8 : v)).join(",")})`; ctx.fillRect(cbx + (c % 6) * 20, cby + Math.floor(c / 6) * 12, 18, 9); }
      ctx.strokeStyle = dark ? "rgba(255,255,255,0.4)" : "rgba(11,31,58,0.4)"; ctx.strokeRect(cbx - 2, cby - 2, 124, 26);
      // CPT curve
      const cx0 = w * 0.8 + px;
      ctx.strokeStyle = "#F6B921"; ctx.lineWidth = 1.6; ctx.beginPath();
      const nPts = Math.max(1, Math.floor(curK * QC.length));
      for (let i = 0; i < nPts; i++) { const yy = top + (i / QC.length) * depth * 0.92; const xx = cx0 + QC[i] * 3.2 + Math.sin(i * 2.3) * 3; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = dark ? "rgba(255,255,255,0.8)" : "rgba(11,31,58,0.85)"; ctx.font = "600 10px Inter, sans-serif";
      ctx.fillText("CPT · qc (MPa)", cx0, top - 8);
      if (nPts > 10) ctx.fillText(`qc ${QC[Math.min(nPts, QC.length) - 1]} MPa`, cx0 + 80, top + depth * 0.5);
      if (nPts > 6) ctx.fillText("N SPT 32", cx0 + 80, top + depth * 0.3);
      // seismic pulse
      const pt = ((t % 7) / 7) * 1.4; const pAge = t - pulseT;
      const gx = w * 0.58 + px;
      for (let g = 0; g < 6; g++) { ctx.fillStyle = pt < 0.1 || (g / 6 < pt && pt < 1) ? "#F6B921" : dark ? "#2F7BDB" : "#1F5FAD"; ctx.fillRect(gx + g * 14, top - 4, 4, 4); }
      if (!prefersReduced) {
        ctx.strokeStyle = `rgba(47,123,219,${Math.max(0, 0.6 - pt * 0.45)})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(gx + 35, top, pt * w * 0.25, pt * depth * 0.6, 0, 0, Math.PI); ctx.stroke(); ctx.lineWidth = 1;
      }
      if (pAge < 1.6) { // triangle pulse
        const r = 20 + pAge * 120; ctx.strokeStyle = `rgba(246,185,33,${1 - pAge / 1.6})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(w / 2, h / 2 - r); ctx.lineTo(w / 2 - r * 0.87, h / 2 + r / 2); ctx.lineTo(w / 2 + r * 0.87, h / 2 + r / 2); ctx.closePath(); ctx.stroke(); ctx.lineWidth = 1;
      }
      // waveform
      ctx.strokeStyle = dark ? "rgba(47,123,219,0.6)" : "rgba(31,95,173,0.5)"; ctx.beginPath();
      for (let x = 0; x < w; x += 3) { const a = Math.exp(-Math.pow((x / w - pt / 1.4) * 8, 2)) * 10; ctx.lineTo(x, h - 12 + Math.sin(x * 0.3 + t * 8) * a + Math.sin(x * 0.05 + t) * 1.5); }
      ctx.stroke();
      // dust
      ctx.fillStyle = dark ? "rgba(200,220,255,0.35)" : "rgba(140,110,60,0.35)";
      parts.forEach((p) => { if (!prefersReduced) { p.x += 0.0004 * p.v; if (p.x > 1) p.x = 0; } ctx.beginPath(); ctx.arc(p.x * w, top - 10 - p.y * top + Math.sin(t + p.x * 20) * 4, p.r, 0, 7); ctx.fill(); });
      // vignette + fog
      const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, dark ? "rgba(3,10,24,0.65)" : "rgba(80,50,10,0.18)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
      if (!prefersReduced && !document.hidden) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const onVis = () => { if (!document.hidden && !prefersReduced) { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); } };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("pointermove", onMove); window.removeEventListener("lgtp-pulse", onPulse); document.removeEventListener("visibilitychange", onVis); };
  }, [dark, reduce, level]);

  return <canvas ref={ref} className={`h-full w-full ${className}`} aria-hidden />;
}
