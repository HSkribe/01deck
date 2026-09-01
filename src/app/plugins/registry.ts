import { agentOptimizationPluginManifest } from './agentOptimizationManifest';
import { evolutionExperiencePluginManifest } from './01evolve/manifest';
import { maestroPluginManifest } from './01maestro/manifest';
import { AppPluginManifest } from './pluginTypes';

export const appPluginCatalog: AppPluginManifest[] = [
  agentOptimizationPluginManifest,
  evolutionExperiencePluginManifest,
  maestroPluginManifest,
];

export const appPluginDefaults: Record<string, boolean> = Object.fromEntries(
  appPluginCatalog.map(plugin => [plugin.pluginId, plugin.defaultEnabled]),
);
