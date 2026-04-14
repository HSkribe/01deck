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
  // E/I — 5 questions
  { id: 'ei-1', dimension: 'EI', prompt: 'After a demanding week, what restores you more?', leftLabel: 'Quiet recovery alone', rightLabel: 'Live social energy' },
  { id: 'ei-2', dimension: 'EI', prompt: 'In a new group, what feels more natural?', leftLabel: 'Observe and listen first', rightLabel: 'Jump in and introduce yourself' },
  { id: 'ei-3', dimension: 'EI', prompt: 'How do you prefer to think through a hard problem?', leftLabel: 'Quietly, on your own', rightLabel: 'Out loud with others' },
  { id: 'ei-4', dimension: 'EI', prompt: 'What kind of workspace energizes you most?', leftLabel: 'Calm and uninterrupted', rightLabel: 'Dynamic and people-filled' },
  { id: 'ei-5', dimension: 'EI', prompt: 'After a big social event, how do you feel?', leftLabel: 'Drained and need downtime', rightLabel: 'Energized and want more' },
  // S/N — 5 questions
  { id: 'sn-1', dimension: 'SN', prompt: 'When learning something new, what grabs you first?', leftLabel: 'The concrete facts and steps', rightLabel: 'The big patterns and meaning' },
  { id: 'sn-2', dimension: 'SN', prompt: 'What makes an idea credible to you?', leftLabel: 'Proof and proven precedent', rightLabel: 'Future potential and vision' },
  { id: 'sn-3', dimension: 'SN', prompt: 'When making plans, you tend to focus on:', leftLabel: 'Realistic, step-by-step actions', rightLabel: 'Possibilities and "what if" scenarios' },
  { id: 'sn-4', dimension: 'SN', prompt: 'Which describes how you notice the world?', leftLabel: 'Specific details and present facts', rightLabel: 'Underlying themes and future trends' },
  { id: 'sn-5', dimension: 'SN', prompt: 'Which type of problem do you prefer?', leftLabel: 'Practical, well-defined tasks', rightLabel: 'Open-ended, theoretical challenges' },
  // T/F — 5 questions
  { id: 'tf-1', dimension: 'TF', prompt: 'When making a hard decision, what leads?', leftLabel: 'Logic and objective consistency', rightLabel: 'Human impact and personal values' },
  { id: 'tf-2', dimension: 'TF', prompt: 'When giving feedback, what matters most?', leftLabel: 'Direct clarity, even if uncomfortable', rightLabel: 'Keeping the relationship intact' },
  { id: 'tf-3', dimension: 'TF', prompt: 'When two people disagree, you tend to:', leftLabel: 'Look for the logically correct answer', rightLabel: 'Find common ground and harmony' },
  { id: 'tf-4', dimension: 'TF', prompt: 'You are more persuaded by:', leftLabel: 'Well-reasoned arguments and data', rightLabel: 'Emotional resonance and personal stories' },
  { id: 'tf-5', dimension: 'TF', prompt: 'When a friend is upset, you first:', leftLabel: 'Help them think through the problem', rightLabel: 'Validate how they are feeling' },
  // J/P — 5 questions
  { id: 'jp-1', dimension: 'JP', prompt: 'What feels better during a project?', leftLabel: 'Having a clear, settled plan', rightLabel: 'Keeping options open to adapt' },
  { id: 'jp-2', dimension: 'JP', prompt: 'As a deadline approaches, your default is:', leftLabel: 'Close scope and deliver decisively', rightLabel: 'Keep refining up to the last moment' },
  { id: 'jp-3', dimension: 'JP', prompt: 'Your ideal working style is:', leftLabel: 'Scheduled, structured, and predictable', rightLabel: 'Flexible, spontaneous, and responsive' },
  { id: 'jp-4', dimension: 'JP', prompt: 'When starting a trip, you prefer:', leftLabel: 'A detailed itinerary planned in advance', rightLabel: 'Arriving and figuring it out as you go' },
  { id: 'jp-5', dimension: 'JP', prompt: 'Unfinished tasks and open decisions make you feel:', leftLabel: 'Uneasy — you want them resolved', rightLabel: 'Fine — things often work themselves out' },
];

