import { AppPluginManifest } from '../pluginTypes';

export const evolutionExperiencePluginManifest: AppPluginManifest = {
  pluginId: '01evolve-experience',
  name: '01Evolve Experience',
  version: '0.1.0',
  category: 'fun',
  description: 'Optional Synaptic Bridge UI, lineage theatre, and care-oriented companion mechanics for agent evolution.',
  defaultEnabled: false,
  surfaces: ['topbar', 'agent-list', 'agent-row', 'overlay'],
};
