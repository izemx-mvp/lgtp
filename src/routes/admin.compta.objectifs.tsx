import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, Status } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { ACTIVITES, AG_OP, MONTHS, type Activite } from "@/lib/seed";
import { money } from "@/lib/format";

export const Route = createFileRoute("/admin/compta/objectifs")({
  head: () => ({ meta: [{ title: "Objectifs agences — LGTP" }, { name: "description", content: "Objectifs par agence, activité et mois." }, { property: "og:title", content: "Objectifs — LGTP" }, { property: "og:description", content: "Objectifs des agences." }] }),
  component: Page,
});

function Page() {
  const s = useStore();
  const [ag, setAg] = useState("agadir");
  const [statut, setStatut] = useState("Brouillon");
  const [locked, setLocked] = useState(false);
  const o = s.objectifs[ag];
  const setO = (fn: (x: Record<Activite, number[]>) => void) => s.set((st) => { const c = structuredClone(st.objectifs); fn(c[ag]); return { objectifs: c }; });
  const spread = (mode: "linéaire" | "saisonnier") => setO((x) => ACTIVITES.forEach((a) => { const tot = x[a].reduce((p, q) => p + q, 0); x[a] = MONTHS.map((_, m) => Math.round((mode === "linéaire" ? tot / 12 : (tot / 12) * (0.85 + 0.3 * Math.sin((m + 2) / 2))) / 100) * 100); }));
  return (
    <div className="space-y-4">
      <PageHeader title="Objectifs" crumbs={[{ label: "Comptabilité & Agences" }, { label: "Objectifs" }]} sub={<span>Version 2026 · <Status s={statut} /> {locked && "· 🔒 verrouillé"}</span>} actions={<>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={ag} onChange={(e) => setAg(e.target.value)} aria-label="Agence">{AG_OP.map((a) => <option key={a} value={a}>{s.agences.find((g) => g.id === a)!.nom}</option>)}</select>
        <Button variant="outline" disabled={locked} onClick={() => { spread("linéaire"); toast.success("Répartition linéaire appliquée"); }}>Linéaire</Button>
        <Button variant="outline" disabled={locked} onClick={() => { spread("saisonnier"); toast.success("Répartition saisonnière appliquée"); }}>Saisonnier</Button>
        <Button variant="outline" disabled={locked} onClick={() => { const p = Number(window.prompt("Augmentation en %", "5")); if (p) { setO((x) => ACTIVITES.forEach((a) => (x[a] = x[a].map((v) => Math.round(v * (1 + p / 100)))))); toast.success(`+${p} % appliqué`); } }}>+x %</Button>
        <Button variant="outline" disabled={locked} onClick={() => toast.success("Objectifs N-1 copiés")}>Copier N-1</Button>
        <Button disabled={statut === "Validé"} onClick={() => { setStatut("Validé"); toast.success("Validé par la Direction"); }}>Valider (Direction)</Button>
        <Button variant="secondary" onClick={() => { setLocked(!locked); toast(locked ? "Déverrouillé" : "Verrouillé"); }}>{locked ? "Déverrouiller" : "Verrouiller"}</Button></>} />
      <Card className="overflow-x-auto">
        <table className="w-full text-sm"><thead><tr className="text-xs text-muted-foreground"><th className="text-left">Activité</th>{MONTHS.map((m) => <th key={m}>{m}</th>)}<th>Total</th></tr></thead>
          <tbody>{ACTIVITES.map((a) => <tr key={a} className="border-t"><td className="whitespace-nowrap py-1 pr-2">{a}</td>{o[a].map((v, m) => <td key={m}><input disabled={locked} className="w-20 rounded border bg-background px-1 text-right text-xs tabular-nums" value={v} onChange={(e) => setO((x) => (x[a][m] = +e.target.value || 0))} aria-label={`${a} ${MONTHS[m]}`} /></td>)}<td className="pl-2 text-right font-semibold">{money(o[a].reduce((p, q) => p + q, 0), 0)}</td></tr>)}
            <tr className="border-t font-semibold"><td>Total</td>{MONTHS.map((_, m) => <td key={m} className="text-right text-xs">{Math.round(ACTIVITES.reduce((p, a) => p + o[a][m], 0) / 1000)}k</td>)}<td className="text-right">{money(ACTIVITES.reduce((p, a) => p + o[a].reduce((x, y) => x + y, 0), 0), 0)}</td></tr></tbody></table>
        <p className="mt-2 text-xs text-muted-foreground">Comparaison N-1 : +8 % en moyenne. Les objectifs alimentent les jauges, le taux de facturation, les alertes et les rapports.</p>
      </Card>
    </div>
  );
}
