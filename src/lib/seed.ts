import { addDays, iso, today } from "./format";

let s = 20260;
export const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
export const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
export const rint = (a: number, b: number) => Math.floor(a + rnd() * (b - a + 1));
const id = (p: string, i: number) => `${p}${String(i + 1).padStart(3, "0")}`;

export const COMPANY = {
  raison: "LGTP — Laboratoire de Géotechnique et Travaux Publics",
  forme: "S.A.R.L.",
  ice: "002871459000038",
  rc: "RC Casablanca n° 498 213",
  if: "IF 52 418 907",
  cnss: "CNSS 8 741 236",
  patente: "TP 37 512 004",
  adresse: "Bd Abdelmoumen, Résidence Al Nour, 3e étage, Casablanca",
  representant: "M. Karim El Idrissi",
  qualite: "Gérant",
  rib: "007 780 0001234567890123 45 — Attijariwafa bank",
  tel: "+212 522 47 18 30",
  email: "contact@lgtp.ma",
  classe: "Classe 1",
  creation: 2021,
};

export type Role = "Direction" | "Responsable Marchés" | "Resp. région Sud" | "Chargé marchés" | "Compta & Finances" | "Chef d'agence";
export const ROLES: { role: Role; name: string; email: string }[] = [
  { role: "Direction", name: "Karim El Idrissi", email: "demo@lgtp.ma" },
  { role: "Responsable Marchés", name: "Salma Benjelloun", email: "s.benjelloun@lgtp.ma" },
  { role: "Resp. région Sud", name: "Youssef Ait Lahcen", email: "y.aitlahcen@lgtp.ma" },
  { role: "Chargé marchés", name: "Hajar Ouazzani", email: "h.ouazzani@lgtp.ma" },
  { role: "Compta & Finances", name: "Nadia Berrada", email: "n.berrada@lgtp.ma" },
  { role: "Chef d'agence", name: "Omar Amrani", email: "o.amrani@lgtp.ma" },
];
export const PEOPLE = ["Hajar Ouazzani", "Mehdi Tazi", "Imane Chraibi", "Rachid Bouzid", "Salma Benjelloun", "Youssef Ait Lahcen"];

export const ACTIVITES = ["Études géotechniques", "Suivi & contrôle qualité", "Expertise"] as const;
export type Activite = (typeof ACTIVITES)[number];

export interface Horaire { jour: string; ouvert: boolean; matin: string; aprem: string }
const H = (sat = false): Horaire[] =>
  ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"].map((j, i) => ({
    jour: j,
    ouvert: i < 5 || (i === 5 && sat),
    matin: i === 5 ? "09:00-13:00" : "08:30-12:30",
    aprem: i === 5 ? "" : "14:30-18:00",
  }));

export interface Agence { id: string; nom: string; ville: string; chef: string; adresse: string; tel: string; email: string; lat: number; lng: number; actif: boolean; zone: string; horaires: Horaire[]; siege?: boolean }
export const seedAgences = (): Agence[] => [
  { id: "casa", nom: "Siège Casablanca", ville: "Casablanca", chef: "Karim El Idrissi", adresse: COMPANY.adresse, tel: "+212 522 47 18 30", email: "siege@lgtp.ma", lat: 33.5883, lng: -7.6114, actif: true, zone: "Casablanca-Settat, Rabat-Salé-Kénitra", horaires: H(), siege: true },
  { id: "agadir", nom: "Agence Agadir", ville: "Agadir", chef: "Omar Amrani", adresse: "Av. Hassan II, Imm. Souss, Agadir", tel: "+212 528 84 21 07", email: "agadir@lgtp.ma", lat: 30.4278, lng: -9.5981, actif: true, zone: "Souss-Massa", horaires: H(true) },
  { id: "marrakech", nom: "Agence Marrakech", ville: "Marrakech", chef: "Leila Fassi", adresse: "Rue Ibn Aïcha, Guéliz, Marrakech", tel: "+212 524 43 66 12", email: "marrakech@lgtp.ma", lat: 31.6346, lng: -8.0103, actif: true, zone: "Marrakech-Safi, Drâa-Tafilalet", horaires: H() },
  { id: "guelmim", nom: "Agence Guelmim", ville: "Guelmim", chef: "Brahim Ouchen", adresse: "Bd Mohammed V, Guelmim", tel: "+212 528 87 30 45", email: "guelmim@lgtp.ma", lat: 28.987, lng: -10.0574, actif: true, zone: "Guelmim-Oued Noun, Laâyoune, Dakhla", horaires: H() },
];

export const REGIONS = ["Souss-Massa", "Marrakech-Safi", "Guelmim-Oued Noun", "Laâyoune-Sakia El Hamra", "Dakhla-Oued Ed-Dahab", "Drâa-Tafilalet", "Casablanca-Settat"];
export const PROCEDURES = ["AO ouvert", "AO ouvert simplifié", "AO restreint", "Concours", "Procédure négociée", "Bon de commande"];
export const SOURCES = ["marchespublics.gov.ma", "Portail ADM", "Portail ONEE", "Portail ONCF", "Portail OCP", "Source privée A", "Source privée B", "Alerte e-mail"];

