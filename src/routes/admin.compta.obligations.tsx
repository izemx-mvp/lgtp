import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { PageHeader, Status } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { daysUntil, fdate, money } from "@/lib/format";

export const Route = createFileRoute("/admin/compta/obligations")({
  head: () => ({ meta: [{ title: "Obligations fiscales & sociales — LGTP" }, { name: "description", content: "Calendrier TVA, IS, IR, CNSS." }, { property: "og:title", content: "Obligations — LGTP" }, { property: "og:description", content: "Calendrier fiscal." }] }),
  component: Page,
});
const NEXT: Record<string, string> = { "À préparer": "Prêt", Prêt: "Déclaré", Déclaré: "Payé" };

function Page() {
  const s = useStore();
  return (
    <div className="space-y-4">
      <PageHeader title="Obligations fiscales & sociales" crumbs={[{ label: "Comptabilité & Agences" }, { label: "Obligations" }]} sub="Calendrier paramétré — à valider par l'expert-comptable · Rappels J-10 / J-3" />
      <DataTable id="ob" pageSize={25} rows={s.obligations} columns={[{ key: "libelle", label: "Obligation" }, { key: "type", label: "Type", filter: true, value: (r) => r.libelle.split(" ")[0] }, { key: "echeance", label: "Échéance", render: (r) => <span className={r.statut !== "Payé" && daysUntil(r.echeance) <= 10 && daysUntil(r.echeance) >= 0 ? "font-semibold text-destructive" : ""}>{fdate(r.echeance)}</span> }, { key: "montant", label: "Montant estimé", align: "right", render: (r) => (r.montant ? money(r.montant, 0) : "—") }, { key: "statut", label: "Statut", filter: true, render: (r) => <Status s={r.statut === "Prêt" ? "En attente" : r.statut} /> }]}
        actions={(r) => <><Button size="sm" variant="ghost" onClick={() => toast(`Pièces jointes : état préparatoire ${r.libelle}.xlsx`)}>Pièces</Button><Button size="sm" variant="outline" disabled={!NEXT[r.statut]} onClick={() => { s.set((x) => ({ obligations: x.obligations.map((o) => (o.id === r.id ? { ...o, statut: NEXT[r.statut] } : o)) })); toast.success(`${r.libelle} → ${NEXT[r.statut]}`); }}>{NEXT[r.statut] ?? "Terminé"}</Button></>} />
    </div>
  );
}
