import * as fs from 'fs'
import path from 'path'

import { z } from 'zod'

import { getFileStatsFromBlocks } from './implementor-helpers'
import { writeFileAtomic } from './write-file-atomic'

import type {
  RunCheck,
  RunCheckStatus,
  RunFileChange,
  RunFileChangeKind,
  RunSummary,
} from '@codebuff/common/types/contracts/run-summary'
import type { ChatMessage, ContentBlock } from '../types/chat'

/**
 * Capture and validate the per-run outcome summary (specs/tickets.md, C1).
 *
 * Extraction is sourced from TOOL-CALL RECORDS, not model prose, wherever the
 * field allows it: `filesChanged` comes from the edit-tool blocks, and
 * `checks` from run_terminal_command records. Only `unresolvedRisks` reads
 * the model's end-of-turn message, and the contract tolerates its absence.
 *
 * The summary is stored as a SIBLING sidecar next to chat-meta.json rather
 * than folded into it: the existing sidecar is bound to chat-messages.json by
 * size/mtime staleness checks and rewritten on every 5s checkpoint, while a
 * run summary is written once at turn completion. Folding one into the other
 * would make /history's staleness check reject on fields it never reads (and
 * force the summary onto the checkpoint path, where "the run's outcome" is
 * not yet known).
 */

export const RUN_SUMMARY_FILENAME = 'run-summary.json'

/** Caps so a poisoned summary cannot blow up the sidecar or the run-end block. */
const MAX_FILES = 200
const MAX_CHECKS = 50
const MAX_RISKS = 5
const MAX_COMMAND_LENGTH = 200
const MAX_RISK_LENGTH = 200

export const runSummarySchema = z.object({
  timestamp: z.string(),
  runId: z.string().optional(),
  filesChanged: z.array(
    z.object({
      path: z.string(),
      kind: z.enum(['added', 'modified', 'deleted', 'renamed']),
    }),
  ),
  checks: z.array(
    z.object({
      command: z.string(),
      status: z.enum(['pass', 'fail', 'skipped']),
      exitCode: z.number().optional(),
    }),
  ),
  unresolvedRisks: z.array(z.string()),
})

const CHANGE_KIND_BY_STAT: Record<'A' | 'M' | 'D' | 'R', RunFileChangeKind> = {
  A: 'added',
  M: 'modified',
  D: 'deleted',
  R: 'renamed',
}

/** Recursively flatten nested agent blocks so subagent work is counted. */
function collectBlocks(blocks: ContentBlock[] | undefined): ContentBlock[] {
  if (!blocks || blocks.length === 0) return []
  const all: ContentBlock[] = []
  for (const block of blocks) {
    all.push(block)
    if (block.type === 'agent') {
      all.push(...collectBlocks(block.blocks))
    }
  }
  return all
}

/** File changes aggregated from edit-tool records. Last kind per path wins,
 * except a file created earlier in the same run stays "added" — the net
 * change is still a new file. */
export function extractFilesChangedFromBlocks(
  blocks: ContentBlock[] | undefined,
): RunFileChange[] {
  const fileMap = new Map<string, RunFileChange>()
  for (const stat of getFileStatsFromBlocks(blocks)) {
    const kind = CHANGE_KIND_BY_STAT[stat.changeType]
    const previous = fileMap.get(stat.path)
    fileMap.set(stat.path, {
      path: stat.path,
      kind: previous?.kind === 'added' ? 'added' : kind,
    })
  }
  return Array.from(fileMap.values()).slice(0, MAX_FILES)
}

/** Known check-shaped commands worth reporting. Deliberately coarse: a
 * non-check command misclassified in is a cosmetic summary row, while a
 * check misclassified out is a run that claims it verified nothing. */
const CHECK_COMMAND_HINTS = [
  'test',
  'tsc',
  'lint',
  'check',
  'build',
  'vitest',
  'jest',
] as const

function isCheckCommand(command: string): boolean {
  return CHECK_COMMAND_HINTS.some((hint) => command.includes(hint))
}

function classifyExitCode(exitCode: number | undefined): RunCheckStatus {
  if (exitCode === undefined) return 'skipped'
  return exitCode === 0 ? 'pass' : 'fail'
}

/** Verification checks (typecheck/test/lint/build) from terminal-command
 * records. Re-running the same command supersedes the earlier outcome. */