export type AOStatut = "Nouveau" | "À décider" | "Go" | "No-Go" | "En dossier" | "Expiré" | "Exclu";
export interface AO {
  id: string; ref: string; mo: string; objet: string; procedure: string; region: string; ville: string;
  estimation: number; caution: number; deadline: string; source: string; score: number;
  breakdown: Record<string, number>; statut: AOStatut; pertinent: boolean; excluReason?: string;
  assignee?: string; motif?: string; dossierId?: string; visite: boolean; delaiExec: string; qualifs: string[];
  comments: { by: string; at: string; text: string }[]; detectedAt: string;
}
const BASE_AO: [string, string, string, string, string, number, number][] = [
  ["ADM", "Études géotechniques complémentaires, élargissement autoroute Agadir–Marrakech, tronçon Chichaoua–Marrakech", "AO ouvert", "Marrakech-Safi", "Chichaoua", 2850000, 40000],
  ["DPEE Taroudant", "Reconnaissance géotechnique pour un ouvrage d'art sur oued Souss", "AO ouvert", "Souss-Massa", "Taroudant", 420000, 8000],
  ["Commune d'Agadir", "Étude géotechnique, complexe sportif de proximité, quartier Anza", "AO ouvert simplifié", "Souss-Massa", "Agadir", 180000, 3000],
  ["ONEE Branche Eau", "Contrôle qualité (essais béton et remblais), renforcement AEP de Guelmim", "AO ouvert", "Guelmim-Oued Noun", "Guelmim", 650000, 10000],
  ["ORMVA du Souss-Massa", "Études géotechniques, bassins de stockage d'eau, lot 2", "AO ouvert", "Souss-Massa", "Agadir", 760000, 12000],
  ["CHU Mohammed VI Marrakech", "Étude géotechnique & essais in situ, extension du bloc opératoire", "AO ouvert", "Marrakech-Safi", "Marrakech", 390000, 6000],
  ["Al Omrane Marrakech-Safi", "Contrôle technique/qualité des travaux de VRD, programme de relogement", "AO ouvert", "Marrakech-Safi", "Marrakech", 1240000, 20000],
  ["ONCF", "Expertise de désordres sur un ouvrage d'art (tassements de remblai)", "Procédure négociée", "Marrakech-Safi", "Benguérir", 310000, 5000],
  ["Université Ibn Zohr", "Contrôle de compactage et essais matériaux, extension de faculté", "AO ouvert", "Souss-Massa", "Agadir", 480000, 8000],
  ["Région Souss-Massa", "Études géotechniques, route régionale RR105", "AO ouvert", "Souss-Massa", "Tiznit", 1560000, 25000],
  ["OCP", "Essais de laboratoire sols et fondations, site de Youssoufia", "AO restreint", "Marrakech-Safi", "Youssoufia", 530000, 9000],
  ["Commune de Tiznit", "Étude géotechnique, marché municipal couvert", "AO ouvert simplifié", "Souss-Massa", "Tiznit", 145000, 2500],
  ["DPEE Guelmim", "Reconnaissance géotechnique, digue de protection contre les inondations", "AO ouvert", "Guelmim-Oued Noun", "Guelmim", 690000, 11000],
  ["Agence Urbaine Laâyoune", "Étude de sol, équipements publics quartier Al Wahda", "AO ouvert", "Laâyoune-Sakia El Hamra", "Laâyoune", 350000, 6000],
  ["Commune de Dakhla", "Contrôle qualité des travaux de voirie urbaine", "AO ouvert", "Dakhla-Oued Ed-Dahab", "Dakhla", 820000, 13000],
  ["DPEE Ouarzazate", "Études géotechniques, ouvrages hydrauliques", "AO ouvert", "Drâa-Tafilalet", "Ouarzazate", 580000, 9000],
  ["ONDA", "Expertise de chaussée aéronautique, aéroport Agadir Al Massira", "AO restreint", "Souss-Massa", "Agadir", 920000, 15000],
  ["Commune d'Inezgane", "Étude géotechnique, centre de santé urbain", "AO ouvert simplifié", "Souss-Massa", "Inezgane", 120000, 2000],
  ["Holding Al Omrane", "Suivi qualité terrassements, ville nouvelle Tamansourt", "AO ouvert", "Marrakech-Safi", "Tamansourt", 1100000, 18000],
  ["Lydec", "Reconnaissance géotechnique, collecteur d'assainissement", "AO ouvert", "Casablanca-Settat", "Casablanca", 760000, 12000],
  ["Commune de Taroudant", "Étude de sol, extension de l'abattoir municipal", "AO ouvert simplifié", "Souss-Massa", "Taroudant", 95000, 1500],
  ["Province de Chtouka", "Contrôle des matériaux, pistes rurales", "AO ouvert", "Souss-Massa", "Biougra", 430000, 7000],
  ["Ministère de l'Éducation (AREF)", "Études géotechniques, 6 établissements scolaires", "AO ouvert", "Souss-Massa", "Agadir", 640000, 10000],
  ["SNTL", "Expertise structure et fondations, entrepôt", "Procédure négociée", "Casablanca-Settat", "Casablanca", 260000, 4000],
  ["ONEE Branche Électricité", "Étude géotechnique, poste source 225 kV", "AO ouvert", "Guelmim-Oued Noun", "Tan-Tan", 470000, 8000],
  ["Commune de Marrakech", "Contrôle qualité réhabilitation de la médina, lot voirie", "AO ouvert", "Marrakech-Safi", "Marrakech", 980000, 16000],
  ["ANP", "Reconnaissance géotechnique marine, port de Tan-Tan", "Concours", "Guelmim-Oued Noun", "Tan-Tan", 2100000, 30000],
  ["Commune d'Aït Melloul", "Essais de compactage, zone industrielle", "AO ouvert simplifié", "Souss-Massa", "Aït Melloul", 160000, 2500],
  ["Université Cadi Ayyad", "Étude géotechnique, cité universitaire", "AO ouvert", "Marrakech-Safi", "Marrakech", 410000, 7000],
  ["DPEE Tiznit", "Contrôle qualité, réhabilitation route nationale N1", "AO ouvert", "Souss-Massa", "Tiznit", 750000, 12000],
];
const HORS: [string, string, string][] = [
  ["Commune d'Agadir", "Fourniture de bureau et consommables informatiques", "hors périmètre : fournitures"],
  ["ONEE", "Travaux de génie électrique, lignes MT", "hors périmètre : génie électrique"],
  ["CHU Marrakech", "Nettoyage et gardiennage des locaux", "hors périmètre : services généraux"],
  ["Région Souss-Massa", "Acquisition de véhicules utilitaires", "hors périmètre : fournitures"],
  ["Commune de Guelmim", "Entretien des espaces verts", "hors périmètre : services généraux"],
  ["ONCF", "Maintenance des systèmes de signalisation", "hors périmètre : électronique"],
  ["Université Ibn Zohr", "Restauration collective", "hors périmètre : services généraux"],
  ["OCP", "Location d'engins de levage", "hors périmètre : location matériel"],
  ["ADM", "Travaux de peinture de signalisation horizontale", "hors périmètre : travaux routiers"],
  ["Commune de Tiznit", "Éclairage public LED", "hors périmètre : génie électrique"],
  ["AREF Souss-Massa", "Fourniture de mobilier scolaire", "hors périmètre : fournitures"],
  ["Lydec", "Développement d'une application mobile", "hors périmètre : informatique"],
  ["ONDA", "Climatisation et CVC du terminal", "hors périmètre : CVC"],
  ["Province d'Inezgane", "Transport du personnel", "hors périmètre : transport"],
  ["DPEE Ouarzazate", "Études architecturales", "hors périmètre : architecture"],
];
const QUALIFS = ["Classe 1 — Laboratoire BTP", "Agrément essais sols", "Agrément essais béton", "Reconnaissance géotechnique"];
export const seedAOs = (): AO[] => {
  const out: AO[] = [];
  BASE_AO.forEach(([mo, objet, proc, region, ville, est, caution], i) => {
    const j = i < 3 ? rint(2, 3) : rint(-10, 30);
    const bd = { Domaine: rint(15, 20), "Classe/qualif.": rint(10, 15), Zone: rint(5, 15), Estimation: rint(5, 10), Matériel: rint(5, 10), Charge: rint(3, 10), "Historique MO": rint(2, 10), Délai: rint(2, 10) };
    const score = Object.values(bd).reduce((a, b) => a + b, 0);
    const statut: AOStatut = j < 0 ? "Expiré" : i < 8 ? (["Nouveau", "À décider", "À décider", "Go", "En dossier", "En dossier", "En dossier", "En dossier"] as AOStatut[])[i] : pick(["Nouveau", "À décider", "Go", "No-Go", "En dossier", "Nouveau", "À décider"] as AOStatut[]);
    out.push({
      id: id("ao", i), ref: `AOO n° ${rint(10, 60)}/2026/${mo.replace(/[^A-Z]/g, "").slice(0, 4) || "CMN"}`,
      mo, objet, procedure: proc, region, ville, estimation: est, caution, deadline: iso(addDays(j)), source: i % 4 === 0 ? pick(SOURCES.slice(1, 5)) : i % 5 === 0 ? pick(SOURCES.slice(5)) : SOURCES[0],
      score, breakdown: bd, statut, pertinent: true, visite: rnd() > 0.5, delaiExec: `${rint(2, 8)} mois`, qualifs: [QUALIFS[0], pick(QUALIFS.slice(1))],
      assignee: statut === "Nouveau" ? undefined : pick(PEOPLE.slice(0, 4)), motif: statut === "No-Go" ? pick(["Charge trop élevée", "Zone trop éloignée", "Estimation trop faible"]) : undefined,
      comments: [], detectedAt: iso(addDays(-rint(0, 12))),
    });
  });
  HORS.forEach(([mo, objet, why], k) => {
    out.push({
      id: id("ax", k), ref: `AO n° ${rint(10, 90)}/2026`, mo, objet, procedure: "AO ouvert", region: pick(REGIONS), ville: "—", estimation: rint(80, 900) * 1000, caution: 5000,
      deadline: iso(addDays(rint(3, 25))), source: pick(SOURCES), score: rint(3, 22), breakdown: { Domaine: 0 }, statut: "Exclu", pertinent: false, excluReason: why,
      visite: false, delaiExec: "—", qualifs: [], comments: [], detectedAt: iso(addDays(-rint(0, 7))),
    });
  });
  return out;
};

