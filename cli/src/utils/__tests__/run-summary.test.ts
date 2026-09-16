import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import {
  RUN_SUMMARY_FILENAME,
  buildRunSummary,
  extractChecksFromBlocks,
  extractFilesChangedFromBlocks,
  extractUnresolvedRisksFromMessage,
  parseRunSummary,
  readRunSummary,
  writeRunSummary,
} from '../run-summary'

import type { RunSummary } from '@codebuff/common/types/contracts/run-summary'
import type { ChatMessage, ContentBlock } from '../../types/chat'

let chatDir = ''

function toolBlock(overrides: {
  toolName: string
  input?: unknown
  output?: string
  outputRaw?: unknown
  toolCallId?: string
}): ContentBlock {
  return {
    type: 'tool',
    toolCallId: overrides.toolCallId ?? `tc-${Math.random()}`,
    toolName: overrides.toolName as ContentBlock extends never ? never : any,
    input: overrides.input ?? {},
    ...(overrides.output !== undefined ? { output: overrides.output } : {}),
    ...(overrides.outputRaw !== undefined
      ? { outputRaw: overrides.outputRaw }
      : {}),
  } as ContentBlock
}

function agentMessage(
  blocks: ContentBlock[],
  overrides: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    id: `msg-${Math.random()}`,
    variant: 'agent',
    content: '',
    timestamp: new Date().toISOString(),
    blocks,
    ...overrides,
  }
}

describe('run-summary extraction', () => {
  test('extracts files changed from edit-tool records with change kinds', () => {
    const blocks = [
      toolBlock({
        toolName: 'write_file',
        input: { path: 'src/new-file.ts', content: 'export const x = 1' },
        output: 'file: src/new-file.ts\nmessage: Created file successfully.',
      }),
      toolBlock({
        toolName: 'str_replace',
        input: {
          path: 'src/existing.ts',
          replacements: [{ oldString: 'a', newString: 'b' }],
        },
        output: 'file: src/existing.ts\nmessage: String replace applied successfully',
      }),
      // A failed edit is not a change.
      toolBlock({
        toolName: 'str_replace',
        input: { path: 'src/nope.ts', replacements: [{ oldString: 'x', newString: 'y' }] },
        outputRaw: [{ value: { errorMessage: 'not found' } }],
      }),
    ]
    const files = extractFilesChangedFromBlocks(blocks)
    expect(files).toHaveLength(2)
    expect(files.find((f) => f.path === 'src/new-file.ts')?.kind).toBe('added')
    expect(files.find((f) => f.path === 'src/existing.ts')?.kind).toBe(
      'modified',
    )
    expect(files.find((f) => f.path === 'src/nope.ts')).toBeUndefined()
  })

  test('a file created earlier in the run stays added after later modifications', () => {
    const blocks = [
      toolBlock({
        toolName: 'write_file',
        input: { path: 'src/new-file.ts', content: 'one' },
        output: 'file: src/new-file.ts\nmessage: Created file successfully.',
      }),
      toolBlock({
        toolName: 'str_replace',
        input: { path: 'src/new-file.ts', replacements: [{ oldString: 'one', newString: 'two' }] },
        output: 'file: src/new-file.ts\nmessage: String replace applied successfully',
      }),
    ]
    const files = extractFilesChangedFromBlocks(blocks)
    expect(files).toEqual([{ path: 'src/new-file.ts', kind: 'added' }])
  })

  test('collects checks from terminal commands and classifies by exit code', () => {
    const blocks = [
      toolBlock({
        toolName: 'run_terminal_command',
        input: { command: 'bun test src/foo.test.ts' },
        outputRaw: [{ value: { command: 'bun test src/foo.test.ts', exitCode: 0 } }],
      }),
      toolBlock({
        toolName: 'run_terminal_command',
        input: { command: 'bun run typecheck' },
        outputRaw: [{ value: { command: 'bun run typecheck', exitCode: 2 } }],
      }),
      toolBlock({
        toolName: 'run_terminal_command',
        input: { command: 'bun run lint --fix' },
        // No exit code recorded: skipped, never a silent pass.
      }),
      // Not a check-shaped command: excluded.
      toolBlock({
        toolName: 'run_terminal_command',
        input: { command: 'git status' },
        outputRaw: [{ value: { command: 'git status', exitCode: 0 } }],
      }),
    ]
    const checks = extractChecksFromBlocks(blocks)
    expect(checks).toHaveLength(3)
    expect(checks.find((c) => c.command === 'bun test src/foo.test.ts')).toEqual({
      command: 'bun test src/foo.test.ts',
      status: 'pass',
      exitCode: 0,
    })
    expect(checks.find((c) => c.command === 'bun run typecheck')?.status).toBe(
      'fail',
    )
    expect(
      checks.find((c) => c.command === 'bun run lint --fix')?.status,
    ).toBe('skipped')
    expect(checks.find((c) => c.command === 'git status')).toBeUndefined()
  })

  test('re-running the same check supersedes the earlier outcome', () => {
    const blocks = [
      toolBlock({
        toolName: 'run_terminal_command',
        input: { command: 'bun run typecheck' },
        outputRaw: [{ value: { command: 'bun run typecheck', exitCode: 1 } }],
      }),
      toolBlock({
        toolName: 'run_terminal_command',
        input: { command: 'bun run typecheck' },
        outputRaw: [{ value: { command: 'bun run typecheck', exitCode: 0 } }],
      }),
    ]
    const checks = extractChecksFromBlocks(blocks)
    expect(checks).toEqual([
      { command: 'bun run typecheck', status: 'pass', exitCode: 0 },
    ])
  })

  test('extracts risks only from the stated patterns in the last complete AI message', () => {
    const message = agentMessage([], {
      variant: 'ai',
      isComplete: true,
      content: 'Done.\n- Unverified: the migration path on existing databases\nRisk: performance under load',
    })
    const risks = extractUnresolvedRisksFromMessage(message)
    expect(risks).toEqual([
      'the migration path on existing databases',
      'performance under load',
    ])
  })

  test('no recognizable risk statement yields empty, not improvised risks', () => {
    const message = agentMessage([], {
      variant: 'ai',
      isComplete: true,
      content: 'All done, everything works.',
    })
    expect(extractUnresolvedRisksFromMessage(message)).toEqual([])
  })
})

