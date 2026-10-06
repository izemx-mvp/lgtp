import { createFileRoute, Link } from "@tanstack/react-router";
import { DataTable } from "@/components/DataTable";
import { FactNav } from "@/components/FactNav";
import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { fdate, money } from "@/lib/format";
import { makePdf } from "@/lib/pdf";

export const Route = createFileRoute("/admin/compta/facturation/avoirs")({
  head: () => ({ meta: [{ title: "Avoirs — LGTP" }, { name: "description", content: "Avoirs émis." }, { property: "og:title", content: "Avoirs — LGTP" }, { property: "og:description", content: "Avoirs émis." }] }),
  component: Page,
});

function Page() {
  const s = useStore();
  const rows = s.avoirs.map((a) => ({ ...a, facture: s.factures.find((f) => f.id === a.factureId)?.num ?? "" }));
  return (
    <div>
      <PageHeader title="Facturation" crumbs={[{ label: "Comptabilité & Agences" }, { label: "Facturation", to: "/admin/compta/facturation" }, { label: "Avoirs" }]} sub="Créez un avoir depuis la fiche d'une facture." />
      <FactNav />
      <DataTable id="av" rows={rows} columns={[{ key: "num", label: "N°" }, { key: "facture", label: "Facture", render: (r) => <Link className="text-primary hover:underline" to="/admin/compta/facturation/factures/$id" params={{ id: r.factureId }}>{r.facture}</Link> }, { key: "montant", label: "Montant TTC", align: "right", render: (r) => money(r.montant) }, { key: "motif", label: "Motif" }, { key: "date", label: "Date", render: (r) => fdate(r.date) }]}
        actions={(r) => <Button size="sm" variant="ghost" onClick={() => makePdf(`Avoir ${r.num}`, [{ paragraphs: [`Sur facture ${r.facture}`, `Montant : ${money(r.montant)}`, `Motif : ${r.motif}`] }])}>PDF</Button>} />
    </div>
  );
}
