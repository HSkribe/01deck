import { useCallback } from 'react';
import { Background, Controls, MiniMap, ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import { useDeckStore } from '../store/useDeckStore';
import { AgentNode } from './AgentNode';

const nodeTypes = {
  agentNode: AgentNode,
};

function CanvasInner() {
  const reactFlow = useReactFlow();
  const nodes = useDeckStore(state => state.nodes);
  const edges = useDeckStore(state => state.edges);
  const selectedAgentId = useDeckStore(state => state.selectedAgentId);
  const onNodesChange = useDeckStore(state => state.onNodesChange);
  const onEdgesChange = useDeckStore(state => state.onEdgesChange);
  const onConnect = useDeckStore(state => state.onConnect);
  const createAgentFromTemplate = useDeckStore(state => state.createAgentFromTemplate);
  const selectAgent = useDeckStore(state => state.selectAgent);

  const onDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const templateId = event.dataTransfer.getData('application/x-ondeck-template');
      if (!templateId) return;

      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      await createAgentFromTemplate(templateId, position);
    },
    [createAgentFromTemplate, reactFlow],
  );

  return (
    <div
      className="ondeck-canvas"
      onDragOver={event => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        onNodeClick={(_, node) => selectAgent(node.id)}
        onPaneClick={() => selectAgent(null)}
        attributionPosition="bottom-left"
      >
        <MiniMap pannable zoomable />
        <Controls />
        <Background color="#1f2937" gap={24} size={1} />
      </ReactFlow>
      {!selectedAgentId && nodes.length === 0 && (
        <div className="ondeck-canvas__hint">Drag an agent template onto the canvas to start.</div>
      )}
    </div>
  );
}

export function AgentCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
