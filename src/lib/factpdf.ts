import { toast } from "sonner";
import { makePdf } from "./pdf";
import { COMPANY, type Facture } from "./seed";
import { enLettres, fdate, money } from "./format";

export async function factPdf(f: Facture, client: string, preview = false) {
  const r = await makePdf(`Facture ${f.num}`, [
    { paragraphs: [`Client : ${client}`, `Date : ${fdate(f.date)} · Échéance : ${fdate(f.echeance)} · Agence : ${f.agence} · Activité : ${f.activite}`] },
    { table: { head: ["Désignation", "Montant HT", "TVA 20 %", "TTC"], rows: [[`Prestations — ${f.activite}`, money(f.ht), money(f.ht * 0.2), money(f.ht * 1.2)]] } },
    { paragraphs: [`Arrêtée la présente facture à la somme de : ${enLettres(f.ht * 1.2)} TTC.`, `Mentions légales : ICE ${COMPANY.ice} · ${COMPANY.rc} · ${COMPANY.if} · TVA 20 % · RIB ${COMPANY.rib}`, "Pénalités de retard : applicables au-delà du délai légal de paiement (loi 69-21)."] },
  ], { draft: f.statut === "Brouillon", filename: `${f.num}.pdf`, preview });
  if (!preview) toast.success(`${f.num}.pdf généré`);
  return r;
}
