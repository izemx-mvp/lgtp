import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarDays, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GeoScene } from "@/components/GeoScene";
import { Card, Gauge, Kpi, PageHeader, Status } from "@/components/ui-kit";
import { agencyStats, aging, useStore } from "@/lib/store";
import { AG_OP } from "@/lib/seed";
import { daysUntil, fdate, fdatetime, kdh, money } from "@/lib/format";
import { pulse } from "@/lib/pulse";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Tableau de bord — LGTP" }, { name: "description", content: "Vue d'ensemble LGTP : marchés, agences, agents IA." }, { property: "og:title", content: "Tableau de bord — LGTP" }, { property: "og:description", content: "Vue d'ensemble LGTP." }] }),
  component: Dashboard,
});

const REG_POS: Record<string, [number, number]> = { "Casablanca-Settat": [62, 18], "Marrakech-Safi": [52, 34], "Drâa-Tafilalet": [68, 42], "Souss-Massa": [40, 50], "Guelmim-Oued Noun": [30, 62], "Laâyoune-Sakia El Hamra": [20, 76], "Dakhla-Oued Ed-Dahab": [10, 92] };

function Dashboard() {
  const s = useStore();
  const rel = s.aos.filter((a) => a.pertinent);
  const week = rel.filter((a) => daysUntil(a.detectedAt) >= -7).length;
  const decide = rel.filter((a) => a.statut === "À décider").length;
  const prep = s.dossiers.filter((d) => !d.depot).length;
  const j3 = s.dossiers.filter((d) => { const j = daysUntil(s.aos.find((a) => a.id === d.aoId)!.deadline); return !d.depot && j >= 0 && j <= 3; }).length;
  const res = s.dossiers.filter((d) => d.resultat);
  const win = res.filter((d) => d.resultat!.decision === "Gagné").length;
  const caSigne = res.filter((d) => d.resultat!.decision === "Gagné").reduce((a, d) => a + (d.acteMontant ?? 0), 0);
  const st = AG_OP.map((a) => ({ a, ...agencyStats(s, a) }));
  const factMois = st.reduce((a, x) => a + x.factureMois, 0), objMois = st.reduce((a, x) => a + x.objMois, 0);
  const cr60 = aging(s)["61-90"] + aging(s)["> 90"];
  const funnel = [["Détectés", rel.length], ["Qualifiés", rel.filter((a) => a.score >= 55).length], ["Go", rel.filter((a) => ["Go", "En dossier"].includes(a.statut)).length], ["Dossier", s.dossiers.length], ["Déposé", s.dossiers.filter((d) => d.depot).length], ["Ouvert", s.dossiers.filter((d) => d.step >= 8).length], ["Gagné", win]].map(([n, v]) => ({ n, v }));
  const pending = s.queue.filter((q) => q.statut === "En attente");
  const events = [
    ...s.dossiers.filter((d) => !d.depot).map((d) => { const a = s.aos.find((x) => x.id === d.aoId)!; return { d: a.deadline, t: `Dépôt ${a.mo}`, to: `/admin/marches/dossiers/${d.id}` }; }),
    ...s.dossiers.filter((d) => d.depot && !d.resultat).map((d) => ({ d: d.ouverture!, t: `Ouverture des plis ${d.id.toUpperCase()}`, to: `/admin/marches/dossiers/${d.id}` })),
    ...s.docsPerm.filter((d) => d.expiration && daysUntil(d.expiration) <= 30 && daysUntil(d.expiration) >= -10).map((d) => ({ d: d.expiration!, t: `Expiration : ${d.type}`, to: "/admin/marches/documents" })),
    ...s.previsions.filter((p) => p.statut !== "Validée" && p.statut !== "Reçue").map((p) => ({ d: new Date(new Date().getFullYear(), new Date().getMonth(), 25).toISOString(), t: `Prévisions attendues — ${p.agence}`, to: "/admin/compta/previsions" })),
  ].filter((e) => daysUntil(e.d) >= -2 && daysUntil(e.d) <= 30).sort((a, b) => a.d.localeCompare(b.d)).slice(0, 8);
  const todo = [
    decide && { t: `Décider Go/No-Go sur ${decide} AO`, to: "/admin/marches/opportunites?ao_f_statut=%C3%80%20d%C3%A9cider" },
    j3 && { t: `${j3} dossier(s) à déposer sous 3 jours`, to: "/admin/marches/dossiers" },
    { t: `${pending.length} propositions d'agents IA à valider`, to: "/admin/compta/agent" },
    { t: `${s.releves.filter((r) => r.statut === "Non identifié").length} lignes bancaires à rapprocher`, to: "/admin/compta/encaissements" },
    { t: "Relancer les agences en retard sur les prévisions", to: "/admin/compta/previsions" },
  ].filter(Boolean) as { t: string; to: string }[];
  const regionCount = rel.reduce((m, a) => ((m[a.region] = (m[a.region] ?? 0) + 1), m), {} as Record<string, number>);

  return (
    <div>
      <div className="relative -mx-3 -mt-5 mb-5 h-40 overflow-hidden md:-mx-6">
        <div className="absolute inset-0 opacity-70"><GeoScene level="ambient" /></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="relative flex h-full items-end px-3 pb-3 md:px-6">
          <PageHeader title={`Bonjour, ${s.user.split(" ")[0]}`} crumbs={[{ label: "Tableau de bord" }]} sub={`${s.role} · ${fdate(new Date())}`} actions={<Button onClick={() => { s.simulateDay(); pulse(); }} className="gap-2"><PlayCircle className="h-4 w-4" />Simuler une journée</Button>} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {s.role !== "Compta & Finances" && s.role !== "Chef d'agence" && <>
          <Kpi label="AO détectés cette semaine" value={week} to="/admin/marches/opportunites" onHover={pulse} />
          <Kpi label="Opportunités à décider" value={decide} tone={decide ? "warn" : undefined} to="/admin/marches/opportunites" />
          <Kpi label="Dossiers en préparation" value={prep} to="/admin/marches/dossiers" />
          <Kpi label="Dépôts à J-3" value={j3} tone={j3 ? "bad" : undefined} to="/admin/marches/dossiers" />
          <Kpi label="Taux de succès 12 mois" value={res.length ? (win / res.length) * 100 : 0} format={(n) => `${Math.round(n)} %`} to="/admin/marches/resultats" />
        </>}
        <Kpi label="CA signé (marchés)" value={caSigne} format={kdh} to="/admin/marches/resultats" />
        <Kpi label="CA vs objectif (mois)" value={objMois ? (factMois / objMois) * 100 : 0} format={(n) => `${Math.round(n)} %`} to="/admin/compta" />
        <Kpi label="Facturation du mois" value={factMois} format={kdh} to="/admin/compta/facturation" />
        <Kpi label="Créances > 60 j" value={cr60} format={kdh} tone="bad" to="/admin/compta/creances" />
        <Kpi label="Cautions engagées" value={s.cautions.filter((c) => c.statut !== "Restituée").reduce((a, c) => a + c.montant, 0)} format={kdh} to="/admin/marches/cautions" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="À faire aujourd'hui">
          <ul className="space-y-1.5">{todo.map((t) => <li key={t.t}><Link to={t.to} className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-muted"><span className="h-2 w-2 rounded-full bg-gold" />{t.t}</Link></li>)}</ul>
        </Card>
        <Card title={<span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />Échéances (30 jours)</span>}>
          <ul className="space-y-1">{events.map((e, i) => <li key={i}><Link to={e.to} className="flex items-center justify-between gap-2 rounded p-1.5 text-sm hover:bg-muted"><span className="truncate">{e.t}</span><span className="shrink-0 text-xs text-muted-foreground">{fdate(e.d)}</span></Link></li>)}</ul>
        </Card>
        <Card title="Entonnoir marchés">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={funnel} layout="vertical" margin={{ left: 10 }}><XAxis type="number" hide /><YAxis dataKey="n" type="category" width={70} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="v" radius={4}>{funnel.map((_, i) => <Cell key={i} fill={i === 6 ? "var(--gold)" : "var(--brand)"} />)}</Bar></BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Carte des AO par région">
          <div className="relative mx-auto h-56 w-full max-w-xs rounded-lg bg-sand/30">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full"><path d="M70 5 L85 12 L80 30 L75 45 L60 52 L48 60 L38 70 L25 82 L12 98 L5 95 L15 80 L22 66 L30 55 L35 45 L45 35 L55 22 Z" fill="var(--sand)" stroke="var(--clay)" strokeWidth="0.6" /></svg>
            {Object.entries(regionCount).map(([r, n]) => { const p = REG_POS[r] ?? [50, 50]; return <Link key={r} to="/admin/marches/opportunites" search={{ ao_f_region: r } as never} title={`${r} : ${n} AO`} className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-background" style={{ left: `${p[0]}%`, top: `${p[1]}%`, width: 14 + n * 1.5, height: 14 + n * 1.5 }}>{n}</Link>; })}
          </div>
        </Card>
        <Card title="Objectifs du mois par agence">
          <div className="grid grid-cols-3 gap-2">{st.map((x) => <Link key={x.a} to="/admin/compta/agences/$id" params={{ id: x.a }}><Gauge value={x.taux} label={s.agences.find((g) => g.id === x.a)!.ville} /></Link>)}</div>
          <p className="mt-2 text-xs text-muted-foreground">Facturé {money(factMois, 0)} / objectif {money(objMois, 0)}</p>
        </Card>
        <Card title={`File de validation IA (${pending.length})`} actions={<Button size="sm" variant="ghost" asChild><Link to="/admin/compta/agent">Tout voir</Link></Button>}>
          <ul className="max-h-56 space-y-1.5 overflow-y-auto">{pending.slice(0, 8).map((q) => <li key={q.id} className="flex items-center gap-2 text-sm"><span className="flex-1 truncate">{q.objet}</span><Button size="sm" className="h-6 px-2 text-xs" onClick={() => s.approve(q.id, true)}>Approuver</Button></li>)}</ul>
        </Card>
      </div>
      <Card title="Activité récente" className="mt-4">
        {s.audit.length === 0 ? <p className="text-sm text-muted-foreground">Aucune activité pour l'instant — lancez un agent ou « Simuler une journée ».</p> :
          <ul className="space-y-1 text-sm">{s.audit.slice(0, 10).map((a) => <li key={a.id} className="flex gap-2"><span className="w-32 shrink-0 text-xs text-muted-foreground">{fdatetime(a.at)}</span><b className="shrink-0">{a.author}</b><span className="truncate">{a.msg}</span><Status s={a.entity} className="ml-auto" /></li>)}</ul>}
      </Card>
    </div>
  );
}
