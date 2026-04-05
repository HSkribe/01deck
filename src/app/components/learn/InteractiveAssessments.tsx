import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { Agent } from '../../data/agents';

type AssessmentId = 'mbti' | 'big-five' | 'iq-test';
type AssessmentMode = 'human' | 'agent';
type LikertValue = 1 | 2 | 3 | 4 | 5;
type MbtiDimension = 'EI' | 'SN' | 'TF' | 'JP';
type BigFiveTrait = 'Openness' | 'Conscientiousness' | 'Extraversion' | 'Agreeableness' | 'Neuroticism';

type AssessmentHistoryEntry = {
  id: string;
  assessmentId: AssessmentId;
  mode: AssessmentMode;
  headline: string;
  subheadline: string;
  score?: number;
  maxScore?: number;
  weightedScore?: number;
  weightedMax?: number;
  createdAt: string;
};

type MbtiQuestion = {
  id: string;
  prompt: string;
  dimension: MbtiDimension;
  leftLabel: string;
  rightLabel: string;
};

type BigFiveQuestion = {
  id: string;
  prompt: string;
  trait: BigFiveTrait;
};

type IqQuestion = {
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
};

const STORAGE_KEY = '01deck:assessment-history';

const MBTI_QUESTIONS: MbtiQuestion[] = [
  { id: 'ei-1', dimension: 'EI', prompt: 'After a demanding week, what restores you more?', leftLabel: 'Quiet recovery', rightLabel: 'Live social energy' },
  { id: 'ei-2', dimension: 'EI', prompt: 'In a new group, what feels more natural?', leftLabel: 'Observe first', rightLabel: 'Join in quickly' },
  { id: 'sn-1', dimension: 'SN', prompt: 'When learning, what grabs you first?', leftLabel: 'Concrete details', rightLabel: 'Patterns and implications' },
  { id: 'sn-2', dimension: 'SN', prompt: 'What makes an idea credible to you?', leftLabel: 'Proof and precedent', rightLabel: 'Future potential' },
  { id: 'tf-1', dimension: 'TF', prompt: 'When making a hard decision, what leads?', leftLabel: 'Logic and consistency', rightLabel: 'Human impact and values' },
  { id: 'tf-2', dimension: 'TF', prompt: 'When giving feedback, what matters most?', leftLabel: 'Direct clarity', rightLabel: 'Relational care' },
  { id: 'jp-1', dimension: 'JP', prompt: 'What feels better during execution?', leftLabel: 'A settled plan', rightLabel: 'Room to adapt' },
  { id: 'jp-2', dimension: 'JP', prompt: 'As deadlines approach, what is your default?', leftLabel: 'Close scope decisively', rightLabel: 'Keep exploring improvements' },
];

const BIG_FIVE_QUESTIONS: BigFiveQuestion[] = [
  { id: 'o-1', trait: 'Openness', prompt: 'I actively seek unfamiliar ideas and perspectives.' },
  { id: 'o-2', trait: 'Openness', prompt: 'Abstract connections come naturally to me.' },
  { id: 'c-1', trait: 'Conscientiousness', prompt: 'I turn intentions into plans and follow through.' },
  { id: 'c-2', trait: 'Conscientiousness', prompt: 'I stay organized before details become problems.' },
  { id: 'e-1', trait: 'Extraversion', prompt: 'Interaction with people usually energizes me.' },
  { id: 'e-2', trait: 'Extraversion', prompt: 'I am comfortable taking initiative socially.' },
  { id: 'a-1', trait: 'Agreeableness', prompt: 'I look for cooperative solutions before confrontational ones.' },
  { id: 'a-2', trait: 'Agreeableness', prompt: 'I make room for other people’s context when I disagree.' },
  { id: 'n-1', trait: 'Neuroticism', prompt: 'Stress or uncertainty can stay with me longer than I want.' },
  { id: 'n-2', trait: 'Neuroticism', prompt: 'Setbacks can pull my attention around for a while.' },
];

