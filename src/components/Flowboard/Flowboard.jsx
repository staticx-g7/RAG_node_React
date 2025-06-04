import React, { useRef, useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from '@xyflow/react';
import { useNodeOperations } from '../../hooks/useNodeOperations';
import { INITIAL_NODES, INITIAL_EDGES, FLOW_CONFIG } from '../../constants/flowconfig';
import '@xyflow/react/dist/style.css';

// Custom Edge Component with Delete Button
const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = (evt, id) => {
    evt.stopPropagation();
    // This will be handled by the parent component
    window.dispatchEvent(new CustomEvent('deleteEdge', { detail: { id } }));
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            className="bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg transition-colors duration-200"
            onClick={(event) => onEdgeClick(event, id)}
            title="Delete connection"
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

// Edge types configuration
const edgeTypes = {
  custom: CustomEdge,
};

const FlowboardComponent = () => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    INITIAL_EDGES.map(edge => ({ ...edge, type: 'custom' }))
  );

  const { onConnect, onConnectEnd, onPaneDoubleClick } = useNodeOperations(
    setNodes,
    setEdges
  );

  // Handle edge deletion
  const onDeleteEdge = useCallback((edgeId) => {
    setEdges((edges) => edges.filter((edge) => edge.id !== edgeId));
  }, [setEdges]);

  // Listen for delete edge events
  React.useEffect(() => {
    const handleDeleteEdge = (event) => {
      onDeleteEdge(event.detail.id);
    };

    window.addEventListener('deleteEdge', handleDeleteEdge);
    return () => {
      window.removeEventListener('deleteEdge', handleDeleteEdge);
    };
  }, [onDeleteEdge]);

  // Handle node deletion (optional - delete key when node is selected)
  const onNodesDelete = useCallback(
    (deleted) => {
      setEdges((edges) =>
        edges.filter((edge) => !deleted.find((node) => node.id === edge.source || node.id === edge.target))
      );
    },
    [setEdges]
  );

  // Handle keyboard events for deletion
  const onKeyDown = useCallback(
    (event) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedNodes = nodes.filter((node) => node.selected);
        const selectedEdges = edges.filter((edge) => edge.selected);

        if (selectedNodes.length > 0) {
          setNodes((nodes) => nodes.filter((node) => !node.selected));
          setEdges((edges) =>
            edges.filter((edge) =>
              !selectedNodes.find((node) => node.id === edge.source || node.id === edge.target)
            )
          );
        }

        if (selectedEdges.length > 0) {
          setEdges((edges) => edges.filter((edge) => !edge.selected));
        }
      }
    },
    [nodes, edges, setNodes, setEdges]
  );

  return (
    <div className="w-full h-full bg-gray-50" ref={reactFlowWrapper} onKeyDown={onKeyDown} tabIndex={0}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodesDelete={onNodesDelete}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        onPaneDoubleClick={onPaneDoubleClick}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={FLOW_CONFIG.fitViewOptions}
        nodeOrigin={FLOW_CONFIG.nodeOrigin}
        className="bg-gray-50"
        deleteKeyCode={['Delete', 'Backspace']}
      >
        <Background
          variant={FLOW_CONFIG.backgroundVariant}
          gap={FLOW_CONFIG.backgroundGap}
          size={FLOW_CONFIG.backgroundSize}
          color="#e5e7eb"
        />
        <Controls className="bg-white shadow-lg rounded-lg" />
        <MiniMap
          nodeColor="#3b82f6"
          maskColor="rgba(0, 0, 0, 0.1)"
          position="top-right"
          className="bg-white shadow-lg rounded-lg"
        />
      </ReactFlow>
    </div>
  );
};

const Flowboard = () => (
  <ReactFlowProvider>
    <FlowboardComponent />
  </ReactFlowProvider>
);

export default Flowboard;
