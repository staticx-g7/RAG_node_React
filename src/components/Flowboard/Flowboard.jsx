import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from '@xyflow/react';
import { useNodeOperations } from '../../hooks/useNodeOperations';
import { INITIAL_NODES, INITIAL_EDGES, FLOW_CONFIG, nodeTypes } from '../../constants/flowconfig';
import { useDnD } from '../../contexts/DnDContext';
import ConsoleWindow from '../ui/Console';
import ChatWindow from '../ui/ChatWindow';
import '@xyflow/react/dist/style.css';

// Enhanced Custom Edge Component with Delete Button
const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
  selected,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = (event) => {
    event.stopPropagation();
    window.dispatchEvent(new CustomEvent('deleteEdge', { detail: { id } }));
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 3 : style.strokeWidth || 2,
          filter: selected ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.4))' : 'none'
        }}
      />
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
            className="w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl opacity-0 hover:opacity-100 group-hover:opacity-100"
            onClick={onEdgeClick}
            title="Delete Edge"
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

// Enhanced Custom Node Component for Fallback Nodes
const CustomNode = ({ id, data, isConnectable, selected }) => {
  const handleDelete = (e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('deleteNode', { detail: { id } }));
  };

  const isExecuting = data?.isExecuting || false;
  const lastExecuted = data?.lastExecuted;
  const nodeType = data?.type || 'Unknown';

  return (
    <div
      className={`custom-node bg-white border-2 rounded-lg p-4 shadow-lg min-w-[180px] transition-all duration-200 ${
        selected ? 'border-blue-400 shadow-blue-100 scale-105' : 'border-gray-200'
      } ${isExecuting ? 'animate-pulse border-green-400' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gradient-to-br from-gray-400 to-gray-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">⚡</span>
          </div>
          <h3 className="font-semibold text-gray-800 text-sm">{data.label || nodeType}</h3>
        </div>
        <button
          onClick={handleDelete}
          className="w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
          title="Delete Node"
        >
          ×
        </button>
      </div>

      {data.description && (
        <p className="text-xs text-gray-500 mb-2">{data.description}</p>
      )}

      {isExecuting && (
        <div className="text-xs text-green-600 mb-1 flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Executing...</span>
        </div>
      )}

      {lastExecuted && (
        <div className="text-xs text-gray-400">
          Last: {new Date(lastExecuted).toLocaleTimeString()}
        </div>
      )}

      {/* Connection Status */}
      <div className="mt-2 text-xs text-blue-600">
        {isConnectable ? '🔗 Connectable' : '🚫 Not Connectable'}
      </div>
    </div>
  );
};

// Main Flowboard Component
const FlowboardContent = () => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [type] = useDnD();
  const [selectedElements, setSelectedElements] = useState({ nodes: [], edges: [] });

  const { onConnect, onConnectEnd } = useNodeOperations(setNodes, setEdges);

  // Memoized node and edge types to prevent re-renders
  const memoizedNodeTypes = useMemo(() => ({
    ...nodeTypes,
    default: CustomNode, // Fallback for unknown node types
  }), []);

  const memoizedEdgeTypes = useMemo(() => ({
    custom: CustomEdge,
    default: CustomEdge,
    smoothstep: CustomEdge,
  }), []);

  // Enhanced drag and drop handlers
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      if (!type || !reactFlowInstance) {
        console.log('❌ Drop failed: missing type or reactFlowInstance');
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();

      // Use screenToFlowPosition for React Flow v12+
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      // Generate proper labels and data based on node type
      const getNodeConfig = (nodeType) => {
        const configs = {
          executeNode: { label: 'Execute Workflow', icon: '▶️', description: 'Start workflow execution' },
          apiConfigNode: { label: 'API Configuration', icon: '🔑', description: 'Configure AI API settings' },
          gitNode: { label: 'Git Repository', icon: '🐙', description: 'Fetch repository data' },
          textNode: { label: 'Text Input', icon: '📝', description: 'Text input/output' },
          filterNode: { label: 'Smart Filter', icon: '🔍', description: 'Filter files intelligently' },
          parseNode: { label: 'File Parser', icon: '🔧', description: 'Parse file contents' },
          chunkNode: { label: 'Universal Chunker', icon: '🧩', description: 'Chunk content for RAG' },
          vectorizeNode: { label: 'Vector Embeddings', icon: '🔮', description: 'Generate embeddings' },
          chatNode: { label: 'AI Chat', icon: '💬', description: 'Chat with AI models' },
        };
        return configs[nodeType] || { label: `${nodeType} Node`, icon: '⚡', description: 'Custom node' };
      };

      const config = getNodeConfig(type);
      const newNode = {
        id: `${type}_${Date.now()}`,
        type,
        position,
        data: {
          ...config,
          type,
          createdAt: Date.now(),
        },
      };

      console.log('🆕 Adding new node:', newNode);
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, type, setNodes]
  );

  // React Flow initialization
  const onInit = useCallback((rfi) => {
    setReactFlowInstance(rfi);
    console.log('🚀 ReactFlow initialized');
  }, []);

  // Enhanced connection handler
  const handleConnect = useCallback((params) => {
    console.log('🔗 Connecting nodes:', params);

    if (!params.source || !params.target) {
      console.error('❌ Invalid connection parameters');
      return;
    }

    // Validate connection using node types
    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);

    if (sourceNode && targetNode) {
      console.log(`✅ Connecting ${sourceNode.type} to ${targetNode.type}`);
    }

    onConnect(params);
  }, [onConnect, nodes]);

  // Selection change handler
  const onSelectionChange = useCallback((elements) => {
    setSelectedElements({
      nodes: elements.nodes || [],
      edges: elements.edges || []
    });
  }, []);

  // Delete handlers
  useEffect(() => {
    const handleDeleteNode = (event) => {
      const { id } = event.detail;
      console.log('🗑️ Deleting node:', id);

      setNodes((nds) => nds.filter((node) => node.id !== id));
      setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
    };

    const handleDeleteEdge = (event) => {
      const { id } = event.detail;
      console.log('🗑️ Deleting edge:', id);

      setEdges((eds) => eds.filter((edge) => edge.id !== id));
    };

    window.addEventListener('deleteNode', handleDeleteNode);
    window.addEventListener('deleteEdge', handleDeleteEdge);

    return () => {
      window.removeEventListener('deleteNode', handleDeleteNode);
      window.removeEventListener('deleteEdge', handleDeleteEdge);
    };
  }, [setNodes, setEdges]);

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Delete selected elements
      if (event.key === 'Delete') {
        if (selectedElements.nodes.length > 0) {
          const nodeIds = selectedElements.nodes.map(node => node.id);
          setNodes((nds) => nds.filter((node) => !nodeIds.includes(node.id)));
          setEdges((eds) => eds.filter((edge) =>
            !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
          ));
        }

        if (selectedElements.edges.length > 0) {
          const edgeIds = selectedElements.edges.map(edge => edge.id);
          setEdges((eds) => eds.filter((edge) => !edgeIds.includes(edge.id)));
        }
      }

      // Fit view
      if (event.key === 'f' && reactFlowInstance) {
        reactFlowInstance.fitView({ duration: 800 });
      }

      // Select all
      if (event.key === 'a' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setNodes((nds) => nds.map(node => ({ ...node, selected: true })));
        setEdges((eds) => eds.map(edge => ({ ...edge, selected: true })));
      }

      // Escape to deselect all
      if (event.key === 'Escape') {
        setNodes((nds) => nds.map(node => ({ ...node, selected: false })));
        setEdges((eds) => eds.map(edge => ({ ...edge, selected: false })));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElements, reactFlowInstance, setNodes, setEdges]);

  // Node execution handler
  const handleNodeExecution = useCallback((nodeId) => {
    console.log('🚀 Executing node:', nodeId);

    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                isExecuting: true,
                lastExecuted: Date.now(),
              },
            }
          : node
      )
    );

    // Simulate execution completion
    setTimeout(() => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  isExecuting: false,
                },
              }
            : node
        )
      );
    }, 3000);
  }, [setNodes]);

  // Expose execution handler globally
  useEffect(() => {
    window.executeNode = handleNodeExecution;
    return () => {
      delete window.executeNode;
    };
  }, [handleNodeExecution]);

  // Auto-save functionality
  useEffect(() => {
    const autoSave = () => {
      const flowData = {
        nodes,
        edges,
        timestamp: Date.now()
      };
      localStorage.setItem('flowboard-autosave', JSON.stringify(flowData));
    };

    const interval = setInterval(autoSave, 30000); // Auto-save every 30 seconds
    return () => clearInterval(interval);
  }, [nodes, edges]);

  return (
    <div className="w-full h-full relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onConnectEnd={onConnectEnd}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onInit={onInit}
        onSelectionChange={onSelectionChange}
        nodeTypes={memoizedNodeTypes}
        edgeTypes={memoizedEdgeTypes}
        {...FLOW_CONFIG}
        // Enhanced configuration
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Meta"
        selectNodesOnDrag={false}
        connectionLineStyle={{
          stroke: '#3b82f6',
          strokeWidth: 3,
          strokeDasharray: '8,8',
          animation: 'dash 20s linear infinite'
        }}
        defaultEdgeOptions={{
          type: 'custom',
          animated: true,
          style: {
            stroke: '#6b7280',
            strokeWidth: 2
          },
          markerEnd: {
            type: 'arrowclosed',
            color: '#6b7280',
          },
        }}
      >
      <Background
  variant="dots"
  gap={20}
  size={3}
  color="#94a3b8"
  style={{ opacity: 0.8 }}
/>

        <Controls
          showZoom={true}
          showFitView={true}
          showInteractive={true}
          position="bottom-left"
          style={{
            button: {
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }
          }}
        />
        <MiniMap
          nodeColor={(node) => {
            const colors = {
              apiConfigNode: '#3b82f6',
              chatNode: '#8b5cf6',
              executeNode: '#ef4444',
              gitNode: '#f59e0b',
              filterNode: '#6366f1',
              parseNode: '#8b5cf6',
              chunkNode: '#10b981',
              vectorizeNode: '#f97316',
              textNode: '#6b7280'
            };
            return colors[node.type] || '#9ca3af';
          }}
          nodeStrokeWidth={3}
          position="bottom-right"
          pannable
          zoomable
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
        />
      </ReactFlow>

      {/* Floating UI Components */}

      <ChatWindow />

      {/* Enhanced Stats Panel */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm text-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 text-xs font-mono">
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Nodes:</span>
            <span className="font-bold text-blue-600">{nodes.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Edges:</span>
            <span className="font-bold text-green-600">{edges.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Selected:</span>
            <span className="font-bold text-purple-600">
              {selectedElements.nodes.length + selectedElements.edges.length}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Executing:</span>
            <span className="font-bold text-orange-600">
              {nodes.filter(n => n.data?.isExecuting).length}
            </span>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="absolute bottom-4 left-4 bg-black/80 text-white p-2 rounded text-xs opacity-0 hover:opacity-100 transition-opacity">
        <div className="space-y-1">
          <div><kbd>Del</kbd> Delete selected</div>
          <div><kbd>F</kbd> Fit view</div>
          <div><kbd>Cmd+A</kbd> Select all</div>
          <div><kbd>Esc</kbd> Deselect all</div>
        </div>
      </div>
    </div>
  );
};

// Main Flowboard Component with Provider
const Flowboard = () => {
  return (
    <ReactFlowProvider>
      <FlowboardContent />
    </ReactFlowProvider>
  );
};

export default Flowboard;