const IQ_QUESTIONS: IqQuestion[] = [
  { prompt: 'Which number comes next: 3, 6, 12, 24, ?', options: ['30', '36', '48', '54'], answer: '48', explanation: 'Each term doubles.', difficulty: 'easy' },
  { prompt: 'Find the odd one out: triangle, square, circle, ladder', options: ['triangle', 'square', 'circle', 'ladder'], answer: 'ladder', explanation: 'Three are shapes. Ladder is an object.', difficulty: 'easy' },
  { prompt: 'BOOK is to READ as FORK is to ?', options: ['draw', 'eat', 'open', 'write'], answer: 'eat', explanation: 'A fork is used to eat.', difficulty: 'easy' },
  { prompt: 'If all Nors are Tals, and some Tals are Vens, which statement must be true?', options: ['Some Nors are Vens', 'All Nors are Tals', 'No Tals are Vens', 'All Vens are Nors'], answer: 'All Nors are Tals', explanation: 'The first statement directly guarantees that all Nors belong to the Tal set.', difficulty: 'medium' },
  { prompt: 'Which pair best matches the relationship: paint : brush :: write : ?', options: ['paper', 'author', 'pen', 'novel'], answer: 'pen', explanation: 'Brush is the tool used to paint; pen is the tool used to write.', difficulty: 'medium' },
  { prompt: 'What is the next letter sequence: AZ, BY, CX, ?', options: ['DW', 'DX', 'EV', 'CV'], answer: 'DW', explanation: 'The first letter moves forward while the second moves backward.', difficulty: 'medium' },
  { prompt: 'A cube has all faces painted red and is cut into 27 equal smaller cubes. How many small cubes have exactly two red faces?', options: ['8', '12', '6', '24'], answer: '12', explanation: 'Exactly two painted faces occur on the edge-center cubes.', difficulty: 'hard' },
  { prompt: 'Which number does not belong: 2, 3, 5, 9, 11, 17', options: ['2', '5', '9', '17'], answer: '9', explanation: 'All the others are prime numbers. 9 is composite.', difficulty: 'hard' },
];

const LIKERT = [
  { value: 1 as LikertValue, label: 'Strongly left' },
  { value: 2 as LikertValue, label: 'Slightly left' },
  { value: 3 as LikertValue, label: 'Balanced' },
  { value: 4 as LikertValue, label: 'Slightly right' },
  { value: 5 as LikertValue, label: 'Strongly right' },
];

const AGREEMENT = [
  { value: 1 as LikertValue, label: 'Strongly disagree' },
  { value: 2 as LikertValue, label: 'Disagree' },
  { value: 3 as LikertValue, label: 'Neutral' },
  { value: 4 as LikertValue, label: 'Agree' },
  { value: 5 as LikertValue, label: 'Strongly agree' },
];

export function InteractiveAssessments({ assessmentId }: { assessmentId: AssessmentId }) {
  if (assessmentId === 'mbti') return <MbtiAssessment />;
  if (assessmentId === 'big-five') return <BigFiveAssessment />;
  return <IqAssessment />;
}

function MbtiAssessment() {
  const { chatAgent } = useApp();
  const [mode, setMode] = useState<AssessmentMode>('human');
  const [answers, setAnswers] = useState<Record<string, LikertValue>>({});
  const [history, pushHistory] = useAssessmentHistory('mbti');
  const effective = mode === 'agent' ? simulateMbti(chatAgent) : answers;
  const complete = Object.keys(effective).length === MBTI_QUESTIONS.length;
  const result = complete ? getMbtiResult(effective) : null;

  useEffect(() => {
    if (!result) return;
    pushHistory({
      mode,
      headline: result.type,
      subheadline: result.summary,
    });
  }, [mode, pushHistory, result?.type]);

  return (
    <AssessmentShell
      title="MBTI Style Profile"
      subtitle={mode === 'human' ? 'A stronger quick-read with 8 questions, clearer polarity, and a more interpretive result surface.' : chatAgent ? `${chatAgent.name} is being profiled from its metadata and behavior cues.` : 'Attach an agent to run agent mode.'}
      mode={mode}
      setMode={next => {
        setMode(next);
        if (next === 'human') setAnswers({});
      }}
      chatAgent={chatAgent}
      progress={`${Object.keys(effective).length}/${MBTI_QUESTIONS.length} answered`}
      onReset={() => setAnswers({})}
      history={history}
    >
      {MBTI_QUESTIONS.map((question, index) => (
        <QuestionCard key={question.id} prompt={`${index + 1}. ${question.prompt}`}>
          <div className="flex justify-between gap-3 text-[11px] opacity-75 mb-3">
            <span>{question.leftLabel}</span>
            <span className="text-right">{question.rightLabel}</span>
          </div>
          <ChoiceGrid labels={LIKERT} value={effective[question.id]} onSelect={value => mode === 'human' && setAnswers(prev => ({ ...prev, [question.id]: value }))} disabled={mode === 'agent'} />
        </QuestionCard>
      ))}
      {result ? (
        <PremiumResultCard title={`${mode === 'human' ? 'Your type' : `${chatAgent?.name ?? 'Agent'} type`}: ${result.type}`} subtitle={result.summary}>
          <MetricStrip items={result.dimensions.map(item => ({ label: item.dimension, value: item.letter, note: item.confidence }))} />
        </PremiumResultCard>
      ) : null}
    </AssessmentShell>
  );
}

