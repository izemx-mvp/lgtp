import { createFileRoute, Link } from "@tanstack/react-router";
import { ask as askDialog } from "@/lib/dialogs";
import { useState } from "react";
import { Loader2, Play, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/DataTable";
import { Card, Kpi, PageHeader, Status } from "@/components/ui-kit";
import { agencyStats, cashForecast, factTTC, useStore } from "@/lib/store";
import { fdatetime, money } from "@/lib/format";

export const Route = createFileRoute("/admin/compta/agent")({
  head: () => ({ meta: [{ title: "Agent Compta — centre de commande — LGTP" }, { name: "description", content: "Agent Comptabilité & Agences : capacités, validations, journal." }, { property: "og:title", content: "Agent Compta — LGTP" }, { property: "og:description", content: "Centre de commande de l'Agent Compta." }] }),
  component: Page,
});
const CAPS = ["Relance des prévisions mensuelles", "Rappel du taux de facturation", "Résultats de fin de mois", "Traitement & contrôle des données", "Facturation", "Créances & relances", "Rapprochement bancaire", "Fournisseurs & dépenses", "Trésorerie prévisionnelle & alertes", "Budget, marges & écarts", "Calendrier fiscal & social", "Cautions & retenues", "Alertes & escalades"];
const LINKS = ["/admin/compta/previsions", "/admin/compta/facturation", "/admin/compta/cloture", "/admin/compta/imports", "/admin/compta/facturation", "/admin/compta/creances", "/admin/compta/encaissements", "/admin/compta/fournisseurs", "/admin/compta/tresorerie", "/admin/compta/budget", "/admin/compta/obligations", "/admin/marches/cautions", "/admin/compta/agent"];

interface Answer { q: string; text: string; rows?: string[][]; to?: string }

function Page() {
  const s = useStore();
  const [caps, setCaps] = useState(CAPS.map((c, i) => ({ c, on: true, auto: i % 3 === 0 ? "Prépare" : "Exécute après validation", last: new Date(Date.now() - i * 3600e3).toISOString(), vol: 10 + i * 7 })));
  const [running, setRunning] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [typing, setTyping] = useState(false);
  const queue = s.queue.filter((x) => x.agent === "compta");
  const pending = queue.filter((x) => x.statut === "En attente");
  const ag = (n: string) => (/agadir/i.test(n) ? "agadir" : /marrakech/i.test(n) ? "marrakech" : /guelmim/i.test(n) ? "guelmim" : null);

  const ask = (question: string) => {
    if (!question.trim()) return;
    setQ(""); setTyping(true);
    const l = question.toLowerCase(); let a: Answer;
    const a1 = ag(l);
    if (l.includes("taux") && a1) { const st = agencyStats(s, a1); a = { q: question, text: `Le taux de facturation de ${a1} est de ${Math.round(st.taux * 100)} % (${money(st.factureMois, 0)} facturés sur un objectif mensuel de ${money(st.objMois, 0)}).`, to: "/admin/compta/facturation" }; }
    else if ((l.includes("60") || l.includes("retard")) && l.includes("factur")) { const fs = s.factures.filter((f) => (!a1 || f.agence === a1) && factTTC(f) - f.paye > 1 && Date.now() - new Date(f.date).getTime() > 60 * 864e5); a = { q: question, text: `${fs.length} facture(s) de plus de 60 jours${a1 ? ` à ${a1}` : ""}, pour ${money(fs.reduce((x, f) => x + factTTC(f) - f.paye, 0), 0)}.`, rows: fs.slice(0, 8).map((f) => [f.num, s.clients.find((c) => c.id === f.clientId)!.nom, money(factTTC(f) - f.paye, 0)]), to: "/admin/compta/creances" }; }
    else if (l.includes("trésorerie") || l.includes("tresorerie")) { const w = cashForecast(s, "réaliste"); a = { q: question, text: `Solde prévisionnel à 4 semaines : ${money(w[3].solde, 0)} (réaliste). Scénario prudent : ${money(cashForecast(s, "prudent")[3].solde, 0)}.`, rows: w.slice(0, 4).map((x) => [x.semaine, money(x.encaissements, 0), money(x.decaissements, 0), money(x.solde, 0)]), to: "/admin/compta/tresorerie" }; }
    else if (l.includes("prévision") || l.includes("prevision")) { const p = s.previsions.filter((x) => !["Reçue", "Validée"].includes(x.statut)); a = { q: question, text: p.length ? `Agences n'ayant pas envoyé leurs prévisions : ${p.map((x) => x.agence).join(", ")}.` : "Toutes les agences ont envoyé leurs prévisions.", to: "/admin/compta/previsions" }; }
    else a = { q: question, text: "Je n'ai pas cette information dans les données disponibles. Essayez : « Quel est le taux de facturation d'Agadir ? », « Quelles factures > 60 jours à Marrakech ? », « Prévision de trésorerie à 4 semaines ? »." };
    setTimeout(() => { setAnswers((x) => [a, ...x]); setTyping(false); }, 700);
  };
  const runCap = (c: string) => { setRunning(c); setTimeout(() => { s.runAgent("compta"); setCaps((x) => x.map((y) => (y.c === c ? { ...y, last: new Date().toISOString(), vol: y.vol + 1 } : y))); setRunning(null); toast.success(`${c} : exécuté — propositions en file de validation`); }, 1100); };

  return (
    <div className="space-y-4">
      <PageHeader title="Agent Compta — centre de commande" crumbs={[{ label: "Comptabilité & Agences" }, { label: "Agent Compta" }]} sub="« L'agent traite en volume, l'humain valide. »" actions={<Button className="gap-2" onClick={() => runCap("Cycle complet")}>{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}Exécuter le cycle complet</Button>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Kpi label="Tâches traitées" value={s.agents.find((a) => a.id === "compta")!.traitees} /><Kpi label="Temps gagné (h)" value={s.agents.find((a) => a.id === "compta")!.tempsGagne} /><Kpi label="Taux de validation" value={92} format={(n) => `${Math.round(n)} %`} /><Kpi label="Anomalies détectées" value={s.releves.filter((r) => r.statut !== "Rapproché").length + 4} tone="warn" /></div>
      <Tabs defaultValue="caps">
        <TabsList className="flex-wrap"><TabsTrigger value="caps">Capacités (13)</TabsTrigger><TabsTrigger value="queue">File de validation ({pending.length})</TabsTrigger><TabsTrigger value="journal">Journal</TabsTrigger><TabsTrigger value="rules">Règles & seuils</TabsTrigger><TabsTrigger value="tpl">Modèles de messages</TabsTrigger><TabsTrigger value="ask">Interroger l'agent</TabsTrigger></TabsList>
        <TabsContent value="caps"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{caps.map((c, i) => <Card key={c.c} title={`${i + 1}. ${c.c}`} actions={<Switch checked={c.on} onCheckedChange={(v) => { setCaps((x) => x.map((y) => (y.c === c.c ? { ...y, on: v } : y))); toast(v ? "Activé" : "Désactivé"); }} />}>
          <div className="space-y-1 text-xs text-muted-foreground"><select className="h-8 w-full rounded border bg-background px-1 text-foreground" value={c.auto} onChange={(e) => { setCaps((x) => x.map((y) => (y.c === c.c ? { ...y, auto: e.target.value } : y))); toast.success(`Autonomie : ${e.target.value}`); }}>{["Suggère", "Prépare", "Exécute après validation"].map((o) => <option key={o}>{o}</option>)}</select>
            <p>Planning : quotidien 7h00 · Dernière exécution : {fdatetime(c.last)}</p><p>Volume : {c.vol} · En attente : {pending.filter((p) => p.capability?.startsWith(c.c.split(" ")[0])).length}</p></div>
          <div className="mt-2 flex gap-1"><Button size="sm" disabled={!c.on || !!running} onClick={() => runCap(c.c)}>{running === c.c ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Exécuter maintenant"}</Button><Button size="sm" variant="ghost" asChild><Link to={LINKS[i]}>Voir le module</Link></Button></div></Card>)}</div></TabsContent>
        <TabsContent value="queue"><DataTable id="aq" rows={queue} bulk={[{ label: "Approuver la sélection", onClick: (ids) => { ids.forEach((id) => s.approve(id, true)); toast.success(`${ids.length} propositions approuvées`); } }]} columns={[{ key: "capability", label: "Capacité", filter: true, value: (r) => r.capability ?? "—" }, { key: "objet", label: "Objet" }, { key: "agence", label: "Agence", value: (r) => r.agence ?? "—", filter: true }, { key: "montant", label: "Montant", align: "right", value: (r) => r.montant ?? 0, render: (r) => (r.montant ? money(r.montant) : "—") }, { key: "at", label: "Proposé le", render: (r) => fdatetime(r.at) }, { key: "statut", label: "Statut", filter: true, render: (r) => <Status s={r.statut} /> }]}
          actions={(r) => r.statut === "En attente" ? <><Button size="sm" onClick={() => { s.approve(r.id, true); toast.success("Approuvé — store mis à jour"); }}>Approuver</Button><Button size="sm" variant="ghost" onClick={async () => { const t = await askDialog("Modifier", r.objet); if (t) s.set((x) => ({ queue: x.queue.map((y) => (y.id === r.id ? { ...y, objet: t } : y)) })); }}>Modifier</Button><Button size="sm" variant="ghost" onClick={() => { s.approve(r.id, false); toast("Rejeté"); }}>Rejeter</Button></> : null} /></TabsContent>
        <TabsContent value="journal"><Card>{s.runs.filter((r) => r.agent === "compta").map((r) => <div key={r.id} className="border-b py-2 text-sm"><span className="text-xs text-muted-foreground">{fdatetime(r.at)}</span><p><b>Entrées</b> {r.inputs} → <b>Étapes</b> {r.steps.join(" → ")} → <b>Sorties</b> {r.outputs}</p></div>)}</Card></TabsContent>
        <TabsContent value="rules" className="space-y-4">
          <DataTable id="fr" title="Règles & seuils (à valider par l'expert-comptable)" rows={s.financeRules} columns={[{ key: "label", label: "Règle" }, { key: "value", label: "Valeur", render: (r) => <Input className="h-8" defaultValue={r.value} onBlur={(e) => { s.set((x) => ({ financeRules: x.financeRules.map((y) => (y.id === r.id ? { ...y, value: e.target.value } : y)) })); toast.success("Règle mise à jour"); }} /> }, { key: "statut", label: "Statut", render: (r) => <Status s={r.statut === "Validé" ? "Validé" : "En attente"} /> }]} />
          <DataTable id="ar" title="Alertes & escalades" rows={s.alertRules} columns={[{ key: "condition", label: "Condition" }, { key: "dest", label: "Destinataire" }, { key: "canal", label: "Canal", filter: true }, { key: "delai", label: "Délai" }, { key: "escalade", label: "Escalade" }]} toolbar={<Button size="sm" variant="outline" onClick={() => { s.set((x) => ({ alertRules: [...x.alertRules, { id: `ar${Date.now()}`, condition: "Nouvelle condition", dest: "Resp. compta", canal: "E-mail", delai: "J+1", escalade: "Direction" }] })); toast.success("Règle ajoutée"); }}>Ajouter</Button>} actions={(r) => <Button size="sm" variant="ghost" onClick={() => { s.set((x) => ({ alertRules: x.alertRules.filter((y) => y.id !== r.id) })); toast("Règle supprimée"); }}>Supprimer</Button>} />
        </TabsContent>
        <TabsContent value="tpl"><div className="grid gap-3 md:grid-cols-2">{[["Relance prévisions", "Bonjour {agence}, merci de transmettre vos prévisions avant le {échéance}. — Service Comptabilité LGTP"], ["Rappel taux de facturation", "Bonjour {agence}, votre taux de facturation à J15 est de {taux}. Merci d'émettre les factures des chantiers terminés."], ["Relance facture", "Bonjour, la facture de {montant} échue le {échéance} reste impayée. Merci de votre règlement."], ["Publication résultats", "Bonjour {agence}, vous trouverez ci-joint les résultats du mois."]].map(([n, t]) => <Card key={n} title={n}><textarea className="h-24 w-full rounded border bg-background p-2 text-sm" defaultValue={t} onBlur={() => toast.success("Modèle enregistré")} /></Card>)}</div></TabsContent>
        <TabsContent value="ask"><Card title={<span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-gold" />Interroger l'agent</span>}>
          <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex gap-2"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex. Quel est le taux de facturation d'Agadir ?" /><Button type="submit"><Send className="h-4 w-4" /></Button></form>
          <div className="mt-2 flex flex-wrap gap-1">{["Quel est le taux de facturation d'Agadir ?", "Quelles factures > 60 jours à Marrakech ?", "Prévision de trésorerie à 4 semaines ?", "Quelles agences n'ont pas envoyé leurs prévisions ?"].map((x) => <button key={x} onClick={() => ask(x)} className="rounded-full border px-2.5 py-1 text-xs hover:border-primary">{x}</button>)}</div>
          {typing && <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />L'agent analyse les données…</p>}
          <div className="mt-3 space-y-3">{answers.map((a, i) => <div key={i} className="rounded-lg border p-3 text-sm"><p className="text-xs text-muted-foreground">{a.q}</p><p className="mt-1">{a.text}</p>{a.rows && <table className="mt-2 w-full text-xs">{a.rows.map((r, k) => <tr key={k} className="border-t">{r.map((c, j) => <td key={j} className="py-1">{c}</td>)}</tr>)}</table>}{a.to && <Button size="sm" variant="link" className="px-0" asChild><Link to={a.to}>Ouvrir la page source →</Link></Button>}</div>)}</div>
        </Card></TabsContent>
      </Tabs>
    </div>
  );
}
