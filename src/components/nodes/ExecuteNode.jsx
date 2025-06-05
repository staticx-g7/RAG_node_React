import React, { useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';

const ExecuteNode = ({ id, data, isConnectable }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [error, setError] = useState(null);

  const { getNodes, getEdges } = useReactFlow();

  const triggerNextNodes = useCallback(async (currentNodeId) => {
    const edges = getEdges();
    const nodes = getNodes();

    // Find all outgoing edges from current node
    const outgoingEdges = edges.filter(edge => edge.source === currentNodeId);

    if (outgoingEdges.length > 0) {
      console.log(`🔗 ExecuteNode: Found ${outgoingEdges.length} connected node(s) to trigger`);

      // Trigger each connected node
      for (let i = 0; i < outgoingEdges.length; i++) {
        const edge = outgoingEdges[i];
        const targetNode = nodes.find(node => node.id === edge.target);

        if (targetNode) {
          console.log(`🎯 ExecuteNode: Triggering ${targetNode.type} node ${edge.target}`);

          setTimeout(() => {
            // Dispatch multiple event types to ensure compatibility
            window.dispatchEvent(new CustomEvent('triggerExecution', {
              detail: { nodeId: edge.target, sourceNodeId: currentNodeId }
            }));

            window.dispatchEvent(new CustomEvent('triggerPlayButton', {
              detail: { nodeId: edge.target, sourceNodeId: currentNodeId }
            }));

            window.dispatchEvent(new CustomEvent('autoExecute', {
              detail: { nodeId: edge.target, sourceNodeId: currentNodeId }
            }));
          }, i * 500);
        }
      }
    } else {
      console.log(`⏹️ ExecuteNode: No connected nodes found after execution`);
    }
  }, [getEdges, getNodes]);

  const handleExecution = useCallback(async () => {
    if (isExecuting) return;

    setIsExecuting(true);
    setError(null);
    setExecutionResult(null);

    try {
      console.log(`▶️ ExecuteNode ${id}: Starting execution`);

      // Simulate execution process
      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = {
        status: 'success',
        message: 'Execution completed successfully',
        timestamp: new Date().toISOString()
      };

      setExecutionResult(result);
      console.log(`✅ ExecuteNode ${id}: Execution completed successfully`);

      // Wait a moment before triggering next nodes
      await new Promise(resolve => setTimeout(resolve, 500));

      // Trigger next nodes in the chain
      await triggerNextNodes(id);

    } catch (error) {
      console.error(`❌ ExecuteNode ${id}: Execution failed:`, error);
      setError(error.message);
    } finally {
      setIsExecuting(false);
    }
  }, [id, isExecuting, triggerNextNodes]);

  return (
    <motion.div
      className="relative bg-gradient-to-br from-green-100 to-green-200 border-2 border-green-300 rounded-xl shadow-lg"
      style={{ width: '200px', minHeight: '120px' }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        style={{
          background: '#6b7280',
          width: '10px',
          height: '10px',
          border: '2px solid white'
        }}
        isConnectable={isConnectable}
      />

      <div className="p-4">
        <div className="flex items-center space-x-2 mb-3">
          <span className="text-xl">⚡</span>
          <h3 className="text-sm font-semibold text-gray-800">Execute</h3>
        </div>

        {/* Main Execute Button */}
        <motion.button
          onClick={handleExecution}
          disabled={isExecuting}
          className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
            isExecuting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl'
          }`}
          whileHover={!isExecuting ? { scale: 1.05 } : {}}
          whileTap={!isExecuting ? { scale: 0.95 } : {}}
        >
          <div className="flex items-center justify-center space-x-2">
            {isExecuting ? (
              <>
                <motion.div
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span>Executing...</span>
              </>
            ) : (
              <>
                <span>▶</span>
                <span>Execute</span>
              </>
            )}
          </div>
        </motion.button>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mt-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              ❌ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Display */}
        <AnimatePresence>
          {executionResult && (
            <motion.div
              className="text-xs text-green-600 bg-green-50 border border-green-200 rounded p-2 mt-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              ✅ {executionResult.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        style={{
          background: 'linear-gradient(45deg, #10b981, #3b82f6)',
          width: '10px',
          height: '10px',
          border: '2px solid white'
        }}
        isConnectable={isConnectable}
      />
    </motion.div>
  );
};

export default ExecuteNode;
