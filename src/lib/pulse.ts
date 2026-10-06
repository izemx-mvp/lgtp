// Fires the LGTP triangle "pulse" on the Géo-Vision scene when something important happens.
export function pulse() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("lgtp-pulse"));
}
