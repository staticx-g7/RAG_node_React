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
  Handle,
  Position,
} from '@xyflow/react';
import { useNodeOperations } from '../../hooks/useNodeOperations';
import { INITIAL_NODES, INITIAL_EDGES, FLOW_CONFIG } from '../../constants/flowconfig';
import { useDnD } from '../../contexts/DnDContext';
import { ExecuteNode, TextNode } from '../nodes'; // Using the new export structure
import ConsoleWindow from '../ui/Console';
import '@xyflow/react/dist/style.css';

// Enhanced Custom Node Components with Execution State
const CustomNode = ({ id, data, isConnectable, selected }) => {
  const handleDelete = (e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('deleteNode', { detail: { id } }));
  };

  const isExecuting = data?.isExecuting || false;
  const lastExecuted = data?.lastExecuted;

  return (
    <div className={`relative px-4 py-2 shadow-md rounded-md bg-white border-2 transition-all duration-200 group ${
      selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-stone-400'
    } ${isExecuting ? 'ring-4 ring-green-300 animate-pulse bg-green-50' : ''}`}>

      <button
        onClick={handleDelete}
        className={`absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 hover:scale-110 transition-all duration-200 shadow-lg ${
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        title="Delete node"
      >
        ×
      </button>

      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ background: '#555' }}
        isConnectable={isConnectable}
      />

      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${
          isExecuting ? 'bg-green-400 animate-ping' :
          lastExecuted ? 'bg-blue-400' : 'bg-gray-400'
        }`}></div>
        <div>{data.label}</div>
      </div>

      {lastExecuted && (
        <div className="text-xs text-gray-500 mt-1">
          Last: {new Date(lastExecuted).toLocaleTimeString()}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ background: '#555' }}
        isConnectable={isConnectable}
      />
    </div>
  );
};

const InputNode = ({ id, data, isConnectable, selected }) => {
  const handleDelete = (e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('deleteNode', { detail: { id } }));
  };

  const isExecuting = data?.isExecuting || false;
  const lastExecuted = data?.lastExecuted;

  return (
    <div className={`relative px-4 py-2 shadow-md rounded-md bg-green-50 border-2 transition-all duration-200 group ${
      selected ? 'border-green-600 ring-2 ring-green-200' : 'border-green-400'
    } ${isExecuting ? 'ring-4 ring-green-300 animate-pulse bg-green-100' : ''}`}>

      <button
        onClick={handleDelete}
        className={`absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 hover:scale-110 transition-all duration-200 shadow-lg ${
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        title="Delete node"
      >
        ×
      </button>

      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${
          isExecuting ? 'bg-green-400 animate-ping' :
          lastExecuted ? 'bg-blue-400' : 'bg-green-500'
        }`}></div>
        <div>{data.label}</div>
      </div>

      {lastExecuted && (
        <div className="text-xs text-green-600 mt-1">
          Last: {new Date(lastExecuted).toLocaleTimeString()}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ background: '#22c55e' }}
        isConnectable={isConnectable}
      />
    </div>
  );
};