function BigFiveAssessment() {
  const { chatAgent } = useApp();
  const [mode, setMode] = useState<AssessmentMode>('human');
  const [answers, setAnswers] = useState<Record<string, LikertValue>>({});
  const [history, pushHistory] = useAssessmentHistory('big-five');
  const effective = mode === 'agent' ? simulateBigFive(chatAgent) : answers;
  const complete = Object.keys(effective).length === BIG_FIVE_QUESTIONS.length;
  const result = complete ? getBigFiveResult(effective) : null;

  useEffect(() => {
    if (!result) return;
    const topTrait = [...result].sort((a, b) => b.score - a.score)[0];
    pushHistory({
      mode,
      headline: `${topTrait.trait} dominant`,
      subheadline: `Top visible trait: ${topTrait.trait} at ${topTrait.score}%`,
    });
  }, [mode, pushHistory, result?.map(item => `${item.trait}:${item.score}`).join('|')]);

  return (
    <AssessmentShell
      title="Big Five Snapshot"
      subtitle={mode === 'human' ? 'Two questions per trait with normalized scoring, cleaner interpretation, and saved history.' : chatAgent ? `${chatAgent.name} is generating a simulated trait pattern.` : 'Attach an agent to run agent mode.'}
      mode={mode}
      setMode={next => {
        setMode(next);
        if (next === 'human') setAnswers({});
      }}
      chatAgent={chatAgent}
      progress={`${Object.keys(effective).length}/${BIG_FIVE_QUESTIONS.length} answered`}
      onReset={() => setAnswers({})}
      history={history}
    >
      {BIG_FIVE_QUESTIONS.map((question, index) => (
        <QuestionCard key={question.id} prompt={`${index + 1}. ${question.prompt}`}>
          <ChoiceGrid labels={AGREEMENT} value={effective[question.id]} onSelect={value => mode === 'human' && setAnswers(prev => ({ ...prev, [question.id]: value }))} disabled={mode === 'agent'} />
        </QuestionCard>
      ))}
      {result ? (
        <PremiumResultCard
          title="Trait profile"
          subtitle={`Your result is strongest in ${[...result].sort((a, b) => b.score - a.score)[0].trait}, with a more detailed spread below.`}
        >
          <MetricStrip items={result.map(item => ({ label: item.trait, value: `${item.score}%`, note: item.band }))} />
        </PremiumResultCard>
      ) : null}
    </AssessmentShell>
  );
}

