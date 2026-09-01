import { AppPluginManifest } from '../pluginTypes';

export const maestroPluginManifest: AppPluginManifest = {
  pluginId: '01maestro',
  name: '01Maestro',
  version: '1.0.0',
  category: 'fun',
  description: 'AI music band — assign agents to roles (Producer, Drums, Keys, Bass, Synth, Vocals) and jam in real-time.',
  defaultEnabled: false,
  surfaces: ['topbar', 'panel', 'agent-bar'],
};
