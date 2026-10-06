import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GeoScene } from "@/components/GeoScene";
const GeoScene3D = lazy(() => import("@/components/GeoScene3D"));
function hasWebGL() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; } }
import { useStore } from "@/lib/store";
import { ROLES } from "@/lib/seed";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin_/login")({
  head: () => ({ meta: [{ title: "Connexion — LGTP Backoffice" }, { name: "description", content: "Connexion au cockpit LGTP (démonstration)." }, { property: "og:title", content: "Connexion — LGTP Backoffice" }, { property: "og:description", content: "Connexion au cockpit LGTP (démonstration)." }] }),
  component: Login,
});

function Login() {
  const [idx, setIdx] = useState(0);
  const [email, setEmail] = useState(ROLES[0].email);
  const [pwd, setPwd] = useState("Demo2026!");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const set = useStore((s) => s.set);
  const dark = useStore((s) => s.dark);
  const reduce = useStore((s) => s.reduceMotion);
  const [gl, setGl] = useState<boolean | null>(null);
  useEffect(() => { setGl(hasWebGL() && !window.matchMedia("(prefers-reduced-motion: reduce)").matches); set(() => ({ dark: localStorage.getItem("lgtp-dark") === "1" })); }, [set]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd !== "Demo2026!") { toast.error("Mot de passe incorrect (démo : Demo2026!)"); return; }
    setLoading(true);
    setTimeout(() => {
      set(() => ({ authed: true, role: ROLES[idx].role, user: ROLES[idx].name }));
      sessionStorage.setItem("lgtp-auth", JSON.stringify({ i: idx }));
      toast.success(`Bienvenue, ${ROLES[idx].name}`);
      nav({ to: "/admin" });
    }, 900);
  };
  return (
    <div className="grid min-h-screen md:grid-cols-[1.25fr_1fr]">
      <div className="relative hidden overflow-hidden bg-navy md:block">
        {gl === null ? null : gl ? <Suspense fallback={<GeoScene level="hero" />}><GeoScene3D dark={dark} reduce={reduce} /></Suspense> : <GeoScene level="hero" />}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/90 via-transparent to-transparent" />
        <div className="pointer-events-none absolute bottom-10 left-10 max-w-md text-primary-foreground">
          <p className="font-display text-3xl font-bold leading-tight">Lire le sol.<br />Piloter les marchés.</p>
          <p className="mt-2 text-sm opacity-80">Le cockpit LGTP : veille et dossiers d'appels d'offres, comptabilité des agences, agents IA — l'humain décide et valide.</p>
        </div>
      </div>
      <div className="relative flex items-center justify-center overflow-hidden p-6"><div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl" /><div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-gold/20 blur-3xl" />
        <motion.form initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="relative w-full max-w-sm space-y-5 rounded-2xl border bg-card/80 p-7 card-elev backdrop-blur">
          <img src="/logo.svg" alt="LGTP — Géotechnique,Essais et Expertises" className="h-28 w-auto" />
          <div><h1 className="text-2xl font-bold">Connexion au backoffice</h1><p className="text-sm text-muted-foreground">Accès réservé aux équipes LGTP.</p></div>
          <div className="space-y-1.5"><Label htmlFor="email">E-mail</Label><Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="pwd">Mot de passe</Label>
            <div className="relative"><Input id="pwd" type={show ? "text" : "password"} value={pwd} onChange={(e) => setPwd(e.target.value)} />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-2 text-muted-foreground" aria-label="Afficher le mot de passe">{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Se connecter en tant que</p>
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map((r, i) => <button type="button" key={r.role} onClick={() => { setIdx(i); setEmail(r.email); }} className={cn("rounded-full border px-3 py-1 text-xs transition", i === idx ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary")}>{r.role}</button>)}
            </div>
          </div>
          <Button type="submit" className="relative w-full overflow-hidden" size="lg" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<span className="shine absolute inset-0" />Se connecter</Button>
          <p className="text-center text-xs text-muted-foreground">Données fictives — démonstration</p>
        </motion.form>
      </div>
    </div>
  );
}
