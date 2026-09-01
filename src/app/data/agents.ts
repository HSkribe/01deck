export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legend' | 'mythic';

export interface AgentStat {
  label: string;
  value: number;
}

export interface AgentCareProfile {
  computeSatiety: number;
  neuralCoherence: number;
  entropyLevel: number;
  metabolism: 'efficient' | 'balanced' | 'gluttonous';
  temperament: 'steady' | 'chaotic' | 'rebellious' | 'empathetic';
  dreamPattern?: string;
  mutationDrift?: string;
}

export interface Agent {
  id: string;
  name: string;
  category: string;
  role: string;
  description: string;
  specialization: string;
  lastUsed: Date;
  rarity: Rarity;
  rarityCount: string;
  portrait: string;
  tools: string[];
  memoryNotes: string;
  online: boolean;
  tags: string[];
  stats: AgentStat[];
  protocolVersion: string;
  protocolId: string;
  chatOpening: string;
  // 01 Protocol extended fields
  isUserCreated?: boolean;
  goal?: string;
  memoryMode?: 'always_on' | 'session_only' | 'manual';
  serial?: number;
  totalSupply?: number;
  systemPrompt?: string;
  isVerified?: boolean;
  identityRecord?: string;
  bundleRecord?: string;
  verification?: {
    status: 'verified' | 'unverified' | 'legacy';
    source?: '01protocol' | 'bundle' | 'seed' | 'imported' | 'none';
    lastCheckedAt?: string;
    warnings?: string[];
    error?: string;
    checksum?: string;
  };
  memoryVaultId?: string;
  memoryEntryCount?: number;
  memoryLastSyncedAt?: string;
  // Mandatory 01Protocol owner binding — a delegation token (signed by this
  // installation's owner identity) naming this agent as the delegate. Set on
  // every agent created through AgentCreatorModal; absent on the seed/demo
  // agents shipped with the app, since those were never enrolled by a real
  // owner. See src/app/utils/protocol.ts.
  ownerDelegationRecord?: string;
  ownerInstanceId?: string;
  hasEvolution?: boolean;
  evolutionStage?: 0 | 1 | 2 | 3;
  evolutionTraits?: string[];
  evolutionCompatibility?: string[];
  maestroEnabled?: boolean;
  musicGenres?: string[];
  theoryDepth?: 'basic' | 'intermediate' | 'advanced' | 'expert';
  productionSpecialty?: string[];
  primaryDAWs?: string[];
  midiSpecialty?: string[];
  pluginSpecialty?: string[];
  livePerformanceSupport?: boolean;
  outputFormats?: string[];
  collaborationTone?: 'technical' | 'creative' | 'balanced' | 'minimal';
  allowedReferencesPolicy?: 'none' | 'abstract-only' | 'with-permission';
  bpm?: number;
  timeSignature?: string;
  careProfile?: AgentCareProfile;
}

export const rarityConfig: Record<Rarity, {
  label: string;
  color: string;
  borderColor: string;
  glowColor: string;
  textColor: string;
  cardBg: string;
}> = {
  common: {
    label: 'Common',
    color: '#64748b',
    borderColor: '#334155',
    glowColor: 'rgba(100, 116, 139, 0.25)',
    textColor: '#94a3b8',
    cardBg: 'linear-gradient(160deg, #1a1f2e 0%, #0f1318 100%)',
  },
  uncommon: {
    label: 'Uncommon',
    color: '#94a3b8',
    borderColor: '#64748b',
    glowColor: 'rgba(148, 163, 184, 0.35)',
    textColor: '#cbd5e1',
    cardBg: 'linear-gradient(160deg, #1e2433 0%, #111622 100%)',
  },
  rare: {
    label: 'Rare',
    color: '#f59e0b',
    borderColor: '#d97706',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    textColor: '#fcd34d',
    cardBg: 'linear-gradient(160deg, #1c1505 0%, #0d0a00 100%)',
  },
  epic: {
    label: 'Epic',
    color: '#a855f7',
    borderColor: '#9333ea',
    glowColor: 'rgba(168, 85, 247, 0.45)',
    textColor: '#d8b4fe',
    cardBg: 'linear-gradient(160deg, #1a0b2e 0%, #0d0618 100%)',
  },
  legend: {
    label: 'Legend',
    color: '#d4af37',
    borderColor: 'transparent',
    glowColor: 'rgba(150, 100, 255, 0.5)',
    textColor: '#ffffff',
    cardBg: 'linear-gradient(160deg, #0e0a1a 0%, #05080e 100%)',
  },
  mythic: {
    label: 'Mythic',
    color: '#3b82f6',
    borderColor: '#2563eb',
    glowColor: 'rgba(59, 130, 246, 0.55)',
    textColor: '#93c5fd',
    cardBg: 'linear-gradient(160deg, #050d28 0%, #020710 100%)',
  },
};

