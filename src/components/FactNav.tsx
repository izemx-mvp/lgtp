import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function FactNav() {
  const p = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [["Factures", "/admin/compta/facturation"], ["Décomptes", "/admin/compta/facturation/decomptes"], ["Avoirs", "/admin/compta/facturation/avoirs"]];
  return (
    <div className="mb-4 inline-flex rounded-lg bg-muted p-1">
      {tabs.map(([l, to]) => <Link key={to} to={to} className={cn("rounded-md px-3 py-1.5 text-sm", (p === to || p === to + "/") && "bg-card font-medium shadow-sm")}>{l}</Link>)}
    </div>
  );
}
