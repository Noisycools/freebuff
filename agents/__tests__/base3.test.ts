import {
  FREEBUFF_CLI_BASE3_AGENT_ID_BY_MODEL,
  FREEBUFF_ROOT_SYSTEM_PROMPT_OPENINGS,
  hasFreebuffRootSystemPromptOpening,
} from '@codebuff/common/constants/free-agents'
import { compactionPolicyForModel } from '@codebuff/common/constants/compaction-policy'
import { SUPPORTED_FREEBUFF_MODELS } from '@codebuff/common/constants/freebuff-models'
import { describe, test, expect } from 'bun:test'

import base3, { createBase3, createBase3CliRoot } from '../base3'
import base3Evals from '../base3-evals'
import base3FreeDeepseek from '../base3-free-deepseek'
import base3FreeDeepseekFlash from '../base3-free-deepseek-flash'
import base3FreeDeepseekFlashEvals from '../base3-free-deepseek-flash-evals'
import base3FreeFable from '../base3-free-fable'
import base3FreeGlm from '../base3-free-glm'
import base3FreeGlmV53Flash from '../base3-free-glm-5-3-flash'
import base3FreeLuna from '../base3-free-luna'
import base3FreeMimo from '../base3-free-mimo'
import base3FreeMinimaxM3 from '../base3-free-minimax-m3'
import base3FreeMuseSpark from '../base3-free-muse-spark'
import base3FreeMuseSpark13 from '../base3-free-muse-spark-1-3'
import base3FreeOxAlpha from '../base3-free-ox-alpha'
import base3FreeGemini38Flash from '../base3-free-gemini-3-8-flash'
import base3FreeSolarPro4 from '../base3-free-solar-pro4'
import base3Lite from '../base3-lite'
import {
  PERSONA_IDS,
  PERSONAS,
  getPersonaAppendix,
  isPersonaId,
} from '../personas'
import {
  TEMPLATE_IDS,
  SAFETY_TEMPLATES,
  getTemplateAppendix,
  isTemplateId,
} from '../templates'

/**
 * The CLI's base3 roots.
 *
 * `CLI_HARNESS` routes DEFAULT, LITE, and Freebuff turns here. These definitions
 * ship compiled into the CLI binary, so a regression requires a new release to
 * repair rather than a server-side kill switch (see
 * docs/freebuff-base3-harness.md).
 *
 * What makes base3 cheaper rides on the DEFINITION, not the call site — the
 * runtime reads `windowedFileReads` and `compactContext` straight off the agent
 * template. A root that loses one keeps working and quietly costs base2 money
 * again. The Web bundle has the same assertions for its own roots
 * (freebuff_bundled_agents.test.ts); these are the CLI's, which ship compiled
 * into the binary instead.
 */
const CLI_ROOTS = [
  base3,
  base3Lite,
  base3Evals,
  // The benchmark's own arm. If it lost a lever, the next run would compare
  // base3-minus-that-lever against base2 and report it as base3's score.
  base3FreeDeepseekFlashEvals,
  base3FreeDeepseek,
  base3FreeDeepseekFlash,
  base3FreeMinimaxM3,
  base3FreeMimo,
  base3FreeGlm,
  base3FreeGlmV53Flash,
  base3FreeLuna,
  base3FreeFable,
  base3FreeOxAlpha,
  base3FreeSolarPro4,
  base3FreeGemini38Flash,
  base3FreeMuseSpark,
  base3FreeMuseSpark13,
]

