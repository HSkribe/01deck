import React, { useMemo, useState } from 'react';
import { BookOpen, ChevronRight, Compass, Gamepad2, Library, LucideIcon, Rocket, Sparkles, Trophy, UserCircle2 } from 'lucide-react';
import { useApp, type WorkspaceSectionId } from '../../context/AppContext';
import { AgentOptimizationPlugin } from '../../plugins/AgentOptimizationPlugin';
import { arcadeCategories, arcadeGames, type ArcadeGame } from '../../data/arcade';
import { creatorTemplates } from '../../data/creator';
import { learnItems, learnSections, type LearnSectionId } from '../../data/learn';
import { ProtocolMatch } from '../games/ProtocolMatch';
import { AgentChess } from '../games/AgentChess';
import { AgentChoice } from '../games/AgentChoice';
import { TwentyQuestionsRemix } from '../games/TwentyQuestionsRemix';
import { RiddleRace } from '../games/RiddleRace';
import { TriviaQuizzes } from '../games/TriviaQuizzes';
import { InteractiveAssessments } from '../learn/InteractiveAssessments';
import { IS_FOUNDRY_PRODUCT } from '../../utils/productMode';

const sectionMeta: Record<WorkspaceSectionId, { label: string; eyebrow: string; icon: LucideIcon; accent: string }> = {
  foundry: { label: '01FOUNDRY', eyebrow: 'Support optimization', icon: Compass, accent: '#7dd3fc' },
  deck: { label: 'Deck', eyebrow: 'Agent workspace', icon: Sparkles, accent: '#ffffff' },
  arcade: { label: 'Arcade', eyebrow: 'Play with agents', icon: Gamepad2, accent: '#a855f7' },
  learn: { label: 'Learn', eyebrow: 'Grow with agents', icon: BookOpen, accent: '#22c55e' },
  create: { label: 'Create', eyebrow: 'Publish your own content', icon: Rocket, accent: '#f59e0b' },
  library: { label: 'Library', eyebrow: 'Saved, in progress, and published', icon: Library, accent: '#38bdf8' },
  profile: { label: 'Profile', eyebrow: 'Identity, streaks, and creator stats', icon: UserCircle2, accent: '#f472b6' },
};

