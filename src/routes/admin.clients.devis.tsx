import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/DataTable";
import { AgentPanel } from "@/components/AgentPanel";
import { Card, PageHeader, Status } from "@/components/ui-kit";
import { factTTC, useStore } from "@/lib/store";
import { fdate, money } from "@/lib/format";
import { makePdf } from "@/lib/pdf";

export const Route = createFileRoute("/admin/clients/devis")({
  head: () => ({ meta: [{ title: "Devis & relances — LGTP" }, { name: "description", content: "Devis et propositions de relance de l'agent." }, { property: "og:title", content: "Devis & relances — LGTP" }, { property: "og:description", content: "Devis et relances." }] }),
  component: Page,
});

function Page() {
  const s = useStore();
  const cl = (id: string) => s.clients.find((c) => c.id === id)?.nom ?? "";
  const props = [
    ...s.devis.filter((d) => ["Envoyé", "En attente"].includes(d.statut)).slice(0, 5).map((d) => { const j = Math.round((Date.now() - new Date(d.date).getTime()) / 864e5); return { id: d.id, type: "Devis", label: `${d.num} — ${cl(d.clientId)} (J+${j})`, msg: j > 14 ? `Bonjour, nous revenons vers vous au sujet de notre devis ${d.num} (${d.objet}). Êtes-vous toujours intéressé ? Nous restons disponibles pour adapter notre proposition. — LGTP` : `Bonjour, avez-vous pu prendre connaissance de notre devis ${d.num} de ${money(d.montant, 0)} ? — LGTP` }; }),
    ...s.factures.filter((f) => f.statut === "En retard").slice(0, 3).map((f) => ({ id: f.id, type: "Facture", label: `${f.num} — ${cl(f.clientId)}`, msg: `Bonjour, la facture ${f.num} de ${money(factTTC(f) - f.paye)} reste impayée. Merci de procéder au règlement. — LGTP` })),
  ];
  const [done, setDone] = useState<Record<string, string>>({});
  return (
    <div className="space-y-4">
      <PageHeader title="Devis & relances" crumbs={[{ label: "Clients" }, { label: "Devis & relances" }]} actions={<AgentPanel agent="relances" />} />
      <Card title="Tableau de relances proposé par l'agent (J+3, J+7, J+15 · échéance +5, +15, +30)">
        <div className="grid gap-3 md:grid-cols-2">{props.map((p) => <div key={p.id} className="rounded-lg border p-3 text-sm"><div className="flex justify-between"><b>{p.label}</b><Status s={done[p.id] ?? "En attente"} /></div><Textarea className="mt-2" rows={3} defaultValue={p.msg} disabled={!!done[p.id]} />
          {!done[p.id] && <div className="mt-2 flex gap-1"><Button size="sm" onClick={() => { setDone({ ...done, [p.id]: "Approuvé" }); s.log("Agent Relances", p.type, p.id, "Relance approuvée et envoyée (WhatsApp)"); toast.success("Relance approuvée — envoyée (simulé)"); }}>Approuver & envoyer</Button><Button size="sm" variant="ghost" onClick={() => { setDone({ ...done, [p.id]: "Rejeté" }); toast("Relance rejetée"); }}>Rejeter</Button></div>}</div>)}</div>
      </Card>
      <DataTable id="dv" rows={s.devis} columns={[{ key: "num", label: "N°" }, { key: "client", label: "Client", value: (r) => cl(r.clientId), filter: true }, { key: "objet", label: "Objet" }, { key: "montant", label: "Montant", align: "right", render: (r) => money(r.montant, 0) }, { key: "date", label: "Date", render: (r) => fdate(r.date) }, { key: "statut", label: "Statut", filter: true, render: (r) => <Status s={r.statut} /> }]}
        actions={(r) => <><Button size="sm" variant="ghost" onClick={() => makePdf(`Devis ${r.num}`, [{ paragraphs: [`Client : ${cl(r.clientId)}`, `Objet : ${r.objet}`, `Montant HT : ${money(r.montant)}`, `TVA 20 % : ${money(r.montant * 0.2)}`, `TTC : ${money(r.montant * 1.2)}`] }])}>PDF</Button><Button size="sm" variant="outline" disabled={r.statut === "Accepté"} onClick={() => { s.set((x) => ({ devis: x.devis.map((d) => (d.id === r.id ? { ...d, statut: "Accepté" } : d)) })); toast.success("Devis accepté"); }}>Accepté</Button></>} />
    </div>
  );
}
