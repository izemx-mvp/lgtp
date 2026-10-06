import { BarChart3, Building2, FileText, Gavel, Headset, LayoutDashboard, Users, Wallet, type LucideIcon } from "lucide-react";
import type { Role } from "./seed";

export interface NavItem { label: string; to: string; badge?: string }
export interface NavGroup { label: string; icon: LucideIcon; items: NavItem[]; roles?: Role[] }

export const NAV: NavGroup[] = [
  { label: "Tableau de bord", icon: LayoutDashboard, items: [{ label: "Tableau de bord", to: "/admin" }] },
  { label: "Marchés publics", icon: Gavel, roles: ["Direction", "Responsable Marchés", "Resp. région Sud", "Chargé marchés"], items: [
    { label: "Veille", to: "/admin/marches/veille" }, { label: "Opportunités", to: "/admin/marches/opportunites", badge: "decide" },
    { label: "Dossiers", to: "/admin/marches/dossiers", badge: "dossiers" }, { label: "Bons de commande", to: "/admin/marches/bons-de-commande" },
    { label: "Cautions", to: "/admin/marches/cautions" }, { label: "Documents", to: "/admin/marches/documents", badge: "docs" },
    { label: "Prix", to: "/admin/marches/prix" }, { label: "Références & moyens", to: "/admin/marches/references" },
    { label: "Résultats", to: "/admin/marches/resultats" }, { label: "Réglementation", to: "/admin/marches/reglementation" },
  ] },
  { label: "Comptabilité & Agences", icon: Wallet, roles: ["Direction", "Compta & Finances", "Chef d'agence", "Resp. région Sud"], items: [
    { label: "Vue d'ensemble", to: "/admin/compta" }, { label: "Agences", to: "/admin/compta/agences" }, { label: "Objectifs", to: "/admin/compta/objectifs" },
    { label: "Prévisions mensuelles", to: "/admin/compta/previsions", badge: "prev" }, { label: "Facturation", to: "/admin/compta/facturation" },
    { label: "Encaissements", to: "/admin/compta/encaissements", badge: "rappro" }, { label: "Créances", to: "/admin/compta/creances" },
    { label: "Fournisseurs & dépenses", to: "/admin/compta/fournisseurs" }, { label: "Trésorerie", to: "/admin/compta/tresorerie" },
    { label: "Budget & marges", to: "/admin/compta/budget" }, { label: "Clôture mensuelle", to: "/admin/compta/cloture" },
    { label: "Obligations", to: "/admin/compta/obligations" }, { label: "Imports", to: "/admin/compta/imports" }, { label: "Agent Compta", to: "/admin/compta/agent", badge: "compta" },
  ] },
  { label: "Clients", icon: Users, items: [{ label: "Leads", to: "/admin/clients/leads" }, { label: "Clients", to: "/admin/clients" }, { label: "Devis & relances", to: "/admin/clients/devis" }] },
  { label: "Service client", icon: Headset, items: [{ label: "Service client", to: "/admin/service-client" }] },
  { label: "Rapports", icon: BarChart3, items: [{ label: "Rapports", to: "/admin/rapports" }] },
];
export const GROUP_ICONS = { Building2, FileText };
