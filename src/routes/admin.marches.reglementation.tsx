import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DataTable } from "@/components/DataTable";
import { Card, PageHeader, Status } from "@/components/ui-kit";
import { useStore } from "@/lib/store";
import { fdate, fdatetime } from "@/lib/format";

export const Route = createFileRoute("/admin/marches/reglementation")({
  head: () => ({ meta: [{ title: "Référentiel réglementaire — LGTP" }, { name: "description", content: "Décret 2-22-431, procédures et paramètres." }, { property: "og:title", content: "Réglementation — LGTP" }, { property: "og:description", content: "Référentiel réglementaire." }] }),
  component: Page,
});
const KB: [string, string][] = [
  ["Appel d'offres ouvert", "Tout concurrent peut soumissionner. Publicité au portail marchespublics.gov.ma et presse ; dépôt électronique avec signature électronique (Barid eSign)."],
  ["AO ouvert simplifié", "Pour les montants inférieurs au seuil réglementaire ; délai de publicité minimum de 10 jours."],
  ["AO restreint", "Seuls les concurrents admis par le maître d'ouvrage peuvent soumissionner."],
  ["Concours", "Mise en compétition sur la base d'un programme, avec jury."],
  ["Procédure négociée", "Le maître d'ouvrage négocie les conditions avec un ou plusieurs concurrents, dans les cas prévus par le décret."],
  ["Bons de commande", "Prestations sous un seuil annuel, sans mise en concurrence formelle, sur devis contradictoires."],
  ["Pièces par dossier", "Dossier administratif, dossier technique, dossier additif (si exigé), offre financière (acte d'engagement + BPDE)."],
  ["Cautions & retenue", "Caution provisoire fixée par le RC ; définitive à l'attribution ; retenue de garantie sur décomptes ; mainlevée après réception."],
  ["Offre anormalement basse", "Offre inférieure au seuil paramétré de l'estimation : justification demandée par la commission."],
  ["Préférence nationale", "Majoration appliquée aux offres étrangères pour la comparaison."],
  ["Recours & clarifications", "Demandes d'éclaircissement avant la date limite ; recours auprès du maître d'ouvrage puis de la commission compétente."],
  ["Glossaire", "RC : règlement de consultation · CPS : cahier des prescriptions spéciales · BPDE : bordereau des prix – détail estimatif · CCAG : cahier des clauses administratives générales · CAO : commission d'appel d'offres."],
];

function Page() {
  const s = useStore();
  const [log, setLog] = useState<{ at: string; text: string }[]>([]);
  return (
    <div className="space-y-4">
      <PageHeader title="Réglementation" crumbs={[{ label: "Marchés publics" }, { label: "Réglementation" }]} sub="Décret n° 2-22-431 (mars 2023) relatif aux marchés publics · Le RC de chaque AO prévaut toujours sur ces valeurs par défaut." />
      <DataTable id="pm" title="Paramètres configurables" rows={s.params} columns={[{ key: "libelle", label: "Libellé" },
        { key: "valeur", label: "Valeur", render: (r) => <Input className="h-8 min-w-48" defaultValue={r.valeur} onBlur={(e) => { if (e.target.value === r.valeur) return; s.set((x) => ({ params: x.params.map((p) => (p.id === r.id ? { ...p, valeur: e.target.value, statut: "À valider par le juridique", maj: new Date().toISOString() } : p)) })); setLog((l) => [{ at: new Date().toISOString(), text: `${r.libelle} : ${r.valeur} → ${e.target.value}` }, ...l]); toast.success("Paramètre modifié — à valider par le juridique"); }} /> },
        { key: "source", label: "Source", filter: true }, { key: "statut", label: "Statut", filter: true, render: (r) => <Status s={r.statut === "Validé" ? "Validé" : "En attente"} /> }, { key: "maj", label: "Dernière modif.", render: (r) => fdate(r.maj) }]}
        actions={(r) => <Button size="sm" variant="outline" disabled={r.statut === "Validé"} onClick={() => { s.set((x) => ({ params: x.params.map((p) => (p.id === r.id ? { ...p, statut: "Validé" } : p)) })); setLog((l) => [{ at: new Date().toISOString(), text: `${r.libelle} validé` }, ...l]); toast.success("Paramètre validé"); }}>Valider</Button>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Référentiel" className="lg:col-span-2"><Accordion type="multiple">{KB.map(([t, c]) => <AccordionItem key={t} value={t}><AccordionTrigger>{t}</AccordionTrigger><AccordionContent>{c}</AccordionContent></AccordionItem>)}</Accordion></Card>
        <Card title="Journal des modifications">{log.length ? log.map((l, i) => <p key={i} className="border-b py-1 text-sm"><span className="text-xs text-muted-foreground">{fdatetime(l.at)}</span><br />{l.text}</p>) : <p className="text-sm text-muted-foreground">Aucune modification.</p>}</Card>
      </div>
    </div>
  );
}
