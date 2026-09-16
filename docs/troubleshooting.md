# Troubleshooting

Structured diagnostics for the failure modes this tree actually produces
(specs/tickets.md, ticket C2). Each section is symptom → likely cause → check →
fix. Every command and path here exists in the repository — nothing is
invented; where a command is upstream-only, the provenance note in
`docs/testing.md` applies and the fork-equivalent check is named instead.

## Reading the failure logs

Persistence failures (`run-state.json`, `chat-messages.json`, the sidecars) are
logged from `cli/src/utils/run-state-storage.ts` with structured fields so a
single log row narrows the search before you open anything:

- `surface` — which code path wrote the failure: `checkpoint` (periodic 5s
  saves during a run), `save-sync` (authoritative saves: turn completion,
  errors), `save-async` (the off-thread counterpart of a checkpoint),
  `exit-flush` (the best-effort persist when the process quits), or `load`
  (restoring a chat at startup).
- `chatId` — the chat directory basename the failure is scoped to, so a bad
  transcript can be located under the config dir's `projects/<project>/chats/`
  without grepping.
- `part` — which file: `runState`, `messages`, or `meta`.
- `errorClass` — `cyclic` / `oom` (payload problems, rescued or warned) vs
  `disk` / `other` (environment problems).

Each distinct issue per chat dir is logged at most once per 5-minute interval
(`SAVE_LOG_INTERVAL_MS`), so absence of a repeat does not mean absence of the
problem. The CLI also has a live snapshot command: `/diagnostics`
(aliases `/diag`, `/processes`, defined in `cli/src/commands/command-registry.ts`,
implemented by `cli/src/commands/process-diagnostics.ts`) prints process, CPU,
memory, watchdog, and active terminal-command state into the transcript.

## A whole test file dies with `Invalid environment configuration`

- **Symptom.** `bun test` reports `Unhandled error between tests` or the file
  fails before any test runs; the message points at `common/src/env.ts` and
  `NEXT_PUBLIC_*` values like `NEXT_PUBLIC_CB_ENVIRONMENT`.
- **Likely cause.** The package's env fixture did not preload. `@codebuff/common`
  validates env at import time, and Bun loads `.env` from the process cwd only,
  so package-local runs see none of the repo-root env.
- **Check.** Does the package have a `bunfig.toml` with a `preload` list
  including `sdk/test/setup-env.ts`? Are you running from the package directory
  (`cd cli && bun test …`) rather than the repo root? `cli/bunfig.toml`
  additionally preloads `test/setup-scm-loader.ts` and
  `cli/test/setup-agents-artifact.ts`; run from the wrong cwd and the preloads
  are not found at all (`error: preload not found "../test/setup-scm-loader.ts"`).
- **Fix.** Run package-local from the package directory. If a *new* package
  fails this way, add a `bunfig.toml` preloading `sdk/test/setup-env.ts` —
  placeholders only, never a developer's `.env` (see `docs/testing.md`).

## `error: Cannot find module '../agents/bundled-agents.generated'`

- **Symptom.** CLI tests fail at import with the module not found; roughly 17
  files (~371 tests) are affected in a fresh worktree.
- **Likely cause.** `cli/src/agents/bundled-agents.generated.ts` is gitignored
  and produced at build time.
- **Check.** `ls cli/src/agents/bundled-agents.generated.ts` — a missing file
  confirms it.
- **Fix.** `bun run --cwd cli prebuild:agents` (the script
  `cli/scripts/prebuild-agents.ts`; CI performs the equivalent at build time).
  The `cli/test/setup-agents-artifact.ts` preload builds it on demand for
  package-local test runs.

## `Vendored ripgrep not found` from code_search

- **Symptom.** `code_search` fails with
  `ENOENT … vendor/ripgrep/<platform>/rg.exe` (or `rg` on Unix) and a note
  about `CODEBUFF_RG_PATH`.
- **Likely cause.** The ripgrep binary for this platform was never fetched, or
  the resolution path (`sdk/src/native/ripgrep.ts` → `sdk/vendor/ripgrep/`,
  falling back through `import.meta.url` variants) cannot find it from the
  current working directory.
- **Check.** `ls sdk/vendor/ripgrep` — the platform directory
  (`x64-win32`, `arm64-darwin`, …) should contain the binary. Missing on all
  platforms means the fetch never ran.
- **Fix.** `cd sdk && bun run fetch-ripgrep` (script: `sdk/scripts/fetch-ripgrep.ts`).
  To point the CLI at any existing rg binary instead, set `CODEBUFF_RG_PATH`
  (read in `sdk/src/native/ripgrep.ts`; the override wins over every search
  path). A compiled CLI binary self-extracts its embedded copy next to itself
  (`cli/src/native/ripgrep.ts`); if that extraction fails it logs
  `Failed to extract ripgrep binary` and falls back to the SDK copy.

## Terminal commands never run / `run_terminal_command` reports a startup failure

- **Symptom.** Every terminal command fails to start, or the CLI dies as an
  unhandled rejection when a command is issued.
