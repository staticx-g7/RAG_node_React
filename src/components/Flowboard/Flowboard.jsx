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
} from '@xyflow/react';
import { useNodeOperations } from '../../hooks/useNodeOperations';
import { INITIAL_NODES, INITIAL_EDGES, FLOW_CONFIG } from '../../constants/flowconfig';
import '@xyflow/react/dist/style.css';

// Custom Edge Component with Hover Delete Button
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

  // Handle edge mouse enter
  // Handle edge mouse enter - instant response
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

  // Handle edge mouse leave - instant response
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

  // Handle node deletion
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
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
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
