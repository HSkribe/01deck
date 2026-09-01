import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, Gamepad2, BookOpen, HelpCircle, GraduationCap, Download, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useModalA11y } from '../hooks/useModalA11y';

interface Option {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  preview: string;
  action: () => void;
}

export function CreateImportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { currentTheme: t, setShowCreator, setShowAgentImport, setWorkspaceSection } = useApp();
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  const options: Option[] = [
    {
      id: 'agent',
      label: 'Agent',
      icon: UserPlus,
      description: 'Create a new AI agent with custom personality, goals, and protocol identity.',
      preview: 'Initializing 01 Protocol... Generating identity hash... Creating .01ai file...',
      action: () => { setShowCreator(true); onClose(); },
    },
    {
      id: 'arcade',
      label: 'Arcade Game',
      icon: Gamepad2,
      description: 'Design a new rhythm or logic-based micro-game for the arcade shelf.',
      preview: 'Loading Canvas engine... Setting up dopamine loops... Wiring audio synthesis...',
      action: () => { setWorkspaceSection('arcade'); onClose(); }, // In a real app, this would open a game creator
    },
    {
      id: 'tests',
      label: 'Tests and Quizzes',
      icon: BookOpen,
      description: 'Build interactive assessments to challenge agents and users alike.',
      preview: 'Parsing question bank... Setting up scoring logic... Calibrating difficulty...',
      action: () => { setWorkspaceSection('learn'); onClose(); },
    },
    {
      id: 'howto',
      label: 'How-To',
      icon: HelpCircle,
      description: 'Create step-by-step guided instructions for complex tasks.',
      preview: 'Structuring steps... Generating visual aids... Linking agent support...',
      action: () => { setWorkspaceSection('learn'); onClose(); },
    },
    {
      id: 'class',
      label: 'Class',
      icon: GraduationCap,
      description: 'Develop a full educational course with multiple modules and lessons.',
      preview: 'Defining syllabus... Organizing modules... Setting up progression path...',
      action: () => { setWorkspaceSection('learn'); onClose(); },
    },
  ];

  const panelRef = useModalA11y<HTMLDivElement>({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-import-modal-title"
          tabIndex={-1}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col md:flex-row h-[600px] focus:outline-none"
          style={{
            background: t.surface1,
            border: `1px solid ${t.border}`,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Left Side: Options */}
          <div className="flex-1 p-8 flex flex-col h-full" style={{ borderRight: `1px solid ${t.border}` }}>
            <div className="flex items-center justify-between mb-8">
              <h2 id="create-import-modal-title" className="text-xl font-medium" style={{ color: t.text }}>I Would Like to Create/Import...?</h2>
              <button type="button" onClick={onClose} aria-label="Close" style={{ color: t.textMuted }}><X size={20} /></button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              {options.map(opt => (
                <motion.button
                  key={opt.id}
                  onMouseEnter={() => setHoveredOption(opt.id)}
                  onMouseLeave={() => setHoveredOption(null)}
                  onClick={opt.action}
                  className="w-full p-4 rounded-2xl text-left flex items-center gap-4 transition-all"
                  style={{
                    background: hoveredOption === opt.id ? `${t.accent}10` : t.surface2,
                    border: `1px solid ${hoveredOption === opt.id ? t.accent : t.border}`,
                  }}
                  whileHover={{ x: 8 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: t.surface3, color: hoveredOption === opt.id ? t.accent : t.textMuted }}
                  >
                    <opt.icon size={24} />
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: t.text }}>{opt.label}</div>
                    <div className="text-xs" style={{ color: t.textMuted }}>{opt.description}</div>
                  </div>
                </motion.button>
              ))}
            </div>
            
            {/* Combined Import Button at bottom */}
            <motion.button
              onClick={() => { setShowAgentImport(true); onClose(); }}
              className="mt-6 p-4 rounded-2xl flex items-center justify-center gap-2 text-sm"
              style={{ background: t.surface3, border: `1px dashed ${t.border}`, color: t.textMuted }}
              whileHover={{ color: t.text, borderColor: t.accent }}
            >
              <Download size={16} />
              <span>Already have a protocol file? Import it here</span>
            </motion.button>
          </div>

          {/* Right Side: Preview */}
          <div className="hidden md:flex w-80 bg-black/20 p-8 flex-col justify-center relative overflow-hidden">
            <AnimatePresence mode="wait">
              {hoveredOption ? (
                <motion.div
                  key={hoveredOption}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="relative z-10"
                >
                  <div className="text-[10px] uppercase tracking-widest mb-4 opacity-50" style={{ color: t.accent }}>Process Preview</div>
                  <div className="font-mono text-xs leading-relaxed" style={{ color: t.accent }}>
                    {options.find(o => o.id === hoveredOption)?.preview.split('...').map((line, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="mb-2"
                      >
                        {line.trim() && `> ${line.trim()}...`}
                      </motion.div>
                    ))}
                  </div>
                  <motion.div 
                    className="mt-8 p-4 rounded-xl border border-dashed text-center text-[10px]"
                    style={{ borderColor: `${t.accent}40`, color: t.accent }}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    DEPLOYMENT READY
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div 
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center"
                  style={{ color: t.textMuted }}
                >
                  <div className="mb-4 opacity-20"><Plus size={48} className="mx-auto" /></div>
                  <div className="text-xs uppercase tracking-widest">Select an option to preview the flow</div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Background decoration */}
            <div className="absolute inset-0 pointer-events-none opacity-10">
              <div className="absolute inset-0" style={{ background: `radial-gradient(circle at center, ${t.accent}40 0%, transparent 70%)` }} />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
