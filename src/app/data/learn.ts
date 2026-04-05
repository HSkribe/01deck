export type LearnSectionId = 'tests' | 'class' | 'how-to';

export interface LearnItem {
  id: string;
  section: LearnSectionId;
  title: string;
  format: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Varies';
  summary: string;
  outcome: string;
  tags: string[];
}

export const learnSections: Array<{ id: LearnSectionId; label: string; summary: string }> = [
  { id: 'tests', label: 'Tests', summary: 'Assessments, personality tools, and challenge-based evaluations.' },
  { id: 'class', label: 'Class', summary: 'Structured learning paths for professional development and hobbyist growth.' },
  { id: 'how-to', label: 'How-To', summary: 'Practical guides, linked videos, tutorials, and fast reference playbooks.' },
];

export const learnItems: LearnItem[] = [
  {
    id: 'mbti',
    section: 'tests',
    title: 'Myers-Briggs Type Indicator (MBTI)',
    format: 'Personality assessment',
    duration: '10 min',
    difficulty: 'Beginner',
    summary: 'A guided type exploration experience with agent-assisted interpretation.',
    outcome: 'Get a 16-type profile with reflection prompts and suggested growth paths.',
    tags: ['personality', 'reflection', 'popular'],
  },
  {
    id: 'iq-test',
    section: 'tests',
    title: 'IQ Test',
    format: 'Timed cognitive test',
    duration: '20 min',
    difficulty: 'Intermediate',
    summary: 'Pattern recognition, logic, and verbal reasoning challenges in a clean test flow.',
    outcome: 'Receive a performance breakdown with next-practice recommendations.',
    tags: ['logic', 'timed', 'cognitive'],
  },
  {
    id: 'big-five',
    section: 'tests',
    title: 'Big Five Personality Test',
    format: 'Trait spectrum assessment',
    duration: '12 min',
    difficulty: 'Beginner',
    summary: 'Measure openness, conscientiousness, extraversion, agreeableness, and neuroticism.',
    outcome: 'Understand your trait balance and where it shows up in collaboration.',
    tags: ['traits', 'personality', 'self-awareness'],
  },
  {
    id: 'eq-test',
    section: 'tests',
    title: 'Emotional Intelligence (EQ) Test',
    format: 'Scenario-based assessment',
    duration: '15 min',
    difficulty: 'Intermediate',
    summary: 'Review how you read, regulate, and respond to emotional situations.',
    outcome: 'Get an EQ snapshot with coaching-style improvement suggestions.',
    tags: ['emotional intelligence', 'leadership', 'communication'],
  },
  {
    id: 'disc',
    section: 'tests',
    title: 'DISC Personality Test',
    format: 'Behavior style assessment',
    duration: '8 min',
    difficulty: 'Beginner',
    summary: 'Identify your dominant style across dominance, influence, steadiness, and conscientiousness.',
    outcome: 'See how your work style affects teamwork, pace, and communication.',
    tags: ['behavior', 'teamwork', 'work style'],
  },
  {
    id: 'cube-test',
    section: 'tests',
    title: 'The Cube Test',
    format: 'Creative visualization test',
    duration: '7 min',
    difficulty: 'Beginner',
    summary: 'An imaginative reflection flow with interpretive prompts and visual storytelling.',
    outcome: 'Explore symbolic patterns in how you imagine space, pressure, and relationships.',
    tags: ['creative', 'reflection', 'visualization'],
  },
  {
    id: 'prompt-ops',
    section: 'class',
    title: 'Prompt Ops for Professionals',
    format: '6-module series',
    duration: '45 min',
    difficulty: 'Intermediate',
    summary: 'A structured class on repeatable prompt design, review loops, and agent collaboration.',
    outcome: 'Build a reliable prompt workflow for everyday knowledge work.',
    tags: ['professional development', 'ai literacy', 'workflow'],
  },
  {
    id: 'creative-worldbuilding',
    section: 'class',
    title: 'Creative Worldbuilding Studio',
    format: 'Project class',
    duration: '60 min',
    difficulty: 'Varies',
    summary: 'Develop fictional settings with narrative, visual, and systems prompts.',
    outcome: 'Finish with a concept packet, mood direction, and story hooks.',
    tags: ['hobby', 'creative', 'story'],
  },
  {
    id: 'career-comms',
    section: 'class',
    title: 'Career Communication Lab',
    format: 'Practice path',
    duration: '35 min',
    difficulty: 'Beginner',
    summary: 'Strengthen messaging for interviews, introductions, proposals, and internal communication.',
    outcome: 'Leave with templates and an agent practice partner.',
    tags: ['career', 'communication', 'professional'],
  },
  {
    id: 'build-agent',
    section: 'how-to',
    title: 'How to Build Your First Agent',
    format: 'Guide + walkthrough',
    duration: '12 min',
    difficulty: 'Beginner',
    summary: 'A practical beginner guide to creating, configuring, and chatting with a custom agent.',
    outcome: 'Launch your first tailored agent and save it to your library.',
    tags: ['starter', 'agent creation', 'practical'],
  },
  {
    id: 'host-arcade-night',
    section: 'how-to',
    title: 'How to Host an AI Arcade Night',
    format: 'Checklist guide',
    duration: '8 min',
    difficulty: 'Beginner',
    summary: 'Set up a sequence of social games, warm-ups, and group prompts for a live session.',
    outcome: 'Run a smoother multiplayer-style experience with better pacing.',
    tags: ['events', 'party', 'social'],
  },
  {
    id: 'design-learning-track',
    section: 'how-to',
    title: 'How to Design a Learning Track',
    format: 'Template guide',
    duration: '15 min',
    difficulty: 'Intermediate',
    summary: 'Learn how to chain lessons, checkpoints, and practice games into one cohesive path.',
    outcome: 'Draft a track structure ready for publishing in Create.',
    tags: ['curriculum', 'creator', 'advanced'],
  },
];
