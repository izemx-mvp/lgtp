import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { FactNav } from "@/components/FactNav";
import { Card, Gauge, PageHeader, Status } from "@/components/ui-kit";
import { agencyStats, factTTC, useStore } from "@/lib/store";
import { AG_OP } from "@/lib/seed";
import { addDays, fdate, money } from "@/lib/format";
import { factPdf } from "@/lib/factpdf";

export const Route = createFileRoute("/admin/compta/facturation/")({
  head: () => ({ meta: [{ title: "Facturation — LGTP" }, { name: "description", content: "Factures, taux de facturation et relances." }, { property: "og:title", content: "Facturation — LGTP" }, { property: "og:description", content: "Factures LGTP." }] }),
  component: Page,
});

function Page() {
  const s = useStore();
  const nav = useNavigate();
  const cl = (id: string) => s.clients.find((c) => c.id === id)?.nom ?? "";
  const day = new Date().getDate();
  const create = () => { const n = s.factures.length + 1; const id = `fa-n${n}`; s.set((x) => ({ factures: [{ id, num: `FA-2026-${String(n).padStart(4, "0")}`, clientId: x.clients[0].id, agence: "agadir", activite: "Études géotechniques", lien: "Manuel", ht: 25000, date: new Date().toISOString(), echeance: addDays(60).toISOString(), statut: "Brouillon", paye: 0 }, ...x.factures] })); toast.success("Facture brouillon créée"); nav({ to: "/admin/compta/facturation/factures/$id", params: { id } }); };
  const setSt = (ids: string[], statut: "Validée" | "Envoyée") => { s.set((x) => ({ factures: x.factures.map((f) => (ids.includes(f.id) ? { ...f, statut } : f)) })); toast.success(`${ids.length} facture(s) → ${statut}`); };
  return (
    <div>
      <PageHeader title="Facturation" crumbs={[{ label: "Comptabilité & Agences" }, { label: "Facturation" }]} actions={<Button onClick={create}>Nouvelle facture</Button>} />
      <FactNav />
      <Card title={`Taux de facturation — checkpoint J${day <= 10 ? 10 : day <= 15 ? 15 : "fin de mois"} (seuil 45 % à J15)`} className="mb-4" actions={<Button size="sm" onClick={() => { s.log("Agent Compta", "Facturation", "taux", "Rappel taux de facturation envoyé aux chefs d'agence"); toast.success("Rappel envoyé aux chefs d'agence avec leurs chiffres"); }}>Envoyer le rappel aux chefs d'agence</Button>}>
        <div className="grid grid-cols-3 gap-2">{AG_OP.map((a) => { const st = agencyStats(s, a); return <div key={a} className="text-center"><Gauge value={st.taux} label={s.agences.find((g) => g.id === a)!.ville} /><p className="text-xs">{money(st.factureMois, 0)} / {money(st.objMois, 0)}</p>{st.taux < 0.45 && <p className="text-xs text-destructive">Sous le seuil — 2 chantiers terminés non facturés</p>}</div>; })}</div>
      </Card>
      <DataTable id="fa" rows={s.factures} onRowClick={(r) => nav({ to: "/admin/compta/facturation/factures/$id", params: { id: r.id } })} bulk={[{ label: "Valider", onClick: (ids) => setSt(ids, "Validée") }, { label: "Envoyer", onClick: (ids) => setSt(ids, "Envoyée"), variant: "outline" }]}
        columns={[{ key: "num", label: "N°" }, { key: "client", label: "Client", value: (r) => cl(r.clientId), filter: true }, { key: "agence", label: "Agence", filter: true }, { key: "activite", label: "Activité", filter: true }, { key: "lien", label: "Lien", filter: true, hidden: true }, { key: "ht", label: "HT", align: "right", render: (r) => money(r.ht) }, { key: "tva", label: "TVA", align: "right", value: (r) => r.ht * 0.2, render: (r) => money(r.ht * 0.2), hidden: true }, { key: "ttc", label: "TTC", align: "right", value: (r) => factTTC(r), render: (r) => money(factTTC(r)) }, { key: "date", label: "Date", render: (r) => fdate(r.date) }, { key: "echeance", label: "Échéance", render: (r) => fdate(r.echeance) }, { key: "statut", label: "Statut", filter: true, render: (r) => <Status s={r.statut} /> }]}
        actions={(r) => <Button size="sm" variant="ghost" onClick={() => factPdf(r, cl(r.clientId))}>PDF</Button>} />
    </div>
  );
}
