import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/DataTable";
import { AgentPanel } from "@/components/AgentPanel";
import { Card, PageHeader, Status } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { fdate, fdatetime, money } from "@/lib/format";
import { pulse } from "@/lib/pulse";

export const Route = createFileRoute("/admin/clients/leads")({
  head: () => ({ meta: [{ title: "Leads — LGTP" }, { name: "description", content: "Demandes entrantes qualifiées par l'agent." }, { property: "og:title", content: "Leads — LGTP" }, { property: "og:description", content: "Leads." }] }),
  component: Page,
});
const ST = ["Nouveau", "Qualifié", "Devis à faire", "Devis envoyé", "Relance", "Gagné", "Perdu"];
type Lead = ReturnType<typeof useStore.getState>["leads"][number];

function Page() {
  const s = useStore();
  const [kanban, setKanban] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const l = s.leads.find((x) => x.id === open);
  const up = (id: string, p: Partial<Lead>, msg: string) => { s.set((x) => ({ leads: x.leads.map((y) => (y.id === id ? { ...y, ...p } : y)) })); toast.success(msg); };
  const simulate = () => {
    const id = `ld${Date.now()}`;
    const lead: Lead = { id, nom: "Rachid Amzil", source: "WhatsApp", type: "Expertise", ville: "Agadir", ouvrage: "Villa R+1", urgence: "Haute", budget: 15000, score: 88, statut: "Nouveau", agence: "agadir", date: new Date().toISOString(), messages: [{ from: "client", text: "Salam, j'ai des fissures sur ma villa à Agadir (quartier Dakhla), est-ce que vous pouvez passer cette semaine ?", at: new Date().toISOString() }, { from: "lgtp", text: "Bonjour, merci pour votre message. Notre Agent a qualifié votre demande en Expertise. Pouvez-vous nous envoyer quelques photos des fissures et l'année de construction ?", at: new Date().toISOString() }] };
    s.set((x) => ({ leads: [lead, ...x.leads] })); s.log("Agent Qualification clients", "Lead", id, "Message WhatsApp qualifié : Expertise, urgence haute, routé vers Agence Agadir"); pulse();
    toast.success("Message entrant qualifié par l'agent : Expertise · Agence Agadir"); setOpen(id);
  };
  return (
    <div className="space-y-4">
      <PageHeader title="Leads" crumbs={[{ label: "Clients" }, { label: "Leads" }]} actions={<>
        <Button variant="outline" onClick={() => setKanban(!kanban)}>{kanban ? "Vue liste" : "Vue Kanban"}</Button>
        <Button variant="outline" className="gap-2" onClick={simulate}><MessageCircle className="h-4 w-4" />Simuler un message entrant</Button>
        <Button onClick={() => { const n = window.prompt("Nom du prospect"); if (n) { s.set((x) => ({ leads: [{ ...x.leads[0], id: `ld${Date.now()}`, nom: n, statut: "Nouveau", source: "Téléphone", messages: [], date: new Date().toISOString() }, ...x.leads] })); toast.success("Lead créé"); } }}>Nouveau lead</Button>
        <AgentPanel agent="qualif" /></>} />
      {kanban ? <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">{ST.map((st) => <Card key={st} title={`${st} (${s.leads.filter((x) => x.statut === st).length})`}>{s.leads.filter((x) => x.statut === st).map((x) => <button key={x.id} onClick={() => setOpen(x.id)} className="mb-2 w-full rounded-lg border bg-background p-2 text-left text-xs hover:border-primary"><b>{x.nom}</b><p>{x.type} · {x.ville}</p><p className="text-muted-foreground">{x.source} · score {x.score}</p></button>)}</Card>)}</div> :
        <DataTable id="ld" rows={s.leads} onRowClick={(r) => setOpen(r.id)} columns={[{ key: "nom", label: "Prospect" }, { key: "source", label: "Source", filter: true }, { key: "type", label: "Qualification", filter: true }, { key: "ville", label: "Ville", filter: true }, { key: "ouvrage", label: "Ouvrage" }, { key: "urgence", label: "Urgence", filter: true }, { key: "budget", label: "Budget", align: "right", render: (r) => money(r.budget, 0) }, { key: "score", label: "Score", align: "right" }, { key: "date", label: "Date", render: (r) => fdate(r.date) }, { key: "statut", label: "Statut", filter: true, render: (r) => <Status s={r.statut} /> }]} />}
      <Sheet open={!!l} onOpenChange={(o) => !o && setOpen(null)}><SheetContent className="w-full overflow-y-auto sm:max-w-xl">{l && <>
        <SheetHeader><SheetTitle>{l.nom}</SheetTitle><Status s={l.statut} /></SheetHeader>
        <Tabs defaultValue="p" className="mt-4">
          <TabsList className="flex-wrap"><TabsTrigger value="p">Profil</TabsTrigger><TabsTrigger value="q">Qualification IA</TabsTrigger><TabsTrigger value="m">Messages</TabsTrigger><TabsTrigger value="d">Devis</TabsTrigger></TabsList>
          <TabsContent value="p" className="space-y-2 text-sm"><p>Source : {l.source} · Ville : {l.ville} · Agence : {l.agence}</p>
            <select className="h-9 w-full rounded border bg-background px-2" value={l.statut} onChange={(e) => up(l.id, { statut: e.target.value }, `Statut → ${e.target.value}`)}>{ST.map((x) => <option key={x}>{x}</option>)}</select>
            <select className="h-9 w-full rounded border bg-background px-2" value={l.agence} onChange={(e) => up(l.id, { agence: e.target.value }, "Agence assignée")}>{s.agences.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}</select></TabsContent>
          <TabsContent value="q" className="space-y-1 text-sm">{[["Type", l.type], ["Type d'ouvrage", l.ouvrage], ["Urgence", l.urgence], ["Budget indicatif", money(l.budget, 0)], ["Score", String(l.score)]].map(([k, v]) => <p key={k} className="flex justify-between border-b py-1"><span className="text-muted-foreground">{k}</span><b>{v}</b></p>)}<p className="pt-2 font-medium">Questions manquantes</p><ul className="list-disc pl-5"><li>Surface et nombre de niveaux</li><li>Plan de situation</li></ul></TabsContent>
          <TabsContent value="m" className="space-y-2">{l.messages.map((m, i) => <div key={i} className={`max-w-[85%] rounded-lg p-2 text-sm ${m.from === "client" ? "bg-muted" : "ml-auto bg-primary text-primary-foreground"}`}>{m.text}<div className="text-[10px] opacity-70">{fdatetime(m.at)}</div></div>)}
            <div className="flex flex-wrap gap-1 pt-2"><span className="text-xs text-muted-foreground">Simuler la réponse client :</span>{[["intéressé", "Devis à faire"], ["pas intéressé", "Perdu"], ["demande de remise", "Relance"]].map(([r, st]) => <Button key={r} size="sm" variant="outline" onClick={() => up(l.id, { statut: st, messages: [...l.messages, { from: "client", text: `(Client) ${r}`, at: new Date().toISOString() }] }, `Réponse « ${r} » → ${st}`)}>{r}</Button>)}</div></TabsContent>
          <TabsContent value="d"><Button onClick={() => { s.set((x) => ({ devis: [{ id: `dv${Date.now()}`, num: `DV-2026-${String(x.devis.length + 1).padStart(3, "0")}`, clientId: x.clients[0].id, objet: `${l.type} — ${l.ouvrage}`, montant: l.budget, date: new Date().toISOString(), statut: "Envoyé" }, ...x.devis] })); up(l.id, { statut: "Devis envoyé" }, "Devis créé et envoyé"); }}>Créer un devis</Button></TabsContent>
        </Tabs></>}</SheetContent></Sheet>
    </div>
  );
}
