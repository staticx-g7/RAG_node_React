import React, { useRef, useCallback, useState } from 'react';
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
  useReactFlow,
} from '@xyflow/react';
import { useNodeOperations } from '../../hooks/useNodeOperations';
import { INITIAL_NODES, INITIAL_EDGES, FLOW_CONFIG } from '../../constants/flowconfig';
import { useDnD } from '../../contexts/DnDContext';
import '@xyflow/react/dist/style.css';

// Custom Edge Component (same as before)
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
  data,
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
    window.dispatchEvent(new CustomEvent('deleteEdge', { detail: { id } }));
  };

  const isHovered = data?.isHovered || false;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: isHovered ? 3 : 2,
          stroke: isHovered ? '#ef4444' : '#6b7280',
        }}
      />
      <EdgeLabelRenderer>
        {isHovered && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div
              className="bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 border border-white shadow-lg cursor-pointer transition-transform duration-150 hover:scale-110"
              onClick={(event) => onEdgeClick(event, id)}
              title="Delete connection"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                lineHeight: '1',
                userSelect: 'none',
              }}
            >
              ×
            </div>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
};

const edgeTypes = {
  custom: CustomEdge,
};

let nodeId = 4;
const getId = () => `dndnode_${nodeId++}`;

const FlowboardComponent = () => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    INITIAL_EDGES.map(edge => ({ ...edge, type: 'custom' }))
  );
  const { screenToFlowPosition } = useReactFlow();
  const [type] = useDnD();

  const { onConnect, onConnectEnd, onPaneDoubleClick } = useNodeOperations(
    setNodes,
    setEdges
  );

  // Drag and Drop handlers
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      if (!type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type,
        position,
        data: { label: `${type} node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, type, setNodes]
  );

  // Handle edge deletion
  const onDeleteEdge = useCallback((edgeId) => {
    setEdges((edges) => edges.filter((edge) => edge.id !== edgeId));
  }, [setEdges]);

  // Handle edge mouse events
  const onEdgeMouseEnter = useCallback((event, edge) => {
    setEdges((edges) =>
      edges.map((e) => {
        if (e.id === edge.id) {
          return {
            ...e,
            data: { ...e.data, isHovered: true },
          };
        }
        return e;
      })
    );
  }, [setEdges]);

  const onEdgeMouseLeave = useCallback((event, edge) => {
    setEdges((edges) =>
      edges.map((e) => {
        if (e.id === edge.id) {
          return {
            ...e,
            data: { ...e.data, isHovered: false },
          };
        }
        return e;
      })
    );
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

 return (
    <div
      className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-inner border border-gray-200"
      ref={reactFlowWrapper}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        onPaneDoubleClick={onPaneDoubleClick}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
        onDrop={onDrop}
        onDragOver={onDragOver}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={FLOW_CONFIG.fitViewOptions}
        nodeOrigin={FLOW_CONFIG.nodeOrigin}
        className="rounded-xl"
        // Enable snap to grid for better alignment
        snapToGrid={true}
        snapGrid={[20, 20]}
      >
        {/* Line Grid Background */}
        <Background
          variant="lines"
          gap={20}
          size={1}
          color="#e2e8f0"
          style={{
            backgroundColor: '#fafafa',
          }}
        />
        {/* Secondary grid for major lines */}
        <Background
          id="major-grid"
          variant="lines"
          gap={100}
          size={2}
          color="#cbd5e1"
          offset={0}
        />

        <Controls className="bg-white/90 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200" />
        <MiniMap
          nodeColor="#3b82f6"
          maskColor="rgba(0, 0, 0, 0.1)"
          position="top-right"
          className="bg-white/90 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200"
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