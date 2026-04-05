import { AppPluginManifest } from './pluginTypes';

export const agentOptimizationPluginManifest: AppPluginManifest = {
  pluginId: '01foundry-agent-optimization',
  name: '01FOUNDRY',
  version: '1.0.0',
  category: 'serious',
  description: 'Serious customer-support agent optimization surfaces for baseline management, evaluation, generation runs, lineage, and benchmark reporting.',
  defaultEnabled: true,
  surfaces: ['workspace', 'reporting', 'benchmarking'],
};
