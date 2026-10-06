import { useState } from "react";
import { Check, Loader2, Play, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStore, type AgentId } from "@/lib/store";
import { fdatetime, money } from "@/lib/format";
import { Status } from "./ui-kit";
import { pulse } from "@/lib/pulse";

export function AgentPanel({ agent, extra, label = "Agent IA" }: { agent: AgentId; extra?: React.ReactNode; label?: string }) {
  const a = useStore((s) => s.agents.find((x) => x.id === agent))!;
  const queue = useStore((s) => s.queue.filter((q) => q.agent === agent));
  const runs = useStore((s) => s.runs.filter((r) => r.agent === agent));
  const { set, approve, runAgent } = useStore.getState();
  const [running, setRunning] = useState<string[] | null>(null);
  const [done, setDone] = useState(0);
  const pending = queue.filter((q) => q.statut === "En attente");
  const upd = (fn: (x: typeof a) => void) => set((s) => ({ agents: s.agents.map((x) => { if (x.id !== agent) return x; const c = structuredClone(x); fn(c); return c; }) }));

  const run = () => {
    if (!a.actif) { toast.error("Agent en pause — activez-le d'abord"); return; }
    const steps = runAgent(agent); setRunning(steps); setDone(0);
    steps.forEach((_, i) => setTimeout(() => { setDone(i + 1); if (i === steps.length - 1) { toast.success(`${a.nom} : exécution terminée`); pulse(); setTimeout(() => setRunning(null), 1200); } }, 450 * (i + 1)));
  };
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 border-gold/60"><Sparkles className="h-4 w-4 text-gold" />{label}{pending.length > 0 && <span className="rounded-full bg-gold px-1.5 text-xs font-bold text-gold-foreground">{pending.length}</span>}</Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader><SheetTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-gold" />{a.nom}</SheetTitle><p className="text-xs text-muted-foreground">{a.module} · « L'agent traite en volume, l'humain valide. »</p></SheetHeader>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[["Tâches traitées", a.traitees], ["Temps gagné (h)", a.tempsGagne], ["Taux de validation", `${Math.round((queue.filter((q) => q.statut === "Approuvé").length / Math.max(1, queue.filter((q) => q.statut !== "En attente").length)) * 100) || 92} %`]].map(([l, v]) => (
            <div key={l as string} className="rounded-lg border p-2"><div className="font-display text-lg font-bold">{v}</div><div className="text-[11px] text-muted-foreground">{l}</div></div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border p-3">
          <label className="flex items-center gap-2 text-sm"><Switch checked={a.actif} onCheckedChange={(v) => { upd((x) => (x.actif = v)); toast(v ? "Agent activé" : "Agent en pause"); }} />{a.actif ? <Status s="Actif" /> : <Status s="Pause" />}</label>
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={a.autonomie} onChange={(e) => { upd((x) => (x.autonomie = e.target.value as typeof a.autonomie)); toast.success(`Autonomie : ${e.target.value}`); }} aria-label="Niveau d'autonomie">
            {["Suggère", "Prépare", "Exécute après validation"].map((o) => <option key={o}>{o}</option>)}
          </select>
          <span className="text-xs text-muted-foreground">Planning : {a.planning}</span>
          <Button size="sm" className="ml-auto gap-1" onClick={run} disabled={!!running}>{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}Exécuter maintenant</Button>
        </div>
        {running && (
          <ol className="mt-3 space-y-1 rounded-lg bg-muted p-3 text-sm">
            {running.map((s, i) => <li key={s} className="flex items-center gap-2">{i < done ? <Check className="h-4 w-4 text-success" /> : i === done ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <span className="h-4 w-4" />}{s}</li>)}
          </ol>
        )}
        {extra}
        <Tabs defaultValue="queue" className="mt-4">
          <TabsList className="w-full"><TabsTrigger value="queue">Validation ({pending.length})</TabsTrigger><TabsTrigger value="journal">Journal</TabsTrigger><TabsTrigger value="rules">Règles & modèles</TabsTrigger></TabsList>
          <TabsContent value="queue" className="space-y-2">
            {pending.length > 1 && <Button size="sm" variant="secondary" onClick={() => { pending.forEach((q) => approve(q.id, true)); toast.success(`${pending.length} propositions approuvées`); }}>Tout approuver</Button>}
            {queue.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Aucune proposition.</p>}
            {queue.map((q) => (
              <div key={q.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-start justify-between gap-2"><span>{q.objet}</span><Status s={q.statut} /></div>
                <div className="mt-1 text-xs text-muted-foreground">{fdatetime(q.at)}{q.montant ? ` · ${money(q.montant)}` : ""}{q.agence ? ` · ${q.agence}` : ""}</div>
                {q.statut === "En attente" && (
                  <div className="mt-2 flex gap-1">
                    <Button size="sm" className="h-7 gap-1" onClick={() => { approve(q.id, true); toast.success("Approuvé et exécuté"); }}><Check className="h-3.5 w-3.5" />Approuver</Button>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => { const t = window.prompt("Modifier la proposition", q.objet); if (t) { set((s) => ({ queue: s.queue.map((x) => (x.id === q.id ? { ...x, objet: t } : x)) })); toast.success("Proposition modifiée"); } }}>Modifier</Button>
                    <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => { approve(q.id, false); toast("Proposition rejetée"); }}><X className="h-3.5 w-3.5" />Rejeter</Button>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>
          <TabsContent value="journal" className="space-y-2">
            {runs.map((r) => (
              <div key={r.id} className="rounded-lg border p-3 text-sm">
                <div className="text-xs text-muted-foreground">{fdatetime(r.at)}</div>
                <div><b>Entrées :</b> {r.inputs}</div>
                <div><b>Étapes :</b> {r.steps.join(" → ")}</div>
                <div><b>Sorties :</b> {r.outputs}</div>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="rules" className="space-y-3">
            {a.rules.map((r) => (
              <label key={r.id} className="block text-sm"><span className="text-xs text-muted-foreground">{r.label}</span>
                <Input defaultValue={r.value} onBlur={(e) => { upd((x) => (x.rules.find((y) => y.id === r.id)!.value = e.target.value)); toast.success("Règle enregistrée"); }} /></label>
            ))}
            {a.templates.map((t) => (
              <label key={t.id} className="block text-sm"><span className="text-xs text-muted-foreground">Modèle : {t.nom}</span>
                <Textarea defaultValue={t.texte} onBlur={(e) => { upd((x) => (x.templates.find((y) => y.id === t.id)!.texte = e.target.value)); toast.success("Modèle enregistré"); }} /></label>
            ))}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
