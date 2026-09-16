# Fork policy decisions

Companion to `specs/tickets.md` (ticket D2). Each entry: date, decision,
tickets affected, one-paragraph rationale. Policy content lives only in
`specs/` per tickets.md §6.1.

## 2026-09-15 — v2.0: full ticket specs

- **Decision:** Expanded the roadmap from a bullet-level plan to full ticket
  specs (goal, scope, touchpoints, constraints, steps, acceptance criteria,
  test plan, risks, effort) with status table, doc version header, and
  provenance findings.
- **Tickets:** all (A1–D2 defined).
- **Rationale:** The bullet plan could not index PRs or prove completion, and
  the A1 provenance findings (missing `docs/development.md` link,
  upstream-only tooling in `docs/testing.md`) needed recorded scope before
  fork work diverged further.

## 2026-09-16 — v2.1: D2 closes the versioning loop

- **Decision:** Created this log, bumped `specs/tickets.md` to v2.1, marked
  D2 Done. No re-prioritization or goal change — minor bump only.
- **Tickets:** D2 (closes); D1 already landed `specs/upstream-sync.md`, so
  the versioned policy surface (`specs/tickets.md`, `specs/upstream-sync.md`,
  `specs/decisions.md`) is complete.
- **Rationale:** D2 acceptance required the log to exist with an initial
  post-v2.0 entry; monthly reviews (§6) now bump `Last updated` here and in
  `tickets.md` and add an entry only when priorities change. No
  `fork-policy-v` tag cut — tags are per major version and the tree holds
  unlanded ticket work.

(End of file)
