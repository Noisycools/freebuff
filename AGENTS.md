# Freebuff

Freebuff is the public, free coding agent built from the Codebuff agent framework.
This fork is maintained by @Noisycools as a personalized derivative focused on safe, roadmap-driven customization. See `docs/fork.md` for what is fork-owned versus upstream-carried, which contribution flow applies to a given change, and the customization boundaries (allowed surfaces vs. never-modify access enforcement).

## Key Technologies

- TypeScript monorepo
- Bun runtime and package manager
- OpenTUI + React CLI
- JS/TS SDK
- Composable agent runtime

## Repo Map

- `cli/` - TUI client and local UX
- `sdk/` - JS/TS SDK used by the CLI and external users
- `common/` - shared types, tools, schemas, and utilities
- `agents/` - public agent definitions
- `packages/agent-runtime/` - agent runtime and tool handling
- `packages/code-map/` - source parsing helpers
- `packages/llm-providers/` - public LLM provider shims
- `freebuff/` - Freebuff CLI, release files, and e2e tests
- `scripts/tmux/` - tmux helpers for CLI testing

## Conventions

- Use `bun install` and `bun run`.
- Prefer dependency injection over module mocking.
- Run interactive CLI tests in tmux.
- Do not force-push `main`.

## Customization Boundaries

- Allowed: agent system-prompt appendix text, shared guidance constants, options plumbing on root factories, compile-time product flags (`IS_FREEBUFF`), and per-model runtime defaults.
- Never modify: access enforcement — `common/src/constants/free-agents.ts`, `common/src/constants/freebuff-models.ts`, and `common/src/constants/foreign-client-signals.ts`.
- Run the pre-merge checklist in `docs/customization.md` before landing any customization change.

## Docs

- `docs/fork.md`
- `docs/customization.md`
- `docs/agents-and-tools.md`
- `docs/testing.md`
