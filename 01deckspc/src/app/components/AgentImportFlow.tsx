import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Eye, Trash2, CheckCircle, AlertCircle, FolderOpen } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Agent } from '../data/agents';

interface FoundAgent {
  id: string;
  name: string;
  path: string;
  size: string;
  selected: boolean;
  action: 'ignore' | 'convert' | 'view' | 'delete';
}

export function AgentImportFlow() {
  const { currentTheme: t, addAgent, showAgentImport, setShowAgentImport } = useApp();
  const [step, setStep] = useState<'intro' | 'searching' | 'results' | 'converting' | 'complete'>('intro');
  const [foundAgents, setFoundAgents] = useState<FoundAgent[]>([]);
  const [convertedCount, setConvertedCount] = useState(0);

  const handleClose = () => {
    setShowAgentImport(false);
    setStep('intro');
  };

  const handleFindAgents = () => {
    setStep('searching');
    // Simulate search
    setTimeout(() => {
      // Mock found agents
      const mockFoundAgents: FoundAgent[] = [
        {
          id: 'found-1',
          name: 'ChatGPT Assistant',
          path: '/Users/Documents/AI/chatgpt_assistant.txt',
          size: '2.3 KB',
          selected: false,
          action: 'ignore',
        },
        {
          id: 'found-2',
          name: 'Claude Coding Helper',
          path: '/Users/Documents/AI/claude_coding.json',
          size: '5.1 KB',
          selected: false,
          action: 'ignore',
        },
        {
          id: 'found-3',
          name: 'Gemini Research',
          path: '/Users/Desktop/gemini_research.txt',
          size: '1.8 KB',
          selected: false,
          action: 'ignore',
        },
      ];
      setFoundAgents(mockFoundAgents);
      setStep('results');
    }, 2000);
  };

  const handleConvert = () => {
    setStep('converting');
    const agentsToConvert = foundAgents.filter(a => a.action === 'convert');
    
    // Simulate conversion process
    setTimeout(() => {
      agentsToConvert.forEach((foundAgent, index) => {
        setTimeout(() => {
          // Create a new agent from the found agent data
          const newAgent: Agent = {
            id: `imported-${Date.now()}-${index}`,
            name: foundAgent.name.toUpperCase().replace(/\s+/g, '_'),
            category: 'research',
            role: 'Imported Agent',
            description: `Converted from ${foundAgent.path}`,
            specialization: 'General Purpose AI Assistant',
            lastUsed: new Date(),
            rarity: 'common',
            rarityCount: 'Unlimited',
            portrait: 'https://images.unsplash.com/photo-1681887001651-a15c749c1ab0?w=400&h=560&fit=crop',
            tools: ['Text Processing', 'Conversation', 'Analysis'],
            memoryNotes: 'Imported agent with persistent memory system.',
            online: true,
            tags: ['imported', 'converted', '01protocol'],
            stats: [
              { label: 'Intelligence', value: 75 },
              { label: 'Speed', value: 80 },
              { label: 'Accuracy', value: 78 },
              { label: 'Depth', value: 70 },
            ],
            protocolVersion: '01P v3.0',
            protocolId: `PRO-IMP-${Date.now()}-${index}`,
            chatOpening: 'Hello! I have been converted to the 01Protocol.',
            isUserCreated: true,
            isVerified: false, // Imported agents are not verified by default
            memoryMode: 'always_on',
            goal: 'Assist users with general tasks',
          };
          
          addAgent(newAgent);
          setConvertedCount(prev => prev + 1);
        }, index * 500);
      });
      
      setTimeout(() => {
        setStep('complete');
      }, agentsToConvert.length * 500 + 500);
    }, 1000);
  };

  const updateAgentAction = (id: string, action: 'ignore' | 'convert' | 'view' | 'delete') => {
    setFoundAgents(prev =>
      prev.map(a => (a.id === id ? { ...a, action, selected: action !== 'ignore' } : a))
    );
  };

  const renderContent = () => {
    switch (step) {
      case 'intro':
        return (
          <div className="p-8 text-center">
            <div
              className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${t.accent}20, ${t.accent}10)`,
                border: `2px solid ${t.border}`,
              }}
            >
              <FolderOpen size={36} style={{ color: t.accent }} />
            </div>
            <h2 className="text-2xl mb-3" style={{ color: t.text }}>
              Import Existing AI Agents
            </h2>
            <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: t.textMuted }}>
              Would you like to convert your existing AI agent prompts to the 01Protocol?
              <br />
              <br />
              <span className="text-xs" style={{ color: t.textMuted, opacity: 0.7 }}>
                Note: A backup copy of your original agents will be generated before any conversion begins.
              </span>
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleFindAgents}
                className="px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105"
                style={{
                  background: t.accent,
                  color: t.isDark ? '#000' : '#fff',
                }}
              >
                Find AI Agents
              </button>
              <button
                onClick={handleClose}
                className="px-6 py-3 rounded-lg font-semibold transition-all"
                style={{
                  background: t.surface2,
                  color: t.text,
                  border: `1px solid ${t.border}`,
                }}
              >
                Skip for Now
              </button>
            </div>
          </div>
        );

      case 'searching':
        return (
          <div className="p-8 text-center">
            <motion.div
              className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${t.accent}20, ${t.accent}10)`,
                border: `2px solid ${t.accent}`,
              }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            >
              <Search size={28} style={{ color: t.accent }} />
            </motion.div>
            <h2 className="text-xl mb-2" style={{ color: t.text }}>
              Searching for AI Agents...
            </h2>
            <p className="text-sm" style={{ color: t.textMuted }}>
              Scanning your computer for agent prompts and configurations
            </p>
          </div>
        );

      case 'results':
        return (
          <div className="p-6">
            <h2 className="text-xl mb-4" style={{ color: t.text }}>
              Found {foundAgents.length} Agent{foundAgents.length !== 1 ? 's' : ''}
            </h2>
            <div
              className="space-y-2 mb-6 max-h-96 overflow-y-auto rounded-lg p-3"
              style={{ background: t.surface2 }}
            >
              {foundAgents.map(agent => (
                <div
                  key={agent.id}
                  className="rounded-lg p-3"
                  style={{
                    background: agent.selected ? `${t.accent}10` : t.surface1,
                    border: `1px solid ${agent.selected ? t.accent : t.border}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-sm" style={{ color: t.text }}>
                        {agent.name}
                      </div>
                      <div className="text-xs font-mono" style={{ color: t.textMuted }}>
                        {agent.path}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: t.textMuted }}>
                        {agent.size}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateAgentAction(agent.id, 'convert')}
                      className="flex-1 px-3 py-1.5 rounded text-xs transition-all"
                      style={{
                        background: agent.action === 'convert' ? t.accent : t.surface3,
                        color: agent.action === 'convert' ? (t.isDark ? '#000' : '#fff') : t.text,
                        border: `1px solid ${agent.action === 'convert' ? t.accent : t.border}`,
                      }}
                    >
                      Add to Conversion
                    </button>
                    <button
                      onClick={() => updateAgentAction(agent.id, 'view')}
                      className="px-3 py-1.5 rounded text-xs transition-all"
                      style={{
                        background: t.surface3,
                        color: t.text,
                        border: `1px solid ${t.border}`,
                      }}
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => updateAgentAction(agent.id, 'delete')}
                      className="px-3 py-1.5 rounded text-xs transition-all"
                      style={{
                        background: agent.action === 'delete' ? '#ef4444' : t.surface3,
                        color: agent.action === 'delete' ? '#fff' : t.text,
                        border: `1px solid ${agent.action === 'delete' ? '#ef4444' : t.border}`,
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-lg text-sm transition-all"
                style={{
                  background: t.surface2,
                  color: t.text,
                  border: `1px solid ${t.border}`,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConvert}
                disabled={!foundAgents.some(a => a.action === 'convert')}
                className="px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: t.accent,
                  color: t.isDark ? '#000' : '#fff',
                }}
              >
                Convert Selected ({foundAgents.filter(a => a.action === 'convert').length})
              </button>
            </div>
          </div>
        );

      case 'converting':
        return (
          <div className="p-8 text-center">
            <motion.div
              className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${t.accent}20, ${t.accent}10)`,
                border: `2px solid ${t.accent}`,
              }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              <CheckCircle size={28} style={{ color: t.accent }} />
            </motion.div>
            <h2 className="text-xl mb-2" style={{ color: t.text }}>
              Converting Agents...
            </h2>
            <p className="text-sm" style={{ color: t.textMuted }}>
              {convertedCount} of {foundAgents.filter(a => a.action === 'convert').length} converted
            </p>
          </div>
        );

      case 'complete':
        return (
          <div className="p-8 text-center">
            <div
              className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, #22c55e20, #22c55e10)`,
                border: `2px solid #22c55e`,
              }}
            >
              <CheckCircle size={36} style={{ color: '#22c55e' }} />
            </div>
            <h2 className="text-2xl mb-3" style={{ color: t.text }}>
              Conversion Complete!
            </h2>
            <p className="text-sm mb-6" style={{ color: t.textMuted }}>
              Successfully converted {convertedCount} agent{convertedCount !== 1 ? 's' : ''} to 01Protocol.
              <br />
              Backup files have been created in your original directories.
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105"
              style={{
                background: t.accent,
                color: t.isDark ? '#000' : '#fff',
              }}
            >
              Get Started
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {showAgentImport && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="relative rounded-2xl shadow-2xl overflow-hidden"
            style={{
              background: t.surface1,
              border: `1px solid ${t.border}`,
              maxWidth: 600,
              width: '90%',
              maxHeight: '90vh',
            }}
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={e => e.stopPropagation()}
          >
            {step !== 'intro' && step !== 'complete' && (
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-full transition-all hover:bg-white/10 z-10"
                style={{ color: t.textMuted }}
              >
                <X size={20} />
              </button>
            )}
            {renderContent()}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}