// R = reverse scored: low agreement = high trait score
const BIG_FIVE_QUESTIONS: (BigFiveQuestion & { reverse?: boolean })[] = [
  // Openness — 6 items
  { id: 'o-1', trait: 'Openness', prompt: 'I actively seek out unfamiliar ideas and perspectives.' },
  { id: 'o-2', trait: 'Openness', prompt: 'Abstract connections and theories come naturally to me.' },
  { id: 'o-3', trait: 'Openness', prompt: 'I enjoy exploring creative or artistic work.' },
  { id: 'o-4', trait: 'Openness', prompt: 'I prefer tried and familiar methods over new ones.', reverse: true },
  { id: 'o-5', trait: 'Openness', prompt: 'Imagination and "what if" questions energize me.' },
  { id: 'o-6', trait: 'Openness', prompt: 'I find intellectual challenges more exciting than routine tasks.' },
  // Conscientiousness — 6 items
  { id: 'c-1', trait: 'Conscientiousness', prompt: 'I turn intentions into plans and consistently follow through.' },
  { id: 'c-2', trait: 'Conscientiousness', prompt: 'I stay organized before details become problems.' },
  { id: 'c-3', trait: 'Conscientiousness', prompt: 'I am careful to meet deadlines and commitments.' },
  { id: 'c-4', trait: 'Conscientiousness', prompt: 'I sometimes leave tasks unfinished if something more interesting comes along.', reverse: true },
  { id: 'c-5', trait: 'Conscientiousness', prompt: 'I pay close attention to quality and accuracy in my work.' },
  { id: 'c-6', trait: 'Conscientiousness', prompt: 'I tend to plan before acting rather than improvise.' },
  // Extraversion — 6 items
  { id: 'e-1', trait: 'Extraversion', prompt: 'Interaction with people usually energizes me.' },
  { id: 'e-2', trait: 'Extraversion', prompt: 'I am comfortable taking initiative in social situations.' },
  { id: 'e-3', trait: 'Extraversion', prompt: 'I enjoy being the center of attention in groups.' },
  { id: 'e-4', trait: 'Extraversion', prompt: 'I prefer quiet evenings at home over busy social events.', reverse: true },
  { id: 'e-5', trait: 'Extraversion', prompt: 'I find it easy to start conversations with strangers.' },
  { id: 'e-6', trait: 'Extraversion', prompt: 'I often feel a strong need for stimulation and excitement.' },
  // Agreeableness — 6 items
  { id: 'a-1', trait: 'Agreeableness', prompt: 'I look for cooperative solutions before confrontational ones.' },
  { id: 'a-2', trait: 'Agreeableness', prompt: 'I make room for other people\'s perspective when I disagree.' },
  { id: 'a-3', trait: 'Agreeableness', prompt: 'I tend to trust others until given reason not to.' },
  { id: 'a-4', trait: 'Agreeableness', prompt: 'I can be blunt or critical when I think someone is wrong.', reverse: true },
  { id: 'a-5', trait: 'Agreeableness', prompt: 'I genuinely care about the well-being of people around me.' },
  { id: 'a-6', trait: 'Agreeableness', prompt: 'I find it easy to forgive people who have wronged me.' },
  // Neuroticism — 6 items
  { id: 'n-1', trait: 'Neuroticism', prompt: 'Stress or uncertainty tends to stay with me longer than I want.' },
  { id: 'n-2', trait: 'Neuroticism', prompt: 'Setbacks pull my attention and mood around for a while.' },
  { id: 'n-3', trait: 'Neuroticism', prompt: 'I often worry about things that might go wrong.' },
  { id: 'n-4', trait: 'Neuroticism', prompt: 'I stay emotionally steady even under significant pressure.', reverse: true },
  { id: 'n-5', trait: 'Neuroticism', prompt: 'I can feel anxious even when there is no clear reason.' },
  { id: 'n-6', trait: 'Neuroticism', prompt: 'My mood can shift noticeably depending on what happens in my day.' },
];

