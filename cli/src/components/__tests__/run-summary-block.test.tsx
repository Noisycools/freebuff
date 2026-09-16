import { describe, test, expect } from 'bun:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { initializeThemeStore } from '../../hooks/use-theme'
import { RunSummaryBlock } from '../run-summary-block'

initializeThemeStore()

describe('RunSummaryBlock', () => {
  test('renders nothing when the run changed nothing and ran no checks', () => {
    const markup = renderToStaticMarkup(
      <RunSummaryBlock
        filesChanged={[]}
        checks={[]}
        unresolvedRisks={[]}
      />,
    )
    expect(markup).toBe('')
  })

  test('renders file changes with kind glyphs and truncates long paths', () => {
    const markup = renderToStaticMarkup(
      <RunSummaryBlock
        filesChanged={[
          { path: 'src/short.ts', kind: 'added' },
          {
            path: 'a/very/long/path/that/goes/on/and/on/and/should/be/truncated/eventually/deep.ts',
            kind: 'modified',
          },
        ]}
        checks={[]}
        unresolvedRisks={[]}
      />,
    )
    expect(markup).toContain('src/short.ts')
    expect(markup).toContain('deep.ts')
    // The long path is truncated from the left.
    expect(markup).not.toContain('a/very/long/path')
  })

  test('collapses the file list beyond the visible cap', () => {
    const markup = renderToStaticMarkup(
      <RunSummaryBlock
        filesChanged={[
          { path: 'a.ts', kind: 'modified' },
          { path: 'b.ts', kind: 'modified' },
          { path: 'c.ts', kind: 'modified' },
          { path: 'd.ts', kind: 'modified' },
        ]}
        checks={[]}
        unresolvedRisks={[]}
      />,
    )
    expect(markup).toContain('a.ts')
    expect(markup).toContain('c.ts')
    expect(markup).not.toContain('d.ts')
    expect(markup).toContain('and 1 more')
  })

  test('marks check outcomes with distinct glyphs', () => {
    const markup = renderToStaticMarkup(
      <RunSummaryBlock
        filesChanged={[]}
        checks={[
          { command: 'bun run typecheck', status: 'pass' },
          { command: 'bun test', status: 'fail', exitCode: 1 },
          { command: 'bun run lint --fix', status: 'skipped' },
        ]}
        unresolvedRisks={[]}
      />,
    )
    expect(markup).toContain('bun run typecheck')
    expect(markup).toContain('bun test')
    expect(markup).toContain('bun run lint --fix')
    // Multi-space commands are collapsed to one line each.
    expect(markup).toContain('✓ bun run typecheck')
    expect(markup).toContain('✗ bun test')
    expect(markup).toContain('○ bun run lint --fix')
  })

  test('renders stated risks with a warning marker', () => {
    const markup = renderToStaticMarkup(
      <RunSummaryBlock
        filesChanged={[]}
        checks={[]}
        unresolvedRisks={['migration path untested on existing databases']}
      />,
    )
    expect(markup).toContain('migration path untested on existing databases')
  })

  test('renders every section together without clipping', () => {
    const markup = renderToStaticMarkup(
      <RunSummaryBlock
        filesChanged={[{ path: 'src/a.ts', kind: 'modified' }]}
        checks={[{ command: 'bun test', status: 'pass' }]}
        unresolvedRisks={['flaky integration test left unaddressed']}
      />,
    )
    expect(markup).toContain('src/a.ts')
    expect(markup).toContain('bun test')
    expect(markup).toContain('flaky integration test left unaddressed')
  })
})
