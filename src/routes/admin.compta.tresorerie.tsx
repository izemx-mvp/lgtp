import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Area, AreaChart, Bar, ComposedChart, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, Kpi, PageHeader } from "@/components/ui-kit";
import { cashForecast, useStore } from "@/lib/store";
import { kdh, money } from "@/lib/format";

export const Route = createFileRoute("/admin/compta/tresorerie")({
  head: () => ({ meta: [{ title: "Trésorerie 13 semaines — LGTP" }, { name: "description", content: "Prévision de trésorerie et scénarios." }, { property: "og:title", content: "Trésorerie — LGTP" }, { property: "og:description", content: "Prévision 13 semaines." }] }),
  component: Page,
});

function Page() {
  const s = useStore();
  const [sc, setSc] = useState<"réaliste" | "prudent" | "optimiste">("réaliste");
  const data = cashForecast(s, sc);
  const neg = data.filter((w) => w.solde < 0);
  return (
    <div className="space-y-4">
      <PageHeader title="Trésorerie" crumbs={[{ label: "Comptabilité & Agences" }, { label: "Trésorerie" }]} actions={<>
        <div className="inline-flex rounded-lg bg-muted p-1">{(["réaliste", "prudent", "optimiste"] as const).map((x) => <button key={x} onClick={() => setSc(x)} className={`rounded-md px-3 py-1 text-sm capitalize ${sc === x ? "bg-card font-medium shadow-sm" : ""}`}>{x}</button>)}</div>
        <Button variant="outline" onClick={() => { const f = s.factures.find((x) => x.statut === "Envoyée"); if (f) { s.set((st) => ({ factures: st.factures.map((y) => (y.id === f.id ? { ...y, echeance: new Date(Date.now() + 70 * 864e5).toISOString() } : y)) })); toast(`Encaissement tardif simulé : ${f.num} décalée de 10 semaines`); } }}>Simuler un encaissement tardif</Button></>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {s.comptes.map((c) => <Kpi key={c.id} label={c.banque} value={c.solde} format={kdh} />)}
        <Kpi label="Cautions engagées" value={s.cautions.filter((c) => c.statut !== "Restituée").reduce((a, c) => a + c.montant, 0)} format={kdh} to="/admin/marches/cautions" />
        <Kpi label="Retenues à récupérer" value={s.decomptes.reduce((a, d) => a + d.executes * 0.07, 0)} format={kdh} />
      </div>
      {neg.length > 0 && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">⚠ Solde négatif projeté en {neg.map((w) => w.semaine).join(", ")} (scénario {sc}). Actions suggérées : accélérer les relances des 5 plus grosses créances ; décaler le paiement « Engins Sud Location » de 2 semaines.</div>}
      <Card title={`Prévision à 13 semaines — scénario ${sc}`}>
        <ResponsiveContainer width="100%" height={320}><ComposedChart data={data}><XAxis dataKey="semaine" /><YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><Tooltip formatter={(v: number) => money(v, 0)} /><Legend /><ReferenceLine y={0} stroke="var(--destructive)" /><Bar dataKey="encaissements" fill="var(--brand)" /><Bar dataKey="decaissements" fill="var(--clay)" /><Area dataKey="solde" stroke="var(--gold)" fill="var(--gold)" fillOpacity={0.15} strokeWidth={2} /></ComposedChart></ResponsiveContainer>
      </Card>
      <Card title="Comparaison des scénarios"><ResponsiveContainer width="100%" height={200}><AreaChart data={data.map((w, i) => ({ s: w.semaine, réaliste: cashForecast(s, "réaliste")[i].solde, prudent: cashForecast(s, "prudent")[i].solde, optimiste: cashForecast(s, "optimiste")[i].solde }))}><XAxis dataKey="s" /><YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><Tooltip formatter={(v: number) => money(v, 0)} /><Legend /><Area dataKey="optimiste" stroke="var(--success)" fillOpacity={0} /><Area dataKey="réaliste" stroke="var(--brand)" fillOpacity={0} /><Area dataKey="prudent" stroke="var(--destructive)" fillOpacity={0} /></AreaChart></ResponsiveContainer></Card>
    </div>
  );
}
