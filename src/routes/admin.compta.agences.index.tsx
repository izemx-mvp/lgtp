import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { PageHeader, Status } from "@/components/ui-kit";
import { agencyStats, useStore } from "@/lib/store";
import { money } from "@/lib/format";

export const Route = createFileRoute("/admin/compta/agences/")({
  head: () => ({ meta: [{ title: "Agences — LGTP" }, { name: "description", content: "Réseau d'agences LGTP." }, { property: "og:title", content: "Agences — LGTP" }, { property: "og:description", content: "Réseau d'agences." }] }),
  component: Page,
});

function Page() {
  const s = useStore();
  const nav = useNavigate();
  const rows = s.agences.map((a) => ({ ...a, ...agencyStats(s, a.id) }));
  return (
    <div className="space-y-4">
      <PageHeader title="Agences" crumbs={[{ label: "Comptabilité & Agences" }, { label: "Agences" }]} />
      <DataTable id="ag" rows={rows} onRowClick={(r) => nav({ to: "/admin/compta/agences/$id", params: { id: r.id } })} columns={[{ key: "nom", label: "Agence" }, { key: "chef", label: "Chef d'agence" }, { key: "zone", label: "Zone" }, { key: "factureAn", label: "Facturé", align: "right", render: (r) => money(r.factureAn, 0) }, { key: "creances", label: "Créances", align: "right", render: (r) => money(r.creances, 0) }, { key: "taux", label: "Taux du mois", align: "right", value: (r) => Math.round(r.taux * 100), render: (r) => (r.siege ? "—" : `${Math.round(r.taux * 100)} %`) }, { key: "actif", label: "Statut", value: (r) => (r.actif ? "Actif" : "Pause"), render: (r) => <Status s={r.actif ? "Actif" : "Pause"} /> }]}
        actions={(r) => <Button size="sm" variant="ghost" onClick={() => toast.success(`Rappel envoyé à ${r.chef}`)}>Envoyer un rappel</Button>} />
    </div>
  );
}
