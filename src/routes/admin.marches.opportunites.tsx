import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { previewPdf } from "@/lib/dialogs";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable } from "@/components/DataTable";
import { AgentPanel } from "@/components/AgentPanel";
import { Jr, PageHeader, Status } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { PEOPLE, type AO } from "@/lib/seed";
import { daysUntil, fdate, fdatetime, money } from "@/lib/format";

export const Route = createFileRoute("/admin/marches/opportunites")({
  head: () => ({ meta: [{ title: "Opportunités Go/No-Go — LGTP" }, { name: "description", content: "Décision Go / No-Go sur les appels d'offres." }, { property: "og:title", content: "Opportunités — LGTP" }, { property: "og:description", content: "Décision Go / No-Go." }] }),
  component: Opps,
});
const MOTIFS = ["Hors périmètre", "Charge trop élevée", "Estimation trop faible", "Zone trop éloignée", "Qualification manquante", "Délai insuffisant", "Autre"];

function Opps() {
  const s = useStore();
  const nav = useNavigate();
  const [open, setOpen] = useState<AO | null>(null);
  const [nogo, setNogo] = useState<string[] | null>(null);
  const [motif, setMotif] = useState(MOTIFS[0]);
  const [listeJour, setListeJour] = useState(false);
  const canGo = s.role === "Direction" || s.role === "Resp. région Sud";
  const rows = s.aos.filter((a) => a.pertinent).map((a) => (a.statut !== "Expiré" && daysUntil(a.deadline) < 0 && !a.dossierId ? { ...a, statut: "Expiré" as const } : a));
  const cur = open ? s.aos.find((a) => a.id === open.id)! : null;
  const go = (ids: string[]) => { if (!canGo) { toast.error("Seuls la Direction et le Resp. région Sud peuvent décider Go"); return; } s.aoDecide(ids, "Go"); };
  const noGo = (ids: string[]) => { if (!canGo) { toast.error("Seuls la Direction et le Resp. région Sud peuvent décider"); return; } setNogo(ids); };
  const create = (id: string) => { const d = s.createDossier(id); if (d) nav({ to: "/admin/marches/dossiers/$id", params: { id: d } }); };
  const day = rows.filter((a) => a.statut === "À décider" || a.statut === "Nouveau");

  return (
    <div className="space-y-4">
      <PageHeader title="Opportunités (Go / No-Go)" crumbs={[{ label: "Marchés publics" }, { label: "Opportunités" }]} actions={<><Button variant="secondary" onClick={() => setListeJour(true)}>Liste du jour ({day.length})</Button><AgentPanel agent="veille" /></>} />
      <DataTable id="ao" title="Appels d'offres détectés" rows={rows} onRowClick={setOpen} bulk={[{ label: "Go", onClick: go }, { label: "No-Go", onClick: noGo, variant: "outline" }]}
        columns={[
          { key: "ref", label: "Référence", className: "whitespace-nowrap font-medium" }, { key: "mo", label: "Maître d'ouvrage", filter: true }, { key: "objet", label: "Objet", className: "min-w-64" },
          { key: "procedure", label: "Procédure", filter: true }, { key: "region", label: "Région", filter: true, hidden: true }, { key: "ville", label: "Ville" },
          { key: "estimation", label: "Estimation TTC", align: "right", render: (r) => money(r.estimation, 0) }, { key: "caution", label: "Caution prov.", align: "right", render: (r) => money(r.caution, 0), hidden: true },
          { key: "deadline", label: "Date limite", value: (r) => r.deadline, render: (r) => fdate(r.deadline) }, { key: "j", label: "J-restants", value: (r) => daysUntil(r.deadline), render: (r) => <Jr j={daysUntil(r.deadline)} /> },
          { key: "source", label: "Source", filter: true, hidden: true }, { key: "score", label: "Score", align: "right", render: (r) => <b className={r.score >= 75 ? "text-success" : r.score >= 55 ? "" : "text-muted-foreground"}>{r.score}</b> },
          { key: "statut", label: "Statut", filter: true, render: (r) => <Status s={r.statut} /> },
        ]}
        actions={(r) => r.statut === "Go" ? <Button size="sm" onClick={() => create(r.id)}>Créer le dossier</Button> : r.dossierId ? <Button size="sm" variant="outline" onClick={() => nav({ to: "/admin/marches/dossiers/$id", params: { id: r.dossierId! } })}>Ouvrir le dossier</Button> : null} />

      <Sheet open={!!cur} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {cur && <>
            <SheetHeader><SheetTitle>{cur.ref}</SheetTitle><p className="text-sm text-muted-foreground">{cur.mo} · {cur.objet}</p><div className="flex gap-2"><Status s={cur.statut} /><Jr j={daysUntil(cur.deadline)} /></div></SheetHeader>
            <Tabs defaultValue="resume" className="mt-4">
              <TabsList className="flex-wrap"><TabsTrigger value="resume">Résumé IA</TabsTrigger><TabsTrigger value="docs">Documents</TabsTrigger><TabsTrigger value="analyse">Analyse</TabsTrigger><TabsTrigger value="hist">Historique</TabsTrigger><TabsTrigger value="dec">Décision</TabsTrigger></TabsList>
              <TabsContent value="resume" className="space-y-2 text-sm">
                {[["Objet", cur.objet], ["Lot", "Lot unique"], ["Procédure", cur.procedure], ["Estimation", money(cur.estimation)], ["Caution provisoire", money(cur.caution)], ["Délai d'exécution", cur.delaiExec], ["Visite des lieux", cur.visite ? "Obligatoire" : "Non"], ["Date limite", fdate(cur.deadline)]].map(([k, v]) => <div key={k} className="flex justify-between border-b py-1"><span className="text-muted-foreground">{k}</span><b className="text-right">{v}</b></div>)}
                <p className="pt-2 font-medium">Qualifications exigées vs LGTP</p>
                {cur.qualifs.map((q) => <div key={q} className="flex justify-between"><span>{q}</span><span className="text-success">✔</span></div>)}
              </TabsContent>
              <TabsContent value="docs" className="space-y-2">
                {["Règlement de consultation (RC)", "Cahier des prescriptions spéciales (CPS)", "Bordereau des prix (BPDE)", "Avis d'appel d'offres"].map((d) => <div key={d} className="flex items-center justify-between rounded border p-2 text-sm"><span>📄 {d}.pdf</span><Button size="sm" variant="ghost" onClick={() => previewPdf(`${d} — ${cur.ref}`, [{ paragraphs: [`Maître d'ouvrage : ${cur.mo}`, `Objet : ${cur.objet}`, `Procédure : ${cur.procedure} · Date limite : ${fdate(cur.deadline)}`, `Art. 9 — Cautionnement provisoire : ${money(cur.caution)}`, "Art. 10 — Validité des offres : 75 jours", `Art. 12 — Visite des lieux : ${cur.visite ? "obligatoire" : "facultative"}`, `Qualifications exigées : ${cur.qualifs.join(", ")}`] }])}>Aperçu</Button></div>)}
              </TabsContent>
              <TabsContent value="analyse" className="space-y-2 text-sm">
                <p>Score de pertinence : <b>{cur.score}/100</b></p>
                {Object.entries(cur.breakdown).map(([k, v]) => <div key={k}><div className="flex justify-between"><span>{k}</span><span>{v}</span></div><div className="h-1.5 rounded bg-muted"><div className="h-1.5 rounded bg-primary" style={{ width: `${(v / 20) * 100}%` }} /></div></div>)}
              </TabsContent>
              <TabsContent value="hist" className="space-y-2 text-sm">
                <p className="text-muted-foreground">Détecté le {fdate(cur.detectedAt)} sur {cur.source}.</p>
                {cur.comments.map((c, i) => <div key={i} className="rounded bg-muted p-2"><b>{c.by}</b> · {fdatetime(c.at)}<br />{c.text}</div>)}
                <Textarea placeholder="Ajouter un commentaire (@mention)…" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); const t = (e.target as HTMLTextAreaElement).value; if (!t) return; s.set((x) => ({ aos: x.aos.map((a) => (a.id === cur.id ? { ...a, comments: [...a.comments, { by: s.user, at: new Date().toISOString(), text: t }] } : a)) })); (e.target as HTMLTextAreaElement).value = ""; toast.success("Commentaire ajouté"); } }} />
              </TabsContent>
              <TabsContent value="dec" className="space-y-3 text-sm">
                <label className="block"><span className="text-xs text-muted-foreground">Assigner à</span>
                  <select className="mt-1 h-9 w-full rounded-md border bg-background px-2" value={cur.assignee ?? ""} onChange={(e) => { s.set((x) => ({ aos: x.aos.map((a) => (a.id === cur.id ? { ...a, assignee: e.target.value } : a)) })); toast.success(`Assigné à ${e.target.value}`); }}><option value="">—</option>{PEOPLE.map((p) => <option key={p}>{p}</option>)}</select></label>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => go([cur.id])}>Go</Button><Button variant="outline" onClick={() => noGo([cur.id])}>No-Go</Button>
                  <Button variant="secondary" disabled={cur.statut !== "Go"} onClick={() => create(cur.id)}>Créer le dossier</Button>
                </div>
                {!canGo && <p className="text-xs text-muted-foreground">Seuls la Direction et le Resp. région Sud peuvent décider Go.</p>}
                {cur.motif && <p>Motif No-Go : {cur.motif}</p>}
              </TabsContent>
            </Tabs>
          </>}
        </SheetContent>
      </Sheet>

      <Dialog open={!!nogo} onOpenChange={(o) => !o && setNogo(null)}>
        <DialogContent><DialogHeader><DialogTitle>Motif du No-Go (obligatoire)</DialogTitle></DialogHeader>
          <div className="grid gap-1">{MOTIFS.map((m) => <label key={m} className="flex items-center gap-2 text-sm"><input type="radio" checked={motif === m} onChange={() => setMotif(m)} />{m}</label>)}</div>
          <DialogFooter><Button onClick={() => { s.aoDecide(nogo!, "No-Go", motif); setNogo(null); }}>Confirmer le No-Go</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={listeJour} onOpenChange={setListeJour}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Liste du jour — validation du responsable</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">{day.map((a) => <div key={a.id} className="flex items-center gap-2 rounded border p-2 text-sm"><div className="flex-1"><b>{a.mo}</b> — {a.objet}<div className="text-xs text-muted-foreground">{money(a.estimation, 0)} · score {a.score} · <Jr j={daysUntil(a.deadline)} /></div></div><Button size="sm" onClick={() => go([a.id])}>Go</Button><Button size="sm" variant="outline" onClick={() => noGo([a.id])}>No-Go</Button></div>)}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
