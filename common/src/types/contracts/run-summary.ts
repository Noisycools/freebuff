/**
 * The per-run outcome summary (specs/tickets.md, ticket C1).
 *
 * A standardized summary of WHAT a run did — files changed, checks run,
 * unresolved risks — written as a sidecar alongside the transcript and shown
 * at run end. Consumers: the CLI's run-end block, `/history`, and any tooling
 * that wants run outcomes without parsing multi-MB transcripts.
 *
 * Where the fields come from matters: files changed and check outcomes are
 * captured from TOOL-CALL RECORDS, never from model prose, so a summary cannot
 * misattribute work the model merely described. Unresolved risks are the one
 * model-sourced field (the agent's own end-of-turn statement); the contract
 * tolerates their absence because nothing else guarantees them.
 */

/** How a file changed, git-status style. */
export type RunFileChangeKind = 'added' | 'modified' | 'deleted' | 'renamed'

/** One file a run touched. */
export type RunFileChange = {
  /** Project-relative path, as the edit tool recorded it. */
  path: string
  kind: RunFileChangeKind
}

/** Outcome of one verification check a run executed. */
export type RunCheckStatus = 'pass' | 'fail' | 'skipped'

export type RunCheck = {
  /** The command that was run (or would have run, when skipped). */
  command: string
  status: RunCheckStatus
  /** Exit code when the command completed and reported one. */
  exitCode?: number
}

/**
 * The summary contract. Every field except `timestamp` is optional and
 * defaults to empty: a run with no file edits and no checks is a VALID
 * summary (all-empty fields), not a missing one, so consumers never special-
 * case absent keys.
 */
export type RunSummary = {
  /** ISO-8601 timestamp for when the summary was captured. */
  timestamp: string
  /** The SDK run id (`runState.sessionId`-shaped id), when available. */
  runId?: string
  filesChanged: RunFileChange[]
  checks: RunCheck[]
  /** Short, model-stated risks that remain after the run (max 5). */
  unresolvedRisks: string[]
}