export interface BC { id: string; num: string; demandeur: string; prestation: string; quantite: string; montant: number; statut: string; source: string; date: string; numBC?: string }
export const BC_STATUTS = ["Détecté", "Devis à faire", "Devis envoyé", "Commandé", "Livré/Réalisé", "Facturé"];
export const seedBCs = (): BC[] => {
  const items: [string, string, string, number][] = [
    ["Commune de Taroudant", "Essais de compression sur éprouvettes de béton", "60 éprouvettes", 45000],
    ["Commune d'Agadir", "Essais Proctor et CBR, voirie", "12 essais", 38000], ["Lycée Al Massira", "Étude de sol, salle multisports", "3 sondages", 28000],
    ["Commune d'Inezgane", "Contrôle compactage tranchées", "40 points", 22000], ["Province de Tiznit", "Essais granulométriques", "25 essais", 14000],
    ["CHP Guelmim", "Essais béton, extension urgences", "45 éprouvettes", 18000], ["Commune de Biougra", "Pénétromètre dynamique", "60 ml", 16000],
    ["ORMVA Souss-Massa", "Analyse d'eau de gâchage", "8 essais", 9000], ["Commune de Marrakech", "Essais de plaque", "6 essais", 24000],
    ["Commune de Tan-Tan", "Prélèvements et essais de sols", "10 points", 19000], ["DPEE Agadir", "Los Angeles granulats", "10 essais", 12000],
    ["Commune de Dcheira", "Limites d'Atterberg", "15 essais", 8000], ["Commune d'Ouarzazate", "Rapport d'expertise fissures", "1 rapport", 35000],
  ];
  return items.map(([d, p, q, m], i) => ({ id: id("bc", i), num: `BC-${2026}-${String(i + 101)}`, demandeur: d, prestation: p, quantite: q, montant: m, statut: BC_STATUTS[i % 6], source: i % 3 ? "marchespublics.gov.ma (BC)" : "Source privée A", date: iso(addDays(-rint(0, 30))), numBC: i % 6 >= 3 ? `BC n° ${rint(10, 99)}/2026` : undefined }));
};

