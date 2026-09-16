# Upstream Sync Playbook

The repeatable process for bringing upstream changes into this fork
(specs/tickets.md, ticket D1). This fork is a snapshot export of
`freebuff-private` — the upstream history arrives as whole-tree "Sync public
snapshot" commits (e.g. `505752f92`), not as a git remote, so "sync" means
merging or re-applying a new snapshot onto `main`. Keep this document
procedural: commands, file lists, decision rules. It is revisited on the same
monthly cadence as `specs/tickets.md` (§6) and should be corrected the moment
a step rots, not at the next review.

## Cadence

Sync at the **monthly roadmap review** (specs/tickets.md §6), and additionally
whenever:

- an upstream security or entitlement fix lands that this fork needs
  (`free-agents.ts` changes above all — see the conflict rules),
- a fork ticket needs an upstream feature as its base, or
- the fork's tests start failing against behavior documented in
  `docs/testing.md` in a way that suggests upstream changed underneath.

Do not sync mid-ticket: finish the ticket, land it, then sync. A sync that
mixes with unlanded fork work makes both uncarryable.

## Mechanical steps

Run from a clean `main` (`git status` must be empty). Never force-push `main`
(repo convention in `AGENTS.md`) — the fork's history is append-only.

1. **Fetch the snapshot.** Obtain the new upstream export (snapshot commit or
   archive). Identify its base: `git log --oneline --all | grep "Sync public
   snapshot"` — the last such commit is the fork's current upstream position.
2. **Create a sync branch.** `git checkout -b sync/upstream-<date>` (e.g.
   `sync/upstream-2026-10-01`). All conflict resolution happens here; `main`
   only receives the result via a normal merge or fast-forward.
3. **Merge or replace.**
   - If the snapshot arrives as a git branch/commit: `git merge <snapshot-ref>`.
   - If it arrives as an archive: replace the upstream-carried trees in the
     working directory (everything **except** the fork-owned files listed
     below), `git add -A`, and commit as
     `Sync public snapshot from freebuff-private` to match the existing
     convention.
4. **Resolve conflicts** per the playbook below. When unsure, the tie-break is:
   upstream wins on behavior, fork wins on ownership and framing.
5. **Build and validate** with the checklist below, on the sync branch.
6. **Merge into `main`** with a normal merge (no force-push, no rebase of
   shared history), then delete the sync branch.
7. **Record it.** Update `Last updated` in `specs/tickets.md`, add a
   `specs/decisions.md` entry (D2) if the sync changed any fork decision, and
   note any new divergence points discovered, directly in the conflict table
   below.

## Fork-owned files (always keep ours)

These carry the fork's identity and policy. On any conflict, take the fork's
version wholesale — upstream does not know they exist:

- `specs/` — this playbook, `specs/tickets.md`, and `specs/decisions.md` (D2)
- `freebuff/SPEC.md` — the Freebuff product spec (`IS_FREEBUFF` flag, branding)
- `docs/fork.md`, `docs/customization.md`, `docs/troubleshooting.md`
- `agents/personas.ts`, `agents/templates.ts` — fork-only modules (B1/B3);
  upstream cannot conflict with them directly, but upstream edits to their
  *callers* will — see the next table.

## Conflict playbook (known divergence points)

