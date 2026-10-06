import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, ChevronDown, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, RotateCcw, Search, Sun, Wind } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { NAV } from "@/lib/nav";
import { assertConsistency, useStore } from "@/lib/store";
import { ROLES, type Role } from "@/lib/seed";
import { fdatetime, daysUntil } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

function useBadges() {
  const s = useStore();
  return {
    decide: s.aos.filter((a) => a.statut === "À décider").length,
    dossiers: s.dossiers.filter((d) => !d.resultat && daysUntil(s.aos.find((a) => a.id === d.aoId)!.deadline) <= 3 && daysUntil(s.aos.find((a) => a.id === d.aoId)!.deadline) >= 0).length,
    docs: s.docsPerm.filter((d) => d.expiration && daysUntil(d.expiration) <= 30).length,
    prev: s.previsions.filter((p) => p.statut === "En retard").length,
    rappro: s.releves.filter((r) => r.statut === "Non identifié").length,
    compta: s.queue.filter((q) => q.agent === "compta" && q.statut === "En attente").length,
  } as Record<string, number>;
}

function Sidebar({ collapsed, onNav }: { collapsed: boolean; onNav?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const role = useStore((s) => s.role);
  const badges = useBadges();
  const [closed, setClosed] = useState<string[]>([]);
  return (
    <nav className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-center p-3">
        {collapsed ? <img src="/favicon.svg" alt="LGTP" className="h-8 w-8" /> : <img src="/logo-light.svg" alt="LGTP — Géotechnique,Essais et Expertises" className="h-20" />}
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {NAV.filter((g) => !g.roles || g.roles.includes(role)).map((g) => {
          const single = g.items.length === 1;
          const open = !closed.includes(g.label);
          return (
            <div key={g.label}>
              {!single && collapsed && <div className="mx-3 my-2 h-px bg-sidebar-border" />}
              {!single && !collapsed && (
                <button onClick={() => setClosed((c) => (open ? [...c, g.label] : c.filter((x) => x !== g.label)))} className="mt-3 flex w-full items-center gap-2 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider opacity-60 hover:opacity-100">
                  <g.icon className="h-3.5 w-3.5" />{g.label}<ChevronDown className={cn("ml-auto h-3 w-3 transition", !open && "-rotate-90")} />
                </button>
              )}
              {(open || collapsed || single) && g.items.map((it) => {
                const active = it.to === "/admin" ? path === "/admin" || path === "/admin/" : path === it.to || (path.startsWith(it.to + "/") && !g.items.some((o) => o.to !== it.to && o.to.startsWith(it.to) && path.startsWith(o.to)));
                const n = it.badge ? badges[it.badge] : 0;
                return (
                  <Link key={it.to} to={it.to} onClick={onNav} title={it.label} className={cn("group/nav relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-all duration-200 hover:translate-x-0.5 hover:bg-sidebar-accent", collapsed && "justify-center px-0", active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_var(--sidebar-border)]")}>
                    {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-sidebar-primary" />}
                    <it.icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-sidebar-primary" : "opacity-70 group-hover/nav:opacity-100")} />
                    {!collapsed && <span className="truncate">{it.label}</span>}
                    {collapsed && n > 0 && <span className="absolute right-1.5 top-1 h-2 w-2 rounded-full bg-sidebar-primary" />}
                    {!collapsed && n > 0 && <span className="ml-auto rounded-full bg-sidebar-primary px-1.5 text-[10px] font-bold text-sidebar-primary-foreground">{n}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function CmdK({ open, setOpen }: { open: boolean; setOpen: (b: boolean) => void }) {
  const s = useStore();
  const nav = useNavigate();
  const go = (to: string) => { setOpen(false); nav({ to }); };
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Rechercher AO, dossiers, clients, agences, pages…" />
      <CommandList>
        <CommandEmpty>Aucun résultat.</CommandEmpty>
        <CommandGroup heading="Pages">{NAV.flatMap((g) => g.items).map((i) => <CommandItem key={i.to} onSelect={() => go(i.to)}>{i.label}</CommandItem>)}</CommandGroup>
        <CommandGroup heading="Dossiers">{s.dossiers.map((d) => { const a = s.aos.find((x) => x.id === d.aoId)!; return <CommandItem key={d.id} value={`${d.id} ${a.mo} ${a.objet}`} onSelect={() => go(`/admin/marches/dossiers/${d.id}`)}>{d.id.toUpperCase()} — {a.mo}</CommandItem>; })}</CommandGroup>
        <CommandGroup heading="Appels d'offres">{s.aos.filter((a) => a.pertinent).slice(0, 40).map((a) => <CommandItem key={a.id} value={`${a.ref} ${a.mo} ${a.objet}`} onSelect={() => go(`/admin/marches/opportunites?ao_q=${encodeURIComponent(a.ref)}`)}>{a.ref} — {a.objet.slice(0, 60)}</CommandItem>)}</CommandGroup>
        <CommandGroup heading="Clients">{s.clients.map((c) => <CommandItem key={c.id} value={c.nom} onSelect={() => go(`/admin/clients?cl_q=${encodeURIComponent(c.nom)}`)}>{c.nom}</CommandItem>)}</CommandGroup>
        <CommandGroup heading="Agences">{s.agences.map((a) => <CommandItem key={a.id} value={a.nom} onSelect={() => go(`/admin/compta/agences/${a.id}`)}>{a.nom}</CommandItem>)}</CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

function AdminLayout() {
  const s = useStore();
  const nav = useNavigate();
  const path = useRouterState({ select: (x) => x.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [cmd, setCmd] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!s.authed) {
      const saved = sessionStorage.getItem("lgtp-auth");
      if (saved) { const { i } = JSON.parse(saved); s.set(() => ({ authed: true, role: ROLES[i].role, user: ROLES[i].name })); }
      else { nav({ to: "/admin/login" }); return; }
    }
    const dark = localStorage.getItem("lgtp-dark") === "1";
    s.set(() => ({ dark }));
    assertConsistency(useStore.getState());
    setReady(true);
  }, []); // eslint-disable-line
  useEffect(() => { document.documentElement.classList.toggle("dark", s.dark); localStorage.setItem("lgtp-dark", s.dark ? "1" : "0"); }, [s.dark]);
  useEffect(() => { document.documentElement.classList.toggle("reduce-motion", s.reduceMotion); }, [s.reduceMotion]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmd(true); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);

  const notifs = useMemo(() => s.notifs, [s.notifs]);
  const unread = notifs.filter((n) => !n.read).length;
  if (!ready) return <div className="min-h-screen bg-background" />;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={cn("sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border transition-all md:block", collapsed ? "w-16" : "w-64")}><Sidebar collapsed={collapsed} /></aside>
      <Sheet open={mobile} onOpenChange={setMobile}><SheetContent side="left" className="w-72 border-0 p-0"><Sidebar collapsed={false} onNav={() => setMobile(false)} /></SheetContent></Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-3 md:px-5">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobile(true)} aria-label="Menu"><Menu className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => setCollapsed(!collapsed)} aria-label="Réduire la barre latérale">{collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}</Button>
          <button onClick={() => setCmd(true)} className="flex h-9 w-full max-w-md items-center gap-2 rounded-lg border bg-background/70 px-3 text-sm text-muted-foreground hover:border-primary">
            <Search className="h-4 w-4" /><span className="flex-1 text-left">Rechercher…</span><kbd className="rounded border px-1.5 text-[10px]">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild><Button variant="ghost" size="icon" className="relative" aria-label="Notifications"><Bell className="h-5 w-5" />{unread > 0 && <span className="absolute right-1 top-1 rounded-full bg-gold px-1 text-[10px] font-bold text-gold-foreground">{unread}</span>}</Button></PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b p-3"><b className="text-sm">Notifications</b><Button variant="link" size="sm" className="h-auto p-0" onClick={() => s.set((x) => ({ notifs: x.notifs.map((n) => ({ ...n, read: true })) }))}>Tout marquer lu</Button></div>
                <div className="max-h-80 overflow-y-auto">
                  {notifs.map((n) => <Link key={n.id} to={n.link} onClick={() => s.set((x) => ({ notifs: x.notifs.map((m) => (m.id === n.id ? { ...m, read: true } : m)) }))} className={cn("block border-b px-3 py-2 text-sm hover:bg-muted", !n.read && "bg-accent/50")}>{n.text}<div className="text-xs text-muted-foreground">{fdatetime(n.at)} · {n.to}</div></Link>)}
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" onClick={() => s.set((x) => ({ dark: !x.dark }))} aria-label="Changer de thème">{s.dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" className="gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-primary-foreground">{s.user.split(" ").map((p) => p[0]).join("").slice(0, 2)}</span><span className="hidden text-left text-xs leading-tight lg:block"><b className="block">{s.user}</b>{s.role}</span></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Changer de rôle</DropdownMenuLabel>
                {ROLES.map((r, i) => <DropdownMenuItem key={r.role} onClick={() => { s.set(() => ({ role: r.role as Role, user: r.name })); sessionStorage.setItem("lgtp-auth", JSON.stringify({ i })); toast.success(`Rôle : ${r.role}`); }}>{r.role} {s.role === r.role && "✓"}</DropdownMenuItem>)}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => s.set((x) => ({ reduceMotion: !x.reduceMotion }))}><Wind className="mr-2 h-4 w-4" />Réduire les animations {s.reduceMotion && "✓"}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConfirmReset(true)}><RotateCcw className="mr-2 h-4 w-4" />Réinitialiser les données de démo</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { sessionStorage.removeItem("lgtp-auth"); s.set(() => ({ authed: false })); nav({ to: "/admin/login" }); }}><LogOut className="mr-2 h-4 w-4" />Se déconnecter</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 px-3 py-5 md:px-6">
          <AnimatePresence mode="wait">
            <motion.div key={path} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}><Outlet /></motion.div>
          </AnimatePresence>
        </main>
        <footer className="flex items-center justify-between border-t px-6 py-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} LGTP S.A.R.L. — Classe 1</span>
          <span className="rounded-full border border-gold/60 bg-gold/15 px-2.5 py-0.5 font-medium text-foreground">Données fictives — démonstration</span>
        </footer>
      </div>
      <CmdK open={cmd} setOpen={setCmd} />
      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Réinitialiser les données de démo ?</AlertDialogTitle><AlertDialogDescription>Toutes les modifications effectuées seront perdues.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => s.reset()}>Réinitialiser</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
