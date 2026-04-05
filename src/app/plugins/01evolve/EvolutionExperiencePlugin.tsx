import React from 'react';
import { EvolutionLab } from '../../components/EvolutionLab';
import { useApp } from '../../context/AppContext';
import { evolutionExperiencePluginManifest } from './manifest';

export function EvolutionExperiencePlugin() {
  const { isPluginEnabled } = useApp();

  if (!isPluginEnabled(evolutionExperiencePluginManifest.pluginId)) {
    return null;
  }

  return <EvolutionLab />;
}
