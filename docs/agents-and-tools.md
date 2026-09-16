# Agents and Tools

## Agents

- Prompt/programmatic agents live in `.agents/` (programmatic agents use `handleSteps` generators).
- Generator functions execute in a sandbox; agent templates define tool access and subagents.

### Safety-focused prompt templates (opt-in)

`agents/templates.ts` ships three reusable safety templates as appendix text:
`secure-coding` (input handling, secret hygiene, least-privilege commands),
`minimal-change` (smallest viable diff, no drive-by refactors,
restore-then-verify), and `test-first-fix` (reproduce, failing test, minimal
fix, verify). Nothing is pre-enabled on any root.

Two opt-in paths:

- **On a base3 CLI root** — pass the id to the root factory's
  `safetyTemplate` option (agents without it are unchanged):

  ```ts
  import { createBase3CliRoot } from '../agents/base3'

  const root = createBase3CliRoot({ safetyTemplate: 'secure-coding' })
  ```

- **In a local `.agents/` definition or a knowledge file** — the templates are
  plain prose with no placeholders or runtime substitution, so the section can
  be pasted directly into a local agent's `systemPrompt` or a knowledge file
  (`AGENTS.md`) with no imports. Inside this monorepo (where the `.agents`
  directory sits beside `agents/`), a local agent file can also import the
  constant directly:

  ```ts
  // .agents/my-agent.ts — inside the monorepo
  import { getTemplateAppendix } from '../agents/templates'

  export default {
    id: 'my-agent',
    model: 'anthropic/claude-opus-5',
    systemPrompt: `You are my agent.\n\n${getTemplateAppendix('minimal-change')}`,
  }
  ```

Rules (enforced by `agents/__tests__/base3.test.ts`): templates are appended,
never position 0 — the free-mode opening gate
(`hasFreebuffRootSystemPromptOpening`) requires the canonical opening at byte
0; they contain no tool names, so they are safe for agents whose toolset
differs from base3's; and unknown ids throw rather than silently falling back
to the default. See `docs/customization.md` for the full append-don't-prepend
and defaults-stay-unchanged rules.

### Shell Shims

Direct commands without `codebuff` prefix:

```bash
codebuff shims install codebuff/base-lite@1.0.0
eval "$(codebuff shims env)"
base-lite "fix this bug"
```

## Tools

- Tool definitions live in `common/src/tools` and are executed via the SDK helpers + agent-runtime.

### Console-free terminal command broker

`run_terminal_command` separates process ownership from terminal UI ownership:

- `sdk/src/tools/run-terminal-command.ts` owns output buffering, timeouts,
  cancellation escalation, results, and process diagnostics. Headless SDK
  consumers use its direct process-group runner.
- Interactive hosts provide `terminalCommandBroker` in `CodebuffClientOptions`
  (or directly to `runTerminalCommand`). Each call synchronously starts an
  isolated helper and returns a handle for its complete process tree. A startup
  failure prevents the shell from running; there is no direct-console fallback.
- The CLI's tiny `src/entry.ts` handles private broker mode before importing
  React or OpenTUI. The detached, hidden helper receives one spawn request over
  stdin, starts the shell without a console or interactive stdin, relays only
  stdout/stderr pipes, and reports completion through a constrained one-shot
  file in the OS temp directory. It deliberately uses only the three standard
  stdio channels: Bun's custom child-process pipes can fail their Windows
  `node:net` handshake outside the `ChildProcess` error event and terminate the
  CLI as an unhandled rejection. The broker remains the process-group root and
  self-reaps the tree if its parent disappears, detected by polling the parent
  PID rather than holding another pipe open.
- Mouse and focus protocols stay enabled while commands run. The
  `TerminalProtocolController` only parses focus events; it has no command
  lifecycle state to synchronize or restore.

Thread the broker capability through every interactive command entry point.
Do not bypass it with a direct `spawn`, add command-active terminal state, or
fall back to the TUI process when broker startup fails.

When the broker will not start on your machine, the symptom → cause → check →
fix path is in `docs/troubleshooting.md` ("Terminal commands never run").
