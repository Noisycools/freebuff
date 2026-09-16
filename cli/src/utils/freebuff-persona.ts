/**
 * Persona selection for the CLI's base3 root (specs/tickets.md, ticket B1).
 *
 * Advisory env override: `FREEBUFF_PERSONA=<id>` (unset = no persona, which is
 * the default). Importing the persona module is safe here — it is pure data
 * with no env access, unlike most of `agents/`, which drags build-time env
 * validation into the CLI.
 *
 * The selected persona is applied by `loadAgentDefinitions`
 * (`local-agent-registry.ts`) by APPENDING the persona section to the agent's
 * system prompt, mirroring what `sponsoredAgentDefinition`
 * (`sponsored-agent.ts`) already does for sponsored runs. The agent keeps its
 * own root id — free mode gates on the (agent id, model) pair, so an invented
 * id would fail admission, and the same root id keeps attribution and
 * spend analysis intact.
 *
 * Like any appendix text, the persona section is appended, never prepended:
 * `hasFreebuffRootSystemPromptOpening` requires the canonical opening at byte
 * 0 and rejects every free-mode turn without it. Unknown persona ids are
 * ignored with a warning rather than failing the run — this is an advisory
 * override, not a contract; the strict variant lives in agents/personas.ts.
 */
import {
  getPersonaAppendix,
  isPersonaId,
  PERSONA_IDS,
} from '../../../agents/personas'

import type { CliEnv } from '../types/env'
import type { AgentDefinition } from '@codebuff/common/templates/initial-agents-dir/types/agent-definition'
import { logger } from './logger'

/**
 * The persona id selected by env, or null for the default (no persona).
 *
 * `warn` is injectable per the repo's DI doctrine (docs/testing.md): callers
 * in tests pass their own sink instead of asserting on the pino logger.
 */
export function getSelectedPersonaId(
  env: CliEnv,
  warn: (message: string, details: Record<string, unknown>) => void = (
    message,
    details,
  ) => logger.warn(details, message),
): string | null {
  const raw = env.FREEBUFF_PERSONA?.trim()
  if (!raw) return null
  if (isPersonaId(raw)) return raw
  warn(
    'Ignoring unknown FREEBUFF_PERSONA value; running with the default persona',
    { persona: raw, valid: [...PERSONA_IDS] },
  )
  return null
}

/**
 * Append the persona's working-style section to an agent definition.
 * With no persona selected the definition is returned unchanged, so the
 * default path is byte-identical to before this module existed.
 */
export function applyPersonaToDefinition(
  definition: AgentDefinition,
  personaId: string | null,
): AgentDefinition {
  if (!personaId) return definition
  if (!definition.systemPrompt) return definition

  const personaAppendix = getPersonaAppendix(personaId)
  return {
    ...definition,
    // Appended, never prepended: the byte-0 opening gate
    // (hasFreebuffRootSystemPromptOpening) must keep matching.
    systemPrompt: `${definition.systemPrompt}\n\n${personaAppendix}`,
  }
}