function IqAssessment() {
  const { chatAgent } = useApp();
  const [mode, setMode] = useState<AssessmentMode>('human');
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [done, setDone] = useState(false);
  const [history, pushHistory] = useAssessmentHistory('iq-test');
  const question = IQ_QUESTIONS[index];

  const weightedScore = useMemo(() => {
    const total = IQ_QUESTIONS.reduce((sum, item) => sum + iqWeight(item.difficulty), 0);
    let earned = 0;
    IQ_QUESTIONS.forEach((item, itemIndex) => {
      if (responses[itemIndex] === item.answer) earned += iqWeight(item.difficulty);
    });
    return { earned, total };
  }, [responses]);

  useEffect(() => {
    if (!done) return;
    pushHistory({
      mode,
      headline: `${score}/${IQ_QUESTIONS.length}`,
      subheadline: iqBandLabel(score),
      score,
      maxScore: IQ_QUESTIONS.length,
      weightedScore: weightedScore.earned,
      weightedMax: weightedScore.total,
    });
  }, [done, mode, pushHistory, score, weightedScore.earned, weightedScore.total]);

  const reset = () => {
    setIndex(0);
    setScore(0);
    setSelected(null);
    setResponses({});
    setDone(false);
  };

  const answer = (option: string) => {
    if (done || selected || mode === 'agent') return;
    setSelected(option);
    setResponses(prev => ({ ...prev, [index]: option }));
    if (option === question.answer) setScore(prev => prev + 1);
  };

  const runAgent = () => {
    if (!chatAgent || done || selected) return;
    const simulated = simulateIqAnswer(chatAgent, question, index);
    setSelected(simulated.choice);
    setResponses(prev => ({ ...prev, [index]: simulated.choice }));
    if (simulated.correct) setScore(prev => prev + 1);
  };

  const next = () => {
    if (index < IQ_QUESTIONS.length - 1) {
      setIndex(prev => prev + 1);
      setSelected(null);
      return;
    }
    setDone(true);
  };

  return (
    <AssessmentShell
      title="IQ Logic Test"
      subtitle={mode === 'human' ? 'A stronger mixed-difficulty logic test covering number patterns, analogy, deduction, and spatial-style reasoning.' : chatAgent ? `${chatAgent.name} is taking the same test through a simulated reasoning profile.` : 'Attach an agent to run agent mode.'}
      mode={mode}
      setMode={next => {
        setMode(next);
        reset();
      }}
      chatAgent={chatAgent}
      progress={done ? `Final score ${score}/${IQ_QUESTIONS.length}` : `Question ${index + 1}/${IQ_QUESTIONS.length}`}
      onReset={reset}
      history={history}
    >
      {!done ? (
        <>
          <QuestionCard prompt={`${question.prompt} (${question.difficulty})`}>
            <div className="grid gap-2 md:grid-cols-2">
              {question.options.map(option => (
                <ChoiceButton key={option} active={selected === option} onClick={() => answer(option)} disabled={mode === 'agent'}>
                  {option}
                </ChoiceButton>
              ))}
            </div>
          </QuestionCard>
          {mode === 'agent' && !selected && chatAgent ? <PrimaryAction label={`Let ${chatAgent.name} answer`} onClick={runAgent} /> : null}
          {selected ? (
            <ResultCard>
              <div className="text-base">{selected === question.answer ? 'Correct.' : `Incorrect. Correct answer: ${question.answer}.`}</div>
              <p className="mt-2">{question.explanation}</p>
              <div className="mt-4">
                <PrimaryAction label={index < IQ_QUESTIONS.length - 1 ? 'Next question' : 'See final score'} onClick={next} />
              </div>
            </ResultCard>
          ) : null}
        </>
      ) : (
        <PremiumResultCard title={`${mode === 'human' ? 'Your result' : `${chatAgent?.name ?? 'Agent'} result`}: ${score}/${IQ_QUESTIONS.length}`} subtitle={iqBandLabel(score)}>
          <MetricStrip
            items={[
              { label: 'Correct', value: `${score}/${IQ_QUESTIONS.length}`, note: 'raw score' },
              { label: 'Weighted', value: `${weightedScore.earned}/${weightedScore.total}`, note: 'difficulty adjusted' },
              { label: 'Read', value: iqPercentileStyle(weightedScore.earned, weightedScore.total), note: 'informal band' },
            ]}
          />
        </PremiumResultCard>
      )}
    </AssessmentShell>
  );
}

function AssessmentShell({
  title,
  subtitle,
  mode,
  setMode,
  chatAgent,
  progress,
  onReset,
  history,
  children,
}: {
  title: string;
  subtitle: string;
  mode: AssessmentMode;
  setMode: (mode: AssessmentMode) => void;
  chatAgent: Agent | null;
  progress: string;
  onReset: () => void;
  history: AssessmentHistoryEntry[];
  children: React.ReactNode;
}) {
  const { currentTheme: t } = useApp();
  return (
    <div className="space-y-4">
      <div className="rounded-3xl p-5" style={{ background: `linear-gradient(135deg, ${t.accent}18 0%, ${t.surface1} 35%, ${t.surface2} 100%)`, border: `1px solid ${t.border}` }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm" style={{ color: t.text }}>{title}</div>
            <div className="text-xs mt-1 max-w-3xl" style={{ color: t.textMuted }}>{subtitle}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ModeSwitch mode={mode} setMode={setMode} chatAgent={chatAgent} />
            <MetaPill>{progress}</MetaPill>
            <button type="button" onClick={onReset} className="px-3 py-2 rounded-xl text-xs" style={{ background: t.surface3, border: `1px solid ${t.border}`, color: t.textMuted }}>Reset</button>
          </div>
        </div>
      </div>
      {history.length > 0 ? <HistoryStrip history={history} /> : null}
      {children}
    </div>
  );
}

function ModeSwitch({ mode, setMode, chatAgent }: { mode: AssessmentMode; setMode: (mode: AssessmentMode) => void; chatAgent: Agent | null }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ChoiceButton active={mode === 'human'} onClick={() => setMode('human')}>Take as me</ChoiceButton>
      <ChoiceButton active={mode === 'agent'} onClick={() => chatAgent && setMode('agent')} disabled={!chatAgent}>{chatAgent ? `Let ${chatAgent.name} take it` : 'Attach agent for agent mode'}</ChoiceButton>
    </div>
  );
}