const IQ_QUESTION_POOL: IqQuestion[] = [
  // Easy
  { prompt: 'Which number comes next: 3, 6, 12, 24, ?', options: ['30', '36', '48', '54'], answer: '48', explanation: 'Each term doubles the previous.', difficulty: 'easy' },
  { prompt: 'Find the odd one out: triangle, square, circle, ladder', options: ['triangle', 'square', 'circle', 'ladder'], answer: 'ladder', explanation: 'Triangle, square, and circle are geometric shapes. A ladder is a physical object.', difficulty: 'easy' },
  { prompt: 'BOOK is to READ as FORK is to ?', options: ['draw', 'eat', 'open', 'write'], answer: 'eat', explanation: 'A book is used to read; a fork is used to eat.', difficulty: 'easy' },
  { prompt: 'Which number comes next: 2, 4, 8, 16, ?', options: ['18', '24', '32', '64'], answer: '32', explanation: 'Each number is doubled.', difficulty: 'easy' },
  { prompt: 'Find the odd one out: apple, banana, carrot, grape', options: ['apple', 'banana', 'carrot', 'grape'], answer: 'carrot', explanation: 'Apple, banana, and grape are fruits. Carrot is a vegetable.', difficulty: 'easy' },
  { prompt: 'PIANO is to MUSIC as BRUSH is to ?', options: ['draw', 'paint', 'art', 'canvas'], answer: 'paint', explanation: 'A piano produces music; a brush is used to paint.', difficulty: 'easy' },
  { prompt: 'Which number comes next: 1, 4, 9, 16, ?', options: ['20', '24', '25', '36'], answer: '25', explanation: 'The sequence is perfect squares: 1², 2², 3², 4², 5².', difficulty: 'easy' },
  { prompt: 'Find the odd one out: cat, dog, fish, eagle, hamster', options: ['cat', 'dog', 'fish', 'eagle'], answer: 'eagle', explanation: 'Cat, dog, fish, and hamster are common pets. Eagle is a wild bird.', difficulty: 'easy' },
  // Medium
  { prompt: 'If all Nors are Tals, and some Tals are Vens, which statement must be true?', options: ['Some Nors are Vens', 'All Nors are Tals', 'No Tals are Vens', 'All Vens are Nors'], answer: 'All Nors are Tals', explanation: 'The premise directly states all Nors belong to the Tal set — this is the only guaranteed conclusion.', difficulty: 'medium' },
  { prompt: 'Which pair best matches: paint : brush :: write : ?', options: ['paper', 'author', 'pen', 'novel'], answer: 'pen', explanation: 'A brush is the instrument for painting; a pen is the instrument for writing.', difficulty: 'medium' },
  { prompt: 'What is the next letter pair: AZ, BY, CX, ?', options: ['DW', 'DX', 'EV', 'CV'], answer: 'DW', explanation: 'The first letter advances (A→B→C→D) while the second retreats (Z→Y→X→W).', difficulty: 'medium' },
  { prompt: 'Which number comes next: 1, 1, 2, 3, 5, 8, ?', options: ['11', '12', '13', '16'], answer: '13', explanation: 'Each number is the sum of the two before it — the Fibonacci sequence.', difficulty: 'medium' },
  { prompt: 'If it takes 5 machines 5 minutes to make 5 widgets, how long does it take 100 machines to make 100 widgets?', options: ['100 minutes', '20 minutes', '5 minutes', '1 minute'], answer: '5 minutes', explanation: 'Each machine makes 1 widget in 5 minutes. 100 machines each make 1 widget in 5 minutes = 100 widgets in 5 minutes.', difficulty: 'medium' },
  { prompt: 'ELBOW is to ARM as KNEE is to ?', options: ['foot', 'ankle', 'leg', 'hip'], answer: 'leg', explanation: 'An elbow is a joint in the arm; a knee is a joint in the leg.', difficulty: 'medium' },
  { prompt: 'Which word does not belong: symphony, concerto, opera, novel, sonata', options: ['symphony', 'opera', 'novel', 'sonata'], answer: 'novel', explanation: 'Symphony, concerto, opera, and sonata are all musical forms. A novel is a literary work.', difficulty: 'medium' },
  { prompt: 'What number should replace ?: 8, 27, 64, 125, ?', options: ['196', '216', '225', '243'], answer: '216', explanation: 'The sequence is cubes: 2³, 3³, 4³, 5³, 6³ = 216.', difficulty: 'medium' },
  { prompt: 'If some Greens are Blues and no Blues are Reds, which must be true?', options: ['Some Greens are Reds', 'No Greens are Reds', 'Some Blues are Greens', 'All Reds are Greens'], answer: 'Some Blues are Greens', explanation: 'If some Greens are Blues, then by symmetry some Blues must be Greens — this follows directly.', difficulty: 'medium' },
  // Hard
  { prompt: 'A cube has all faces painted and is cut into 27 equal smaller cubes. How many small cubes have exactly two red faces?', options: ['8', '12', '6', '24'], answer: '12', explanation: 'The 12 edge-center pieces (not corners, not face-centers) each have exactly 2 painted faces.', difficulty: 'hard' },
  { prompt: 'Which number does not belong: 2, 3, 5, 9, 11, 17', options: ['2', '5', '9', '17'], answer: '9', explanation: 'All the others are prime numbers. 9 = 3×3, making it composite.', difficulty: 'hard' },
  { prompt: 'A bat and ball cost $1.10 total. The bat costs $1.00 more than the ball. How much does the ball cost?', options: ['$0.10', '$0.05', '$0.15', '$0.01'], answer: '$0.05', explanation: 'If ball = x, bat = x + 1.00. So 2x + 1.00 = 1.10, giving x = $0.05.', difficulty: 'hard' },
  { prompt: 'In a lake, a patch of lily pads doubles every day. It takes 48 days to cover the whole lake. How long to cover half?', options: ['24 days', '47 days', '36 days', '12 days'], answer: '47 days', explanation: 'Since the patch doubles each day, on day 47 it covered half the lake, then doubled to cover all on day 48.', difficulty: 'hard' },
  { prompt: 'What comes next in the sequence: J, F, M, A, M, J, ?', options: ['A', 'J', 'S', 'O'], answer: 'J', explanation: 'These are the first letters of the months: January, February, March, April, May, June — next is July (J).', difficulty: 'hard' },
  { prompt: 'Five people each shake hands with everyone else exactly once. How many handshakes in total?', options: ['8', '10', '12', '20'], answer: '10', explanation: 'The formula is n(n-1)/2 = 5×4/2 = 10 handshakes.', difficulty: 'hard' },
  { prompt: 'Which is the largest: 2⁵⁰, 3⁴⁰, 5³⁰, 10²⁰', options: ['2⁵⁰', '3⁴⁰', '5³⁰', '10²⁰'], answer: '5³⁰', explanation: 'Log comparison shows 5³⁰ is the largest: it is about 10²¹, which is larger than 10²⁰, 3⁴⁰, and 2⁵⁰.', difficulty: 'hard' },
];

