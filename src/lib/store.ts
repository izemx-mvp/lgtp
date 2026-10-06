import { create } from "zustand";
import { toast } from "sonner";
import { addDays, iso, today, daysUntil, TVA, money, DAY } from "./format";
import * as S from "./seed";
import { pulse } from "./pulse";

export type Piece = { id: string; section: "Dossier administratif" | "Dossier technique" | "Dossier additif" | "Offre financière"; libelle: string; statut: "À fournir" | "Auto-généré" | "Fourni" | "Expiré" | "Non conforme" | "Validé"; source: "bibliothèque" | "généré" | "à demander"; owner: string; docType?: string; expiration?: string; commentaire?: string };
export type BLine = { id: string; num: string; chap: string; designation: string; unite: string; qte: number; pu: number; suggere: number };
export type Issue = { id: string; sev: "Bloquant" | "Majeur" | "Mineur"; text: string; step: number; fixed: boolean };
export interface Dossier {
  id: string; aoId: string; statut: string; step: number; checklist: Piece[]; bpde: BLine[];
  coefs: { marge: number; depl: number; aleas: number; remise: number }; issues: Issue[]; revueDone: boolean;
  validations: string[]; signed: boolean; depot?: { at: string; accuse: string; mode: string }; generated: string[];
  resultat?: { decision: "Gagné" | "Perdu" | "Sans suite"; rang: number; prixRetenu: number; attributaire: string; motif?: string };
  ouverture?: string; extracted: Record<string, string>; tasks: { id: string; text: string; who: string; due: string; done: boolean }[];
  messages: { id: string; text: string; due: string; answered: boolean }[]; acteMontant?: number; cautionDemandee?: boolean;
}
export type AgentId = "veille" | "dossier" | "qualif" | "relances" | "rapports" | "sc" | "compta";
export interface QItem { id: string; agent: AgentId; capability?: string; objet: string; agence?: string; montant?: number; kind: string; ref?: string; statut: "En attente" | "Approuvé" | "Rejeté"; at: string }
export interface Run { id: string; agent: AgentId; at: string; inputs: string; steps: string[]; outputs: string }
export interface Agent { id: AgentId; nom: string; module: string; actif: boolean; autonomie: "Suggère" | "Prépare" | "Exécute après validation"; planning: string; traitees: number; tempsGagne: number; rules: { id: string; label: string; value: string }[]; templates: { id: string; nom: string; texte: string }[] }
export interface Audit { id: string; at: string; author: string; entity: string; entityId: string; msg: string }
export interface Notif { id: string; at: string; text: string; to: string; read: boolean; link: string }
export interface Releve { id: string; compte: string; date: string; libelle: string; montant: number; statut: "Rapproché" | "Partiel" | "Non identifié" | "Doublon"; factureId?: string; suggestion?: string; confiance?: number; mode: string }

const uid = (p: string) => `${p}${Math.random().toString(36).slice(2, 8)}`;

export function buildChecklist(ao: S.AO): Piece[] {
  const P = (section: Piece["section"], libelle: string, source: Piece["source"], docType?: string): Piece => ({ id: uid("pc"), section, libelle, statut: source === "généré" ? "Auto-généré" : "À fournir", source, owner: S.PEOPLE[0], docType });
  return [
    P("Dossier administratif", "Déclaration sur l'honneur", "généré"),
    P("Dossier administratif", "Pièces justifiant les pouvoirs (statuts / PV de nomination / procuration)", "bibliothèque", "PV de nomination du gérant"),
    P("Dossier administratif", "Attestation de régularité fiscale", "bibliothèque", "Attestation de régularité fiscale"),
    P("Dossier administratif", "Attestation de la CNSS", "bibliothèque", "Attestation CNSS"),
    P("Dossier administratif", "Certificat d'immatriculation au RC (modèle 7)", "bibliothèque", "Registre de commerce (modèle 7)"),
    P("Dossier administratif", `Récépissé du cautionnement provisoire (${money(ao.caution, 0)})`, "à demander"),
    P("Dossier administratif", "Attestation d'assurance RC professionnelle", "bibliothèque", "Attestation d'assurance RC professionnelle"),
    P("Dossier technique", "Note moyens humains et techniques", "généré"),
    P("Dossier technique", "Attestations de références (bonne exécution)", "bibliothèque"),
    P("Dossier technique", "Certificat de qualification Classe 1", "bibliothèque", "Certificat de qualification Classe 1"),
    P("Dossier technique", "Certificat ISO 9001", "bibliothèque", "Certificat ISO 9001:2015"),
    P("Dossier additif", "Mémoire méthodologique + planning", "généré"),
    P("Offre financière", "Acte d'engagement", "généré"),
    P("Offre financière", "Bordereau des prix – détail estimatif (BPDE)", "généré"),
  ];
}
export function buildBPDE(ao: S.AO, prix: S.Prix[]): BLine[] {
  const scale = Math.max(0.3, ao.estimation / 1.2 / 600000);
  const pickP = (code: string) => prix.find((p) => p.code === code)!;
  const items: [string, string, number][] = [["P01", "Installation", 1], ["P02", "Reconnaissance", Math.round(120 * scale)], ["P03", "Reconnaissance", Math.round(40 * scale)], ["P05", "Essais in situ", Math.round(150 * scale)], ["P06", "Essais in situ", Math.round(30 * scale)], ["P07", "Essais in situ", Math.round(12 * scale)], ["P09", "Laboratoire", Math.round(40 * scale)], ["P10", "Laboratoire", Math.round(30 * scale)], ["P11", "Laboratoire", Math.round(15 * scale)], ["P12", "Laboratoire", Math.round(10 * scale)], ["P16", "Rapports", 1]];
  return items.map(([c, chap, q], i) => { const p = pickP(c); return { id: uid("bl"), num: String(i + 1), chap, designation: p.designation, unite: p.unite, qte: Math.max(1, q), pu: p.prix, suggere: p.prix }; });
}
export function bpdeTotals(d: Dossier) {
  const base = d.bpde.reduce((a, l) => a + l.qte * l.pu, 0);
  const ht = base * (1 + d.coefs.marge / 100) * (1 + d.coefs.depl / 100) * (1 + d.coefs.aleas / 100) * (1 - d.coefs.remise / 100);
  return { base, ht, tva: ht * TVA, ttc: ht * (1 + TVA) };
}
export const factTTC = (f: S.Facture) => f.ht * (1 + TVA);
export const DOSSIER_STATUTS = ["Brouillon", "En préparation", "En revue", "Prêt à signer", "Signé", "Déposé", "Ouverture des plis", "Résultat"];
export const STEPS = ["Analyse du RC / CPS", "Checklist des pièces", "Génération des documents", "Chiffrage (BPDE)", "Cautionnement provisoire", "Revue de conformité", "Signature & dépôt", "Suivi & résultat"];

