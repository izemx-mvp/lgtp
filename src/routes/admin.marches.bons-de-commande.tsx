import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { Card, Kpi, PageHeader, Status } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { BC_STATUTS } from "@/lib/seed";
import { fdate, kdh, money } from "@/lib/format";
import { makePdf } from "@/lib/pdf";

export const Route = createFileRoute("/admin/marches/bons-de-commande")({
  head: () => ({ meta: [{ title: "Bons de commande — LGTP" }, { name: "description", content: "Pipeline des bons de commande." }, { property: "og:title", content: "Bons de commande — LGTP" }, { property: "og:description", content: "Pipeline des bons de commande." }] }),
  component: BCPage,
});

function BCPage() {
  const s = useStore();
  const [kanban, setKanban] = useState(false);
  const move = (id: string, dir = 1) => s.set((x) => ({ bcs: x.bcs.map((b) => { if (b.id !== id) return b; const i = Math.min(BC_STATUTS.length - 1, BC_STATUTS.indexOf(b.statut) + dir); return { ...b, statut: BC_STATUTS[i], numBC: i >= 3 && !b.numBC ? `BC n° ${Math.floor(Math.random() * 90 + 10)}/2026` : b.numBC }; }) }));
  const devis = (b: (typeof s.bcs)[0]) => { makePdf(`Devis — ${b.prestation}`, [{ paragraphs: [`Demandeur : ${b.demandeur}`, `Quantité : ${b.quantite}`] }, { table: { head: ["Désignation", "Montant HT", "TVA 20 %", "TTC"], rows: [[b.prestation, money(b.montant / 1.2), money(b.montant / 6), money(b.montant)]] } }]); if (b.statut === "Devis à faire" || b.statut === "Détecté") move(b.id, BC_STATUTS.indexOf("Devis envoyé") - BC_STATUTS.indexOf(b.statut)); toast.success("Devis généré depuis la bibliothèque de prix"); };
  const sent = s.bcs.filter((b) => BC_STATUTS.indexOf(b.statut) >= 2).length, cmd = s.bcs.filter((b) => BC_STATUTS.indexOf(b.statut) >= 3).length;
  return (
    <div className="space-y-4">
      <PageHeader title="Bons de commande" crumbs={[{ label: "Marchés publics" }, { label: "Bons de commande" }]} sub="Seuil bon de commande : 500 000 DH TTC (Référentiel réglementaire)" actions={<Button variant="outline" onClick={() => setKanban(!kanban)}>{kanban ? "Vue liste" : "Vue Kanban"}</Button>} />
      <div className="grid grid-cols-3 gap-3"><Kpi label="Devis envoyés" value={sent} /><Kpi label="Taux de transformation" value={sent ? (cmd / sent) * 100 : 0} format={(n) => `${Math.round(n)} %`} /><Kpi label="Montant moyen" value={s.bcs.reduce((a, b) => a + b.montant, 0) / s.bcs.length} format={kdh} /></div>
      {kanban ? (
        <div className="grid gap-3 overflow-x-auto md:grid-cols-3 xl:grid-cols-6">{BC_STATUTS.map((st) => <Card key={st} title={`${st} (${s.bcs.filter((b) => b.statut === st).length})`}>{s.bcs.filter((b) => b.statut === st).map((b) => <div key={b.id} className="mb-2 rounded-lg border bg-background p-2 text-xs"><b>{b.demandeur}</b><p>{b.prestation}</p><p className="text-muted-foreground">{money(b.montant, 0)}</p><div className="mt-1 flex gap-1"><Button size="sm" className="h-6 px-2 text-[11px]" onClick={() => devis(b)}>Devis</Button><Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" disabled={st === "Facturé"} onClick={() => { move(b.id); toast.success("Étape suivante"); }}>→</Button></div></div>)}</Card>)}</div>
      ) : (
        <DataTable id="bc" rows={s.bcs} columns={[{ key: "num", label: "N°" }, { key: "demandeur", label: "Demandeur", filter: true }, { key: "prestation", label: "Prestation" }, { key: "quantite", label: "Quantités" }, { key: "montant", label: "Montant TTC", align: "right", render: (r) => money(r.montant, 0) }, { key: "date", label: "Date", render: (r) => fdate(r.date) }, { key: "numBC", label: "N° BC", value: (r) => r.numBC ?? "—" }, { key: "source", label: "Source", filter: true, hidden: true }, { key: "statut", label: "Statut", filter: true, render: (r) => <Status s={r.statut} /> }]}
          actions={(r) => <><Button size="sm" variant="ghost" onClick={() => devis(r)}>Devis PDF</Button><Button size="sm" variant="ghost" onClick={() => toast.success(`Relance envoyée à ${r.demandeur}`)}>Relancer</Button><Button size="sm" variant="outline" disabled={r.statut === "Facturé"} onClick={() => { move(r.id); if (r.statut === "Livré/Réalisé") toast.success("Facture créée"); else toast.success("Statut avancé"); }}>Avancer</Button></>} />
      )}
    </div>
  );
}
