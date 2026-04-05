import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Gamepad2, BookOpen, Pencil, FileText, ArrowRight,
  ChevronLeft, ChevronRight, Check, Zap, Eye, Upload,
  Clock, Users, BarChart, Sparkles,
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { useHub } from '../../../context/HubContext';
import { createTemplates, CreateContentType, CreateTemplate } from '../../../data/hubData';

const CREATE_COLOR = '#f59e0b';

// ─── Status badge ─────────────────────────────────────────

function MVPBadge() {
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider"
      style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.35)' }}>
      Interactive MVP
    </span>
  );
}

// ─── Content type config ──────────────────────────────────

const CONTENT_TYPES: {
  id: CreateContentType;
  label: string;
  description: string;
  icon: React.FC<{ size?: number }>;
  emoji: string;
  color: string;
  examples: string[];
  buildTime: string;
}[] = [
  {
    id: 'game',
    label: 'Game',
    description: 'Design an interactive game powered by your agent. Quizzes, word games, puzzles, adventures.',
    icon: Gamepad2,
    emoji: '🎮',
    color: '#a855f7',
    examples: ['Quiz Battle', 'Word Challenge', 'Escape Scenario', 'Story Collab'],
    buildTime: '15–45 min',
  },
  {
    id: 'test',
    label: 'Test',
    description: 'Build a personality, knowledge, or skills assessment. Your agent interprets results.',
    icon: Pencil,
    emoji: '🧪',
    color: '#06b6d4',
    examples: ['Personality Quiz', 'Knowledge Check', 'Skills Assessment'],
    buildTime: '10–30 min',
  },
  {
    id: 'class',
    label: 'Class',
    description: 'Create a structured learning course with lessons, exercises, and agent-led coaching.',
    icon: BookOpen,
    emoji: '📚',
    color: '#10b981',
    examples: ['Quick Course', 'Deep Dive Series', 'Workshop Format'],
    buildTime: '45 min – 3 hrs',
  },
  {
    id: 'how-to',
    label: 'How-To',
    description: 'Write a practical guide, walkthrough, or tutorial. Fast to make, instantly useful.',
    icon: FileText,
    emoji: '🔧',
    color: CREATE_COLOR,
    examples: ['Step-by-Step Guide', 'Video Walkthrough', 'Quick Reference'],
    buildTime: '10–30 min',
  },
];

// ─── Step indicators ─────────────────────────────────────

const STEPS = ['Type', 'Template', 'Details', 'Build', 'Preview', 'Publish'];