function statusPillColor(status: ArcadeGame['status']) {
  if (status === 'live') return { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#4ade80' };
  if (status === 'prototype') return { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.32)', color: '#fbbf24' };
  return { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.24)', color: '#cbd5e1' };
}

export function WorkspaceSection() {
  const { workspaceSection } = useApp();

  if (workspaceSection === 'foundry') return IS_FOUNDRY_PRODUCT ? <AgentOptimizationPlugin /> : null;
  if (workspaceSection === 'arcade') return <ArcadeSection />;
  if (workspaceSection === 'learn') return <LearnSection />;
  if (workspaceSection === 'create') return <CreateSection />;
  if (workspaceSection === 'library') return <LibrarySection />;
  if (workspaceSection === 'profile') return <ProfileSection />;
  return null;
}

function SectionScaffold({
  section,
  title,
  subtitle,
  actions,
  children,
}: {
  section: WorkspaceSectionId;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { currentTheme: t } = useApp();
  const meta = sectionMeta[section];
  const Icon = meta.icon;

  return (
    <div className="px-6 pb-8">
      <div
        className="rounded-[28px] p-6 mb-6 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${meta.accent}18 0%, ${t.surface1} 35%, ${t.surface2} 100%)`,
          border: `1px solid ${t.border}`,
          boxShadow: `0 18px 48px ${t.glow}`,
        }}
      >
        <div
          className="absolute -right-16 -top-16 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: `${meta.accent}18`, filter: 'blur(18px)' }}
        />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: t.textMuted }}>
              <Icon size={14} style={{ color: meta.accent }} />
              <span>{meta.eyebrow}</span>
            </div>
            <h1 className="text-3xl mt-3" style={{ color: t.text }}>{title}</h1>
            <p className="text-sm mt-3 max-w-2xl" style={{ color: t.textMuted, lineHeight: 1.7 }}>
              {subtitle}
            </p>
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function Surface({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { currentTheme: t } = useApp();

  return (
    <div
      className={`rounded-3xl ${className}`}
      style={{
        background: t.surface1,
        border: `1px solid ${t.border}`,
      }}
    >
      {children}
    </div>
  );
}

function ArcadeSection() {
  const { currentTheme: t, chatAgent, setChatAgent } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<'all' | typeof arcadeCategories[number]['id']>('all');
  const [selectedGameId, setSelectedGameId] = useState<string>(arcadeGames[0]?.id ?? '');

  const visibleGames = useMemo(() => (
    selectedCategory === 'all'
      ? arcadeGames
      : arcadeGames.filter(game => game.category === selectedCategory)
  ), [selectedCategory]);

  const selectedGame = arcadeGames.find(game => game.id === selectedGameId) ?? visibleGames[0] ?? arcadeGames[0];

  return (
    <SectionScaffold
      section="arcade"
      title="Arcade"
      subtitle="A real game shelf for 01Deck. Discover quick-play challenges, agent-led experiments, and social mind games, then drop straight into live sessions when a game is ready."
      actions={(
        <>
          <ActionPill label={chatAgent ? `Playing with ${chatAgent.name}` : 'Select an agent in chat'} accent="#a855f7" />
          <ActionPill label={`${arcadeGames.filter(game => game.status === 'live').length} live now`} accent="#22c55e" />
          <ActionPill label="10 game concepts mapped" accent="#38bdf8" />
        </>
      )}
    >
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Surface className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em]" style={{ color: t.textMuted }}>Browse Arcade</div>
              <div className="text-lg mt-1" style={{ color: t.text }}>Featured games and quick starts</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterChip label="All" active={selectedCategory === 'all'} onClick={() => setSelectedCategory('all')} />
              {arcadeCategories.map(category => (
                <FilterChip
                  key={category.id}
                  label={category.label}
                  active={selectedCategory === category.id}
                  onClick={() => setSelectedCategory(category.id)}
                />
              ))}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {visibleGames.map(game => {
              const status = statusPillColor(game.status);
              const active = selectedGame?.id === game.id;
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => setSelectedGameId(game.id)}
                  className="text-left rounded-2xl p-4 transition-all"
                  style={{
                    background: active ? `${t.accent}10` : t.surface2,
                    border: `1px solid ${active ? t.accent : t.border}`,
                    boxShadow: active ? `0 12px 28px ${t.glow}` : 'none',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm" style={{ color: t.text }}>{game.name}</div>
                      <p className="text-xs mt-1" style={{ color: t.textMuted, lineHeight: 1.6 }}>{game.description}</p>
                    </div>
                    <span
                      className="px-2 py-1 rounded-full text-[10px] uppercase tracking-[0.16em]"
                      style={{ background: status.bg, border: `1px solid ${status.border}`, color: status.color }}
                    >
                      {game.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <MetaTag>{game.duration}</MetaTag>
                    <MetaTag>{game.players}</MetaTag>
                    <MetaTag>{game.difficulty}</MetaTag>
                  </div>
                </button>
              );
            })}
          </div>
        </Surface>

        <Surface className="p-5">
          {selectedGame ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em]" style={{ color: t.textMuted }}>Game detail</div>
                  <div className="text-xl mt-1" style={{ color: t.text }}>{selectedGame.name}</div>
                </div>
                <div className="text-xs px-3 py-1 rounded-full" style={{ background: `${t.accent}14`, color: t.accent }}>
                  {selectedGame.reward}
                </div>
              </div>
              <p className="text-sm mt-3" style={{ color: t.textMuted, lineHeight: 1.7 }}>{selectedGame.description}</p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <DetailStat label="Agent mode" value={selectedGame.agentMode} />
                <DetailStat label="Session length" value={selectedGame.duration} />
                <DetailStat label="Players" value={selectedGame.players} />
                <DetailStat label="Difficulty" value={selectedGame.difficulty} />
              </div>
              <div className="mt-5 p-4 rounded-2xl" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
                <div className="text-xs uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>Launch posture</div>
                <p className="text-sm mt-2" style={{ color: t.text, lineHeight: 1.7 }}>
                  {selectedGame.status === 'live'
                    ? 'This experience is playable right now in the workspace. Use your selected agent to personalize the session and preserve the current build while the new Arcade shell grows around it.'
                    : selectedGame.status === 'prototype'
                      ? 'This concept is scaffolded as a catalog item and detail surface. Next pass should add a dedicated session component, result states, and agent-specific prompt tuning.'
                      : 'This is mapped in the new Arcade IA and ready for design, data modeling, and implementation once the live game surfaces are stable.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 mt-5">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl text-sm"
                  style={{ background: t.accent, color: t.bg }}
                >
                  {selectedGame.implementedView ? 'Launch live session' : 'Mark for build'}
                </button>
                <button
                  type="button"
                  onClick={() => chatAgent ? setChatAgent(null) : undefined}
                  className="px-4 py-2 rounded-xl text-sm"
                  style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.text }}
                >
                  {chatAgent ? `Using ${chatAgent.name}` : 'Attach an agent in chat'}
                </button>
              </div>
            </>
          ) : null}
        </Surface>
      </div>

      {selectedGame?.implementedView ? (
        <Surface className="p-5 mt-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em]" style={{ color: t.textMuted }}>Live session</div>
              <div className="text-lg mt-1" style={{ color: t.text }}>{selectedGame.name}</div>
            </div>
            <div className="text-xs" style={{ color: t.textMuted }}>
              {chatAgent ? `Agent attached: ${chatAgent.name}` : 'Attach an agent via chat for a more personalized session'}
            </div>
          </div>
          {selectedGame.implementedView === 'protocol-match' ? <ProtocolMatch /> : null}
          {selectedGame.implementedView === 'chess' ? <AgentChess /> : null}
          {selectedGame.implementedView === 'agent-choice' ? <AgentChoice /> : null}
          {selectedGame.implementedView === 'twenty-questions' ? <TwentyQuestionsRemix /> : null}
          {selectedGame.implementedView === 'riddle-race' ? <RiddleRace /> : null}
          {selectedGame.implementedView === 'trivia-quizzes' ? <TriviaQuizzes /> : null}
        </Surface>
      ) : null}
    </SectionScaffold>
  );
}

