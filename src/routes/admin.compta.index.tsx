import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, Legend, Line, LineChart, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, Gauge, Kpi, PageHeader } from "@/components/ui-kit";
import { agencyStats, aging, cashForecast, useStore } from "@/lib/store";
import { ACTIVITES, AG_OP, MONTHS } from "@/lib/seed";
import { kdh, money, daysUntil } from "@/lib/format";
import { makePdf } from "@/lib/pdf";

export const Route = createFileRoute("/admin/compta/")({
  head: () => ({ meta: [{ title: "Comptabilité — vue d'ensemble — LGTP" }, { name: "description", content: "KPI consolidés des agences LGTP." }, { property: "og:title", content: "Comptabilité — LGTP" }, { property: "og:description", content: "Vue d'ensemble financière." }] }),
  component: Page,
});

function Page() {
  const s = useStore();
  const [periode, setPeriode] = useState("Mois");
  const st = AG_OP.map((a) => ({ a, nom: s.agences.find((g) => g.id === a)!.ville, ...agencyStats(s, a) }));
  const fact = st.reduce((x, y) => x + y.factureAn, 0), enc = st.reduce((x, y) => x + y.encaisse, 0), cr = st.reduce((x, y) => x + y.creances, 0), obj = st.reduce((x, y) => x + y.objAn, 0);
  const treso = s.comptes.reduce((a, c) => a + c.solde, 0);
  const dso = fact ? Math.round((cr / (fact * 1.2)) * 120) : 0;
  const marge = 0.31;
  const byAct = ACTIVITES.map((a) => ({ name: a, value: s.factures.filter((f) => f.activite === a).reduce((x, f) => x + f.ht, 0) }));
  const trend = MONTHS.slice(0, new Date().getMonth() + 1).map((m, i) => ({ m, N: s.factures.filter((f) => new Date(f.date).getMonth() === i).reduce((a, f) => a + f.ht, 0), "N-1": 380000 + Math.sin(i) * 60000 }));
  const alerts = [
    ...s.previsions.filter((p) => p.statut === "En retard").map((p) => ({ t: `Prévisions en retard — ${p.agence}`, to: "/admin/compta/previsions" })),
    ...st.filter((x) => x.taux < 0.45).map((x) => ({ t: `Taux de facturation ${Math.round(x.taux * 100)} % — ${x.nom}`, to: "/admin/compta/facturation" })),
    { t: `${s.factures.filter((f) => f.statut === "En retard").length} factures en retard`, to: "/admin/compta/creances" },
    ...s.obligations.filter((o) => o.statut !== "Payé" && daysUntil(o.echeance) <= 10 && daysUntil(o.echeance) >= 0).map((o) => ({ t: `Échéance : ${o.libelle}`, to: "/admin/compta/obligations" })),
    ...(cashForecast(s, "prudent").some((w) => w.solde < 0) ? [{ t: "Trésorerie prudente négative à venir", to: "/admin/compta/tresorerie" }] : []),
    { t: "1 import avec anomalies", to: "/admin/compta/imports" },
  ];
  const ranking = [...st].sort((a, b) => b.taux - a.taux);
  return (
    <div className="space-y-4">
      <PageHeader title="Comptabilité & Agences — vue d'ensemble" crumbs={[{ label: "Comptabilité & Agences" }, { label: "Vue d'ensemble" }]} actions={<>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={periode} onChange={(e) => setPeriode(e.target.value)} aria-label="Période">{["Mois", "Trimestre", "Année"].map((p) => <option key={p}>{p}</option>)}</select>
        <Button variant="outline" onClick={() => { makePdf("Synthèse Comptabilité & Agences", [{ table: { head: ["Agence", "Facturé", "Encaissé", "Créances", "Objectif annuel"], rows: st.map((x) => [x.nom, money(x.factureAn, 0), money(x.encaisse, 0), money(x.creances, 0), money(x.objAn, 0)]) } }]); toast.success("PDF exporté"); }}>Exporter PDF</Button>
        <Button asChild><Link to="/admin/compta/agent">Lancer l'Agent Compta</Link></Button></>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="CA facturé (HT)" value={fact} format={kdh} to="/admin/compta/facturation" /><Kpi label="Encaissé" value={enc} format={kdh} to="/admin/compta/encaissements" />
        <Kpi label="Objectif annuel atteint" value={(fact / obj) * 100} format={(n) => `${Math.round(n)} %`} to="/admin/compta/objectifs" /><Kpi label="Créances" value={cr} format={kdh} tone="warn" to="/admin/compta/creances" />
        <Kpi label="DSO" value={dso} format={(n) => `${Math.round(n)} j`} to="/admin/compta/creances" /><Kpi label="Trésorerie nette" value={treso} format={kdh} to="/admin/compta/tresorerie" />
        <Kpi label="Cautions immobilisées" value={s.cautions.filter((c) => c.statut !== "Restituée").reduce((a, c) => a + c.montant, 0)} format={kdh} to="/admin/marches/cautions" /><Kpi label="Marge brute" value={marge * 100} format={(n) => `${Math.round(n)} %`} to="/admin/compta/budget" />
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
        {st.map((x) => <Link key={x.a} to="/admin/compta/agences/$id" params={{ id: x.a }}><Card title={x.nom}><Gauge value={x.taux} label="CA du mois vs objectif" /><div className="mt-2 space-y-0.5 text-xs"><p>Facturé : {money(x.factureAn, 0)}</p><p>Encaissé : {money(x.encaisse, 0)}</p><p>Créances : {money(x.creances, 0)}</p><p>Prévisions : {["Reçue", "Validée"].includes(s.previsions.find((p) => p.agence === x.a)!.statut) ? "✔ reçues" : "✖ non reçues"}</p></div></Card></Link>)}
        <Card title="Alertes"><ul className="space-y-1">{alerts.map((a, i) => <li key={i}><Link to={a.to} className="block rounded p-1.5 text-sm hover:bg-muted">⚠ {a.t}</Link></li>)}</ul></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Comparaison agences"><ResponsiveContainer width="100%" height={220}><BarChart data={st}><XAxis dataKey="nom" /><YAxis tickFormatter={(v) => `${v / 1000}k`} /><Tooltip formatter={(v: number) => money(v, 0)} /><Legend /><Bar dataKey="factureAn" name="Facturé" fill="var(--brand)" /><Bar dataKey="encaisse" name="Encaissé" fill="var(--gold)" /></BarChart></ResponsiveContainer></Card>
        <Card title="Tendance vs N-1"><ResponsiveContainer width="100%" height={220}><LineChart data={trend}><XAxis dataKey="m" /><YAxis tickFormatter={(v) => `${v / 1000}k`} /><Tooltip formatter={(v: number) => money(v, 0)} /><Legend /><Line dataKey="N" stroke="var(--brand)" strokeWidth={2} /><Line dataKey="N-1" stroke="var(--rock)" strokeDasharray="4 4" /></LineChart></ResponsiveContainer></Card>
        <Card title="Répartition par activité"><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={byAct} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>{byAct.map((_, i) => <Cell key={i} fill={["var(--brand)", "var(--gold)", "var(--clay)"][i]} />)}</Pie><Tooltip formatter={(v: number) => money(v, 0)} /><Legend /></PieChart></ResponsiveContainer></Card>
      </div>
      <Card title="Classement (taux du mois)"><ol className="space-y-1 text-sm">{ranking.map((x, i) => <li key={x.a}>{i + 1}. {x.nom} — {Math.round(x.taux * 100)} %</li>)}</ol></Card>
    </div>
  );
}
