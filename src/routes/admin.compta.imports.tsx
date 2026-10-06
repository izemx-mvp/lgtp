import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable } from "@/components/DataTable";
import { Card, PageHeader, Status } from "@/components/ui-kit";
import { factTTC, useStore } from "@/lib/store";
import { fdate, money } from "@/lib/format";

export const Route = createFileRoute("/admin/compta/imports")({
  head: () => ({ meta: [{ title: "Imports & qualité des données — LGTP" }, { name: "description", content: "Import CSV/Excel et contrôles." }, { property: "og:title", content: "Imports — LGTP" }, { property: "og:description", content: "Qualité des données." }] }),
  component: Page,
});
const ERRS = [["Ligne 4", "Doublon de la facture F-2231"], ["Ligne 11", "Montant négatif (-1 200,00)"], ["Ligne 19", "ICE invalide (14 chiffres)"], ["Ligne 27", "Agence inconnue « Tiznit »"]];

function Page() {
  const s = useStore();
  const [rep, setRep] = useState<string | null>(null);
  const [fixed, setFixed] = useState<number[]>([]);
  const fact = s.factures.reduce((a, f) => a + factTTC(f), 0), enc = s.factures.reduce((a, f) => a + f.paye, 0);
  return (
    <div className="space-y-4">
      <PageHeader title="Imports & qualité des données" crumbs={[{ label: "Comptabilité & Agences" }, { label: "Imports" }]} actions={<Button onClick={() => { s.set((x) => ({ imports: [{ id: `im${Date.now()}`, type: "Paie récap", fichier: "paie_recap.xlsx", lignes: 42, erreurs: 0, date: new Date().toISOString(), statut: "Importé" }, ...x.imports] })); toast.success("Fichier importé — mapping « Paie récap » appliqué, 0 anomalie"); }}>Importer CSV / Excel</Button>} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Réconciliation facturé / encaissé / créances"><p className="text-sm">Facturé TTC {money(fact, 0)} − Encaissé {money(enc, 0)} = Créances {money(fact - enc, 0)} <span className="text-success">✔ cohérent</span></p></Card>
        <Card title="ERP vs consolidé"><p className="text-sm">Total ERP {money(fact, 0)} · Consolidé {money(fact, 0)} · Delta <b className="text-success">0,00 DH</b></p></Card>
      </div>
      <DataTable id="im" title="Historique des imports" rows={s.imports} columns={[{ key: "type", label: "Type", filter: true }, { key: "fichier", label: "Fichier" }, { key: "lignes", label: "Lignes", align: "right" }, { key: "erreurs", label: "Erreurs", align: "right" }, { key: "date", label: "Date", render: (r) => fdate(r.date) }, { key: "statut", label: "Statut", filter: true, render: (r) => <Status s={r.statut} /> }]}
        actions={(r) => <><Button size="sm" variant="ghost" onClick={() => setRep(r.id)}>Rapport</Button><Button size="sm" variant="ghost" onClick={() => { s.set((x) => ({ imports: x.imports.map((i) => (i.id === r.id ? { ...i, statut: "Annulé (rollback)" } : i)) })); toast("Import annulé (rollback)"); }}>Rollback</Button></>} />
      <Dialog open={!!rep} onOpenChange={(o) => !o && setRep(null)}><DialogContent><DialogHeader><DialogTitle>Rapport de validation</DialogTitle></DialogHeader>
        {s.imports.find((i) => i.id === rep)?.erreurs ? ERRS.map(([l, e], i) => <div key={l} className="flex items-center gap-2 border-b py-1.5 text-sm"><span className={fixed.includes(i) ? "flex-1 line-through opacity-60" : "flex-1"}><b>{l}</b> — {e}</span><Button size="sm" variant="outline" onClick={() => setFixed((f) => [...f, i])}>Auto-corriger</Button><Button size="sm" variant="ghost" onClick={() => setFixed((f) => [...f, i])}>Ignorer</Button></div>) : <p className="text-sm text-success">✔ Aucune anomalie.</p>}
        <DialogFooter><Button onClick={() => { s.set((x) => ({ imports: x.imports.map((i) => (i.id === rep ? { ...i, erreurs: 0, statut: "Importé" } : i)) })); setRep(null); toast.success("Import finalisé"); }}>Importer</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
