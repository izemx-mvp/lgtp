import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/DataTable";
import { Card, PageHeader } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { fdate, money } from "@/lib/format";
import { downloadCSV } from "@/lib/pdf";

export const Route = createFileRoute("/admin/marches/prix")({
  head: () => ({ meta: [{ title: "Bibliothèque de prix — LGTP" }, { name: "description", content: "Prix unitaires LGTP et simulateur." }, { property: "og:title", content: "Prix — LGTP" }, { property: "og:description", content: "Bibliothèque de prix." }] }),
  component: Page,
});

function Page() {
  const s = useStore();
  const [p, setP] = useState({ sondages: 4, prof: 15, spt: 8, press: 6, labo: 10, coef: 10 });
  const P = (c: string) => s.prix.find((x) => x.code === c)!.prix;
  const est = (P("P01") + p.sondages * p.prof * P("P02") + p.spt * P("P06") + p.press * P("P07") + p.labo * (P("P09") + P("P10")) + P("P16")) * (1 + p.coef / 100);
  return (
    <div className="space-y-4">
      <PageHeader title="Bibliothèque de prix" crumbs={[{ label: "Marchés publics" }, { label: "Prix" }]} actions={<><Button variant="outline" onClick={() => toast.success("Import Excel simulé : 17 lignes mises à jour")}>Importer Excel</Button><Button variant="outline" onClick={() => downloadCSV("prix.csv", ["Code", "Désignation", "Unité", "Prix HT"], s.prix.map((x) => [x.code, x.designation, x.unite, x.prix]))}>Exporter</Button></>} />
      <DataTable id="px" rows={s.prix} columns={[{ key: "code", label: "Code" }, { key: "categorie", label: "Catégorie", filter: true }, { key: "designation", label: "Désignation" }, { key: "unite", label: "Unité" },
        { key: "prix", label: "Prix HT", align: "right", render: (r) => <Input className="ml-auto h-8 w-28 text-right" type="number" defaultValue={r.prix} onBlur={(e) => { s.set((x) => ({ prix: x.prix.map((y) => (y.id === r.id ? { ...y, prix: +e.target.value, maj: new Date().toISOString() } : y)) })); toast.success("Prix mis à jour"); }} /> },
        { key: "cout", label: "Coût de revient", align: "right", render: (r) => money(r.cout, 0) }, { key: "marge", label: "Marge", align: "right", value: (r) => Math.round((1 - r.cout / r.prix) * 100), render: (r) => `${Math.round((1 - r.cout / r.prix) * 100)} %` }, { key: "maj", label: "Mise à jour", render: (r) => fdate(r.maj) }, { key: "usage", label: "Utilisations", align: "right" }]} />
      <Card title="Simulateur de prix">
        <div className="grid gap-2 sm:grid-cols-6">{(Object.keys(p) as (keyof typeof p)[]).map((k) => <label key={k} className="text-sm"><span className="text-xs text-muted-foreground">{{ sondages: "Nb sondages", prof: "Profondeur (m)", spt: "Essais SPT", press: "Essais pressio.", labo: "Échantillons labo", coef: "Coefficient %" }[k]}</span><Input type="number" value={p[k]} onChange={(e) => setP({ ...p, [k]: +e.target.value })} /></label>)}</div>
        <p className="mt-3 text-sm">Estimation HT : <b className="text-lg">{money(est)}</b> · TTC {money(est * 1.2)} — offre gagnante historique à 82-93 % de l'estimation MO : viser une estimation MO ≥ {money((est * 1.2) / 0.9, 0)}.</p>
      </Card>
    </div>
  );
}
