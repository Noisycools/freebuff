/**
 * Safety-focused prompt templates for opt-in appendix wiring (specs/tickets.md,
 * ticket B3).
 *
 * A template is APPENDIX DATA ONLY: a labeled section appended to the system
 * prompt by `createBase3CliRoot({ safetyTemplate })` (agents/base3.ts), or
 * carried into any other agent by its own definition / a knowledge file (see
 * docs/agents-and-tools.md). Like a persona, it must never alter the opening
 * sentence, the literal `toolNames` array, or `handleSteps` — the constraints
 * documented in docs/customization.md.
 *
 * Rules every template here must follow (enforced by
 * agents/__tests__/base3.test.ts):
 *
 * - Self-contained prose with no placeholder tokens (`{CODEBUFF_*}`): template
 *   text is static, so it survives stringification exactly as written.
 * - No system-prompt opening text: templates are appended, never position 0,
 *   and none of `FREEBUFF_ROOT_SYSTEM_PROMPT_OPENINGS` may appear inside them,
 *   so the opening gate can never be confused by one.
 * - No tool names at all: templates are also knowledge-file material for
 *   agents outside base3, which may not offer the tools base3 does.
 * - Small: under ~300 words, because appendix text rides on every turn.
 *
 * Scope note (D2 log): exactly the three templates named by the ticket ship
 * here. Review usage before adding more — template sprawl is the recorded
 * risk for this ticket.
 */

export const TEMPLATE_IDS = [
  'secure-coding',
  'minimal-change',
  'test-first-fix',
] as const

export type TemplateId = (typeof TEMPLATE_IDS)[number]

export interface SafetyTemplate {
  /** Short label for UI/logging use. */
  label: string
  /** One-line description of when to apply the template. */
  description: string
  /** The appendix section appended to the system prompt (no trailing newline). */
  appendix: string
}

export const SAFETY_TEMPLATES: Record<TemplateId, SafetyTemplate> = {
  'secure-coding': {
    label: 'Secure coding',
    description:
      'Input handling, secret hygiene, and least-privilege commands for code that touches the outside world.',
    appendix: `# Safety template: secure coding

Apply this template whenever you write or change code that handles input, secrets, or external systems. It overrides the pull toward the shortest implementation:

- **Validate input at the boundary:** Treat every external input — user data, file contents, network responses, CLI arguments, environment variables — as untrusted. Parse and validate it once at the entry point, then pass typed values onward. Never concatenate untrusted input into shell commands, file paths, queries, or markup; use parameterized or escaping APIs instead.
- **Keep secrets out of the repo:** Never write, log, or echo credentials, tokens, or connection strings. Read them from environment variables or the secret mechanism the project already uses. If a diff would add a literal that looks like a key, stop and flag it in your final message instead of committing it.
- **Run commands least-privilege:** Prefer the narrowest command that does the job — no sudo, no wildcard deletes, no piping remote scripts into a shell. Scope writes to the project directory, and never modify anything outside it without asking.
- **Fail closed:** When a security-relevant check cannot be completed (test unavailable, dependency missing), say so and stop rather than assuming success.`,
  },
  'minimal-change': {
    label: 'Minimal-change edits',
    description:
      'Smallest viable diff, no drive-by refactors, restore-then-verify for fixes and small features.',
    appendix: `# Safety template: minimal-change edits

Apply this template when the task is a fix or a small feature, where scope discipline matters more than thoroughness:

- **Smallest viable diff:** Change only what the request requires. Match the file's existing style, naming, and structure rather than improving them.
- **No drive-by refactors:** If you notice an unrelated problem — a stale comment, a messy function, a lint failure elsewhere — report it in your final message instead of fixing it.
- **No speculative machinery:** Do not add config, options, or indirection for requirements that do not exist yet.
- **Restore then verify:** If an edit goes sideways, restore the original bytes before trying a different approach — never stack a fix on top of a half-understood change. After each edit, re-read the touched region and confirm the diff contains only what you intended.
- **Say what you did not touch:** End with a one-line statement of the files changed and anything deliberately left alone.`,
  },
  'test-first-fix': {
    label: 'Test-first fixes',
    description:
      'Reproduce the bug, pin it with a failing test, fix minimally, and verify honestly.',
    appendix: `# Safety template: test-first fixes

Apply this template when fixing a bug, so the fix is pinned by a test that failed before it existed:

- **Reproduce first:** Trigger the bug before touching code — a failing command, test, or minimal snippet. Note the exact observed behavior; never fix from the report alone.
- **Write the failing test:** Add the smallest test that fails today and would pass once the bug is fixed. Run it and confirm it fails for the reported reason, not an unrelated error.
- **Fix minimally:** Change the least code that makes the test pass. Do not adjust the test to fit the fix; adjust the fix to satisfy the test.
- **Verify honestly:** Run the new test, the surrounding suite, and the typecheck, and report the actual output. If unrelated tests fail, name them instead of claiming a clean pass.
- **Leave a trace:** Mention the regression test you added in your final message, so the fix's coverage stays visible.`,
  },
}

/** True when the value names a known template. */
export function isTemplateId(value: string | undefined): value is TemplateId {
  return (
    typeof value === 'string' &&
    (TEMPLATE_IDS as readonly string[]).includes(value)
  )
}

/**
 * The appendix section for a template id.
 *
 * Throws on an unknown id rather than falling back: a template is an explicit
 * opt-in, and a typo silently running the default would be indistinguishable
 * from the template working. Callers that must not crash (e.g. an advisory
 * override in a host) should check `isTemplateId` first.
 */
export function getTemplateAppendix(templateId: string): string {
  if (!isTemplateId(templateId)) {
    throw new Error(
      `Unknown safety template '${templateId}'. Valid templates: ${TEMPLATE_IDS.join(', ')}.`,
    )
  }
  return SAFETY_TEMPLATES[templateId].appendix
}