describe('base3 CLI roots', () => {
  test('keeps the efficiency flags the runtime reads', () => {
    // 17 since Muse Spark 1.2 was restored beside the withdrawn 1.3 root (the
    // paused id stays a recognised pick for binaries already shipped). The
    // count is asserted so a root added without the flags below cannot slip in
    // unnoticed.
    expect(CLI_ROOTS.length).toBe(17)
    for (const agent of CLI_ROOTS) {
      // Windowed reads + the 100-entry glob cap + search-first tool wording.
      expect(agent.windowedFileReads).toBe(true)
      // Mechanical compaction in-process, instead of spawning context-pruner —
      // with the idle trigger sized per model: an hour for most, so a coffee
      // break never rewrites the history, and 15 minutes for DeepSeek Flash,
      // whose Luminal lane forgets the prefix by then anyway (see base3.ts).
      expect(agent.compactContext).toEqual(
        compactionPolicyForModel(agent.model),
      )
      // Single loop: no subagents at all, which is what the harness IS.
      expect(agent.spawnableAgents ?? []).toEqual([])
      expect(agent.toolNames ?? []).not.toContain('spawn_agents')
      // No per-turn instructions prompt: re-injecting one after every user
      // message breaks the prompt cache the harness is built to keep warm.
      expect(agent.instructionsPrompt).toBeUndefined()
    }
  })

  test('DeepSeek Flash roots get 15 minutes / 40k, the rest the hour / 140k', () => {
    // Literal values, so a refactor of the policy table cannot move both
    // sides of the loop above at once (common/src/constants/compaction-policy.ts).
    expect(base3FreeDeepseekFlash.compactContext).toEqual({
      cacheExpiryMs: 15 * 60 * 1000,
      cacheExpiryMinTokens: 40_000,
    })
    expect(base3FreeDeepseek.compactContext).toEqual({
      cacheExpiryMs: 60 * 60 * 1000,
      cacheExpiryMinTokens: 140_000,
    })
  })

  test('declares no reasoning, leaving the catalog the single authority', () => {
    // An agent-declared reasoning reaches the wire as `body.reasoning`, which
    // makes the agent the authority on effort and leaves
    // applyFreebuffReasoningDefaults unable to tell a model default apart from
    // a user's pick — so the effort control silently does nothing on exactly
    // the models people most want to tune. The Web roots make this structural
    // by having no such parameter; the CLI roots spread object literals, so
    // this test is what stops the next one reintroducing it.
    for (const agent of CLI_ROOTS) {
      expect(agent.reasoningOptions).toBeUndefined()
    }
  })

  test('opens with a prompt the free-mode gate accepts', () => {
    // The appendix is appended, never prepended: the chat-completions gate
    // requires a canonical opening at byte 0, so prepending 403s every turn.
    for (const agent of CLI_ROOTS) {
      expect(hasFreebuffRootSystemPromptOpening(agent.systemPrompt!)).toBe(true)
      expect(
        agent.systemPrompt!.match(/\{CODEBUFF_GIT_CHANGES_PROMPT\}/g),
      ).toHaveLength(1)
    }
  })

  test('every Freebuff root is pinned to the model its id is registered under', () => {
    const byId = new Map(CLI_ROOTS.map((a) => [a.id, a]))
    for (const [model, agentId] of Object.entries(
      FREEBUFF_CLI_BASE3_AGENT_ID_BY_MODEL,
    )) {
      // A root whose model disagrees with the allowlist 403s with
      // free_mode_invalid_agent_model on every request.
      expect(byId.get(agentId)?.model).toBe(model)
    }
  })

  test('ships a root for every model the picker offers', () => {
    for (const model of SUPPORTED_FREEBUFF_MODELS) {
      const agentId = FREEBUFF_CLI_BASE3_AGENT_ID_BY_MODEL[model.id]
      expect(agentId).toBeDefined()
      expect(CLI_ROOTS.some((a) => a.id === agentId)).toBe(true)
    }
  })

  test('leaves the bare harness alone, so Desktop does not inherit CLI tools', () => {
    // freebuff-desktop builds THREAD_AGENT_TOOLS by unioning
    // createBase3().toolNames with its own extras, so anything added to the
    // base factory lands on every Desktop thread silently.
    expect(createBase3().toolNames).toEqual([
      'read_files',
      'str_replace',
      'write_file',
      'run_terminal_command',
      'code_search',
      'glob',
      'list_directory',
      'write_todos',
    ])
  })

  test('noAskUser drops the human tools from the prompt as well as the toolset', () => {
    // The two have to move together. A prompt telling the model to call
    // ask_user when the tool is absent is a wasted step every eval run.
    const withUser = createBase3CliRoot()
    const withoutUser = createBase3CliRoot({ noAskUser: true })

    expect(withUser.toolNames).toContain('ask_user')
    expect(withUser.toolNames).toContain('suggest_followups')
    expect(withUser.systemPrompt).toContain('ask_user')

    expect(withoutUser.toolNames).not.toContain('ask_user')
    expect(withoutUser.toolNames).not.toContain('suggest_followups')
    expect(withoutUser.systemPrompt).not.toContain('ask_user')
    expect(withoutUser.systemPrompt).not.toContain('suggest_followups')

    // Otherwise identical: the eval variant must stay a like-for-like
    // comparison against base2-evals, not a differently-equipped agent.
    expect(withoutUser.toolNames).toEqual(
      withUser.toolNames!.filter(
        (name) => name !== 'ask_user' && name !== 'suggest_followups',
      ),
    )
  })

  test('brands Freebuff roots as Freebuff, and Codebuff roots as Codebuff', () => {
    expect(base3FreeDeepseek.systemPrompt).toContain('Freebuff')
    expect(base3FreeDeepseek.systemPrompt).not.toContain('/usage')
    // Codebuff's paid modes explain credits; Freebuff has none to explain.
    expect(base3.systemPrompt).toContain('/usage')
  })
})

