export type AppPluginCategory = 'serious' | 'fun';

export interface AppPluginManifest {
  pluginId: string;
  name: string;
  version: string;
  category: AppPluginCategory;
  description: string;
  defaultEnabled: boolean;
  surfaces: string[];
}