export function extractChecksFromBlocks(
  blocks: ContentBlock[] | undefined,
): RunCheck[] {
  const byCommand = new Map<string, RunCheck>()
  for (const block of collectBlocks(blocks)) {
    if (block.type !== 'tool' || block.toolName !== 'run_terminal_command') {
      continue
    }
    const input = block.input as { command?: unknown } | undefined
    const command =
      typeof input?.command === 'string' ? input.command.trim() : ''
    if (!command || !isCheckCommand(command)) continue

    // The broker's result rides in outputRaw[0].value (see
    // updateToolBlockWithOutput); a missing exit code is a skipped check,
    // not a pass.
    const outputRaw = block.outputRaw as
      | Array<{ value?: { exitCode?: unknown } }>
      | undefined
    const rawExit = outputRaw?.[0]?.value?.exitCode
    const exitCode = typeof rawExit === 'number' ? rawExit : undefined

    byCommand.set(command.slice(0, MAX_COMMAND_LENGTH), {
      command: command.slice(0, MAX_COMMAND_LENGTH),
      status: classifyExitCode(exitCode),
      ...(exitCode !== undefined ? { exitCode } : {}),
    })
  }
  return Array.from(byCommand.values()).slice(0, MAX_CHECKS)
}

/**
 * Unresolved risks from the agent's own end-of-turn message, when it stated
 * any as "Unverified:", "Risk:", "Caveat:" etc. Omitted (empty) when the
 * agent said nothing recognizable — never improvised. Reads only the LAST
 * complete AI message: earlier turns' risks are stale by definition.
 */
export function extractUnresolvedRisksFromMessage(
  message: ChatMessage,
): string[] {
  const risks: string[] = []
  const text = [
    message.content,
    ...(message.blocks ?? [])
      .filter(
        (block): block is Extract<ContentBlock, { type: 'text' }> =>
          block.type === 'text',
      )
      .map((block) => block.content),
  ]
    .filter(Boolean)
    .join('\n')
  for (const line of text.split('\n')) {
    const match = line.match(
      /^\s*[-*]?\s*(?:\*\*)?(unverified|not verified|risk|caveat|unresolved)(?:\*\*)?\s*[:\-]\s*(.+)$/i,
    )
    if (match?.[2]) {
      risks.push(match[2].trim().slice(0, MAX_RISK_LENGTH))
      if (risks.length >= MAX_RISKS) return risks
    }
  }
  return risks
}

/** The last complete AI message in the list, or undefined. */
function lastCompleteAiMessage(
  messages: ChatMessage[],
): ChatMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message.variant === 'ai' && message.isComplete) return message
  }
  return undefined
}

/**
 * Build the summary for a completed run from its transcript slice. All-empty
 * is a valid outcome (a run that changed nothing and ran no checks), so the
 * return is never null — the schema tolerates absence per field instead.
 */
export function buildRunSummary(
  messages: ChatMessage[],
  options: { runId?: string; timestamp?: string } = {},
): RunSummary {
  const blocks = messages.flatMap((message) => message.blocks ?? [])
  const aiMessage = lastCompleteAiMessage(messages)
  return {
    timestamp: options.timestamp ?? new Date().toISOString(),
    ...(options.runId !== undefined ? { runId: options.runId } : {}),
    filesChanged: extractFilesChangedFromBlocks(blocks),
    checks: extractChecksFromBlocks(blocks),
    unresolvedRisks: aiMessage
      ? extractUnresolvedRisksFromMessage(aiMessage)
      : [],
  }
}

/** Validate a parsed sidecar payload; null means "no valid summary" — callers
 * fall back to absent, never to a guessed one. */
export function parseRunSummary(raw: unknown): RunSummary | null {
  const parsed = runSummarySchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export function readRunSummary(chatDir: string): RunSummary | null {
  try {
    const raw = JSON.parse(
      fs.readFileSync(path.join(chatDir, RUN_SUMMARY_FILENAME), 'utf8'),
    )
    return parseRunSummary(raw)
  } catch {
    return null
  }
}

export function writeRunSummary(chatDir: string, summary: RunSummary): void {
  try {
    writeFileAtomic(
      path.join(chatDir, RUN_SUMMARY_FILENAME),
      JSON.stringify(summary),
    )
  } catch {
    // Best-effort like chat-meta: a summary write failure must never block
    // the transcript save it is attached to.
  }
}
