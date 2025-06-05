import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useReactFlow } from '@xyflow/react';

const PlayButton = ({ nodeId, nodeType, onExecute, disabled = false }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const { getNodes, getEdges } = useReactFlow();

  const handlePlay = async (e) => {
    e.stopPropagation();

    if (disabled || isExecuting) return;

    setIsExecuting(true);
    console.log(`▶️ PlayButton: Executing ${nodeType} node ${nodeId}`);

    try {
      const edges = getEdges();
      const nodes = getNodes();

      // Get data from connected input nodes
      const incomingEdges = edges.filter(edge => edge.target === nodeId);
      const inputData = {};

      incomingEdges.forEach(edge => {
        const sourceNode = nodes.find(node => node.id === edge.source);
        if (sourceNode && sourceNode.data) {
          inputData[edge.sourceHandle || 'default'] = sourceNode.data;
          console.log(`📥 PlayButton: Received data from ${sourceNode.type} node`);
        }
      });

      if (onExecute) {
        await onExecute(inputData);
      }

      console.log(`✅ PlayButton: Successfully executed ${nodeType} node ${nodeId}`);

      // Trigger next nodes in the chain
      setTimeout(() => {
        console.log(`🔗 PlayButton: Triggering next nodes after ${nodeType} completion`);
        window.dispatchEvent(new CustomEvent('executionComplete', {
          detail: { nodeId }
        }));
      }, 500);

    } catch (error) {
      console.error(`❌ PlayButton: Execution failed for ${nodeType} node ${nodeId}:`, error.message);
    } finally {
      setIsExecuting(false);
    }
  };

  // Listen for auto-execution triggers
  useEffect(() => {
    const handleTriggerPlayButton = (event) => {
      if (event.detail.nodeId === nodeId) {
        console.log(`🎯 PlayButton: Auto-triggered for ${nodeType} node ${nodeId}`);
        handlePlay({ stopPropagation: () => {} });
      }
    };

    window.addEventListener('triggerPlayButton', handleTriggerPlayButton);

    return () => {
      window.removeEventListener('triggerPlayButton', handleTriggerPlayButton);
    };
  }, [nodeId, nodeType]);

  return (
    <motion.button
      onClick={handlePlay}
      disabled={disabled || isExecuting}
      className={`absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shadow-lg z-20 transition-all duration-200 ${
        disabled || isExecuting
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-green-500 hover:bg-green-600 text-white'
      }`}
      title={`Execute ${nodeType} node`}
      whileHover={!disabled && !isExecuting ? { scale: 1.15 } : {}}
      whileTap={!disabled && !isExecuting ? { scale: 0.9 } : {}}
      animate={{
        boxShadow: isExecuting
          ? '0 0 12px rgba(34, 197, 94, 0.6)'
          : '0 2px 6px rgba(0, 0, 0, 0.2)'
      }}
    >
      {isExecuting ? (
        <motion.div
          className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      ) : (
        <span className="text-xs">▶</span>
      )}
    </motion.button>
  );
};

export default PlayButton;
