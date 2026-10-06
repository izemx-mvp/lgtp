import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function TriMark({ className, animated }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="48 18 120 98" className={className} aria-hidden>
      {[["108,23.1 81.9,64.5 134.1,64.5", "var(--brand)"], ["52.9,110.5 79,69.1 105.1,110.5", "var(--brand)"], ["110.9,110.5 137,69.1 163.1,110.5", "var(--brand)"], ["81.9,67.5 134.1,67.5 108,108.9", "var(--gold)"]].map(([p, f], i) => (
        <polygon key={i} points={p} fill={f} className={animated ? "animate-tri" : undefined} style={animated ? { animationDelay: `${i * 0.15}s`, transformOrigin: "center", transformBox: "fill-box" } : undefined} />
      ))}
    </svg>
  );
}
export const Loader = () => <div className="flex items-center justify-center p-10"><TriMark animated className="h-12 w-12" /></div>;

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <TriMark className="h-14 w-14 opacity-40" />
      <p className="font-display font-semibold">{title}</p>
      {text && <p className="max-w-sm text-sm text-muted-foreground">{text}</p>}
      {action}
    </div>
  );
}

export interface Crumb { label: string; to?: string }
export function PageHeader({ title, crumbs, actions, sub }: { title: string; crumbs: Crumb[]; actions?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="fade-up mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <nav aria-label="Fil d'Ariane" className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              {c.to ? <Link to={c.to} className="hover:text-primary">{c.label}</Link> : <span>{c.label}</span>}
            </span>
          ))}
        </nav>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><span className="h-6 w-1.5 rounded-full bg-gold" />{title}</h1>
        {sub && <div className="mt-1 text-sm text-muted-foreground">{sub}</div>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  );
}

export function CountUp({ value, format = (n) => Math.round(n).toLocaleString("fr-FR").replace(/\u202f/g, " ") }: { value: number; format?: (n: number) => string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now();
    const step = (t: number) => { const k = Math.min(1, (t - t0) / 900); setV(value * (1 - Math.pow(1 - k, 3))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(v)}</>;
}

export function Kpi({ label, value, format, hint, tone, to, icon, onHover }: { label: string; value: number; format?: (n: number) => string; hint?: ReactNode; tone?: "warn" | "bad" | "good"; to?: string; icon?: ReactNode; onHover?: () => void }) {
  const body = (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onMouseEnter={onHover} className="group relative h-full overflow-hidden rounded-xl border bg-card p-4 card-elev surface-hover">
      <span className={cn("absolute inset-x-0 top-0 h-0.5", tone === "bad" ? "bg-destructive" : tone === "warn" ? "bg-warning" : tone === "good" ? "bg-success" : "bg-brand-gradient")} />
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">{label}{icon}</div>
      <div className={cn("mt-2 font-display text-2xl font-bold tabular-nums", tone === "bad" && "text-destructive", tone === "warn" && "text-warning", tone === "good" && "text-success")}><CountUp value={value} format={format} /></div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      <Spark seed={label} className="absolute bottom-2 right-3 h-8 w-20 opacity-40 transition-opacity group-hover:opacity-90" />
      {to && <span className="absolute bottom-2 left-4 text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">Voir le détail →</span>}
    </motion.div>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}

const TONES: Record<string, string> = {
  good: "bg-success/15 text-success", warn: "bg-warning/20 text-foreground", bad: "bg-destructive/15 text-destructive", info: "bg-primary/12 text-primary", muted: "bg-muted text-muted-foreground", gold: "bg-gold/25 text-foreground",
};
const MAP: Record<string, keyof typeof TONES> = {
  Go: "good", Gagné: "good", Payée: "good", Validé: "good", Validée: "good", Rapproché: "good", Reçue: "good", Fourni: "good", Valide: "good", Publié: "good", Payé: "good", Déposé: "good", Restituée: "good", Actif: "good", Importé: "good", Accepté: "good", "Auto-généré": "info", Approuvé: "good",
  "No-Go": "muted", Exclu: "muted", Brouillon: "muted", Annulée: "muted", "Sans suite": "muted", Pause: "muted", Rejeté: "muted",
  Expiré: "bad", "En retard": "bad", Perdu: "bad", "Non conforme": "bad", "Non identifié": "bad", Bloquant: "bad", Refusé: "bad", "Erreurs à corriger": "bad", Doublon: "bad",
  "À décider": "gold", Nouveau: "info", "En dossier": "info", "Expire dans 30 j": "warn", Partiel: "warn", "Partiellement payée": "warn", Relancée: "warn", "À fournir": "warn", "En attente": "warn", Demandée: "warn", "Mainlevée demandée": "warn", Majeur: "warn",
};
function Spark({ seed, className }: { seed: string; className?: string }) {
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 9973;
  const pts = Array.from({ length: 10 }, (_, i) => { h = (h * 7919 + 13) % 9973; return `${i * 11},${28 - (h % 20) - i * 0.8}`; }).join(" ");
  return <svg viewBox="0 0 100 32" className={className} aria-hidden><polyline points={pts} fill="none" stroke="var(--brand-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function Status({ s, className }: { s: string; className?: string }) {
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", TONES[MAP[s] ?? "info"], className)}>{s}</span>;
}
export function Jr({ j }: { j: number }) {
  return <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums", j < 0 ? "bg-muted text-muted-foreground" : j <= 3 ? "bg-destructive/15 text-destructive" : j <= 7 ? "bg-warning/20" : "bg-success/15 text-success")}>{j < 0 ? `J+${-j}` : `J-${j}`}</span>;
}
export function Card({ title, children, className, actions }: { title?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn("fade-up rounded-xl border bg-card p-4 card-elev surface-hover", className)}>
      {(title || actions) && <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">{title}</h3><div className="flex gap-1">{actions}</div></div>}
      {children}
    </section>
  );
}
export function Gauge({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(1.2, value)); const a = (Math.min(v, 1) * 180 - 180) * (Math.PI / 180);
  const x = 50 + 40 * Math.cos(a), y = 50 + 40 * Math.sin(a);
  return (
    <div className="text-center">
      <svg viewBox="0 0 100 58" className="mx-auto w-28">
        <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="var(--muted)" strokeWidth="9" strokeLinecap="round" />
        <path d={`M10 50 A40 40 0 0 1 ${x} ${y}`} fill="none" stroke={value >= 0.9 ? "var(--success)" : value >= 0.6 ? "var(--gold)" : "var(--destructive)"} strokeWidth="9" strokeLinecap="round" />
        <text x="50" y="50" textAnchor="middle" fontSize="15" fontWeight="700" fill="currentColor">{Math.round(value * 100)}%</text>
      </svg>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
