import { createFileRoute } from "@tanstack/react-router";
import { ask, confirmAsk } from "@/lib/dialogs";
import { useState } from "react";
import { Copy, ExternalLink, MapPin, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable } from "@/components/DataTable";
import { AgentPanel } from "@/components/AgentPanel";
import { Card, PageHeader, Status } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { FAQ_CATS, type Horaire } from "@/lib/seed";
import { fdate } from "@/lib/format";

export const Route = createFileRoute("/admin/service-client")({
  head: () => ({ meta: [{ title: "Service client — LGTP" }, { name: "description", content: "Base de connaissance de l'Agent Service Client." }, { property: "og:title", content: "Service client — LGTP" }, { property: "og:description", content: "FAQ, documents, horaires, agences." }] }),
  component: Page,
});
const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
function openNow(h: Horaire[]) {
  const d = new Date(); const j = h.find((x) => x.jour === JOURS[d.getDay()])!; const t = d.getHours() * 60 + d.getMinutes();
  const inR = (r: string) => { if (!r) return false; const [a, b] = r.split("-").map((x) => { const [hh, mm] = x.split(":").map(Number); return hh * 60 + mm; }); return t >= a && t <= b; };
  if (j.ouvert && (inR(j.matin) || inR(j.aprem))) return "Ouvert maintenant";
  for (let k = 1; k <= 7; k++) { const n = h.find((x) => x.jour === JOURS[(d.getDay() + k) % 7])!; if (n.ouvert) return `Fermé — réouverture ${n.jour.toLowerCase()} ${n.matin.split("-")[0].replace(":", "h")}`; }
  return "Fermé";
}
function HGrid({ h, onChange }: { h: Horaire[]; onChange: (h: Horaire[]) => void }) {
  return <table className="w-full text-sm"><tbody>{h.map((d, i) => <tr key={d.jour} className="border-t"><td className="py-1">{d.jour}</td><td><Switch checked={d.ouvert} onCheckedChange={(v) => onChange(h.map((x, k) => (k === i ? { ...x, ouvert: v } : x)))} /></td><td><Input className="h-7 w-28" disabled={!d.ouvert} value={d.matin} onChange={(e) => onChange(h.map((x, k) => (k === i ? { ...x, matin: e.target.value } : x)))} /></td><td><Input className="h-7 w-28" disabled={!d.ouvert} value={d.aprem} placeholder="—" onChange={(e) => onChange(h.map((x, k) => (k === i ? { ...x, aprem: e.target.value } : x)))} /></td></tr>)}</tbody></table>;
}

