import { useEffect, useState } from "react";
import { create } from "zustand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { makePdf, type PdfSection } from "./pdf";

type Req = { kind: "prompt" | "confirm"; title: string; value: string; resolve: (v: string | null) => void } | null;
const useDlg = create<{ req: Req; pdf: { title: string; url: string } | null; set: (p: Partial<{ req: Req; pdf: { title: string; url: string } | null }>) => void }>((set) => ({ req: null, pdf: null, set: (p) => set(p) }));

/** In-app replacement for window.prompt — resolves to the typed value or null. */
export const ask = (title: string, value = "") => new Promise<string | null>((resolve) => useDlg.getState().set({ req: { kind: "prompt", title, value, resolve } }));
export const confirmAsk = (title: string) => new Promise<boolean>((resolve) => useDlg.getState().set({ req: { kind: "confirm", title, value: "", resolve: (v) => resolve(v !== null) } }));
/** Opens an in-app PDF viewer for a generated document. */
export async function previewPdf(title: string, sections: PdfSection[], opts: { draft?: boolean; subtitle?: string } = {}) {
  const url = (await makePdf(title, sections, { ...opts, preview: true })) as string;
  useDlg.getState().set({ pdf: { title, url } });
}
export const showPdfUrl = (title: string, url: string) => useDlg.getState().set({ pdf: { title, url } });

export function DialogHost() {
  const { req, pdf, set } = useDlg();
  const [v, setV] = useState("");
  useEffect(() => setV(req?.value ?? ""), [req]);
  const close = (val: string | null) => { req?.resolve(val); set({ req: null }); };
  return (
    <>
      <Dialog open={!!req} onOpenChange={(o) => !o && close(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{req?.title}</DialogTitle>{req?.kind === "confirm" && <DialogDescription>Cette action est irréversible.</DialogDescription>}</DialogHeader>
          {req?.kind === "prompt" && <Input autoFocus value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && v && close(v)} />}
          <DialogFooter><Button variant="ghost" onClick={() => close(null)}>Annuler</Button><Button variant={req?.kind === "confirm" ? "destructive" : "default"} disabled={req?.kind === "prompt" && !v} onClick={() => close(req?.kind === "confirm" ? "ok" : v)}>{req?.kind === "confirm" ? "Confirmer" : "Valider"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!pdf} onOpenChange={(o) => !o && set({ pdf: null })}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>{pdf?.title}</DialogTitle></DialogHeader>
          {pdf && <iframe src={pdf.url} title={pdf.title} className="h-[72vh] w-full rounded-lg border" />}
          <DialogFooter>{pdf && <Button asChild><a href={pdf.url} download={`${pdf.title}.pdf`}>Télécharger</a></Button>}</DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
