import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Game, LearnTest, Course, HowTo, CreateContentType, ArcadeCategory } from '../data/hubData';

export type HubView = 'home' | 'arcade' | 'learn' | 'create' | 'library' | 'profile' | 'forum' | 'chat' | 'messages';
export type LearnTab = 'tests' | 'class' | 'how-to';
export type LibraryTab = 'in-progress' | 'saved' | 'completed' | 'drafts';

export type CreateStep =
  | 'type-select'
  | 'template-select'
  | 'details'
  | 'build'
  | 'preview'
  | 'publish';

interface CreateDraft {
  type: CreateContentType | null;
  templateId: string | null;
  title: string;
  topic: string;
  audience: string;
  duration: string;
  difficulty: string;
  description: string;
}

interface HubContextType {
  currentView: HubView;
  setCurrentView: (v: HubView) => void;

  // Arcade
  arcadeCategory: ArcadeCategory | null;
  setArcadeCategory: (c: ArcadeCategory | null) => void;
  selectedGame: Game | null;
  setSelectedGame: (g: Game | null) => void;

  // Learn
  learnTab: LearnTab;
  setLearnTab: (t: LearnTab) => void;
  selectedTest: LearnTest | null;
  setSelectedTest: (t: LearnTest | null) => void;
  selectedCourse: Course | null;
  setSelectedCourse: (c: Course | null) => void;
  selectedHowTo: HowTo | null;
  setSelectedHowTo: (h: HowTo | null) => void;

  // Library
  libraryTab: LibraryTab;
  setLibraryTab: (t: LibraryTab) => void;

  // Create
  createStep: CreateStep;
  setCreateStep: (s: CreateStep) => void;
  createDraft: CreateDraft;
  updateCreateDraft: (patch: Partial<CreateDraft>) => void;
  resetCreate: () => void;

  // Global search
  hubSearch: string;
  setHubSearch: (q: string) => void;
}

const defaultDraft: CreateDraft = {
  type: null,
  templateId: null,
  title: '',
  topic: '',
  audience: '',
  duration: '',
  difficulty: 'easy',
  description: '',
};

const HubContext = createContext<HubContextType | null>(null);

export function HubProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<HubView>('home');
  const [arcadeCategory, setArcadeCategory] = useState<ArcadeCategory | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [learnTab, setLearnTab] = useState<LearnTab>('tests');
  const [selectedTest, setSelectedTest] = useState<LearnTest | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedHowTo, setSelectedHowTo] = useState<HowTo | null>(null);
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('in-progress');
  const [createStep, setCreateStep] = useState<CreateStep>('type-select');
  const [createDraft, setCreateDraft] = useState<CreateDraft>(defaultDraft);
  const [hubSearch, setHubSearch] = useState('');

  const updateCreateDraft = useCallback((patch: Partial<CreateDraft>) => {
    setCreateDraft(prev => ({ ...prev, ...patch }));
  }, []);

  const resetCreate = useCallback(() => {
    setCreateDraft(defaultDraft);
    setCreateStep('type-select');
  }, []);

  return (
    <HubContext.Provider value={{
      currentView, setCurrentView,
      arcadeCategory, setArcadeCategory,
      selectedGame, setSelectedGame,
      learnTab, setLearnTab,
      selectedTest, setSelectedTest,
      selectedCourse, setSelectedCourse,
      selectedHowTo, setSelectedHowTo,
      libraryTab, setLibraryTab,
      createStep, setCreateStep,
      createDraft, updateCreateDraft, resetCreate,
      hubSearch, setHubSearch,
    }}>
      {children}
    </HubContext.Provider>
  );
}

export function useHub() {
  const ctx = useContext(HubContext);
  if (!ctx) throw new Error('useHub must be used inside HubProvider');
  return ctx;
}
