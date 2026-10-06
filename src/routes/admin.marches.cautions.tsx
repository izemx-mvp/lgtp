import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { Kpi, PageHeader, Status } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { daysUntil, fdate, kdh, money } from "@/lib/format";
import { makePdf } from "@/lib/pdf";

export const Route = createFileRoute("/admin/marches/cautions")({
  head: () => ({ meta: [{ title: "Cautions — LGTP" }, { name: "description", content: "Suivi des cautions provisoires, définitives et retenues." }, { property: "og:title", content: "Cautions — LGTP" }, { property: "og:description", content: "Suivi des cautions." }] }),
  component: Page,
});
const NEXT: Record<string, string> = { Demandée: "Émise", Émise: "Déposée", Déposée: "Mainlevée demandée", "Mainlevée demandée": "Restituée" };

function Page() {
  const s = useStore();
  const rows = s.cautions.map((c) => ({ ...c, ao: s.aos.find((a) => a.id === c.aoId)?.mo ?? "—" }));
  const engaged = rows.filter((c) => c.statut !== "Restituée");
  return (
    <div className="space-y-4">
      <PageHeader title="Cautions" crumbs={[{ label: "Marchés publics" }, { label: "Cautions" }]} />
      <div className="grid grid-cols-3 gap-3"><Kpi label="Cautions engagées (immobilisé)" value={engaged.reduce((a, c) => a + c.montant, 0)} format={kdh} /><Kpi label="Expirent sous 30 j" value={engaged.filter((c) => daysUntil(c.validite) <= 30).length} tone="warn" /><Kpi label="Frais bancaires" value={rows.reduce((a, c) => a + c.frais, 0)} format={kdh} /></div>
      <DataTable id="ct" rows={rows} columns={[{ key: "type", label: "Type", filter: true }, { key: "ao", label: "Dossier / marché" }, { key: "banque", label: "Banque", filter: true }, { key: "montant", label: "Montant", align: "right", render: (r) => money(r.montant, 0) }, { key: "emission", label: "Émission", render: (r) => fdate(r.emission) }, { key: "validite", label: "Validité", render: (r) => <span className={daysUntil(r.validite) <= 30 ? "text-destructive" : ""}>{fdate(r.validite)}</span> }, { key: "frais", label: "Frais", align: "right", render: (r) => money(r.frais, 0) }, { key: "statut", label: "Statut", filter: true, render: (r) => <Status s={r.statut} /> }]}
        actions={(r) => <><Button size="sm" variant="ghost" onClick={() => { makePdf("Lettre de demande de caution", [{ paragraphs: [`Banque : ${r.banque}`, `Type : caution ${r.type}`, `Montant : ${money(r.montant)}`, `Bénéficiaire : ${r.ao}`, `Validité jusqu'au ${fdate(r.validite)}`] }]); toast.success("Lettre à la banque générée"); }}>Lettre PDF</Button>
          <Button size="sm" variant="outline" disabled={!NEXT[r.statut]} onClick={() => { s.set((x) => ({ cautions: x.cautions.map((c) => (c.id === r.id ? { ...c, statut: NEXT[r.statut] } : c)) })); s.log(s.user, "Caution", r.id, `→ ${NEXT[r.statut]}`); toast.success(`Caution → ${NEXT[r.statut]}`); }}>{NEXT[r.statut] ?? "Clôturée"}</Button></>} />
    </div>
  );
}