describe('run-summary builder and sidecar', () => {
  beforeEach(() => {
    chatDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codebuff-run-summary-'))
  })

  afterEach(() => {
    fs.rmSync(chatDir, { recursive: true, force: true })
  })

  test('a run with edits and checks produces both fields populated', () => {
    const messages = [
      agentMessage([
        toolBlock({
          toolName: 'write_file',
          input: { path: 'src/a.ts', content: 'x' },
        }),
        toolBlock({
          toolName: 'run_terminal_command',
          input: { command: 'bun test' },
          outputRaw: [{ value: { command: 'bun test', exitCode: 0 } }],
        }),
      ]),
    ]
    const summary = buildRunSummary(messages, { runId: 'run-1' })
    expect(summary.filesChanged).toHaveLength(1)
    expect(summary.checks).toHaveLength(1)
    expect(summary.runId).toBe('run-1')
    expect(summary.timestamp).toBeTruthy()
  })

  test('a run with no edits and no checks is a valid all-empty summary', () => {
    const messages = [agentMessage([], { variant: 'ai', isComplete: true, content: 'Hello!' })]
    const summary = buildRunSummary(messages)
    expect(summary.filesChanged).toEqual([])
    expect(summary.checks).toEqual([])
    expect(summary.unresolvedRisks).toEqual([])
    // No missing keys: every contract field is present.
    expect(Object.keys(summary).sort()).toEqual([
      'checks',
      'filesChanged',
      'timestamp',
      'unresolvedRisks',
    ])
    // And it round-trips through the sidecar.
    writeRunSummary(chatDir, summary)
    expect(readRunSummary(chatDir)).toEqual(summary)
  })

  test('writeRunSummary / readRunSummary round trip with full payload', () => {
    const summary: RunSummary = {
      timestamp: '2026-09-16T12:00:00.000Z',
      runId: 'run-42',
      filesChanged: [{ path: 'src/a.ts', kind: 'modified' }],
      checks: [{ command: 'bun run typecheck', status: 'fail', exitCode: 2 }],
      unresolvedRisks: ['caching behavior untested'],
    }
    writeRunSummary(chatDir, summary)
    expect(readRunSummary(chatDir)).toEqual(summary)
    expect(fs.existsSync(path.join(chatDir, RUN_SUMMARY_FILENAME))).toBe(true)
  })

  test('readRunSummary returns null for missing or schema-invalid files', () => {
    expect(readRunSummary(chatDir)).toBeNull()

    // A payload missing required keys, or with an out-of-enum kind, is
    // rejected rather than partially trusted.
    fs.writeFileSync(
      path.join(chatDir, RUN_SUMMARY_FILENAME),
      JSON.stringify({ timestamp: 'x', filesChanged: 'not-an-array' }),
    )
    expect(readRunSummary(chatDir)).toBeNull()
  })

  test('parseRunSummary tolerates optional runId absence', () => {
    const parsed = parseRunSummary({
      timestamp: '2026-09-16T12:00:00.000Z',
      filesChanged: [],
      checks: [],
      unresolvedRisks: [],
    })
    expect(parsed).not.toBeNull()
    expect(parsed?.runId).toBeUndefined()
  })
})
