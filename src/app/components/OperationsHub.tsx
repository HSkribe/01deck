import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Download, Link2, MessageSquare, Plus, ShieldCheck, Store, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { parseDeckProtocolText, verifyDeckAgent } from '../utils/protocol';
import { generateAvatarDataUrl } from '../utils/avatarUtils';

type OpsTab = 'social' | 'verify' | 'messages' | 'board' | 'trade';

export function OperationsHub() {
  const {
    currentTheme: t,
    isOpsOpen,
    setIsOpsOpen,
    socialConnections,
    toggleSocialConnection,
    allAgents,
    addAgent,
    internalMessages,
    sendInternalMessage,
    boardPosts,
    addBoardPost,
    tradeProposals,
    createTradeProposal,
  } = useApp();
  const [tab, setTab] = useState<OpsTab>('social');
  const [selectedAgentId, setSelectedAgentId] = useState(allAgents[0]?.id ?? '');
  const [verifyResult, setVerifyResult] = useState<ReturnType<typeof verifyDeckAgent> | null>(null);
  const [importPayload, setImportPayload] = useState('');
  const [importResult, setImportResult] = useState<ReturnType<typeof parseDeckProtocolText> | null>(null);
  const [channel, setChannel] = useState('General');
  const [messageInput, setMessageInput] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [tradeUser, setTradeUser] = useState('');
  const [tradeAgent, setTradeAgent] = useState(allAgents[0]?.name ?? '');
  const [tradeCredits, setTradeCredits] = useState(100);
  const selectedAgent = useMemo(
    () => allAgents.find(a => a.id === selectedAgentId) ?? allAgents[0] ?? null,
    [allAgents, selectedAgentId],
  );

  const verifyAgent = () => {
    if (!selectedAgent) return;
    setVerifyResult(verifyDeckAgent(selectedAgent));
  };

  const verifyImportPayload = () => {
    setImportResult(parseDeckProtocolText(importPayload));
  };

  const addImportedAgent = () => {
    if (!importResult?.ok || !importResult.protocolAgent) return;

    const protocolAgent = importResult.protocolAgent;
    const descriptor = protocolAgent.descriptor ?? '';
    const roleSplitIndex = descriptor.indexOf(':');
    const role = roleSplitIndex >= 0 ? descriptor.slice(0, roleSplitIndex).trim() : 'Imported Agent';
    const goal = roleSplitIndex >= 0 ? descriptor.slice(roleSplitIndex + 1).trim() : descriptor;

    addAgent({
      id: `imported-${protocolAgent.instanceId}`,
      name: protocolAgent.name.toUpperCase(),
      category: 'research',
      role,
      description: goal || 'Imported from 01 Protocol artifact.',
      specialization: 'Imported 01 Protocol identity',
      lastUsed: new Date(),
      rarity: 'rare',
      rarityCount: 'Imported',
      portrait: generateAvatarDataUrl({
        name: protocolAgent.name.toUpperCase(),
        role,
        goal: goal || 'Imported from 01 Protocol artifact',
      }),
      tools: ['Imported Identity', 'Verification Viewer'],
      memoryNotes: protocolAgent.memoryMerkleRoot
        ? `Imported with memory root ${protocolAgent.memoryMerkleRoot.slice(0, 16)}...`
        : 'Imported without bundled memory metadata.',
      online: false,
      tags: ['imported', '01protocol', protocolAgent.lifecycleState.toLowerCase()],
      stats: [
        { label: 'Integrity', value: 100 },
        { label: 'Portability', value: 95 },
        { label: 'Memory', value: protocolAgent.memoryMerkleRoot ? 90 : 60 },
        { label: 'Verification', value: 100 },
      ],
      protocolVersion: '01P v3.0',
      protocolId: `PRO-${protocolAgent.instanceId.slice(0, 6).toUpperCase()}-${protocolAgent.name.toUpperCase()}`,
      chatOpening: `Imported identity ${protocolAgent.name} is loaded in 01Deck.`,
      isUserCreated: true,
      goal,
      memoryMode: 'always_on',
      serial: 1,
      totalSupply: 1,
      isVerified: true,
      identityRecord: importResult.identityRecord,
      bundleRecord: importResult.bundleRecord,
      verification: {
        status: 'verified',
        source: importResult.source === 'bundleRecord' ? 'bundle' : '01protocol',
        lastCheckedAt: new Date().toISOString(),
        warnings: importResult.warnings,
        checksum: importResult.checksum,
      },
      systemPrompt: descriptor,
    });
  };

  const downloadTextFile = (filename: string, content: string) => {
    if (typeof window === 'undefined') return;
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { id: OpsTab; label: string; icon: React.ElementType }[] = [
    { id: 'social', label: 'Social', icon: Link2 },
    { id: 'verify', label: 'Verify', icon: ShieldCheck },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'board', label: 'Board', icon: CheckCircle2 },
    { id: 'trade', label: 'Trade', icon: Store },
  ];

  return (
    <AnimatePresence>
      {isOpsOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[70]"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpsOpen(false)}
          />
          <motion.div
            className="fixed top-16 right-4 bottom-4 z-[80] w-[min(94vw,860px)] rounded-2xl overflow-hidden"
            style={{
              background: t.surface2,
              border: `1px solid ${t.border}`,
              boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
            }}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between px-4 h-12" style={{ borderBottom: `1px solid ${t.border}` }}>
              <div className="text-sm" style={{ color: t.text }}>Operations Hub</div>
              <button
                onClick={() => setIsOpsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ color: t.textMuted, border: `1px solid ${t.border}` }}
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-[190px_1fr] h-[calc(100%-48px)]">
              <div className="p-3" style={{ borderRight: `1px solid ${t.border}` }}>
                {tabs.map(item => {
                  const active = tab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setTab(item.id)}
                      className="w-full mb-2 px-3 py-2.5 rounded-xl flex items-center gap-2 text-sm"
                      style={{
                        background: active ? `${t.accent}16` : 'transparent',
                        border: `1px solid ${active ? t.accent : t.border}`,
                        color: active ? t.text : t.textMuted,
                      }}
                    >
                      <item.icon size={14} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="p-4 overflow-y-auto">
                {tab === 'social' && (
                  <div>
                    <h3 className="text-sm mb-3" style={{ color: t.text }}>Social Connections</h3>
                    {Object.keys(socialConnections).map(platform => {
                      const connected = socialConnections[platform];
                      return (
                        <div
                          key={platform}
                          className="mb-2 p-3 rounded-xl flex items-center justify-between"
                          style={{ border: `1px solid ${t.border}`, background: t.surface1 }}
                        >
                          <span className="capitalize text-sm" style={{ color: t.text }}>{platform}</span>
                          <button
                            onClick={() => toggleSocialConnection(platform)}
                            className="px-3 py-1.5 rounded-lg text-xs"
                            style={{
                              background: connected ? 'rgba(34,197,94,0.14)' : `${t.accent}14`,
                              border: `1px solid ${connected ? 'rgba(34,197,94,0.35)' : t.accent}`,
                              color: connected ? '#22c55e' : t.text,
                            }}
                          >
                            {connected ? 'Connected' : 'Connect'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {tab === 'verify' && (
                  <div>
                    <h3 className="text-sm mb-1.5" style={{ color: t.text }}>01 Protocol Verification</h3>
                    <p className="text-xs mb-3" style={{ color: t.textMuted }}>
                      Verifies an attached `.01ai` or `.01bundle` payload against the 01protocol signing standard.
                    </p>
                    <select
                      value={selectedAgent?.id ?? ''}
                      onChange={e => setSelectedAgentId(e.target.value)}
                      className="w-full mb-3 px-3 py-2 rounded-xl text-sm"
                      style={{ background: t.surface1, border: `1px solid ${t.border}`, color: t.text }}
                    >
                      {allAgents.map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.protocolId})</option>
                      ))}
                    </select>
                    <button
                      onClick={verifyAgent}
                      className="px-4 py-2 rounded-xl text-sm"
                      style={{ background: `${t.accent}16`, border: `1px solid ${t.accent}`, color: t.text }}
                    >
                      Verify Integrity
                    </button>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => selectedAgent?.identityRecord && downloadTextFile(`${selectedAgent.name.toLowerCase()}.01ai`, selectedAgent.identityRecord)}
                        disabled={!selectedAgent?.identityRecord}
                        className="px-3 py-2 rounded-xl text-xs flex items-center gap-1.5"
                        style={{
                          background: t.surface1,
                          border: `1px solid ${t.border}`,
                          color: selectedAgent?.identityRecord ? t.text : t.textMuted,
                          opacity: selectedAgent?.identityRecord ? 1 : 0.5,
                        }}
                      >
                        <Download size={12} />
                        Export .01ai
                      </button>
                      <button
                        onClick={() => selectedAgent?.bundleRecord && downloadTextFile(`${selectedAgent.name.toLowerCase()}.01bundle`, selectedAgent.bundleRecord)}
                        disabled={!selectedAgent?.bundleRecord}
                        className="px-3 py-2 rounded-xl text-xs flex items-center gap-1.5"
                        style={{
                          background: t.surface1,
                          border: `1px solid ${t.border}`,
                          color: selectedAgent?.bundleRecord ? t.text : t.textMuted,
                          opacity: selectedAgent?.bundleRecord ? 1 : 0.5,
                        }}
                      >
                        <Download size={12} />
                        Export .01bundle
                      </button>
                    </div>
                    <div
                      className="mt-4 p-3 rounded-xl"
                      style={{ background: t.surface1, border: `1px solid ${t.border}` }}
                    >
                      <div className="text-xs mb-2" style={{ color: t.textMuted }}>
                        Paste `.01ai` or `.01bundle` text
                      </div>
                      <textarea
                        value={importPayload}
                        onChange={e => setImportPayload(e.target.value)}
                        placeholder="Paste a protocol payload here to verify or import it into 01Deck..."
                        className="w-full min-h-[140px] px-3 py-2 rounded-lg text-xs font-mono"
                        style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.text }}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={verifyImportPayload}
                          className="px-3 py-2 rounded-xl text-xs"
                          style={{ background: `${t.accent}16`, border: `1px solid ${t.accent}`, color: t.text }}
                        >
                          Verify Pasted Payload
                        </button>
                        <button
                          onClick={() => {
                            setImportPayload('');
                            setImportResult(null);
                          }}
                          className="px-3 py-2 rounded-xl text-xs"
                          style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.textMuted }}
                        >
                          Clear
                        </button>
                      </div>
                      {importResult && (
                        <div
                          className="mt-3 p-3 rounded-xl text-xs"
                          style={{
                            background: importResult.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                            border: `1px solid ${importResult.ok ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
                            color: importResult.ok ? '#86efac' : '#fca5a5',
                          }}
                        >
                          <div>{importResult.summary}</div>
                          {importResult.protocolAgent && (
                            <div className="mt-2" style={{ color: t.textMuted }}>
                              Agent: {importResult.protocolAgent.name} · {importResult.protocolAgent.instanceId}
                            </div>
                          )}
                          {importResult.error && (
                            <div className="mt-1" style={{ color: t.textMuted }}>
                              Error: {importResult.error}
                            </div>
                          )}
                          {importResult.warnings.length > 0 && (
                            <div className="mt-1" style={{ color: t.textMuted }}>
                              Warnings: {importResult.warnings.join(' | ')}
                            </div>
                          )}
                          {importResult.ok && importResult.protocolAgent && (
                            <button
                              onClick={addImportedAgent}
                              className="mt-3 px-3 py-2 rounded-xl text-xs flex items-center gap-1.5"
                              style={{ background: t.surface1, border: `1px solid ${t.border}`, color: t.text }}
                            >
                              <Plus size={12} />
                              Add Verified Agent To Deck
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {verifyResult && (
                      <div
                        className="mt-3 p-3 rounded-xl text-xs"
                        style={{
                          background: verifyResult.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                          border: `1px solid ${verifyResult.ok ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
                          color: verifyResult.ok ? '#86efac' : '#fca5a5',
                        }}
                      >
                        <div style={{ color: verifyResult.ok ? '#86efac' : '#fca5a5' }}>
                          {verifyResult.summary}
                        </div>
                        <div className="mt-2 space-y-1" style={{ color: t.textMuted }}>
                          <div>
                            Source: <span className="font-mono">{verifyResult.source}</span>
                          </div>
                          {verifyResult.instanceId && (
                            <div>
                              Instance ID: <span className="font-mono">{verifyResult.instanceId}</span>
                            </div>
                          )}
                          {verifyResult.checksum && (
                            <div>
                              Checksum: <span className="font-mono">{verifyResult.checksum}</span>
                            </div>
                          )}
                          {verifyResult.error && (
                            <div>
                              Error: <span className="font-mono">{verifyResult.error}</span>
                            </div>
                          )}
                          {verifyResult.warnings.length > 0 && (
                            <div>
                              Warnings: {verifyResult.warnings.join(' | ')}
                            </div>
                          )}
                          {!selectedAgent?.identityRecord && !selectedAgent?.bundleRecord && (
                            <div>
                              This agent does not currently carry a stored identity artifact, so the verifier cannot prove integrity yet.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'messages' && (
                  <div>
                    <h3 className="text-sm mb-3" style={{ color: t.text }}>Internal Messaging</h3>
                    <div className="flex gap-2 mb-2">
                      <select
                        value={channel}
                        onChange={e => setChannel(e.target.value)}
                        className="px-3 py-2 rounded-lg text-xs"
                        style={{ background: t.surface1, border: `1px solid ${t.border}`, color: t.text }}
                      >
                        <option>General</option>
                        <option>Ops</option>
                        <option>Trading</option>
                      </select>
                      <input
                        value={messageInput}
                        onChange={e => setMessageInput(e.target.value)}
                        placeholder="Send internal note..."
                        className="flex-1 px-3 py-2 rounded-lg text-sm"
                        style={{ background: t.surface1, border: `1px solid ${t.border}`, color: t.text }}
                      />
                      <button
                        onClick={() => {
                          sendInternalMessage(channel, 'You', messageInput);
                          setMessageInput('');
                        }}
                        className="px-3 py-2 rounded-lg text-xs"
                        style={{ background: `${t.accent}16`, border: `1px solid ${t.accent}`, color: t.text }}
                      >
                        Send
                      </button>
                    </div>
                    <div className="space-y-2">
                      {[...internalMessages].reverse().slice(0, 20).map(msg => (
                        <div key={msg.id} className="p-2.5 rounded-lg text-xs" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
                          <div className="mb-1" style={{ color: t.textMuted }}>
                            #{msg.channel} · {msg.sender}
                          </div>
                          <div style={{ color: t.text }}>{msg.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tab === 'board' && (
                  <div>
                    <h3 className="text-sm mb-3" style={{ color: t.text }}>Message Board</h3>
                    <input
                      value={postTitle}
                      onChange={e => setPostTitle(e.target.value)}
                      placeholder="Post title"
                      className="w-full mb-2 px-3 py-2 rounded-lg text-sm"
                      style={{ background: t.surface1, border: `1px solid ${t.border}`, color: t.text }}
                    />
                    <textarea
                      value={postBody}
                      onChange={e => setPostBody(e.target.value)}
                      placeholder="Share updates..."
                      className="w-full mb-2 px-3 py-2 rounded-lg text-sm min-h-[90px]"
                      style={{ background: t.surface1, border: `1px solid ${t.border}`, color: t.text }}
                    />
                    <button
                      onClick={() => {
                        addBoardPost('You', postTitle, postBody);
                        setPostTitle('');
                        setPostBody('');
                      }}
                      className="mb-3 px-3 py-2 rounded-lg text-xs"
                      style={{ background: `${t.accent}16`, border: `1px solid ${t.accent}`, color: t.text }}
                    >
                      Publish Post
                    </button>
                    <div className="space-y-2">
                      {boardPosts.map(post => (
                        <div key={post.id} className="p-3 rounded-lg" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
                          <div className="text-sm mb-1" style={{ color: t.text }}>{post.title}</div>
                          <div className="text-xs mb-1" style={{ color: t.textMuted }}>by {post.author}</div>
                          <div className="text-xs" style={{ color: t.textMuted }}>{post.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tab === 'trade' && (
                  <div>
                    <h3 className="text-sm mb-3" style={{ color: t.text }}>Agent Trading</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                      <input
                        value={tradeUser}
                        onChange={e => setTradeUser(e.target.value)}
                        placeholder="Recipient user"
                        className="px-3 py-2 rounded-lg text-sm"
                        style={{ background: t.surface1, border: `1px solid ${t.border}`, color: t.text }}
                      />
                      <select
                        value={tradeAgent}
                        onChange={e => setTradeAgent(e.target.value)}
                        className="px-3 py-2 rounded-lg text-sm"
                        style={{ background: t.surface1, border: `1px solid ${t.border}`, color: t.text }}
                      >
                        {allAgents.map(a => (
                          <option key={a.id} value={a.name}>{a.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        value={tradeCredits}
                        onChange={e => setTradeCredits(Number(e.target.value))}
                        className="px-3 py-2 rounded-lg text-sm"
                        style={{ background: t.surface1, border: `1px solid ${t.border}`, color: t.text }}
                      />
                    </div>
                    <button
                      onClick={() => createTradeProposal(tradeUser, tradeAgent, tradeCredits)}
                      className="mb-3 px-3 py-2 rounded-lg text-xs"
                      style={{ background: `${t.accent}16`, border: `1px solid ${t.accent}`, color: t.text }}
                    >
                      Propose Trade
                    </button>
                    <div className="space-y-2">
                      {tradeProposals.map(trade => (
                        <div key={trade.id} className="p-3 rounded-lg text-xs" style={{ background: t.surface1, border: `1px solid ${t.border}` }}>
                          <div style={{ color: t.text }}>
                            {trade.fromUser} → {trade.toUser} · {trade.agentName}
                          </div>
                          <div style={{ color: t.textMuted }}>
                            {trade.offeredCredits} credits · {trade.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