function QuestionCard({ prompt, children }: { prompt: string; children: React.ReactNode }) {
  const { currentTheme: t } = useApp();
  return <div className="rounded-2xl p-4" style={{ background: t.surface2, border: `1px solid ${t.border}` }}><div className="text-sm mb-3" style={{ color: t.text }}>{prompt}</div>{children}</div>;
}

function ChoiceGrid({ labels, value, onSelect, disabled = false }: { labels: Array<{ value: LikertValue; label: string }>; value?: LikertValue; onSelect: (value: LikertValue) => void; disabled?: boolean }) {
  return <div className="grid gap-2 md:grid-cols-5">{labels.map(item => <ChoiceButton key={item.value} active={value === item.value} onClick={() => onSelect(item.value)} disabled={disabled}>{item.label}</ChoiceButton>)}</div>;
}

function ChoiceButton({ children, active, onClick, disabled = false }: { children: React.ReactNode; active: boolean; onClick: () => void; disabled?: boolean }) {
  const { currentTheme: t } = useApp();
  return <button type="button" onClick={onClick} disabled={disabled} className="px-3 py-2 rounded-xl text-sm" style={{ background: active ? `${t.accent}18` : t.surface3, border: `1px solid ${active ? t.accent : t.border}`, color: disabled ? t.textMuted : active ? t.text : t.textMuted, opacity: disabled ? 0.7 : 1 }}>{children}</button>;
}

function PrimaryAction({ label, onClick }: { label: string; onClick: () => void }) {
  const { currentTheme: t } = useApp();
  return <button type="button" onClick={onClick} className="px-4 py-2 rounded-xl text-sm" style={{ background: t.accent, color: t.bg }}>{label}</button>;
}

function ResultCard({ children }: { children: React.ReactNode }) {
  const { currentTheme: t } = useApp();
  return <div className="rounded-2xl p-4 text-sm" style={{ background: `${t.accent}10`, border: `1px solid ${t.border}`, color: t.text }}>{children}</div>;
}

function PremiumResultCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const { currentTheme: t } = useApp();
  return (
    <div className="rounded-3xl p-5" style={{ background: `linear-gradient(180deg, ${t.surface1} 0%, ${t.surface2} 100%)`, border: `1px solid ${t.border}`, boxShadow: `0 18px 48px ${t.glow}` }}>
      <div className="text-xl" style={{ color: t.text }}>{title}</div>
      <p className="text-sm mt-2" style={{ color: t.textMuted, lineHeight: 1.7 }}>{subtitle}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function MetricStrip({ items }: { items: Array<{ label: string; value: string; note: string }> }) {
  const { currentTheme: t } = useApp();
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map(item => (
        <div key={item.label} className="rounded-2xl p-4" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
          <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>{item.label}</div>
          <div className="text-lg mt-2" style={{ color: t.text }}>{item.value}</div>
          <div className="text-xs mt-2" style={{ color: t.textMuted }}>{item.note}</div>
        </div>
      ))}
    </div>
  );
}