function LearnSection() {
  const { currentTheme: t, chatAgent } = useApp();
  const [selectedSection, setSelectedSection] = useState<LearnSectionId>('tests');
  const [selectedItemId, setSelectedItemId] = useState<string>(learnItems[0]?.id ?? '');

  const visibleItems = learnItems.filter(item => item.section === selectedSection);
  const selectedItem = learnItems.find(item => item.id === selectedItemId) ?? visibleItems[0];

  return (
    <SectionScaffold
      section="learn"
      title="Learn"
      subtitle="A structured learning layer for 01Deck with tests, classes, and practical how-to guides. Every item can pair with an agent for feedback, coaching, or challenge mode."
      actions={(
        <>
          <ActionPill label="Tests, classes, how-to" accent="#22c55e" />
          <ActionPill label={chatAgent ? `Mentor ready: ${chatAgent.name}` : 'Attach an agent mentor'} accent="#38bdf8" />
          <ActionPill label="Creator-ready content model" accent="#f59e0b" />
        </>
      )}
    >
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Surface className="p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em]" style={{ color: t.textMuted }}>Browse Learn</div>
              <div className="text-lg mt-1" style={{ color: t.text }}>Structured discovery</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {learnSections.map(section => (
                <FilterChip
                  key={section.id}
                  label={section.label}
                  active={selectedSection === section.id}
                  onClick={() => setSelectedSection(section.id)}
                />
              ))}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {visibleItems.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItemId(item.id)}
                className="rounded-2xl p-4 text-left"
                style={{
                  background: selectedItem?.id === item.id ? `${t.accent}10` : t.surface2,
                  border: `1px solid ${selectedItem?.id === item.id ? t.accent : t.border}`,
                }}
              >
                <div className="text-xs uppercase tracking-[0.18em]" style={{ color: t.textMuted }}>{item.format}</div>
                <div className="text-sm mt-2" style={{ color: t.text }}>{item.title}</div>
                <p className="text-xs mt-2" style={{ color: t.textMuted, lineHeight: 1.6 }}>{item.summary}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <MetaTag>{item.duration}</MetaTag>
                  <MetaTag>{item.difficulty}</MetaTag>
                </div>
              </button>
            ))}
          </div>
        </Surface>

        <Surface className="p-5">
          {selectedItem ? (
            <>
              <div className="text-xs uppercase tracking-[0.2em]" style={{ color: t.textMuted }}>Learning detail</div>
              <div className="text-xl mt-1" style={{ color: t.text }}>{selectedItem.title}</div>
              <p className="text-sm mt-3" style={{ color: t.textMuted, lineHeight: 1.7 }}>{selectedItem.summary}</p>
              <div className="mt-4 p-4 rounded-2xl" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
                <div className="text-xs uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>Outcome</div>
                <p className="text-sm mt-2" style={{ color: t.text }}>{selectedItem.outcome}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <DetailStat label="Section" value={learnSections.find(section => section.id === selectedItem.section)?.label ?? selectedItem.section} />
                <DetailStat label="Format" value={selectedItem.format} />
                <DetailStat label="Duration" value={selectedItem.duration} />
                <DetailStat label="Difficulty" value={selectedItem.difficulty} />
              </div>
              <div className="mt-5">
                <div className="text-xs uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>Agent assist</div>
                <p className="text-sm mt-2" style={{ color: t.text, lineHeight: 1.7 }}>
                  {chatAgent
                    ? `${chatAgent.name} can act as coach, interpreter, or practice partner while you work through this item.`
                    : 'Attach an agent in chat to turn this lesson into an interactive coaching flow.'}
                </p>
              </div>
            </>
          ) : null}
        </Surface>
      </div>

      {selectedSection === 'tests' && selectedItem && ['mbti', 'big-five', 'iq-test'].includes(selectedItem.id) ? (
        <Surface className="p-5 mt-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em]" style={{ color: t.textMuted }}>Interactive assessment</div>
              <div className="text-lg mt-1" style={{ color: t.text }}>{selectedItem.title}</div>
            </div>
            <div className="text-xs" style={{ color: t.textMuted }}>
              Lightweight MVP flow wired into Learn
            </div>
          </div>
          <InteractiveAssessments assessmentId={selectedItem.id as 'mbti' | 'big-five' | 'iq-test'} />
        </Surface>
      ) : null}
    </SectionScaffold>
  );
}

