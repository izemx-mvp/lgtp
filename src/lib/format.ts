export const DAY = 86400000;
export const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
export const addDays = (n: number, base = today()) => new Date(base.getTime() + n * DAY);
export const iso = (d: Date) => d.toISOString();

export function money(n: number, dec = 2) {
  const s = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec })
    .format(n)
    .replace(/\u202f|\u00a0/g, " ");
  return `${s} DH`;
}
export const kdh = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(2).replace(".", ",")} M DH` : n >= 1e3 ? `${Math.round(n / 1e3)} k DH` : money(n, 0);

export function fdate(d: string | Date | undefined | null) {
  if (!d) return "—";
  const x = typeof d === "string" ? new Date(d) : d;
  const p = (v: number) => String(v).padStart(2, "0");
  return `${p(x.getDate())}/${p(x.getMonth() + 1)}/${x.getFullYear()}`;
}
export function fdatetime(d: string | Date) {
  const x = typeof d === "string" ? new Date(d) : d;
  return `${fdate(x)} ${String(x.getHours()).padStart(2, "0")}:${String(x.getMinutes()).padStart(2, "0")}`;
}
export const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - today().getTime()) / DAY);
export const pct = (n: number, dec = 0) => `${(n * 100).toFixed(dec).replace(".", ",")} %`;
export const TVA = 0.2;

const U = ["zéro","un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix","onze","douze","treize","quatorze","quinze","seize"];
const T = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];
function sub100(n: number): string {
  if (n <= 16) return U[n];
  if (n < 20) return "dix-" + U[n - 10];
  const t = Math.floor(n / 10), u = n % 10;
  if (t === 7 || t === 9) return T[t] + (u === 1 && t === 7 ? "-et-" : "-") + sub100(10 + u);
  if (u === 0) return T[t] + (t === 8 ? "s" : "");
  if (u === 1 && t !== 8) return T[t] + "-et-un";
  return T[t] + "-" + U[u];
}
function sub1000(n: number): string {
  const c = Math.floor(n / 100), r = n % 100;
  let s = c === 0 ? "" : c === 1 ? "cent" : U[c] + " cent" + (r === 0 ? "s" : "");
  if (r) s += (s ? " " : "") + sub100(r);
  return s || "zéro";
}
export function enLettres(n: number): string {
  const int = Math.floor(n), cts = Math.round((n - int) * 100);
  const parts: string[] = [];
  const m = Math.floor(int / 1e6), k = Math.floor((int % 1e6) / 1000), r = int % 1000;
  if (m) parts.push((m === 1 ? "un" : sub1000(m)) + " million" + (m > 1 ? "s" : ""));
  if (k) parts.push(k === 1 ? "mille" : sub1000(k) + " mille");
  if (r || !parts.length) parts.push(sub1000(r));
  let s = parts.join(" ") + " dirhams";
  if (cts) s += " et " + sub100(cts) + " centimes";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
