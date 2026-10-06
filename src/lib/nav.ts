import {
  BadgeCheck, BarChart3, BookOpen, Bot, Building2, CalendarCheck, ClipboardList, Coins, FileCheck2, FileSpreadsheet, FileStack, FileText, FolderKanban, Gauge,
  Gavel, Handshake, Headset, Landmark, LayoutDashboard, LineChart, Lock, PiggyBank, Radar, Receipt, ScrollText, ShieldCheck, ShoppingCart, Tags, Target, Trophy, Truck, Upload, UserPlus, Users, Wallet, type LucideIcon,
} from "lucide-react";
import type { Role } from "./seed";

export interface NavItem { label: string; to: string; icon: LucideIcon; badge?: string }
export interface NavGroup { label: string; icon: LucideIcon; items: NavItem[]; roles?: Role[] }

export const NAV: NavGroup[] = [
  { label: "Tableau de bord", icon: LayoutDashboard, items: [{ label: "Tableau de bord", to: "/admin", icon: LayoutDashboard }] },
  { label: "Marchés publics", icon: Gavel, roles: ["Direction", "Responsable Marchés", "Resp. région Sud", "Chargé marchés"], items: [
    { label: "Veille", to: "/admin/marches/veille", icon: Radar }, { label: "Opportunités", to: "/admin/marches/opportunites", icon: Target, badge: "decide" },
    { label: "Dossiers", to: "/admin/marches/dossiers", icon: FolderKanban, badge: "dossiers" }, { label: "Bons de commande", to: "/admin/marches/bons-de-commande", icon: ShoppingCart },
    { label: "Cautions", to: "/admin/marches/cautions", icon: ShieldCheck }, { label: "Documents", to: "/admin/marches/documents", icon: FileStack, badge: "docs" },
    { label: "Prix", to: "/admin/marches/prix", icon: Tags }, { label: "Références & moyens", to: "/admin/marches/references", icon: BadgeCheck },
    { label: "Résultats", to: "/admin/marches/resultats", icon: Trophy }, { label: "Réglementation", to: "/admin/marches/reglementation", icon: BookOpen },
  ] },
  { label: "Comptabilité & Agences", icon: Wallet, roles: ["Direction", "Compta & Finances", "Chef d'agence", "Resp. région Sud"], items: [
    { label: "Vue d'ensemble", to: "/admin/compta", icon: Gauge }, { label: "Agences", to: "/admin/compta/agences", icon: Building2 }, { label: "Objectifs", to: "/admin/compta/objectifs", icon: Target },
    { label: "Prévisions mensuelles", to: "/admin/compta/previsions", icon: CalendarCheck, badge: "prev" }, { label: "Facturation", to: "/admin/compta/facturation", icon: Receipt },
    { label: "Encaissements", to: "/admin/compta/encaissements", icon: Landmark, badge: "rappro" }, { label: "Créances", to: "/admin/compta/creances", icon: Coins },
    { label: "Fournisseurs & dépenses", to: "/admin/compta/fournisseurs", icon: Truck }, { label: "Trésorerie", to: "/admin/compta/tresorerie", icon: PiggyBank },
    { label: "Budget & marges", to: "/admin/compta/budget", icon: LineChart }, { label: "Clôture mensuelle", to: "/admin/compta/cloture", icon: Lock },
    { label: "Obligations", to: "/admin/compta/obligations", icon: ScrollText }, { label: "Imports", to: "/admin/compta/imports", icon: Upload }, { label: "Agent Compta", to: "/admin/compta/agent", icon: Bot, badge: "compta" },
  ] },
  { label: "Clients", icon: Users, items: [{ label: "Leads", to: "/admin/clients/leads", icon: UserPlus }, { label: "Clients", to: "/admin/clients", icon: Handshake }, { label: "Devis & relances", to: "/admin/clients/devis", icon: FileSpreadsheet }] },
  { label: "Service client", icon: Headset, items: [{ label: "Service client", to: "/admin/service-client", icon: Headset }] },
  { label: "Rapports", icon: BarChart3, items: [{ label: "Rapports", to: "/admin/rapports", icon: BarChart3 }] },
];
export const UNUSED = { ClipboardList, FileCheck2, FileText };