const OutputNode = ({ id, data, isConnectable, selected }) => {
  const handleDelete = (e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('deleteNode', { detail: { id } }));
  };

  const isExecuting = data?.isExecuting || false;
  const lastExecuted = data?.lastExecuted;

  return (
    <div className={`relative px-4 py-2 shadow-md rounded-md bg-red-50 border-2 transition-all duration-200 group ${
      selected ? 'border-red-600 ring-2 ring-red-200' : 'border-red-400'
    } ${isExecuting ? 'ring-4 ring-green-300 animate-pulse bg-green-50' : ''}`}>

      <button
        onClick={handleDelete}
        className={`absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 hover:scale-110 transition-all duration-200 shadow-lg ${
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        title="Delete node"
      >
        ×
      </button>

      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ background: '#ef4444' }}
        isConnectable={isConnectable}
      />

      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${
          isExecuting ? 'bg-green-400 animate-ping' :
          lastExecuted ? 'bg-blue-400' : 'bg-red-500'
        }`}></div>
        <div>{data.label}</div>
      </div>

      {lastExecuted && (
        <div className="text-xs text-red-600 mt-1">
          Last: {new Date(lastExecuted).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

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

// Updated node types with new custom nodes for workflow automation[1]
const nodeTypes = {
  input: InputNode,
  default: CustomNode,
  output: OutputNode,
  execute: ExecuteNode,
  text: TextNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

const FlowboardComponent = () => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    INITIAL_EDGES.map(edge => ({ ...edge, type: 'custom' }))
  );
  const { screenToFlowPosition, getEdges, getNodes } = useReactFlow();
  const [type] = useDnD();
  const [nodeCounter, setNodeCounter] = useState(4);

  const { onConnect, onConnectEnd } = useNodeOperations(setNodes, setEdges);

  // Generate truly unique ID to prevent React key duplication errors[3]
  const generateUniqueId = useCallback(() => {
    const newCounter = nodeCounter + 1;
    setNodeCounter(newCounter);
    const uniqueId = `dndnode_${newCounter}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return uniqueId;
  }, [nodeCounter]);

  // Cascading execution function for workflow automation[1]
  const triggerNodeExecution = useCallback(async (nodeId) => {
    const currentEdges = getEdges();
    const currentNodes = getNodes();

    const outgoingEdges = currentEdges.filter(edge => edge.source === nodeId);

    if (outgoingEdges.length === 0) {
      console.log(`📍 Node ${nodeId} has no connected nodes to execute`);
      return;
    }

    console.log(`🔗 Node ${nodeId} triggering ${outgoingEdges.length} connected node(s)`);

    for (const edge of outgoingEdges) {
      const targetNode = currentNodes.find(node => node.id === edge.target);
      if (targetNode) {
        setTimeout(() => {
          if (targetNode.type === 'execute') {
            console.log(`🎯 Auto-triggering ExecuteNode: ${targetNode.id}`);
            window.dispatchEvent(new CustomEvent('triggerExecution', {
              detail: { nodeId: targetNode.id }
            }));
          } else {
            console.log(`⚡ Executing ${targetNode.type} node: ${targetNode.data.label}`);
            setNodes((nodes) =>
              nodes.map((node) => {
                if (node.id === targetNode.id) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      isExecuting: true,
                      lastExecuted: new Date().toISOString()
                    }
                  };
                }
                return node;
              })
            );

            setTimeout(() => {
              setNodes((nodes) =>
                nodes.map((node) => {
                  if (node.id === targetNode.id) {
                    return {
                      ...node,
                      data: {
                        ...node.data,
                        isExecuting: false
                      }
                    };
                  }
                  return node;
                })
              );

              triggerNodeExecution(targetNode.id);
            }, 1000);
          }
        }, 500);
      }
    }
  }, [getEdges, getNodes, setNodes]);

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

      const newNodeId = generateUniqueId();
      const newNode = {
        id: newNodeId,
        type: droppedType,
        position,
        data: { label: `${droppedType} node` },
      };

      // Console monitoring for development workflow[2]
      console.log(`➕ Added new ${droppedType} node`);

      setNodes((currentNodes) => {
        const existingNode = currentNodes.find(node => node.id === newNodeId);
        if (existingNode) {
          return currentNodes;
        }
        return currentNodes.concat(newNode);
      });
    },
    [screenToFlowPosition, type, generateUniqueId, setNodes]
  );

  // Handle node deletion
  const onDeleteNode = useCallback((nodeId) => {
    console.log(`🗑️ Deleted node: ${nodeId}`);
    setNodes((nodes) => nodes.filter((node) => node.id !== nodeId));
    setEdges((edges) => edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  }, [setNodes, setEdges]);

  // Handle edge deletion
  const onDeleteEdge = useCallback((edgeId) => {
    console.log(`🗑️ Deleted edge: ${edgeId}`);
    setEdges((edges) => edges.filter((edge) => edge.id !== edgeId));
  }, [setEdges]);

  // Handle keyboard deletion
  const onKeyDown = useCallback((event) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selectedNodes = nodes.filter((node) => node.selected);
      const selectedEdges = edges.filter((edge) => edge.selected);

      if (selectedNodes.length > 0) {
        console.log(`🗑️ Deleted ${selectedNodes.length} selected node(s)`);
        const selectedNodeIds = selectedNodes.map((node) => node.id);
        setNodes((nodes) => nodes.filter((node) => !node.selected));
        setEdges((edges) => edges.filter((edge) =>
          !selectedNodeIds.includes(edge.source) && !selectedNodeIds.includes(edge.target)
        ));
      }

      if (selectedEdges.length > 0) {
        console.log(`🗑️ Deleted ${selectedEdges.length} selected edge(s)`);
        setEdges((edges) => edges.filter((edge) => !edge.selected));
      }
    }
  }, [nodes, edges, setNodes, setEdges]);

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

  // Listen for execution completion events for workflow automation[1]
  React.useEffect(() => {
    const handleExecutionComplete = (event) => {
      const { nodeId } = event.detail;
      triggerNodeExecution(nodeId);
    };

    const handleDeleteNode = (event) => {
      onDeleteNode(event.detail.id);
    };

    const handleDeleteEdge = (event) => {
      onDeleteEdge(event.detail.id);
    };

    window.addEventListener('executionComplete', handleExecutionComplete);
    window.addEventListener('deleteNode', handleDeleteNode);
    window.addEventListener('deleteEdge', handleDeleteEdge);

    return () => {
      window.removeEventListener('executionComplete', handleExecutionComplete);
      window.removeEventListener('deleteNode', handleDeleteNode);
      window.removeEventListener('deleteEdge', handleDeleteEdge);
    };
  }, [triggerNodeExecution, onDeleteNode, onDeleteEdge]);

  return (
    <div
      className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-inner border border-gray-200 relative"
      ref={reactFlowWrapper}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onKeyDown={onKeyDown}
      tabIndex={0}
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
        deleteKeyCode={[]}
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

      {/* Floating Console Window for development monitoring[2] */}
      <ConsoleWindow containerRef={reactFlowWrapper} />
    </div>
  );
};

const Flowboard = () => (
  <ReactFlowProvider>
    <FlowboardComponent />
  </ReactFlowProvider>
);

export default Flowboard;
