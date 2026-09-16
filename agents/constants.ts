export const publisher = 'codebuff'

/**
 * How a suggested followup should be phrased, shared by every agent that ends
 * its turn with suggest_followups.
 *
 * Says nothing about *when* to call the tool — that is each agent's own
 * workflow — only about the shape of the prompt it passes. The style rules and
 * their examples were duplicated per agent and drifted apart immediately: one
 * copy grew an exemplar ("Split this file up") that contradicted the
 * self-containment rule the other copy stated, and fixing one copy left the
 * other wrong. The tool description in
 * common/src/tools/params/tool/suggest-followups.ts carries the full version;
 * this is the short restatement agents put in front of the model.
 */
export const FOLLOWUP_STYLE_GUIDANCE =
  'Keep each one short and goal-oriented: name the outcome, not the steps to reach it, so whoever picks it up is free to choose the approach. Each suggestion is clicked out of context, so name its target.'

/**
 * How to find and install community skills, shared by every agent offering the
 * `skill` tool. Purely mechanical — the commands and the "not vetted, so
 * confirm first" rule — so there is nothing here for a harness to specialize.
 */
export const SKILL_DISCOVERY_GUIDANCE =
  "- **Discover and install skills:** Skills are reusable, self-contained instructions for accomplishing a task. Beyond the skills already listed for the `skill` tool, you can find and install community skills from the command line: `npx skills find <query>` to search, `npx skills add <owner/repo> --list` to preview a repo's skills, and `npx skills add <owner/repo> --skill <name> --yes` to install one into `.agents/skills/`. After installing, load it by name with the `skill` tool. These community skills are not vetted, so confirm with the user which skill(s) to install before running `npx skills add`."

/**
 * When to reach for gravity_index, shared by every agent that offers it.
 *
 * `deeperResearch` is the one clause that legitimately differs by harness:
 * base2 sends the user's question on to the researcher subagents, and base3
 * has no subagents to send it to — it carries web_search and read_url itself.
 * Parameterized rather than copied so the other ~90%, which is the same
 * judgement call in both, cannot drift the way the followup style rules did.
 */
export const gravityIndexGuidance = (deeperResearch = '') =>
  `- **Research services before recommending them:** Whenever the user needs to choose or integrate a third-party developer service (database, auth, payments, hosting, email, cache, monitoring, analytics, AI, storage, CMS, search, etc.), use the gravity_index tool to discover, compare, and get install guidance for options${deeperResearch}. Don't recommend or integrate a service from memory alone.`

/**
 * When to act directly vs. ask or verify (ticket B2).
 *
 * The base3 harness is single-loop: no subagents to delegate to, so
 * "routing" means prompt guidance plus which tools are present. Each rule
 * states trigger, action, and fallback, so error handling is deterministic
 * rather than improvised by the model.
 *
 * Parameterized like `gravityIndexGuidance`: the eval harness drops the
 * human tools (`noAskUser`), so the ask variant must name no absent tool.
 * Static prose otherwise, so it survives stringification exactly as written.
 */
export const toolRoutingGuidance = (includeAskUser = true) =>
  `# Tool routing

- **Decide vs ask:** Trigger: more than one reasonable option. Action: ${includeAskUser ? 'if reversible and small, decide and state the assumption in one line; if irreversible or ambiguous, gather context first, then ask with ask_user.' : 'decide directly and state the assumption in one line; no input can arrive, so never wait for one.'} Fallback: ${includeAskUser ? 'if asking fails or no answer arrives, take the smallest reversible option, state it, and proceed.' : 'if blocked, take the smallest reversible option, state it, and proceed.'}
- **Verify vs report:** Trigger: files changed or commands run. Action: run typecheck and relevant tests with run_terminal_command and report actual output. Fallback: if checks cannot run, name what is unverified and what would prove it; never claim a pass not seen.
- **Explore vs assume:** Trigger: a project fact is needed. Action: locate it with code_search, glob, or read_files before editing. Fallback: if nothing is found, say so, proceed on a stated assumption, and name it in one line.`

/**
 * The Opus-tier model shared by DEFAULT and MAX mode and every subagent they
 * spawn. Agent ids like `code-reviewer-opus` name the tier, not the generation,
 * so the generation lives here: bumping it is one edit instead of a dozen.
 *
 * Keeping these in sync by hand did not work — the 4.7 bump left stragglers
 * behind and the docs drifted two generations out of date.
 */
export const OPUS_MODEL = 'anthropic/claude-opus-5'

/**
 * The model behind Codebuff's paid LITE mode, shared by the orchestrator and
 * the reviewer it spawns. Lite trades some capability for speed and a far lower
 * per-token cost, so it runs a cheap frontier model instead of the Opus tier.
 *
 * This is not a Freebuff free-tier model: it costs real money, so it must stay
 * out of FREE_MODE_AGENT_MODELS.
 */
export const LITE_MODEL = 'openai/gpt-5.6-luna'
