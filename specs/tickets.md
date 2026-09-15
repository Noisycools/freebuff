# Noisycools Freebuff Variant — Roadmap and Ticket Plan

This document defines a practical, prioritized roadmap for evolving this repository as a personalized derivative while keeping compatibility with the existing Freebuff architecture.

## 1) Project goals

1. Keep the TypeScript + Bun monorepo layout intact and compatible with upstream conventions.
2. Improve agent customization ergonomics (prompts, tool routing, and safe defaults) without destabilizing core runtime behavior.
3. Increase reliability of local and cloud agent workflows through targeted testing and release discipline.
4. Make fork-specific behavior and branding explicit in documentation so contributors understand scope.

## 2) Non-goals

1. Do not remove, bypass, or weaken paid-access controls, usage limits, billing paths, or entitlement checks.
2. Do not fork away from the core runtime architecture without a strong compatibility reason.
3. Do not introduce repository-wide tooling churn (new build systems, package managers, or test frameworks) unless required.

## 3) Prioritized epics and tickets

Priority uses P0 (highest) to P3 (lowest).

### Epic A (P0): Fork clarity and configuration safety

- **A1 (P0): Fork identity surfaces**
  - Add and maintain clear fork-identity notes in top-level docs.
  - Ensure contributor docs distinguish upstream behavior from variant-specific behavior.
- **A2 (P0): Safe customization guardrails**
  - Document allowed customization surfaces (agent prompts, tool policies, defaults, feature flags).
  - Add explicit “do not modify access enforcement” contribution guidance.

### Epic B (P1): Agent behavior customization

- **B1 (P1): Persona and task-strategy presets**
  - Add configurable agent persona profiles (e.g., conservative reviewer, fast implementer).
  - Keep defaults backward compatible.
- **B2 (P1): Tool-routing policy refinement**
  - Tune when agents delegate vs. act directly for common coding tasks.
  - Keep explicit fallback behavior and deterministic error handling.
- **B3 (P1): Safety-focused prompt templates**
  - Add reusable templates for secure coding, minimal-change edits, and test-first fixes.

### Epic C (P2): Developer UX and observability

- **C1 (P2): Better run summaries**
  - Standardize per-run outcome summaries (files changed, tests run, unresolved risks).
- **C2 (P2): Structured diagnostics for failures**
  - Improve troubleshooting notes for tool failures and flaky environment setup.

### Epic D (P3): Long-term maintainability

- **D1 (P3): Upstream sync playbook**
  - Define a recurring process for rebasing/merging upstream changes and resolving conflicts safely.
- **D2 (P3): Fork policy versioning**
  - Version fork-specific policy docs and record major roadmap decisions.

## 4) Suggested implementation order

1. **Phase 1 (immediate):** Epic A (A1, A2)  
   Establish clear fork boundaries and safe customization policy first.
2. **Phase 2 (near-term):** Epic B (B1 → B3)  
   Deliver user-visible agent improvements while retaining compatibility.
3. **Phase 3 (mid-term):** Epic C (C1 → C2)  
   Improve reliability and debugging for contributors.
4. **Phase 4 (ongoing):** Epic D (D1, D2)  
   Keep long-term maintenance and upstream alignment healthy.

## 5) Testing and validation notes

- Follow existing repository guidance in `docs/testing.md` (`bun run`/`bun test` flows, fixture-based env setup, and CI guard expectations).
- For each ticket:
  - add or update targeted tests in the nearest package(s),
  - run focused package-level tests first,
  - run broader checks only after focused checks pass.
- For documentation-only tickets:
  - verify links/paths,
  - ensure terminology matches repository docs,
  - avoid introducing instructions that conflict with existing CI/testing guidance.

## 6) Maintenance and release considerations

1. Keep fork-specific documentation in a small, well-known surface area (`README`, `specs/`, and relevant docs pages).
2. Prefer additive, low-risk changes that remain easy to carry across upstream syncs.
3. Track roadmap completion by linking implemented PRs/issues back to ticket IDs in this file.
4. Revisit this roadmap on a regular cadence (for example monthly) and re-prioritize based on usage data, bug trends, and upstream changes.
