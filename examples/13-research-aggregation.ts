/**
 * Example 13 — Multi-Source Research Aggregation
 *
 * Demonstrates:
 * - Parallel execution: three analyst agents research the same topic independently
 * - Dependency chain: synthesizer waits for all analysts to finish
 * - Shared memory: analysts write findings, synthesizer reads and cross-references
 *
 * Flow:
 *   [technical-analyst, market-analyst, community-analyst] (parallel) → synthesizer
 *
 * Run:
 *   npx tsx examples/13-research-aggregation.ts
 *
 * Prerequisites:
 *   ANTHROPIC_API_KEY env var must be set.
 */

import { OpenMultiAgent } from '../src/index.js'
import type { AgentConfig, OrchestratorEvent, Task } from '../src/types.js'

// ---------------------------------------------------------------------------
// Topic
// ---------------------------------------------------------------------------

const TOPIC = 'WebAssembly adoption in 2026'

// ---------------------------------------------------------------------------
// Agents — three analysts + one synthesizer
// ---------------------------------------------------------------------------

const technicalAnalyst: AgentConfig = {
  name: 'technical-analyst',
  model: 'claude-sonnet-4-6',
  systemPrompt: `You are a technical analyst. Given a topic, research its technical
capabilities, limitations, performance characteristics, and architectural patterns.
Write your findings as structured markdown. Store your analysis in shared memory
under the key "technical_findings". Keep it to 200-300 words.`,
  maxTurns: 2,
}

const marketAnalyst: AgentConfig = {
  name: 'market-analyst',
  model: 'claude-sonnet-4-6',
  systemPrompt: `You are a market analyst. Given a topic, research industry adoption
rates, key companies using the technology, market size estimates, and competitive
landscape. Write your findings as structured markdown. Store your analysis in
shared memory under the key "market_findings". Keep it to 200-300 words.`,
  maxTurns: 2,
}

const communityAnalyst: AgentConfig = {
  name: 'community-analyst',
  model: 'claude-sonnet-4-6',
  systemPrompt: `You are a developer community analyst. Given a topic, research
developer sentiment, ecosystem maturity, learning resources, community size,
and conference/meetup activity. Write your findings as structured markdown.
Store your analysis in shared memory under the key "community_findings".
Keep it to 200-300 words.`,
  maxTurns: 2,
}

const synthesizer: AgentConfig = {
  name: 'synthesizer',
  model: 'claude-sonnet-4-6',
  systemPrompt: `You are a research director who synthesizes multiple analyst reports
into a single cohesive document. Read all findings from shared memory, then:

1. Cross-reference claims across reports — flag agreements and contradictions
2. Identify the 3 most important insights
3. Produce a structured report with: Executive Summary, Key Findings,
   Areas of Agreement, Open Questions, and Recommendation

Keep the final report to 300-400 words.`,
  maxTurns: 2,
}

// ---------------------------------------------------------------------------
// Orchestrator + team
// ---------------------------------------------------------------------------

function handleProgress(event: OrchestratorEvent): void {
  if (event.type === 'task:start') {
    console.log(`  [START] ${event.taskTitle} → ${event.agentName}`)
  }
  if (event.type === 'task:complete') {
    console.log(`  [DONE]  ${event.taskTitle} (${event.success ? 'OK' : 'FAIL'})`)
  }
}

const orchestrator = new OpenMultiAgent({
  defaultModel: 'claude-sonnet-4-6',
  onProgress: handleProgress,
})

const team = orchestrator.createTeam('research-team', {
  name: 'research-team',
  agents: [technicalAnalyst, marketAnalyst, communityAnalyst, synthesizer],
  sharedMemory: true,
})

// ---------------------------------------------------------------------------
// Tasks — three analysts run in parallel, synthesizer depends on all three
// ---------------------------------------------------------------------------

const tasks: Task[] = [
  {
    title: 'Technical analysis',
    description: `Research the technical aspects of ${TOPIC}. Focus on capabilities, limitations, performance, and architecture. Store findings in shared memory as "technical_findings".`,
    assignee: 'technical-analyst',
  },
  {
    title: 'Market analysis',
    description: `Research the market landscape for ${TOPIC}. Focus on adoption rates, key players, market size, and competition. Store findings in shared memory as "market_findings".`,
    assignee: 'market-analyst',
  },
  {
    title: 'Community analysis',
    description: `Research the developer community around ${TOPIC}. Focus on sentiment, ecosystem maturity, learning resources, and community activity. Store findings in shared memory as "community_findings".`,
    assignee: 'community-analyst',
  },
  {
    title: 'Synthesize report',
    description: `Read all analyst findings from shared memory (technical_findings, market_findings, community_findings). Cross-reference claims, identify key insights, flag contradictions, and produce a unified research report.`,
    assignee: 'synthesizer',
    dependsOn: ['Technical analysis', 'Market analysis', 'Community analysis'],
  },
]

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

console.log('Multi-Source Research Aggregation')
console.log('='.repeat(60))
console.log(`Topic: ${TOPIC}`)
console.log('Pipeline: 3 analysts (parallel) → synthesizer')
console.log('='.repeat(60))
console.log()

const result = await orchestrator.runTasks(team, tasks)

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

console.log('\n' + '='.repeat(60))
console.log(`Overall success: ${result.success}`)
console.log(`Tokens — input: ${result.totalTokenUsage.input_tokens}, output: ${result.totalTokenUsage.output_tokens}`)
console.log()

for (const [name, r] of result.agentResults) {
  const icon = r.success ? 'OK  ' : 'FAIL'
  const tokens = `in:${r.tokenUsage.input_tokens} out:${r.tokenUsage.output_tokens}`
  console.log(`  [${icon}] ${name.padEnd(20)} ${tokens}`)
}

const synthResult = result.agentResults.get('synthesizer')
if (synthResult?.success) {
  console.log('\n' + '='.repeat(60))
  console.log('SYNTHESIZED REPORT')
  console.log('='.repeat(60))
  console.log()
  console.log(synthResult.output)
}

console.log('\nDone.')