export interface Prix { id: string; code: string; categorie: string; designation: string; unite: string; prix: number; cout: number; usage: number; maj: string }
export const seedPrix = (): Prix[] => {
  const L: [string, string, string, number][] = [
    ["Mobilisation", "Mobilisation/démobilisation atelier de sondage", "forfait", 25000],
    ["Reconnaissance in situ", "Sondage carotté Ø101 en terrain meuble", "ml", 520],
    ["Reconnaissance in situ", "Sondage carotté Ø101 en rocher tendre", "ml", 780],
    ["Reconnaissance in situ", "Puits à la pelle mécanique", "u", 1500],
    ["Essais in situ", "Pénétromètre dynamique", "ml", 120],
    ["Essais in situ", "Essai SPT", "u", 350],
    ["Essais in situ", "Essai pressiométrique Ménard", "u", 900],
    ["Essais in situ", "Essai de plaque", "u", 2800],
    ["Essais de laboratoire", "Analyse granulométrique", "u", 450],
    ["Essais de laboratoire", "Limites d'Atterberg", "u", 400],
    ["Essais de laboratoire", "Proctor modifié", "u", 900],
    ["Essais de laboratoire", "CBR", "u", 1400],
    ["Essais de laboratoire", "Los Angeles", "u", 700],
    ["Contrôle qualité", "Compression éprouvette béton", "u", 90],
    ["Contrôle qualité", "Contrôle de compactage (gammadensimètre)", "point", 180],
    ["Rapports & études", "Rapport géotechnique", "forfait", 18000],
    ["Rapports & études", "Rapport d'expertise", "forfait", 25000],
  ];
  return L.map(([c, d, u, p], i) => ({ id: id("px", i), code: `P${String(i + 1).padStart(2, "0")}`, categorie: c, designation: d, unite: u, prix: p, cout: Math.round(p * (0.55 + rnd() * 0.15)), usage: rint(3, 60), maj: iso(addDays(-rint(10, 200))) }));
};

export interface DocPerm { id: string; type: string; emission: string; expiration?: string; version: number; fichier: string }
export const seedDocsPerm = (): DocPerm[] => {
  const L: [string, number, number | null][] = [
    ["Statuts de la société", -900, null], ["PV de nomination du gérant", -700, null], ["Registre de commerce (modèle 7)", -40, 50],
    ["Attestation de régularité fiscale", -170, 12], ["Attestation CNSS", -95, -5], ["Attestation d'assurance RC professionnelle", -200, 165],
    ["Certificat de qualification Classe 1", -400, 330], ["Certificat ISO 9001:2015", -300, 795], ["RIB certifié", -60, null],
    ["Procuration du gérant", -120, 245], ["CV & diplômes ingénieurs", -30, null], ["Attestation d'agrément laboratoire", -250, 25],
    ["Attestation de non-faillite", -20, 70], ["Liste du matériel certifiée", -45, 140],
  ];
  return L.map(([t, e, x], i) => ({ id: id("dp", i), type: t, emission: iso(addDays(e)), expiration: x === null ? undefined : iso(addDays(x)), version: rint(1, 4), fichier: `${t.toLowerCase().replace(/[^a-z]+/g, "-")}.pdf` }));
};