function CreateSection() {
  const { currentTheme: t, setShowCreator } = useApp();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(creatorTemplates[0]?.id ?? '');

  const selectedTemplate = creatorTemplates.find(template => template.id === selectedTemplateId) ?? creatorTemplates[0];

  return (
    <SectionScaffold
      section="create"
      title="Create"
      subtitle="A dedicated publishing surface for games, tests, classes, and how-to guides. This is the start of a shared creator framework that can absorb the current agent creation flow instead of duplicating it."
      actions={(
        <>
          <ActionPill label="4 creator types" accent="#f59e0b" />
          <ActionPill label="Drafts and publish flow next" accent="#38bdf8" />
          <ActionPill label="Agent creator still available" accent="#22c55e" />
        </>
      )}
    >
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Surface className="p-5">
          <div className="text-xs uppercase tracking-[0.2em]" style={{ color: t.textMuted }}>Choose a template</div>
          <div className="grid gap-3 mt-4 md:grid-cols-2">
            {creatorTemplates.map(template => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedTemplateId(template.id)}
                className="rounded-2xl p-4 text-left"
                style={{
                  background: selectedTemplate?.id === template.id ? `${t.accent}10` : t.surface2,
                  border: `1px solid ${selectedTemplate?.id === template.id ? t.accent : t.border}`,
                }}
              >
                <div className="text-sm" style={{ color: t.text }}>{template.title}</div>
                <p className="text-xs mt-2" style={{ color: t.textMuted, lineHeight: 1.6 }}>{template.summary}</p>
                <div className="text-xs mt-4" style={{ color: t.accent }}>Deliverable: {template.deliverable}</div>
              </button>
            ))}
          </div>
        </Surface>

        <Surface className="p-5">
          {selectedTemplate ? (
            <>
              <div className="text-xs uppercase tracking-[0.2em]" style={{ color: t.textMuted }}>Starter flow</div>
              <div className="text-xl mt-1" style={{ color: t.text }}>{selectedTemplate.title}</div>
              <p className="text-sm mt-3" style={{ color: t.textMuted, lineHeight: 1.7 }}>{selectedTemplate.summary}</p>
              <div className="mt-5 space-y-3">
                {selectedTemplate.steps.map((step, index) => (
                  <div
                    key={step}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3"
                    style={{ background: t.surface2, border: `1px solid ${t.border}` }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
                      style={{ background: `${t.accent}18`, color: t.accent }}
                    >
                      {index + 1}
                    </div>
                    <div className="text-sm" style={{ color: t.text }}>{step}</div>
                    <ChevronRight size={14} style={{ color: t.textMuted, marginLeft: 'auto' }} />
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 mt-5">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl text-sm"
                  style={{ background: t.accent, color: t.bg }}
                >
                  Start this flow
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreator(true)}
                  className="px-4 py-2 rounded-xl text-sm"
                  style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.text }}
                >
                  Open legacy agent creator
                </button>
              </div>
            </>
          ) : null}
        </Surface>
      </div>
    </SectionScaffold>
  );
}