function StepBar({ currentStep }: { currentStep: number }) {
  const { currentTheme: t } = useApp();
  return (
    <div className="flex items-center gap-1 px-6 py-4">
      {STEPS.map((label, idx) => {
        const done = idx < currentStep;
        const active = idx === currentStep;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all"
                style={{
                  background: done ? CREATE_COLOR : active ? `${CREATE_COLOR}25` : t.surface3,
                  border: `1px solid ${done ? CREATE_COLOR : active ? CREATE_COLOR + '60' : t.border}`,
                  color: done ? '#000' : active ? CREATE_COLOR : t.textMuted,
                }}
              >
                {done ? <Check size={12} /> : idx + 1}
              </div>
              <span className="text-[9px] hidden sm:block" style={{ color: active ? CREATE_COLOR : t.textMuted }}>
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mb-4" style={{ background: done ? CREATE_COLOR : t.border }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Step 1: Type select ──────────────────────────────────

function TypeSelect() {
  const { currentTheme: t } = useApp();
  const { updateCreateDraft, setCreateStep } = useHub();

  return (
    <motion.div
      key="type-select"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="px-6 pb-8"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl mb-2" style={{ color: t.text }}>
          What do you want to{' '}
          <span style={{ background: `linear-gradient(90deg, ${CREATE_COLOR}, #f97316)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            create?
          </span>
        </h2>
        <p className="text-sm" style={{ color: t.textMuted }}>
          Your agent will help you build, power, and publish it.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CONTENT_TYPES.map(type => {
          const Icon = type.icon;
          return (
            <motion.button
              key={type.id}
              onClick={() => {
                updateCreateDraft({ type: type.id });
                setCreateStep('template-select');
              }}
              className="text-left p-6 rounded-2xl relative overflow-hidden group"
              style={{ background: t.surface2, border: `1px solid ${t.border}` }}
              whileHover={{ scale: 1.02, borderColor: type.color + '60', boxShadow: `0 12px 48px ${type.color}18` }}
              whileTap={{ scale: 0.97 }}
            >
              {/* Glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 30% 30%, ${type.color}08, transparent 70%)` }} />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: `${type.color}18`, border: `1px solid ${type.color}30` }}>
                    <span style={{ fontSize: 28 }}>{type.emoji}</span>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-lg" style={{ background: t.surface3, color: t.textMuted }}>
                    {type.buildTime}
                  </span>
                </div>

                <h3 className="text-base mb-2" style={{ color: t.text }}>{type.label}</h3>
                <p className="text-xs mb-4 leading-relaxed" style={{ color: t.textMuted }}>{type.description}</p>

                <div className="flex flex-wrap gap-1.5">
                  {type.examples.slice(0, 3).map(ex => (
                    <span key={ex} className="text-[10px] px-2 py-0.5 rounded"
                      style={{ background: `${type.color}12`, color: type.color, border: `1px solid ${type.color}25` }}>
                      {ex}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 mt-4 text-xs"
                  style={{ color: type.color }}>
                  Start creating <ArrowRight size={12} />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Step 2: Template select ──────────────────────────────

function TemplateSelect() {
  const { currentTheme: t } = useApp();
  const { createDraft, updateCreateDraft, setCreateStep } = useHub();
  const typeDef = CONTENT_TYPES.find(c => c.id === createDraft.type)!;
  const templates = createTemplates[createDraft.type!] ?? [];

  return (
    <motion.div
      key="template-select"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="px-6 pb-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setCreateStep('type-select')} className="flex items-center gap-1 text-xs" style={{ color: t.textMuted }}>
          <ChevronLeft size={14} /> Back
        </button>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 20 }}>{typeDef?.emoji}</span>
          <h2 className="text-base" style={{ color: t.text }}>{typeDef?.label} — Choose a Template</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {templates.map(template => {
          const diffColor: Record<string, string> = { easy: '#10b981', medium: '#06b6d4', hard: '#f59e0b', expert: '#ef4444' };
          return (
            <motion.button
              key={template.id}
              onClick={() => {
                updateCreateDraft({ templateId: template.id });
                setCreateStep('details');
              }}
              className="text-left p-5 rounded-2xl"
              style={{ background: t.surface2, border: `1px solid ${t.border}` }}
              whileHover={{ scale: 1.02, borderColor: typeDef?.color + '50' }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm" style={{ color: t.text }}>{template.name}</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${diffColor[template.difficulty]}15`, color: diffColor[template.difficulty] }}>
                  {template.difficulty}
                </span>
              </div>
              <p className="text-xs mb-3 leading-relaxed" style={{ color: t.textMuted }}>{template.description}</p>
              <div className="flex items-center gap-1 text-[10px]" style={{ color: t.textMuted }}>
                <Clock size={10} /> ~{template.estimatedBuildTime} to build
              </div>
            </motion.button>
          );
        })}

        {/* Blank */}
        <motion.button
          onClick={() => { updateCreateDraft({ templateId: 'blank' }); setCreateStep('details'); }}
          className="text-left p-5 rounded-2xl border-dashed"
          style={{ background: 'transparent', border: `1px dashed ${t.border}` }}
          whileHover={{ scale: 1.02, borderColor: CREATE_COLOR + '50' }}
          whileTap={{ scale: 0.97 }}
        >
          <div className="flex items-center justify-center h-full flex-col gap-2 py-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
              <Sparkles size={18} style={{ color: CREATE_COLOR }} />
            </div>
            <p className="text-xs" style={{ color: t.textMuted }}>Start from blank</p>
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Step 3: Details ──────────────────────────────────────

function DetailsForm() {
  const { currentTheme: t } = useApp();
  const { createDraft, updateCreateDraft, setCreateStep } = useHub();

  const inputStyle = {
    background: t.surface2,
    border: `1px solid ${t.border}`,
    borderRadius: 12,
    color: t.text,
    padding: '10px 14px',
    width: '100%',
    outline: 'none',
    fontSize: 13,
  };

  return (
    <motion.div
      key="details"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="px-6 pb-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setCreateStep('template-select')} className="flex items-center gap-1 text-xs" style={{ color: t.textMuted }}>
          <ChevronLeft size={14} /> Back
        </button>
        <h2 className="text-base" style={{ color: t.text }}>Set the Details</h2>
      </div>

      <div className="space-y-4 max-w-xl">
        {/* Title */}
        <div>
          <label className="text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: t.textMuted }}>Title *</label>
          <input
            style={inputStyle}
            placeholder={`e.g. "${
              createDraft.type === 'game' ? 'Epic Word Scramble Challenge' :
              createDraft.type === 'test' ? 'Are You a Creative Thinker?' :
              createDraft.type === 'class' ? 'Introduction to AI for Marketers' :
              'How to Set Up a Marketing Agent in 5 Steps'
            }"`}
            value={createDraft.title}
            onChange={e => updateCreateDraft({ title: e.target.value })}
          />
        </div>

        {/* Topic */}
        <div>
          <label className="text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: t.textMuted }}>Topic / Subject *</label>
          <input
            style={inputStyle}
            placeholder="What is this about?"
            value={createDraft.topic}
            onChange={e => updateCreateDraft({ topic: e.target.value })}
          />
        </div>

        {/* Audience */}
        <div>
          <label className="text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: t.textMuted }}>Target Audience</label>
          <input
            style={inputStyle}
            placeholder="e.g. Beginners, Marketers, Developers, Teams"
            value={createDraft.audience}
            onChange={e => updateCreateDraft({ audience: e.target.value })}
          />
        </div>

        {/* Duration + Difficulty */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: t.textMuted }}>
              <Clock size={10} className="inline mr-1" /> Duration
            </label>
            <select
              style={{ ...inputStyle, padding: '10px 14px' }}
              value={createDraft.duration}
              onChange={e => updateCreateDraft({ duration: e.target.value })}
            >
              {['< 5 min', '5–10 min', '10–20 min', '20–30 min', '30–60 min', '1 hr+'].map(d => (
                <option key={d} value={d} style={{ background: t.surface1 }}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: t.textMuted }}>
              <BarChart size={10} className="inline mr-1" /> Difficulty
            </label>
            <select
              style={{ ...inputStyle, padding: '10px 14px' }}
              value={createDraft.difficulty}
              onChange={e => updateCreateDraft({ difficulty: e.target.value })}
            >
              {['easy', 'medium', 'hard', 'expert'].map(d => (
                <option key={d} value={d} style={{ background: t.surface1 }} className="capitalize">{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: t.textMuted }}>Description</label>
          <textarea
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 } as any}
            rows={3}
            placeholder="Describe what users will get from this..."
            value={createDraft.description}
            onChange={e => updateCreateDraft({ description: e.target.value })}
          />
        </div>

        {/* Agent picker */}
        <div>
          <label className="text-[10px] uppercase tracking-wider block mb-1.5" style={{ color: t.textMuted }}>Powered by Agent</label>
          <div className="grid grid-cols-3 gap-2">
            {['ARIA', 'NEXUS', 'LYRA', 'ATLAS', 'ORION', 'NOVA'].map(agent => (
              <motion.button key={agent}
                className="py-2 rounded-xl text-xs"
                style={{ background: agent === 'ARIA' ? `${CREATE_COLOR}18` : t.surface2, border: `1px solid ${agent === 'ARIA' ? CREATE_COLOR + '50' : t.border}`, color: agent === 'ARIA' ? CREATE_COLOR : t.textMuted }}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                {agent}
              </motion.button>
            ))}
          </div>
        </div>

        <motion.button
          onClick={() => setCreateStep('build')}
          disabled={!createDraft.title || !createDraft.topic}
          className="w-full py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2"
          style={{
            background: createDraft.title && createDraft.topic ? `linear-gradient(135deg, ${CREATE_COLOR}30, ${CREATE_COLOR}15)` : t.surface3,
            border: `1px solid ${createDraft.title && createDraft.topic ? CREATE_COLOR + '50' : t.border}`,
            color: createDraft.title && createDraft.topic ? t.text : t.textMuted,
            cursor: createDraft.title && createDraft.topic ? 'pointer' : 'not-allowed',
          }}
          whileHover={createDraft.title && createDraft.topic ? { scale: 1.02 } : {}}
          whileTap={createDraft.title && createDraft.topic ? { scale: 0.98 } : {}}
        >
          <Zap size={15} style={{ color: CREATE_COLOR }} />
          Continue to Builder
          <ArrowRight size={15} />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Step 4: Build ────────────────────────────────────────

function BuildStep() {
  const { currentTheme: t } = useApp();
  const { createDraft, setCreateStep } = useHub();
  const typeDef = CONTENT_TYPES.find(c => c.id === createDraft.type);

  return (
    <motion.div
      key="build"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      className="px-6 pb-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setCreateStep('details')} className="flex items-center gap-1 text-xs" style={{ color: t.textMuted }}>
          <ChevronLeft size={14} /> Back
        </button>
        <h2 className="text-base" style={{ color: t.text }}>Build · <span style={{ color: t.textMuted }}>{createDraft.title || 'Untitled'}</span></h2>
      </div>

      {/* AI assist banner */}
      <div
        className="flex items-center gap-3 p-4 rounded-xl mb-6"
        style={{ background: `${CREATE_COLOR}10`, border: `1px solid ${CREATE_COLOR}25` }}
      >
        <Sparkles size={16} style={{ color: CREATE_COLOR }} />
        <div>
          <p className="text-xs" style={{ color: t.text }}>Agent assist is active</p>
          <p className="text-[10px]" style={{ color: t.textMuted }}>
            Your agent will suggest content as you build. Accept, edit, or ignore any suggestion.
          </p>
        </div>
        <motion.button
          className="ml-auto px-3 py-1.5 rounded-lg text-xs flex-shrink-0"
          style={{ background: `${CREATE_COLOR}20`, color: CREATE_COLOR, border: `1px solid ${CREATE_COLOR}40` }}
          whileHover={{ scale: 1.04 }}
        >
          Generate draft
        </motion.button>
      </div>

      {/* Content blocks */}
      <div className="space-y-3 mb-6">
        {createDraft.type === 'game' && (
          <>
            {['Opening / Setup', 'Round 1', 'Round 2', 'Scoring Rules', 'Ending / Result'].map((block, i) => (
              <div key={block} className="p-4 rounded-xl" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs" style={{ color: typeDef?.color ?? CREATE_COLOR }}>{block}</span>
                  <div className="flex gap-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: t.surface3, color: t.textMuted }}>Edit</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: t.surface3, color: t.textMuted }}>✨ AI</span>
                  </div>
                </div>
                <div className="h-6 rounded" style={{ background: t.surface3, width: i === 0 ? '80%' : i === 1 ? '60%' : '40%' }} />
              </div>
            ))}
          </>
        )}
        {createDraft.type === 'test' && (
          <>
            {[1, 2, 3].map(q => (
              <div key={q} className="p-4 rounded-xl" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs" style={{ color: typeDef?.color ?? CREATE_COLOR }}>Question {q}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: t.surface3, color: t.textMuted }}>Multiple Choice</span>
                </div>
                <div className="h-5 rounded mb-3" style={{ background: t.surface3, width: '70%' }} />
                <div className="grid grid-cols-2 gap-2">
                  {['A', 'B', 'C', 'D'].map(opt => (
                    <div key={opt} className="h-7 rounded-lg" style={{ background: t.surface3 }} />
                  ))}
                </div>
              </div>
            ))}
            <motion.button
              className="w-full py-3 rounded-xl text-xs border-dashed"
              style={{ border: `1px dashed ${t.border}`, color: t.textMuted }}
              whileHover={{ borderColor: typeDef?.color + '60', color: typeDef?.color }}
            >
              + Add Question
            </motion.button>
          </>
        )}
        {(createDraft.type === 'class' || createDraft.type === 'how-to') && (
          <>
            {['Introduction', 'Section 1', 'Section 2', 'Summary'].map((s, i) => (
              <div key={s} className="p-4 rounded-xl" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs" style={{ color: typeDef?.color ?? CREATE_COLOR }}>{s}</span>
                  <div className="flex gap-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: t.surface3, color: t.textMuted }}>Edit</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 rounded" style={{ background: t.surface3, width: '85%' }} />
                  <div className="h-3 rounded" style={{ background: t.surface3, width: '65%' }} />
                  {i === 0 && <div className="h-3 rounded" style={{ background: t.surface3, width: '50%' }} />}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="flex gap-3">
        <motion.button
          className="flex-1 py-3 rounded-xl text-sm"
          style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.textMuted }}
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
        >
          Save Draft
        </motion.button>
        <motion.button
          onClick={() => setCreateStep('preview')}
          className="flex-[2] py-3 rounded-xl text-sm flex items-center justify-center gap-2"
          style={{ background: `${CREATE_COLOR}20`, border: `1px solid ${CREATE_COLOR}50`, color: t.text }}
          whileHover={{ scale: 1.02, boxShadow: `0 0 24px ${CREATE_COLOR}25` }} whileTap={{ scale: 0.98 }}
        >
          <Eye size={15} style={{ color: CREATE_COLOR }} />
          Preview
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Step 5: Preview ──────────────────────────────────────

function PreviewStep() {
  const { currentTheme: t } = useApp();
  const { createDraft, setCreateStep } = useHub();
  const typeDef = CONTENT_TYPES.find(c => c.id === createDraft.type);

  return (
    <motion.div
      key="preview"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      className="px-6 pb-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setCreateStep('build')} className="flex items-center gap-1 text-xs" style={{ color: t.textMuted }}>
          <ChevronLeft size={14} /> Back to Builder
        </button>
        <h2 className="text-base" style={{ color: t.text }}>Preview</h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto" style={{ background: 'rgba(245,158,11,0.15)', color: CREATE_COLOR }}>
          Draft
        </span>
      </div>

      {/* Mock preview card */}
      <div
        className="rounded-2xl overflow-hidden mb-6"
        style={{ background: t.surface1, border: `1px solid ${t.border}` }}
      >
        <div
          className="h-48 flex items-center justify-center relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${typeDef?.color ?? CREATE_COLOR}25, ${typeDef?.color ?? CREATE_COLOR}08)` }}
        >
          <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 50%, ${typeDef?.color ?? CREATE_COLOR}15, transparent 70%)` }} />
          <span style={{ fontSize: 72, position: 'relative', zIndex: 1 }}>{typeDef?.emoji ?? '✨'}</span>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider"
              style={{ background: `${typeDef?.color ?? CREATE_COLOR}18`, color: typeDef?.color ?? CREATE_COLOR, border: `1px solid ${(typeDef?.color ?? CREATE_COLOR) + '30'}` }}>
              {createDraft.type?.toUpperCase()}
            </span>
          </div>
          <h3 className="text-lg mb-1" style={{ color: t.text }}>{createDraft.title || 'Untitled'}</h3>
          <p className="text-xs mb-4" style={{ color: t.textMuted }}>{createDraft.description || createDraft.topic || 'No description yet'}</p>
          <div className="flex items-center gap-4 text-[10px]" style={{ color: t.textMuted }}>
            {createDraft.duration && <span className="flex items-center gap-1"><Clock size={10} />{createDraft.duration}</span>}
            {createDraft.audience && <span className="flex items-center gap-1"><Users size={10} />{createDraft.audience}</span>}
            {createDraft.difficulty && <span className="capitalize">{createDraft.difficulty}</span>}
          </div>
          <motion.button
            className="w-full mt-4 py-3 rounded-xl text-sm"
            style={{ background: `${typeDef?.color ?? CREATE_COLOR}20`, border: `1px solid ${(typeDef?.color ?? CREATE_COLOR) + '40'}`, color: t.text }}
            whileHover={{ scale: 1.01 }}
          >
            {createDraft.type === 'game' ? 'Play' : createDraft.type === 'test' ? 'Take Test' : createDraft.type === 'class' ? 'Start Course' : 'Read Guide'}
          </motion.button>
        </div>
      </div>

      <div className="flex gap-3">
        <motion.button
          className="flex-1 py-3 rounded-xl text-sm"
          style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.textMuted }}
          whileHover={{ scale: 1.01 }}
          onClick={() => setCreateStep('build')}
        >
          Edit More
        </motion.button>
        <motion.button
          onClick={() => setCreateStep('publish')}
          className="flex-[2] py-3 rounded-xl text-sm flex items-center justify-center gap-2"
          style={{ background: `linear-gradient(135deg, ${CREATE_COLOR}30, ${CREATE_COLOR}15)`, border: `1px solid ${CREATE_COLOR}50`, color: t.text }}
          whileHover={{ scale: 1.02, boxShadow: `0 0 24px ${CREATE_COLOR}25` }} whileTap={{ scale: 0.98 }}
        >
          <Upload size={15} style={{ color: CREATE_COLOR }} />
          Publish
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Step 6: Publish ──────────────────────────────────────

function PublishStep() {
  const { currentTheme: t } = useApp();
  const { createDraft, resetCreate, setCreateStep } = useHub();
  const typeDef = CONTENT_TYPES.find(c => c.id === createDraft.type);

  return (
    <motion.div
      key="publish"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="px-6 pb-8 flex flex-col items-center text-center"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 mt-4"
        style={{ background: `${CREATE_COLOR}20`, border: `2px solid ${CREATE_COLOR}50` }}
      >
        <span style={{ fontSize: 48 }}>{typeDef?.emoji ?? '🎉'}</span>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <h2 className="text-2xl mb-2" style={{ color: t.text }}>Published! 🎉</h2>
        <p className="text-sm mb-1" style={{ color: t.textMuted }}>
          <span style={{ color: t.text }}>{createDraft.title || 'Your content'}</span> is live in the Hub.
        </p>
        <p className="text-xs mb-8" style={{ color: t.textMuted }}>
          It's available in your Library and searchable by others.
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
          <motion.button
            className="py-3 rounded-xl text-sm flex items-center justify-center gap-2"
            style={{ background: `${CREATE_COLOR}20`, border: `1px solid ${CREATE_COLOR}50`, color: t.text }}
            whileHover={{ scale: 1.02 }}
          >
            <Eye size={14} style={{ color: CREATE_COLOR }} /> View Published
          </motion.button>
          <motion.button
            onClick={resetCreate}
            className="py-3 rounded-xl text-sm"
            style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.textMuted }}
            whileHover={{ scale: 1.02 }}
          >
            Create Something Else
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main CreateHub ───────────────────────────────────────

const STEP_INDEX: Record<string, number> = {
  'type-select': 0, 'template-select': 1, 'details': 2, 'build': 3, 'preview': 4, 'publish': 5,
};

export function CreateHub() {
  const { currentTheme: t } = useApp();
  const { createStep } = useHub();

  return (
    <div className="h-full overflow-y-auto pb-20 md:pb-6">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: `${CREATE_COLOR}15`, border: `1px solid ${CREATE_COLOR}30` }}>
            <Sparkles size={15} style={{ color: CREATE_COLOR }} />
          </div>
          <h1 className="text-lg uppercase tracking-[0.1em]" style={{ color: t.text }}>Create</h1>
        </div>
        <p className="text-xs" style={{ color: t.textMuted }}>Build games, tests, classes, and guides — powered by your agents</p>
      </div>

      {/* Step bar */}
      {createStep !== 'type-select' && <StepBar currentStep={STEP_INDEX[createStep]} />}

      {/* Content */}
      <AnimatePresence mode="wait">
        {createStep === 'type-select' && <TypeSelect key="type-select" />}
        {createStep === 'template-select' && <TemplateSelect key="template-select" />}
        {createStep === 'details' && <DetailsForm key="details" />}
        {createStep === 'build' && <BuildStep key="build" />}
        {createStep === 'preview' && <PreviewStep key="preview" />}
        {createStep === 'publish' && <PublishStep key="publish" />}
      </AnimatePresence>
    </div>
  );
}