export interface Ref { id: string; projet: string; mo: string; nature: string; montant: number; annee: number; ville: string; tags: string[] }
export const seedRefs = (): Ref[] => {
  const villes = ["Agadir", "Marrakech", "Taroudant", "Guelmim", "Casablanca", "Tiznit"];
  const nat = ["Étude géotechnique", "Contrôle qualité", "Expertise", "Essais de laboratoire"];
  const proj = ["Lycée qualifiant", "Station de pompage", "Pont sur oued", "Résidence R+5", "Route provinciale", "Hôpital provincial", "Château d'eau", "Marché couvert", "Centre de formation", "Lotissement", "Digue", "Complexe sportif", "Barrage collinaire", "Siège administratif", "Zone industrielle", "Parking souterrain", "Station d'épuration", "Collège rural"];
  return proj.map((p, i) => { const v = villes[i % 6]; const n = nat[i % 4]; return { id: id("rf", i), projet: `${p} — ${v}`, mo: pick(["DPEE", "Commune", "ONEE", "Al Omrane", "AREF", "Promoteur privé"]), nature: n, montant: rint(80, 1500) * 1000, annee: rint(2021, 2026), ville: v, tags: [n.toLowerCase(), v.toLowerCase()] }; });
};
export interface Staff { id: string; nom: string; poste: string; diplome: string; experience: number; agence: string }
export const seedStaff = (): Staff[] => [
  ["Karim El Idrissi", "Gérant — Direction", "Ingénieur EHTP", 18, "casa"], ["Youssef Ait Lahcen", "Responsable région Sud", "Ingénieur EMI", 14, "agadir"],
  ["Salma Benjelloun", "Responsable Marchés", "Master Droit public", 9, "casa"], ["Hajar Ouazzani", "Chargée AO", "Licence Gestion", 4, "casa"],
  ["Mehdi Tazi", "Chargé AO", "Licence Économie", 3, "agadir"], ["Imane Chraibi", "Chargée bons de commande", "BTS", 5, "marrakech"],
  ["Rachid Bouzid", "Chargé bons de commande", "DUT", 6, "agadir"], ["Nadia Berrada", "Responsable Comptabilité & Finances", "ISCAE", 12, "casa"],
  ["Anas Lamrani", "Ingénieur géotechnicien", "Ingénieur EHTP", 7, "agadir"], ["Sara Kettani", "Ingénieure géotechnicienne", "Ingénieure EMI", 5, "marrakech"],
  ["Hamid Naciri", "Chef de laboratoire", "Technicien supérieur", 15, "agadir"], ["Abdellah Outaleb", "Technicien sondeur", "OFPPT", 10, "guelmim"],
].map((r, i) => ({ id: id("st", i), nom: r[0] as string, poste: r[1] as string, diplome: r[2] as string, experience: r[3] as number, agence: r[4] as string }));
export interface Equip { id: string; nom: string; qte: number; etat: string; etalonnage: string; agence: string; dispo: boolean }
export const seedEquip = (): Equip[] => ["Sondeuse carottière", "Pénétromètre dynamique lourd", "Pressiomètre Ménard", "Pelle mécanique", "Presse béton 3000 kN", "Gammadensimètre", "Appareil CBR", "Moule Proctor", "Machine Los Angeles", "Tamiseuse", "Casagrande", "Plaque de chargement", "Étuve de laboratoire", "GPS topographique"].map((n, i) => ({ id: id("eq", i), nom: n, qte: rint(1, 4), etat: pick(["Bon", "Bon", "Moyen", "En maintenance"]), etalonnage: iso(addDays(-rint(20, 400))), agence: pick(["agadir", "marrakech", "guelmim", "casa"]), dispo: rnd() > 0.2 }));

export interface Param { id: string; libelle: string; valeur: string; source: string; statut: "Validé" | "À valider par le juridique"; maj: string }
export const seedParams = (): Param[] => [
  ["Délai minimum de publicité — AO ouvert", "21 jours", "Décret 2-22-431"], ["Délai minimum de publicité — AO ouvert simplifié", "10 jours", "Décret 2-22-431"],
  ["Validité des offres (défaut)", "75 jours", "RC de l'AO"], ["Seuil bon de commande", "500 000 DH TTC", "Décret 2-22-431"],
  ["Offre anormalement basse", "80 % de l'estimation", "Décret 2-22-431"], ["Préférence nationale", "15 %", "Décret 2-22-431"],
  ["Validité des attestations (fiscale/CNSS)", "1 an", "RC de l'AO"], ["Caution provisoire (indicatif)", "1 % à 2 % de l'estimation", "RC de l'AO"],
  ["Caution définitive", "3 % du montant du marché", "CCAG"], ["Retenue de garantie", "7 % plafonnée", "CCAG"],
  ["CCAG applicable — études", "CCAG-EMO (selon nature, à confirmer au cadrage)", "CCAG"], ["CCAG applicable — travaux", "CCAG-T (selon nature, à confirmer au cadrage)", "CCAG"],
].map((r, i) => ({ id: id("pm", i), libelle: r[0], valeur: r[1], source: r[2], statut: i < 2 ? "Validé" : "À valider par le juridique", maj: iso(addDays(-rint(1, 60))) }));

export const seedCautions = () => {
  const banks = ["Attijariwafa bank", "Bank of Africa", "Banque Populaire", "CIH Bank"];
  return [
    ["provisoire", "ao004", 10000, "Émise"], ["provisoire", "ao005", 12000, "Déposée"], ["provisoire", "ao006", 6000, "Demandée"],
    ["définitive", "ao007", 37200, "Émise"], ["retenue de garantie", "ao007", 58000, "Déposée"], ["provisoire", "ao008", 5000, "Mainlevée demandée"],
  ].map((r, i) => ({ id: id("ct", i), type: r[0] as string, aoId: r[1] as string, banque: banks[i % 4], montant: r[2] as number, emission: iso(addDays(-rint(5, 60))), validite: iso(addDays(rint(40, 160))), statut: r[3] as string, frais: Math.round((r[2] as number) * 0.012) }));
};

// ---------- Compta
export const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
export const CUR_MONTH = today().getMonth();
export const AG_OP = ["agadir", "marrakech", "guelmim"];
export const seedObjectifs = () => {
  const base: Record<string, number> = { agadir: 620000, marrakech: 540000, guelmim: 360000 };
  const o: Record<string, Record<Activite, number[]>> = {};
  AG_OP.forEach((a) => { o[a] = {} as Record<Activite, number[]>; ACTIVITES.forEach((act, k) => { o[a][act] = MONTHS.map((_, m) => Math.round((base[a] * [0.5, 0.33, 0.17][k] * (0.85 + 0.3 * Math.sin((m + 2) / 2))) / 1000) * 1000); }); });
  return o;
};