function docStatus(d?: S.DocPerm) {
  if (!d?.expiration) return "Valide";
  const j = daysUntil(d.expiration);
  return j < 0 ? "Expiré" : j <= 30 ? "Expire dans 30 j" : "Valide";
}
export { docStatus };

function seedAll() {
  const agences = S.seedAgences();
  const prix = S.seedPrix();
  const aos = S.seedAOs();
  const docsPerm = S.seedDocsPerm();
  const clients = S.seedClients();
  const factures = S.seedFactures(clients);
  // current month billing (one agency below threshold)
  const m0 = new Date(today().getFullYear(), today().getMonth(), 1);
  [["agadir", 140000], ["agadir", 125000], ["agadir", 98000], ["marrakech", 120000], ["marrakech", 110000], ["guelmim", 38000]].forEach(([a, ht], i) =>
    factures.push({ id: `fm${i}`, num: `FA-2026-${String(61 + i).padStart(4, "0")}`, clientId: clients[i].id, agence: a as string, activite: S.ACTIVITES[i % 3], lien: "Marché", ht: ht as number, date: iso(new Date(m0.getTime() + Math.min(i + 1, today().getDate() - 1) * DAY)), echeance: iso(addDays(55)), statut: "Envoyée", paye: 0 }));
  // dossiers
  const dossierAOs = [4, 5, 6, 7, 8, 9, 10, 11].map((i) => aos[i]);
  const stepsFor = [1, 2, 3, 4, 6, 7, 8, 8];
  const dossiers: Dossier[] = dossierAOs.map((ao, k) => {
    ao.statut = "En dossier";
    const step = stepsFor[k];
    if (k >= 5) ao.deadline = iso(addDays(-rint(5, 20)));
    const cl = buildChecklist(ao);
    if (step >= 3) cl.forEach((p) => (p.statut = p.source === "généré" ? "Validé" : p.source === "bibliothèque" ? "Fourni" : p.statut));
    if (k === 4) { const f = cl.find((p) => p.docType === "Attestation CNSS")!; f.statut = "Expiré"; f.commentaire = "Attestation expirée — à renouveler"; }
    const d: Dossier = {
      id: `ds${String(k + 1).padStart(3, "0")}`, aoId: ao.id, step, statut: DOSSIER_STATUTS[Math.min(step - 1, 7)], checklist: cl, bpde: buildBPDE(ao, prix),
      coefs: { marge: 8, depl: k % 2 ? 4 : 2, aleas: 3, remise: 0 }, issues: [], revueDone: step > 6, validations: step > 6 ? ["Préparateur", "Responsable marchés", "Direction"] : [], signed: step > 6,
      generated: step >= 3 ? ["Déclaration sur l'honneur", "Acte d'engagement", "Note moyens humains & techniques"] : [], extracted: extract(ao), tasks: [{ id: uid("t"), text: "Vérifier le BPDE", who: S.PEOPLE[1], due: iso(addDays(2)), done: false }], messages: [], cautionDemandee: step >= 5,
      ouverture: iso(addDays(daysUntil(ao.deadline) + 1)),
    };
    d.acteMontant = bpdeTotals(d).ttc;
    if (k === 3) d.acteMontant = bpdeTotals(d).ttc * 1.04; // mismatch
    if (step >= 7) d.depot = { at: iso(addDays(-6)), accuse: `ACC-${rint(100000, 999999)}`, mode: "Portail" };
    if (k === 6) { d.resultat = { decision: "Gagné", rang: 1, prixRetenu: d.acteMontant!, attributaire: "LGTP" }; ao.statut = "En dossier"; }
    if (k === 7) d.resultat = { decision: "Perdu", rang: 3, prixRetenu: d.acteMontant! * 0.88, attributaire: "LabTest Sud", motif: "Prix supérieur de 12 % à l'attributaire" };
    return d;
  });
  aos.forEach((a) => { const d = dossiers.find((x) => x.aoId === a.id); if (d) a.dossierId = d.id; });
  // relevés
  const comptes = S.seedComptes();
  const releves: Releve[] = [];
  const paid = factures.filter((f) => f.statut === "Payée");
  paid.forEach((f, i) => releves.push({ id: `rl${i}`, compte: comptes[i % 3].id, date: iso(addDays(-Math.max(1, Math.round((today().getTime() - new Date(f.date).getTime()) / DAY) - 40))), libelle: `VIR ${S.seedClients().find((c) => c.id === f.clientId)?.nom.toUpperCase()} ${f.num}`, montant: factTTC(f), statut: "Rapproché", factureId: f.id, mode: "Virement" }));
  for (let i = releves.length; i < 105; i++) releves.push({ id: `rl${i}`, compte: comptes[i % 3].id, date: iso(addDays(-rint(1, 90))), libelle: S.pick(["FRAIS TENUE COMPTE", "PRLV CNSS", "PRLV DGI TVA", "CB AFRIQUIA", "VIR SALAIRES", "COMMISSION CAUTION"]), montant: -rint(300, 90000), statut: "Rapproché", mode: "Prélèvement" });
  const open = factures.filter((f) => ["Envoyée", "En retard"].includes(f.statut));
  open.slice(0, 13).forEach((f, i) => releves.push({ id: `ru${i}`, compte: comptes[i % 3].id, date: iso(addDays(-rint(0, 6))), libelle: i % 4 === 0 ? `VERSEMENT ESPECES REF ${rint(1000, 9999)}` : `VIR RECU ${f.num.replace("FA-2026-", "")}`, montant: i % 5 === 2 ? Math.round(factTTC(f) * 0.5) : factTTC(f), statut: "Non identifié", suggestion: f.id, confiance: i % 4 === 0 ? 54 : i % 5 === 2 ? 71 : rint(86, 99), mode: i % 3 ? "Virement" : "Chèque" }));
  releves.push({ id: "ru-dup", compte: "bk1", date: releves[0].date, libelle: releves[0].libelle, montant: releves[0].montant, statut: "Doublon", mode: "Virement" });
  releves.push({ id: "ru-x", compte: "bk2", date: iso(addDays(-2)), libelle: "VIR INCONNU 88231", montant: 12400, statut: "Non identifié", mode: "Virement" });

  const previsions = S.AG_OP.map((a) => ({ id: `pv-${a}`, agence: a, mois: (S.CUR_MONTH + 1) % 12, statut: a === "guelmim" ? "En retard" : a === "agadir" ? "Reçue" : "Relancée", ca: a === "agadir" ? 640000 : 0, encaissements: a === "agadir" ? 520000 : 0, depenses: a === "agadir" ? 40000 : 0, risques: a === "agadir" ? "Retard possible du décompte DPEE" : "", relances: a === "guelmim" ? 3 : a === "marrakech" ? 1 : 0 }));

  const agents: Agent[] = ([
    ["veille", "Agent Veille Marchés", "Marchés publics → Veille & Opportunités", "Toutes les 2 h"],
    ["dossier", "Agent Constitution de dossier", "Marchés publics → Dossiers", "À la demande"],
    ["qualif", "Agent Qualification clients", "Clients → Leads", "En continu"],
    ["relances", "Agent Relances", "Clients → Devis & relances", "Quotidien 9h00"],
    ["rapports", "Agent Rapports", "Rapports", "Lundi 8h00 · 1er du mois"],
    ["sc", "Agent Service Client", "Service client", "En continu"],
    ["compta", "Agent Comptabilité & Agences", "Comptabilité & Agences", "Quotidien 7h00"],
  ] as [AgentId, string, string, string][]).map(([id, nom, module, planning], i) => ({
    id, nom, module, planning, actif: true, autonomie: i % 3 === 0 ? "Prépare" : "Exécute après validation", traitees: S.rint(120, 900), tempsGagne: S.rint(20, 140),
    rules: [{ id: "r1", label: "Seuil de pertinence minimum", value: "55" }, { id: "r2", label: "Délai d'alerte (heures)", value: "48" }, { id: "r3", label: "Ton des messages", value: "Vouvoiement, cordial" }],
    templates: [{ id: "t1", nom: "Relance courtoise", texte: "Bonjour {client}, nous revenons vers vous concernant {objet} d'un montant de {montant}. Restant à votre disposition. — LGTP" }, { id: "t2", nom: "Rappel agence", texte: "Bonjour {agence}, merci de transmettre vos prévisions avant le {échéance}." }],
  }));
  const queue: QItem[] = [];
  const Q = (agent: AgentId, objet: string, kind: string, extra: Partial<QItem> = {}) => queue.push({ id: uid("q"), agent, objet, kind, statut: "En attente", at: iso(addDays(-S.rint(0, 2))), ...extra });
  aos.filter((a) => a.statut === "Nouveau").slice(0, 3).forEach((a) => Q("veille", `Ajouter à la liste du jour : ${a.mo} — ${a.objet.slice(0, 50)}…`, "golist", { ref: a.id, montant: a.estimation }));
  Q("dossier", "Générer la note moyens humains pour ds002", "gendoc", { ref: "ds002" });
  Q("dossier", "Renouveler l'attestation CNSS (bloque ds005)", "renew", { ref: "dp005" });
  Q("qualif", "Router 3 leads WhatsApp vers Agence Agadir", "route");
  Q("relances", "Relance devis DV-2026-004 (J+7)", "devis", { ref: "dv004" });
  Q("relances", "Relance devis DV-2026-009 (J+15) « êtes-vous toujours intéressé ? »", "devis", { ref: "dv009" });
  Q("rapports", "Publier le rapport Hebdo marchés", "report", { ref: "Hebdo marchés" });
  // compta ≈ 20
  factures.filter((f) => f.statut === "En retard").slice(0, 6).forEach((f) => Q("compta", `Relance facture ${f.num} (échéance dépassée)`, "relfact", { ref: f.id, montant: factTTC(f), agence: f.agence, capability: "Créances & relances" }));
  releves.filter((r) => r.statut === "Non identifié" && r.suggestion && (r.confiance ?? 0) > 85).slice(0, 6).forEach((r) => Q("compta", `Rapprocher ${r.libelle} → ${factures.find((f) => f.id === r.suggestion)?.num}`, "rappro", { ref: r.id, montant: r.montant, capability: "Rapprochement bancaire" }));
  ["agadir", "marrakech", "guelmim"].forEach((a, i) => Q("compta", `Facture à émettre — chantier terminé (${["RR105 Tiznit", "CHU Marrakech", "Digue Guelmim"][i]})`, "emit", { agence: a, montant: [86000, 64000, 52000][i], capability: "Facturation" }));
  Q("compta", "Relancer Agence Guelmim — prévisions en retard (escalade Direction)", "relprev", { ref: "pv-guelmim", agence: "guelmim", capability: "Relance des prévisions mensuelles" });
  Q("compta", "Relancer Agence Marrakech — prévisions", "relprev", { ref: "pv-marrakech", agence: "marrakech", capability: "Relance des prévisions mensuelles" });
  Q("compta", "Rappel taux de facturation J15 aux chefs d'agence", "taux", { capability: "Rappel du taux de facturation" });
  Q("compta", "Préparer la déclaration TVA du mois", "tva", { capability: "Calendrier fiscal & social" });
  Q("compta", "Mainlevée caution provisoire ao008", "mainlevee", { ref: "ct006", capability: "Cautions & retenues" });

  const runs: Run[] = agents.map((a) => ({ id: uid("r"), agent: a.id, at: iso(addDays(-1)), inputs: "Données du jour", steps: ["Collecte", "Contrôle", "Proposition"], outputs: "Propositions ajoutées à la file de validation" }));
  return {
    agences, prix, aos, docsPerm, clients, factures, dossiers, releves, comptes, previsions, agents, queue, runs,
    bcs: S.seedBCs(), refs: S.seedRefs(), staff: S.seedStaff(), equip: S.seedEquip(), params: S.seedParams(), cautions: S.seedCautions(),
    objectifs: S.seedObjectifs(), decomptes: S.seedDecomptes(), avoirs: [{ id: "av001", num: "AV-2026-001", factureId: factures[2].id, montant: 4800, motif: "Erreur de quantité", date: iso(addDays(-9)) }],
    fournisseurs: S.seedFournisseurs(), notesFrais: S.seedNotesFrais(), leads: S.seedLeads(), devis: S.seedDevis(clients),
    faq: S.seedFaq(), scDocs: S.seedScDocs(), socials: S.seedSocials(), obligations: S.seedObligations(),
    horairesSociete: agences[0].horaires, exceptions: [{ id: "ex1", date: iso(addDays(12)), label: "Fête nationale — fermé" }, { id: "ex2", date: iso(addDays(40)), label: "Fermeture exceptionnelle (inventaire)" }],
    infos: { presentation: "LGTP, Laboratoire de Géotechnique et Travaux Publics S.A.R.L., créée en 2021 et classée Classe 1, réalise des études géotechniques, le suivi et contrôle qualité des travaux et des expertises dans le Sud du Maroc.", tel: S.COMPANY.tel, whatsapp: "+212 661 23 45 67", email: S.COMPANY.email, adresse: S.COMPANY.adresse, delais: "Réponse sous 48 h ouvrées", zones: "Souss-Massa, Marrakech-Safi, Guelmim-Oued Noun, provinces du Sud, Casablanca-Settat", langues: "Français, Arabe, Anglais", accueil: "Bienvenue chez LGTP, comment pouvons-nous vous aider ?", horsHoraires: "Nos bureaux sont fermés. Nous vous répondrons dès la réouverture." },
    imports: [
      { id: "im1", type: "Factures", fichier: "factures_sept.csv", lignes: 48, erreurs: 0, date: iso(addDays(-20)), statut: "Importé" },
      { id: "im2", type: "Encaissements", fichier: "releve_attijari.csv", lignes: 120, erreurs: 0, date: iso(addDays(-6)), statut: "Importé" },
      { id: "im3", type: "Dépenses", fichier: "depenses_agadir.xlsx", lignes: 37, erreurs: 4, date: iso(addDays(-3)), statut: "Erreurs à corriger" },
      { id: "im4", type: "Objectifs", fichier: "objectifs_2026.xlsx", lignes: 108, erreurs: 0, date: iso(addDays(-90)), statut: "Importé" },
    ],
    cloture: ["Collecte des données", "Contrôle", "Analyse des écarts", "Validation Direction", "Publication des résultats"].map((l, i) => ({ id: `cs${i}`, label: l, owner: i < 2 ? "Nadia Berrada" : i < 3 ? "Agent Compta" : "Karim El Idrissi", done: i < 1 })),
    clotureLocked: false,
    reports: ["Hebdo marchés", "Mensuel marchés", "Mensuel agences", "Direction (synthèse)", "Pipeline commercial", "Hebdo marchés"].map((t, i) => ({ id: `rp${i}`, type: t, periode: i < 5 ? "Mois précédent" : "Semaine dernière", date: iso(addDays(-i * 4 - 1)), auteur: "Agent Rapports" })),
    alertRules: [
      { id: "ar1", condition: "Prévisions non reçues à J+2", dest: "Direction", canal: "E-mail", delai: "J+2", escalade: "Gérant" },
      { id: "ar2", condition: "Taux de facturation < 45 % à J15", dest: "Chef d'agence", canal: "WhatsApp", delai: "J15", escalade: "Resp. compta" },
      { id: "ar3", condition: "Facture > 60 jours", dest: "Resp. compta", canal: "E-mail", delai: "J+60", escalade: "Direction" },
      { id: "ar4", condition: "Trésorerie prévisionnelle < 0", dest: "Direction", canal: "E-mail", delai: "Immédiat", escalade: "—" },
    ],
    financeRules: [
      { id: "fr1", label: "Délai de paiement légal (loi 69-21)", value: "60 jours", statut: "À valider par l'expert-comptable" },
      { id: "fr2", label: "Checkpoints taux de facturation", value: "J10, J15, fin de mois", statut: "À valider par l'expert-comptable" },
      { id: "fr3", label: "Seuil alerte taux J15", value: "45 %", statut: "À valider par l'expert-comptable" },
      { id: "fr4", label: "Date limite prévisions", value: "25 du mois précédent", statut: "À valider par l'expert-comptable" },
      { id: "fr5", label: "Tolérance rapprochement", value: "± 5,00 DH", statut: "Validé" },
    ],
  };
}
const rint = S.rint;
function extract(ao: S.AO): Record<string, string> {
  return {
    Objet: ao.objet, "Maître d'ouvrage": ao.mo, Lot: "Lot unique", "Mode de dépôt": "Électronique (marchespublics.gov.ma)", "Date limite": ao.deadline, Estimation: String(ao.estimation),
    "Caution provisoire": String(ao.caution), "Validité des offres": "75 jours", "Visite des lieux": ao.visite ? "Obligatoire" : "Non", "Qualification exigée": ao.qualifs.join(", "),
    "Délai d'exécution": ao.delaiExec, Pénalités: "1/1000 par jour de retard", "Retenue de garantie": "7 %", "Caution définitive": "3 %", "Ancienneté max. attestations": "1 an",
  };
}

