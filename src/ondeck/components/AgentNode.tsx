import { Handle, Position, type NodeProps } from '@xyflow/react';
import { BrainCircuit, KeyRound, Lock, ShieldCheck, ShieldX } from 'lucide-react';
import { useDeckStore } from '../store/useDeckStore';
import type { AgentNodeData } from '../types';

export function AgentNode({ data, selected }: NodeProps<AgentNodeData>) {
  const agent = useDeckStore(state => state.agents[data.agentId]);

  if (!agent) return null;

  return (
    <div className={`ondeck-node ${selected ? 'ondeck-node--selected' : ''}`}>
      <Handle type="target" position={Position.Top} />
      <div className="ondeck-node__title">{agent.name}</div>
      <div className="ondeck-node__model">{agent.model}</div>
      <div className="ondeck-node__badges">
        <span className={`ondeck-badge ${agent.signature_verified ? 'ondeck-badge--green' : 'ondeck-badge--red'}`}>
          {agent.signature_verified ? <ShieldCheck size={12} /> : <ShieldX size={12} />}
          {agent.signature_verified ? 'Verified' : 'Invalid'}
        </span>
        <span className={`ondeck-badge ${agent.encryption_enabled ? 'ondeck-badge--blue' : ''}`}>
          <Lock size={12} />
          {agent.encryption_enabled ? 'Encrypted' : 'Plain'}
        </span>
        <span className={`ondeck-badge ${agent.memory_enabled ? 'ondeck-badge--amber' : ''}`}>
          <BrainCircuit size={12} />
          {agent.memory_enabled ? `Memory ${agent.persistent_memory.length}` : 'No memory'}
        </span>
        {agent.needs_session_rekey && (
          <span className="ondeck-badge ondeck-badge--red">
            <KeyRound size={12} />
            Rekey
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
