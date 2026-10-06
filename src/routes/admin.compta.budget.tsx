import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataTable } from "@/components/DataTable";
import { Card, PageHeader } from "@/components/ui-kit";
import { agencyStats, bpdeTotals, useStore } from "@/lib/store";
import { ACTIVITES, AG_OP } from "@/lib/seed";
import { money } from "@/lib/format";

export const Route = createFileRoute("/admin/compta/budget")({
  head: () => ({ meta: [{ title: "Budget & marges — LGTP" }, { name: "description", content: "Budget vs réel et marges par dossier." }, { property: "og:title", content: "Budget & marges — LGTP" }, { property: "og:description", content: "Marges." }] }),
  component: Page,
});

function Page() {
  const s = useStore();
  const ag = AG_OP.map((a) => { const st = agencyStats(s, a); const charges = s.fournisseurs.filter((f) => f.agence === a).reduce((x, f) => x + f.ht, 0); return { nom: s.agences.find((g) => g.id === a)!.ville, Budget: st.objAn, Réel: st.factureAn, Charges: charges }; });
  const marges = s.dossiers.map((d) => { const a = s.aos.find((x) => x.id === d.aoId)!; const ca = bpdeTotals(d).ht; const st = ca * 0.22, mo = ca * 0.28, dep = ca * (0.04 + d.coefs.depl / 100), mat = ca * 0.08; return { id: d.id, dossier: `${d.id.toUpperCase()} — ${a.mo}`, ca, st, mo, dep, mat, marge: ca - st - mo - dep - mat, prevue: d.coefs.marge + 22 }; });
  return (
    <div className="space-y-4">
      <PageHeader title="Budget & marges" crumbs={[{ label: "Comptabilité & Agences" }, { label: "Budget & marges" }]} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Budget vs réel par agence" className="lg:col-span-2"><ResponsiveContainer width="100%" height={240}><BarChart data={ag}><XAxis dataKey="nom" /><YAxis tickFormatter={(v) => `${v / 1000}k`} /><Tooltip formatter={(v: number) => money(v, 0)} /><Legend /><Bar dataKey="Budget" fill="var(--rock)" /><Bar dataKey="Réel" fill="var(--brand)" /><Bar dataKey="Charges" fill="var(--clay)" /></BarChart></ResponsiveContainer></Card>
        <Card title="Commentaire IA des écarts"><p className="text-sm">Agadir dépasse son budget de CA grâce aux marchés DPEE ; Guelmim reste en retard (−{Math.round((1 - ag[2].Réel / ag[2].Budget) * 100)} %) avec une sous-traitance de sondage élevée. L'activité Expertise affiche la meilleure rentabilité ({ACTIVITES[2]} : 41 % de marge). Recommandation : réviser les prix de mobilisation au-delà de 150 km.</p></Card>
      </div>
      <DataTable id="mg" title="Marge par dossier / chantier" rows={marges} columns={[{ key: "dossier", label: "Dossier" }, { key: "ca", label: "CA HT", align: "right", render: (r) => money(r.ca, 0) }, { key: "st", label: "Sous-traitance", align: "right", render: (r) => money(r.st, 0) }, { key: "mo", label: "Main d'œuvre", align: "right", render: (r) => money(r.mo, 0) }, { key: "dep", label: "Déplacements", align: "right", render: (r) => money(r.dep, 0) }, { key: "mat", label: "Matériel", align: "right", render: (r) => money(r.mat, 0) }, { key: "marge", label: "Marge", align: "right", render: (r) => <b>{money(r.marge, 0)}</b> }, { key: "taux", label: "Réelle vs prévue", align: "right", value: (r) => Math.round((r.marge / r.ca) * 100), render: (r) => `${Math.round((r.marge / r.ca) * 100)} % / ${r.prevue} %` }]} />
    </div>
  );
}
