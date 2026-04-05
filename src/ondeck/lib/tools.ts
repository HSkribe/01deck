import type { AgentModel, ToolName } from '../types';

export const TOOL_LABELS: Record<ToolName, string> = {
  calculator: 'Calculator',
  echo: 'Echo',
  mock_api: 'Mock API',
};

function runCalculator(input: string): string {
  const expression = input.trim();
  if (!/^[0-9+\-*/().\s%]+$/.test(expression)) {
    throw new Error('Calculator only accepts numbers, spaces, and basic operators.');
  }

  // The expression is validated above so this stays within bounded arithmetic.
  const value = Function(`"use strict"; return (${expression});`)();
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error('Calculator could not produce a numeric result.');
  }
  return String(value);
}

export async function executeTool(agent: AgentModel, toolName: ToolName, input: string): Promise<string> {
  if (!agent.allowed_tools.includes(toolName)) {
    throw new Error(`${agent.name} is not allowed to use ${toolName}.`);
  }

  switch (toolName) {
    case 'calculator':
      return runCalculator(input);
    case 'echo':
      return input;
    case 'mock_api':
      return JSON.stringify(
        {
          ok: true,
          source: 'mock_api',
          received: input,
          agent: agent.name,
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      );
    default:
      throw new Error('Unknown tool requested.');
  }
}
