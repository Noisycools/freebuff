# Noisycools Freebuff Variant — Roadmap and Ticket Plan

> This is a Noisycools fork-policy document. It tracks roadmap decisions for this
> personalized derivative of Freebuff and is versioned per D2 below. On upstream
> syncs, this file and `freebuff/SPEC.md` are the two fork-owned docs that are
> always preserved (see D1).

| Field          | Value            |
| -------------- | ---------------- |
| Doc version    | 2.1              |
| Status         | Approved roadmap |
| Last updated   | 2026-09-16       |
| Review cadence | Monthly (see §6) |

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

Priority uses P0 (highest) to P3 (lowest). Effort: S (≤ 1 day), M (1–3 days), L (> 3 days) of focused work. Dependencies name ticket IDs.

### Status tracking

| ID  | Ticket                              | Priority | Effort | Depends on | Status            | PR / notes                                                                                                                                                                                 |
| --- | ----------------------------------- | -------- | ------ | ---------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Fork identity surfaces              | P0       | M      | —          | Done (2026-09-15) | `docs/fork.md` created; broken `docs/development.md` links removed from both READMEs; provenance note added to `docs/testing.md`; links from `AGENTS.md`/`CONTRIBUTING.md`/both READMEs    |
| A2  | Safe customization guardrails       | P0       | M      | A1         | Done (2026-09-15) | `docs/customization.md` created (allowed surfaces, do-not-modify enforcement table, pre-merge checklist); boundary section added to `AGENTS.md`; guardrail note added to `CONTRIBUTING.md` |
| B1  | Persona and task-strategy presets   | P1       | M      | A2         | Done (2026-09-15) | agents/personas.ts + base3 persona option + FREEBUFF_PERSONA seam; registry scoped to base3 roots; 19 agents + 8 CLI tests pass; agents tsc clean                                          |
| B2  | Tool-routing policy refinement      | P1       | M      | B1         | Done (2026-09-16) | toolRoutingGuidance + structure tests landed (19 agents tests pass; agents tsc clean); tmux/buffbench skipped — no Linux tmux or API key on win32, unit-only evidence accepted             |
| B3  | Safety-focused prompt templates     | P1       | S      | B1         | Done (2026-09-16) | agents/templates.ts (secure-coding / minimal-change / test-first-fix) + createBase3CliRoot safetyTemplate option; 25 agents tests pass (6 new B3), agents tsc clean; opt-in path documented in docs/agents-and-tools.md |
| C1  | Better run summaries                | P2       | M      | —          | Done (2026-09-16) | contract in common/src/types/contracts/run-summary.ts; capture+sidecar in cli/src/utils/run-summary.ts (run-summary.json sibling sidecar, written at turn completion from tool-call records); RunSummaryBlock above the completion footer; 17 new tests pass, chat-meta/run-state suites unchanged |
| C2  | Structured diagnostics for failures | P2       | M      | C1 (soft)  | Done (2026-09-16) | docs/troubleshooting.md (symptom → cause → check → fix, all paths/commands verified to exist); failureDiagnostics() in run-state-storage.ts adds surface/chatId/part/errorClass to failure logs additively; cross-links from docs/testing.md, docs/agents-and-tools.md, docs/fork.md; 3 new tests pass, existing failure-handling tests unchanged |
| D1  | Upstream-sync playbook              | P3       | M      | —          | Done (2026-09-16) | specs/upstream-sync.md: snapshot-export model (whole-tree syncs, no remote), fork-owned file inventory (enforcement files verified via `git diff main`), 8-step playbook, conflict playbook per file, validation checklist (build + smoke + focused suites), pre-sync snapshot tag, Windows/Git-Bash fallbacks for build-binary.ts and smoke-binary.ts; dry run 2026-09-16 recorded in-place (failures byte-verified as pre-existing with changes stashed) |                                                                                                                                                                                          |
| D2  | Fork policy versioning              | P3       | S      | A1         | Done (2026-09-16) | `specs/decisions.md` created (v2.0 + v2.1 entries); header bumped to v2.1 |

Update the Status and PR/notes columns as tickets land. Completion means every
acceptance criterion in the ticket's spec below is met, not merely that a PR
exists. PRs must reference the ticket ID (for example, `A1:` in the title) so
this table stays the index.

---

### Epic A (P0): Fork clarity and configuration safety

#### A1 (P0): Fork identity surfaces

- **Goal.** Anyone landing in the repo learns within one screen that this is a
  Noisycools-maintained personalized derivative, and can tell fork-owned files
  from upstream-carried files.
