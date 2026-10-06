import { jsPDF } from "jspdf";
import { COMPANY } from "./seed";
import { fdate, money } from "./format";

let logoCache: string | null = null;
async function logoPng(): Promise<string | null> {
  if (logoCache) return logoCache;
  try {
    const img = new Image();
    img.src = "/logo.svg";
    await img.decode();
    const c = document.createElement("canvas");
    c.width = 336; c.height = 296;
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    logoCache = c.toDataURL("image/png");
    return logoCache;
  } catch { return null; }
}

export interface PdfSection { title?: string; paragraphs?: string[]; table?: { head: string[]; rows: (string | number)[][] } }

export async function makePdf(title: string, sections: PdfSection[], opts: { draft?: boolean; subtitle?: string; filename?: string; preview?: boolean } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await logoPng();
  const W = 210, H = 297;
  const header = () => {
    if (logo) doc.addImage(logo, "PNG", 14, 8, 22, 19.4);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(31, 95, 173);
    doc.text(`${COMPANY.raison} ${COMPANY.forme}`, 40, 14);
    doc.setFont("helvetica", "normal"); doc.setTextColor(90);
    doc.text(`ICE ${COMPANY.ice} · ${COMPANY.rc} · ${COMPANY.if} · ${COMPANY.cnss}`, 40, 19);
    doc.text(COMPANY.adresse, 40, 23.5);
    doc.setDrawColor(246, 185, 33); doc.setLineWidth(0.8); doc.line(14, 30, W - 14, 30);
  };
  const watermark = () => {
    doc.saveGraphicsState();
    // @ts-expect-error GState exists at runtime
    doc.setGState(new doc.GState({ opacity: 0.06 }));
    doc.setFillColor(31, 95, 173);
    const cx = W / 2, cy = H / 2 + 10, s = 40;
    doc.triangle(cx, cy - s * 1.1, cx - s * 0.6, cy - s * 0.15, cx + s * 0.6, cy - s * 0.15, "F");
    doc.triangle(cx - s * 1.2, cy + s * 0.9, cx - s * 0.6, cy - s * 0.05, cx, cy + s * 0.9, "F");
    doc.triangle(cx, cy + s * 0.9, cx + s * 0.6, cy - s * 0.05, cx + s * 1.2, cy + s * 0.9, "F");
    doc.setFillColor(246, 185, 33);
    doc.triangle(cx - s * 0.6, cy - s * 0.05, cx + s * 0.6, cy - s * 0.05, cx, cy + s * 0.85, "F");
    doc.restoreGraphicsState();
    if (opts.draft) {
      doc.saveGraphicsState();
      // @ts-expect-error GState
      doc.setGState(new doc.GState({ opacity: 0.12 }));
      doc.setFontSize(80); doc.setTextColor(220, 38, 38); doc.setFont("helvetica", "bold");
      doc.text("BROUILLON", W / 2, H / 2, { align: "center", angle: 35 });
      doc.restoreGraphicsState();
    }
  };
  let y = 40;
  header(); watermark();
  const ensure = (h: number) => { if (y + h > H - 20) { doc.addPage(); header(); watermark(); y = 40; } };
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(11, 31, 58);
  doc.splitTextToSize(title, W - 28).forEach((l: string) => { doc.text(l, 14, y); y += 7; });
  if (opts.subtitle) { doc.setFontSize(9.5); doc.setFont("helvetica", "normal"); doc.setTextColor(90); doc.text(opts.subtitle, 14, y); y += 7; }
  y += 2;
  for (const s of sections) {
    if (s.title) { ensure(12); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(31, 95, 173); doc.text(s.title, 14, y); y += 6; }
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(30);
    for (const p of s.paragraphs ?? []) { const lines = doc.splitTextToSize(p, W - 28); ensure(lines.length * 4.6 + 2); doc.text(lines, 14, y); y += lines.length * 4.6 + 2.5; }
    if (s.table) {
      const n = s.table.head.length; const cw = (W - 28) / n;
      const row = (cells: (string | number)[], bold = false) => {
        const wrapped = cells.map((c) => doc.splitTextToSize(String(c), cw - 2));
        const h = Math.max(...wrapped.map((w: string[]) => w.length)) * 4.2 + 2.5;
        ensure(h);
        if (bold) { doc.setFillColor(31, 95, 173); doc.rect(14, y - 4, W - 28, h, "F"); doc.setTextColor(255); doc.setFont("helvetica", "bold"); }
        else { doc.setDrawColor(225); doc.line(14, y + h - 4, W - 14, y + h - 4); doc.setTextColor(30); doc.setFont("helvetica", "normal"); }
        wrapped.forEach((w: string[], i: number) => doc.text(w, 15 + i * cw, y));
        y += h;
      };
      doc.setFontSize(8.5); row(s.table.head, true); s.table.rows.forEach((r) => row(r)); y += 3;
    }
  }
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120);
    doc.text(`LGTP · Document généré le ${fdate(new Date())} · Données fictives — démonstration`, 14, H - 10);
    doc.text(`Page ${i} / ${pages}`, W - 14, H - 10, { align: "right" });
  }
  const filename = opts.filename ?? `${title.replace(/[^\w]+/g, "_").slice(0, 60)}.pdf`;
  if (opts.preview) return doc.output("bloburl") as unknown as string;
  doc.save(filename);
  return filename;
}

export const moneyPdf = (n: number) => money(n);

export function downloadCSV(name: string, head: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = "\ufeff" + [head, ...rows].map((r) => r.map(esc).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
}
