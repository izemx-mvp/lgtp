import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable } from "@/components/DataTable";
import { AgentPanel } from "@/components/AgentPanel";
import { Card, Kpi, PageHeader, Status } from "@/components/ui-kit";
import { aging, factTTC, useStore } from "@/lib/store";
import { fdate, kdh, money } from "@/lib/format";
import { downloadCSV } from "@/lib/pdf";

export const Route = createFileRoute("/admin/compta/creances")({
  head: () => ({ meta: [{ title: "Créances — LGTP" }, { name: "description", content: "Balance âgée et plan de relance." }, { property: "og:title", content: "Créances — LGTP" }, { property: "og:description", content: "Balance âgée." }] }),
  component: Page,
});

function Page() {
  const s = useStore();
  const [rel, setRel] = useState<string | null>(null);
  const [litige, setLitige] = useState<string[]>([]);
  const ag = aging(s);
  const rows = s.factures.filter((f) => factTTC(f) - f.paye > 1 && !["Brouillon", "Annulée"].includes(f.statut)).map((f) => { const age = Math.round((Date.now() - new Date(f.echeance).getTime()) / 864e5); const c = s.clients.find((x) => x.id === f.clientId)!; return { ...f, client: c.nom, public: c.public, reste: factTTC(f) - f.paye, retard: Math.max(0, age), scenario: age > 60 ? "Escalade Direction / contentieux" : age > 30 ? "Mise en demeure" : age > 15 ? "Relance ferme" : age > 5 ? "Relance courtoise" : "Non échue", litige: litige.includes(f.id) ? "Litige" : "—" }; });
  const top = Object.entries(rows.reduce((m, r) => ((m[r.client] = (m[r.client] ?? 0) + r.reste), m), {} as Record<string, number>)).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const cur = rows.find((r) => r.id === rel);
  const msg = cur ? (cur.retard > 30 ? `Objet : Mise en demeure — facture ${cur.num}\n\nMadame, Monsieur, malgré nos relances, la facture ${cur.num} d'un montant de ${money(cur.reste)} reste impayée depuis ${cur.retard} jours. Nous vous mettons en demeure de procéder au règlement sous 8 jours.` : `Bonjour, sauf erreur de notre part, la facture ${cur.num} de ${money(cur.reste)} arrivée à échéance le ${fdate(cur.echeance)} reste en attente de règlement. Merci de votre retour. — LGTP`) : "";
  return (
    <div className="space-y-4">
      <PageHeader title="Créances" crumbs={[{ label: "Comptabilité & Agences" }, { label: "Créances" }]} actions={<><Button variant="outline" onClick={() => { downloadCSV("balance-agee.csv", ["Client", "Facture", "Reste", "Retard (j)"], rows.map((r) => [r.client, r.num, r.reste.toFixed(2), r.retard])); toast.success("Balance âgée exportée"); }}>Exporter la balance âgée</Button><AgentPanel agent="relances" label="Agent Relances" /></>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{Object.entries(ag).map(([k, v]) => <Kpi key={k} label={`${k} jours`} value={v} format={kdh} tone={k === "> 90" ? "bad" : k === "61-90" ? "warn" : undefined} />)}<Kpi label="DSO" value={Math.round((Object.values(ag).reduce((a, b) => a + b, 0) / (s.factures.reduce((a, f) => a + factTTC(f), 0) || 1)) * 120)} format={(n) => `${Math.round(n)} j`} /></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Balance âgée"><ResponsiveContainer width="100%" height={180}><BarChart data={Object.entries(ag).map(([k, v]) => ({ k, v }))}><XAxis dataKey="k" /><YAxis tickFormatter={(v) => `${v / 1000}k`} /><Tooltip formatter={(v: number) => money(v, 0)} /><Bar dataKey="v" fill="var(--clay)" radius={4} /></BarChart></ResponsiveContainer></Card>
        <Card title="Top débiteurs">{top.map(([c, v]) => <p key={c} className="flex justify-between border-b py-1 text-sm">{c}<b>{money(v, 0)}</b></p>)}</Card>
      </div>
      <DataTable id="cr" rows={rows} columns={[{ key: "client", label: "Client", filter: true }, { key: "num", label: "Facture" }, { key: "agence", label: "Agence", filter: true }, { key: "reste", label: "Reste dû", align: "right", render: (r) => money(r.reste) }, { key: "retard", label: "Retard", align: "right", render: (r) => <span className={r.retard > 60 ? "font-bold text-destructive" : ""}>{r.retard} j</span> }, { key: "scenario", label: "Scénario", filter: true }, { key: "public", label: "Intérêts moratoires", value: (r) => (r.public && r.retard > 0 ? Math.round(r.reste * 0.0075 * (r.retard / 30)) : 0), render: (r) => (r.public && r.retard > 0 ? money(r.reste * 0.0075 * (r.retard / 30), 0) : "—") }, { key: "litige", label: "Litige", filter: true, render: (r) => (r.litige === "Litige" ? <Status s="Bloquant" /> : "—") }]}
        actions={(r) => <><Button size="sm" onClick={() => setRel(r.id)}>Relancer</Button><Button size="sm" variant="ghost" onClick={() => { const d = window.prompt("Promesse de paiement — date (jj/mm/aaaa)"); if (d) { s.log(s.user, "Créance", r.id, `Promesse de paiement au ${d}`); toast.success(`Promesse enregistrée au ${d}`); } }}>Promesse</Button><Button size="sm" variant="ghost" onClick={() => toast("Contestation enregistrée")}>Contester</Button><Button size="sm" variant="ghost" onClick={() => { setLitige((l) => [...l, r.id]); toast.success("Passée en litige"); }}>Litige</Button></>} />
      <Dialog open={!!rel} onOpenChange={(o) => !o && setRel(null)}><DialogContent><DialogHeader><DialogTitle>Relance — {cur?.scenario}</DialogTitle></DialogHeader><Textarea rows={8} defaultValue={msg} />
        <DialogFooter>{["WhatsApp", "E-mail", "Lettre"].map((c) => <Button key={c} variant={c === "E-mail" ? "default" : "outline"} onClick={() => { s.log(s.user, "Créance", rel!, `Relance ${c} envoyée`); toast.success(`Relance ${c} envoyée`); setRel(null); }}>{c}</Button>)}</DialogFooter></DialogContent></Dialog>
    </div>
  );
}
