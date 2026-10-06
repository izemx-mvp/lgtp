import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataTable } from "@/components/DataTable";
import { Card, Kpi, PageHeader, Status } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { kdh, money } from "@/lib/format";

export const Route = createFileRoute("/admin/marches/resultats")({
  head: () => ({ meta: [{ title: "Résultats & statistiques — LGTP" }, { name: "description", content: "Taux de succès et retours d'expérience." }, { property: "og:title", content: "Résultats — LGTP" }, { property: "og:description", content: "Résultats des AO." }] }),
  component: Page,
});
const HIST = ["ADM", "DPEE Agadir", "Commune d'Agadir", "ONEE", "Al Omrane", "OCP", "AREF", "Région Souss-Massa", "ORMVA", "Commune de Tiznit", "DPEE Guelmim", "Université Ibn Zohr"].flatMap((mo, i) => [0, 1].map((k) => { const est = 150000 + ((i * 7 + k * 3) % 11) * 90000; const ratio = 0.8 + ((i + k * 5) % 9) * 0.025; const won = ratio < 0.93 && (i + k) % 3 !== 0; return { id: `h${i}${k}`, mo, objet: k ? "Contrôle qualité" : "Étude géotechnique", procedure: k ? "AO ouvert simplifié" : "AO ouvert", region: ["Souss-Massa", "Marrakech-Safi", "Guelmim-Oued Noun"][i % 3], estimation: est, offre: Math.round(est * ratio), resultat: won ? "Gagné" : "Perdu", rang: won ? 1 : 2 + (i % 3), concurrent: won ? "—" : ["LabTest Sud", "GéoConseil", "LPEE"][i % 3], mois: ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin"][i % 6] }; }));

function Page() {
  const s = useStore();
  const rows = [...HIST, ...s.dossiers.filter((d) => d.resultat && d.resultat.decision !== "Sans suite").map((d) => { const a = s.aos.find((x) => x.id === d.aoId)!; return { id: d.id, mo: a.mo, objet: a.objet, procedure: a.procedure, region: a.region, estimation: a.estimation, offre: Math.round(d.acteMontant ?? 0), resultat: d.resultat!.decision, rang: d.resultat!.rang, concurrent: d.resultat!.attributaire, mois: "Ce mois" }; })];
  const won = rows.filter((r) => r.resultat === "Gagné");
  const byMo = Object.entries(rows.reduce((m, r) => { const e = m[r.mo] ?? { g: 0, p: 0 }; r.resultat === "Gagné" ? e.g++ : e.p++; m[r.mo] = e; return m; }, {} as Record<string, { g: number; p: number }>)).map(([mo, v]) => ({ mo, Gagnés: v.g, Perdus: v.p }));
  const comp = Object.entries(rows.filter((r) => r.concurrent !== "—" && r.concurrent !== "LGTP").reduce((m, r) => ((m[r.concurrent] = (m[r.concurrent] ?? 0) + 1), m), {} as Record<string, number>));
  return (
    <div className="space-y-4">
      <PageHeader title="Résultats & statistiques" crumbs={[{ label: "Marchés publics" }, { label: "Résultats" }]} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Taux de succès" value={(won.length / rows.length) * 100} format={(n) => `${Math.round(n)} %`} tone="good" />
        <Kpi label="Rang moyen" value={rows.reduce((a, r) => a + r.rang, 0) / rows.length} format={(n) => n.toFixed(1).replace(".", ",")} />
        <Kpi label="Écart moyen à l'estimation" value={(rows.reduce((a, r) => a + r.offre / r.estimation, 0) / rows.length) * 100} format={(n) => `${Math.round(n)} %`} />
        <Kpi label="CA gagné" value={won.reduce((a, r) => a + r.offre, 0)} format={kdh} />
        <Kpi label="Coût de réponse moyen" value={4200} format={(n) => money(n, 0)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Par maître d'ouvrage" className="lg:col-span-2"><ResponsiveContainer width="100%" height={240}><BarChart data={byMo}><XAxis dataKey="mo" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="Gagnés" stackId="a" fill="var(--brand)" /><Bar dataKey="Perdus" stackId="a" fill="var(--clay)" /></BarChart></ResponsiveContainer></Card>
        <Card title="Enseignements (IA)"><ul className="space-y-2 text-sm"><li>💡 Vous perdez au-dessus de 94 % de l'estimation sur les études &lt; 300 000 DH.</li><li>💡 Taux de succès de 70 % avec les DPEE du Souss-Massa.</li><li>💡 Les AO ouverts simplifiés sont gagnés 2× plus souvent quand la visite des lieux est faite.</li></ul>
          <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Concurrents rencontrés</p>{comp.map(([c, n]) => <p key={c} className="text-sm">{c} — {n} défaite(s) face à eux</p>)}</Card>
      </div>
      <DataTable id="res" rows={rows} columns={[{ key: "mo", label: "Maître d'ouvrage", filter: true }, { key: "objet", label: "Objet" }, { key: "procedure", label: "Procédure", filter: true }, { key: "region", label: "Région", filter: true }, { key: "estimation", label: "Estimation", align: "right", render: (r) => money(r.estimation, 0) }, { key: "offre", label: "Offre LGTP", align: "right", render: (r) => money(r.offre, 0) }, { key: "ecart", label: "Écart", align: "right", value: (r) => Math.round((r.offre / r.estimation) * 100), render: (r) => `${Math.round((r.offre / r.estimation) * 100)} %` }, { key: "rang", label: "Rang", align: "right" }, { key: "concurrent", label: "Attributaire" }, { key: "resultat", label: "Résultat", filter: true, render: (r) => <Status s={r.resultat} /> }]} />
    </div>
  );
}
