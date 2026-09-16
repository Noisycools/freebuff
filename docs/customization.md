# Customization guide

This is the fork's guide to what may be customized and what may never be
touched. `docs/fork.md` gives the short version; this page names the actual
files and symbols, so a change can be checked against reality rather than
policy prose. The roadmap tickets that consume these surfaces are B1–B3 in
`specs/tickets.md`.

## The one rule

You may customize **behavior surfaces** — what the agent says, how it routes,
which flags the product ships with. You may never modify **access
enforcement** — the code that decides who can run what, on which model, at
what cost.

These are not the same kind of change. A behavior change that turns out wrong
is a bad answer in a terminal. An enforcement change that turns out wrong is a
free tier that pays for models nobody funded — which is how a personal fork
becomes an abuse vector.

## Allowed surfaces

### System-prompt appendix text

The anchor is the appendix pattern in `agents/base3.ts`: `createBase3CliRoot`
takes plain options (`isFreebuff`, `noAskUser`), and `buildCliAppendix` renders
extra guidance that is **appended** to the base system prompt.

- Append, never prepend: every first-party free-mode root must open at byte 0
  with one of the strings in `FREEBUFF_ROOT_SYSTEM_PROMPT_OPENINGS`
  (`common/src/constants/free-agents.ts`), checked by
  `hasFreebuffRootSystemPromptOpening`. CI enforces this two ways:
  `common/src/__tests__/free-agents.test.ts` reads the agent sources and fails
  if a root stops matching, and `agents/__tests__/base3.test.ts` asserts the
  CLI roots directly. The base2 family opening ("You are Buffy, the strategic
  coding assistant.") is pinned the same way in `agents/base2/base2.ts`.
- No `instructionsPrompt` on base3 roots: it is re-injected after every user
  message and breaks the prompt cache the harness keeps warm.
- Keep additions small (a persona or template should add well under ~300 words)
  — appendix text rides on every turn.

### Shared guidance constants

`agents/constants.ts` holds guidance shared across agents:
`FOLLOWUP_STYLE_GUIDANCE`, `SKILL_DISCOVERY_GUIDANCE`,
`gravityIndexGuidance(deeperResearch)`, and `toolRoutingGuidance(includeAskUser)`
(the B2 decide-vs-ask / verify-vs-report / explore-vs-assume rules, each with
an explicit fallback; the parameter keeps the eval `noAskUser` variant from
naming an absent tool). When one agent needs a variant of a
shared rule, parameterize the constant (the `deeperResearch` pattern) instead
of copying it — copied strings drift, which is exactly what happened before
the parameterization existed.

### Options plumbing on root factories

Adding an option to `createBase3CliRoot` / `createBase3` that selects between
prompt fragments is the established extension mechanism — `isFreebuff`,
`noAskUser`, and the B1 `persona` option (data in `agents/personas.ts`, applied
by `createBase3CliRoot` and optionally via the `FREEBUFF_PERSONA` env seam in
`cli/src/utils/freebuff-persona.ts`) are the models to copy. Constraints: the default (no option) must
stay byte-identical to today's behavior; `toolNames` arrays stay **literal in
source** (`common/src/__tests__/foreign-client-shipped-agents.test.ts` scans
for them, and a runtime-assembled toolset is invisible to that scan); and any
`handleSteps` you touch must be self-contained, because step generators are
stringified with `toString()` and re-evaluated in a sandbox — no out-of-scope
references, constants defined inside the generator body.

### Compile-time product flags

`IS_FREEBUFF` in `cli/src/utils/constants.ts` (`getCliEnv().FREEBUFF_MODE ===
'true'`) gates free-only product behavior per surface, and is injected via
`--define` at build time so the bundler eliminates dead branches. The full
pattern — which components, commands, and hooks get guarded — is specified in
`freebuff/SPEC.md`. When adding a guard, keep it at the outermost surface the
change allows (a component returning `null` beats a conditional three levels
deep).

### Per-model runtime defaults

`compactionPolicyForModel` in `common/src/constants/compaction-policy.ts`,
consumed by `agents/base3.ts`, is the example of a tuned default: explicit per
model, documented, and safe to adjust as long as defaults stay backward
compatible and the `agents/__tests__/base3.test.ts` assertions about
compaction keep passing.

## Do-not-modify surfaces (access enforcement)

| File                                             | Symbols                                                                                     | What it enforces                                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `common/src/constants/free-agents.ts`            | `FREE_MODE_AGENT_MODELS`                                                                    | The agent→model allowlist: only these combos cost 0 credits in free mode                                               |
|                                                  | `FREEBUFF_ROOT_AGENT_IDS`, `isFreebuffRootAgent`                                            | Which agents are roots for the hierarchy gate; a missing root 403s with `free_mode_invalid_agent_hierarchy`            |
|                                                  | `FREEBUFF_ROOT_SYSTEM_PROMPT_OPENINGS`, `hasFreebuffRootSystemPromptOpening`                | The verbatim prompt-opening gate on free-mode roots                                                                    |
|                                                  | `CLOUD_PLANNER_*`, `CLOUD_BUILD_*`, `cloudPlannerAgentIdForModel`, `resolveCloudBuildModel` | Planner/build routing stays on the sanctioned models, out of the premium pool                                          |
| `common/src/constants/freebuff-models.ts`        | Model id constants (`FALLBACK_FREEBUFF_MODEL_ID`, `LIMITED_FREEBUFF_MODEL_ID`, …)           | Which model ids exist and which tier they belong to                                                                    |
| `common/src/constants/foreign-client-signals.ts` | Harness-signal constants                                                                    | Detecting third-party clients shipping our agents (test: `common/src/__tests__/foreign-client-shipped-agents.test.ts`) |

Why these are hard lines, not style preferences:

- They exist to keep free-tier routing and entitlement checks honest. Weakening
  any of them in a personal build produces requests the backend did not
  sanction — see the allowlist's own history in `free-agents.ts` for the abuse
  routes each entry closed.
- The gates interlock with server-side admission (`session_model_mismatch`,
  hierarchy checks). A fork-side "fix" here breaks at request time for real
  users, not in CI.
- They change upstream frequently and carry detailed regression history. A
  fork edit guarantees painful upstream syncs; the sync playbook (D1,
  `specs/upstream-sync.md`) resolves these files upstream-wholesale by rule.

**Excluded in both flows** regardless of this page: backend, database,
billing, deployment, and secret-management code — `CONTRIBUTING.md`'s scope
rule, which applies to fork-local changes too.

### Gray areas

Model-selection seams (`cli/src/utils/freebuff-agent-selection.ts`, the
gitignored generated module in `cli/src/agents/`, and the default maps that
generation starts from) sit between the two categories: **reading** them is fine, and
**adding** a new model follows upstream practice end to end (entries in
`common/src/constants/freebuff-models.ts` and `free-agents.ts` plus their
tests, e.g. `common/src/__tests__/freebuff-models.test.ts`) — that is an
upstream-scale change, not a fork customization. Never loosen an existing
entry. When in doubt, ask before changing.

## Pre-merge review checklist

Run through this before landing any customization change:

1. **Surface check** — the change touches only surfaces listed under "Allowed"
   above. If not, stop and re-scope.
2. **Enforcement diff check** — `git diff` touches nothing in
   `common/src/constants/free-agents.ts`, `freebuff-models.ts`, or
   `foreign-client-signals.ts`.
3. **Opening invariant** — every free-mode root prompt still opens verbatim
   (covered by `common/src/__tests__/free-agents.test.ts` and
   `agents/__tests__/base3.test.ts`; run them, don't reason about them).
4. **Defaults unchanged** — with no new option/flag set, output is identical
   to before (byte-identical for prompt text; assert it in a test).
5. **Structural invariants** — `toolNames` arrays remain literals in source;
   `handleSteps` bodies remain self-contained; guidance references only tools
   present in the root's `toolNames`.
6. **Tests** — package-local suite + typecheck for the touched package (e.g.
   `cd agents && bun test && bun run typecheck`), per `docs/testing.md`.
7. **Behavior evidence** — for CLI-visible changes, a tmux capture
   (`scripts/tmux/`); for non-cosmetic prompt changes, a buffbench before/after
   (`evals/buffbench/README.md`).
8. **Docs** — if a surface moved or a new one was added, update this guide and
   `docs/fork.md`, and record the decision per D2.

## Related

- `docs/fork.md` — fork ownership, flows, and the short boundary summary
- `docs/testing.md` — the testing doctrine the checklist relies on
- `specs/tickets.md` — the roadmap; B1–B3 are the first consumers of this guide
