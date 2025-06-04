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
  useReactFlow,
  Handle,
  Position,
} from '@xyflow/react';
import { useNodeOperations } from '../../hooks/useNodeOperations';
import { INITIAL_NODES, INITIAL_EDGES, FLOW_CONFIG } from '../../constants/flowconfig';
import { useDnD } from '../../contexts/DnDContext';
import '@xyflow/react/dist/style.css';

// Custom Node Components
const CustomNode = ({ data, isConnectable }) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-stone-400">
    <Handle
      type="target"
      position={Position.Top}
      id="top"
      style={{ background: '#555' }}
      isConnectable={isConnectable}
    />
    <div>{data.label}</div>
    <Handle
      type="source"
      position={Position.Bottom}
      id="bottom"
      style={{ background: '#555' }}
      isConnectable={isConnectable}
    />
  </div>
);

const InputNode = ({ data, isConnectable }) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-green-50 border-2 border-green-400">
    <div>{data.label}</div>
    <Handle
      type="source"
      position={Position.Bottom}
      id="bottom"
      style={{ background: '#22c55e' }}
      isConnectable={isConnectable}
    />
  </div>
);

const OutputNode = ({ data, isConnectable }) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-red-50 border-2 border-red-400">
    <Handle
      type="target"
      position={Position.Top}
      id="top"
      style={{ background: '#ef4444' }}
      isConnectable={isConnectable}
    />
    <div>{data.label}</div>
  </div>
);

// Custom Edge Component
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

// Move outside component to prevent recreation
const nodeTypes = {
  input: InputNode,
  default: CustomNode,
  output: OutputNode,
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

  const { onConnect, onConnectEnd } = useNodeOperations(setNodes, setEdges);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      let droppedType = event.dataTransfer.getData('application/reactflow') ||
                       event.dataTransfer.getData('text/plain') ||
                       type;

      if (!droppedType) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type: droppedType,
        position,
        data: { label: `${droppedType} node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, type, setNodes]
  );

  const onDeleteEdge = useCallback((edgeId) => {
    setEdges((edges) => edges.filter((edge) => edge.id !== edgeId));
  }, [setEdges]);

  const onEdgeMouseEnter = useCallback((event, edge) => {
    setEdges((edges) =>
      edges.map((e) => {
        if (e.id === edge.id) {
          return { ...e, data: { ...e.data, isHovered: true } };
        }
        return e;
      })
    );
  }, [setEdges]);

  const onEdgeMouseLeave = useCallback((event, edge) => {
    setEdges((edges) =>
      edges.map((e) => {
        if (e.id === edge.id) {
          return { ...e, data: { ...e.data, isHovered: false } };
        }
        return e;
      })
    );
  }, [setEdges]);

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
      onDrop={onDrop}
      onDragOver={onDragOver}
      style={{ margin: 0 }} // Remove any default margins
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={FLOW_CONFIG.fitViewOptions}
        nodeOrigin={[0.5, 0.5]}
        className="rounded-xl"
        snapToGrid={true}
        snapGrid={[20, 20]}
        connectionMode="loose"
      >
        <Background
          variant="lines"
          gap={20}
          size={1}
          color="#e2e8f0"
          style={{ backgroundColor: '#fafafa' }}
        />
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
