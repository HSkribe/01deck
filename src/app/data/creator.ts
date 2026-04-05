export type CreatorTypeId = 'game' | 'test' | 'class' | 'how-to';

export interface CreatorTemplate {
  id: string;
  type: CreatorTypeId;
  title: string;
  summary: string;
  steps: string[];
  deliverable: string;
}

export const creatorTemplates: CreatorTemplate[] = [
  {
    id: 'game-template',
    type: 'game',
    title: 'Create a Game',
    summary: 'Design mechanics, prompts, win states, and agent roles for a replayable experience.',
    steps: ['Choose format', 'Define core loop', 'Add prompts or rules', 'Set rewards and difficulty', 'Preview and publish'],
    deliverable: 'Playable game listing with rules, metadata, and agent mode',
  },
  {
    id: 'test-template',
    type: 'test',
    title: 'Create a Test',
    summary: 'Build assessments with question banks, scoring logic, outcomes, and retake settings.',
    steps: ['Choose assessment style', 'Author question bank', 'Define scoring logic', 'Write result interpretation', 'Publish'],
    deliverable: 'Assessment flow with results and follow-up recommendations',
  },
  {
    id: 'class-template',
    type: 'class',
    title: 'Create a Class',
    summary: 'Compose modules, learning objectives, checkpoints, and practice loops into a track.',
    steps: ['Define audience', 'Outline modules', 'Add lesson blocks', 'Attach practice moments', 'Preview and ship'],
    deliverable: 'Structured learning class with modules and progress states',
  },
  {
    id: 'how-to-template',
    type: 'how-to',
    title: 'Create a How-To',
    summary: 'Publish fast, practical guides with steps, assets, linked media, and checklists.',
    steps: ['Choose guide type', 'Write task steps', 'Add assets or links', 'Set completion checklist', 'Publish'],
    deliverable: 'Actionable guide with media references and completion checklist',
  },
];
