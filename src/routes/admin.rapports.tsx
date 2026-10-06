import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { AgentPanel } from "@/components/AgentPanel";
import { Card, PageHeader } from "@/components/ui-kit";
import { agencyStats, aging, useStore } from "@/lib/store";
import { AG_OP } from "@/lib/seed";
import { fdate, money } from "@/lib/format";
import { makePdf, downloadCSV } from "@/lib/pdf";

export const Route = createFileRoute("/admin/rapports")({
  head: () => ({ meta: [{ title: "Rapports — LGTP" }, { name: "description", content: "Rapports automatiques marchés et agences." }, { property: "og:title", content: "Rapports — LGTP" }, { property: "og:description", content: "Rapports." }] }),
  component: Page,
});
const TYPES = ["Hebdo marchés", "Mensuel marchés", "Mensuel agences", "Direction (synthèse)", "Pipeline commercial"];

function Page() {
  const s = useStore();
  const [type, setType] = useState(TYPES[0]);
  const [periode, setPeriode] = useState("Mois en cours");
  const [freq, setFreq] = useState("Hebdomadaire");
  const content = (t: string) => {
    const rel = s.aos.filter((a) => a.pertinent);
    if (t.includes("marchés")) { const dep = s.dossiers.filter((d) => d.depot).length; return { comment: `Sur la période, ${rel.length} AO pertinents ont été détectés, ${rel.filter((a) => ["Go", "En dossier"].includes(a.statut)).length} retenus (Go) et ${dep} déposés. Le taux de succès s'établit à ${Math.round((s.dossiers.filter((d) => d.resultat?.decision === "Gagné").length / Math.max(1, s.dossiers.filter((d) => d.resultat).length)) * 100)} %.`, table: { head: ["Indicateur", "Valeur"], rows: [["AO détectés", rel.length], ["Go", rel.filter((a) => a.statut === "Go").length], ["Dossiers", s.dossiers.length], ["Déposés", dep]] } }; }
    if (t === "Pipeline commercial") return { comment: `${s.leads.length} leads, ${s.devis.length} devis dont ${s.devis.filter((d) => d.statut === "Accepté").length} acceptés.`, table: { head: ["Statut", "Leads"], rows: ["Nouveau", "Qualifié", "Devis envoyé", "Gagné", "Perdu"].map((x) => [x, s.leads.filter((l) => l.statut === x).length]) } };
    const st = AG_OP.map((a) => ({ a, ...agencyStats(s, a) }));
    return { comment: `Le réseau a facturé ${money(st.reduce((x, y) => x + y.factureMois, 0), 0)} ce mois (${Math.round((st.reduce((x, y) => x + y.factureMois, 0) / st.reduce((x, y) => x + y.objMois, 0)) * 100)} % de l'objectif). Créances > 60 j : ${money(aging(s)["61-90"] + aging(s)["> 90"], 0)}. ${st.sort((a, b) => a.taux - b.taux)[0].a} est l'agence la plus en retard.`, table: { head: ["Agence", "Facturé mois", "Objectif", "Créances"], rows: st.map((x) => [x.a, money(x.factureMois, 0), money(x.objMois, 0), money(x.creances, 0)]) } };
  };
  const c = content(type);
  const pdf = (t: string) => { const x = content(t); makePdf(`Rapport ${t}`, [{ title: "Commentaire", paragraphs: [x.comment] }, { table: x.table }], { subtitle: periode }); };
  return (
    <div className="space-y-4">
      <PageHeader title="Rapports" crumbs={[{ label: "Rapports" }]} actions={<AgentPanel agent="rapports" />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Paramètres">
          <div className="space-y-2 text-sm">
            <select className="h-9 w-full rounded border bg-background px-2" value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
            <select className="h-9 w-full rounded border bg-background px-2" value={periode} onChange={(e) => setPeriode(e.target.value)} aria-label="Période">{["Semaine en cours", "Mois en cours", "Mois précédent", "Trimestre"].map((t) => <option key={t}>{t}</option>)}</select>
            <p className="pt-2 text-xs font-semibold uppercase text-muted-foreground">Planification</p>
            <select className="h-9 w-full rounded border bg-background px-2" value={freq} onChange={(e) => setFreq(e.target.value)} aria-label="Fréquence">{["Hebdomadaire", "Mensuelle", "Désactivée"].map((t) => <option key={t}>{t}</option>)}</select>
            <p className="text-xs text-muted-foreground">Destinataires : Direction, Responsable Marchés · Canal : e-mail</p>
            <div className="flex flex-wrap gap-2 pt-2"><Button onClick={() => { s.set((x) => ({ reports: [{ id: `rp${Date.now()}`, type, periode, date: new Date().toISOString(), auteur: s.user }, ...x.reports] })); pdf(type); toast.success("Rapport généré et ajouté à l'historique"); }}>Générer maintenant</Button><Button variant="outline" onClick={() => toast.success(`Planification enregistrée : ${freq}`)}>Planifier</Button></div>
          </div>
        </Card>
        <Card title={`Aperçu — ${type}`} className="lg:col-span-2" actions={<><Button size="sm" variant="outline" onClick={() => pdf(type)}>PDF</Button><Button size="sm" variant="outline" onClick={() => downloadCSV(`${type}.csv`, c.table.head, c.table.rows)}>Excel</Button></>}>
          <p className="rounded-lg bg-accent p-3 text-sm">🤖 {c.comment}</p>
          <table className="mt-3 w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground">{c.table.head.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{c.table.rows.map((r, i) => <tr key={i} className="border-t">{r.map((v, j) => <td key={j} className="py-1">{v}</td>)}</tr>)}</tbody></table>
        </Card>
      </div>
      <DataTable id="rp" title="Historique" rows={s.reports} columns={[{ key: "type", label: "Rapport", filter: true }, { key: "periode", label: "Période" }, { key: "date", label: "Généré le", render: (r) => fdate(r.date) }, { key: "auteur", label: "Auteur", filter: true }]} actions={(r) => <Button size="sm" variant="ghost" onClick={() => pdf(r.type)}>Télécharger PDF</Button>} />
    </div>
  );
}
