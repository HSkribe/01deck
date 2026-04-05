export interface Category {
  id: string;
  icon: string;
  label: string;
  roles: string[];
}

export const categories: Category[] = [
  {
    id: 'research',
    icon: '🔬',
    label: 'Research',
    roles: ['Data Analyst', 'Market Researcher', 'Intelligence Scout', 'Fact Checker', 'Trend Analyst'],
  },
  {
    id: 'creative',
    icon: '🎨',
    label: 'Creative',
    roles: ['Content Writer', 'Copywriter', 'Brand Strategist', 'Video Script', 'Visual Director'],
  },
  {
    id: 'code',
    icon: '💻',
    label: 'Engineering',
    roles: ['Full Stack Dev', 'DevOps Engineer', 'QA Tester', 'Architect', 'Security Engineer'],
  },
  {
    id: 'strategy',
    icon: '🧭',
    label: 'Strategy',
    roles: ['Product Strategist', 'Project Manager', 'Growth Planner', 'OKR Coach', 'Risk Advisor'],
  },
  {
    id: 'comms',
    icon: '💬',
    label: 'Comms',
    roles: ['Customer Support', 'PR Specialist', 'Email Composer', 'Social Manager', 'Community Lead'],
  },
  {
    id: 'finance',
    icon: '⚖️',
    label: 'Finance & Legal',
    roles: ['Financial Analyst', 'Contract Reviewer', 'Tax Advisor', 'Compliance Officer', 'Investment Scout'],
  },
  {
    id: 'data',
    icon: '📊',
    label: 'Data & Analytics',
    roles: ['Business Intelligence', 'ML Engineer', 'Data Scientist', 'Reporting Analyst', 'ETL Specialist'],
  },
];
