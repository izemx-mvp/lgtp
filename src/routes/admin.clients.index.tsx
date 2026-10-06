import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DataTable } from "@/components/DataTable";
import { PageHeader, Status } from "@/components/ui-kit";
import { factTTC, useStore } from "@/lib/store";
import { fdate, money } from "@/lib/format";

export const Route = createFileRoute("/admin/clients/")({
  head: () => ({ meta: [{ title: "Clients — LGTP" }, { name: "description", content: "Fiches clients et segmentation." }, { property: "og:title", content: "Clients — LGTP" }, { property: "og:description", content: "Clients LGTP." }] }),
  component: Page,
});

function Page() {
  const s = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const rows = s.clients.map((c) => { const fs = s.factures.filter((f) => f.clientId === c.id); return { ...c, ca: fs.reduce((a, f) => a + f.ht, 0), encours: fs.reduce((a, f) => a + factTTC(f) - f.paye, 0) }; });
  const c = rows.find((r) => r.id === open);
  return (
    <div className="space-y-4">
      <PageHeader title="Clients" crumbs={[{ label: "Clients" }, { label: "Clients" }]} />
      <DataTable id="cl" rows={rows} onRowClick={(r) => setOpen(r.id)} columns={[{ key: "nom", label: "Client" }, { key: "ice", label: "ICE" }, { key: "segment", label: "Segment", filter: true }, { key: "ville", label: "Ville", filter: true }, { key: "contact", label: "Contact" }, { key: "ca", label: "CA HT", align: "right", render: (r) => money(r.ca, 0) }, { key: "encours", label: "Encours", align: "right", render: (r) => money(r.encours, 0) }]} />
      <Sheet open={!!c} onOpenChange={(o) => !o && setOpen(null)}><SheetContent className="w-full overflow-y-auto sm:max-w-lg">{c && <><SheetHeader><SheetTitle>{c.nom}</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-1 text-sm"><p>ICE : {c.ice}</p><p>Segment : {c.segment}</p><p>Contact : {c.contact} · {c.tel}</p><p>CA : {money(c.ca, 0)} · Encours : {money(c.encours, 0)}</p></div>
        <p className="mt-4 text-xs font-semibold uppercase text-muted-foreground">Factures</p>{s.factures.filter((f) => f.clientId === c.id).map((f) => <p key={f.id} className="flex justify-between border-b py-1 text-sm">{f.num} · {fdate(f.date)}<Status s={f.statut} /></p>)}
        <p className="mt-4 text-xs font-semibold uppercase text-muted-foreground">Devis</p>{s.devis.filter((d) => d.clientId === c.id).map((d) => <p key={d.id} className="flex justify-between border-b py-1 text-sm">{d.num} — {d.objet}<Status s={d.statut} /></p>)}</>}</SheetContent></Sheet>
    </div>
  );
}
