import { createFileRoute } from "@tanstack/react-router";
import { ask, confirmAsk } from "@/lib/dialogs";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { Card, Kpi, PageHeader, Status } from "@/components/ui-kit";
import { factTTC, useStore } from "@/lib/store";
import { fdate, kdh, money } from "@/lib/format";

export const Route = createFileRoute("/admin/compta/encaissements")({
  head: () => ({ meta: [{ title: "Encaissements & rapprochement — LGTP" }, { name: "description", content: "Rapprochement bancaire automatique." }, { property: "og:title", content: "Encaissements — LGTP" }, { property: "og:description", content: "Rapprochement bancaire." }] }),
  component: Page,
});

function Page() {
  const s = useStore();
  const [locked, setLocked] = useState(false);
  const fnum = (id?: string) => s.factures.find((f) => f.id === id)?.num ?? "—";
  const todo = s.releves.filter((r) => r.statut !== "Rapproché");
  const importReleve = () => { const open = s.factures.filter((f) => f.statut === "Envoyée" && factTTC(f) - f.paye > 1).slice(0, 3); s.set((x) => ({ releves: [...open.map((f, i) => ({ id: `ri${Date.now()}${i}`, compte: "bk1", date: new Date().toISOString(), libelle: `VIR ${f.num}`, montant: factTTC(f), statut: "Non identifié" as const, suggestion: f.id, confiance: 97, mode: "Virement" })), ...x.releves] })); toast.success(`Relevé importé : ${open.length} nouvelles lignes`); };
  return (
    <div className="space-y-4">
      <PageHeader title="Encaissements & rapprochement bancaire" crumbs={[{ label: "Comptabilité & Agences" }, { label: "Encaissements" }]} actions={<>
        <Button variant="outline" onClick={importReleve}>Importer un relevé (CSV)</Button>
        <Button variant="outline" disabled={locked} onClick={() => { const auto = todo.filter((r) => r.suggestion && (r.confiance ?? 0) >= 85); auto.forEach((r) => s.matchReleve(r.id, r.suggestion!)); toast.success(`${auto.length} lignes rapprochées automatiquement`); }}>Rapprochement auto (≥ 85 %)</Button>
        <Button disabled={locked} onClick={() => { setLocked(true); toast.success("Rapprochement validé — période verrouillée"); }}>Valider le rapprochement</Button></>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {s.comptes.map((c) => <Kpi key={c.id} label={`${c.banque} ${c.numero}`} value={c.solde} format={kdh} />)}
        <Kpi label="À rapprocher" value={todo.length} tone="warn" />
      </div>
      <DataTable id="rq" title="File « À rapprocher »" rows={todo} columns={[{ key: "date", label: "Date", render: (r) => fdate(r.date) }, { key: "libelle", label: "Libellé" }, { key: "montant", label: "Montant", align: "right", render: (r) => money(r.montant) }, { key: "mode", label: "Mode", filter: true }, { key: "suggestion", label: "Facture suggérée", value: (r) => fnum(r.suggestion) }, { key: "confiance", label: "Confiance", align: "right", value: (r) => r.confiance ?? 0, render: (r) => (r.confiance ? `${r.confiance} %` : "—") }, { key: "statut", label: "Statut", filter: true, render: (r) => <Status s={r.statut} /> }]}
        actions={(r) => <>
          <Button size="sm" disabled={!r.suggestion || locked} onClick={() => { s.matchReleve(r.id, r.suggestion!); toast.success(`Rapproché avec ${fnum(r.suggestion)} — facture, créances et trésorerie mises à jour`); }}>Accepter</Button>
          <Button size="sm" variant="ghost" disabled={locked} onClick={async () => { const n = await ask("N° de facture (ex. FA-2026-0012)"); const f = s.factures.find((x) => x.num === n); if (f) { s.matchReleve(r.id, f.id); toast.success("Rapproché"); } else if (n) toast.error("Facture introuvable"); }}>Changer</Button>
          <Button size="sm" variant="ghost" disabled={locked} onClick={() => { s.set((x) => ({ releves: x.releves.map((l) => (l.id === r.id ? { ...l, statut: "Rapproché", libelle: l.libelle + " (frais bancaires)" } : l)) })); toast.success("Marqué frais bancaires"); }}>Frais</Button>
          {r.statut === "Doublon" && <Button size="sm" variant="ghost" onClick={() => { s.set((x) => ({ releves: x.releves.filter((l) => l.id !== r.id) })); toast.success("Doublon supprimé"); }}>Supprimer</Button>}</>} />
      <Card title="Registre (lignes rapprochées)"><DataTable id="rr" rows={s.releves.filter((r) => r.statut === "Rapproché")} columns={[{ key: "date", label: "Date", render: (r) => fdate(r.date) }, { key: "compte", label: "Compte", filter: true, value: (r) => s.comptes.find((c) => c.id === r.compte)!.banque }, { key: "libelle", label: "Libellé" }, { key: "montant", label: "Montant", align: "right", render: (r) => money(r.montant) }, { key: "mode", label: "Mode", filter: true }, { key: "factureId", label: "Facture", value: (r) => fnum(r.factureId) }]} /></Card>
    </div>
  );
}
