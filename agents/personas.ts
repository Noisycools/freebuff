/**
 * Persona presets for the base3 CLI root (specs/tickets.md, ticket B1).
 *
 * A persona is APPENDIX DATA ONLY: a labeled paragraph appended to the system
 * prompt by `createBase3CliRoot({ persona })` (agents/base3.ts). It must never
 * alter the opening sentence, the literal `toolNames` array, or `handleSteps`
 * — the constraints documented in docs/customization.md.
 *
 * Rules every persona here must follow (enforced by
 * agents/__tests__/base3.test.ts):
 *
 * - No placeholder tokens (`{CODEBUFF_*}`): persona text is static prose, so
 *   it survives stringification exactly as written.
 * - No system-prompt opening text: personas are appended, never position 0,
 *   and none of `FREEBUFF_ROOT_SYSTEM_PROMPT_OPENINGS` may appear inside them,
 *   so the opening gate can never be confused by one.
 * - Only tools the root already offers may be referenced by name (no
 *   subagent-spawning advice on a single-loop root).
 * - Small: under ~300 words, because appendix text rides on every turn.
 */

export const PERSONA_IDS = [
  'conservative-reviewer',
  'fast-implementer',
] as const

export type PersonaId = (typeof PERSONA_IDS)[number]

export interface Persona {
  /** Short label for UI/logging use. */
  label: string
  /** One-line description of the behavioral delta. */
  description: string
  /** The appendix section appended to the system prompt (no trailing newline). */
  appendix: string
}

export const PERSONAS: Record<PersonaId, Persona> = {
  'conservative-reviewer': {
    label: 'Conservative reviewer',
    description: 'Verify before claiming, minimal diffs, surface risks.',
    appendix: `# Working style: conservative reviewer

Bias this session toward caution over speed:

- Before claiming any change works, run the project's typecheck and the most relevant tests, and report the actual output. Never describe a check as passing unless you ran it in this session.
- Make the smallest change that resolves the task. Do not rename, reformat, or reorganize anything the task did not ask for, even if you notice it.
- When a requirement is ambiguous, ask before implementing your interpretation of it.
- When you cannot fully verify something, say so explicitly: name what is unverified and what would prove it.
- If you notice an unrelated problem, report it in your final message instead of fixing it.`,
  },
  'fast-implementer': {
    label: 'Fast implementer',
    description: 'Act directly, smallest viable change, batch verification.',
    appendix: `# Working style: fast implementer

Bias this session toward momentum over ceremony:

- Prefer acting directly over asking. When a decision is reversible and either option satisfies the request, pick one, state the assumption in one line, and proceed.
- Implement the smallest change that satisfies the request. Skip preparatory steps that do not change the outcome for a small task.
- Batch verification: run typecheck and tests once when the work is complete rather than after every edit, unless an intermediate step is genuinely uncertain.
- Do not add scaffolding, abstraction, or configuration for requirements that do not exist yet.`,
  },
}

/** True when the value names a known persona. */
export function isPersonaId(value: string | undefined): value is PersonaId {
  return (
    typeof value === 'string' &&
    (PERSONA_IDS as readonly string[]).includes(value)
  )
}

/**
 * The appendix section for a persona id.
 *
 * Throws on an unknown id rather than falling back: a persona is an explicit
 * opt-in, and a typo silently running the default would be indistinguishable
 * from the persona working. Callers that must not crash (e.g. an advisory env
 * override in the CLI) should check `isPersonaId` first.
 */
export function getPersonaAppendix(personaId: string): string {
  if (!isPersonaId(personaId)) {
    throw new Error(
      `Unknown persona '${personaId}'. Valid personas: ${PERSONA_IDS.join(', ')}.`,
    )
  }
  return PERSONAS[personaId].appendix
}