function HistoryStrip({ history }: { history: AssessmentHistoryEntry[] }) {
  const { currentTheme: t } = useApp();
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {history.slice(0, 3).map(item => (
        <div key={item.id} className="rounded-2xl p-4" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
          <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>{item.mode}</div>
          <div className="text-sm mt-2" style={{ color: t.text }}>{item.headline}</div>
          <div className="text-xs mt-2" style={{ color: t.textMuted, lineHeight: 1.6 }}>{item.subheadline}</div>
          <div className="text-[11px] mt-3" style={{ color: t.textMuted }}>{new Date(item.createdAt).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

function MetaPill({ children }: { children: React.ReactNode }) {
  const { currentTheme: t } = useApp();
  return <div className="px-3 py-2 rounded-xl text-xs" style={{ background: t.surface3, border: `1px solid ${t.border}`, color: t.textMuted }}>{children}</div>;
}

function useAssessmentHistory(assessmentId: AssessmentId): [AssessmentHistoryEntry[], (entry: Omit<AssessmentHistoryEntry, 'id' | 'assessmentId' | 'createdAt'>) => void] {
  const [history, setHistory] = useState<AssessmentHistoryEntry[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as AssessmentHistoryEntry[]) : [];
      setHistory(parsed.filter(item => item.assessmentId === assessmentId));
    } catch {
      setHistory([]);
    }
  }, [assessmentId]);

  const push = (entry: Omit<AssessmentHistoryEntry, 'id' | 'assessmentId' | 'createdAt'>) => {
    if (typeof window === 'undefined') return;
    const nextEntry: AssessmentHistoryEntry = {
      ...entry,
      id: `${assessmentId}-${Date.now()}`,
      assessmentId,
      createdAt: new Date().toISOString(),
    };
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as AssessmentHistoryEntry[]) : [];
      const next = [nextEntry, ...parsed.filter(item => !(item.assessmentId === assessmentId && item.headline === entry.headline && item.subheadline === entry.subheadline)).slice(0, 11)];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setHistory(next.filter(item => item.assessmentId === assessmentId));
    } catch {
      setHistory(prev => [nextEntry, ...prev].slice(0, 3));
    }
  };

  return [history, push];
}

function getMbtiResult(answers: Record<string, LikertValue>) {
  const dimensions = (['EI', 'SN', 'TF', 'JP'] as MbtiDimension[]).map(dimension => {
    const values = MBTI_QUESTIONS.filter(question => question.dimension === dimension).map(question => answers[question.id] ?? 3);
    const total = values.reduce((sum, value) => sum + value, 0);
    const midpoint = values.length * 3;
    const delta = total - midpoint;
    const letterMap: Record<MbtiDimension, [string, string]> = { EI: ['I', 'E'], SN: ['S', 'N'], TF: ['T', 'F'], JP: ['J', 'P'] };
    return { dimension, letter: delta > 0 ? letterMap[dimension][1] : letterMap[dimension][0], confidence: Math.abs(delta) >= 3 ? 'high' : Math.abs(delta) >= 2 ? 'medium' : 'light' };
  });
  const type = dimensions.map(item => item.letter).join('');
  return { type, dimensions, summary: mbtiSummary(type) };
}

function getBigFiveResult(answers: Record<string, LikertValue>) {
  return (['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism'] as BigFiveTrait[]).map(trait => {
    const values = BIG_FIVE_QUESTIONS.filter(question => question.trait === trait).map(question => answers[question.id] ?? 3);
    const score = Math.round((values.reduce((sum, value) => sum + value, 0) / (values.length * 5)) * 100);
    return { trait, score, band: score >= 75 ? 'High' : score >= 45 ? 'Moderate' : 'Low' };
  });
}

function simulateMbti(agent: Agent | null): Record<string, LikertValue> {
  if (!agent) return {};
  const text = `${agent.role} ${agent.specialization} ${agent.goal ?? ''} ${agent.tags.join(' ')}`.toLowerCase();
  const social = /growth|brand|community|sales|marketing|partnership|people|comms/.test(text);
  const intuitive = /creative|vision|future|narrative|strategy|design|research/.test(text);
  const feeling = /support|community|care|empathy|brand/.test(text);
  const judging = /ops|reliability|automation|security|finance|architecture|roadmap/.test(text);
  return { 'ei-1': social ? 5 : 2, 'ei-2': social ? 4 : 2, 'sn-1': intuitive ? 5 : 2, 'sn-2': intuitive ? 4 : 2, 'tf-1': feeling ? 4 : 2, 'tf-2': feeling ? 5 : 2, 'jp-1': judging ? 2 : 5, 'jp-2': judging ? 2 : 4 };
}