- **Scope.** In: top-level docs, a new `docs/fork.md`, link hygiene. Out: any
  code or build changes, `web/`/backend surfaces, rebranding of product strings
  (that is `freebuff/SPEC.md`'s territory).
- **Touchpoints.** `README.md`, `README.zh-CN.md`, `AGENTS.md`, `CONTRIBUTING.md`,
  `freebuff/README.md`, new `docs/fork.md`, `docs/agents-and-tools.md`.
- **Current state and problems.** The fork note exists in `README.md` (block
  quote at the top) and `AGENTS.md`, but three inconsistencies undermine it:
  1. `CONTRIBUTING.md` describes this repository as a "public mirror" of a
     private source-of-truth tree with a port-and-re-export PR flow, while the
     `README.md` fork note frames it as a maintained personal derivative. Both
     may be true (the fork tracks an upstream), but nothing reconciles the two
     stories, so a contributor cannot tell which flow applies to which files.
  2. `README.md` links `./docs/development.md`, which does not exist in this
     tree (broken link, found while writing this plan).
  3. `docs/testing.md` documents upstream-only infrastructure
     (`scripts/ci/test-with-guard.ts`, `.github/test-baselines.json`) that is
     not present in this export, with no note saying so.
- **Implementation steps.**
  1. Create `docs/fork.md` as the single reconciliation point: what this fork
     is, its relationship to upstream, the fork-owned file inventory (initially:
     `specs/`, `freebuff/SPEC.md`, `AGENTS.md` fork note, this list), and which
     contribution flow applies where. Keep it under ~120 lines; it should be
     readable in one sitting.
  2. Link `docs/fork.md` from `README.md`, `AGENTS.md`, and `CONTRIBUTING.md`.
  3. Fix the `docs/development.md` link in `README.md` (point to
     `CONTRIBUTING.md`, or add the missing page — decide at implementation).
  4. Add a short provenance note to `docs/testing.md` stating which referenced
     infrastructure exists upstream only and what the equivalent check is in
     this tree (see A1's test plan).
  5. Mirror the changes in `README.zh-CN.md` so the two READMEs do not drift.
- **Hard constraints.** No changes to CI workflows in this ticket. Do not
  rewrite upstream-authored doc content wholesale — add fork framing around it,
  so diffs stay carryable across syncs (D1).
- **Acceptance criteria.**
  - Every markdown link in `README.md`, `README.zh-CN.md`, `AGENTS.md`,
    `CONTRIBUTING.md`, `docs/fork.md` resolves to an existing file.
  - `docs/fork.md` names at least: the fork's purpose, upstream relationship,
    fork-owned files, and the customization allowed-surfaces pointer (to A2's
    output).
  - A contributor reading only `CONTRIBUTING.md` can reach `docs/fork.md` in
    one link and state which PR flow applies to a `cli/` change.
- **Test plan.** Doc-only: verify links/paths mechanically (e.g., a throwaway
  grep for `](./` targets and `glob` each), and re-read the four top-level docs
  end to end. No package tests affected.
- **Risks.** Low. Worst case is doc drift; mitigate by keeping the fork-owned
  inventory in one file (`docs/fork.md`) and referencing it, not duplicating it.
- **Effort / dependencies.** M, none.

#### A2 (P0): Safe customization guardrails

- **Goal.** Contributors know exactly which surfaces they may customize
  (prompts, guidance strings, defaults, flags) and which code is access
  enforcement that must never be modified — with the enforcement locations
  named, not described abstractly.
- **Scope.** In: a new customization guide, cross-links from contributor docs,
  naming the real enforcement code. Out: changing any enforcement code, adding
  new enforcement, tool-policy schema changes.
- **Touchpoints.** New `docs/customization.md`; edits to `AGENTS.md` (add a
  "Customization boundaries" section), `CONTRIBUTING.md` (one guardrail
  paragraph + link), `docs/fork.md` (link from A1), `freebuff/SPEC.md` (read
  as reference, not modified).
- **Implementation steps.**
  1. Document the allowed customization surfaces, each with its real file
     anchor:
     - **Agent system prompts** — the appendix pattern in `agents/base3.ts`
       (`buildCliAppendix`, `createBase3CliRoot` options such as `isFreebuff`
       and `noAskUser`), shared guidance strings in `agents/constants.ts`
       (`FOLLOWUP_STYLE_GUIDANCE`, `gravityIndexGuidance(deeperResearch)` —
       the parameterized form is the model to follow).
     - **Compile-time product flags** — the `IS_FREEBUFF` define pattern from
       `freebuff/SPEC.md` (build-time flag, dead-code elimination, per-surface
       guards).
     - **Defaults** — per-model compaction via `compactionPolicyForModel` in
       `agents/base3.ts`; picker/selection helpers in `cli/src/utils/`.
  2. Document the do-not-modify surfaces by name:
     - `common/src/constants/free-agents.ts`: `FREE_MODE_AGENT_MODELS`
       (agent→model allowlist), `FREEBUFF_ROOT_AGENT_IDS` (root/hierarchy
       lists), `FREEBUFF_ROOT_SYSTEM_PROMPT_OPENINGS` and
       `hasFreebuffRootSystemPromptOpening` (verbatim prompt-opening gate),
       `CLOUD_PLANNER_*` routing constants.
     - `common/src/constants/foreign-client-signals.ts` and the
       `common/src/__tests__/foreign-client-shipped-agents.test.ts` guard.
     - Everything `CONTRIBUTING.md` already excludes (backend, database,
       billing, deployment, secret management).
     - Rationale to state: these gates exist to keep free-tier routing and
       entitlement checks honest; "improving" them in a fork is how a personal
       build becomes an accidental abuse vector.
  3. Add the review checklist to the guide: before merging a customization,
     confirm (a) the surface is listed as allowed, (b) no `free-agents.ts`
     constant changed, (c) free-mode root prompts still open with the verbatim
     opening (CI enforces via `common/src/__tests__/free-agents.test.ts`, but
     catching it at review is cheaper), (d) defaults are backward compatible.
  4. Cross-link from `AGENTS.md` and `CONTRIBUTING.md` so the guide is
     discoverable from the docs agents actually read first.
- **Hard constraints.** This ticket writes documentation only; it must not
  change the enforcement code it documents, and its examples must be copy-safe
  (no example prompt text that could be mistaken for a new root opening).
- **Acceptance criteria.**
  - `docs/customization.md` exists, lists allowed surfaces with file anchors,
    lists do-not-modify surfaces with file anchors, and includes the checklist.
  - `AGENTS.md` and `CONTRIBUTING.md` both link to it.
  - Every file path cited in the guide exists in the tree.
- **Test plan.** Doc-only: path verification as in A1; additionally grep the
  guide's cited symbol names against the codebase to confirm they exist
  (`FREE_MODE_AGENT_MODELS`, `hasFreebuffRootSystemPromptOpening`,
  `IS_FREEBUFF`, `FOLLOWUP_STYLE_GUIDANCE`).
- **Risks.** The guide can drift from code (constants move, gates are renamed).
  Mitigate: anchor by file + symbol name, keep prose short, and re-verify the
  anchors during the D1 sync playbook's doc pass.
- **Effort / dependencies.** M, depends on A1 (fork.md exists to link from).

---

### Epic B (P1): Agent behavior customization

All three tickets modify `agents/` definitions. Shared constraints, verified
against the current tree, apply to every ticket in this epic:

- **The verbatim opening.** Every first-party free-mode root system prompt must
  open, at byte 0, with one of `FREEBUFF_ROOT_SYSTEM_PROMPT_OPENINGS` in
  `common/src/constants/free-agents.ts`; `hasFreebuffRootSystemPromptOpening`
  rejects anything prepended, and `common/src/__tests__/free-agents.test.ts`
  reads the agent sources and fails CI if a root stops matching. Practical
  consequence: customize by **appending** (the appendix pattern
  `buildCliAppendix` in `agents/base3.ts` already uses), never by rewriting the
  opening sentence.
- **Literal `toolNames`.** `common/src/__tests__/foreign-client-shipped-agents.test.ts`
  scans agent sources for literal `toolNames` arrays; a toolset assembled at
  runtime is invisible to that scan (the failure mode recorded in the comments
  in `agents/base3.ts`). Consequence: presets select among **existing literal
  arrays** in source; do not compute tool lists dynamically.
- **Serialized `handleSteps`.** Agent step generators are stringified with
  `toString()` and re-evaluated in a sandbox; any out-of-scope reference breaks
  at runtime. The repo's regression tests for this live in
  `agents/__tests__/` (see `base-chat.test.ts`, `context-pruner.test.ts`).
  Consequence: constants used by `handleSteps` must be defined inside the
  generator body.
- **Prompt-cache discipline.** Per the comments in `agents/base3.ts`, the
  appendix is appended (never prepended) and `instructionsPrompt` is avoided on
  base3 roots because re-injection breaks the prompt cache the harness keeps
  warm. Keep both properties when adding prompt text.

#### B1 (P1): Persona and task-strategy presets

- **Goal.** Configurable persona profiles (e.g., conservative reviewer, fast
  implementer) that change how the base3 CLI root behaves, without changing any
  default behavior.
- **Scope.** In: `agents/base3.ts` (`createBase3CliRoot` options), a persona
  constants module, tests. Out: new subagents, `toolNames` changes beyond
  selecting among existing literal arrays, any Web/Cloud root definitions, and
  the default persona (must remain exactly today's behavior).
- **Touchpoints.** `agents/base3.ts`, new `agents/personas.ts` (constants
  module), `agents/__tests__/base3.test.ts` (extend), `agents/constants.ts`
  (only if a guidance string is shared with other agents).
- **Implementation steps.**
  1. Add a `persona` option to `createBase3CliRoot` following the existing
     `noAskUser` / `isFreebuff` option pattern (plain options object, default
     `undefined` = current behavior).
  2. Define personas as data in `agents/personas.ts`: name + appendix text
     fragments only. A persona must never alter the opening sentence, the
     literal `toolNames` array, or `handleSteps`.
  3. Wire persona selection so the CLI can pass it through (the selection
     helpers in `cli/src/utils/freebuff-agent-selection.ts` are the natural
     seam; keep the default path untouched).
  4. Extend `agents/__tests__/base3.test.ts`: default root output is
     byte-identical to today's; each persona's prompt still opens with the
     canonical opening; each persona's `toolNames` array is still a literal in
     source; persona appendix text survives stringification the same way
     `buildCliAppendix` output does.
- **Hard constraints.** Defaults backward compatible (acceptance criterion, not
  a nice-to-have). No new tools. No changes to `common/src/constants/free-agents.ts`.
- **Acceptance criteria.**
  - With no persona specified, `createBase3CliRoot()` output is unchanged
    (verified by test).
  - At least two personas exist and are exercised by tests.
  - All shared-epic constraints above hold for every persona.
- **Test plan.** Extend `agents/__tests__/base3.test.ts` (pattern: existing
  tests there already assert prompt openings and tool lists). Run
  package-local: `cd agents && bun test` (the package's `bunfig.toml` preloads
  the env fixture per `docs/testing.md`). Then `cd agents && bun run typecheck`.
- **Risks.** A persona fragment that reads like a system-prompt opening could
  trip the opening gate on a future root — keep persona text out of position 0
  and covered by the same assertions. Prompt-cache impact: personas add tokens
  to the appendix; keep each persona's addition small (target < ~300 words).
- **Effort / dependencies.** M, depends on A2 (the guardrails doc defines what
  personas may and may not touch).

#### B2 (P1): Tool-routing policy refinement

- **Goal.** Better tuning of when the agent acts directly vs. delegates or asks
  (the base3 single-loop harness has no subagent spawns, so "routing" here
  means prompt guidance plus which tools are present), with explicit fallback
  behavior and deterministic error handling preserved.
- **Scope.** In: CLI-appendix guidance text in `agents/base3.ts` /
  `agents/constants.ts`, selection among the existing literal tool arrays,
  tests. Out: adding subagent spawning to base3 roots (would require
  `FREEBUFF_ROOT_AGENT_IDS` and `FREE_MODE_AGENT_MODELS` changes and new 403
  failure modes — explicitly out per non-goal 2), new tools, Web/Cloud roots.
- **Touchpoints.** `agents/base3.ts` (`buildCliAppendix`),
  `agents/constants.ts`, `agents/__tests__/base3.test.ts`, and for manual
  verification `scripts/tmux/` helpers per `docs/testing.md`.
- **Implementation steps.**
  1. Inventory the current guidance in `buildCliAppendix` (ask_user discipline,
     followup cards, `gravityIndexGuidance`, `SKILL_DISCOVERY_GUIDANCE`) and
     identify the delegation-shaped decisions worth tuning (e.g., when to
     verify with tests vs. report, when to ask vs. decide).
  2. Write the refined guidance as parameterized constants in
     `agents/constants.ts` following the `gravityIndexGuidance(deeperResearch)`
     pattern — parameterized rather than copied, so variants cannot drift.
  3. Keep guidance behavioral and testable: each rule states the trigger, the
     action, and the fallback (what to do when the tool fails or the answer is
     unavailable). Deterministic error handling means: state the fallback in
     the prompt, never rely on the model improvising one.
  4. Validate behavior manually with the tmux workflow from `docs/testing.md`
     (start a dev CLI in tmux, send a routing-sensitive prompt, check the saved
     capture for the expected behavior strings).
- **Hard constraints.** Same shared-epic constraints as B1. Additionally:
  guidance must not reference tools not in the root's `toolNames` (e.g., no
  subagent-spawning advice on a single-loop root).
- **Acceptance criteria.**
  - Refined guidance lives in `agents/constants.ts` (or the appendix), is
    parameterized where variants exist, and states fallbacks explicitly.
  - No default-behavior change beyond the intended routing shifts (existing
    tests pass unchanged except where they assert the guidance text itself).
  - A tmux capture demonstrates the refined behavior on at least one scenario.
- **Test plan.** `agents/__tests__/base3.test.ts` for structure (openings,
  literals, serialization); tmux captures for behavior (per
  `docs/testing.md`'s "prefer checking the saved capture file for concrete
  strings" rule). Model-backed runs are not repeatable enough for unit tests —
  treat tmux output as evidence, not regression coverage.
- **Risks.** Prompt changes can regress quality in ways unit tests cannot see.
  Mitigate: land guidance changes in small pieces, run a buffbench comparison
  (`evals/buffbench/README.md`, e.g. `agents: ['base3']` before/after) when a
  change is more than cosmetic, and keep the diff easy to revert.
- **Effort / dependencies.** M, depends on B1 (persona plumbing determines
  where routing guidance variants live).

#### B3 (P1): Safety-focused prompt templates

- **Goal.** Reusable templates for secure coding, minimal-change edits, and
  test-first fixes that agents (and users, via knowledge files) can opt into.
- **Scope.** In: template constants module, appendix wiring, tests, optional
  knowledge-file guidance. Out: changing any default prompt, new enforcement,
  shipping templates pre-enabled on any root.
- **Touchpoints.** New `agents/templates.ts` (or a section in
  `agents/constants.ts`), `agents/base3.ts` appendix wiring,
  `agents/__tests__/base3.test.ts`.
- **Implementation steps.**
  1. Draft three templates as exported constants: secure coding (input
     handling, secret hygiene, least-privilege commands), minimal-change edits
     (smallest viable diff, no drive-by refactors, restore-then-verify),
     test-first fixes (reproduce, failing test, minimal fix, verify).
  2. Each template must be self-contained prose (no imports, no placeholders
     that require runtime substitution beyond what the appendix already does),
     because appendix text is stringified into agent definitions.
  3. Expose them the same way personas are exposed in B1: as opt-in appendix
     fragments selectable by option, with the default root unchanged.
  4. Add a short usage note to `docs/agents-and-tools.md` (it already documents
     the `.agents/` surface) describing how a local agent definition can
     include a template.
- **Hard constraints.** Templates are additive-only; nothing is enabled by
  default; no template may contain text matching a
  `FREEBUFF_ROOT_SYSTEM_PROMPT_OPENINGS` opening (they are appended, never
  position 0 — but keeping the strings distinct also avoids confusing the
  opening-gate tests).
- **Acceptance criteria.**
  - Three templates exist as constants with tests asserting: presence, default
    absence from the default root's prompt, correct appearance when opted in,
    and serialization safety.
  - `docs/agents-and-tools.md` documents the opt-in path.
- **Test plan.** Extend `agents/__tests__/base3.test.ts`; run
  `cd agents && bun test && bun run typecheck`. Doc link check for the
  `docs/agents-and-tools.md` addition.
- **Risks.** Template sprawl (ten templates nobody uses). Mitigate: ship the
  three named in the epic, review usage before adding more, and record the
  decision in D2's log.
- **Effort / dependencies.** S, depends on B1 (reuses its option/wiring
  pattern).

---

### Epic C (P2): Developer UX and observability

#### C1 (P2): Better run summaries

- **Goal.** A standardized per-run outcome summary (files changed, tests run,
  unresolved risks) that users see at run end and tooling can consume.
- **Scope.** In: a summary type in `common/` (contracts, per testing doctrine),
  CLI capture of summary fields, rendering at run end, tests. Out: server-side
  changes, telemetry pipelines, changes to what the agent is allowed to do.
- **Touchpoints.** `common/src/types/contracts/` (new or existing contract —
  `docs/testing.md` directs contracts to live there), `cli/src/utils/chat-meta.ts`
  (sidecar summary shape), `cli/src/utils/run-state-storage.ts` (writes the
  sidecar; already has `chatShapeSummary`), a CLI render component near the
  existing run-end UI, tests in `cli/src/utils/__tests__/`.
- **Current state.** A sidecar summary already exists for `/history`
  (`chat-meta.ts` + `run-state-storage.ts`), but it carries chat-list metadata,
  not run outcomes. This ticket extends the sidecar (or adds a sibling block)
  with run-outcome fields rather than inventing a parallel store.
- **Implementation steps.**
  1. Define the summary contract in `common/src/types/contracts/` with zod
     validation: files changed (path + change kind), checks run (command +
     pass/fail/skipped), unresolved risks (short strings), plus timestamp and
     run id where available.
  2. Capture the fields CLI-side. Files changed and check outcomes are already
     observable from tool-call history; unresolved risks are best extracted
     from the agent's own end-of-turn output (a structured final message when
     available, otherwise omitted — the contract must tolerate absence).
  3. Extend the sidecar writer in `run-state-storage.ts` to persist the
     summary; keep the existing sidecar fields intact so `/history` behavior
     is unchanged.
  4. Render a compact run-end block in the CLI (a few lines, terminal-friendly
     per the CLI's existing component style).
- **Hard constraints.** Additive: existing sidecar consumers and tests must
  pass unchanged. Follow the repo testing doctrine from `docs/testing.md`:
  dependency injection over module mocking; package-local `bun test` with the
  `bunfig.toml` env fixture; CLI hook behavior tested via components, not
  `renderHook()` (React 19 + Bun + RTL instability is documented).
- **Acceptance criteria.**
  - A run that changes files and runs checks produces a persisted summary with
    both fields populated.
  - A run with no checks produces a valid summary with empty/skipped fields
    (no null-typos, no missing keys).
  - Existing `/history` and run-state tests pass unchanged.
- **Test plan.** Unit tests for the contract and the sidecar writer
  (`cli/src/utils/__tests__/`); a component test for the render block. Run
  `cd cli && bun test` focused files first, then the package suite; grow-only
  tests need no `.github/test-baselines.json` changes upstream, and this tree
  runs the public CI build + smoke flow (`.github/workflows/ci.yml`), which
  this change does not affect.
- **Risks.** Extraction quality (misattributing a file change to a run). Mitigate:
  source fields from tool-call records, not model prose, wherever possible.
  Keep v1 fields minimal to avoid a schema that is wrong in ways users notice.
- **Effort / dependencies.** M, none (can run in parallel with Epic B).

#### C2 (P2): Structured diagnostics for failures

- **Goal.** When a tool fails or the environment is misconfigured, the user
  gets a troubleshooting path, not just an error string.
- **Scope.** In: a new `docs/troubleshooting.md`, richer failure-payload notes
  in the CLI's failure logs, cross-links. Out: changing failure semantics,
  retry logic, or error codes; server-side diagnostics.
- **Touchpoints.** New `docs/troubleshooting.md`; `cli/src/utils/run-state-storage.ts`
  (failure-log payloads — it already records a shape summary via
  `chatShapeSummary`); `docs/testing.md` (one cross-link, no rewrite);
  `docs/fork.md` link from A1.
- **Implementation steps.**
  1. Catalog the common failure modes from the existing failure logs (env
     misconfig, tool spawn failures, broker startup failures — the terminal
     broker's failure modes are documented in `docs/agents-and-tools.md` and
     are the canonical example of "startup failure prevents the shell from
     running" behavior to reference).
  2. Write `docs/troubleshooting.md` structured as: symptom → likely cause →
     check → fix. One section per cataloged failure mode. No invented
     commands: every command in the doc must exist in the repo or be a
     standard tool invocation.
  3. In `run-state-storage.ts`, extend failure-log entries with the fields the
     doc references (e.g., which surface wrote the failure, the failing tool
     name) — additive fields only.
  4. Cross-link from `docs/testing.md` (env/fixture issues) and
     `docs/agents-and-tools.md` (broker issues) so the doc is reachable from
     where the failures are described.
- **Hard constraints.** Must not contradict `docs/testing.md`'s guidance (the
  original roadmap's rule for doc tickets). No changes to error codes or
  failure semantics.
- **Acceptance criteria.**
  - Every command and file path in `docs/troubleshooting.md` exists and works
    as described.
  - Failure logs include the new fields and existing failure-handling tests
    pass unchanged.
  - `docs/testing.md` and `docs/agents-and-tools.md` link to it where the
    referenced failure modes are described.
- **Test plan.** Doc verification as in A1 (paths, commands exist). For the
  log-field change: focused tests in `cli/src/utils/__tests__/`, then the
  package suite.
- **Risks.** Doc drift as the CLI evolves — same mitigation as A2 (anchor to
  real symbols, revisit in the D1 doc pass).
- **Effort / dependencies.** M, soft dependency on C1 (C1's summary fields are
  natural diagnostic payloads, but C2 stands alone).

---

### Epic D (P3): Long-term maintainability

#### D1 (P3): Upstream sync playbook

- **Goal.** A written, repeatable process for rebasing/merging upstream changes
  into this fork, including how to detect and resolve the conflicts this
  fork's specific changes actually cause.
- **Scope.** In: a new `specs/upstream-sync.md` plus any tiny helper script
  justified by it. Out: changing sync tooling wholesale, CI changes.
- **Touchpoints.** New `specs/upstream-sync.md`; reads: `docs/testing.md`
  (for what must be re-validated after sync), `.github/workflows/ci.yml`
  (the public CI flow to run), `freebuff/SPEC.md`, `agents/` and
  `common/src/constants/free-agents.ts` (the high-conflict surfaces).
- **Implementation steps.**
  1. Document the cadence (monthly review aligns with §6) and the mechanical
     steps: fetch upstream, sync branch, merge, resolve, build, validate.
  2. Write the conflict playbook for this fork's known divergence points:
     - `specs/` and `freebuff/SPEC.md` — fork-owned; always keep ours.
     - `AGENTS.md`, `README.md` fork notes and `docs/` fork additions —
       merge, preserving both upstream updates and fork framing.
     - `agents/base3.ts` and `agents/constants.ts` — upstream edits plus fork
       persona/template fragments; resolve by re-applying fork fragments onto
       the upstream version (the option/appendix pattern makes this mostly
       mechanical).
     - Any `common/src/constants/free-agents.ts` drift — never resolve by
       editing fork-side; take upstream wholesale (it is access enforcement)
       and re-run the fork's tests against it.
  3. Write the post-sync validation checklist: `bun install`,
     `bun run build:sdk`, `bun run build:freebuff` (the public CI jobs in
     `.github/workflows/ci.yml` run exactly these plus the binary smoke —
     run them locally first), focused package tests for anything under
     `agents/` or `common/`, and the doc link check from A1 for anything
     under `docs/` or `specs/`.
  4. Record where upstream infra referenced by docs does not exist in this
     tree (e.g., `scripts/ci/test-with-guard.ts`,
     `.github/test-baselines.json`), so the checklist does not send a
     maintainer chasing upstream-only steps.
- **Hard constraints.** The playbook must never instruct editing
  `free-agents.ts` fork-side, and must not force-push `main` (repo convention
  in `AGENTS.md`).
- **Acceptance criteria.**
  - `specs/upstream-sync.md` exists with cadence, steps, conflict playbook,
    and validation checklist.
  - A dry run of the checklist (build + focused tests) passes on a clean tree.
- **Test plan.** The validation checklist itself is the test; run it once as
  the ticket's proof.
- **Risks.** The playbook rots as upstream evolves. Mitigate: it lives next to
  this doc and is revisited on the same monthly cadence; keep it procedural
  (commands, file lists) rather than narrative.
- **Effort / dependencies.** M, none (can be done any time; most valuable
  before the first Epic B merge).

#### D2 (P3): Fork policy versioning

- **Goal.** Fork-specific policy docs are versioned and major roadmap decisions
  are recorded, so future maintainers can tell what the fork intended and when.
- **Scope.** In: versioning this document, a decision log, tagging policy
  versions. Out: versioning code, release engineering (that is
  `freebuff/SPEC.md` §8's territory).
- **Touchpoints.** This file (`specs/tickets.md`), optionally a
  `specs/decisions.md`.
- **Implementation steps.**
  1. Keep the version header on this doc (added in v2.0): doc version, status,
     last-updated, review cadence. Bump the minor version for ticket-level
     changes and the major version for re-prioritization or goal changes.
  2. Record major roadmap decisions in a `specs/decisions.md` log: date,
     decision, ticket IDs affected, one-paragraph rationale. The first entry
     records the v2.0 expansion of this document.
  3. On each monthly review (§6): update statuses, bump `Last updated`, and add
     a decisions entry if priorities changed.
  4. Optionally tag the repo at each major policy version
     (`fork-policy-v2`) for a stable reference point.
- **Hard constraints.** No policy content lives outside `specs/` (keeps the
  fork-doc surface small, per §6.1).
- **Acceptance criteria.**
  - This doc carries the version header (done as of v2.0).
  - `specs/decisions.md` exists with the initial entry after the first
    post-v2.0 review.
- **Test plan.** None (documentation process).
- **Risks.** Neglect — a version header nobody updates is worse than none.
  Mitigate: tie updates to the existing monthly review rather than a new
  ritual.
- **Effort / dependencies.** S, depends on A1 (fork.md becomes part of the
  versioned policy surface).
- **Status note.** Done 2026-09-16: the v2.0 rewrite of this document
  implements the versioning header, the status table (the PR-linkage rule from
  §6.3), and the decision-record structure; v2.1 adds `specs/decisions.md`
  with the v2.0 + v2.1 entries.

---

## 4) Suggested implementation order

1. **Phase 1 (immediate):** Epic A (A1, A2) — ~2–3 days total.
   Establish clear fork boundaries and safe customization policy first.
2. **Phase 2 (near-term):** Epic B (B1 → B3, B2 last) — ~1–1.5 weeks.
   Deliver user-visible agent improvements while retaining compatibility.
   B1 unblocks both B2 and B3; B2 benefits from buffbench evidence and goes last.
3. **Phase 3 (mid-term):** Epic C (C1 → C2) — ~1 week. Independent of Epic B;
   can interleave.
4. **Phase 4 (ongoing):** Epic D (D1, D2) — ~2–3 days, then recurring.
   Do D1 before the first post-Epic-B upstream sync.

## 5) Testing and validation notes

- Follow existing repository guidance in `docs/testing.md` (`bun run`/`bun test`
  flows, fixture-based env setup, and CI guard expectations). Note for this
  tree: parts of that guide describe upstream-only infrastructure
  (`scripts/ci/test-with-guard.ts`, `.github/test-baselines.json`); this
  export's CI (`.github/workflows/ci.yml`) builds the SDK, builds the Freebuff
  binary, and smoke-tests it. A1 adds the provenance note; until then, treat
  package-local `bun test` + `bun run typecheck` as the local gate, and the CI
  build as the merge gate.
- Per-package testing setup is already in place: packages preload the shared
  env fixture via their `bunfig.toml` (e.g., `common/bunfig.toml` →
  `sdk/test/setup-env.ts`), so package-local runs work in a fresh worktree.
- For each code ticket:
  - add or update targeted tests in the nearest package(s),
  - run focused package-level tests first,
  - run broader checks only after focused checks pass,
  - follow the testing doctrine: dependency injection over module mocking,
    contracts in `common/src/types/contracts/`, no `renderHook()` for CLI hook
    behavior.
- For behavior changes in `agents/`: unit tests for structure (prompt openings,
  literal tool lists, handleSteps serialization) plus tmux captures for
  behavior (`scripts/tmux/` per `docs/testing.md`); use buffbench
  (`evals/buffbench/README.md`) for before/after comparisons on
  non-cosmetic prompt changes.
- For documentation-only tickets:
  - verify links/paths,
  - ensure terminology matches repository docs,
  - avoid introducing instructions that conflict with existing CI/testing
    guidance.

## 6) Maintenance and release considerations

1. Keep fork-specific documentation in a small, well-known surface area
   (`README`, `specs/`, and relevant docs pages — concretely: this file,
   `docs/fork.md`, `docs/customization.md`, `docs/troubleshooting.md`,
   `specs/upstream-sync.md`, `specs/decisions.md`, `freebuff/SPEC.md`).
2. Prefer additive, low-risk changes that remain easy to carry across upstream
   syncs (the appendix/option patterns in `agents/` exist for exactly this).
3. Track roadmap completion by linking implemented PRs/issues back to ticket
   IDs in the status table in §3 — PR titles carry the ID (e.g., `A1:`), and
   completion requires the ticket's acceptance criteria, not just a merged PR.
4. Revisit this roadmap on a regular cadence (monthly) and re-prioritize based
   on usage data, bug trends, and upstream changes; each review bumps the
   version header (D2) and records priority changes in the decision log.

## Decision log

See `specs/decisions.md` (D2). Pre-log archive entry: **2026-09-15 — v2.0.** Expanded this roadmap from a bullet-level plan to
full ticket specs (goal, scope, touchpoints, constraints, steps, acceptance
criteria, test plan, risks, effort) grounded in the current tree; added the
status table, the doc version header, and the provenance findings that motivated
A1 (missing `docs/development.md` link; upstream-only tooling referenced by
`docs/testing.md`).