const CLIENT_NAMES = ["DPEE Agadir", "Commune d'Agadir", "Al Omrane Souss-Massa", "ONEE Branche Eau", "Groupe Addoha", "Alliances Darna", "Sogea Maroc", "SGTM", "Bureau d'études Novec", "CID", "Promotion Souss Immo", "Commune de Marrakech", "ORMVA Souss-Massa", "Université Ibn Zohr", "M. Hassan Alaoui", "Jet Contractors", "Région Souss-Massa", "Commune de Guelmim"];
export const SEGMENTS = ["Maître d'ouvrage public", "Promoteur", "Bureau d'études", "Entreprise de BTP", "Particulier"];
export const seedClients = () => CLIENT_NAMES.map((n, i) => ({ id: id("cl", i), nom: n, ice: String(rint(100000000, 999999999)) + String(rint(100000, 999999)), segment: /Commune|DPEE|ONEE|ORMVA|Université|Région|Al Omrane/.test(n) ? SEGMENTS[0] : /Groupe|Alliances|Promotion/.test(n) ? SEGMENTS[1] : /Novec|CID/.test(n) ? SEGMENTS[2] : /M\./.test(n) ? SEGMENTS[4] : SEGMENTS[3], contact: pick(["M. Bennani", "Mme Alami", "M. Ziani", "Mme Idrissi"]), tel: `+212 6${rint(10, 99)} ${rint(10, 99)} ${rint(10, 99)} ${rint(10, 99)}`, ville: pick(["Agadir", "Marrakech", "Guelmim", "Casablanca"]), public: /Commune|DPEE|ONEE|ORMVA|Université|Région/.test(n) }));

export type FactStatut = "Brouillon" | "Validée" | "Envoyée" | "Partiellement payée" | "Payée" | "En retard" | "Annulée";
export interface Facture { id: string; num: string; clientId: string; agence: string; activite: Activite; lien: string; ht: number; date: string; echeance: string; statut: FactStatut; paye: number }
export const seedFactures = (clients: { id: string }[]): Facture[] => Array.from({ length: 60 }, (_, i) => {
  const age = rint(0, 120); const ht = rint(15, 260) * 1000; const date = addDays(-age);
  const ech = addDays(-age + 60);
  let statut: FactStatut = age > 75 ? pick(["Payée", "En retard", "Payée", "Partiellement payée"]) : age > 30 ? pick(["Payée", "Envoyée", "Envoyée"]) : pick(["Brouillon", "Validée", "Envoyée", "Envoyée"]);
  if (statut === "Envoyée" && ech < today()) statut = "En retard";
  const ttc = ht * 1.2;
  return { id: id("fa", i), num: `FA-2026-${String(i + 1).padStart(4, "0")}`, clientId: pick(clients).id, agence: pick(AG_OP), activite: pick([...ACTIVITES]), lien: pick(["Devis", "Marché", "Décompte", "Manuel"]), ht, date: iso(date), echeance: iso(ech), statut, paye: statut === "Payée" ? ttc : statut === "Partiellement payée" ? Math.round(ttc * 0.4) : 0 };
});

export const seedDecomptes = () => [
  { id: "dc001", num: "Décompte provisoire n° 1", marche: "Al Omrane — VRD relogement", executes: 310000, cumul: 310000, statut: "Mandaté", date: iso(addDays(-45)) },
  { id: "dc002", num: "Décompte provisoire n° 2", marche: "Al Omrane — VRD relogement", executes: 240000, cumul: 550000, statut: "Visé par le maître d'ouvrage", date: iso(addDays(-12)) },
  { id: "dc003", num: "Décompte provisoire n° 1", marche: "DPEE Tiznit — RN1", executes: 180000, cumul: 180000, statut: "Établi", date: iso(addDays(-3)) },
];

export const seedFournisseurs = () => {
  const F = [["Forages du Souss", "Sous-traitance sondage"], ["Afriquia SMDC", "Carburant"], ["Labo Atlas", "Laboratoire"], ["Engins Sud Location", "Location d'engins"], ["Wafa Assurance", "Assurances"], ["SCI Guéliz", "Loyers"]];
  const steps = ["Saisie", "Contrôle", "Approbation", "À payer", "Payée"];
  return Array.from({ length: 40 }, (_, i) => { const f = pick(F); const age = rint(0, 70); return { id: id("ff", i), num: `F-${rint(1000, 9999)}`, fournisseur: f[0], categorie: f[1], agence: pick(AG_OP), ht: rint(2, 90) * 1000, date: iso(addDays(-age)), echeance: iso(addDays(-age + 60)), statut: age > 50 ? "Payée" : pick(steps) }; });
};
export const seedNotesFrais = () => Array.from({ length: 15 }, (_, i) => ({ id: id("nf", i), agent: pick(["Anas Lamrani", "Sara Kettani", "Abdellah Outaleb", "Hamid Naciri"]), chantier: pick(["RR105 Tiznit", "Digue Guelmim", "CHU Marrakech", "Bassins ORMVA"]), montant: rint(300, 4500), date: iso(addDays(-rint(0, 30))), statut: pick(["Soumise", "Validée chef d'agence", "Validée compta", "Remboursée"]) }));

export const seedComptes = () => [
  { id: "bk1", banque: "Attijariwafa bank", numero: "…4512", solde: 1284500 },
  { id: "bk2", banque: "Bank of Africa", numero: "…7730", solde: 412300 },
  { id: "bk3", banque: "Banque Populaire", numero: "…0981", solde: 186900 },
];

