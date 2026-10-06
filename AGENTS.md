<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Front-end-only demo: all data lives in one Zustand store (`src/lib/store.ts`) seeded from `src/lib/seed.ts` with dates relative to today — every screen reads/mutates it so cross-module changes stay consistent.
- Zustand selectors that derive arrays (filter/map) must use `useShallow`, otherwise React loops infinitely.
- Every list uses `src/components/DataTable.tsx`, whose state lives in URL search params prefixed by the table id.
- AI agents are simulated deterministically and embedded via `src/components/AgentPanel.tsx`; no standalone agents/settings page.
- PDFs are produced client-side with jsPDF through `src/lib/pdf.ts` (logo rasterised from /logo.svg).