describe('base3 CLI root personas', () => {
  // The default root is the contract every shipped caller depends on; the
  // persona option must be invisible until someone opts in.
  test('default root is byte-identical to the no-persona call', () => {
    expect(createBase3CliRoot()).toStrictEqual(createBase3CliRoot({}))
    expect(createBase3CliRoot()).toStrictEqual(
      createBase3CliRoot({ persona: undefined }),
    )
    // And it carries no persona section at all.
    expect(createBase3CliRoot().systemPrompt).not.toContain('# Working style')
  })

  test('a persona appends its section inside the appendix, changing nothing else', () => {
    for (const personaId of PERSONA_IDS) {
      const plain = createBase3CliRoot()
      const withPersona = createBase3CliRoot({ persona: personaId })

      expect(withPersona.systemPrompt).toContain(getPersonaAppendix(personaId))
      // Appended AFTER the meta-information section, never position 0.
      expect(
        withPersona.systemPrompt!.indexOf('# Working style'),
      ).toBeGreaterThan(withPersona.systemPrompt!.indexOf('Meta-information'))
      // The rest of the definition is untouched: same literal toolset, same
      // efficiency flags, same model.
      expect(withPersona.toolNames).toEqual(plain.toolNames)
      expect(withPersona.model).toBe(plain.model)
      expect(withPersona.windowedFileReads).toBe(plain.windowedFileReads)
      expect(withPersona.compactContext).toEqual(plain.compactContext)
      expect(withPersona.spawnableAgents ?? []).toEqual([])
      // The gate placeholder still appears exactly once, and the persona
      // section lands before it (the appendix is inside the prompt, the
      // placeholder is the runtime tail).
      expect(
        withPersona.systemPrompt!.match(/\{CODEBUFF_SYSTEM_INFO_PROMPT\}/g),
      ).toHaveLength(1)
      expect(
        withPersona.systemPrompt!.endsWith('{CODEBUFF_SYSTEM_INFO_PROMPT}\n'),
      ).toBe(true)
    }
  })

  test('every persona keeps the opening the free-mode gate accepts', () => {
    for (const personaId of PERSONA_IDS) {
      for (const isFreebuff of [false, true]) {
        const root = createBase3CliRoot({ persona: personaId, isFreebuff })
        expect(hasFreebuffRootSystemPromptOpening(root.systemPrompt!)).toBe(
          true,
        )
      }
    }
  })

  test('persona composes with noAskUser without re-adding human tools', () => {
    const withoutUser = createBase3CliRoot({ noAskUser: true })
    const both = createBase3CliRoot({
      noAskUser: true,
      persona: 'fast-implementer',
    })
    expect(both.toolNames).toEqual(withoutUser.toolNames)
    expect(both.toolNames).not.toContain('ask_user')
    expect(both.toolNames).not.toContain('suggest_followups')
  })

  test('persona data is self-contained appendix text', () => {
    for (const personaId of PERSONA_IDS) {
      const { appendix, label, description } = PERSONAS[personaId]
      // Static prose: no runtime placeholders, so it survives stringification
      // exactly as written.
      expect(appendix).not.toContain('{CODEBUFF_')
      // It must not read as a system-prompt opening: personas are appended,
      // never position 0, and none of the canonical openings may appear inside
      // one (see FREEBUFF_ROOT_SYSTEM_PROMPT_OPENINGS usage in the gate).
      for (const opening of FREEBUFF_ROOT_SYSTEM_PROMPT_OPENINGS) {
        expect(appendix).not.toContain(opening)
      }
      expect(appendix.startsWith('# Working style:')).toBe(true)
      expect(appendix).toContain(label.toLowerCase())
      expect(description.length).toBeGreaterThan(0)
      // Small enough that it can ride on every turn.
      expect(appendix.split(/\s+/).length).toBeLessThan(300)
    }
  })

  test('unknown persona ids throw at the factory and the helper', () => {
    // A persona is an explicit opt-in: silently running the default would make
    // a typo indistinguishable from the persona working.
    expect(() => createBase3CliRoot({ persona: 'no-such-persona' })).toThrow(
      /Unknown persona 'no-such-persona'/,
    )
    expect(() => getPersonaAppendix('no-such-persona')).toThrow(
      /Valid personas: conservative-reviewer, fast-implementer/,
    )
    expect(isPersonaId('conservative-reviewer')).toBe(true)
    expect(isPersonaId('no-such-persona')).toBe(false)
    expect(isPersonaId(undefined)).toBe(false)
  })
})

