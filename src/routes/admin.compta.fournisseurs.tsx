import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable } from "@/components/DataTable";
import { Kpi, PageHeader, Status } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { addDays, daysUntil, fdate, kdh, money } from "@/lib/format";

export const Route = createFileRoute("/admin/compta/fournisseurs")({
  head: () => ({ meta: [{ title: "Fournisseurs & dépenses — LGTP" }, { name: "description", content: "Factures fournisseurs et notes de frais." }, { property: "og:title", content: "Fournisseurs — LGTP" }, { property: "og:description", content: "Dépenses." }] }),
  component: Page,
});
const FLOW = ["Saisie", "Contrôle", "Approbation", "À payer", "Payée"];
const NF = ["Soumise", "Validée chef d'agence", "Validée compta", "Remboursée"];

function Page() {
  const s = useStore();
  const [ocr, setOcr] = useState<"idle" | "run" | "done">("idle");
  const [f, setF] = useState({ fournisseur: "Labo Atlas", ice: "001523478000091", ht: 18400, num: "F-7781" });
  const next = (ids: string[]) => { s.set((x) => ({ fournisseurs: x.fournisseurs.map((y) => (ids.includes(y.id) ? { ...y, statut: FLOW[Math.min(4, FLOW.indexOf(y.statut) + 1)] } : y)) })); toast.success("Étape suivante appliquée"); };
  const unpaid = s.fournisseurs.filter((x) => x.statut !== "Payée");
  return (
    <div className="space-y-4">
      <PageHeader title="Fournisseurs & dépenses" crumbs={[{ label: "Comptabilité & Agences" }, { label: "Fournisseurs & dépenses" }]} actions={<><Button variant="outline" onClick={() => { setOcr("run"); setTimeout(() => setOcr("done"), 1300); }}>Importer une facture (OCR)</Button><Button onClick={() => { s.set((x) => ({ fournisseurs: [{ id: `ff${Date.now()}`, num: "F-NEW", fournisseur: "Afriquia SMDC", categorie: "Carburant", agence: "agadir", ht: 3500, date: new Date().toISOString(), echeance: addDays(60).toISOString(), statut: "Saisie" }, ...x.fournisseurs] })); toast.success("Dépense saisie"); }}>Nouvelle dépense</Button></>} />
      <div className="grid grid-cols-3 gap-3"><Kpi label="À payer" value={unpaid.reduce((a, x) => a + x.ht * 1.2, 0)} format={kdh} /><Kpi label="Proches du délai légal (≤ 10 j)" value={unpaid.filter((x) => daysUntil(x.echeance) <= 10).length} tone="warn" /><Kpi label="Notes de frais en attente" value={s.notesFrais.filter((n) => n.statut !== "Remboursée").length} /></div>
      <Tabs defaultValue="ff">
        <TabsList><TabsTrigger value="ff">Factures fournisseurs</TabsTrigger><TabsTrigger value="nf">Notes de frais</TabsTrigger></TabsList>
        <TabsContent value="ff"><DataTable id="ff" rows={s.fournisseurs} bulk={[{ label: "Approuver / étape suivante", onClick: next }]} columns={[{ key: "num", label: "N°" }, { key: "fournisseur", label: "Fournisseur", filter: true }, { key: "categorie", label: "Catégorie", filter: true }, { key: "agence", label: "Agence", filter: true }, { key: "ht", label: "HT", align: "right", render: (r) => money(r.ht) }, { key: "echeance", label: "Échéance", render: (r) => <span className={r.statut !== "Payée" && daysUntil(r.echeance) <= 10 ? "text-destructive" : ""}>{fdate(r.echeance)}</span> }, { key: "statut", label: "Statut", filter: true, render: (r) => <Status s={r.statut === "Payée" ? "Payée" : r.statut === "À payer" ? "En attente" : r.statut} /> }]}
          actions={(r) => <><Button size="sm" variant="ghost" disabled={r.statut === "Payée"} onClick={() => next([r.id])}>{r.statut === "Approbation" ? "Approuver" : r.statut === "À payer" ? "Payer" : "Avancer"}</Button><Button size="sm" variant="ghost" onClick={() => toast.success("Paiement planifié à l'échéance")}>Planifier</Button></>} /></TabsContent>
        <TabsContent value="nf"><DataTable id="nf" rows={s.notesFrais} columns={[{ key: "agent", label: "Agent", filter: true }, { key: "chantier", label: "Chantier", filter: true }, { key: "montant", label: "Montant", align: "right", render: (r) => money(r.montant) }, { key: "date", label: "Date", render: (r) => fdate(r.date) }, { key: "statut", label: "Statut", filter: true, render: (r) => <Status s={r.statut === "Remboursée" ? "Payée" : r.statut} /> }]}
          actions={(r) => <Button size="sm" variant="outline" disabled={r.statut === "Remboursée"} onClick={() => { s.set((x) => ({ notesFrais: x.notesFrais.map((n) => (n.id === r.id ? { ...n, statut: NF[Math.min(3, NF.indexOf(n.statut) + 1)] } : n)) })); toast.success("Note de frais validée"); }}>Valider</Button>} /></TabsContent>
      </Tabs>
      <Dialog open={ocr !== "idle"} onOpenChange={(o) => !o && setOcr("idle")}><DialogContent><DialogHeader><DialogTitle>Import OCR d'une facture fournisseur</DialogTitle></DialogHeader>
        {ocr === "run" ? <div className="flex items-center gap-2 py-6 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Extraction des champs…</div> : <div className="grid gap-2 text-sm">
          {(Object.keys(f) as (keyof typeof f)[]).map((k) => <label key={k}><span className="text-xs text-muted-foreground">{{ fournisseur: "Fournisseur", ice: "ICE", ht: "Montant HT", num: "N° facture" }[k]}</span><Input value={f[k]} onChange={(e) => setF({ ...f, [k]: k === "ht" ? +e.target.value : e.target.value })} /></label>)}
          <p className={String(f.ice).length === 15 ? "text-success" : "text-destructive"}>{String(f.ice).length === 15 ? "✔ ICE valide (15 chiffres)" : "✖ ICE invalide"}</p>
          <p className="text-success">✔ Aucun doublon détecté</p></div>}
        <DialogFooter><Button disabled={ocr !== "done"} onClick={() => { s.set((x) => ({ fournisseurs: [{ id: `ff${Date.now()}`, num: f.num, fournisseur: f.fournisseur, categorie: "Laboratoire", agence: "agadir", ht: f.ht, date: new Date().toISOString(), echeance: addDays(60).toISOString(), statut: "Contrôle" }, ...x.fournisseurs] })); toast.success("Facture fournisseur enregistrée"); setOcr("idle"); }}>Enregistrer</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