type Data = ReturnType<typeof seedAll>;
interface UI { role: S.Role; user: string; authed: boolean; reduceMotion: boolean; dark: boolean; audit: Audit[]; notifs: Notif[]; savedViews: Record<string, { name: string; qs: string }[]> }
interface Actions {
  set: (fn: (s: State) => Partial<State>) => void;
  log: (author: string, entity: string, entityId: string, msg: string) => void;
  notify: (text: string, link: string, to?: string) => void;
  reset: () => void;
  aoDecide: (ids: string[], decision: "Go" | "No-Go", motif?: string) => void;
  createDossier: (aoId: string) => string | undefined;
  updDossier: (id: string, fn: (d: Dossier) => void, msg?: string, author?: string) => void;
  scan: (source: string) => number;
  approve: (qid: string, ok: boolean) => void;
  runAgent: (a: AgentId) => string[];
  payFacture: (fid: string, amount: number, by?: string) => void;
  matchReleve: (rid: string, fid: string) => void;
  simulateDay: () => void;
}
export type State = Data & UI & Actions;

const initUI = (): UI => ({ role: "Direction", user: "Karim El Idrissi", authed: false, reduceMotion: false, dark: false, audit: [], notifs: [
  { id: "n1", at: iso(addDays(0)), text: "3 dépôts à J-3 — vérifiez les dossiers", to: "Responsable Marchés", read: false, link: "/admin/marches/dossiers" },
  { id: "n2", at: iso(addDays(0)), text: "Attestation CNSS expirée — dossier bloqué", to: "Responsable Marchés", read: false, link: "/admin/marches/documents" },
  { id: "n3", at: iso(addDays(0)), text: "Agence Guelmim en retard sur les prévisions", to: "Compta & Finances", read: false, link: "/admin/compta/previsions" },
  { id: "n4", at: iso(addDays(-1)), text: "12 validations en attente pour les agents IA", to: "Direction", read: false, link: "/admin" },
], savedViews: {} });