| Surface | Why it conflicts | Resolution rule |
| --- | --- | --- |
| `specs/`, `freebuff/SPEC.md`, `docs/fork.md`, `docs/customization.md`, `docs/troubleshooting.md` | Fork-owned (list above) | **Keep ours.** No exceptions. |
| `AGENTS.md` | Upstream conventions + the fork identity note, customization-boundaries section, and docs list | **Merge by hand.** Keep upstream's updates to conventions/repo map; re-add the fork note, boundaries section, and fork docs links exactly as they were. |
| `README.md`, `README.zh-CN.md` | Upstream product docs + the fork note at the top | **Merge by hand.** Take upstream's content updates; re-apply the fork note block and keep the two READMEs in sync with each other. |
| `CONTRIBUTING.md` | Upstream PR flow + the fork-context paragraph | **Merge by hand.** Upstream owns the flow text; re-add the fork-context blockquote. |
| `docs/testing.md`, `docs/agents-and-tools.md` | Upstream-authored guides + fork additions (provenance note, C2 cross-link, template docs) | **Merge by hand.** Take upstream's edits; re-apply the fork's additions (the provenance blockquote in testing.md, the troubleshooting cross-link, the safety-template section). |
| `agents/base3.ts` | Upstream edits + fork plumbing (`persona` and `safetyTemplate` options, `buildCliAppendix` wiring) | **Re-apply fork fragments onto upstream's version.** The option/appendix pattern makes this mechanical: copy upstream's `createBase3CliRoot`/`buildCliAppendix`, then re-add the two option fields, their destructure, the `buildCliAppendix` parameters, and the `personaAppendix`/`templateAppendix` blocks. Never edit the system prompt's opening sentence. |
| `agents/constants.ts` | Upstream guidance + fork's `toolRoutingGuidance` (B2) | **Merge by hand.** Keep upstream's constants; re-add `toolRoutingGuidance(includeAskUser)` if upstream's copy lacks it. Parameterized constants drift-resistant by design. |
| `agents/__tests__/base3.test.ts` | Upstream test edits + fork's persona/template/routing describe blocks | **Keep both.** Take upstream's test changes, then re-append the fork's `describe` blocks. |
| `cli/src/utils/freebuff-persona.ts`, `cli/src/utils/run-summary.ts`, `cli/src/components/run-summary-block.tsx`, `common/src/types/contracts/run-summary.ts`, `cli/src/commands/process-diagnostics.ts` | Fork-new modules (B1/C1) and their wiring in `cli/src/utils/local-agent-registry.ts`, `cli/src/hooks/use-send-message.ts`, `cli/src/components/message-footer.tsx`, `cli/src/types/env.ts` | **Keep ours; re-apply wiring.** If upstream refactored a wired file, port the fork's call sites (the `getSelectedPersonaId`/`applyPersonaToDefinition` block, the `writeRunSummary` block, the `RunSummaryBlock` render) onto upstream's structure. |
| `common/src/constants/free-agents.ts` | Upstream moves constantly (model allowlists, root ids, gates). **Any local diff here is a fork mistake** | **Take upstream wholesale. Never resolve by editing fork-side** — it is access enforcement (see `docs/customization.md`). Delete local edits without reading them as instructions; after taking upstream, re-run the fork's tests against it and fix nothing inside the file. |
| `common/src/constants/foreign-client-signals.ts`, `common/src/constants/freebuff-models.ts` | Same class as `free-agents.ts` | **Take upstream wholesale.** Same rule. |
| `.github/workflows/ci.yml` | Upstream may add jobs this export lacks | **Take upstream**, then confirm the build:sdk → build:freebuff → smoke shape still matches what the validation checklist runs. |
| Anything under `web/`, `packages/internal/`, `packages/billing/`, `packages/bigquery/`, `packages/build-tools/` | Not part of this export | Not expected; if a snapshot contains them, do not import those paths (CONTRIBUTING.md scope rule). |

**Tie-break:** upstream wins on behavior, fork wins on ownership and framing.
When a fork fragment cannot be re-applied because upstream restructured its
host file, that is a port, not a conflict — do it as a deliberate follow-up
commit on the sync branch, never silently inside the merge.

## Upstream-only infrastructure (do not chase it)

Parts of `docs/testing.md` describe upstream tooling that does **not** exist in
this tree. The validation checklist below must not send a maintainer looking
for:

- `scripts/ci/test-with-guard.ts` and `.github/test-baselines.json` (the CI
  test guard and baselines)
- `scripts/flake-hunt.ts` and the weekly `flake-hunt.yml` workflow
- `packages/internal/` — not part of this export, so
  `cli/src/__tests__/test-utils.ts` (`loadCliEnv`/`ensureCliTestEnv`) cannot
  resolve `packages/internal/src/env`; test files importing that helper fail
  at import (`Failed to load CLI environment … Cannot find module
  '../../../packages/internal/src/env'`, suggesting `infisical run`). Known
  affected files in `cli/src/utils/__tests__/`: `anonymous-id.test.ts`,
  `sponsored-run.test.ts`, `sponsored-worktree.test.ts`,
  `theme-platform-detection.test.ts`. This accounts for the 11 import errors
  in a full `cli` utils-suite run — pre-existing, not sync damage.

The fork-equivalent gates are package-local `bun test` + `bun run typecheck`
locally, and `.github/workflows/ci.yml` (build:sdk → build:freebuff → binary
smoke) as the merge gate. If a future snapshot ships any of these files, update
this section and the provenance note in `docs/testing.md` in the same sync.

## Post-sync validation checklist

Run in order; stop and fix at the first red. Every command below exists in
this tree.

```bash
# 0. Clean state, on the sync branch.
git status                              # must be empty
git log --oneline -3                    # confirm the sync merge is on top

# 1. Dependencies (lockfile may have moved with the snapshot).
bun install --frozen-lockfile

# 2. Builds — exactly what public CI runs (.github/workflows/ci.yml).
bun run build:sdk
bun run build:freebuff

# 3. Binary smoke — the third CI step.
bun cli/scripts/smoke-binary.ts cli/bin/freebuff

# 4. Focused tests for the high-conflict packages, then their full suites.
cd agents && bun run test && bun run typecheck && cd ..
cd common && bun run test && bun run typecheck && cd ..
cd cli && bun test src/utils/__tests__ && bun run typecheck && cd ..

# 5. Access-enforcement is untouched (must print nothing).
git diff main --stat -- common/src/constants/free-agents.ts \
  common/src/constants/freebuff-models.ts \
  common/src/constants/foreign-client-signals.ts

# 6. Doc link check for anything under docs/ or specs/ changed by the sync:
#    every markdown link target resolves to an existing file.
git diff main --name-only -- docs specs | while read f; do
  grep -oE '\]\((\./|\.\./)?[^)#]+' "$f" | sed 's/\](//' | while read link; do
    target="$(dirname "$f")/$link"
    [ -e "${target//\//\/}" ] || echo "BROKEN: $f -> $link"
  done
done

# 7. Known Windows environment failures are pre-existing and not sync damage:
#    compare the failure list against the pre-sync baseline (see below) rather
#    than expecting zero failures on win32.
```

