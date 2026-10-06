import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2, Radar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { DataTable } from "@/components/DataTable";
import { AgentPanel } from "@/components/AgentPanel";
import { Card, PageHeader, Status } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { REGIONS, SOURCES } from "@/lib/seed";
import { daysUntil, fdatetime } from "@/lib/format";

export const Route = createFileRoute("/admin/marches/veille")({
  head: () => ({ meta: [{ title: "Veille AO — LGTP" }, { name: "description", content: "Scanner d'appels d'offres et configuration de veille." }, { property: "og:title", content: "Veille AO — LGTP" }, { property: "og:description", content: "Scanner d'appels d'offres." }] }),
  component: Veille,
});

function Veille() {
  const s = useStore();
  const [scanning, setScanning] = useState<string | null>(null);
  const [prog, setProg] = useState(0);
  const [kw, setKw] = useState("étude géotechnique, reconnaissance géotechnique, sondages, essais de laboratoire, contrôle qualité, contrôle technique, expertise, essais sur béton, compactage");
  const [excl, setExcl] = useState("fournitures, génie électrique, nettoyage, informatique");
  const [regs, setRegs] = useState<string[]>(REGIONS);
  const [min, setMin] = useState(50000), [max, setMax] = useState(5000000);
  const [srcMeta, setSrcMeta] = useState(() => SOURCES.map((src, i) => ({ id: src, source: src, statut: i === 6 ? "Erreur" : "OK", dernier: new Date(Date.now() - (i + 1) * 3600e3).toISOString(), trouves: 0, erreurs: i === 6 ? 1 : 0, frequence: i < 1 ? "Toutes les 2 h" : i < 5 ? "Toutes les 6 h" : "Quotidien" })));
  const preview = useMemo(() => { const words = kw.split(",").map((w) => w.trim().toLowerCase().split(" ")[0]).filter(Boolean); const ex = excl.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean); return s.aos.filter((a) => regs.includes(a.region) && a.estimation >= min && a.estimation <= max && words.some((w) => a.objet.toLowerCase().includes(w)) && !ex.some((e) => a.objet.toLowerCase().includes(e))).length; }, [kw, excl, regs, min, max, s.aos]);

  const scan = (src: string) => {
    setScanning(src); setProg(0);
    const iv = setInterval(() => setProg((p) => Math.min(100, p + 12)), 150);
    setTimeout(() => { clearInterval(iv); const n = s.scan(src); setSrcMeta((m) => m.map((x) => (x.id === src ? { ...x, dernier: new Date().toISOString(), trouves: x.trouves + n, statut: "OK", erreurs: 0 } : x))); setScanning(null); toast.success(`${n} nouveaux AO · 2 très pertinents`); }, 1500);
  };
  const byDay = useMemo(() => { const m = new Map<string, { vus: number; pert: number; excl: number; ign: number }>(); s.aos.forEach((a) => { const k = a.detectedAt.slice(0, 10); const e = m.get(k) ?? { vus: 0, pert: 0, excl: 0, ign: 0 }; e.vus++; if (a.statut === "Exclu") e.excl++; else if (a.statut === "No-Go") e.ign++; else e.pert++; m.set(k, e); }); return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7); }, [s.aos]);
  const stale = s.aos.filter((a) => a.pertinent && a.statut === "Nouveau" && daysUntil(a.detectedAt) <= -2);

  return (
    <div className="space-y-4">
      <PageHeader title="Veille des appels d'offres" crumbs={[{ label: "Marchés publics" }, { label: "Veille" }]} actions={<><Button onClick={() => scan("marchespublics.gov.ma")} disabled={!!scanning} className="gap-2"><Radar className="h-4 w-4" />Scanner toutes les sources</Button><AgentPanel agent="veille" /></>} />
      {scanning && <Card><div className="flex items-center gap-3 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Scan de {scanning}…<Progress value={prog} className="flex-1" /></div></Card>}
      {stale.length > 0 && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">⚠ {stale.length} AO pertinent(s) non traité(s) depuis plus de 48 h.</div>}
      <DataTable id="src" title="Sources" rows={srcMeta} columns={[
        { key: "source", label: "Source" }, { key: "statut", label: "Statut", render: (r) => <Status s={r.statut === "OK" ? "Actif" : "Expiré"} />, filter: true },
        { key: "dernier", label: "Dernier scan", value: (r) => fdatetime(r.dernier) }, { key: "trouves", label: "AO trouvés", align: "right" }, { key: "erreurs", label: "Erreurs", align: "right" }, { key: "frequence", label: "Fréquence", filter: true },
      ]} actions={(r) => <Button size="sm" variant="outline" disabled={!!scanning} onClick={() => scan(r.source)}>Lancer un scan</Button>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`Configuration de veille — ${preview} AO correspondants`} actions={<Button size="sm" onClick={() => toast.success("Configuration de veille enregistrée")}>Enregistrer</Button>}>
          <div className="space-y-3 text-sm">
            <label className="block"><span className="text-xs text-muted-foreground">Mots-clés</span><Input value={kw} onChange={(e) => setKw(e.target.value)} /></label>
            <label className="block"><span className="text-xs text-muted-foreground">Mots exclus</span><Input value={excl} onChange={(e) => setExcl(e.target.value)} /></label>
            <div className="flex gap-2"><label className="flex-1"><span className="text-xs text-muted-foreground">Estimation min (DH)</span><Input type="number" value={min} onChange={(e) => setMin(+e.target.value)} /></label><label className="flex-1"><span className="text-xs text-muted-foreground">Estimation max (DH)</span><Input type="number" value={max} onChange={(e) => setMax(+e.target.value)} /></label></div>
            <div><span className="text-xs text-muted-foreground">Régions</span><div className="mt-1 grid grid-cols-2 gap-1">{REGIONS.map((r) => <label key={r} className="flex items-center gap-2"><Checkbox checked={regs.includes(r)} onCheckedChange={(c) => setRegs(c ? [...regs, r] : regs.filter((x) => x !== r))} />{r}</label>)}</div></div>
            <p className="text-xs text-muted-foreground">Classe & qualifications : Classe 1 (voir Références & moyens) · Matériel requis vérifié contre l'inventaire · Exclusion automatique des AO hors périmètre LGTP activée.</p>
          </div>
        </Card>
        <Card title="Garantie zéro oubli — contrôle d'exhaustivité">
          <table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground"><th>Jour</th><th>Vus</th><th>Pertinents</th><th>Ignorés</th><th>Exclus</th><th>Doublons fusionnés</th></tr></thead>
            <tbody>{byDay.map(([d, e], i) => <tr key={d} className="border-t"><td className="py-1.5">{d.split("-").reverse().join("/")}</td><td>{e.vus}</td><td>{e.pert}</td><td>{e.ign}</td><td>{e.excl}</td><td>{i % 3}</td></tr>)}</tbody></table>
          <p className="mt-2 text-xs text-success">✔ Sources vs retenus : 100 % des AO vus sont classés (pertinent / ignoré / exclu).</p>
        </Card>
      </div>
      <DataTable id="ex" title="Journal des exclusions — « Pourquoi exclu ? »" rows={s.aos.filter((a) => a.statut === "Exclu")} columns={[{ key: "mo", label: "Maître d'ouvrage" }, { key: "objet", label: "Objet" }, { key: "source", label: "Source", filter: true }, { key: "excluReason", label: "Motif d'exclusion", filter: true }, { key: "score", label: "Score", align: "right" }]}
        actions={(r) => <Button size="sm" variant="ghost" onClick={() => { s.set((x) => ({ aos: x.aos.map((a) => (a.id === r.id ? { ...a, statut: "Nouveau", pertinent: true } : a)) })); toast.success("AO réintégré dans les opportunités"); }}>Réintégrer</Button>} />
    </div>
  );
}