- **Likely cause.** The console-free terminal command broker failed to start
  its helper. By design there is **no** direct-console fallback: a startup
  failure prevents the shell from running (`docs/agents-and-tools.md`).
- **Check.** Run `/diagnostics` in the CLI — it reports the terminal watchdog
  state and active tool processes. On Windows the known conflict is a
  PowerShell process shape that endpoint-security policy interferes with; the
  broker deliberately uses only the three standard stdio channels because Bun's
  custom child-process pipes can fail their Windows `node:net` handshake
  outside the `ChildProcess` error event.
- **Fix.** Restart the CLI so the broker helper is re-spawned. On machines
  where the watchdog conflicts with security software, set
  `CODEBUFF_NO_TERMINAL_WATCHDOG=1` (read in `cli/src/types/env.ts`) to
  suppress the terminal-reset watchdog. Do not bypass the broker with a direct
  `spawn` — that is an upstream invariant, not a workaround.

## A chat restored from history is missing its transcript or agent context

- **Symptom.** A resumed chat shows the transcript but the agent lost context,
  or vice versa; the log carries
  `Could not read run state; restoring transcript without agent context`
  (or the messages twin).
- **Likely cause.** One of the two state files is missing or torn (a crash
  between writes). They are parsed independently on purpose so one bad file
  cannot lose the other.
- **Check.** Look in the config dir's `projects/<project>/chats/<chatId>/`
  (the `chatId` is in the log row): `run-state.json` and
  `chat-messages.json` should both parse — e.g.
  `bun -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')); console.log('ok')" <path>`.
- **Fix.** Re-run the turn; the CLI rebuilds the missing half from what it can
  read. Do not hand-edit the files — the `chat-meta.json` sidecar records the
  transcript's size/mtime and will reject a stale sidecar, falling back to a
  full parse rather than showing outdated data.

## `/history` shows no summary block for a chat that ran checks

- **Symptom.** `run-summary.json` is missing or unreadable for a recent chat.
- **Likely cause.** The run was interrupted before the completion save (the
  summary is written once at turn completion, not on checkpoints), or the file
  failed the schema check on read and was treated as absent.
- **Check.** `ls <configDir>/projects/<project>/chats/<chatId>/` — the sidecars
  are `chat-meta.json` and `run-summary.json`
  (`cli/src/utils/run-summary.ts` defines the schema).
- **Fix.** None needed: absence is a valid state. The next completed turn in
  that chat writes a fresh summary.

## Suites fail only on Windows with `EPERM` renames or frame mismatches

- **Symptom.** `writeFileAtomicAsync` tests fail with
  `EPERM … rename … code: "EPERM"`; renderer frame tests report
  `frames changed -- review the diff`.
- **Likely cause.** Environment, not code: on Windows, antivirus and indexing
  can hold a rename lock on files in the OS temp directory
  (`classifySaveError` maps `EPERM`/`EBUSY`/… to the `disk` class for exactly
  this), and OpenTUI character frames differ by terminal font/width handling.
- **Check.** Re-run the same file alone: `bun test cli/src/utils/__tests__/write-file-atomic.test.ts`.
  A pass in isolation with contention absent confirms the magnifier effect —
  load and interference are magnifiers, not causes (`docs/testing.md`).
- **Fix.** Retry when the machine is quiet. For suspected real flakes under
  contention, upstream's `scripts/flake-hunt.ts` reproduces them deliberately
  — it is upstream-only infrastructure in this tree (see the provenance note
  at the top of `docs/testing.md`), so until it exists here, run the package
  suite repeatedly instead.

## CI is red and locally green (or the reverse)

- **Symptom.** `.github/workflows/ci.yml` (this tree's actual CI: build the
  SDK, build the Freebuff binary, smoke-test it) fails while the same steps
  pass locally.
- **Likely cause.** Environment drift: CI runs `bun install --frozen-lockfile`
  and `bun run build:sdk` from a clean checkout, and the smoke step sets
  explicit `NEXT_PUBLIC_*` env vars.
- **Check.** `bun run ci` locally (the root `package.json` script chaining
  `build:sdk` + `build:freebuff`) reproduces the CI build in one command; the
  binary lands at `cli/bin/freebuff` (gitignored build output of
  `freebuff/cli/build.ts`), and the smoke flow is
  `bun cli/scripts/smoke-binary.ts cli/bin/freebuff` with the env vars from
  the workflow.
- **Fix.** Fix the divergence the failure names — usually a missing env var in
  a new code path (the smoke step's env block is the list) or a dependency
  that differs from `bun.lock`.

## Related

- `docs/testing.md` — the testing doctrine, the env-fixture rule, and the
  provenance note for upstream-only tooling referenced above
- `docs/agents-and-tools.md` — the terminal-command broker's design and its
  no-fallback startup-failure behavior
- `docs/fork.md` — fork ownership and which contribution flow applies
- `specs/tickets.md` — this file is ticket C2's deliverable
