import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock, Star, Users, BookOpen, CheckCircle2, Lock, Play,
  ChevronRight, Search, Award, X, ArrowLeft, Filter,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useHub, LearnTab } from '../../../context/HubContext';
import {
  tests, courses, howTos, LearnTest, Course, HowTo, LiveStatus,
} from '../../../data/hubData';
import { InteractiveAssessments } from '../../learn/InteractiveAssessments';

// ─── Shared ──────────────────────────────────────────────

const LEARN_COLOR = '#06b6d4';
const CLASS_COLOR = '#10b981';
const HOWTO_COLOR = '#f59e0b';

const TAB_CONFIG: { id: LearnTab; label: string; icon: string; color: string; description: string }[] = [
  { id: 'tests', label: 'Tests', icon: '🧪', color: LEARN_COLOR, description: 'Personality, intelligence & self-discovery' },
  { id: 'class', label: 'Class', icon: '📚', color: CLASS_COLOR, description: 'Structured courses with agent instructors' },
  { id: 'how-to', label: 'How-To', icon: '🔧', color: HOWTO_COLOR, description: 'Fast, practical guides and walkthroughs' },
];

const STATUS_CONFIG: Record<LiveStatus, { label: string; color: string; bg: string; dot?: boolean }> = {
  live:           { label: 'Live Now',       color: '#22c55e', bg: 'rgba(34,197,94,0.15)',   dot: true },
  mvp:            { label: 'Interactive MVP', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' },
  'content-ready':{ label: 'Content Ready',  color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
  planned:        { label: 'Planned',         color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
};

function StatusBadge({ status }: { status?: LiveStatus }) {
  if (!status) return null;
  const cfg = STATUS_CONFIG[status];
  return (
    <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}>
      {cfg.dot && (
        <motion.span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: cfg.color }}
          animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} />
      )}
      {cfg.label}
    </span>
  );
}

function DifficultyDot({ level }: { level: string }) {
  const colors: Record<string, string> = { easy: '#10b981', medium: '#06b6d4', hard: '#f59e0b', expert: '#ef4444' };
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ background: `${colors[level]}18`, color: colors[level] }}>
      {level}
    </span>
  );
}

// ─── TEST CARD ────────────────────────────────────────────

function TestCard({ test, onSelect }: { test: LearnTest & { isNew?: boolean }; onSelect: (t: LearnTest) => void }) {
  const { currentTheme: t } = useApp();
  const color = LEARN_COLOR;
  const [hovered, setHovered] = useState(false);

  const catColor: Record<string, string> = {
    Personality: '#a855f7', Intelligence: '#3b82f6', Professional: '#f59e0b', Projective: '#10b981',
  };
  const cc = catColor[test.category] ?? color;

  return (
    <motion.div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(test)}
      className="relative rounded-2xl overflow-hidden cursor-pointer p-5"
      style={{ background: t.surface2, border: `1px solid ${hovered ? color + '50' : t.border}` }}
      whileHover={{ scale: 1.02, boxShadow: `0 8px 32px ${color}20` }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Top bar: status + category */}
      <div className="flex items-center gap-2 mb-3">
        <StatusBadge status={(test as any).liveStatus} />
        <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider"
          style={{ background: `${cc}18`, color: cc, border: `1px solid ${cc}30` }}>
          {test.category}
        </span>
        <div className="flex gap-1">
          {test.featured && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>Featured</span>}
          {(test as any).isNew && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>New</span>}
        </div>
      </div>

      {/* Thumbnail */}
      {test.thumbnail && (
        <div className="relative rounded-xl overflow-hidden mb-4" style={{ height: 100 }}>
          <img src={test.thumbnail} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent 50%)' }} />
        </div>
      )}

      <h3 className="text-sm mb-1" style={{ color: t.text }}>{test.title}</h3>
      <p className="text-[11px] mb-4 leading-relaxed line-clamp-2" style={{ color: t.textMuted }}>{test.tagline}</p>

      {/* Metadata */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Clock size={10} style={{ color: t.textMuted }} />
            <span className="text-[10px]" style={{ color: t.textMuted }}>{test.duration}</span>
          </div>
          <span className="text-[10px]" style={{ color: t.textMuted }}>{test.questionCount}Q</span>
        </div>
        <div className="flex items-center gap-1">
          <Users size={10} style={{ color: t.textMuted }} />
          <span className="text-[10px]" style={{ color: t.textMuted }}>{(test.takes / 1000).toFixed(0)}k took this</span>
        </div>
      </div>

      {/* Progress / status */}
      {test.status === 'in-progress' && test.progress && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] uppercase tracking-wider" style={{ color }}>Resumed</span>
            <span className="text-[9px]" style={{ color }}>{test.progress}%</span>
          </div>
          <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full" style={{ width: `${test.progress}%`, background: color }} />
          </div>
        </div>
      )}
      {test.status === 'completed' && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px]" style={{ color: '#10b981' }}>
          <CheckCircle2 size={11} /> Completed
        </div>
      )}

      {/* Hover CTA */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-4 right-4"
          >
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px]"
              style={{ background: color, color: '#000' }}>
              <Play size={9} fill="currentColor" /> Take Test
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── COURSE CARD ──────────────────────────────────────────

