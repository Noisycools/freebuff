import { describe, test, expect, beforeEach } from 'bun:test'

import type { CliEnv } from '../../types/env'
import {
  applyPersonaToDefinition,
  getSelectedPersonaId,
} from '../freebuff-persona'

const makeEnv = (overrides: Partial<CliEnv> = {}): CliEnv =>
  ({
    FREEBUFF_PERSONA: undefined,
    ...overrides,
  }) as CliEnv

const makeDefinition = (
  systemPrompt = 'You are Buffy, the coding agent behind Codebuff. Base prompt.',
): any => ({
  id: 'base3-free-deepseek',
  model: 'deepseek/x',
  systemPrompt,
})

describe('FREEBUFF_PERSONA selection', () => {
  // DI: a recorded warn sink, per docs/testing.md (never assert on the pino
  // logger or console); the default logger sink is exercised in production.
  const warnings: Array<{ message: string; details: Record<string, unknown> }> =
    []
  const warn = (message: string, details: Record<string, unknown>) => {
    warnings.push({ message, details })
  }
  const warnCount = () => warnings.length

  // Fresh sink per test: counts must never leak between cases.
  beforeEach(() => {
    warnings.length = 0
  })

  test('unset / whitespace env resolves to no persona', () => {
    expect(getSelectedPersonaId(makeEnv(), warn)).toBeNull()
    expect(
      getSelectedPersonaId(makeEnv({ FREEBUFF_PERSONA: '' }), warn),
    ).toBeNull()
    expect(
      getSelectedPersonaId(makeEnv({ FREEBUFF_PERSONA: '   ' }), warn),
    ).toBeNull()
    expect(warnCount()).toBe(0)
  })

  test('a valid id resolves and is case-sensitive', () => {
    expect(
      getSelectedPersonaId(
        makeEnv({ FREEBUFF_PERSONA: 'conservative-reviewer' }),
        warn,
      ),
    ).toBe('conservative-reviewer')
    expect(
      getSelectedPersonaId(
        makeEnv({ FREEBUFF_PERSONA: 'fast-implementer' }),
        warn,
      ),
    ).toBe('fast-implementer')
    expect(warnCount()).toBe(0)
    // Case-sensitivity: a wrong-case id is just unknown — null + the usual
    // advisory warning.
    expect(
      getSelectedPersonaId(
        makeEnv({ FREEBUFF_PERSONA: 'Fast-Implementer' }),
        warn,
      ),
    ).toBeNull()
    expect(warnCount()).toBe(1)
  })

  test('an unknown id is advisory: null + a warning, never a throw', () => {
    expect(
      getSelectedPersonaId(makeEnv({ FREEBUFF_PERSONA: 'nope' }), warn),
    ).toBeNull()
    // getPersonaAppendix would throw; the env seam must not.
    expect(warnCount()).toBe(1)
    expect(warnings[0]!.message).toContain('FREEBUFF_PERSONA')
    expect(warnings[0]!.details).toEqual({
      persona: 'nope',
      valid: ['conservative-reviewer', 'fast-implementer'],
    })
  })

  test('trims surrounding whitespace before matching', () => {
    expect(
      getSelectedPersonaId(
        makeEnv({ FREEBUFF_PERSONA: ' fast-implementer ' }),
        warn,
      ),
    ).toBe('fast-implementer')
  })
})

describe('applyPersonaToDefinition', () => {
  test('null persona returns the definition unchanged (same reference)', () => {
    const def = makeDefinition()
    expect(applyPersonaToDefinition(def, null)).toBe(def)
  })

  test('appends the persona section after the existing prompt', () => {
    const def = makeDefinition()
    const applied = applyPersonaToDefinition(def, 'conservative-reviewer')
    expect(applied.systemPrompt).toContain('Base prompt.')
    expect(applied.systemPrompt).toContain(
      '# Working style: conservative reviewer',
    )
    expect(applied.systemPrompt!.indexOf('Base prompt.')).toBeLessThan(
      applied.systemPrompt!.indexOf('# Working style'),
    )
    // Nothing else moves: same id (admission gates on it), same model.
    expect(applied.id).toBe(def.id)
    expect(applied.model).toBe(def.model)
    expect(
      applied.systemPrompt!.startsWith(
        'You are Buffy, the coding agent behind Codebuff.',
      ),
    ).toBe(true)
  })

  test('does not mutate the input definition', () => {
    const def = makeDefinition()
    const before = def.systemPrompt
    applyPersonaToDefinition(def, 'fast-implementer')
    expect(def.systemPrompt).toBe(before)
  })

  test('a definition without a systemPrompt is left alone', () => {
    const def: any = { id: 'x', model: 'm' }
    expect(applyPersonaToDefinition(def, 'fast-implementer')).toBe(def)
  })
})
