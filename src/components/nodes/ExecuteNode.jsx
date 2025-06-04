import React, { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';

const ExecuteNode = ({ id, data, isConnectable, selected }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const { getEdges, getNodes, setNodes } = useReactFlow();

  const handleDelete = (e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('deleteNode', { detail: { id } }));
  };

 const executeConnectedNodes = async () => {
  const edges = getEdges();
  const nodes = getNodes();

  console.log(`🚀 ExecuteNode ${id}: Starting execution flow`);

  // Find all edges that start from this node
  const outgoingEdges = edges.filter(edge => edge.source === id);

  if (outgoingEdges.length === 0) {
    console.warn(`⚠️ ExecuteNode ${id}: No connected nodes found`);
    return;
  }

  console.log(`📊 ExecuteNode ${id}: Found ${outgoingEdges.length} connected node(s)`);

  // Execute each connected node
  for (const edge of outgoingEdges) {
    const targetNode = nodes.find(node => node.id === edge.target);
    if (targetNode) {
      console.log(`▶️ Executing: ${targetNode.data.label} (ID: ${targetNode.id})`);

      // Update the target node to show it's being executed
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === targetNode.id) {
            return {
              ...node,
              data: {
                ...node.data,
                isExecuting: true,
                lastExecutedBy: id,
                executionTime: new Date().toISOString()
              }
            };
          }
          return node;
        })
      );

      // Simulate execution delay
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log(`✅ Completed: ${targetNode.data.label} (ID: ${targetNode.id})`);

      // Reset execution state
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === targetNode.id) {
            return {
              ...node,
              data: {
                ...node.data,
                isExecuting: false,
                lastExecuted: new Date().toISOString()
              }
            };
          }
          return node;
        })
      );
    }
  }

  console.log(`🎉 ExecuteNode ${id}: Execution flow completed successfully`);
};
  
  const handleExecute = async (e) => {
    e.stopPropagation();
    setIsExecuting(true);

    try {
      await executeConnectedNodes();
    } catch (error) {
      console.error('Execution error:', error);
    }

    setIsExecuting(false);
  };

  return (
    <div className={`relative min-w-48 bg-gradient-to-br from-purple-50 to-violet-100 border-2 rounded-xl shadow-lg transition-all duration-200 group ${
      selected ? 'border-purple-600 ring-2 ring-purple-200' : 'border-purple-400'
    } ${isExecuting ? 'animate-pulse' : ''}`}>

      {/* Delete button */}
      <button
        onClick={handleDelete}
        className={`absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 hover:scale-110 transition-all duration-200 shadow-lg ${
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        title="Delete node"
      >
        ×
      </button>

      {/* Input handle - Top */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        style={{ background: '#8b5cf6', width: '10px', height: '10px' }}
        isConnectable={isConnectable}
      />

      {/* Node content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          <h3 className="font-semibold text-purple-800 text-sm">
            {data.label || 'Execute Node'}
          </h3>
        </div>

        {/* Execute button */}
        <button
          onClick={handleExecute}
          disabled={isExecuting}
          className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
            isExecuting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-purple-500 hover:bg-purple-600 text-white hover:scale-105 active:scale-95 shadow-md'
          }`}
        >
          {isExecuting ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Executing...</span>
            </div>
          ) : (
            '▶ Execute Flow'
          )}
        </button>

        {/* Status hint */}
        <div className="mt-2 text-xs text-purple-500 opacity-75">
          Triggers all connected nodes
        </div>
      </div>

      {/* Output handle - Right side */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: '#8b5cf6', width: '10px', height: '10px' }}
        isConnectable={isConnectable}
      />
    </div>
  );
};

export default ExecuteNode;