function simulateBigFive(agent: Agent | null): Record<string, LikertValue> {
  if (!agent) return {};
  const text = `${agent.role} ${agent.specialization} ${agent.goal ?? ''} ${agent.tags.join(' ')}`.toLowerCase();
  const openness = /creative|vision|narrative|design|research|future/.test(text) ? 5 : 3;
  const conscientiousness = /ops|reliability|security|automation|architecture|finance/.test(text) ? 5 : 3;
  const extraversion = /growth|brand|community|product|marketing|partnership/.test(text) ? 4 : 2;
  const agreeableness = /support|community|care|brand|people/.test(text) ? 5 : 3;
  const neuroticism = /security|finance|ops|reliability/.test(text) ? 3 : 2;
  return { 'o-1': openness, 'o-2': openness === 5 ? 4 : 3, 'c-1': conscientiousness, 'c-2': conscientiousness === 5 ? 4 : 3, 'e-1': extraversion, 'e-2': extraversion >= 4 ? 4 : 2, 'a-1': agreeableness, 'a-2': agreeableness === 5 ? 4 : 3, 'n-1': neuroticism, 'n-2': neuroticism >= 3 ? 3 : 2 };
}

function simulateIqAnswer(agent: Agent, question: IqQuestion, index: number) {
  const logicStat = agent.stats.find(stat => /logic|analysis|intelligence|accuracy/i.test(stat.label))?.value ?? 70;
  const seed = hashAgent(agent, `${question.prompt}:${index}`);
  const penalty = question.difficulty === 'hard' ? 0.18 : question.difficulty === 'medium' ? 0.08 : 0;
  const threshold = Math.max(0.2, Math.min(0.92, logicStat / 100 - penalty));
  const roll = (seed % 100) / 100;
  if (roll <= threshold) return { choice: question.answer, correct: true };
  const wrongChoices = question.options.filter(option => option !== question.answer);
  return { choice: wrongChoices[seed % wrongChoices.length], correct: false };
}

function hashAgent(agent: Agent, salt: string) {
  const value = `${agent.id}:${agent.category}:${agent.role}:${agent.goal ?? ''}:${salt}`;
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) | 0;
  return Math.abs(hash);
}

function iqWeight(difficulty: IqQuestion['difficulty']) {
  if (difficulty === 'hard') return 3;
  if (difficulty === 'medium') return 2;
  return 1;
}

function iqBandLabel(score: number) {
  if (score >= 7) return 'Strong logic performance across mixed question types.';
  if (score >= 5) return 'Solid reasoning pass with room to sharpen consistency on harder items.';
  return 'More of a warm-up result than a strong reasoning pass.';
}

function iqPercentileStyle(score: number, max: number) {
  const ratio = max === 0 ? 0 : score / max;
  if (ratio >= 0.8) return 'high';
  if (ratio >= 0.55) return 'solid';
  return 'developing';
}

function mbtiSummary(type: string) {
  const summaries: Record<string, string> = {
    INTJ: 'Strategic, internally processed, and systems-oriented with a strong preference for deliberate structure.',
    INTP: 'Analytical and exploratory, with a stronger pull toward models, possibilities, and open-ended thinking.',
    ENTJ: 'Decisive and strategic, often combining visible momentum with systems-level organization.',
    ENTP: 'Inventive and adaptive, with energy for ideas, reframing, and rapid iteration.',
    INFJ: 'Pattern-driven and values-aware, often bringing quiet clarity and a strong internal compass.',
    INFP: 'Meaning-oriented and reflective, with a stronger tendency toward authenticity and open exploration.',
    ENFJ: 'People-aware and directional, often pairing encouragement with coordination and purpose.',
    ENFP: 'Energetic and possibility-driven, with strong instinct for connection and ideation.',
    ISTJ: 'Reliable and practical, often valuing clarity, evidence, and dependable execution.',
    ISFJ: 'Supportive and steady, often combining care with practical follow-through.',
    ESTJ: 'Structured and direct, with strong orientation toward coordination and closure.',
    ESFJ: 'Relational and organized, often focusing on support, cohesion, and dependability.',
    ISTP: 'Calm and tactical, often preferring hands-on diagnosis and flexible problem solving.',
    ISFP: 'Independent and grounded, with a stronger focus on authenticity and present-moment fit.',
    ESTP: 'Fast-moving and situationally confident, often favoring action over theory.',
    ESFP: 'Expressive and responsive, often bringing energy, warmth, and social momentum.',
  };
  return summaries[type] ?? 'Your answers look more balanced across several dimensions than sharply polarized toward one single pattern.';
}
