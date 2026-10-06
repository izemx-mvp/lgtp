import { createFileRoute } from "@tanstack/react-router";
import { ask, confirmAsk } from "@/lib/dialogs";
import { Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, Status } from "@/components/ui-kit";
import { agencyStats, useStore } from "@/lib/store";
import { AG_OP, MONTHS } from "@/lib/seed";
import { money } from "@/lib/format";
import { makePdf } from "@/lib/pdf";

export const Route = createFileRoute("/admin/compta/cloture")({
  head: () => ({ meta: [{ title: "Clôture mensuelle — LGTP" }, { name: "description", content: "Workflow de clôture et publication des résultats." }, { property: "og:title", content: "Clôture — LGTP" }, { property: "og:description", content: "Clôture mensuelle." }] }),
  component: Page,
});

function Page() {
  const s = useStore();
  const steps = s.cloture;
  const mois = MONTHS[new Date().getMonth()];
  const mark = (id: string) => { s.set((x) => ({ cloture: x.cloture.map((c) => (c.id === id ? { ...c, done: true } : c)) })); toast.success("Étape marquée faite"); };
  const publish = async () => {
    await makePdf(`Résultats ${mois}`, [{ table: { head: ["Agence", "Facturé du mois", "Objectif", "Taux"], rows: AG_OP.map((a) => { const st = agencyStats(s, a); return [a, money(st.factureMois, 0), money(st.objMois, 0), `${Math.round(st.taux * 100)} %`]; }) } }]);
    s.set((x) => ({ cloture: x.cloture.map((c) => ({ ...c, done: true })), clotureLocked: true }));
    toast.success("Résultats publiés (PDF + e-mail aux agences) — période verrouillée");
  };
  return (
    <div className="space-y-4">
      <PageHeader title={`Clôture mensuelle — ${mois}`} crumbs={[{ label: "Comptabilité & Agences" }, { label: "Clôture mensuelle" }]} sub={s.clotureLocked ? <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5" />Période verrouillée</span> : "En cours"} actions={<>
        <Button variant="outline" disabled={steps.some((c) => c.done) && !s.clotureLocked} onClick={() => { s.set((x) => ({ cloture: x.cloture.map((c, i) => ({ ...c, done: i === 0 })), clotureLocked: false })); toast.success("Clôture démarrée"); }}>Démarrer la clôture</Button>
        <Button variant="outline" onClick={async () => { const c = await ask("Commentaire d'écart"); if (c) { s.log(s.user, "Clôture", mois, `Écart commenté : ${c}`); toast.success("Commentaire ajouté"); } }}>Commenter un écart</Button>
        <Button disabled={s.clotureLocked || !steps.slice(0, 4).every((c) => c.done)} onClick={publish}>Publier</Button>
        <Button variant="ghost" disabled={!s.clotureLocked} onClick={async () => { const j = await ask("Justification de réouverture"); if (j) { s.set(() => ({ clotureLocked: false })); s.log(s.user, "Clôture", mois, `Rouverte : ${j}`); toast("Période rouverte"); } }}>Rouvrir</Button></>} />
      <div className="grid gap-3 md:grid-cols-5">{steps.map((c, i) => <Card key={c.id} title={`${i + 1}. ${c.label}`}><p className="text-xs text-muted-foreground">Responsable : {c.owner}</p><div className="mt-2 flex items-center justify-between">{c.done ? <Status s="Validé" /> : <Status s="En attente" />}<Button size="sm" variant="outline" disabled={c.done || (i > 0 && !steps[i - 1].done) || i === 4} onClick={() => mark(c.id)}><Check className="h-3.5 w-3.5" /></Button></div></Card>)}</div>
      <Card title="Analyse des écarts (préparée par l'Agent Compta)">{AG_OP.map((a) => { const st = agencyStats(s, a); return <p key={a} className="border-b py-1.5 text-sm"><b>{s.agences.find((g) => g.id === a)!.ville}</b> — réalisé {money(st.factureMois, 0)} vs objectif {money(st.objMois, 0)} ({Math.round(st.taux * 100)} %). {st.taux < 0.6 ? "Écart significatif : chantiers terminés non facturés à émettre." : "Conforme à la trajectoire."}</p>; })}</Card>
    </div>
  );
}
