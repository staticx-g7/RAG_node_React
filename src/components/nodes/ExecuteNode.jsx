import React, { useState } from 'react';
import { motion } from 'framer-motion';
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

    // Find all edges that start from this node
    const outgoingEdges = edges.filter(edge => edge.source === id);

    if (outgoingEdges.length === 0) {
      console.log(`⚠️ No nodes connected to execution node ${data.label || id}`);
      return;
    }

    console.log(`▶️ Executing ${outgoingEdges.length} connected node(s) from ${data.label || 'Execute Node'}`);

    // Execute each connected node
    for (const edge of outgoingEdges) {
      const targetNode = nodes.find(node => node.id === edge.target);
      if (targetNode) {
        console.log(`✅ Processing: ${targetNode.data.label}`);

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

        console.log(`🎉 Completed: ${targetNode.data.label}`);

        // Reset execution state and trigger cascading execution
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

        // Trigger cascading execution for workflow automation
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('executionComplete', {
            detail: { nodeId: targetNode.id }
          }));
        }, 100);
      }
    }

    console.log(`🚀 Execution flow completed successfully!`);
  };

  const handleExecute = async (e) => {
    e.stopPropagation();
    setIsExecuting(true);

    console.log(`🔥 Execute button clicked on ${data.label || 'Execute Node'}`);

    try {
      await executeConnectedNodes();
    } catch (error) {
      console.error(`❌ Execution failed: ${error.message}`);
    }

    setIsExecuting(false);
  };

  // Listen for auto-execution triggers from other nodes
  React.useEffect(() => {
    const handleTriggerExecution = (event) => {
      if (event.detail.nodeId === id) {
        console.log(`🎯 Auto-triggering execution for ExecuteNode: ${id}`);
        handleExecute({ stopPropagation: () => {} });
      }
    };

    window.addEventListener('triggerExecution', handleTriggerExecution);

    return () => {
      window.removeEventListener('triggerExecution', handleTriggerExecution);
    };
  }, [id]);

  return (
    <motion.div
      className={`relative w-32 h-20 border-2 rounded-xl shadow-lg transition-all duration-200 group ${
        selected ? 'border-purple-600 ring-2 ring-purple-200' : 'border-purple-400'
      }`}
      // Animated background color transition for visual feedback
      animate={{
        background: isExecuting
          ? 'linear-gradient(135deg, #fecaca 0%, #ef4444 50%, #dc2626 100%)' // Red gradient when executing
          : 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 50%, #86efac 100%)'  // Green gradient when idle
      }}
      transition={{
        duration: 0.6,
        ease: "easeInOut"
      }}
      // Pulse animation during execution
      style={{
        scale: isExecuting ? [1, 1.05, 1] : 1,
      }}
    >
      {/* Delete button */}
      <button
        onClick={handleDelete}
        className={`absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 hover:scale-110 transition-all duration-200 shadow-lg z-10 ${
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        title="Delete node"
      >
        ×
      </button>

      {/* HANDLES - One per side for clean connectivity */}
      {/* Top Handle - Input (Blue) */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        isConnectable={isConnectable}
        style={{
          background: '#3b82f6',
          width: '12px',
          height: '12px',
          border: '2px solid white',
          zIndex: 10
        }}
      />

      {/* Right Handle - Output (Green) */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectable={isConnectable}
        style={{
          background: '#10b981',
          width: '12px',
          height: '12px',
          border: '2px solid white',
          zIndex: 10
        }}
      />

      {/* Bottom Handle - Output (Green) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectable={isConnectable}
        style={{
          background: '#10b981',
          width: '12px',
          height: '12px',
          border: '2px solid white',
          zIndex: 10
        }}
      />

      {/* Left Handle - Input (Blue) */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        isConnectable={isConnectable}
        style={{
          background: '#3b82f6',
          width: '12px',
          height: '12px',
          border: '2px solid white',
          zIndex: 10
        }}
      />

      {/* Centered Execute Button */}
      <div className="absolute inset-0 flex items-center justify-center p-2" style={{ zIndex: 1 }}>
        <motion.button
          onClick={handleExecute}
          disabled={isExecuting}
          className={`w-full h-full rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center ${
            isExecuting
              ? 'bg-white/90 text-red-700 cursor-not-allowed border border-red-300'
              : 'bg-white/90 hover:bg-white text-green-700 hover:scale-105 active:scale-95 shadow-md border border-green-300'
          }`}
          whileHover={!isExecuting ? { scale: 1.05 } : {}}
          whileTap={!isExecuting ? { scale: 0.95 } : {}}
          animate={{
            boxShadow: isExecuting
              ? '0 0 20px rgba(239, 68, 68, 0.5)'
              : '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}
        >
          {isExecuting ? (
            <motion.div
              className="flex items-center justify-center space-x-1"
              animate={{ opacity: [1, 0.7, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <motion.div
                className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <span className="text-xs">Executing...</span>
            </motion.div>
          ) : (
            <motion.span
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-sm"
            >
              ▶ Execute
            </motion.span>
          )}
        </motion.button>
      </div>

      {/* Animated status indicator */}
      <motion.div
        className="absolute -bottom-1 left-1/2 transform -translate-x-1/2"
        animate={{
          scale: isExecuting ? [1, 1.2, 1] : 0,
          opacity: isExecuting ? [0.8, 1, 0.8] : 0
        }}
        transition={{
          duration: 0.8,
          repeat: isExecuting ? Infinity : 0,
          ease: "easeInOut"
        }}
      >
        <div className={`w-2 h-2 rounded-full ${isExecuting ? 'bg-red-500' : 'bg-green-500'}`} />
      </motion.div>
    </motion.div>
  );
};

export default ExecuteNode;