function Page() {
  const s = useStore();
  const [edit, setEdit] = useState<{ id?: string; question: string; reponse: string; categorie: string } | null>(null);
  const [chat, setChat] = useState<{ q: string; a: string }[]>([]);
  const [q, setQ] = useState("");
  const maps = (a: { lat: number; lng: number }) => `https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}`;
  const answer = (question: string) => {
    const l = question.toLowerCase(); let a = "";
    const ag = s.agences.find((x) => l.includes(x.ville.toLowerCase()));
    const jour = JOURS.find((j) => l.includes(j.toLowerCase()));
    if (ag && /où|adresse|agence/.test(l)) a = `L'${ag.nom} se trouve ${ag.adresse} (tél. ${ag.tel}). Itinéraire : ${maps(ag)}`;
    else if (jour || /ouvert|horaire/.test(l)) { const h = (ag ?? s.agences[0]).horaires.find((x) => x.jour === (jour ?? JOURS[new Date().getDay()]))!; a = h.ouvert ? `Oui, ${ag ? `l'${ag.nom}` : "nous"} ${ag ? "est" : "sommes"} ouvert${ag ? "e" : "s"} le ${h.jour.toLowerCase()} de ${h.matin.replace("-", " à ")}${h.aprem ? ` et de ${h.aprem.replace("-", " à ")}` : ""}.` : `Nous sommes fermés le ${h.jour.toLowerCase()}. ${openNow((ag ?? s.agences[0]).horaires)}.`; }
    else if (/réseau|facebook|linkedin|instagram/.test(l)) a = `Retrouvez-nous sur : ${s.socials.filter((x) => x.rattachement === "Société" && x.visible).map((x) => `${x.plateforme} (${x.url})`).join(", ")}.`;
    else { const f = s.faq.filter((x) => x.statut === "Publié").map((x) => ({ x, sc: x.question.toLowerCase().split(/\W+/).filter((w) => w.length > 3 && l.includes(w)).length })).sort((a, b) => b.sc - a.sc)[0]; a = f && f.sc > 0 ? f.x.reponse : "Je n'ai pas cette information dans notre base. Souhaitez-vous qu'un conseiller vous rappelle ?"; }
    setChat((c) => [...c, { q: question, a }]); setQ("");
  };
  return (
    <div className="space-y-4">
      <PageHeader title="Service client" crumbs={[{ label: "Service client" }]} sub="Base de connaissance utilisée par l'Agent Service Client — il ne répond qu'à partir de ces 5 onglets." actions={<AgentPanel agent="sc" extra={<Card title="Tester l'agent" className="mt-3"><div className="max-h-60 space-y-2 overflow-y-auto">{chat.map((c, i) => <div key={i} className="text-sm"><p className="ml-auto max-w-[85%] rounded bg-muted p-2">{c.q}</p><p className="mt-1 max-w-[85%] rounded bg-primary p-2 text-primary-foreground">{c.a}</p></div>)}</div><form className="mt-2 flex gap-1" onSubmit={(e) => { e.preventDefault(); if (q) answer(q); }}><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Vous êtes ouverts samedi ?" /><Button size="icon" type="submit"><Send className="h-4 w-4" /></Button></form><div className="mt-1 flex flex-wrap gap-1">{["Vous êtes ouverts samedi ?", "Où est l'agence de Marrakech ?", "Quels documents fournir pour un devis ?"].map((x) => <button key={x} onClick={() => answer(x)} className="rounded-full border px-2 py-0.5 text-[11px]">{x}</button>)}</div></Card>} />} />
      <Tabs defaultValue="faq">
        <TabsList className="flex-wrap"><TabsTrigger value="faq">FAQ</TabsTrigger><TabsTrigger value="docs">Documents</TabsTrigger><TabsTrigger value="infos">Infos générales</TabsTrigger><TabsTrigger value="ag">Agences</TabsTrigger><TabsTrigger value="so">Réseaux sociaux</TabsTrigger></TabsList>
        <TabsContent value="faq"><DataTable id="fq" rows={s.faq} toolbar={<Button size="sm" onClick={() => setEdit({ question: "", reponse: "", categorie: FAQ_CATS[0] })}>Ajouter</Button>} onRowClick={(r) => setEdit(r)} columns={[{ key: "question", label: "Question", className: "min-w-64" }, { key: "reponse", label: "Réponse", hidden: true }, { key: "categorie", label: "Catégorie", filter: true }, { key: "langue", label: "Langue", filter: true }, { key: "statut", label: "Statut", filter: true, render: (r) => <Status s={r.statut} /> }, { key: "maj", label: "Mise à jour", render: (r) => fdate(r.maj) }]}
          actions={(r) => <><Button size="sm" variant="ghost" onClick={() => { s.set((x) => ({ faq: x.faq.map((f) => (f.id === r.id ? { ...f, statut: f.statut === "Publié" ? "Brouillon" : "Publié" } : f)) })); toast.success(r.statut === "Publié" ? "Dépubliée" : "Publiée"); }}>{r.statut === "Publié" ? "Dépublier" : "Publier"}</Button><Button size="sm" variant="ghost" onClick={() => { s.set((x) => ({ faq: [{ ...r, id: `fq${Date.now()}`, question: r.question + " (copie)", statut: "Brouillon" }, ...x.faq] })); toast.success("Dupliquée"); }}>Dupliquer</Button><Button size="sm" variant="ghost" onClick={async () => { if (await confirmAsk("Supprimer cette question ?")) { s.set((x) => ({ faq: x.faq.filter((f) => f.id !== r.id) })); toast("Supprimée"); } }}>Supprimer</Button></>} /></TabsContent>
        <TabsContent value="docs"><DataTable id="sd" rows={s.scDocs} toolbar={<Button size="sm" onClick={() => { s.set((x) => ({ scDocs: [{ id: `sd${Date.now()}`, titre: "Nouveau document", categorie: "Présentation", langue: "FR", version: "v1", taille: "320 Ko", date: new Date().toISOString(), visible: false }, ...x.scDocs] })); toast.success("Document téléversé (simulé)"); }}>Téléverser</Button>} columns={[{ key: "titre", label: "Titre" }, { key: "categorie", label: "Catégorie", filter: true }, { key: "langue", label: "Langue" }, { key: "version", label: "Version" }, { key: "taille", label: "Taille" }, { key: "date", label: "Date", render: (r) => fdate(r.date) }, { key: "visible", label: "Visible client", value: (r) => (r.visible ? "Oui" : "Non"), render: (r) => <Switch checked={r.visible} onCheckedChange={(v) => s.set((x) => ({ scDocs: x.scDocs.map((d) => (d.id === r.id ? { ...d, visible: v } : d)) }))} /> }]}
          actions={(r) => <><Button size="sm" variant="ghost" onClick={() => toast(`Aperçu : ${r.titre}`)}>Aperçu</Button><Button size="sm" variant="ghost" onClick={() => { navigator.clipboard?.writeText(`https://lgtp.ma/docs/${r.id}`); toast.success("Lien de partage copié"); }}><Copy className="h-3.5 w-3.5" /></Button><Button size="sm" variant="ghost" onClick={() => { s.set((x) => ({ scDocs: x.scDocs.map((d) => (d.id === r.id ? { ...d, version: `v${Number(d.version.slice(1)) + 1}`, date: new Date().toISOString() } : d)) })); toast.success("Nouvelle version"); }}>Remplacer</Button></>} /></TabsContent>
        <TabsContent value="infos" className="grid gap-4 lg:grid-cols-2">
          <Card title="Présentation & coordonnées" actions={<Button size="sm" onClick={() => toast.success("Infos enregistrées")}>Enregistrer</Button>}><div className="space-y-2 text-sm">{(Object.keys(s.infos) as (keyof typeof s.infos)[]).map((k) => <label key={k} className="block"><span className="text-xs capitalize text-muted-foreground">{k}</span>{k === "presentation" ? <Textarea defaultValue={s.infos[k]} onBlur={(e) => s.set((x) => ({ infos: { ...x.infos, [k]: e.target.value } }))} /> : <Input defaultValue={s.infos[k]} onBlur={(e) => s.set((x) => ({ infos: { ...x.infos, [k]: e.target.value } }))} />}</label>)}</div></Card>
          <Card title={<span className="flex items-center gap-2">Horaires de la société <Status s={openNow(s.agences[0].horaires).startsWith("Ouvert") ? "Actif" : "Pause"} /> <span className="text-xs font-normal">{openNow(s.agences[0].horaires)}</span></span>}>
            <HGrid h={s.agences[0].horaires} onChange={(h) => s.set((x) => ({ agences: x.agences.map((a, i) => (i === 0 ? { ...a, horaires: h } : a)) }))} />
            <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Exceptions & jours fériés</p>{s.exceptions.map((e) => <p key={e.id} className="text-sm">{fdate(e.date)} — {e.label}</p>)}
            <Button size="sm" variant="outline" className="mt-2" onClick={async () => { const l = await ask("Libellé de la fermeture"); if (l) s.set((x) => ({ exceptions: [...x.exceptions, { id: `ex${Date.now()}`, date: new Date().toISOString(), label: l }] })); }}>Ajouter une exception</Button></Card>
        </TabsContent>
        <TabsContent value="ag" className="space-y-4">
          <Card title="Carte des agences"><iframe title="Carte des agences" className="h-72 w-full rounded-lg border" src="https://www.openstreetmap.org/export/embed.html?bbox=-11.5%2C27.5%2C-6.5%2C34.2&layer=mapnik" /><div className="mt-2 flex flex-wrap gap-2">{s.agences.map((a) => <a key={a.id} href={maps(a)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:border-primary"><MapPin className="h-3 w-3" />{a.ville}</a>)}</div></Card>
          <div className="grid gap-4 lg:grid-cols-2">{s.agences.map((a, i) => <Card key={a.id} title={<span className="flex items-center gap-2">{a.nom}<span className="text-xs font-normal text-muted-foreground">{openNow(a.horaires)}</span></span>} actions={<Switch checked={a.actif} onCheckedChange={(v) => { s.set((x) => ({ agences: x.agences.map((g) => (g.id === a.id ? { ...g, actif: v } : g)) })); toast(v ? "Agence activée" : "Agence désactivée"); }} />}>
            <p className="text-sm">{a.adresse}<br />{a.tel} · {a.email}<br />Responsable : {a.chef} · Zone : {a.zone}<br /><span className="text-xs text-muted-foreground">{a.lat}, {a.lng} (à confirmer)</span></p>
            <div className="my-2 flex gap-2"><Button size="sm" variant="outline" asChild><a href={maps(a)} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-3.5 w-3.5" />Ouvrir dans Google Maps</a></Button><Button size="sm" variant="outline" asChild><a href={maps(a)} target="_blank" rel="noreferrer">Itinéraire</a></Button></div>
            <HGrid h={a.horaires} onChange={(h) => s.set((x) => ({ agences: x.agences.map((g, k) => (k === i ? { ...g, horaires: h } : g)) }))} />
            <p className="mt-2 text-xs text-muted-foreground">Réseaux : {s.socials.filter((x) => x.rattachement.includes(a.ville)).map((x) => x.plateforme).join(", ") || "—"}</p></Card>)}</div>
        </TabsContent>
        <TabsContent value="so"><DataTable id="so" rows={s.socials} toolbar={<span className="text-xs text-warning">URLs à remplacer par les liens réels</span>} columns={[{ key: "plateforme", label: "Plateforme", filter: true }, { key: "url", label: "URL", render: (r) => <Input className="h-8 min-w-60" defaultValue={r.url} onBlur={(e) => s.set((x) => ({ socials: x.socials.map((y) => (y.id === r.id ? { ...y, url: e.target.value } : y)) }))} /> }, { key: "rattachement", label: "Rattachement", filter: true }, { key: "visible", label: "Visible", value: (r) => (r.visible ? "Oui" : "Non"), render: (r) => <Switch checked={r.visible} onCheckedChange={(v) => s.set((x) => ({ socials: x.socials.map((y) => (y.id === r.id ? { ...y, visible: v } : y)) }))} /> }]} actions={(r) => <Button size="sm" variant="ghost" onClick={() => { window.open(r.url, "_blank"); toast("Lien ouvert dans un nouvel onglet"); }}>Tester le lien</Button>} /></TabsContent>
      </Tabs>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}><DialogContent><DialogHeader><DialogTitle>{edit?.id ? "Modifier la question" : "Nouvelle question"}</DialogTitle></DialogHeader>
        {edit && <div className="space-y-2"><Input value={edit.question} onChange={(e) => setEdit({ ...edit, question: e.target.value })} placeholder="Question" /><Textarea rows={5} value={edit.reponse} onChange={(e) => setEdit({ ...edit, reponse: e.target.value })} placeholder="Réponse" /><select className="h-9 w-full rounded border bg-background px-2 text-sm" value={edit.categorie} onChange={(e) => setEdit({ ...edit, categorie: e.target.value })}>{FAQ_CATS.map((c) => <option key={c}>{c}</option>)}</select></div>}
        <DialogFooter><Button onClick={() => { if (!edit) return; s.set((x) => ({ faq: edit.id ? x.faq.map((f) => (f.id === edit.id ? { ...f, ...edit, maj: new Date().toISOString() } : f)) : [{ id: `fq${Date.now()}`, question: edit.question, reponse: edit.reponse, categorie: edit.categorie, statut: "Brouillon", langue: "FR", maj: new Date().toISOString() }, ...x.faq] })); toast.success("Question enregistrée"); setEdit(null); }}>Enregistrer</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
