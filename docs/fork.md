# Fork guide

This repository is maintained by [@Noisycools](https://github.com/Noisycools) as
a personalized derivative of Freebuff. Freebuff itself is built on the Codebuff
agent framework, and this tree carries that codebase's public surface (`cli/`,
`sdk/`, `common/`, `agents/`, `packages/agent-runtime/`, `packages/code-map/`,
`packages/llm-providers/`, `freebuff/`, `evals/`, `scripts/tmux/`).

This page is the single reconciliation point for the two things a contributor
needs to know first: what this fork is, and which rules apply to a given
change.

## Why two origin stories exist

Two descriptions of this repository are in circulation, and both are true —
they answer different questions:

- `CONTRIBUTING.md` describes the **public mirror flow**: the private
  repository is the source of truth, so accepted public PRs are ported there
  and exported back. That flow answers "where does my public PR go?"
- The fork note in `README.md` describes **fork ownership**: @Noisycools
  maintains this checkout as a personalized derivative with its own roadmap
  (`specs/tickets.md`). That answers "what is this fork's own agenda?"

You are subject to the mirror flow when contributing through GitHub PRs, and to
the fork's roadmap and boundaries when making fork-local changes.

## Which flow applies to your change

| Change                                                                                                                                                                                                            | Flow                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Public PR touching `cli/`, `sdk/`, `common/`, `agents/`, `packages/agent-runtime/`, `packages/code-map/`, `packages/llm-providers/`, `freebuff/` (excluding the private web app), `scripts/tmux/`, or public docs | Open a PR per `CONTRIBUTING.md`; accepted changes are ported upstream and return via the next export |
| Fork roadmap work (tickets in `specs/tickets.md`)                                                                                                                                                                 | Direct commits to this fork, following the ticket's spec                                             |
| Anything in `web/`, `freebuff/web/`, `packages/internal/`, `packages/billing/`, `packages/bigquery/`, `packages/build-tools/`, or backend, database, billing, deployment, and secret-management code              | Not accepted in either flow                                                                          |

## Fork-owned files

These files belong to the fork, not to upstream, and are always preserved
(kept "ours") on upstream syncs:

- `specs/` — the roadmap (`specs/tickets.md`), the upstream-sync playbook
  (`specs/upstream-sync.md`, ticket D1), and the decision log
  (`specs/decisions.md`, ticket D2)
- `freebuff/SPEC.md` — the Freebuff product spec (`IS_FREEBUFF` build flag,
  branding, feature stripping)
- `AGENTS.md` — carries the fork identity note alongside upstream conventions
- `docs/fork.md` — this file
- `docs/customization.md` — the customization guardrails and pre-merge
  checklist (ticket A2)
- `docs/troubleshooting.md` — symptom-first diagnostics for the failure modes
  this tree produces (ticket C2)

Everything else is upstream-carried: change it with the smallest edit that
carries cleanly across a sync.

## Customization boundaries

Short version: you may customize **agent behavior surfaces** — system-prompt
appendix text, shared guidance strings, persona/options plumbing, and
compile-time product flags — but never **access enforcement**.

- **Allowed**, with anchors: the appendix pattern and option plumbing in
  `agents/base3.ts` (`buildCliAppendix`, `createBase3CliRoot` options);
  shared guidance constants in `agents/constants.ts`; the `IS_FREEBUFF`
  define pattern documented in `freebuff/SPEC.md`; per-model defaults such as
  `compactionPolicyForModel`.
- **Never modify**: `common/src/constants/free-agents.ts` —
  `FREE_MODE_AGENT_MODELS`, `FREEBUFF_ROOT_AGENT_IDS`,
  `FREEBUFF_ROOT_SYSTEM_PROMPT_OPENINGS` /
  `hasFreebuffRootSystemPromptOpening`, the `CLOUD_PLANNER_*` routing
  constants — and `common/src/constants/foreign-client-signals.ts`. These are
  entitlement and anti-abuse gates; weakening them in a personal build is how
  a fork becomes an abuse vector.
- **Excluded in both flows** (see `CONTRIBUTING.md`): backend, database,
  billing, deployment, and secret-management code.

The full guide — allowed surfaces, the do-not-modify enforcement table, and
the pre-merge review checklist — is `docs/customization.md`. Run that
checklist before landing any customization change.

## Related

- `specs/tickets.md` — the fork roadmap and ticket plan (versioned per D2)
- `docs/customization.md` — the full customization guide and pre-merge checklist
- `docs/testing.md` — testing guidance, including a provenance note about
  infrastructure that exists upstream only
- `docs/troubleshooting.md` — failure-mode diagnostics referencing this file
- `CONTRIBUTING.md` — the public PR flow in full
