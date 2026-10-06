import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable } from "@/components/DataTable";
import { Card, PageHeader, Status } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { ACTIVITES, MONTHS } from "@/lib/seed";
import { money } from "@/lib/format";

export const Route = createFileRoute("/admin/compta/previsions")({
  head: () => ({ meta: [{ title: "Prévisions mensuelles — LGTP" }, { name: "description", content: "Collecte et relance des prévisions des agences." }, { property: "og:title", content: "Prévisions — LGTP" }, { property: "og:description", content: "Prévisions mensuelles." }] }),
  component: Page,
});

function Page() {
  const s = useStore();
  const [form, setForm] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [vals, setVals] = useState({ e: 300000, s: 150000, x: 80000, enc: 400000, dep: 20000, risques: "" });
  const nm = (a: string) => s.agences.find((g) => g.id === a)!.ville;
  const mois = MONTHS[(new Date().getMonth() + 1) % 12];
  const obj = (a: string) => ACTIVITES.reduce((p, act) => p + (s.objectifs[a][act][(new Date().getMonth() + 1) % 12] ?? 0), 0);
  const tot = s.previsions.reduce((a, p) => a + p.ca, 0), totObj = s.previsions.reduce((a, p) => a + obj(p.agence), 0);
  const msg = (a: string) => `Bonjour ${s.agences.find((g) => g.id === a)!.chef}, merci de transmettre les prévisions de l'agence ${nm(a)} pour ${mois} avant le 25. Cordialement, Service Comptabilité LGTP.`;
  return (
    <div className="space-y-4">
      <PageHeader title={`Prévisions mensuelles — ${mois}`} crumbs={[{ label: "Comptabilité & Agences" }, { label: "Prévisions" }]} sub="Date limite : le 25 du mois précédent (à confirmer) · Relances automatiques J-5, J-2, J, J+2 (escalade Direction)" />
      <DataTable id="pv" rows={s.previsions} columns={[{ key: "agence", label: "Agence", value: (r) => nm(r.agence) }, { key: "statut", label: "Statut", filter: true, render: (r) => <Status s={r.statut} /> }, { key: "ca", label: "CA prévisionnel", align: "right", render: (r) => money(r.ca, 0) }, { key: "obj", label: "Objectif", align: "right", value: (r) => obj(r.agence), render: (r) => money(obj(r.agence), 0) }, { key: "relances", label: "Relances", align: "right" }]}
        actions={(r) => <><Button size="sm" variant="ghost" onClick={() => setPreview(r.agence)}>Relancer maintenant</Button><Button size="sm" variant="outline" onClick={() => setForm(r.id)}>Saisir (chef d'agence)</Button><Button size="sm" disabled={r.statut !== "Reçue"} onClick={() => { s.set((x) => ({ previsions: x.previsions.map((p) => (p.id === r.id ? { ...p, statut: "Validée" } : p)) })); toast.success("Prévision validée"); }}>Valider</Button></>} />
      <Card title="Consolidation" actions={<Button size="sm" disabled={s.previsions.some((p) => !["Reçue", "Validée"].includes(p.statut))} onClick={() => { s.set((x) => ({ previsions: x.previsions.map((p) => ({ ...p, statut: "Validée" })) })); toast.success("Prévision consolidée validée"); }}>Valider la prévision consolidée</Button>}>
        <p className="text-sm">Total prévisions : <b>{money(tot, 0)}</b> · Objectifs : {money(totObj, 0)} · Écart : <b className={tot < totObj ? "text-destructive" : "text-success"}>{money(tot - totObj, 0)}</b></p>
      </Card>
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}><DialogContent><DialogHeader><DialogTitle>Aperçu de la relance (WhatsApp / e-mail)</DialogTitle></DialogHeader>{preview && <Textarea defaultValue={msg(preview)} rows={5} />}
        <DialogFooter><Button onClick={() => { s.set((x) => ({ previsions: x.previsions.map((p) => (p.agence === preview ? { ...p, statut: p.statut === "Reçue" ? p.statut : "Relancée", relances: p.relances + 1 } : p)) })); s.log(s.user, "Prévision", preview!, "Relance envoyée"); toast.success("Relance envoyée"); setPreview(null); }}>Envoyer</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}><DialogContent><DialogHeader><DialogTitle>Formulaire agence — prévisions {mois}</DialogTitle></DialogHeader>
        <div className="grid gap-2 text-sm">{([["e", "CA Études géotechniques"], ["s", "CA Suivi & contrôle qualité"], ["x", "CA Expertise"], ["enc", "Encaissements attendus"], ["dep", "Dépenses exceptionnelles"]] as const).map(([k, l]) => <label key={k}><span className="text-xs text-muted-foreground">{l}</span><Input type="number" value={vals[k]} onChange={(e) => setVals({ ...vals, [k]: +e.target.value })} /></label>)}
          <label><span className="text-xs text-muted-foreground">Risques / commentaires</span><Textarea value={vals.risques} onChange={(e) => setVals({ ...vals, risques: e.target.value })} /></label></div>
        <DialogFooter><Button onClick={() => { s.set((x) => ({ previsions: x.previsions.map((p) => (p.id === form ? { ...p, statut: "Reçue", ca: vals.e + vals.s + vals.x, encaissements: vals.enc, depenses: vals.dep, risques: vals.risques } : p)) })); toast.success("Prévisions reçues"); setForm(null); }}>Envoyer les prévisions</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
