import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { previewPdf } from "@/lib/dialogs";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { PageHeader, Status } from "@/components/ui-kit";
import { docStatus, useStore } from "@/lib/store";
import { addDays, fdate } from "@/lib/format";

export const Route = createFileRoute("/admin/marches/documents")({
  head: () => ({ meta: [{ title: "Bibliothèque de documents — LGTP" }, { name: "description", content: "Pièces permanentes et suivi des expirations." }, { property: "og:title", content: "Documents — LGTP" }, { property: "og:description", content: "Pièces permanentes." }] }),
  component: Page,
});

function Page() {
  const s = useStore();
  const rows = s.docsPerm.map((d) => ({ ...d, statut: docStatus(d), usedIn: s.dossiers.filter((x) => !x.depot && x.checklist.some((p) => p.docType === d.type)).length }));
  return (
    <div className="space-y-4">
      <PageHeader title="Documents (bibliothèque permanente)" crumbs={[{ label: "Marchés publics" }, { label: "Documents" }]} sub="Une pièce expirée rend non conformes tous les dossiers qui l'utilisent. Rappels agent à J-30 et J-7." />
      <DataTable id="dp" rows={rows} columns={[{ key: "type", label: "Type" }, { key: "emission", label: "Émission", render: (r) => fdate(r.emission) }, { key: "expiration", label: "Expiration", value: (r) => r.expiration ?? "", render: (r) => fdate(r.expiration) }, { key: "statut", label: "Statut", filter: true, render: (r) => <Status s={r.statut} /> }, { key: "version", label: "Version", value: (r) => `v${r.version}` }, { key: "usedIn", label: "Dossiers impactés", align: "right" }, { key: "fichier", label: "Fichier", hidden: true }]}
        actions={(r) => <><Button size="sm" variant="ghost" onClick={() => previewPdf(`${r.type} (v${r.version})`, [{ paragraphs: [`Pièce permanente : ${r.type}`, `Émise le ${fdate(r.emission)}${r.expiration ? ` — expire le ${fdate(r.expiration)}` : " — sans expiration"}`, `Fichier : ${r.fichier}`, `Statut : ${r.statut} · utilisée par ${r.usedIn} dossier(s) en cours`] }])}>Voir</Button>
          <Button size="sm" variant="outline" onClick={() => { s.set((x) => ({ docsPerm: x.docsPerm.map((d) => (d.id === r.id ? { ...d, emission: new Date().toISOString(), expiration: r.expiration ? addDays(365).toISOString() : undefined, version: d.version + 1 } : d)) })); s.log(s.user, "Document", r.id, `Renouvelé : ${r.type}`); toast.success(`${r.type} renouvelé — ${r.usedIn} dossier(s) remis en conformité`); }}>Renouveler</Button></>} />
    </div>
  );
}
