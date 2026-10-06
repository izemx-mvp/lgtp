import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DataTable } from "@/components/DataTable";
import { AgentPanel } from "@/components/AgentPanel";
import { Jr, PageHeader, Status } from "@/components/ui-kit";
import { Progress } from "@/components/ui/progress";
import { useStore } from "@/lib/store";
import { daysUntil, money } from "@/lib/format";

export const Route = createFileRoute("/admin/marches/dossiers/")({
  head: () => ({ meta: [{ title: "Dossiers d'appels d'offres — LGTP" }, { name: "description", content: "Constitution des dossiers de soumission." }, { property: "og:title", content: "Dossiers — LGTP" }, { property: "og:description", content: "Constitution des dossiers." }] }),
  component: List,
});

function List() {
  const s = useStore();
  const nav = useNavigate();
  const rows = s.dossiers.map((d) => { const a = s.aos.find((x) => x.id === d.aoId)!; return { ...d, ref: a.ref, mo: a.mo, objet: a.objet, deadline: a.deadline, montant: d.acteMontant ?? 0, statutAff: d.resultat ? d.resultat.decision : d.statut }; });
  return (
    <div className="space-y-4">
      <PageHeader title="Dossiers" crumbs={[{ label: "Marchés publics" }, { label: "Dossiers" }]} actions={<AgentPanel agent="dossier" />} />
      <DataTable id="ds" rows={rows} onRowClick={(r) => nav({ to: "/admin/marches/dossiers/$id", params: { id: r.id } })} columns={[
        { key: "id", label: "N°", value: (r) => r.id.toUpperCase() }, { key: "ref", label: "Réf. AO" }, { key: "mo", label: "Maître d'ouvrage", filter: true }, { key: "objet", label: "Objet", className: "min-w-64" },
        { key: "step", label: "Avancement", value: (r) => r.step, render: (r) => <div className="w-28"><Progress value={(r.step / 8) * 100} /><span className="text-xs text-muted-foreground">Étape {r.step}/8</span></div> },
        { key: "j", label: "J-restants", value: (r) => daysUntil(r.deadline), render: (r) => <Jr j={daysUntil(r.deadline)} /> },
        { key: "montant", label: "Montant TTC", align: "right", render: (r) => money(r.montant, 0) },
        { key: "statutAff", label: "Statut", filter: true, render: (r) => <Status s={r.statutAff} /> },
      ]} />
    </div>
  );
}
