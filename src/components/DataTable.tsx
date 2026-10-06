import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ask, confirmAsk } from "@/lib/dialogs";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Eye, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Columns3, Download, Filter, Rows3, Save, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { downloadCSV, makePdf } from "@/lib/pdf";
import { useStore } from "@/lib/store";
import { EmptyState } from "./ui-kit";

export interface Col<T> {
  key: string; label: string; value?: (r: T) => string | number; render?: (r: T) => ReactNode;
  filter?: boolean; hidden?: boolean; align?: "right"; className?: string;
}
interface Props<T> {
  id: string; rows: T[]; columns: Col<T>[]; rowKey?: (r: T) => string; onRowClick?: (r: T) => void;
  bulk?: { label: string; onClick: (ids: string[]) => void; variant?: "default" | "destructive" | "outline" }[];
  actions?: (r: T) => ReactNode; toolbar?: ReactNode; title?: string; pageSize?: number; empty?: ReactNode;
}

function useUrlState(prefix: string) {
  const search = useRouterState({ select: (s) => s.location.search }) as Record<string, unknown>;
  const navigate = useNavigate();
  const get = (k: string) => (search[`${prefix}${k}`] as string | number | undefined) ?? undefined;
  const set = (patch: Record<string, string | number | undefined>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigate({ to: ".", replace: true, search: ((prev: Record<string, unknown>) => { const n = { ...prev }; Object.entries(patch).forEach(([k, v]) => { if (v === undefined || v === "") delete n[`${prefix}${k}`]; else n[`${prefix}${k}`] = v; }); return n; }) as any });
  };
  return { get, set, raw: search };
}

const Hl = ({ text, q }: { text: string; q: string }) => {
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="rounded bg-gold/40 px-0.5 text-foreground">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
};