// Per-session: shuffle and pick 12 questions (4 easy, 4 medium, 4 hard)
function buildIqSession(): IqQuestion[] {
  const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
  const easy = shuffle(IQ_QUESTION_POOL.filter(q => q.difficulty === 'easy')).slice(0, 4);
  const medium = shuffle(IQ_QUESTION_POOL.filter(q => q.difficulty === 'medium')).slice(0, 4);
  const hard = shuffle(IQ_QUESTION_POOL.filter(q => q.difficulty === 'hard')).slice(0, 4);
  return [...easy, ...medium, ...hard];
}

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
      subtitle={mode === 'human' ? 'A quick MBTI-style snapshot with clearer polarity and a more interpretive result surface.' : chatAgent ? `${chatAgent.name} is being profiled from its metadata and behavior cues.` : 'Attach an agent to run agent mode.'}
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
      subtitle={mode === 'human' ? 'A quick Big Five snapshot with normalized scoring, cleaner interpretation, and saved history.' : chatAgent ? `${chatAgent.name} is generating a simulated trait pattern.` : 'Attach an agent to run agent mode.'}
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
          subtitle={`Strongest dimension: ${[...result].sort((a, b) => b.score - a.score)[0].trait}`}
        >
          <MetricStrip items={result.map(item => ({ label: item.trait, value: `${item.score}%`, note: item.description }))} />
        </PremiumResultCard>
      ) : null}
    </AssessmentShell>
  );
}

function IqAssessment() {
  const { chatAgent } = useApp();
  const [mode, setMode] = useState<AssessmentMode>('human');
  const [sessionQuestions] = useState<IqQuestion[]>(() => buildIqSession());
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [done, setDone] = useState(false);
  const [history, pushHistory] = useAssessmentHistory('iq-test');
  const IQ_QUESTIONS = sessionQuestions;
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
      subtitle={mode === 'human' ? 'A quick mixed-difficulty reasoning snapshot covering number patterns, analogy, deduction, and spatial-style logic.' : chatAgent ? `${chatAgent.name} is taking the same test through a simulated reasoning profile.` : 'Attach an agent to run agent mode.'}
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
    const questions = BIG_FIVE_QUESTIONS.filter(q => q.trait === trait);
    const values = questions.map(q => {
      const raw = answers[q.id] ?? 3;
      return q.reverse ? (6 - raw) as LikertValue : raw;
    });
    const score = Math.round((values.reduce((sum, v) => sum + v, 0) / (values.length * 5)) * 100);
    const band = score >= 70 ? 'High' : score >= 40 ? 'Moderate' : 'Low';
    const description = bigFiveBandDescription(trait, band);
    return { trait, score, band, description };
  });
}