Notes on the checklist:

- Step 2's `bun run build:freebuff` wraps `cli/scripts/build-binary.ts`, which
  spawns `bun build … --env "NEXT_PUBLIC_*"` via `spawnSync`. On Windows under
  Git Bash this spawn can fail with `exit code undefined` even though the
  identical build command succeeds when run directly from `cli/` — a known
  environment quirk (recorded in the dry run below), not a sync regression.
  The direct-command fallback, run from `cli/`, produces the same binary:

  ```bash
  cd cli && bun build src/entry.ts --compile --production \
    --no-compile-autoload-bunfig --target=bun-windows-x64 \
    --outfile=bin/freebuff.exe --sourcemap=none \
    --define process.env.NODE_ENV='"production"' \
    --define process.env.CODEBUFF_IS_BINARY='"true"' \
    --define process.env.CODEBUFF_CLI_VERSION='"0.0.0-dev"' \
    --define process.env.CODEBUFF_CLI_TARGET='"win32-x64"' \
    --define process.env.FREEBUFF_MODE='"true"' \
    --env "NEXT_PUBLIC_*"
  ```

  (The `--define` values need the embedded quotes shown. If the wrapper is
  fixed upstream, delete this fallback.)
- Step 3 requires `cli/bin/freebuff` (or `cli/bin/freebuff.exe` on Windows)
  from step 2's build (`build-binary.ts` writes there; the path is gitignored).
- Step 4's `cli` slice covers the fork's CLI modules (persona seam, run
  summaries); a snapshot that touched more of `cli/` warrants the full
  `bun test cli/src/utils/__tests__ cli/src/components/__tests__` run, with
  failures judged against the known environment-only set (`EPERM` rename races
  in `write-file-atomic.test.ts`, OpenTUI frame snapshots) documented in
  `docs/troubleshooting.md`.
- Step 5 printing **anything** means the sync (or a bad conflict resolution)
  touched access enforcement — stop, restore upstream's version of those
  files, and re-run.
- On non-Windows machines the step-7 caveat does not apply; expect zero
  failures there.

### The dry run (this playbook's proof)

The ticket's acceptance criterion is one recorded pass of this checklist.

The first dry run (2026-09-16, against the current tree, no snapshot pending —
steps 1–7 run unchanged as a regression baseline, on Windows/Git Bash):

- `git status`: clean of upstream drift (the fork's own ticket work was
  present and uncommitted — noted, not a blocker) ✓
- `bun install --frozen-lockfile` ✓ (811 installs, no changes)
- `bun run build:sdk` ✓ (dist/index.{mjs,cjs,d.ts})
- `bun run build:freebuff` ✗ via the wrapper script on Windows (spawnSync
  `exit code undefined`), then ✓ via the direct-command fallback above —
  binary produced at `cli/bin/freebuff.exe` (~108 MB)
- smoke (`bun cli/scripts/smoke-binary.ts cli/bin/freebuff.exe` with the CI
  env vars plus `NEXT_PUBLIC_WEB_PORT=3000`): ✓ — `tree-sitter init OK`,
  boot matched `/Press ENTER to login/` on attempt 1. Requires the
  `tree-sitter.wasm` sibling (the wrapper script writes it; copy
  `node_modules/web-tree-sitter/tree-sitter.wasm` to `cli/bin/` when using
  the direct-command fallback). Note the smoke needs `NEXT_PUBLIC_WEB_PORT`
  even though the CI workflow's env block does not list it — the binary's
  env schema validates it as a number and fails without it (dry-run finding:
  worth fixing in ci.yml on a future sync).
- focused suites: `agents` — 293 pass, typecheck clean ✓; `common` —
  enforcement-adjacent slices green (`free-agents.test.ts` + util/constants:
  854 pass), with 3 pre-existing failures from
  `freebuff/web/convex/.../freebuff_bundled_agents.ts` and
  `freebuff-desktop/src/shared/mission-prompt.ts` being absent in this export
  (the opening-gate tests read those sources) and 1 pre-existing typecheck
  error in `dynamic-agent-template.test.ts` — all identical with the fork's
  changes stashed ✓; `cli` utils — 1409 pass, and the 12 fail / 11 errors are
  byte-identical to the stashed baseline (verified by diffing the sorted
  failure lists) ✓
- `git diff main` on the enforcement files: empty ✓
- doc link check: no broken targets ✓

Re-run the full checklist on the first real snapshot sync, and record that run
here in its place.

## Keeping this playbook alive

- Any conflict not in the table above gets a row added **in the same sync
  commit** that resolves it.
- If a step's command fails because the repo moved (script renamed, path
  changed), fix the step before continuing — the playbook is the source of
  truth, not the memory of the person running it.
- Reviewed at each monthly roadmap review alongside `specs/tickets.md` §6;
  corrections land as normal commits to this fork-owned file.