export const seedLeads = () => {
  const src = ["WhatsApp", "E-mail", "Téléphone", "Recommandation", "Appel d'offres"];
  const st = ["Nouveau", "Qualifié", "Devis à faire", "Devis envoyé", "Relance", "Gagné", "Perdu"];
  const ouvr = ["Villa R+1", "Immeuble R+4", "Hangar", "Piscine", "Lotissement", "Mur de soutènement", "École"];
  const noms = ["Ahmed Benali", "Fatima Zahra Idrissi", "Mohamed Alaoui", "Khadija Bennis", "Hicham Tahiri", "Zineb Mansouri", "Said Rami", "Nawal Sabri", "Adil Chafik", "Samira Haddad"];
  return Array.from({ length: 30 }, (_, i) => { const t = pick([...ACTIVITES]); const o = pick(ouvr); const v = pick(["Agadir", "Marrakech", "Guelmim", "Tiznit", "Taroudant"]); return {
    id: id("ld", i), nom: `${pick(noms)}`, source: pick(src), type: t, ville: v, ouvrage: o, urgence: pick(["Faible", "Moyenne", "Haute"]), budget: rint(8, 120) * 1000, score: rint(35, 96), statut: st[i % 7], agence: v === "Marrakech" ? "marrakech" : v === "Guelmim" ? "guelmim" : "agadir", date: iso(addDays(-rint(0, 40))),
    messages: [{ from: "client", text: `Bonjour, nous avons besoin d'une ${t.toLowerCase().replace(/s$/, "")} pour un projet de ${o.toLowerCase()} à ${v}. Pouvez-vous nous envoyer un devis ?`, at: iso(addDays(-rint(1, 20))) }, { from: "lgtp", text: "Bonjour, merci pour votre demande. Pourriez-vous nous préciser la surface et le plan de masse ?", at: iso(addDays(-rint(0, 1))) }],
  }; });
};
export const seedDevis = (clients: { id: string }[]) => Array.from({ length: 25 }, (_, i) => ({ id: id("dv", i), num: `DV-2026-${String(i + 1).padStart(3, "0")}`, clientId: pick(clients).id, objet: pick(["Étude géotechnique villa", "Essais béton", "Contrôle compactage", "Expertise fissures", "Étude de sol immeuble"]), montant: rint(8, 150) * 1000, date: iso(addDays(-rint(0, 40))), statut: pick(["Envoyé", "Envoyé", "Accepté", "Refusé", "En attente"]) }));

