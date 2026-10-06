import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { FactNav } from "@/components/FactNav";
import { PageHeader, Status } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { fdate, money } from "@/lib/format";
import { makePdf } from "@/lib/pdf";

export const Route = createFileRoute("/admin/compta/facturation/decomptes")({
  head: () => ({ meta: [{ title: "Décomptes — LGTP" }, { name: "description", content: "Décomptes des marchés publics." }, { property: "og:title", content: "Décomptes — LGTP" }, { property: "og:description", content: "Décomptes." }] }),
  component: Page,
});
const NEXT: Record<string, string> = { Établi: "Visé par le maître d'ouvrage", "Visé par le maître d'ouvrage": "Mandaté", Mandaté: "Payé" };

function Page() {
  const s = useStore();
  const rows = s.decomptes.map((d) => { const rg = d.executes * 0.07; const tva = (d.executes - rg) * 0.2; return { ...d, rg, tva, net: d.executes - rg + tva, jours: Math.round((Date.now() - new Date(d.date).getTime()) / 864e5) }; });
  return (
    <div>
      <PageHeader title="Facturation" crumbs={[{ label: "Comptabilité & Agences" }, { label: "Facturation", to: "/admin/compta/facturation" }, { label: "Décomptes" }]} />
      <FactNav />
      <DataTable id="dc" rows={rows} columns={[{ key: "num", label: "Décompte" }, { key: "marche", label: "Marché" }, { key: "executes", label: "Exécutés HT", align: "right", render: (r) => money(r.executes, 0) }, { key: "cumul", label: "Cumul", align: "right", render: (r) => money(r.cumul, 0) }, { key: "rg", label: "Retenue garantie 7 %", align: "right", render: (r) => money(r.rg, 0) }, { key: "net", label: "Net à payer TTC", align: "right", render: (r) => money(r.net, 0) }, { key: "jours", label: "Délai paiement", align: "right", render: (r) => <span className={r.jours > 60 ? "text-destructive" : ""}>{r.jours} j</span> }, { key: "date", label: "Date", render: (r) => fdate(r.date) }, { key: "statut", label: "Statut", filter: true, render: (r) => <Status s={r.statut} /> }]}
        actions={(r) => <><Button size="sm" variant="ghost" onClick={() => makePdf(r.num, [{ paragraphs: [`Marché : ${r.marche}`, `Prestations exécutées : ${money(r.executes)}`, `Retenue de garantie : ${money(r.rg)}`, `TVA : ${money(r.tva)}`, `Net à payer : ${money(r.net)}`] }])}>PDF</Button>
          <Button size="sm" variant="outline" disabled={!NEXT[r.statut]} onClick={() => { s.set((x) => ({ decomptes: x.decomptes.map((d) => (d.id === r.id ? { ...d, statut: NEXT[r.statut] } : d)) })); toast.success(`→ ${NEXT[r.statut]}`); }}>{NEXT[r.statut] ?? "Payé"}</Button></>} />
    </div>
  );
}