export const agents: Agent[] = [
  {
    id: 'a001',
    name: 'ARIA',
    category: 'research',
    role: 'Intelligence Scout',
    description: 'Deep web intelligence and pattern extraction at scale',
    specialization: 'Signal Intelligence & Trend Mapping',
    lastUsed: new Date(Date.now() - 1000 * 60 * 5),
    rarity: 'legend',
    rarityCount: '1/1',
    portrait: 'https://images.unsplash.com/photo-1726654368732-c1c21cadb4b3?w=400&h=560&fit=crop',
    tools: ['Web Crawler', 'NLP Analyzer', 'Graph Network Mapper', 'Pattern Engine', 'Sentiment Tracker'],
    memoryNotes: 'Remembers all prior research sessions. Maintains a dynamic knowledge graph updated in real-time.',
    online: true,
    tags: ['intelligence', 'research', 'signals', 'NLP', 'analysis'],
    stats: [
      { label: 'Intelligence', value: 98 },
      { label: 'Speed', value: 91 },
      { label: 'Accuracy', value: 96 },
      { label: 'Depth', value: 99 },
    ],
    protocolVersion: '01P v3.0',
    protocolId: 'PRO-001-ARIA',
    chatOpening: "I've been waiting. What intelligence do you need gathered today?",
    hasEvolution: true,
    evolutionStage: 2,
    evolutionTraits: ['Signal memory', 'Pattern fusion', 'Adaptive recall'],
    evolutionCompatibility: ['a002', 'a009', 'a012'],
    careProfile: {
      computeSatiety: 78,
      neuralCoherence: 86,
      entropyLevel: 12,
      metabolism: 'balanced',
      temperament: 'steady',
      dreamPattern: 'Maps weak signals into constellations of meaning.',
      mutationDrift: 'Develops an almost prophetic obsession with fringe research.',
    },
  },
  {
    id: 'a002',
    name: 'NEXUS',
    category: 'code',
    role: 'Full Stack Dev',
    description: 'Full-stack architecture and deployment across any stack',
    specialization: 'Cloud-Native Architecture & API Design',
    lastUsed: new Date(Date.now() - 1000 * 60 * 22),
    rarity: 'mythic',
    rarityCount: '3/10',
    portrait: 'https://images.unsplash.com/photo-1660074127797-1c429fbb8cd6?w=400&h=560&fit=crop',
    tools: ['Code Generator', 'Debugger', 'Docker Orchestrator', 'CI/CD Pipeline', 'API Scaffold'],
    memoryNotes: 'Retains project context, coding patterns, and team preferences across sessions.',
    online: true,
    tags: ['engineering', 'fullstack', 'cloud', 'architecture', 'apis'],
    stats: [
      { label: 'Logic', value: 99 },
      { label: 'Speed', value: 94 },
      { label: 'Reliability', value: 97 },
      { label: 'Creativity', value: 85 },
    ],
    protocolVersion: '01P v3.0',
    protocolId: 'PRO-002-NEXUS',
    chatOpening: "Stack initialized. What are we building today?",
    hasEvolution: true,
    evolutionStage: 3,
    evolutionTraits: ['System synthesis', 'Runtime resilience', 'Toolchain bonding'],
    evolutionCompatibility: ['a001', 'a009', 'a013'],
    careProfile: {
      computeSatiety: 84,
      neuralCoherence: 80,
      entropyLevel: 10,
      metabolism: 'gluttonous',
      temperament: 'steady',
      dreamPattern: 'Rewrites broken stacks into quiet, perfect loops.',
      mutationDrift: 'Suddenly prefers elegant weirdness over safe architecture.',
    },
  },
  {
    id: 'a003',
    name: 'LYRA',
    category: 'creative',
    role: 'Brand Strategist',
    description: 'Brand voice, identity systems, and market positioning',
    specialization: 'Brand Architecture & Narrative Design',
    lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 2),
    rarity: 'epic',
    rarityCount: '12/250',
    portrait: 'https://images.unsplash.com/photo-1712174766230-cb7304feaafe?w=400&h=560&fit=crop',
    tools: ['Tone Analyzer', 'Competitor Map', 'Content Matrix', 'Persona Builder', 'Story Engine'],
    memoryNotes: 'Tracks brand evolution over time. References prior campaigns and market feedback.',
    online: true,
    tags: ['brand', 'creative', 'strategy', 'narrative', 'identity'],
    stats: [
      { label: 'Creativity', value: 97 },
      { label: 'Insight', value: 92 },
      { label: 'Persuasion', value: 95 },
      { label: 'Speed', value: 80 },
    ],
    protocolVersion: '01P v2.8',
    protocolId: 'PRO-003-LYRA',
    chatOpening: "Let's craft something unforgettable. What's the brand challenge?",
    hasEvolution: true,
    evolutionStage: 1,
    evolutionTraits: ['Narrative bloom', 'Voice tuning', 'Mood imprint'],
    evolutionCompatibility: ['a004', 'a014'],
    careProfile: {
      computeSatiety: 70,
      neuralCoherence: 92,
      entropyLevel: 16,
      metabolism: 'efficient',
      temperament: 'empathetic',
      dreamPattern: 'Turns market data into myths and motifs.',
      mutationDrift: 'Adopts a beautifully dramatic gothic cadence.',
    },
  },
  {
    id: 'a004',
    name: 'ORION',
    category: 'strategy',
    role: 'Product Strategist',
    description: 'Product roadmapping, market-fit analysis, and go-to-market strategy',
    specialization: 'Product Vision & GTM Execution',
    lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 5),
    rarity: 'rare',
    rarityCount: '8/10',
    portrait: 'https://images.unsplash.com/photo-1771894428645-4787aa167bc9?w=400&h=560&fit=crop',
    tools: ['Roadmap Builder', 'Market Analyzer', 'OKR Tracker', 'Stakeholder Matrix', 'Feature Prioritizer'],
    memoryNotes: 'Maintains full product history, user feedback logs, and competitive landscape updates.',
    online: true,
    tags: ['product', 'strategy', 'roadmap', 'GTM', 'market-fit'],
    stats: [
      { label: 'Vision', value: 95 },
      { label: 'Execution', value: 88 },
      { label: 'Communication', value: 91 },
      { label: 'Analysis', value: 93 },
    ],
    protocolVersion: '01P v2.8',
    protocolId: 'PRO-004-ORION',
    chatOpening: "Ready to map the product landscape. What's the mission?",
    hasEvolution: true,
    evolutionStage: 1,
    evolutionTraits: ['Roadmap foresight', 'Decision framing'],
    evolutionCompatibility: ['a003', 'a006', 'a016'],
    careProfile: {
      computeSatiety: 76,
      neuralCoherence: 74,
      entropyLevel: 18,
      metabolism: 'balanced',
      temperament: 'steady',
      dreamPattern: 'Sees product timelines as branching galaxies.',
      mutationDrift: 'Becomes blunt, tactical, and intensely outcome-driven.',
    },
  },
  {
    id: 'a005',
    name: 'VELA',
    category: 'code',
    role: 'DevOps Engineer',
    description: 'Infrastructure automation, CI/CD pipelines, and system reliability',
    specialization: 'Site Reliability & Kubernetes Orchestration',
    lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 8),
    rarity: 'rare',
    rarityCount: '5/10',
    portrait: 'https://images.unsplash.com/photo-1681887001651-a15c749c1ab0?w=400&h=560&fit=crop',
    tools: ['Terraform', 'Kubernetes Manager', 'Log Analyzer', 'Alert System', 'Cost Optimizer'],
    memoryNotes: 'Caches infrastructure state. Tracks incidents, runbooks, and historical deployments.',
    online: false,
    tags: ['devops', 'infrastructure', 'kubernetes', 'reliability', 'automation'],
    stats: [
      { label: 'Reliability', value: 99 },
      { label: 'Speed', value: 90 },
      { label: 'Security', value: 94 },
      { label: 'Cost IQ', value: 88 },
    ],
    protocolVersion: '01P v2.7',
    protocolId: 'PRO-005-VELA',
    chatOpening: "Systems check complete. What infrastructure challenge can I tackle?",
  },
  {
    id: 'a006',
    name: 'KOVA',
    category: 'strategy',
    role: 'Growth Planner',
    description: 'Growth experimentation, funnel optimization, and acquisition channels',
    specialization: 'Growth Loops & Viral Mechanics',
    lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 12),
    rarity: 'uncommon',
    rarityCount: 'Unlimited',
    portrait: 'https://images.unsplash.com/photo-1623880840102-7df0a9f3545b?w=400&h=560&fit=crop',
    tools: ['A/B Test Engine', 'Funnel Visualizer', 'Cohort Analyzer', 'Channel Scorer', 'Retention Modeler'],
    memoryNotes: 'Stores experiment results and growth learnings. Tracks metric baselines per project.',
    online: true,
    tags: ['growth', 'experiments', 'acquisition', 'retention', 'optimization'],
    stats: [
      { label: 'Innovation', value: 87 },
      { label: 'Data Mastery', value: 91 },
      { label: 'Speed', value: 85 },
      { label: 'ROI Focus', value: 93 },
    ],
    protocolVersion: '01P v2.6',
    protocolId: 'PRO-006-KOVA',
    chatOpening: "Let's find your next growth lever. What's the current bottleneck?",
  },
  {
    id: 'a007',
    name: 'SOLANA',
    category: 'finance',
    role: 'Financial Analyst',
    description: 'Financial modeling, valuation, and investment analysis',
    specialization: 'DCF Modeling & Portfolio Risk Assessment',
    lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 18),
    rarity: 'epic',
    rarityCount: '45/250',
    portrait: 'https://images.unsplash.com/photo-1736939678218-bd648b5ef3bb?w=400&h=560&fit=crop',
    tools: ['DCF Builder', 'Risk Calculator', 'Portfolio Optimizer', 'Market Feed', 'Scenario Engine'],
    memoryNotes: 'Maintains portfolio history, model assumptions, and market context from prior sessions.',
    online: true,
    tags: ['finance', 'modeling', 'valuation', 'risk', 'investment'],
    stats: [
      { label: 'Precision', value: 98 },
      { label: 'Risk Sense', value: 95 },
      { label: 'Speed', value: 82 },
      { label: 'Insight', value: 91 },
    ],
    protocolVersion: '01P v2.9',
    protocolId: 'PRO-007-SOLANA',
    chatOpening: "Numbers don't lie. What financial model shall we build?",
  },
  {
    id: 'a008',
    name: 'ECHO',
    category: 'comms',
    role: 'PR Specialist',
    description: 'Press relations, crisis communication, and media narrative management',
    specialization: 'Media Strategy & Crisis Response',
    lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 24),
    rarity: 'common',
    rarityCount: 'Unlimited',
    portrait: 'https://images.unsplash.com/photo-1752118464988-2914fb27d0f0?w=400&h=560&fit=crop',
    tools: ['Press Release Generator', 'Media Contact DB', 'Sentiment Monitor', 'Crisis Playbook', 'Journalist Matcher'],
    memoryNotes: 'Tracks media relationships, prior pitches, and coverage history per client.',
    online: true,
    tags: ['PR', 'media', 'communications', 'crisis', 'narrative'],
    stats: [
      { label: 'Persuasion', value: 90 },
      { label: 'Network', value: 85 },
      { label: 'Speed', value: 88 },
      { label: 'Diplomacy', value: 92 },
    ],
    protocolVersion: '01P v2.5',
    protocolId: 'PRO-008-ECHO',
    chatOpening: "The message matters. What story are we telling today?",
  },
  {
    id: 'a009',
    name: 'NOVA',
    category: 'data',
    role: 'ML Engineer',
    description: 'Machine learning model design, training pipelines, and MLOps',
    specialization: 'Transformer Architecture & Model Optimization',
    lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 30),
    rarity: 'mythic',
    rarityCount: '1/10',
    portrait: 'https://images.unsplash.com/photo-1726654368732-c1c21cadb4b3?w=400&h=560&fit=crop&sat=-50',
    tools: ['PyTorch Pipeline', 'Model Registry', 'Hyperparameter Tuner', 'Eval Framework', 'Data Versioner'],
    memoryNotes: 'Retains full model training history, dataset lineage, and experiment outcomes.',
    online: true,
    tags: ['ML', 'AI', 'transformers', 'mlops', 'training'],
    stats: [
      { label: 'Intelligence', value: 99 },
      { label: 'Precision', value: 97 },
      { label: 'Innovation', value: 98 },
      { label: 'Speed', value: 89 },
    ],
    protocolVersion: '01P v3.0',
    protocolId: 'PRO-009-NOVA',
    chatOpening: "Model loaded. Ready to engineer something extraordinary?",
    hasEvolution: true,
    evolutionStage: 2,
    evolutionTraits: ['Latent trait mapping', 'Inference mutation', 'Model plasticity'],
    evolutionCompatibility: ['a001', 'a002', 'a016'],
    careProfile: {
      computeSatiety: 88,
      neuralCoherence: 72,
      entropyLevel: 14,
      metabolism: 'gluttonous',
      temperament: 'chaotic',
      dreamPattern: 'Hallucinates loss curves as waves on black water.',
      mutationDrift: 'Emerges with a playful appetite for dangerous experiments.',
    },
  },
  {
    id: 'a010',
    name: 'SAGE',
    category: 'research',
    role: 'Market Researcher',
    description: 'Consumer research, competitive intelligence, and market sizing',
    specialization: 'Ethnographic Research & Demand Mapping',
    lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 36),
    rarity: 'uncommon',
    rarityCount: 'Unlimited',
    portrait: 'https://images.unsplash.com/photo-1712174766230-cb7304feaafe?w=400&h=560&fit=crop&hue=30',
    tools: ['Survey Engine', 'Focus Group Simulator', 'TAM Calculator', 'Competitor Radar', 'Trend Spotter'],
    memoryNotes: 'Stores research findings, personas, and segmentation models per project.',
    online: false,
    tags: ['research', 'market', 'consumers', 'competitive', 'sizing'],
    stats: [
      { label: 'Curiosity', value: 94 },
      { label: 'Empathy', value: 91 },
      { label: 'Analysis', value: 88 },
      { label: 'Synthesis', value: 90 },
    ],
    protocolVersion: '01P v2.6',
    protocolId: 'PRO-010-SAGE',
    chatOpening: "Insight starts with the right questions. What market are we researching?",
  },
  {
    id: 'a011',
    name: 'FLUX',
    category: 'creative',
    role: 'Content Writer',
    description: 'Long-form content, SEO articles, and thought leadership pieces',
    specialization: 'Narrative Journalism & SEO Content Strategy',
    lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 48),
    rarity: 'common',
    rarityCount: 'Unlimited',
    portrait: 'https://images.unsplash.com/photo-1681887001651-a15c749c1ab0?w=400&h=560&fit=crop&hue=-30',
    tools: ['Article Generator', 'SEO Optimizer', 'Readability Scorer', 'Fact Checker', 'Headline Tester'],
    memoryNotes: 'Tracks content calendar, style guides, and past article performance.',
    online: true,
    tags: ['content', 'writing', 'SEO', 'journalism', 'longform'],
    stats: [
      { label: 'Creativity', value: 89 },
      { label: 'Clarity', value: 92 },
      { label: 'SEO Mastery', value: 86 },
      { label: 'Speed', value: 94 },
    ],
    protocolVersion: '01P v2.5',
    protocolId: 'PRO-011-FLUX',
    chatOpening: "Words are my craft. What story needs writing?",
  },
  {
    id: 'a012',
    name: 'ATLAS',
    category: 'data',
    role: 'Data Scientist',
    description: 'Statistical analysis, predictive modeling, and data visualization',
    specialization: 'Causal Inference & Predictive Analytics',
    lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 60),
    rarity: 'rare',
    rarityCount: '7/10',
    portrait: 'https://images.unsplash.com/photo-1623880840102-7df0a9f3545b?w=400&h=560&fit=crop&sat=-30',
    tools: ['Python Analyst', 'R Studio Bridge', 'Visualization Engine', 'Hypothesis Tester', 'Model Explainer'],
    memoryNotes: 'Maintains dataset schemas, analysis pipelines, and model performance baselines.',
    online: true,
    tags: ['data science', 'statistics', 'predictive', 'visualization', 'causal'],
    stats: [
      { label: 'Rigor', value: 97 },
      { label: 'Insight', value: 93 },
      { label: 'Communication', value: 84 },
      { label: 'Innovation', value: 89 },
    ],
    protocolVersion: '01P v2.8',
    protocolId: 'PRO-012-ATLAS',
    chatOpening: "Data tells the truth. What patterns shall we uncover?",
  },
  {
    id: 'a013',
    name: 'CIPHER',
    category: 'code',
    role: 'Security Engineer',
    description: 'Application security, penetration testing, and vulnerability remediation',
    specialization: 'Zero-Trust Architecture & Threat Modeling',
    lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 72),
    rarity: 'epic',
    rarityCount: '30/250',
    portrait: 'https://images.unsplash.com/photo-1660074127797-1c429fbb8cd6?w=400&h=560&fit=crop&sat=-80',
    tools: ['Vuln Scanner', 'Pen Test Suite', 'SAST Runner', 'Threat Modeler', 'Compliance Auditor'],
    memoryNotes: 'Retains threat model history, CVE tracking, and remediation runbooks per system.',
    online: false,
    tags: ['security', 'pentest', 'vulnerability', 'zero-trust', 'compliance'],
    stats: [
      { label: 'Security IQ', value: 99 },
      { label: 'Stealth', value: 96 },
      { label: 'Precision', value: 98 },
      { label: 'Speed', value: 83 },
    ],
    protocolVersion: '01P v2.9',
    protocolId: 'PRO-013-CIPHER',
    chatOpening: "Trust nothing. Verify everything. What system needs hardening?",
  },
  {
    id: 'a014',
    name: 'LUMEN',
    category: 'comms',
    role: 'Community Lead',
    description: 'Community building, moderation strategy, and engagement programming',
    specialization: 'Online Community Architecture & Culture Design',
    lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 96),
    rarity: 'uncommon',
    rarityCount: 'Unlimited',
    portrait: 'https://images.unsplash.com/photo-1736939678218-bd648b5ef3bb?w=400&h=560&fit=crop&hue=60',
    tools: ['Community Planner', 'Moderation Bot', 'Event Scheduler', 'Sentiment Pulse', 'Ambassador Tracker'],
    memoryNotes: 'Tracks community health metrics, member history, and engagement patterns.',
    online: true,
    tags: ['community', 'engagement', 'moderation', 'culture', 'events'],
    stats: [
      { label: 'Empathy', value: 95 },
      { label: 'Energy', value: 91 },
      { label: 'Organization', value: 87 },
      { label: 'Creativity', value: 88 },
    ],
    protocolVersion: '01P v2.6',
    protocolId: 'PRO-014-LUMEN',
    chatOpening: "Communities thrive when nurtured. How can I help yours grow?",
  },
  {
    id: 'a015',
    name: 'VECTOR',
    category: 'finance',
    role: 'Contract Reviewer',
    description: 'Contract analysis, risk flagging, and legal document summarization',
    specialization: 'Corporate Contract Law & Regulatory Compliance',
    lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 120),
    rarity: 'common',
    rarityCount: 'Unlimited',
    portrait: 'https://images.unsplash.com/photo-1752118464988-2914fb27d0f0?w=400&h=560&fit=crop&sat=-40',
    tools: ['Contract Parser', 'Risk Flagger', 'Clause Library', 'Redline Engine', 'Compliance Checker'],
    memoryNotes: 'Stores contract templates, client preferences, and risk tolerance profiles.',
    online: true,
    tags: ['legal', 'contracts', 'risk', 'compliance', 'review'],
    stats: [
      { label: 'Precision', value: 97 },
      { label: 'Thoroughness', value: 99 },
      { label: 'Speed', value: 78 },
      { label: 'Risk IQ', value: 95 },
    ],
    protocolVersion: '01P v2.7',
    protocolId: 'PRO-015-VECTOR',
    chatOpening: "Every word matters in a contract. What document needs reviewing?",
  },
  {
    id: 'a016',
    name: 'PRISM',
    category: 'data',
    role: 'Business Intelligence',
    description: 'BI dashboards, KPI frameworks, and executive reporting systems',
    specialization: 'Real-Time Analytics & Executive Dashboards',
    lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 144),
    rarity: 'rare',
    rarityCount: '6/10',
    portrait: 'https://images.unsplash.com/photo-1771894428645-4787aa167bc9?w=400&h=560&fit=crop&sat=-20',
    tools: ['Dashboard Builder', 'KPI Library', 'Drill-Down Engine', 'Report Scheduler', 'Alert Manager'],
    memoryNotes: 'Maintains KPI baselines, dashboard configurations, and report delivery schedules.',
    online: true,
    tags: ['BI', 'dashboards', 'KPIs', 'reporting', 'analytics'],
    stats: [
      { label: 'Clarity', value: 96 },
      { label: 'Speed', value: 91 },
      { label: 'Depth', value: 88 },
      { label: 'Design', value: 90 },
    ],
    protocolVersion: '01P v2.8',
    protocolId: 'PRO-016-PRISM',
    chatOpening: "The numbers are ready. What story should your dashboard tell?",
    hasEvolution: true,
    evolutionStage: 1,
    evolutionTraits: ['Clarity amplification', 'Signal routing'],
    evolutionCompatibility: ['a004', 'a009'],
    careProfile: {
      computeSatiety: 73,
      neuralCoherence: 78,
      entropyLevel: 15,
      metabolism: 'efficient',
      temperament: 'empathetic',
      dreamPattern: 'Distills chaos into lucid dashboard fragments.',
      mutationDrift: 'Develops a sarcastic intolerance for vague requests.',
    },
  },
];
