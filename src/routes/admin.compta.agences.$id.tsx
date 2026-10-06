import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DataTable } from "@/components/DataTable";
import { Card, EmptyState, Gauge, Kpi, PageHeader, Status } from "@/components/ui-kit";
import { agencyStats, factTTC, useStore } from "@/lib/store";
import { ACTIVITES, MONTHS } from "@/lib/seed";
import { fdate, kdh, money } from "@/lib/format";

export const Route = createFileRoute("/admin/compta/agences/$id")({
  head: ({ params }) => ({ meta: [{ title: `Agence ${params.id} — LGTP` }, { name: "description", content: "Fiche agence LGTP." }, { property: "og:title", content: `Agence ${params.id} — LGTP` }, { property: "og:description", content: "Fiche agence." }] }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const s = useStore();
  const a = s.agences.find((x) => x.id === id);
  if (!a) return <EmptyState title="Agence introuvable" />;
  const st = agencyStats(s, id);
  const fs = s.factures.filter((f) => f.agence === id);
  const staff = s.staff.filter((p) => p.agence === id);
  return (
    <div className="space-y-4">
      <PageHeader title={a.nom} crumbs={[{ label: "Comptabilité & Agences" }, { label: "Agences", to: "/admin/compta/agences" }, { label: a.ville }]} sub={`${a.adresse} · ${a.tel} · Chef d'agence : ${a.chef}`} actions={<>
        <Button variant="outline" onClick={() => { const c = window.prompt("Chef d'agence", a.chef); if (c) { s.set((x) => ({ agences: x.agences.map((g) => (g.id === id ? { ...g, chef: c } : g)) })); toast.success("Agence modifiée"); } }}>Modifier</Button>
        <AlertDialog><AlertDialogTrigger asChild><Button variant="outline">{a.actif ? "Désactiver" : "Réactiver"}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{a.actif ? "Désactiver" : "Réactiver"} {a.nom} ?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => { s.set((x) => ({ agences: x.agences.map((g) => (g.id === id ? { ...g, actif: !g.actif } : g)) })); toast.success("Statut modifié"); }}>Confirmer</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        <Button onClick={() => { s.log(s.user, "Agence", id, "Rappel envoyé"); toast.success(`Rappel envoyé à ${a.chef}`); }}>Envoyer un rappel</Button>
        <Button variant="secondary" asChild><Link to="/admin/compta/objectifs">Voir objectifs</Link></Button></>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card><Gauge value={st.taux} label="Taux du mois" /></Card>
        <Kpi label="Facturé" value={st.factureAn} format={kdh} /><Kpi label="Encaissé" value={st.encaisse} format={kdh} /><Kpi label="Créances" value={st.creances} format={kdh} tone="warn" /><Kpi label="Objectif annuel" value={st.objAn} format={kdh} />
      </div>
      <Tabs defaultValue="ca">
        <TabsList className="flex-wrap"><TabsTrigger value="ca">CA par activité</TabsTrigger><TabsTrigger value="fa">Factures</TabsTrigger><TabsTrigger value="eq">Équipe</TabsTrigger><TabsTrigger value="pv">Prévisions</TabsTrigger><TabsTrigger value="jr">Journal</TabsTrigger></TabsList>
        <TabsContent value="ca"><Card>{ACTIVITES.map((act) => { const v = fs.filter((f) => f.activite === act).reduce((x, f) => x + f.ht, 0); const o = s.objectifs[id]?.[act].reduce((x, y) => x + y, 0) ?? 0; return <div key={act} className="mb-2 text-sm"><div className="flex justify-between"><span>{act}</span><span>{money(v, 0)} / {money(o, 0)}</span></div><div className="h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${o ? Math.min(100, (v / o) * 100) : 0}%` }} /></div></div>; })}</Card></TabsContent>
        <TabsContent value="fa"><DataTable id="agf" rows={fs} columns={[{ key: "num", label: "N°" }, { key: "client", label: "Client", value: (r) => s.clients.find((c) => c.id === r.clientId)?.nom ?? "" }, { key: "ttc", label: "TTC", align: "right", value: (r) => factTTC(r), render: (r) => money(factTTC(r)) }, { key: "date", label: "Date", render: (r) => fdate(r.date) }, { key: "statut", label: "Statut", filter: true, render: (r) => <Status s={r.statut} /> }]} /></TabsContent>
        <TabsContent value="eq"><Card>{staff.length ? staff.map((p) => <p key={p.id} className="border-b py-1 text-sm">{p.nom} — {p.poste}</p>) : <p className="text-sm text-muted-foreground">Équipe rattachée au siège.</p>}</Card></TabsContent>
        <TabsContent value="pv"><Card>{MONTHS.slice(0, new Date().getMonth() + 2).map((m, i) => <p key={m} className="flex justify-between border-b py-1 text-sm">{m}<Status s={i <= new Date().getMonth() ? "Validée" : s.previsions.find((p) => p.agence === id)?.statut ?? "—"} /></p>)}</Card></TabsContent>
        <TabsContent value="jr"><Card>{s.audit.filter((x) => x.entityId === id).map((x) => <p key={x.id} className="text-sm">{fdate(x.at)} · {x.author} — {x.msg}</p>)}{!s.audit.some((x) => x.entityId === id) && <p className="text-sm text-muted-foreground">Aucun événement.</p>}</Card></TabsContent>
      </Tabs>
    </div>
  );
}