describe('base3 tool-routing guidance (B2)', () => {
  // Routing = prompt guidance + which tools are present (single-loop harness
  // has no subagents to delegate to). Each rule states trigger, action, and
  // fallback, so error handling is deterministic, never improvised.
  const routingSection = (prompt: string) =>
    prompt.split('# Tool routing')[1]!.split('Meta-information')[0]!

  test('default root carries trigger-action-fallback routing rules', () => {
    const prompt = createBase3CliRoot().systemPrompt!
    expect(prompt).toContain('# Tool routing')
    expect(prompt).toContain('Decide vs ask')
    expect(prompt).toContain('Verify vs report')
    // One explicit fallback per rule: three rules, three fallbacks.
    expect(routingSection(prompt).match(/Fallback:/g)).toHaveLength(3)
  })

  test('noAskUser keeps routing rules but drops the human tools', () => {
    const prompt = createBase3CliRoot({ noAskUser: true }).systemPrompt!
    expect(prompt).toContain('# Tool routing')
    expect(prompt).toContain('Verify vs report')
    expect(routingSection(prompt).match(/Fallback:/g)).toHaveLength(3)
    expect(prompt).not.toContain('ask_user')
    expect(prompt).not.toContain('suggest_followups')
  })

  test('routing guidance is self-contained appendix text', async () => {
    // Assert on the constant directly: slicing the prompt would also catch
    // the gravity and skill guidance that follow it in the appendix.
    const { toolRoutingGuidance } = await import('../constants')
    for (const includeAskUser of [true, false]) {
      const section = toolRoutingGuidance(includeAskUser)
      // Static prose: no runtime placeholders, so it survives stringification
      // exactly as written.
      expect(section).not.toContain('{CODEBUFF_')
      // No system-prompt opening inside the appendix text.
      for (const opening of FREEBUFF_ROOT_SYSTEM_PROMPT_OPENINGS) {
        expect(section).not.toContain(opening)
      }
      // Only tools the root offers may be named: no subagent-spawning advice
      // on a single-loop root.
      for (const name of [
        'spawn_agents',
        'set_output',
        'thinker',
        'subagent',
      ]) {
        expect(section).not.toContain(name)
      }
      // Small enough to ride on every turn.
      expect(section.split(/\s+/).length).toBeLessThan(200)
      // The prompt carries the matching variant.
      const prompt = createBase3CliRoot({
        noAskUser: !includeAskUser,
      }).systemPrompt!
      expect(prompt).toContain(section)
    }
  })

  test('routing guidance composes with personas without moving the opening', () => {
    for (const personaId of PERSONA_IDS) {
      const prompt = createBase3CliRoot({ persona: personaId }).systemPrompt!
      expect(prompt).toContain('# Tool routing')
      expect(hasFreebuffRootSystemPromptOpening(prompt)).toBe(true)
    }
  })
})