export const useStore = create<State>((set, get) => ({
  ...seedAll(),
  ...initUI(),
  set: (fn) => set((s) => fn(s)),
  log: (author, entity, entityId, msg) => set((s) => ({ audit: [{ id: uid("a"), at: iso(new Date()), author, entity, entityId, msg }, ...s.audit].slice(0, 500) })),
  notify: (text, link, to = "Tous") => set((s) => ({ notifs: [{ id: uid("n"), at: iso(new Date()), text, to, read: false, link }, ...s.notifs] })),
  reset: () => { set({ ...seedAll(), audit: [], notifs: initUI().notifs }); toast.success("Données de démo réinitialisées"); },
  aoDecide: (ids, decision, motif) => {
    set((s) => ({ aos: s.aos.map((a) => (ids.includes(a.id) ? { ...a, statut: decision, motif: decision === "No-Go" ? motif : undefined } : a)) }));
    ids.forEach((i) => get().log(get().user, "AO", i, decision === "Go" ? "Décision Go" : `No-Go — ${motif}`));
    toast.success(`${ids.length} AO → ${decision}`);
  },
  createDossier: (aoId) => {
    const ao = get().aos.find((a) => a.id === aoId);
    if (!ao) return;
    if (ao.dossierId) return ao.dossierId;
    const id = `ds${String(get().dossiers.length + 1).padStart(3, "0")}`;
    const d: Dossier = { id, aoId, statut: "Brouillon", step: 1, checklist: buildChecklist(ao), bpde: buildBPDE(ao, get().prix), coefs: { marge: 8, depl: 3, aleas: 3, remise: 0 }, issues: [], revueDone: false, validations: [], signed: false, generated: [], extracted: extract(ao), tasks: [], messages: [], ouverture: iso(addDays(daysUntil(ao.deadline) + 1)) };
    d.acteMontant = bpdeTotals(d).ttc;
    set((s) => ({ dossiers: [...s.dossiers, d], aos: s.aos.map((a) => (a.id === aoId ? { ...a, statut: "En dossier", dossierId: id } : a)) }));
    get().log("Agent Constitution de dossier", "Dossier", id, `Dossier créé, checklist de ${d.checklist.length} pièces générée depuis le RC`);
    pulse();
    toast.success("Dossier créé — checklist générée depuis le RC");
    return id;
  },
  updDossier: (id, fn, msg, author) => {
    set((s) => ({ dossiers: s.dossiers.map((d) => { if (d.id !== id) return d; const c = structuredClone(d); fn(c); return c; }) }));
    if (msg) get().log(author ?? get().user, "Dossier", id, msg);
  },
  scan: (source) => {
    const n = 7;
    const base = get().aos.length;
    const regions = S.REGIONS;
    const objs = ["Étude géotechnique, centre de santé", "Contrôle qualité, réseau d'assainissement", "Essais de laboratoire, voirie", "Reconnaissance géotechnique, réservoir", "Expertise, mur de soutènement", "Étude de sol, école communale", "Fourniture de matériel informatique"];
    const fresh: S.AO[] = objs.map((o, i) => ({ id: `an${base + i}`, ref: `AOO n° ${rint(60, 99)}/2026/SCN`, mo: S.pick(["Commune de Tiznit", "DPEE Agadir", "ONEE", "Commune de Guelmim", "AREF Marrakech"]), objet: o, procedure: S.pick(S.PROCEDURES.slice(0, 2)), region: S.pick(regions), ville: S.pick(["Agadir", "Tiznit", "Guelmim", "Marrakech"]), estimation: rint(120, 900) * 1000, caution: rint(2, 12) * 1000, deadline: iso(addDays(rint(8, 28))), source, score: i === 6 ? 8 : i < 2 ? rint(82, 94) : rint(55, 78), breakdown: { Domaine: 18, "Classe/qualif.": 12, Zone: 10, Estimation: 8, Matériel: 8, Charge: 6, "Historique MO": 5, Délai: 6 }, statut: i === 6 ? "Exclu" : "Nouveau", pertinent: i !== 6, excluReason: i === 6 ? "hors périmètre : fournitures" : undefined, visite: false, delaiExec: "3 mois", qualifs: ["Classe 1 — Laboratoire BTP"], comments: [], detectedAt: iso(new Date()) }));
    set((s) => ({ aos: [...fresh, ...s.aos] }));
    get().log("Agent Veille Marchés", "Veille", source, `Scan : ${n} AO trouvés, 1 exclu, 2 très pertinents`);
    get().notify("Nouveaux AO détectés : 7 (2 très pertinents)", "/admin/marches/opportunites", "Responsable Marchés");
    pulse();
    return n;
  },
  payFacture: (fid, amount, by = get().user) => {
    set((s) => ({ factures: s.factures.map((f) => { if (f.id !== fid) return f; const paye = Math.min(factTTC(f), f.paye + amount); return { ...f, paye, statut: paye >= factTTC(f) - 1 ? "Payée" : "Partiellement payée" }; }) }));
    get().log(by, "Facture", fid, `Paiement enregistré : ${money(amount)}`);
  },
  matchReleve: (rid, fid) => {
    const r = get().releves.find((x) => x.id === rid);
    if (!r) return;
    set((s) => ({ releves: s.releves.map((x) => (x.id === rid ? { ...x, statut: "Rapproché", factureId: fid } : x)) }));
    get().payFacture(fid, r.montant, "Rapprochement bancaire");
    pulse();
  },
  approve: (qid, ok) => {
    const q = get().queue.find((x) => x.id === qid);
    if (!q || q.statut !== "En attente") return;
    set((s) => ({ queue: s.queue.map((x) => (x.id === qid ? { ...x, statut: ok ? "Approuvé" : "Rejeté" } : x)) }));
    const agentName = get().agents.find((a) => a.id === q.agent)!.nom;
    if (ok) {
      const st = get();
      switch (q.kind) {
        case "golist": set((s) => ({ aos: s.aos.map((a) => (a.id === q.ref ? { ...a, statut: "À décider" } : a)) })); break;
        case "renew": set((s) => ({ docsPerm: s.docsPerm.map((d) => (d.id === q.ref ? { ...d, emission: iso(today()), expiration: iso(addDays(180)), version: d.version + 1 } : d)) })); break;
        case "gendoc": st.updDossier(q.ref!, (d) => { if (!d.generated.includes("Note moyens humains & techniques")) d.generated.push("Note moyens humains & techniques"); }, "Note moyens générée", agentName); break;
        case "rappro": { const r = st.releves.find((x) => x.id === q.ref); if (r?.suggestion) st.matchReleve(r.id, r.suggestion); break; }
        case "relfact": set((s) => ({ factures: s.factures.map((f) => (f.id === q.ref ? { ...f, lien: f.lien } : f)) })); break;
        case "emit": { const n = st.factures.length + 1; set((s) => ({ factures: [{ id: uid("fa"), num: `FA-2026-${String(n).padStart(4, "0")}`, clientId: s.clients[0].id, agence: q.agence!, activite: "Études géotechniques", lien: "Marché", ht: q.montant!, date: iso(new Date()), echeance: iso(addDays(60)), statut: "Validée", paye: 0 }, ...s.factures] })); break; }
        case "relprev": set((s) => ({ previsions: s.previsions.map((p) => (p.id === q.ref ? { ...p, statut: "Relancée", relances: p.relances + 1 } : p)) })); break;
        case "mainlevee": set((s) => ({ cautions: s.cautions.map((c) => (c.id === q.ref ? { ...c, statut: "Restituée" } : c)) })); break;
        case "tva": set((s) => { const i = s.obligations.findIndex((o) => o.statut === "À préparer" && o.libelle.startsWith("TVA")); return { obligations: s.obligations.map((o, k) => (k === i ? { ...o, statut: "Prêt" } : o)) }; }); break;
        case "devis": set((s) => ({ devis: s.devis.map((d) => (d.id === q.ref ? { ...d, statut: "En attente" } : d)) })); break;
        case "report": set((s) => ({ reports: [{ id: uid("rp"), type: q.ref ?? "Hebdo marchés", periode: "Semaine en cours", date: iso(new Date()), auteur: agentName }, ...s.reports] })); break;
      }
      set((s) => ({ agents: s.agents.map((a) => (a.id === q.agent ? { ...a, traitees: a.traitees + 1, tempsGagne: a.tempsGagne + 1 } : a)) }));
    }
    get().log(agentName, "Validation", q.id, `${ok ? "Approuvé" : "Rejeté"} : ${q.objet}`);
  },
  runAgent: (a) => {
    const st = get();
    const steps: Record<AgentId, string[]> = {
      veille: ["Connexion aux 8 sources", "Lecture des avis publiés", "Filtrage périmètre LGTP / Classe 1", "Scoring de pertinence", "Dédoublonnage", "Envoi de la liste du jour"],
      dossier: ["Lecture des RC/CPS", "Contrôle des pièces de la bibliothèque", "Détection des pièces expirées", "Préparation des documents"],
      qualif: ["Lecture des messages entrants", "Classification (expertise / contrôle / étude)", "Extraction des champs", "Routage par zone"],
      relances: ["Recherche des devis sans réponse", "Recherche des factures échues", "Rédaction des messages", "Mise en file de validation"],
      rapports: ["Collecte des chiffres", "Calcul des indicateurs", "Rédaction du commentaire", "Génération PDF"],
      sc: ["Indexation de la FAQ", "Indexation des horaires et agences", "Contrôle des liens"],
      compta: ["Import des données agences", "Contrôle & dédoublonnage", "Rapprochement bancaire", "Calcul des taux de facturation", "Préparation des relances", "Mise à jour de la trésorerie"],
    };
    const name = st.agents.find((x) => x.id === a)!.nom;
    const q = (objet: string, kind: string, extra: Partial<QItem> = {}) => set((s) => ({ queue: [{ id: uid("q"), agent: a, objet, kind, statut: "En attente", at: iso(new Date()), ...extra }, ...s.queue] }));
    if (a === "veille") st.scan("marchespublics.gov.ma");
    if (a === "relances") q("Relance devis sans réponse (J+3) — client silencieux", "devis", { ref: st.devis[0].id });
    if (a === "rapports") q("Publier le rapport Mensuel agences", "report", { ref: "Mensuel agences" });
    if (a === "compta") { const r = st.releves.find((x) => x.statut === "Non identifié" && x.suggestion && !st.queue.some((y) => y.ref === x.id)); if (r) q(`Rapprocher ${r.libelle}`, "rappro", { ref: r.id, montant: r.montant, capability: "Rapprochement bancaire" }); q("Facture à émettre — essais béton terminés", "emit", { agence: "agadir", montant: 42000, capability: "Facturation" }); }
    if (a === "qualif") q("Qualifier 2 nouveaux messages WhatsApp", "route");
    if (a === "dossier") q("Générer la note moyens pour le dernier dossier", "gendoc", { ref: st.dossiers[st.dossiers.length - 1].id });
    set((s) => ({ runs: [{ id: uid("r"), agent: a, at: iso(new Date()), inputs: "Données du store", steps: steps[a], outputs: "Nouvelles propositions dans la file de validation" }, ...s.runs] }));
    st.log(name, "Agent", a, "Exécution terminée");
    return steps[a];
  },
  simulateDay: () => {
    const st = get();
    (["veille", "relances", "compta", "rapports"] as AgentId[]).forEach((a) => st.runAgent(a));
    toast.success("Journée simulée : nouveaux AO, relances proposées, factures à émettre, rapport");
  },
}));

