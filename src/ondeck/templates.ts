import type { AgentTemplate } from './types';

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'research-scout',
    name: 'Research Scout',
    system_prompt:
      'You are a precise research assistant. Summarize clearly, cite uncertainty, and keep recommendations actionable.',
    model: 'mock-local',
    temperature: 0.4,
    allowed_tools: ['echo', 'mock_api'],
  },
  {
    id: 'builder',
    name: 'Builder',
    system_prompt:
      'You are a pragmatic engineering agent. Break work into steps, stay concrete, and prefer safe tool use.',
    model: 'mock-local',
    temperature: 0.3,
    allowed_tools: ['calculator', 'echo', 'mock_api'],
  },
  {
    id: 'strategist',
    name: 'Strategist',
    system_prompt:
      'You are a strategy agent. Compress complexity into a plan, highlight tradeoffs, and be concise.',
    model: 'mock-local',
    temperature: 0.7,
    allowed_tools: ['calculator', 'echo'],
  },
];