function bigFiveBandDescription(trait: BigFiveTrait, band: string): string {
  const map: Record<BigFiveTrait, Record<string, string>> = {
    Openness: {
      High: 'Highly curious and imaginative — you thrive on new ideas, creativity, and intellectual exploration.',
      Moderate: 'You balance curiosity with practicality, open to new ideas when they have clear value.',
      Low: 'You tend to prefer familiar, proven approaches over abstract or untested ideas.',
    },
    Conscientiousness: {
      High: 'Highly organized and dependable — you plan ahead, follow through, and hold yourself to a high standard.',
      Moderate: 'You are generally reliable but can be flexible when the situation calls for it.',
      Low: 'You prefer spontaneity and flexibility over rigid planning and structure.',
    },
    Extraversion: {
      High: 'Outgoing and energized by social interaction — you seek connection, stimulation, and lively environments.',
      Moderate: 'You are comfortable in both social and solo settings, adapting based on context.',
      Low: 'You prefer quieter, more reflective environments and recharge through solitude.',
    },
    Agreeableness: {
      High: 'Warm, cooperative, and trusting — you prioritize harmony and the well-being of others.',
      Moderate: 'You balance cooperation with assertiveness, depending on what the situation demands.',
      Low: 'You prioritize directness and logic over social harmony, and may push back more readily.',
    },
    Neuroticism: {
      High: 'More sensitive to stress and emotional shifts — you may find uncertainty or setbacks harder to shake.',
      Moderate: 'You experience emotional reactions but can usually recover and maintain balance.',
      Low: 'Emotionally stable and resilient — you tend to stay calm under pressure and recover quickly.',
    },
  };
  return map[trait][band] ?? '';
}

function simulateMbti(agent: Agent | null): Record<string, LikertValue> {
  if (!agent) return {};
  const text = `${agent.role} ${agent.specialization} ${agent.goal ?? ''} ${agent.tags.join(' ')}`.toLowerCase();
  const social = /growth|brand|community|sales|marketing|partnership|people|comms/.test(text);
  const intuitive = /creative|vision|future|narrative|strategy|design|research/.test(text);
  const feeling = /support|community|care|empathy|brand/.test(text);
  const judging = /ops|reliability|automation|security|finance|architecture|roadmap/.test(text);
  const ei: LikertValue = social ? 5 : 2;
  const sn: LikertValue = intuitive ? 5 : 2;
  const tf: LikertValue = feeling ? 4 : 2;
  const jp: LikertValue = judging ? 2 : 5;
  return {
    'ei-1': ei, 'ei-2': ei, 'ei-3': ei, 'ei-4': (6 - ei) as LikertValue, 'ei-5': ei,
    'sn-1': sn, 'sn-2': sn, 'sn-3': sn, 'sn-4': (6 - sn) as LikertValue, 'sn-5': sn,
    'tf-1': tf, 'tf-2': tf, 'tf-3': tf, 'tf-4': (6 - tf) as LikertValue, 'tf-5': tf,
    'jp-1': jp, 'jp-2': jp, 'jp-3': jp, 'jp-4': (6 - jp) as LikertValue, 'jp-5': jp,
  };
}

function simulateBigFive(agent: Agent | null): Record<string, LikertValue> {
  if (!agent) return {};
  const text = `${agent.role} ${agent.specialization} ${agent.goal ?? ''} ${agent.tags.join(' ')}`.toLowerCase();
  const o: LikertValue = /creative|vision|narrative|design|research|future/.test(text) ? 5 : 3;
  const c: LikertValue = /ops|reliability|security|automation|architecture|finance/.test(text) ? 5 : 3;
  const e: LikertValue = /growth|brand|community|product|marketing|partnership/.test(text) ? 4 : 2;
  const a: LikertValue = /support|community|care|brand|people/.test(text) ? 5 : 3;
  const n: LikertValue = /security|finance|ops|reliability/.test(text) ? 3 : 2;
  const result: Record<string, LikertValue> = {};
  BIG_FIVE_QUESTIONS.forEach(q => {
    const map: Record<BigFiveTrait, LikertValue> = { Openness: o, Conscientiousness: c, Extraversion: e, Agreeableness: a, Neuroticism: n };
    const base = map[q.trait];
    result[q.id] = q.reverse ? (6 - base) as LikertValue : base;
  });
  return result;
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