// ---------- selectors
export function agencyStats(s: Data, ag: string) {
  const m = today().getMonth(), y = today().getFullYear();
  const fs = s.factures.filter((f) => f.agence === ag && f.statut !== "Annulée" && f.statut !== "Brouillon");
  const month = fs.filter((f) => { const d = new Date(f.date); return d.getMonth() === m && d.getFullYear() === y; });
  const factureMois = month.reduce((a, f) => a + f.ht, 0);
  const objMois = S.ACTIVITES.reduce((a, act) => a + (s.objectifs[ag]?.[act][m] ?? 0), 0);
  const objAn = S.ACTIVITES.reduce((a, act) => a + (s.objectifs[ag]?.[act].reduce((x, y) => x + y, 0) ?? 0), 0);
  const factureAn = fs.reduce((a, f) => a + f.ht, 0);
  const encaisse = fs.reduce((a, f) => a + f.paye, 0);
  const creances = fs.reduce((a, f) => a + (factTTC(f) - f.paye), 0);
  return { factureMois, objMois, objAn, factureAn, encaisse, creances, taux: objMois ? factureMois / objMois : 0 };
}
export function aging(s: Data) {
  const b = { "0-30": 0, "31-60": 0, "61-90": 0, "> 90": 0 } as Record<string, number>;
  s.factures.forEach((f) => { const due = factTTC(f) - f.paye; if (due <= 1 || f.statut === "Brouillon" || f.statut === "Annulée") return; const age = Math.round((today().getTime() - new Date(f.date).getTime()) / DAY); b[age <= 30 ? "0-30" : age <= 60 ? "31-60" : age <= 90 ? "61-90" : "> 90"] += due; });
  return b;
}
export function cashForecast(s: Data, scenario: "réaliste" | "prudent" | "optimiste") {
  const k = { réaliste: 0.85, prudent: 0.55, optimiste: 1 }[scenario];
  let bal = s.comptes.reduce((a, c) => a + c.solde, 0);
  const open = s.factures.filter((f) => factTTC(f) - f.paye > 1 && f.statut !== "Brouillon");
  const sup = s.fournisseurs.filter((f) => f.statut !== "Payée");
  return Array.from({ length: 13 }, (_, w) => {
    const start = addDays(w * 7), end = addDays(w * 7 + 7);
    const inn = open.filter((f) => { const e = new Date(f.echeance); return (w === 0 && e < end) || (e >= start && e < end); }).reduce((a, f) => a + (factTTC(f) - f.paye), 0) * k + 60000 * k;
    const out = sup.filter((f) => { const e = new Date(f.echeance); return (w === 0 && e < end) || (e >= start && e < end); }).reduce((a, f) => a + f.ht * 1.2, 0) + (w % 4 === 3 ? 420000 : 0) + (w % 4 === 1 ? 160000 : 0) + 25000;
    bal += inn - out;
    return { semaine: `S${w + 1}`, encaissements: Math.round(inn), decaissements: Math.round(out), solde: Math.round(bal) };
  });
}
export function assertConsistency(s: Data) {
  const tot = S.AG_OP.reduce((a, ag) => a + agencyStats(s, ag).factureAn, 0);
  const direct = s.factures.filter((f) => S.AG_OP.includes(f.agence) && f.statut !== "Annulée" && f.statut !== "Brouillon").reduce((a, f) => a + f.ht, 0);
  if (Math.abs(tot - direct) > 1) console.warn("[assertConsistency] CA agences ≠ factures", tot, direct);
  const ag = Object.values(aging(s)).reduce((a, b) => a + b, 0);
  const cr = S.AG_OP.reduce((a, x) => a + agencyStats(s, x).creances, 0);
  if (Math.abs(ag - cr) > 5) console.warn("[assertConsistency] balance âgée ≠ créances agences", ag, cr);
  else console.info("[assertConsistency] OK");
}
