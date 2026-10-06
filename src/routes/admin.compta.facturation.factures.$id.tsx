import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ask, confirmAsk } from "@/lib/dialogs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, EmptyState, PageHeader, Status } from "@/components/ui-kit";
import { factTTC, useStore } from "@/lib/store";
import { COMPANY } from "@/lib/seed";
import { fdate, fdatetime, money } from "@/lib/format";
import { factPdf } from "@/lib/factpdf";

export const Route = createFileRoute("/admin/compta/facturation/factures/$id")({
  head: () => ({ meta: [{ title: "Facture — LGTP" }, { name: "description", content: "Détail de facture." }, { property: "og:title", content: "Facture — LGTP" }, { property: "og:description", content: "Détail de facture." }] }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const s = useStore();
  const nav = useNavigate();
  const f = s.factures.find((x) => x.id === id);
  if (!f) return <EmptyState title="Facture introuvable" action={<Button asChild><Link to="/admin/compta/facturation">Retour</Link></Button>} />;
  const cl = s.clients.find((c) => c.id === f.clientId)!;
  const up = (patch: Partial<typeof f>, msg: string) => { s.set((x) => ({ factures: x.factures.map((y) => (y.id === id ? { ...y, ...patch } : y)) })); s.log(s.user, "Facture", id, msg); toast.success(msg); };
  const reste = factTTC(f) - f.paye;
  return (
    <div className="space-y-4">
      <PageHeader title={`Facture ${f.num}`} crumbs={[{ label: "Comptabilité & Agences" }, { label: "Facturation", to: "/admin/compta/facturation" }, { label: f.num }]} sub={<Status s={f.statut} />} actions={<>
        <Button variant="outline" onClick={() => factPdf(f, cl.nom)}>Générer PDF</Button>
        <Button variant="outline" disabled={f.statut !== "Brouillon"} onClick={() => up({ statut: "Validée" }, "Facture validée")}>Valider</Button>
        <Button variant="outline" onClick={() => up({ statut: f.statut === "Brouillon" || f.statut === "Validée" ? "Envoyée" : f.statut }, `Envoyée à ${cl.nom} (e-mail/WhatsApp)`)}>Envoyer</Button>
        <Button variant="outline" onClick={() => { const n = s.factures.length + 1; const nid = `fa-d${n}`; s.set((x) => ({ factures: [{ ...f, id: nid, num: `FA-2026-${String(n).padStart(4, "0")}`, statut: "Brouillon", paye: 0, date: new Date().toISOString() }, ...x.factures] })); toast.success("Facture dupliquée"); nav({ to: "/admin/compta/facturation/factures/$id", params: { id: nid } }); }}>Dupliquer</Button>
        <Button variant="outline" onClick={async () => { const m = Number(await ask("Montant de l'avoir (DH TTC)", String(Math.round(factTTC(f) * 0.1)))); if (m) { s.set((x) => ({ avoirs: [{ id: `av${Date.now()}`, num: `AV-2026-${String(x.avoirs.length + 1).padStart(3, "0")}`, factureId: id, montant: m, motif: "Correction", date: new Date().toISOString() }, ...x.avoirs] })); s.payFacture(id, m, "Avoir"); toast.success("Avoir créé"); } }}>Créer un avoir</Button>
        <Button variant="outline" onClick={() => toast.success(`Relance envoyée à ${cl.nom}`)}>Relancer</Button>
        <Button disabled={reste <= 1} onClick={() => { s.payFacture(id, reste); toast.success("Facture marquée payée — créances et trésorerie mises à jour"); }}>Marquer payée</Button></>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Lignes" className="lg:col-span-2">
          <table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground"><th>Désignation</th><th className="text-right">HT</th></tr></thead><tbody><tr className="border-t"><td className="py-2">Prestations — {f.activite} ({f.lien})</td><td className="text-right"><Input className="ml-auto h-8 w-32 text-right" type="number" disabled={f.statut !== "Brouillon"} defaultValue={f.ht} onBlur={(e) => up({ ht: +e.target.value }, "Montant modifié")} /></td></tr></tbody></table>
          <div className="mt-3 text-right text-sm">HT {money(f.ht)}<br />TVA 20 % {money(f.ht * 0.2)}<br /><b>TTC {money(factTTC(f))}</b><br />Payé {money(f.paye)} · Reste <b>{money(reste)}</b></div>
          <p className="mt-3 text-xs text-muted-foreground">ICE {COMPANY.ice} · {COMPANY.rc} · {COMPANY.if} · RIB {COMPANY.rib} · Pénalités de retard selon loi 69-21</p>
        </Card>
        <Card title="Infos">
          <p className="text-sm">Client : <b>{cl.nom}</b><br />ICE client : {cl.ice}<br />Agence : {f.agence}<br />Date : {fdate(f.date)}<br />Échéance : {fdate(f.echeance)}</p>
          <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Historique</p>
          {s.audit.filter((a) => a.entityId === id).map((a) => <p key={a.id} className="text-xs">{fdatetime(a.at)} · {a.author} — {a.msg}</p>)}
        </Card>
      </div>
    </div>
  );
}
