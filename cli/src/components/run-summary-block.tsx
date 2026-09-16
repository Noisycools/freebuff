import React from 'react'

import { useTheme } from '../hooks/use-theme'

import type {
  RunCheck,
  RunFileChange,
} from '@codebuff/common/types/contracts/run-summary'

/**
 * The compact run-end block (specs/tickets.md, C1): a few terminal-friendly
 * lines summarizing what a run did — files changed, checks run, unresolved
 * risks — placed just above the completion footer. Rendered only when there
 * is something to say: a run with no edits, no checks, and no stated risks
 * renders nothing, so chat answers and quick questions are unchanged.
 *
 * Derivation logic lives in `utils/run-summary.ts` (unit-tested there); this
 * component only formats. Paths are truncated to one line each; the lists
 * themselves are already capped at capture time.
 */

const MAX_VISIBLE_FILES = 3
const MAX_VISIBLE_CHECKS = 3

const KIND_GLYPH: Record<RunFileChange['kind'], string> = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
  renamed: 'R',
}

function truncatePath(path: string, maxLength = 48): string {
  if (path.length <= maxLength) return path
  return `…${path.slice(path.length - maxLength + 1)}`
}

function formatCheck(command: string, status: RunCheck['status']): string {
  const glyph = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '○'
  const collapsed = command.replace(/\s+/g, ' ')
  return `${glyph} ${collapsed}`
}

export const RunSummaryBlock: React.FC<{
  filesChanged: RunFileChange[]
  checks: RunCheck[]
  unresolvedRisks: string[]
}> = ({ filesChanged, checks, unresolvedRisks }) => {
  const theme = useTheme()

  if (
    filesChanged.length === 0 &&
    checks.length === 0 &&
    unresolvedRisks.length === 0
  ) {
    return null
  }

  const lines: Array<{ text: string; color?: string }> = []

  if (filesChanged.length > 0) {
    const shown = filesChanged.slice(0, MAX_VISIBLE_FILES)
    for (const file of shown) {
      lines.push({
        text: `  ${KIND_GLYPH[file.kind]} ${truncatePath(file.path)}`,
        color: file.kind === 'added' ? theme.success : theme.secondary,
      })
    }
    const hidden = filesChanged.length - shown.length
    if (hidden > 0) {
      lines.push({ text: `  … and ${hidden} more` })
    }
  }

  if (checks.length > 0) {
    const shown = checks.slice(0, MAX_VISIBLE_CHECKS)
    for (const check of shown) {
      lines.push({
        text: `  ${formatCheck(check.command, check.status)}`,
        color:
          check.status === 'pass'
            ? theme.success
            : check.status === 'fail'
              ? theme.error
              : theme.muted,
      })
    }
    const hidden = checks.length - shown.length
    if (hidden > 0) {
      lines.push({ text: `  … and ${hidden} more` })
    }
  }

  for (const risk of unresolvedRisks) {
    lines.push({ text: `  ! ${risk}`, color: theme.warning })
  }

  return (
    <box
      style={{
        flexDirection: 'column',
        width: '100%',
        marginTop: 0,
        marginBottom: 0,
      }}
    >
      {lines.map((line, idx) => (
        <text
          key={idx}
          attributes={0}
          style={{ wrapMode: 'none', fg: line.color, marginTop: 0, marginBottom: 0 }}
        >
          {line.text}
        </text>
      ))}
    </box>
  )
}
