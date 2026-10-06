import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { previewPdf } from "@/lib/dialogs";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/DataTable";
import { Card, PageHeader, Status } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { fdate, money } from "@/lib/format";

export const Route = createFileRoute("/admin/marches/references")({
  head: () => ({ meta: [{ title: "Références & moyens — LGTP" }, { name: "description", content: "Références, personnel, matériel et qualifications." }, { property: "og:title", content: "Références & moyens — LGTP" }, { property: "og:description", content: "Références et moyens." }] }),
  component: Page,
});

function Page() {
  const s = useStore();
  const ag = (id: string) => s.agences.find((a) => a.id === id)?.ville ?? id;
  return (
    <div className="space-y-4">
      <PageHeader title="Références & moyens" crumbs={[{ label: "Marchés publics" }, { label: "Références & moyens" }]} />
      <Tabs defaultValue="refs">
        <TabsList><TabsTrigger value="refs">Références</TabsTrigger><TabsTrigger value="staff">Personnel</TabsTrigger><TabsTrigger value="eq">Matériel</TabsTrigger><TabsTrigger value="q">Qualifications & agréments</TabsTrigger></TabsList>
        <TabsContent value="refs"><DataTable id="rf" rows={s.refs} columns={[{ key: "projet", label: "Projet" }, { key: "mo", label: "Maître d'ouvrage", filter: true }, { key: "nature", label: "Nature", filter: true }, { key: "montant", label: "Montant", align: "right", render: (r) => money(r.montant, 0) }, { key: "annee", label: "Année", filter: true }, { key: "tags", label: "Tags", value: (r) => r.tags.join(", ") }]} actions={(r) => <Button size="sm" variant="ghost" onClick={() => previewPdf(`Attestation de bonne exécution — ${r.projet}`, [{ paragraphs: [`Le maître d'ouvrage ${r.mo} atteste que LGTP a exécuté à sa satisfaction la prestation « ${r.nature} » pour le projet ${r.projet}, d'un montant de ${money(r.montant)}, en ${r.annee}.`] }])}>Attestation</Button>} /></TabsContent>
        <TabsContent value="staff"><DataTable id="st" rows={s.staff} columns={[{ key: "nom", label: "Nom" }, { key: "poste", label: "Poste" }, { key: "diplome", label: "Diplôme" }, { key: "experience", label: "Expérience", align: "right", render: (r) => `${r.experience} ans` }, { key: "agence", label: "Agence", value: (r) => ag(r.agence), filter: true }]} actions={(r) => <Button size="sm" variant="ghost" onClick={() => previewPdf(`CV — ${r.nom}`, [{ paragraphs: [`${r.nom} — ${r.poste}`, `Diplôme : ${r.diplome}`, `Expérience : ${r.experience} ans`, `Agence : ${ag(r.agence)}`] }])}>CV</Button>} /></TabsContent>
        <TabsContent value="eq"><DataTable id="eq" rows={s.equip} columns={[{ key: "nom", label: "Équipement" }, { key: "qte", label: "Qté", align: "right" }, { key: "etat", label: "État", filter: true }, { key: "etalonnage", label: "Étalonnage", render: (r) => fdate(r.etalonnage) }, { key: "agence", label: "Agence", value: (r) => ag(r.agence), filter: true }, { key: "dispo", label: "Disponibilité", value: (r) => (r.dispo ? "Disponible" : "Indisponible"), filter: true, render: (r) => <Status s={r.dispo ? "Actif" : "Pause"} /> }]}
          actions={(r) => <Button size="sm" variant="outline" onClick={() => { s.set((x) => ({ equip: x.equip.map((e) => (e.id === r.id ? { ...e, dispo: !e.dispo } : e)) })); toast.success("Disponibilité mise à jour (utilisée par la veille)"); }}>Basculer dispo.</Button>} /></TabsContent>
        <TabsContent value="q"><Card title="Qualifications (libellés exacts à confirmer au cadrage)"><ul className="space-y-1 text-sm">{["Classe 1 — Laboratoire BTP", "Reconnaissance géotechnique", "Essais de laboratoire sols", "Essais sur béton et matériaux", "Contrôle qualité des travaux", "Expertise technique"].map((q) => <li key={q} className="flex justify-between border-b py-1">{q}<Status s="Valide" /></li>)}</ul></Card></TabsContent>
      </Tabs>
    </div>
  );
}