function CourseCard({ course, onSelect }: { course: Course; onSelect: (c: Course) => void }) {
  const { currentTheme: t } = useApp();
  const color = CLASS_COLOR;

  return (
    <motion.div
      onClick={() => onSelect(course)}
      className="rounded-2xl overflow-hidden cursor-pointer"
      style={{ background: t.surface2, border: `1px solid ${t.border}` }}
      whileHover={{ scale: 1.02, borderColor: color + '50', boxShadow: `0 8px 32px ${color}18` }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden" style={{ height: 130 }}>
        {course.thumbnail ? (
          <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${color}20, ${color}06)` }}>
            <span style={{ fontSize: 48, opacity: 0.7 }}>📚</span>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent 55%)' }} />
        <div className="absolute top-3 left-3 flex gap-1.5">
          {course.featured && <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.25)', color: '#f59e0b' }}>Featured</span>}
          {course.isNew && <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.25)', color: '#10b981' }}>New</span>}
          {course.certificate && (
            <span className="flex items-center gap-0.5 text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(168,85,247,0.2)', color: '#a855f7' }}>
              <Award size={8} /> Certificate
            </span>
          )}
        </div>
        {/* Instructor */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full" style={{ background: `${color}30`, border: `1px solid ${color}60` }}>
            <div className="w-full h-full rounded-full flex items-center justify-center text-[8px]" style={{ color }}>
              {course.agentName[0]}
            </div>
          </div>
          <span className="text-[10px] text-white">{course.agentName}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <span className="text-[10px] uppercase tracking-wider" style={{ color }}>{course.category}</span>
        <h3 className="text-sm my-1" style={{ color: t.text }}>{course.title}</h3>
        <p className="text-[11px] mb-3 line-clamp-2 leading-relaxed" style={{ color: t.textMuted }}>{course.tagline}</p>

        {/* Progress */}
        {course.status === 'in-progress' && course.progress && (
          <div className="mb-3">
            <div className="flex justify-between text-[10px] mb-1">
              <span style={{ color }}>In progress</span>
              <span style={{ color }}>{course.progress}%</span>
            </div>
            <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full" style={{ width: `${course.progress}%`, background: color }} />
            </div>
          </div>
        )}
        {course.status === 'completed' && (
          <div className="flex items-center gap-1.5 text-[10px] mb-3" style={{ color: '#10b981' }}>
            <CheckCircle2 size={11} /> Completed
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px]" style={{ color: t.textMuted }}>
            <span>{course.lessonCount} lessons</span>
            <span className="flex items-center gap-0.5"><Clock size={10} /> {course.totalDuration}</span>
          </div>
          <div className="flex items-center gap-2">
            <DifficultyDot level={course.difficulty} />
            <div className="flex items-center gap-0.5">
              <Star size={9} style={{ color: '#f59e0b' }} fill="#f59e0b" />
              <span className="text-[10px]" style={{ color: t.textMuted }}>{course.rating}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── COURSE DETAIL ────────────────────────────────────────

function CourseDetail({ course, onClose }: { course: Course; onClose: () => void }) {
  const { currentTheme: t } = useApp();
  const color = CLASS_COLOR;
  const completedCount = course.lessons.filter(l => l.completed).length;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.35, ease: [0.34, 1.05, 0.64, 1] }}
      className="absolute inset-0 overflow-y-auto z-20"
      style={{ background: t.bg }}
    >
      {/* Hero */}
      <div
        className="relative px-6 pt-6 pb-10"
        style={{ background: `linear-gradient(135deg, ${color}18, ${color}04)`, borderBottom: `1px solid ${t.border}` }}
      >
        <button onClick={onClose} className="flex items-center gap-2 mb-4 text-xs" style={{ color: t.textMuted }}>
          <ArrowLeft size={14} /> Back to Classes
        </button>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
            style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
            📚
          </div>
          <div className="flex-1">
            <span className="text-[10px] uppercase tracking-wider" style={{ color }}>{course.category}</span>
            <h1 className="text-xl my-1" style={{ color: t.text }}>{course.title}</h1>
            <p className="text-xs" style={{ color: t.textMuted }}>{course.tagline}</p>
          </div>
        </div>
        {/* Stats */}
        <div className="flex gap-4 mt-6 text-xs" style={{ color: t.textMuted }}>
          <span>{course.lessonCount} lessons</span>
          <span className="flex items-center gap-1"><Clock size={11} />{course.totalDuration}</span>
          <span>{(course.students / 1000).toFixed(1)}k students</span>
          <DifficultyDot level={course.difficulty} />
        </div>
        {/* CTA */}
        <div className="flex gap-3 mt-6">
          <motion.button
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm"
            style={{ background: color, color: '#000' }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Play size={15} fill="currentColor" />
            {course.status === 'in-progress' ? 'Continue' : 'Start Course'}
          </motion.button>
          {course.certificate && (
            <div className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-xs"
              style={{ background: t.surface1, border: `1px solid ${t.border}`, color: '#a855f7' }}>
              <Award size={13} /> Earns Certificate
            </div>
          )}
        </div>
      </div>

      {/* Lessons */}
      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs uppercase tracking-wider" style={{ color: t.textMuted }}>
            Course Content · {course.lessons.length > 0 ? `${completedCount}/${course.lessons.length} complete` : `${course.lessonCount} lessons`}
          </h2>
        </div>

        {course.lessons.length > 0 ? (
          <div className="space-y-2">
            {course.lessons.map((lesson, idx) => {
              const typeIcon = { video: '▶', interactive: '⚡', reading: '📄', exercise: '✏️' }[lesson.type] ?? '○';
              return (
                <motion.div
                  key={lesson.id}
                  className="flex items-center gap-4 p-4 rounded-xl cursor-pointer"
                  style={{ background: t.surface1, border: `1px solid ${lesson.completed ? color + '30' : t.border}` }}
                  whileHover={{ borderColor: color + '50', x: 3 }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                    style={{
                      background: lesson.completed ? color : t.surface3,
                      color: lesson.completed ? '#000' : t.textMuted,
                      border: `1px solid ${lesson.completed ? color : t.border}`,
                    }}
                  >
                    {lesson.completed ? <CheckCircle2 size={14} /> : idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs" style={{ color: lesson.completed ? t.textMuted : t.text }}>{lesson.title}</p>
                    <span className="text-[10px]" style={{ color: t.textMuted }}>{typeIcon} {lesson.type} · {lesson.duration}</span>
                  </div>
                  {!lesson.completed && idx > 0 && !course.lessons[idx - 1]?.completed && (
                    <Lock size={12} style={{ color: t.textMuted }} />
                  )}
                </motion.div>
              );
            })}
            {course.lessonCount > course.lessons.length && (
              <div className="flex items-center gap-2 p-4 rounded-xl" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: t.surface3, color: t.textMuted }}>+</div>
                <span className="text-xs" style={{ color: t.textMuted }}>
                  {course.lessonCount - course.lessons.length} more lessons
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: Math.min(course.lessonCount, 6) }, (_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl"
                style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: t.surface3, color: t.textMuted, border: `1px solid ${t.border}` }}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="h-3 rounded" style={{ background: t.surface3, width: `${60 + (i % 3) * 15}%` }} />
                  <div className="h-2 rounded mt-1.5" style={{ background: t.surface3, width: '30%' }} />
                </div>
                <Lock size={12} style={{ color: t.textMuted }} />
              </div>
            ))}
          </div>
        )}

        {/* Description */}
        <div className="mt-6">
          <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>About this course</h3>
          <p className="text-sm leading-relaxed" style={{ color: t.text }}>{course.description}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── HOW-TO CARD ──────────────────────────────────────────

type HowToGuideContent = {
  goal: string;
  outcome: string;
  steps: string[];
  checklist: string[];
  deliverables: string[];
  pitfalls: string[];
};

const HOWTO_GUIDES: Record<string, HowToGuideContent> = {
  h001: {
    goal: 'Create, configure, and launch a first useful agent with a clear role and portable identity.',
    outcome: 'You finish with a named agent, a defined mission, a chosen memory mode, and a first deployment path.',
    steps: [
      'Choose one job-to-be-done, not a vague personality. Name the role in plain language.',
      'Write a one-sentence mission that explains what the agent should reliably help with.',
      'Decide memory mode: session-only for experimentation, always-on for ongoing workflows.',
      'Pick only the tools the agent truly needs for the first version.',
      'Create the agent, test one real task, then tighten the prompt instead of adding complexity.',
    ],
    checklist: [
      'Name, role, and goal are concrete',
      'Memory mode matches actual usage',
      'At least one real test task was completed',
      'The first version is portable or exportable',
    ],
    deliverables: ['First agent identity', 'Starter prompt', 'One successful test task'],
    pitfalls: ['Overloading the agent with too many tools', 'Using personality instead of mission', 'Skipping the first real task test'],
  },
  'h-aan': {
    goal: 'Run an AI Arcade Night that feels organized, social, and replayable rather than chaotic.',
    outcome: 'You finish with a curated game lineup, a host plan, a scoring sheet, and a closing recap format.',
    steps: [
      'Pick a time box and audience size first, then choose 3 to 5 games that fit it.',
      'Assign a host agent and decide whether it acts as announcer, judge, or commentator.',
      'Warm up with an easy game, place the highest-energy challenge in the middle, and end with a social closer.',
      'Prepare a visible scoring sheet, tie-break rule, and small rewards for momentum.',
      'Close with a replay summary: best moment, top score, and what to change next time.',
    ],
    checklist: [
      'Game order is set',
      'Host and scoring roles are clear',
      'Tie-breaks are defined',
      'Wrap-up summary format exists',
    ],
    deliverables: ['Event run-of-show', 'Game playlist', 'Scoreboard template'],
    pitfalls: ['Too many games for the time window', 'No tie-break rule', 'No warm-up round for new players'],
  },
  'h-dlt': {
    goal: 'Design a learning track that sequences tests, classes, and guides into one useful progression.',
    outcome: 'You finish with a track structure, pacing model, checkpoints, and a clear learner outcome.',
    steps: [
      'Define the learner outcome in one sentence before choosing any content.',
      'Start with a diagnostic or quick snapshot to establish the baseline.',
      'Sequence one class for concept building, then one how-to for practical application.',
      'Add a checkpoint after each major step so learners can reflect or demonstrate progress.',
      'End with a final synthesis task and next-step recommendation.',
    ],
    checklist: [
      'Outcome is explicit',
      'Each item has a reason to exist',
      'Checkpoints are built in',
      'The final step proves something useful',
    ],
    deliverables: ['Track outline', 'Checkpoint plan', 'Final outcome rubric'],
    pitfalls: ['Stacking content without progression', 'Too many diagnostics', 'No final demonstration of learning'],
  },
  h002: {
    goal: 'Build an agent memory system that is useful, selective, and safe to maintain.',
    outcome: 'You finish with a memory model covering what to save, what to summarize, and what to forget.',
    steps: [
      'Separate short-lived session context from durable project memory.',
      'Define memory types such as decisions, preferences, summaries, and recurring tasks.',
      'Add rules for when memory is appended, summarized, or ignored.',
      'Protect against noisy or stale memory by pruning aggressively.',
      'Test retrieval on a real follow-up task and refine recall rules.',
    ],
    checklist: [
      'Session and persistent memory are separated',
      'Memory write rules exist',
      'Noisy data is filtered',
      'A retrieval test passed',
    ],
    deliverables: ['Memory model', 'Write rules', 'Retrieval test notes'],
    pitfalls: ['Saving everything', 'Never pruning stale memory', 'Mixing facts with temporary chat noise'],
  },
  h003: {
    goal: 'Set up an engineering-focused agent that can help with real coding work inside your workflow.',
    outcome: 'You finish with an agent configured for code tasks, a safe working scope, and a first successful dev loop.',
    steps: [
      'Pick the code use case first: review, implementation, debugging, or scaffolding.',
      'Constrain the working directory, tool access, and expected output format.',
      'Define the acceptance criteria the agent must satisfy before it is considered successful.',
      'Run one small real task, then inspect the diff or output before scaling up.',
      'Document the prompts and guardrails that worked so the setup is repeatable.',
    ],
    checklist: [
      'Use case is specific',
      'Scope and tool access are constrained',
      'Acceptance criteria are written down',
      'One real code task was completed and reviewed',
    ],
    deliverables: ['Configured coding agent', 'Prompt template', 'Reviewed first task'],
    pitfalls: ['Giving repo-wide scope too early', 'No acceptance criteria', 'Treating the first output as final without review'],
  },
  h004: {
    goal: 'Use AI agents to turn a quick competitive scan into a short useful brief.',
    outcome: 'You finish with a one-page competitive snapshot, key insights, and next-step actions.',
    steps: [
      'List the competitors and one research question per competitor.',
      'Use one agent to collect signals and another to synthesize them.',
      'Capture only the most decision-relevant differences: audience, positioning, pricing, and product signals.',
      'Reduce the output to a short brief with 3 to 5 meaningful takeaways.',
      'End with action recommendations rather than just observations.',
    ],
    checklist: [
      'Competitor list is bounded',
      'Signals are sourced consistently',
      'Insights are synthesized, not dumped',
      'Actions are attached to findings',
    ],
    deliverables: ['Competitive brief', 'Insight summary', 'Action list'],
    pitfalls: ['Collecting too much raw data', 'No comparison framework', 'Stopping at notes instead of recommendations'],
  },
  h005: {
    goal: 'Automate a weekly reporting loop that saves time and still produces readable output.',
    outcome: 'You finish with a repeatable reporting input set, summary format, and escalation rules.',
    steps: [
      'List the exact sources and metrics required every week.',
      'Normalize the reporting structure so every report uses the same sections.',
      'Add trend callouts, anomalies, and a short executive summary rather than raw numbers alone.',
      'Decide what gets automated fully and what still requires human review.',
      'Test the workflow on one recent reporting cycle and refine the prompt or template.',
    ],
    checklist: [
      'Source list is fixed',
      'Report structure is standardized',
      'Executive summary exists',
      'Review rules are clear',
    ],
    deliverables: ['Weekly report template', 'Source map', 'Automation rules'],
    pitfalls: ['Automating raw output without summarization', 'Changing report structure each week', 'No escalation rule for anomalies'],
  },
  h006: {
    goal: 'Export an agent as a portable `.01bundle` that can be moved and reused cleanly.',
    outcome: 'You finish with a bundle-ready agent, bundled memory, and a validation step before sharing.',
    steps: [
      'Confirm the agent identity is complete and the memory you want included is intentional.',
      'Package identity and memory together into one portable bundle.',
      'Verify the exported file before distributing it.',
      'Label the bundle by purpose so other people know what it is for.',
      'Test import on the destination workflow before treating it as finished.',
    ],
    checklist: [
      'Identity is complete',
      'Memory inclusion is intentional',
      'Bundle verifies cleanly',
      'Import was tested once',
    ],
    deliverables: ['Verified `.01bundle` file', 'Bundle purpose label', 'Import verification note'],
    pitfalls: ['Exporting stale memory', 'Skipping verification', 'Sharing bundles without naming the intended use'],
  },
  h007: {
    goal: 'Build a first-pass financial model with an AI partner without losing rigor.',
    outcome: 'You finish with assumptions, scenarios, outputs, and a model review checklist.',
    steps: [
      'Start with the structure: drivers, assumptions, outputs, and scenarios.',
      'Use the AI to draft formulas and layouts, but verify every major assumption yourself.',
      'Create best, base, and downside scenarios before presenting any conclusion.',
      'Write a short commentary that explains what moves the model most.',
      'Review the model for sanity, circular logic, and obvious assumption errors.',
    ],
    checklist: [
      'Assumptions are visible',
      'Scenarios exist',
      'Major outputs are explained',
      'A review pass was completed',
    ],
    deliverables: ['Model structure', 'Scenario table', 'Decision commentary'],
    pitfalls: ['Treating generated assumptions as fact', 'One-scenario thinking', 'No sanity check before sharing'],
  },
  h008: {
    goal: 'Set up a moderation agent that helps without becoming a black box.',
    outcome: 'You finish with moderation rules, escalation thresholds, and reporting expectations.',
    steps: [
      'Write the moderation policy in plain language before configuring the agent.',
      'Separate auto-handle events from escalate-to-human events.',
      'Define what must be logged for every intervention.',
      'Add a recurring sentiment or incident summary so moderation improves over time.',
      'Test the setup with a small set of realistic cases before wider rollout.',
    ],
    checklist: [
      'Policy is explicit',
      'Escalation thresholds are defined',
      'Logging is required',
      'A trial run was completed',
    ],
    deliverables: ['Moderation policy', 'Escalation matrix', 'Trial-case review'],
    pitfalls: ['No escalation rules', 'No logging', 'Deploying without test cases'],
  },
};

function HowToCard({ item, onSelect }: { item: HowTo; onSelect: (item: HowTo) => void }) {
  const { currentTheme: t } = useApp();
  const color = HOWTO_COLOR;
  const formatIcon: Record<string, string> = { video: '▶', walkthrough: '→', guide: '📋', tutorial: '⚡' };
  const formatColor: Record<string, string> = { video: '#ef4444', walkthrough: '#a855f7', guide: HOWTO_COLOR, tutorial: '#06b6d4' };

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(item)}
      className="flex items-center gap-4 p-4 rounded-xl cursor-pointer"
      style={{ background: t.surface2, border: `1px solid ${t.border}` }}
      whileHover={{ borderColor: color + '40', x: 3, boxShadow: `0 4px 20px ${color}10` }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Format badge */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
        style={{ background: `${formatColor[item.format]}18`, border: `1px solid ${formatColor[item.format]}30`, color: formatColor[item.format] }}
      >
        {formatIcon[item.format] ?? '📄'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-xs truncate" style={{ color: t.text }}>{item.title}</p>
          {item.isNew && <span className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>New</span>}
        </div>
        <div className="flex items-center gap-3 text-[10px]" style={{ color: t.textMuted }}>
          <span>{item.category}</span>
          <span className="flex items-center gap-0.5"><Clock size={9} />{item.duration}</span>
          <DifficultyDot level={item.difficulty} />
          <span>{(item.views / 1000).toFixed(1)}k views</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] capitalize px-2 py-0.5 rounded" style={{ background: `${formatColor[item.format]}15`, color: formatColor[item.format] }}>
          {item.format}
        </span>
        <span className="text-[10px] uppercase tracking-wider" style={{ color: HOWTO_COLOR }}>
          Open Guide
        </span>
        <ChevronRight size={14} style={{ color: t.textMuted }} />
      </div>
    </motion.button>
  );
}

function HowToDetail({ item, onClose }: { item: HowTo; onClose: () => void }) {
  const { currentTheme: t } = useApp();
  const content = HOWTO_GUIDES[item.id] ?? {
    goal: item.description,
    outcome: 'You finish with a clear first version of this workflow and a short review of what to improve next.',
    steps: [
      'Review the guide description and define the exact result you want.',
      'Set up the smallest working version first.',
      'Run one realistic trial from start to finish.',
      'Capture the result and note what needs refinement.',
    ],
    checklist: ['Goal is clear', 'A first pass was completed', 'One trial was reviewed'],
    deliverables: ['First working draft', 'Review notes'],
    pitfalls: ['Skipping the trial run', 'Treating the first draft as final'],
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.35, ease: [0.34, 1.05, 0.64, 1] }}
      className="absolute inset-0 overflow-y-auto z-20"
      style={{ background: t.bg }}
    >
      <div
        className="px-6 pt-6 pb-8"
        style={{ background: `linear-gradient(135deg, ${HOWTO_COLOR}18, ${HOWTO_COLOR}05)`, borderBottom: `1px solid ${t.border}` }}
      >
        <button onClick={onClose} className="flex items-center gap-2 mb-4 text-xs" style={{ color: t.textMuted }}>
          <ArrowLeft size={14} /> Back to How-To
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={item.liveStatus} />
              <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ background: `${HOWTO_COLOR}18`, color: HOWTO_COLOR, border: `1px solid ${HOWTO_COLOR}30` }}>
                {item.category}
              </span>
            </div>
            <h1 className="text-xl" style={{ color: t.text }}>{item.title}</h1>
            <p className="text-xs mt-2 max-w-3xl" style={{ color: t.textMuted, lineHeight: 1.7 }}>{item.description}</p>
          </div>
          <div className="flex items-center gap-3 text-[10px]" style={{ color: t.textMuted }}>
            <span>{item.duration}</span>
            <DifficultyDot level={item.difficulty} />
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        <div className="rounded-2xl p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
          <div className="text-xs uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Goal</div>
          <div className="text-sm mt-2" style={{ color: t.text }}>{content.goal}</div>
          <div className="text-xs uppercase tracking-[0.18em] mt-5" style={{ color: t.textMuted }}>Outcome</div>
          <div className="text-sm mt-2" style={{ color: t.text }}>{content.outcome}</div>
        </div>

        <div className="rounded-2xl p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
          <div className="text-xs uppercase tracking-[0.18em] mb-4" style={{ color: t.textMuted }}>Step-by-step</div>
          <div className="space-y-3">
            {content.steps.map((step, index) => (
              <div key={step} className="flex items-start gap-3 rounded-xl p-4" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0" style={{ background: `${HOWTO_COLOR}18`, color: HOWTO_COLOR }}>
                  {index + 1}
                </div>
                <div className="text-sm" style={{ color: t.text, lineHeight: 1.7 }}>{step}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
            <div className="text-xs uppercase tracking-[0.18em] mb-3" style={{ color: t.textMuted }}>Checklist</div>
            <div className="space-y-2">
              {content.checklist.map(itemText => (
                <div key={itemText} className="flex items-start gap-2 text-sm" style={{ color: t.text }}>
                  <CheckCircle2 size={14} style={{ color: HOWTO_COLOR, marginTop: 2, flexShrink: 0 }} />
                  <span>{itemText}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
            <div className="text-xs uppercase tracking-[0.18em] mb-3" style={{ color: t.textMuted }}>Deliverables</div>
            <div className="space-y-2">
              {content.deliverables.map(itemText => (
                <div key={itemText} className="text-sm rounded-xl px-3 py-2" style={{ background: t.surface2, color: t.text, border: `1px solid ${t.border}` }}>
                  {itemText}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
            <div className="text-xs uppercase tracking-[0.18em] mb-3" style={{ color: t.textMuted }}>Common Pitfalls</div>
            <div className="space-y-2">
              {content.pitfalls.map(itemText => (
                <div key={itemText} className="text-sm" style={{ color: t.textMuted, lineHeight: 1.7 }}>
                  {itemText}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function mapAssessmentId(testId: string): 'mbti' | 'big-five' | 'iq-test' | null {
  if (testId === 't001') return 'mbti';
  if (testId === 't002') return 'big-five';
  if (testId === 't003') return 'iq-test';
  return null;
}

function TestDetail({ test, onClose }: { test: LearnTest; onClose: () => void }) {
  const { currentTheme: t } = useApp();
  const assessmentId = mapAssessmentId(test.id);

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.35, ease: [0.34, 1.05, 0.64, 1] }}
      className="absolute inset-0 overflow-y-auto z-20"
      style={{ background: t.bg }}
    >
      <div
        className="px-6 pt-6 pb-8"
        style={{ background: `linear-gradient(135deg, ${LEARN_COLOR}18, ${LEARN_COLOR}05)`, borderBottom: `1px solid ${t.border}` }}
      >
        <button onClick={onClose} className="flex items-center gap-2 mb-4 text-xs" style={{ color: t.textMuted }}>
          <ArrowLeft size={14} /> Back to Tests
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={test.liveStatus} />
              <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ background: 'rgba(6,182,212,0.15)', color: LEARN_COLOR, border: '1px solid rgba(6,182,212,0.35)' }}>
                {test.category}
              </span>
            </div>
            <h1 className="text-xl" style={{ color: t.text }}>{test.title}</h1>
            <p className="text-xs mt-2 max-w-3xl" style={{ color: t.textMuted, lineHeight: 1.7 }}>{test.description}</p>
          </div>
          <div className="flex items-center gap-3 text-[10px]" style={{ color: t.textMuted }}>
            <span>{test.questionCount}Q</span>
            <span>{test.duration}</span>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {assessmentId ? (
          <div className="rounded-2xl p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>Interactive test</div>
                <div className="text-lg mt-1" style={{ color: t.text }}>Live assessment</div>
              </div>
              <div className="text-xs" style={{ color: t.textMuted }}>History and results save locally in this browser</div>
            </div>
            <InteractiveAssessments assessmentId={assessmentId} />
          </div>
        ) : (
          <div className="rounded-2xl p-5" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
            <div className="text-sm" style={{ color: t.text }}>This test card is mapped, but the interactive version is not wired yet.</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main LearnHub ────────────────────────────────────────

export function LearnHub() {
  const { currentTheme: t } = useApp();
  const { learnTab, setLearnTab, selectedCourse, setSelectedCourse } = useHub();
  const [searchQ, setSearchQ] = useState('');
  const [selectedTest, setSelectedTest] = useState<LearnTest | null>(null);
  const [selectedHowTo, setSelectedHowTo] = useState<HowTo | null>(null);
  const [courseCategoryFilter, setCourseCategoryFilter] = useState('All');
  const [howToFormatFilter, setHowToFormatFilter] = useState('All');

  const activeTab = TAB_CONFIG.find(tb => tb.id === learnTab)!;

  const filteredTests = tests.filter(test =>
    !searchQ || test.title.toLowerCase().includes(searchQ.toLowerCase()) || test.tags.some(tag => tag.includes(searchQ.toLowerCase()))
  );
  const filteredCourses = courses.filter(c =>
    (!searchQ || c.title.toLowerCase().includes(searchQ.toLowerCase())) &&
    (courseCategoryFilter === 'All' || c.category === courseCategoryFilter)
  );
  const filteredHowTos = howTos.filter(h =>
    (!searchQ || h.title.toLowerCase().includes(searchQ.toLowerCase())) &&
    (howToFormatFilter === 'All' || h.format.toLowerCase() === howToFormatFilter.toLowerCase())
  );
  const featuredHowTo = filteredHowTos.find(h => h.featured) ?? null;

  useEffect(() => {
    setSelectedTest(null);
    setSelectedHowTo(null);
    setSelectedCourse(null);
  }, [learnTab, setSelectedCourse]);

  return (
    <div className="relative h-full overflow-hidden">
      <div className="h-full overflow-y-auto pb-20 md:pb-6">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)' }}>
              <BookOpen size={15} style={{ color: LEARN_COLOR }} />
            </div>
            <h1 className="text-lg uppercase tracking-[0.1em]" style={{ color: t.text }}>Learn</h1>
          </div>
          <p className="text-xs" style={{ color: t.textMuted }}>
            Grow with AI — tests, courses, and practical guides
          </p>
        </div>

        {/* Tab switcher */}
        <div className="px-6 mb-6">
          <div className="flex gap-2">
            {TAB_CONFIG.map(tab => (
              <motion.button
                key={tab.id}
                onClick={() => setLearnTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs"
                style={{
                  background: learnTab === tab.id ? `${tab.color}18` : t.surface2,
                  border: `1px solid ${learnTab === tab.id ? tab.color + '50' : t.border}`,
                  color: learnTab === tab.id ? tab.color : t.textMuted,
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Tab hero */}
        <div
          className="mx-6 rounded-2xl p-5 mb-6 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${activeTab.color}15, ${activeTab.color}05)`,
            border: `1px solid ${activeTab.color}25`,
          }}
        >
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 90% 50%, ${activeTab.color}12, transparent 70%)` }} />
          <div className="relative z-10 flex items-center gap-3">
            <span style={{ fontSize: 36 }}>{activeTab.icon}</span>
            <div>
              <h2 className="text-base mb-0.5" style={{ color: t.text }}>{activeTab.label}</h2>
              <p className="text-xs" style={{ color: t.textMuted }}>{activeTab.description}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 mb-6">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
            <Search size={14} style={{ color: t.textMuted }} />
            <input
              type="text"
              placeholder={`Search ${learnTab}...`}
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              className="flex-1 bg-transparent outline-none text-xs"
              style={{ color: t.text }}
            />
            {searchQ && (
              <button onClick={() => setSearchQ('')} style={{ color: t.textMuted }}>
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {learnTab === 'tests' && (
            <motion.div key="tests" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-6">
              {/* Live Now */}
              {filteredTests.filter(t => (t as any).liveStatus === 'live').length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <motion.div className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }}
                      animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} />
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: '#22c55e' }}>Live Now</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTests.filter(t => (t as any).liveStatus === 'live').map(test => (
                      <TestCard key={test.id} test={test as any} onSelect={setSelectedTest} />
                    ))}
                  </div>
                </div>
              )}
              {/* Planned */}
              {filteredTests.filter(t => (t as any).liveStatus === 'planned').length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>Planned Next</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTests.filter(t => (t as any).liveStatus === 'planned').map(test => (
                      <TestCard key={test.id} test={test as any} onSelect={setSelectedTest} />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {learnTab === 'class' && (
            <motion.div key="class" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-6">
              {/* New MVP courses */}
              {filteredCourses.filter(c => c.isNew && (c as any).liveStatus === 'mvp').length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                      style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.35)' }}>
                      Interactive MVP
                    </span>
                    <span className="text-[10px]" style={{ color: t.textMuted }}>— new additions</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredCourses.filter(c => c.isNew && (c as any).liveStatus === 'mvp').map(c => (
                      <CourseCard key={c.id} course={c} onSelect={setSelectedCourse} />
                    ))}
                  </div>
                </div>
              )}
              {/* In progress */}
              {courses.filter(c => c.status === 'in-progress').length > 0 && (
                <div className="mb-6">
                  <p className="text-[10px] uppercase tracking-wider mb-3" style={{ color: t.textMuted }}>In Progress</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {courses.filter(c => c.status === 'in-progress').map(c => (
                      <CourseCard key={c.id} course={c} onSelect={setSelectedCourse} />
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>
                  All Courses · {filteredCourses.length}
                </span>
                <div className="flex items-center gap-2">
                  {['All', 'AI & Tech', 'Creative', 'Business', 'Data'].map(f => (
                    <button key={f} className="text-[10px] px-2 py-1 rounded-lg"
                      onClick={() => setCourseCategoryFilter(f)}
                      style={{ background: f === courseCategoryFilter ? `${CLASS_COLOR}18` : t.surface2, border: `1px solid ${f === courseCategoryFilter ? CLASS_COLOR + '40' : t.border}`, color: f === courseCategoryFilter ? CLASS_COLOR : t.textMuted }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCourses.map(c => (
                  <CourseCard key={c.id} course={c} onSelect={setSelectedCourse} />
                ))}
              </div>
            </motion.div>
          )}

          {learnTab === 'how-to' && (
            <motion.div key="how-to" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: t.textMuted }}>
                  {filteredHowTos.length} guides
                </span>
                <div className="flex gap-2">
                  {['All', 'Video', 'Walkthrough', 'Guide'].map(f => (
                    <button key={f} className="text-[10px] px-2 py-1 rounded-lg"
                      onClick={() => setHowToFormatFilter(f)}
                      style={{ background: f === howToFormatFilter ? `${HOWTO_COLOR}18` : t.surface2, border: `1px solid ${f === howToFormatFilter ? HOWTO_COLOR + '40' : t.border}`, color: f === howToFormatFilter ? HOWTO_COLOR : t.textMuted }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl mb-4 p-4" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
                <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: HOWTO_COLOR }}>Start Here</div>
                <div className="text-sm" style={{ color: t.text }}>Pick one guide, finish the checklist, then move to the next workflow.</div>
              </div>
              {/* Featured */}
              {featuredHowTo && (
                <motion.button
                  type="button"
                  onClick={() => setSelectedHowTo(featuredHowTo)}
                  className="relative rounded-2xl overflow-hidden mb-4 p-5 cursor-pointer w-full text-left"
                  style={{ background: `linear-gradient(135deg, ${HOWTO_COLOR}18, ${HOWTO_COLOR}05)`, border: `1px solid ${HOWTO_COLOR}30` }}>
                  whileHover={{ scale: 1.01, boxShadow: `0 8px 24px ${HOWTO_COLOR}12` }}
                  whileTap={{ scale: 0.99 }}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: HOWTO_COLOR }}>Featured Guide</span>
                  </div>
                  <h3 className="text-sm mb-1" style={{ color: t.text }}>{featuredHowTo.title}</h3>
                  <p className="text-xs mb-3" style={{ color: t.textMuted }}>{featuredHowTo.description}</p>
                  <div className="flex items-center gap-3 text-[10px]" style={{ color: t.textMuted }}>
                    <span>{featuredHowTo.format}</span>
                    <span className="flex items-center gap-0.5"><Clock size={9} />{featuredHowTo.duration}</span>
                    <span>{(featuredHowTo.views / 1000).toFixed(0)}k views</span>
                    <span style={{ color: HOWTO_COLOR }}>Open guide</span>
                  </div>
                </motion.button>
              )}
              <div className="space-y-2">
                {filteredHowTos.map(h => (
                  <HowToCard key={h.id} item={h} onSelect={setSelectedHowTo} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Course detail */}
      <AnimatePresence>
        {selectedCourse && (
          <CourseDetail course={selectedCourse} onClose={() => setSelectedCourse(null)} />
        )}
        {selectedTest && (
          <TestDetail test={selectedTest} onClose={() => setSelectedTest(null)} />
        )}
        {selectedHowTo && (
          <HowToDetail item={selectedHowTo} onClose={() => setSelectedHowTo(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