export const FAQ_CATS = ["Services", "Études géotechniques", "Essais & laboratoire", "Suivi & contrôle qualité", "Expertise", "Devis & délais", "Documents à fournir", "Facturation & paiement", "Autre"];
export const seedFaq = () => {
  const Q: [string, string, string][] = [
    ["Quels services propose LGTP ?", "LGTP réalise des études géotechniques, le suivi et contrôle qualité des travaux, et des expertises (désordres, fondations, chaussées).", "Services"],
    ["Qu'est-ce qu'une étude géotechnique ?", "C'est l'étude du sol d'un terrain (sondages, essais in situ et en laboratoire) pour définir le type de fondations adapté à votre ouvrage.", "Études géotechniques"],
    ["Quelle différence entre mission G1 et G2 ?", "La G1 est une étude préliminaire de site ; la G2 (avant-projet / projet) dimensionne les fondations de votre ouvrage.", "Études géotechniques"],
    ["Comment est défini le programme de sondages ?", "Selon la surface, le nombre de niveaux et la nature du terrain : en général 1 sondage pour 200 à 400 m² d'emprise, avec au moins 2 sondages.", "Études géotechniques"],
    ["Quels essais de laboratoire réalisez-vous ?", "Granulométrie, limites d'Atterberg, Proctor, CBR, Los Angeles, compression béton, cisaillement, œdomètre.", "Essais & laboratoire"],
    ["Faites-vous des essais in situ ?", "Oui : pénétromètre dynamique, SPT, pressiomètre Ménard et essais de plaque.", "Essais & laboratoire"],
    ["Contrôlez-vous le béton sur chantier ?", "Oui, nous prélevons des éprouvettes et réalisons les essais de compression à 7 et 28 jours.", "Suivi & contrôle qualité"],
    ["Proposez-vous le contrôle de compactage ?", "Oui, au gammadensimètre et à la plaque, pour remblais, couches de chaussée et tranchées.", "Suivi & contrôle qualité"],
    ["Mon bâtiment présente des fissures, que faire ?", "Nous réalisons une expertise : visite, diagnostic, éventuels sondages et rapport avec recommandations.", "Expertise"],
    ["Intervenez-vous pour des litiges ?", "Nous réalisons des expertises techniques ; pour les expertises judiciaires, contactez-nous pour étudier la demande.", "Expertise"],
    ["Comment obtenir un devis ?", "Envoyez-nous le plan de situation, le plan de masse et la description du projet par e-mail ou WhatsApp ; nous répondons sous 48 h ouvrées.", "Devis & délais"],
    ["Quel est le délai d'une étude géotechnique ?", "En général 2 à 4 semaines selon le programme de sondages et les essais.", "Devis & délais"],
    ["Pouvez-vous intervenir en urgence ?", "Selon la disponibilité de nos équipes, une intervention sous 72 h est possible.", "Devis & délais"],
    ["Quels documents fournir pour un devis ?", "Plan de situation, plan de masse, nombre de niveaux, sous-sol éventuel, et coordonnées du maître d'ouvrage.", "Documents à fournir"],
    ["Faut-il une autorisation pour accéder au terrain ?", "Oui, le maître d'ouvrage doit garantir l'accès au terrain et signaler les réseaux enterrés.", "Documents à fournir"],
    ["Quels modes de paiement acceptez-vous ?", "Virement bancaire, chèque certifié et, pour les marchés publics, paiement par mandat.", "Facturation & paiement"],
    ["Faut-il verser un acompte ?", "Pour les particuliers et entreprises privées, un acompte de 30 % est demandé à la commande.", "Facturation & paiement"],
    ["Vos factures mentionnent-elles l'ICE ?", "Oui, toutes nos factures comportent l'ICE, le RC, l'IF et la TVA à 20 %.", "Facturation & paiement"],
    ["Quelles zones couvrez-vous ?", "Tout le Sud du Maroc via nos agences d'Agadir, Marrakech et Guelmim, et la région de Casablanca via le siège.", "Services"],
    ["LGTP est-il qualifié ?", "LGTP est classé Classe 1 pour les activités de laboratoire BTP.", "Services"],
    ["Travaillez-vous avec les particuliers ?", "Oui, pour les villas et petits bâtiments.", "Services"],
    ["Combien coûte une étude de sol pour une villa ?", "Le prix dépend du programme ; nous établissons un devis gratuit après réception de vos plans.", "Devis & délais"],
    ["Fournissez-vous un rapport ?", "Oui, un rapport géotechnique signé par un ingénieur avec coupes de sondages et recommandations.", "Études géotechniques"],
    ["Que contient le rapport d'essais ?", "Les résultats d'essais, normes appliquées, et l'interprétation par nos ingénieurs.", "Essais & laboratoire"],
    ["Peut-on suivre l'avancement ?", "Votre chargé d'affaires vous informe à chaque étape (sondages, essais, rapport).", "Autre"],
    ["Comment faire une réclamation ?", "Adressez-nous un e-mail avec la référence du dossier ; un responsable vous rappelle sous 48 h.", "Autre"],
    ["Parlez-vous arabe et anglais ?", "Oui, nos équipes répondent en français, arabe et anglais.", "Autre"],
    ["Réalisez-vous des puits de reconnaissance ?", "Oui, à la pelle mécanique, utiles pour l'observation directe du sol.", "Études géotechniques"],
    ["Délai de paiement des factures ?", "60 jours maximum à compter de la date de facture, conformément à la réglementation.", "Facturation & paiement"],
    ["Contrôlez-vous les granulats ?", "Oui : Los Angeles, Micro-Deval, équivalent de sable et granulométrie.", "Essais & laboratoire"],
  ];
  return Q.map(([q, r, c], i) => ({ id: id("fq", i), question: q, reponse: r, categorie: c, statut: i % 9 === 8 ? "Brouillon" : "Publié", langue: "FR", maj: iso(addDays(-rint(1, 90))) }));
};
export const seedScDocs = () => ["Plaquette de présentation LGTP", "Liste des essais proposés", "Modèle de demande de devis", "Documents à fournir pour un devis", "Conditions générales et modes de paiement", "Fiche de réclamation", "Certificat Classe 1", "Certificat ISO 9001"].map((t, i) => ({ id: id("sd", i), titre: t, categorie: i < 2 ? "Présentation" : i < 4 ? "Devis" : i < 6 ? "Conditions" : "Certificats", langue: "FR", version: `v${rint(1, 3)}`, taille: `${rint(120, 2400)} Ko`, date: iso(addDays(-rint(5, 200))), visible: i !== 5 }));
export const seedSocials = () => [
  ["LinkedIn", "Société"], ["Facebook", "Société"], ["Instagram", "Société"], ["YouTube", "Société"], ["WhatsApp Business", "Société"], ["Site web", "Société"],
  ["Facebook", "Agence Agadir"], ["WhatsApp Business", "Agence Agadir"], ["Facebook", "Agence Marrakech"], ["WhatsApp Business", "Agence Guelmim"],
].map(([p, r], i) => ({ id: id("so", i), plateforme: p, url: `https://exemple.com/lgtp-${p.toLowerCase().replace(/\s/g, "")}${i}`, rattachement: r, visible: true }));

export const seedObligations = () => {
  const y = today().getFullYear(); const out: { id: string; libelle: string; echeance: string; montant: number; statut: string }[] = [];
  for (let m = 0; m < 12; m++) {
    out.push({ id: `ob-tva-${m}`, libelle: `TVA mensuelle — ${MONTHS[m]}`, echeance: iso(new Date(y, m + 1, 20)), montant: rint(70, 140) * 1000, statut: m < CUR_MONTH - 1 ? "Payé" : m === CUR_MONTH - 1 ? "Prêt" : "À préparer" });
    out.push({ id: `ob-cnss-${m}`, libelle: `CNSS — ${MONTHS[m]}`, echeance: iso(new Date(y, m + 1, 10)), montant: rint(45, 60) * 1000, statut: m < CUR_MONTH - 1 ? "Payé" : "À préparer" });
    out.push({ id: `ob-ir-${m}`, libelle: `IR salaires (retenue à la source) — ${MONTHS[m]}`, echeance: iso(new Date(y, m + 1, 30)), montant: rint(25, 40) * 1000, statut: m < CUR_MONTH - 1 ? "Payé" : "À préparer" });
  }
  [2, 5, 8, 11].forEach((m, k) => out.push({ id: `ob-is-${k}`, libelle: `Acompte IS n° ${k + 1}`, echeance: iso(new Date(y, m, 31)), montant: 95000, statut: m < CUR_MONTH ? "Payé" : "À préparer" }));
  out.push({ id: "ob-isa", libelle: "Déclaration IS annuelle", echeance: iso(new Date(y, 2, 31)), montant: 0, statut: CUR_MONTH > 2 ? "Déclaré" : "À préparer" });
  out.push({ id: "ob-tp", libelle: "Taxe professionnelle", echeance: iso(new Date(y, 2, 31)), montant: 18000, statut: CUR_MONTH > 2 ? "Payé" : "À préparer" });
  return out;
};
