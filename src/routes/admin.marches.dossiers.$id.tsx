import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Check, FileDown, Eye, Loader2, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AgentPanel } from "@/components/AgentPanel";
import { Card, EmptyState, Jr, PageHeader, Status } from "@/components/ui-kit";
import { bpdeTotals, docStatus, STEP_STATUT, STEPS, useStore, type Dossier } from "@/lib/store";
import { daysUntil, enLettres, fdate, fdatetime, money, addDays } from "@/lib/format";
import { genDoc } from "@/lib/docgen";
import { pulse } from "@/lib/pulse";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/marches/dossiers/$id")({
  head: ({ params }) => ({ meta: [{ title: `Dossier ${params.id.toUpperCase()} — LGTP` }, { name: "description", content: "Constitution du dossier d'appel d'offres en 8 étapes." }, { property: "og:title", content: `Dossier ${params.id.toUpperCase()} — LGTP` }, { property: "og:description", content: "Dossier d'appel d'offres." }] }),
  component: Detail,
});

const DOCS = ["Déclaration sur l'honneur", "Acte d'engagement", "BPDE", "Note moyens humains & techniques", "Mémoire méthodologique + planning", "Lettre de demande de caution", "Liste des références", "Bordereau de remise des pièces"];

function Detail() {
  const { id } = Route.useParams();
  const s = useStore();
  const nav = useNavigate();
  const d = s.dossiers.find((x) => x.id === id);
  const [view, setView] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  if (!d) return <EmptyState title="Dossier introuvable" action={<Button asChild><Link to="/admin/marches/dossiers">Retour</Link></Button>} />;
  const ao = s.aos.find((a) => a.id === d.aoId)!;
  const j = daysUntil(ao.deadline);
  const step = view ?? d.step;
  const t = bpdeTotals(d);
  const upd = (fn: (x: Dossier) => void, msg?: string, author?: string) => s.updDossier(d.id, fn, msg, author);
  const advance = (to: number) => upd((x) => { x.step = Math.max(x.step, to); x.statut = STEP_STATUT[to - 1]; }, `Étape ${to - 1} validée`);
  const extra = { staff: s.staff.slice(0, 8), equip: s.equip.filter((e) => e.dispo).slice(0, 8), refs: s.refs.slice(0, 10) };
  const audit = s.audit.filter((a) => a.entityId === d.id);
  const sim = (label: string, ms: number, fn: () => void) => { setBusy(label); setTimeout(() => { fn(); setBusy(null); }, ms); };
  const invalidate = () => upd((x) => { x.revueDone = false; x.signed = false; x.validations = []; });

  const panels: Record<number, React.ReactNode> = {
    1: <Card title="Analyse du RC / CPS" actions={<Button size="sm" className="gap-1" disabled={!!busy} onClick={() => sim("rc", 1200, () => { upd(() => {}, "RC analysé par l'agent", "Agent Constitution de dossier"); toast.success("RC/CPS analysés — 15 champs extraits"); })}>{busy === "rc" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Analyser le RC</Button>}>
      <div className="grid gap-2 sm:grid-cols-2">{Object.entries(d.extracted).map(([k, v], i) => <label key={k} className="text-sm"><span className="flex justify-between text-xs text-muted-foreground">{k}<span>RC art. {i + 3}, p. {Math.ceil((i + 1) / 3)}</span></span><Input defaultValue={k === "Date limite" ? fdate(v) : /Estimation|Caution prov/.test(k) ? money(+v) : v} onBlur={(e) => upd((x) => (x.extracted[k] = e.target.value))} /></label>)}</div>
      <Button className="mt-3" onClick={() => { advance(2); toast.success("Analyse validée"); }}>Valider l'analyse</Button></Card>,
    2: <Card title="Checklist des pièces (générée depuis le RC)">
      {["Dossier administratif", "Dossier technique", "Dossier additif", "Offre financière"].map((sec) => <div key={sec} className="mb-3"><p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{sec}</p>
        {d.checklist.filter((p) => p.section === sec).map((p) => { const lib = p.docType ? s.docsPerm.find((x) => x.type === p.docType) : undefined; const st = lib && docStatus(lib) === "Expiré" ? "Expiré" : p.statut; return (
          <div key={p.id} className="flex flex-wrap items-center gap-2 border-b py-1.5 text-sm"><span className="flex-1">{p.libelle}{lib?.expiration && <span className="ml-2 text-xs text-muted-foreground">exp. {fdate(lib.expiration)}</span>}{p.commentaire && <span className="ml-2 text-xs text-destructive">{p.commentaire}</span>}</span><span className="text-xs text-muted-foreground">{p.source}</span><Status s={st} />
            <select className="h-7 rounded border bg-background text-xs" value={p.statut} onChange={(e) => upd((x) => (x.checklist.find((y) => y.id === p.id)!.statut = e.target.value as typeof p.statut), `Pièce « ${p.libelle} » → ${e.target.value}`)}>{["À fournir", "Auto-généré", "Fourni", "Expiré", "Non conforme", "Validé"].map((o) => <option key={o}>{o}</option>)}</select></div>); })}
      </div>)}
      <Button onClick={() => { advance(3); toast.success("Checklist validée"); }}>Valider la checklist</Button></Card>,
    3: <Card title="Génération des documents"><div className="grid gap-2 sm:grid-cols-2">{DOCS.map((k) => <div key={k} className="flex items-center gap-2 rounded-lg border p-2 text-sm"><span className="flex-1">{k}{d.generated.includes(k) && <Check className="ml-1 inline h-4 w-4 text-success" />}</span>
      <Button size="sm" variant="outline" onClick={async () => { const u = await genDoc(k, d, ao, extra, true); setPdfUrl(u as string); if (!d.generated.includes(k)) upd((x) => x.generated.push(k), `Document généré : ${k}`, "Agent Constitution de dossier"); }}><Eye className="h-3.5 w-3.5" /></Button>
      <Button size="sm" onClick={async () => { await genDoc(k, d, ao, extra); if (!d.generated.includes(k)) upd((x) => x.generated.push(k), `Document généré : ${k}`, "Agent Constitution de dossier"); toast.success(`${k} généré (PDF)`); }}><FileDown className="mr-1 h-3.5 w-3.5" />Générer</Button></div>)}</div>
      <p className="mt-2 text-xs text-muted-foreground">Filigrane « Brouillon » jusqu'à validation Direction. Les champs d'identité proviennent de la fiche société.</p>
      <Button className="mt-3" onClick={() => { advance(4); toast.success("Documents validés"); }}>Continuer vers le chiffrage</Button></Card>,
    4: <Card title="Chiffrage (BPDE)">
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted-foreground"><th>N°</th><th>Désignation</th><th>Unité</th><th className="text-right">Qté</th><th className="text-right">PU HT</th><th className="text-right">Total HT</th></tr></thead>
        <tbody>{d.bpde.map((l) => <tr key={l.id} className="border-t"><td>{l.num}</td><td>{l.designation}<div className="text-[11px] text-muted-foreground">{l.chap} · suggéré {money(l.suggere, 0)} (min {money(l.suggere * 0.85, 0)} / max {money(l.suggere * 1.2, 0)})</div></td><td>{l.unite}</td>
          <td className="text-right"><Input className="ml-auto h-8 w-20 text-right" type="number" value={l.qte} onChange={(e) => { upd((x) => (x.bpde.find((y) => y.id === l.id)!.qte = +e.target.value)); invalidate(); }} /></td>
          <td className="text-right"><Input className="ml-auto h-8 w-24 text-right" type="number" value={l.pu} onChange={(e) => { upd((x) => (x.bpde.find((y) => y.id === l.id)!.pu = +e.target.value)); invalidate(); }} /></td><td className="text-right tabular-nums">{money(l.qte * l.pu)}</td></tr>)}</tbody></table></div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">{(["marge", "depl", "aleas", "remise"] as const).map((k) => <label key={k} className="text-sm"><span className="text-xs text-muted-foreground">{{ marge: "Marge %", depl: "Majoration déplacement %", aleas: "Aléas %", remise: "Remise %" }[k]}</span><Input type="number" value={d.coefs[k]} onChange={(e) => { upd((x) => (x.coefs[k] = +e.target.value)); invalidate(); }} /></label>)}</div>
      <div className="mt-3 grid gap-2 rounded-lg bg-muted p-3 text-sm sm:grid-cols-2">
        <div>Total HT : <b>{money(t.ht)}</b><br />TVA 20 % : {money(t.tva)}<br />Total TTC : <b>{money(t.ttc)}</b><br /><i className="text-xs">{enLettres(t.ttc)}</i></div>
        <div className="space-y-1">{(() => { const r = t.ttc / ao.estimation; return <>
          <div>Écart vs estimation : <b>{((r - 1) * 100).toFixed(1).replace(".", ",")} %</b></div>
          {r < 0.8 && <div className="text-destructive">⚠ Sous le seuil d'offre anormalement basse (80 %)</div>}
          {r > 1 && <div className="text-destructive">⚠ Au-dessus de l'estimation du maître d'ouvrage</div>}
          {Math.abs((d.acteMontant ?? 0) - t.ttc) > 1 && <div className="text-destructive">⚠ Acte d'engagement ({money(d.acteMontant ?? 0)}) ≠ BPDE</div>}
          <div className="text-xs text-muted-foreground">Historique : LGTP a remporté ses marchés similaires à 82-93 % de l'estimation.</div></>; })()}</div>
      </div>
      <Button className="mt-3" onClick={() => { upd((x) => (x.acteMontant = bpdeTotals(x).ttc), "Chiffrage validé — acte d'engagement aligné"); advance(5); toast.success("Chiffrage validé, acte d'engagement mis à jour"); }}>Valider le chiffrage</Button></Card>,
    5: <Card title="Cautionnement provisoire"><p className="text-sm">Montant exigé par le RC : <b>{money(ao.caution)}</b> · validité ≥ 75 jours.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button disabled={d.cautionDemandee} onClick={() => { s.set((x) => ({ cautions: [...x.cautions, { id: `ct${Date.now()}`, type: "provisoire", aoId: ao.id, banque: "Attijariwafa bank", montant: ao.caution, emission: new Date().toISOString(), validite: addDays(90).toISOString(), statut: "Demandée", frais: Math.round(ao.caution * 0.012) }] })); upd((x) => (x.cautionDemandee = true), "Caution provisoire demandée"); genDoc("Lettre de demande de caution", d, ao); toast.success("Caution demandée — lettre à la banque générée"); }}>Demander la caution</Button>
        <Button variant="outline" disabled={!d.cautionDemandee} onClick={() => { s.set((x) => ({ cautions: x.cautions.map((c) => (c.aoId === ao.id && c.type === "provisoire" ? { ...c, statut: "Émise" } : c)) })); upd((x) => { const p = x.checklist.find((y) => y.libelle.startsWith("Récépissé")); if (p) p.statut = "Validé"; }, "Attestation bancaire reçue"); advance(6); toast.success("Attestation bancaire reçue — pièce validée"); }}>Marquer l'attestation reçue</Button>
      </div></Card>,
    6: <Card title="Revue de conformité (IA + humain)" actions={<Button size="sm" className="gap-1" disabled={!!busy} onClick={() => sim("rev", 1400, () => {
      const issues: Dossier["issues"] = [];
      d.checklist.forEach((p) => { const lib = p.docType ? s.docsPerm.find((x) => x.type === p.docType) : undefined; if ((lib && docStatus(lib) === "Expiré") || p.statut === "Expiré") issues.push({ id: p.id, sev: "Bloquant", text: `Pièce expirée : ${p.libelle}`, step: 2, fixed: false }); else if (p.statut === "À fournir") issues.push({ id: p.id, sev: "Majeur", text: `Pièce manquante : ${p.libelle}`, step: 2, fixed: false }); });
      if (Math.abs((d.acteMontant ?? 0) - t.ttc) > 1) issues.push({ id: "mm", sev: "Bloquant", text: `Montant BPDE (${money(t.ttc)}) ≠ acte d'engagement (${money(d.acteMontant ?? 0)})`, step: 4, fixed: false });
      if (!d.cautionDemandee) issues.push({ id: "ct", sev: "Bloquant", text: "Caution provisoire non demandée", step: 5, fixed: false });
      if (j < 0) issues.push({ id: "dl", sev: "Bloquant", text: "Date limite dépassée", step: 7, fixed: false });
      if (!d.generated.includes("Déclaration sur l'honneur")) issues.push({ id: "sg", sev: "Majeur", text: "Signature manquante : déclaration sur l'honneur non générée", step: 3, fixed: false });
      upd((x) => { x.issues = issues; x.revueDone = true; }, `Revue de conformité : ${issues.length} point(s)`, "Agent Constitution de dossier");
      toast(issues.length ? `${issues.length} point(s) à corriger` : "Aucune anomalie détectée");
    })}>{busy === "rev" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Lancer la revue</Button>}>
      {!d.revueDone ? <p className="text-sm text-muted-foreground">Lancez la revue pour comparer la checklist aux documents.</p> : d.issues.length === 0 ? <p className="text-sm text-success">✔ Aucune anomalie.</p> :
        d.issues.map((i) => <div key={i.id} className="flex items-center gap-2 border-b py-1.5 text-sm"><Status s={i.sev} /><span className={cn("flex-1", i.fixed && "line-through opacity-60")}>{i.text}</span><Button size="sm" variant="link" onClick={() => setView(i.step)}>Corriger</Button><Button size="sm" variant="outline" onClick={() => upd((x) => (x.issues.find((y) => y.id === i.id)!.fixed = !i.fixed))}>{i.fixed ? "Rouvrir" : "Corrigé"}</Button></div>)}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm"><b>Validation 4 yeux :</b>{["Préparateur", "Responsable marchés", "Direction"].map((v, k) => <Button key={v} size="sm" variant={d.validations.includes(v) ? "secondary" : "outline"} disabled={d.validations.includes(v) || (k > 0 && !d.validations.includes(["Préparateur", "Responsable marchés"][k - 1])) || !d.revueDone || d.issues.some((x) => x.sev === "Bloquant" && !x.fixed)} onClick={() => { upd((x) => { x.validations.push(v); if (v === "Direction") { x.step = Math.max(x.step, 7); x.statut = "Prêt à signer"; } }, `Validé par ${v}`); toast.success(`Validé : ${v}`); }}>{d.validations.includes(v) && <Check className="mr-1 h-3.5 w-3.5" />}{v}</Button>)}</div></Card>,
    7: <Card title="Signature & dépôt">{j < 0 && !d.depot ? <div className="flex items-center gap-2 text-sm text-destructive"><Lock className="h-4 w-4" />Étape verrouillée : la date limite de dépôt est dépassée.</div> : <>
      <div className="flex flex-wrap gap-2">
        <Button disabled={d.signed} onClick={() => sim("sig", 1200, () => { upd((x) => { x.signed = true; x.statut = "Signé"; }, "Signé électroniquement (Barid eSign)"); toast.success("Certificat Barid eSign appliqué — dossier signé"); })}>{busy === "sig" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}{d.signed ? "Signé ✔" : "Signer électroniquement"}</Button>
        <Button variant="secondary" disabled={!d.signed || !!d.depot} onClick={() => sim("dep", 2000, () => { upd((x) => { x.depot = { at: new Date().toISOString(), accuse: `ACC-${Math.floor(Math.random() * 900000 + 100000)}`, mode: "Portail" }; x.statut = "Déposé"; x.step = 8; }, "Déposé sur marchespublics.gov.ma"); pulse(); toast.success("Dépôt réussi — accusé de réception électronique reçu"); })}>{busy === "dep" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Déposer sur le portail</Button>
        <Button variant="outline" disabled={!d.signed || !!d.depot} onClick={() => { upd((x) => { x.depot = { at: new Date().toISOString(), accuse: "Récépissé papier", mode: "Papier" }; x.statut = "Déposé"; x.step = 8; }, "Dépôt hors portail (papier)"); toast.success("Dépôt papier enregistré"); }}>Dépôt hors portail (papier)</Button>
      </div>
      {busy === "dep" && <div className="mt-3 space-y-1 text-sm"><p>Connexion au portail · Chargement des plis · Vérification de la signature…</p><Progress value={70} /></div>}
      <div className="mt-3 text-sm"><p className="font-medium">Package final</p>{["Dossier administratif", "Dossier technique", "Dossier additif", "Offre financière"].map((f) => <p key={f} className="text-xs text-muted-foreground">📁 {f} — {d.checklist.filter((p) => p.section === f).length} fichiers · AO-{ao.ref.replace(/[^\w]+/g, "-")}_{d.id}_&lt;pièce&gt;.pdf</p>)}<p className="text-xs text-success">Taille totale 18,4 Mo — conforme</p></div>
      {d.depot && <div className="mt-3 rounded-lg border border-success/50 bg-success/10 p-3 text-sm">Accusé de réception : <b>{d.depot.accuse}</b> · horodatage {fdatetime(d.depot.at)} · ouverture des plis le {fdate(d.ouverture)}</div>}</>}</Card>,
    8: <Card title="Suivi & résultat">{!d.depot ? <p className="text-sm text-muted-foreground">Disponible après le dépôt.</p> : d.resultat ? <div className="space-y-1 text-sm"><Status s={d.resultat.decision} /><p>Rang : {d.resultat.rang} · Prix retenu : {money(d.resultat.prixRetenu)} · Attributaire : {d.resultat.attributaire}</p>{d.resultat.motif && <p>Retour d'expérience : {d.resultat.motif}</p>}{d.resultat.decision === "Gagné" && <p className="text-success">Marché créé · caution définitive demandée · ordre de service à suivre · CA ajouté aux objectifs de l'agence.</p>}</div> : <div className="space-y-3 text-sm">
      <p>Séance d'ouverture des plis : {fdate(d.ouverture)} — siège du maître d'ouvrage.</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => { upd((x) => { x.resultat = { decision: "Gagné", rang: 1, prixRetenu: x.acteMontant ?? 0, attributaire: "LGTP" }; x.statut = "Résultat"; }, "Résultat : Gagné"); s.set((x) => ({ cautions: [...x.cautions, { id: `ct${Date.now()}`, type: "définitive", aoId: ao.id, banque: "Attijariwafa bank", montant: Math.round((d.acteMontant ?? 0) * 0.03), emission: new Date().toISOString(), validite: addDays(365).toISOString(), statut: "Demandée", frais: 0 }], decomptes: [...x.decomptes, { id: `dc${Date.now()}`, num: "Décompte provisoire n° 1 (prévu)", marche: `${ao.mo} — ${ao.objet.slice(0, 30)}`, executes: 0, cumul: 0, statut: "Établi", date: addDays(30).toISOString() }] })); pulse(); toast.success("Gagné ! Marché, caution définitive et échéancier de décomptes créés"); }}>Gagné</Button>
        <Button variant="outline" onClick={() => { const m = window.prompt("Motif de la perte (retour d'expérience)", "Prix supérieur à l'attributaire"); if (!m) return; upd((x) => { x.resultat = { decision: "Perdu", rang: 2, prixRetenu: (x.acteMontant ?? 0) * 0.92, attributaire: "Concurrent", motif: m }; x.statut = "Résultat"; }, `Résultat : Perdu — ${m}`); toast("Résultat enregistré : Perdu"); }}>Perdu</Button>
        <Button variant="ghost" onClick={() => { upd((x) => { x.resultat = { decision: "Sans suite", rang: 0, prixRetenu: 0, attributaire: "—" }; }, "Résultat : Sans suite"); toast("AO déclaré sans suite"); }}>Sans suite</Button>
        <Button variant="secondary" onClick={() => { upd((x) => x.messages.push({ id: String(Date.now()), text: "Demande d'éclaircissement du maître d'ouvrage sur le programme de sondages", due: addDays(3).toISOString(), answered: false }), "Clarification reçue"); toast("Demande d'éclaircissement enregistrée"); }}>Enregistrer une clarification</Button>
      </div></div>}</Card>,
  };

  return (
    <div className="space-y-4">
      <PageHeader title={`${d.id.toUpperCase()} — ${ao.mo}`} crumbs={[{ label: "Marchés publics" }, { label: "Dossiers", to: "/admin/marches/dossiers" }, { label: d.id.toUpperCase() }]} sub={<span className="flex flex-wrap items-center gap-2">{ao.objet} · {ao.ref} <Jr j={j} /> <Status s={d.resultat?.decision ?? d.statut} /></span>} actions={<><Button variant="outline" onClick={() => nav({ to: "/admin/marches/opportunites" })}>Voir l'AO</Button><AgentPanel agent="dossier" /></>} />
      {j >= 0 && j <= 3 && !d.depot && <div className="flex items-center gap-2 rounded-lg bg-destructive p-3 text-sm font-medium text-destructive-foreground"><AlertTriangle className="h-4 w-4" />Date limite de dépôt dans {j} jour(s) — {fdate(ao.deadline)}</div>}
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {STEPS.map((l, i) => <li key={l}><button onClick={() => setView(i + 1)} className={cn("w-full rounded-lg border p-2 text-left text-xs transition", step === i + 1 && "border-primary ring-2 ring-primary/30", i + 1 < d.step && "bg-success/10", i + 1 === d.step && "bg-gold/15")}><span className="font-bold">{i + 1}.</span> {l}</button></li>)}
      </ol>
      <Tabs defaultValue="step">
        <TabsList className="flex-wrap"><TabsTrigger value="step">Étape {step}</TabsTrigger><TabsTrigger value="chrono">Chronologie</TabsTrigger><TabsTrigger value="tasks">Tâches</TabsTrigger><TabsTrigger value="docs">Documents</TabsTrigger><TabsTrigger value="msgs">Messages ({d.messages.length})</TabsTrigger></TabsList>
        <TabsContent value="step">{panels[step]}</TabsContent>
        <TabsContent value="chrono"><Card>{audit.length ? audit.map((a) => <p key={a.id} className="border-b py-1 text-sm"><span className="text-xs text-muted-foreground">{fdatetime(a.at)}</span> · <b>{a.author}</b> — {a.msg}</p>) : <p className="text-sm text-muted-foreground">Aucun événement dans cette session.</p>}</Card></TabsContent>
        <TabsContent value="tasks"><Card actions={<Button size="sm" onClick={() => { const t = window.prompt("Nouvelle tâche"); if (t) upd((x) => x.tasks.push({ id: String(Date.now()), text: t, who: s.user, due: addDays(2).toISOString(), done: false }), `Tâche ajoutée : ${t}`); }}>Ajouter</Button>}>{d.tasks.map((t) => <label key={t.id} className="flex items-center gap-2 border-b py-1.5 text-sm"><input type="checkbox" checked={t.done} onChange={() => upd((x) => (x.tasks.find((y) => y.id === t.id)!.done = !t.done))} /><span className={cn("flex-1", t.done && "line-through")}>{t.text}</span><span className="text-xs text-muted-foreground">{t.who} · {fdate(t.due)}</span></label>)}</Card></TabsContent>
        <TabsContent value="docs"><Card>{d.generated.length ? d.generated.map((g) => <div key={g} className="flex items-center justify-between border-b py-1.5 text-sm">{g}<Button size="sm" variant="ghost" onClick={() => genDoc(g, d, ao, extra)}>Télécharger</Button></div>) : <p className="text-sm text-muted-foreground">Aucun document généré.</p>}</Card></TabsContent>
        <TabsContent value="msgs"><Card>{d.messages.length ? d.messages.map((m) => <div key={m.id} className="flex items-center gap-2 border-b py-1.5 text-sm"><span className="flex-1">{m.text}</span><span className="text-xs">réponse avant {fdate(m.due)}</span><Button size="sm" variant="outline" disabled={m.answered} onClick={() => upd((x) => (x.messages.find((y) => y.id === m.id)!.answered = true), "Clarification répondue")}>{m.answered ? "Répondu" : "Marquer répondu"}</Button></div>) : <p className="text-sm text-muted-foreground">Aucune clarification.</p>}</Card></TabsContent>
      </Tabs>
      <Dialog open={!!pdfUrl} onOpenChange={(o) => !o && setPdfUrl(null)}><DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Aperçu du document</DialogTitle></DialogHeader>{pdfUrl && <iframe src={pdfUrl} className="h-[70vh] w-full rounded border" title="Aperçu PDF" />}</DialogContent></Dialog>
    </div>
  );
}
