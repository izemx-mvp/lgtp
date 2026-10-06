import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => { throw redirect({ to: "/admin/login" }); },
  head: () => ({ meta: [{ title: "LGTP — Connexion" }, { name: "description", content: "Accès au backoffice LGTP." }, { property: "og:title", content: "LGTP — Connexion" }, { property: "og:description", content: "Accès au backoffice LGTP." }] }),
});