function LibrarySection() {
  return (
    <SectionScaffold
      section="library"
      title="Library"
      subtitle="A holding area for saved content, in-progress sessions, recently completed lessons, and future creator drafts."
      actions={<ActionPill label="Ready for persistence wiring" accent="#38bdf8" />}
    >
      <div className="grid gap-6 md:grid-cols-3">
        <SummaryCard icon={Compass} title="Continue" body="Resume live Arcade sessions, unfinished lessons, and saved creator drafts from one place." />
        <SummaryCard icon={Trophy} title="Completed" body="Track finished tests, cleared challenge sessions, and earned rewards as this feature grows." />
        <SummaryCard icon={Library} title="Published" body="Eventually hold everything you create, save, bookmark, and share across 01Deck." />
      </div>
    </SectionScaffold>
  );
}

function ProfileSection() {
  const { currentTheme: t, allAgents, chatAgent } = useApp();

  return (
    <SectionScaffold
      section="profile"
      title="Profile"
      subtitle="A future home for creator identity, usage streaks, learning progress, and the relationship between your saved agents and the new content system."
      actions={<ActionPill label={`${allAgents.length} agents available`} accent="#f472b6" />}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Surface className="p-5">
          <div className="text-xs uppercase tracking-[0.2em]" style={{ color: t.textMuted }}>Identity snapshot</div>
          <div className="text-2xl mt-2" style={{ color: t.text }}>You</div>
          <p className="text-sm mt-3" style={{ color: t.textMuted, lineHeight: 1.7 }}>
            Creator-ready profile scaffolding is in place so future game, class, and guide publishing can attach to a consistent identity model.
          </p>
        </Surface>
        <Surface className="p-5">
          <div className="text-xs uppercase tracking-[0.2em]" style={{ color: t.textMuted }}>Mentor / opponent</div>
          <div className="text-lg mt-2" style={{ color: t.text }}>{chatAgent ? chatAgent.name : 'No agent attached'}</div>
          <p className="text-sm mt-3" style={{ color: t.textMuted, lineHeight: 1.7 }}>
            The attached agent relationship will become a reusable concept across Arcade, Learn, and Create.
          </p>
        </Surface>
        <Surface className="p-5">
          <div className="text-xs uppercase tracking-[0.2em]" style={{ color: t.textMuted }}>Planned metrics</div>
          <div className="space-y-3 mt-4">
            <MetricRow label="Arcade streak" value="Coming soon" />
            <MetricRow label="Learning progress" value="Coming soon" />
            <MetricRow label="Published content" value="Coming soon" />
          </div>
        </Surface>
      </div>
    </SectionScaffold>
  );
}

function ActionPill({ label, accent }: { label: string; accent: string }) {
  return (
    <div
      className="px-3 py-2 rounded-xl text-xs"
      style={{
        background: `${accent}18`,
        border: `1px solid ${accent}44`,
        color: accent,
      }}
    >
      {label}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const { currentTheme: t } = useApp();

  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-2 rounded-xl text-xs"
      style={{
        background: active ? `${t.accent}16` : t.surface2,
        border: `1px solid ${active ? t.accent : t.border}`,
        color: active ? t.text : t.textMuted,
      }}
    >
      {label}
    </button>
  );
}

function MetaTag({ children }: { children: React.ReactNode }) {
  const { currentTheme: t } = useApp();

  return (
    <span
      className="px-2 py-1 rounded-full text-[11px]"
      style={{ background: t.surface3, color: t.textMuted }}
    >
      {children}
    </span>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  const { currentTheme: t } = useApp();

  return (
    <div className="rounded-2xl p-3" style={{ background: t.surface2, border: `1px solid ${t.border}` }}>
      <div className="text-[11px] uppercase tracking-[0.16em]" style={{ color: t.textMuted }}>{label}</div>
      <div className="text-sm mt-2" style={{ color: t.text }}>{value}</div>
    </div>
  );
}

function SummaryCard({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  const { currentTheme: t } = useApp();

  return (
    <Surface className="p-5">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${t.accent}14` }}>
        <Icon size={18} style={{ color: t.accent }} />
      </div>
      <div className="text-lg mt-4" style={{ color: t.text }}>{title}</div>
      <p className="text-sm mt-2" style={{ color: t.textMuted, lineHeight: 1.7 }}>{body}</p>
    </Surface>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  const { currentTheme: t } = useApp();

  return (
    <div className="flex items-center justify-between text-sm" style={{ color: t.text }}>
      <span style={{ color: t.textMuted }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
