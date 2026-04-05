import type { Agent } from '../../data/agents';

function pick<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length];
}

function hash(value: string): number {
  let result = 0;
  for (let i = 0; i < value.length; i += 1) {
    result = (result * 31 + value.charCodeAt(i)) | 0;
  }
  return result;
}

export function describeAgentVoice(agent: Agent | null | undefined) {
  if (!agent) {
    return {
      title: 'House Host',
      tone: 'clean and neutral',
      framing: 'straightforward quizmaster copy',
      intro: 'The house system is running this session with a clean, neutral style.',
    };
  }

  const seed = hash(`${agent.id}:${agent.role}:${agent.specialization}`);
  const categoryTone: Record<string, string[]> = {
    research: ['analytical', 'evidence-led', 'signal-hunting'],
    code: ['logical', 'systems-minded', 'precise'],
    creative: ['dramatic', 'evocative', 'narrative-rich'],
    strategy: ['competitive', 'structured', 'decision-focused'],
    finance: ['measured', 'risk-aware', 'high-stakes'],
    comms: ['conversational', 'persuasive', 'socially tuned'],
    data: ['pattern-driven', 'metric-aware', 'rational'],
  };
  const tone = pick(categoryTone[agent.category] ?? ['adaptable', 'focused', 'confident'], seed);
  const framing = agent.goal
    ? `guided by the goal "${agent.goal}"`
    : `shaped by ${agent.specialization.toLowerCase()}`;

  return {
    title: `${agent.name} · ${agent.role}`,
    tone,
    framing,
    intro: `${agent.name} runs this session in a ${tone} voice, ${framing}.`,
  };
}

export function remixQuestion(agent: Agent | null | undefined, baseQuestion: string, answer: string) {
  if (!agent) return baseQuestion;
  const seed = hash(`${agent.id}:${baseQuestion}:${answer}`);

  if (agent.category === 'research') {
    return pick([
      `Signal check: ${baseQuestion}`,
      `Pattern probe: ${baseQuestion}`,
      `Narrowing the evidence field: ${baseQuestion}`,
    ], seed);
  }
  if (agent.category === 'code') {
    return pick([
      `Constraint test: ${baseQuestion}`,
      `Binary branch: ${baseQuestion}`,
      `System query: ${baseQuestion}`,
    ], seed);
  }
  if (agent.category === 'creative') {
    return pick([
      `Let the scene sharpen: ${baseQuestion}`,
      `In the story I am hearing, ${baseQuestion.charAt(0).toLowerCase()}${baseQuestion.slice(1)}`,
      `Mood check: ${baseQuestion}`,
    ], seed);
  }
  if (agent.category === 'strategy') {
    return pick([
      `Decision gate: ${baseQuestion}`,
      `To reduce the option space, ${baseQuestion.charAt(0).toLowerCase()}${baseQuestion.slice(1)}`,
      `Tactical filter: ${baseQuestion}`,
    ], seed);
  }

  return baseQuestion;
}

export function remixHint(agent: Agent | null | undefined, hint: string) {
  if (!agent) return hint;
  const seed = hash(`${agent.id}:${hint}`);

  if (agent.category === 'research') {
    return pick([
      `Observed clue: ${hint}`,
      `Evidence fragment: ${hint}`,
      `Detected signal: ${hint}`,
    ], seed);
  }
  if (agent.category === 'creative') {
    return pick([
      `A more poetic clue: ${hint}`,
      `The image sharpens: ${hint}`,
      `A narrative nudge: ${hint}`,
    ], seed);
  }
  if (agent.category === 'strategy') {
    return pick([
      `Useful leverage point: ${hint}`,
      `Here is the tactical clue: ${hint}`,
      `Decision-support clue: ${hint}`,
    ], seed);
  }

  return hint;
}

export function triviaHostLine(agent: Agent | null | undefined, prompt: string) {
  if (!agent) return prompt;
  const seed = hash(`${agent.id}:${prompt}`);

  if (agent.category === 'research') {
    return pick([
      `Briefing question: ${prompt}`,
      `Knowledge sweep: ${prompt}`,
      `Signal literacy check: ${prompt}`,
    ], seed);
  }
  if (agent.category === 'code') {
    return pick([
      `Runtime quiz: ${prompt}`,
      `Logic pass: ${prompt}`,
      `Stack test: ${prompt}`,
    ], seed);
  }
  if (agent.category === 'creative') {
    return pick([
      `Spotlight round: ${prompt}`,
      `Story-rich challenge: ${prompt}`,
      `Curated prompt: ${prompt}`,
    ], seed);
  }
  if (agent.category === 'strategy') {
    return pick([
      `Boardroom check: ${prompt}`,
      `Decision-maker round: ${prompt}`,
      `Tactical knowledge test: ${prompt}`,
    ], seed);
  }

  return prompt;
}

export function resultVoice(agent: Agent | null | undefined, success: boolean) {
  if (!agent) return success ? 'Correct.' : 'Not quite.';

  if (agent.category === 'research') return success ? `${agent.name}: confirmed.` : `${agent.name}: signal mismatch.`;
  if (agent.category === 'code') return success ? `${agent.name}: condition passed.` : `${agent.name}: branch failed.`;
  if (agent.category === 'creative') return success ? `${agent.name}: beautiful read.` : `${agent.name}: not the ending I expected.`;
  if (agent.category === 'strategy') return success ? `${agent.name}: strong call.` : `${agent.name}: that move did not land.`;

  return success ? `${agent.name}: correct.` : `${agent.name}: not quite.`;
}