export function DataTable<T extends object>({ id, rows, columns, rowKey = (r) => String((r as { id?: string }).id), onRowClick, bulk, actions, toolbar, title, pageSize = 10, empty }: Props<T>) {
  const u = useUrlState(`${id}_`);
  const q = String(u.get("q") ?? "");
  const [qLocal, setQLocal] = useState(q);
  const page = Number(u.get("page") ?? 1);
  const size = Number(u.get("size") ?? pageSize);
  const sort = String(u.get("sort") ?? "");
  const filters: Record<string, string[]> = useMemo(() => { const f: Record<string, string[]> = {}; columns.filter((c) => c.filter).forEach((c) => { const v = u.get(`f_${c.key}`); if (v) f[c.key] = String(v).split("|"); }); return f; }, [u.raw]); // eslint-disable-line
  const [hidden, setHidden] = useState<string[]>(columns.filter((c) => c.hidden).map((c) => c.key));
  const [dense, setDense] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [focus, setFocus] = useState(-1);
  const [detail, setDetail] = useState<T | null>(null);
  const openRow = (r: T) => (onRowClick ? onRowClick(r) : setDetail(r));
  const views = useStore((s) => s.savedViews[id]) ?? [];
  const setStore = useStore((s) => s.set);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 280); return () => clearTimeout(t); }, []);
  useEffect(() => { const t = setTimeout(() => { if (qLocal !== q) u.set({ q: qLocal, page: undefined }); }, 250); return () => clearTimeout(t); }, [qLocal]); // eslint-disable-line

  const val = (c: Col<T>, r: T) => (c.value ? c.value(r) : ((r as Record<string, unknown>)[c.key] as string | number) ?? "");
  const visibleCols = columns.filter((c) => !hidden.includes(c.key));

  const filtered = useMemo(() => {
    let out = rows;
    Object.entries(filters).forEach(([k, vs]) => { const c = columns.find((x) => x.key === k)!; out = out.filter((r) => vs.includes(String(val(c, r)))); });
    if (q) { const ql = q.toLowerCase(); out = out.filter((r) => visibleCols.some((c) => String(val(c, r)).toLowerCase().includes(ql))); }
    if (sort) {
      const keys = sort.split(",").map((s) => ({ k: s.replace(/^-/, ""), d: s.startsWith("-") ? -1 : 1 }));
      out = [...out].sort((a, b) => { for (const { k, d } of keys) { const c = columns.find((x) => x.key === k); if (!c) continue; const va = val(c, a), vb = val(c, b); const r = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "fr"); if (r) return r * d; } return 0; });
    }
    return out;
  }, [rows, filters, q, sort, hidden]); // eslint-disable-line

  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const cur = Math.min(page, pages);
  const slice = filtered.slice((cur - 1) * size, cur * size);

  const toggleSort = (k: string, multi: boolean) => {
    const parts = sort ? sort.split(",") : [];
    const ex = parts.find((p) => p.replace(/^-/, "") === k);
    let next: string[];
    const nv = !ex ? k : ex.startsWith("-") ? null : `-${k}`;
    if (multi) next = parts.filter((p) => p.replace(/^-/, "") !== k).concat(nv ? [nv] : []);
    else next = nv ? [nv] : [];
    u.set({ sort: next.join(",") || undefined });
  };
  const setFilter = (k: string, vs: string[]) => u.set({ [`f_${k}`]: vs.join("|") || undefined, page: undefined });
  const resetAll = () => { const p: Record<string, undefined> = { q: undefined, page: undefined, sort: undefined }; columns.forEach((c) => (p[`f_${c.key}`] = undefined)); u.set(p); setQLocal(""); };

  const exportRows = () => filtered.map((r) => visibleCols.map((c) => String(val(c, r))));
  const allKeys = slice.map(rowKey);
  const allSel = allKeys.length > 0 && allKeys.every((k) => sel.includes(k));

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setFocus((f) => Math.min(slice.length - 1, f + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setFocus((f) => Math.max(0, f - 1)); }
    if (e.key === "Enter" && focus >= 0) openRow(slice[focus]);
  };

  return (
    <div className="rounded-xl border bg-card card-elev">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        {title && <h3 className="mr-2 text-sm font-semibold">{title}</h3>}
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={qLocal} onChange={(e) => setQLocal(e.target.value)} placeholder="Rechercher…" className="h-9 pl-8" />
        </div>
        {columns.filter((c) => c.filter).map((c) => {
          const counts = new Map<string, number>();
          rows.forEach((r) => { const v = String(val(c, r)); counts.set(v, (counts.get(v) ?? 0) + 1); });
          const active = filters[c.key] ?? [];
          return (
            <Popover key={c.key}>
              <PopoverTrigger asChild>
                <Button variant={active.length ? "secondary" : "outline"} size="sm" className="h-9 gap-1"><Filter className="h-3.5 w-3.5" />{c.label}{active.length ? ` · ${active.length}` : ""}</Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([v, n]) => (
                    <label key={v} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
                      <Checkbox checked={active.includes(v)} onCheckedChange={(ch) => setFilter(c.key, ch ? [...active, v] : active.filter((x) => x !== v))} />
                      <span className="flex-1 truncate">{v || "—"}</span><span className="text-xs text-muted-foreground">{n}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
        <div className="ml-auto flex items-center gap-1">
          {toolbar}
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-9 gap-1"><Save className="h-4 w-4" />Vues</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Vues enregistrées</DropdownMenuLabel>
              {views.length === 0 && <DropdownMenuItem disabled>Aucune vue</DropdownMenuItem>}
              {views.map((v) => <DropdownMenuItem key={v.name} onClick={() => { const p = Object.fromEntries(new URLSearchParams(v.qs)); u.set(p); toast.success(`Vue « ${v.name} » appliquée`); }}>{v.name}</DropdownMenuItem>)}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async () => { const name = await ask("Nom de la vue", "Ma vue"); if (!name) return; const qs = new URLSearchParams(Object.entries(u.raw).filter(([k]) => k.startsWith(`${id}_`)).map(([k, v]) => [k.slice(id.length + 1), String(v)])).toString(); setStore((s) => ({ savedViews: { ...s.savedViews, [id]: [...(s.savedViews[id] ?? []), { name, qs }] } })); toast.success("Vue enregistrée"); }}>Enregistrer la vue actuelle</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Colonnes"><Columns3 className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {columns.map((c) => <DropdownMenuCheckboxItem key={c.key} checked={!hidden.includes(c.key)} onCheckedChange={(ch) => setHidden((h) => (ch ? h.filter((x) => x !== c.key) : [...h, c.key]))}>{c.label}</DropdownMenuCheckboxItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Densité" onClick={() => setDense((d) => !d)}><Rows3 className="h-4 w-4" /></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-9 gap-1"><Download className="h-4 w-4" />Exporter</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { downloadCSV(`${id}.csv`, visibleCols.map((c) => c.label), exportRows()); toast.success("Export CSV téléchargé"); }}>CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { downloadCSV(`${id}.xls.csv`, visibleCols.map((c) => c.label), exportRows()); toast.success("Export Excel (CSV compatible) téléchargé"); }}>Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { makePdf(title ?? id, [{ table: { head: visibleCols.map((c) => c.label), rows: exportRows().slice(0, 200) } }]); toast.success("Export PDF téléchargé"); }}>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {(Object.keys(filters).length > 0 || q) && (
        <div className="flex flex-wrap items-center gap-1.5 border-b px-3 py-2">
          {q && <Chip label={`« ${q} »`} onX={() => { setQLocal(""); u.set({ q: undefined }); }} />}
          {Object.entries(filters).flatMap(([k, vs]) => vs.map((v) => <Chip key={k + v} label={`${columns.find((c) => c.key === k)?.label}: ${v}`} onX={() => setFilter(k, filters[k].filter((x) => x !== v))} />))}
          <Button variant="link" size="sm" className="h-6" onClick={resetAll}>Réinitialiser</Button>
        </div>
      )}
      {sel.length > 0 && bulk && (
        <div className="flex items-center gap-2 border-b bg-accent px-3 py-2 text-sm">
          <span className="font-medium">{sel.length} sélectionné(s)</span>
          {bulk.map((b) => <Button key={b.label} size="sm" variant={b.variant ?? "default"} onClick={() => { b.onClick(sel); setSel([]); }}>{b.label}</Button>)}
          <Button size="sm" variant="ghost" onClick={() => setSel([])}>Annuler</Button>
        </div>
      )}
      <div ref={scrollRef} onScroll={(e) => setScrolled((e.target as HTMLDivElement).scrollTop > 0)} className="max-h-[62vh] overflow-auto" tabIndex={0} onKeyDown={onKey}>
        <table className="w-full text-sm">
          <thead className={cn("sticky top-0 z-10 bg-card", scrolled && "shadow-[0_4px_8px_-6px_var(--color-foreground)]")}>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              {bulk && <th className="w-8 px-3 py-2.5"><Checkbox checked={allSel} onCheckedChange={(c) => setSel(c ? [...new Set([...sel, ...allKeys])] : sel.filter((k) => !allKeys.includes(k)))} aria-label="Tout sélectionner" /></th>}
              {visibleCols.map((c) => {
                const s = sort.split(",").find((p) => p.replace(/^-/, "") === c.key);
                return (
                  <th key={c.key} className={cn("cursor-pointer select-none whitespace-nowrap px-3 py-2.5 font-medium hover:text-foreground", c.align === "right" && "text-right")} onClick={(e) => toggleSort(c.key, e.shiftKey)}>
                    <span className="inline-flex items-center gap-1">{c.label}{s && (s.startsWith("-") ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}</span>
                  </th>
                );
              })}
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 5 }).map((_, i) => <tr key={i} className="border-b">{visibleCols.map((c) => <td key={c.key} className="px-3 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>)}
            {!loading && slice.map((r, i) => {
              const k = rowKey(r);
              return (
                <tr key={k} onClick={() => openRow(r)} style={{ animationDelay: `${Math.min(i, 12) * 22}ms` }} className={cn("group row-in cursor-pointer border-b transition-colors even:bg-muted/40 hover:bg-accent/70 hover:shadow-[inset_3px_0_0_var(--gold)]", focus === i && "outline-2 -outline-offset-2 outline-ring")}>
                  {bulk && <td className="px-3" onClick={(e) => e.stopPropagation()}><Checkbox checked={sel.includes(k)} onCheckedChange={(c) => setSel(c ? [...sel, k] : sel.filter((x) => x !== k))} /></td>}
                  {visibleCols.map((c) => (
                    <td key={c.key} className={cn("px-3", dense ? "py-1.5" : "py-2.5", c.align === "right" && "text-right tabular-nums", c.className)}>
                      {c.render ? c.render(r) : <Hl text={String(val(c, r))} q={q} />}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-3 text-right" onClick={(e) => e.stopPropagation()}><span className="inline-flex items-center gap-1">{actions?.(r)}<Button size="icon" variant="ghost" className="h-7 w-7 opacity-60 transition group-hover:opacity-100" aria-label="Voir le détail" onClick={() => openRow(r)}><Eye className="h-4 w-4" /></Button></span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (empty ?? <EmptyState title="Aucun résultat" text="Modifiez vos filtres ou votre recherche." action={<Button size="sm" onClick={resetAll}>Réinitialiser les filtres</Button>} />)}
      </div>
      <div className="flex flex-wrap items-center gap-2 p-3 text-sm text-muted-foreground">
        <span>{filtered.length ? `${(cur - 1) * size + 1}-${Math.min(cur * size, filtered.length)} sur ${filtered.length}` : "0 résultat"}</span>
        <select className="ml-2 h-8 rounded-md border bg-background px-2 text-foreground" value={size} onChange={(e) => u.set({ size: e.target.value, page: undefined })} aria-label="Lignes par page">
          {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={cur <= 1} onClick={() => u.set({ page: 1 })} aria-label="Première page"><ChevronsLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={cur <= 1} onClick={() => u.set({ page: cur - 1 })} aria-label="Page précédente"><ChevronLeft className="h-4 w-4" /></Button>
          <span className="px-2">Page <input className="w-10 rounded border bg-background px-1 text-center text-foreground" defaultValue={cur} key={cur} onKeyDown={(e) => { if (e.key === "Enter") u.set({ page: Math.min(pages, Math.max(1, Number((e.target as HTMLInputElement).value))) }); }} aria-label="Aller à la page" /> / {pages}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={cur >= pages} onClick={() => u.set({ page: cur + 1 })} aria-label="Page suivante"><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={cur >= pages} onClick={() => u.set({ page: pages })} aria-label="Dernière page"><ChevronsRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {detail && <>
            <SheetHeader><SheetTitle>{String(val(columns[0], detail))}</SheetTitle><p className="text-xs text-muted-foreground">{title ?? "Détail"}</p></SheetHeader>
            <dl className="mt-5 divide-y rounded-xl border">
              {columns.map((c) => <div key={c.key} className="grid grid-cols-[40%_60%] gap-2 px-4 py-2.5 text-sm"><dt className="text-muted-foreground">{c.label}</dt><dd className="font-medium">{c.render ? c.render(detail) : String(val(c, detail) || "—")}</dd></div>)}
            </dl>
            {actions && <div className="mt-5 flex flex-wrap gap-2 rounded-xl bg-muted p-3"><span className="w-full text-xs font-semibold uppercase text-muted-foreground">Actions</span>{actions(detail)}</div>}
          </>}
        </SheetContent>
      </Sheet>
    </div>
  );
}

const Chip = ({ label, onX }: { label: string; onX: () => void }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">{label}<button onClick={onX} aria-label="Retirer"><X className="h-3 w-3" /></button></span>
);