describe('base3 CLI root safety templates (B3)', () => {
  // Same contract as the persona option: the default root is what every
  // shipped caller depends on, so a template must be invisible until opted in.
  test('default root is byte-identical to the no-template call', () => {
    expect(createBase3CliRoot()).toStrictEqual(createBase3CliRoot({}))
    expect(createBase3CliRoot()).toStrictEqual(
      createBase3CliRoot({ safetyTemplate: undefined }),
    )
    // And it carries no template section at all — additive-only means the
    // three templates ship present in source, absent from the default prompt.
    expect(createBase3CliRoot().systemPrompt).not.toContain('# Safety template')
  })

  test('a template appends its section inside the appendix, changing nothing else', () => {
    for (const templateId of TEMPLATE_IDS) {
      const plain = createBase3CliRoot()
      const withTemplate = createBase3CliRoot({ safetyTemplate: templateId })

      expect(withTemplate.systemPrompt).toContain(
        getTemplateAppendix(templateId),
      )
      // Appended AFTER the meta-information section (and after any persona
      // section), never position 0.
      expect(
        withTemplate.systemPrompt!.indexOf('# Safety template'),
      ).toBeGreaterThan(
        withTemplate.systemPrompt!.indexOf('Meta-information'),
      )
      // The rest of the definition is untouched: same literal toolset, same
      // efficiency flags, same model.
      expect(withTemplate.toolNames).toEqual(plain.toolNames)
      expect(withTemplate.model).toBe(plain.model)
      expect(withTemplate.windowedFileReads).toBe(plain.windowedFileReads)
      expect(withTemplate.compactContext).toEqual(plain.compactContext)
      expect(withTemplate.spawnableAgents ?? []).toEqual([])
      expect(withTemplate.instructionsPrompt).toBeUndefined()
      // The gate placeholder still appears exactly once, and the template
      // section lands before it (the appendix is inside the prompt, the
      // placeholder is the runtime tail).
      expect(
        withTemplate.systemPrompt!.match(/\{CODEBUFF_SYSTEM_INFO_PROMPT\}/g),
      ).toHaveLength(1)
      expect(
        withTemplate.systemPrompt!.endsWith('{CODEBUFF_SYSTEM_INFO_PROMPT}\n'),
      ).toBe(true)
    }
  })

  test('every template keeps the opening the free-mode gate accepts', () => {
    for (const templateId of TEMPLATE_IDS) {
      for (const isFreebuff of [false, true]) {
        const root = createBase3CliRoot({
          safetyTemplate: templateId,
          isFreebuff,
        })
        expect(hasFreebuffRootSystemPromptOpening(root.systemPrompt!)).toBe(
          true,
        )
      }
    }
  })

  test('template composes with persona and noAskUser without re-adding human tools', () => {
    const withoutUser = createBase3CliRoot({ noAskUser: true })
    const both = createBase3CliRoot({
      noAskUser: true,
      persona: 'conservative-reviewer',
      safetyTemplate: 'test-first-fix',
    })
    expect(both.toolNames).toEqual(withoutUser.toolNames)
    expect(both.toolNames).not.toContain('ask_user')
    expect(both.toolNames).not.toContain('suggest_followups')
    // Both sections survive composition, in option order: persona first, then
    // template, then the runtime tail.
    expect(both.systemPrompt).toContain(getPersonaAppendix('conservative-reviewer'))
    expect(both.systemPrompt).toContain(getTemplateAppendix('test-first-fix'))
    expect(
      both.systemPrompt!.indexOf('# Working style'),
    ).toBeLessThan(both.systemPrompt!.indexOf('# Safety template'))
    expect(
      both.systemPrompt!.indexOf('# Safety template'),
    ).toBeLessThan(both.systemPrompt!.indexOf('{CODEBUFF_SYSTEM_INFO_PROMPT}'))
  })

  test('template data is self-contained, tool-free appendix text', () => {
    for (const templateId of TEMPLATE_IDS) {
      const { appendix, label, description } = SAFETY_TEMPLATES[templateId]
      // Static prose: no runtime placeholders, so it survives stringification
      // exactly as written.
      expect(appendix).not.toContain('{CODEBUFF_')
      // No system-prompt opening inside the appendix text: templates are
      // appended, never position 0, and keeping the strings distinct stops the
      // opening gate (and its tests) ever matching one.
      for (const opening of FREEBUFF_ROOT_SYSTEM_PROMPT_OPENINGS) {
        expect(appendix).not.toContain(opening)
      }
      // Templates are also knowledge-file material for agents that may not
      // offer base3's tools, so they name no tool at all.
      for (const name of [
        'spawn_agents',
        'set_output',
        'thinker',
        'subagent',
        'ask_user',
        'suggest_followups',
        'web_search',
        'read_url',
        'gravity_index',
        'render_ui',
        'skill',
        'read_files',
        'str_replace',
        'write_file',
        'run_terminal_command',
        'code_search',
        'glob',
        'list_directory',
        'write_todos',
      ]) {
        expect(appendix).not.toContain(name)
      }
      expect(appendix.startsWith('# Safety template:')).toBe(true)
      expect(appendix).toContain(label.toLowerCase())
      expect(description.length).toBeGreaterThan(0)
      // Small enough that it can ride on every turn.
      expect(appendix.split(/\s+/).length).toBeLessThan(300)
    }
  })

  test('unknown template ids throw at the factory and the helper', () => {
    // A template is an explicit opt-in: silently running the default would
    // make a typo indistinguishable from the template working.
    expect(() =>
      createBase3CliRoot({ safetyTemplate: 'no-such-template' }),
    ).toThrow(/Unknown safety template 'no-such-template'/)
    expect(() => getTemplateAppendix('no-such-template')).toThrow(
      /Valid templates: secure-coding, minimal-change, test-first-fix/,
    )
    expect(isTemplateId('secure-coding')).toBe(true)
    expect(isTemplateId('no-such-template')).toBe(false)
    expect(isTemplateId(undefined)).toBe(false)
  })
})
