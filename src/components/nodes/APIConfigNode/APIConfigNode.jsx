import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import PlayButton from '../../ui/PlayButton';

// Simplified Background Beams
const BackgroundBeams = ({ className }) => (
  <div className={`absolute inset-0 pointer-events-none ${className}`}>
    <svg className="absolute inset-0 h-full w-full opacity-20" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="api-beams" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M0 40L40 0H20L0 20M40 40V20L20 40" stroke="rgba(156, 163, 175, 0.1)" fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#api-beams)" />
    </svg>
  </div>
);

// Floating icon animation
const FloatingIcon = ({ children, isProcessing }) => (
  <motion.div
    animate={{
      y: [0, -2, 0],
      rotate: isProcessing ? 360 : 0,
    }}
    transition={{
      y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
      rotate: { duration: isProcessing ? 2 : 0, repeat: isProcessing ? Infinity : 0, ease: "linear" }
    }}
  >
    {children}
  </motion.div>
);

const APIConfigNode = ({ id, data, isConnectable, selected }) => {
  const [apiKey, setApiKey] = useState(data?.apiKey || '');
  const [apiEndpoint, setApiEndpoint] = useState(data?.apiEndpoint || 'https://api.openai.com/v1');
  const [availableModels, setAvailableModels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const { setNodes, getNodes, getEdges } = useReactFlow();
  const updateTimeoutRef = useRef(null);

  // **CHAIN REACTION FUNCTIONALITY**
  const triggerNextNodes = useCallback(async (currentNodeId) => {
    const edges = getEdges();
    const nodes = getNodes();

    const outgoingEdges = edges.filter(edge => edge.source === currentNodeId);

    if (outgoingEdges.length > 0) {
      console.log(`🔗 APIConfigNode: Found ${outgoingEdges.length} connected node(s) to trigger`);

      for (let i = 0; i < outgoingEdges.length; i++) {
        const edge = outgoingEdges[i];
        const targetNode = nodes.find(node => node.id === edge.target);

        if (targetNode) {
          console.log(`🎯 APIConfigNode: Triggering ${targetNode.type} node ${edge.target}`);

          setTimeout(() => {
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
    }
  }, [getEdges, getNodes]);

  // **FETCH AVAILABLE MODELS**
  const fetchAvailableModels = useCallback(async () => {
    if (!apiKey || !apiEndpoint) {
      setError('Please provide API key and endpoint');
      return;
    }

    setIsLoading(true);
    setError(null);
    setConnectionStatus('connecting');

    try {
      console.log(`🔍 APIConfigNode ${id}: Testing connection to ${apiEndpoint}`);

      const response = await fetch(`${apiEndpoint}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ APIConfigNode ${id}: Successfully connected! Found ${data.data?.length || 0} models`);

      setAvailableModels(data.data || []);
      setConnectionStatus('connected');

      // **TRIGGER CONNECTED NODES WITH API CONFIG**
      await triggerNextNodes(id);

    } catch (error) {
      console.error(`❌ APIConfigNode ${id}: Connection failed:`, error);
      setError(`Connection failed: ${error.message}`);
      setConnectionStatus('error');
      setAvailableModels([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, apiEndpoint, id, triggerNextNodes]);

  // **DEBOUNCED NODE DATA UPDATE**
  useEffect(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                apiKey,
                apiEndpoint,
                availableModels,
                connectionStatus,
                lastUpdated: new Date().toISOString()
              }
            };
          }
          return node;
        })
      );
    }, 1000);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [apiKey, apiEndpoint, availableModels, connectionStatus, id, setNodes]);

  // **NODE EXECUTION HANDLER**
  const handleNodeExecution = useCallback(async () => {
    console.log(`🎯 APIConfigNode ${id}: Executing API configuration test`);

    if (apiKey && apiEndpoint) {
      await fetchAvailableModels();
    } else {
      setError('Please provide API key and endpoint before testing');
    }
  }, [id, fetchAvailableModels, apiKey, apiEndpoint]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('deleteNode', { detail: { id } }));
  }, [id]);

  const handleInteractionEvent = useCallback((e) => {
    e.stopPropagation();
  }, []);

  // **PRESET CONFIGURATIONS**
  const presetConfigs = [
    {
      name: 'OpenAI',
      endpoint: 'https://api.openai.com/v1',
      icon: '🤖',
      description: 'Official OpenAI API'
    },
    {
      name: 'Blablador (Jülich)',
      endpoint: 'https://api.helmholtz-blablador.fz-juelich.de/v1',
      icon: '🏛️',
      description: 'Helmholtz Foundation LLM'
    },
    {
      name: 'Azure OpenAI',
      endpoint: 'https://your-resource.openai.azure.com/openai/deployments/your-deployment',
      icon: '☁️',
      description: 'Azure OpenAI Service'
    },
    {
      name: 'Local/Custom',
      endpoint: 'http://localhost:8000/v1',
      icon: '🏠',
      description: 'Local or custom endpoint'
    }
  ];

  const applyPreset = useCallback((preset) => {
    setApiEndpoint(preset.endpoint);
  }, []);

  return (
    <motion.div
      className={`relative w-80 bg-gradient-to-br from-cyan-50 via-teal-50 to-blue-50 border-2 border-cyan-200 rounded-xl shadow-lg group nowheel overflow-visible ${
        selected ? 'ring-2 ring-cyan-300' : ''
      }`}
      style={{ minHeight: '500px' }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onPointerDown={(e) => {
        if (e.target.closest('input, button, select, .nowheel, .nodrag')) {
          e.stopPropagation();
        }
      }}
      whileHover={{
        scale: 1.01,
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)"
      }}
    >
      {/* Background Beams when loading */}
      <AnimatePresence>
        {isLoading && (
          <BackgroundBeams className="opacity-20" />
        )}
      </AnimatePresence>

      {/* **FIXED: PlayButton positioning** */}
      <div className="absolute -top-4 -left-4 z-30">
        <PlayButton
          nodeId={id}
          nodeType="apiConfig"
          onExecute={handleNodeExecution}
          disabled={isLoading}
        />
      </div>

      {/* **FIXED: Delete button positioning** */}
      <motion.button
        onClick={handleDelete}
        className={`absolute -top-2 -right-2 w-6 h-6 bg-red-400 text-white rounded-full flex items-center justify-center text-sm font-bold hover:bg-red-500 shadow-lg z-30 ${
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        title="Delete node"
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
      >
        ×
      </motion.button>

      <div className="p-4 pt-8 nowheel">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-4">
          <FloatingIcon isProcessing={isLoading}>
            <span className="text-xl">🔑</span>
          </FloatingIcon>
          <h3 className="text-sm font-semibold text-cyan-800">
            API Configuration
          </h3>
        </div>

        {/* Preset Configurations */}
        <div className="mb-4">
          <label className="text-xs font-medium text-cyan-700 mb-2 block">⚡ Quick Setup</label>
          <div className="grid grid-cols-2 gap-2">
            {presetConfigs.map((preset, index) => (
              <motion.button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                onMouseDown={handleInteractionEvent}
                className="p-2 text-xs bg-gradient-to-r from-cyan-50 to-teal-50 hover:from-cyan-100 hover:to-teal-100 border border-cyan-200 rounded-lg transition-colors nodrag"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title={preset.description}
              >
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-sm">{preset.icon}</span>
                  <span className="font-medium text-cyan-800">{preset.name}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* API Endpoint */}
        <div className="mb-4">
          <label className="text-xs font-medium text-cyan-700 mb-2 block">🌐 API Endpoint</label>
          <motion.input
            type="text"
            value={apiEndpoint}
            onChange={(e) => setApiEndpoint(e.target.value)}
            onMouseDown={handleInteractionEvent}
            placeholder="https://api.openai.com/v1"
            className="w-full p-2 text-xs border border-cyan-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-gradient-to-r from-cyan-50 to-teal-50 text-cyan-800 nodrag"
            whileFocus={{ scale: 1.01 }}
          />
        </div>

        {/* API Key */}
        <div className="mb-4">
          <label className="text-xs font-medium text-cyan-700 mb-2 block">🔑 API Key</label>
          <div className="relative">
            <motion.input
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onMouseDown={handleInteractionEvent}
              placeholder="Enter your API key"
              className="w-full p-2 pr-8 text-xs border border-cyan-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-gradient-to-r from-cyan-50 to-teal-50 text-cyan-800 nodrag"
              whileFocus={{ scale: 1.01 }}
            />
            <motion.button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-cyan-600 hover:text-cyan-800 nodrag"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {showApiKey ? '🙈' : '👁️'}
            </motion.button>
          </div>
        </div>

        {/* Test Connection Button */}
        <motion.button
          onClick={fetchAvailableModels}
          onMouseDown={handleInteractionEvent}
          disabled={isLoading || !apiKey || !apiEndpoint}
          className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 mb-3 nodrag ${
            isLoading || !apiKey || !apiEndpoint
              ? 'bg-cyan-200 text-cyan-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white shadow-lg'
          }`}
          whileHover={{
            scale: isLoading || !apiKey || !apiEndpoint ? 1 : 1.02,
            boxShadow: isLoading || !apiKey || !apiEndpoint ? undefined : "0 8px 20px rgba(6, 182, 212, 0.3)"
          }}
          whileTap={{ scale: isLoading || !apiKey || !apiEndpoint ? 1 : 0.98 }}
        >
          <div className="flex items-center justify-center space-x-2">
            {isLoading ? (
              <>
                <motion.div
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span>Testing Connection...</span>
              </>
            ) : (
              <>
                <span>🔍</span>
                <span>Test API Connection</span>
              </>
            )}
          </div>
        </motion.button>

        {/* Connection Status */}
        <div className="mb-3">
          <div
            className={`text-xs px-3 py-2 rounded-full inline-block transition-all duration-300 ${
              connectionStatus === 'connected'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : connectionStatus === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : connectionStatus === 'connecting'
                ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                : 'bg-cyan-50 text-cyan-600 border border-cyan-200'
            }`}
          >
            {connectionStatus === 'connected' && '✅ API Connected'}
            {connectionStatus === 'error' && '❌ Connection Failed'}
            {connectionStatus === 'connecting' && '🔄 Connecting...'}
            {connectionStatus === 'disconnected' && '⏸️ Ready to Connect'}
          </div>
        </div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-3"
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              ❌ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Available Models */}
        <AnimatePresence>
          {availableModels.length > 0 && (
            <motion.div
              className="text-xs bg-white border border-cyan-200 rounded-lg overflow-hidden shadow-lg nowheel"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onMouseDown={handleInteractionEvent}
            >
              <motion.div
                className="bg-gradient-to-r from-cyan-50 to-teal-50 p-3 cursor-pointer hover:from-cyan-100 hover:to-teal-100 transition-all duration-300 nodrag"
                onClick={() => setIsExpanded(!isExpanded)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-cyan-800">
                    🤖 Available Models
                  </div>
                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="text-cyan-600"
                  >
                    ▼
                  </motion.span>
                </div>
                <div className="text-cyan-700 text-xs mt-1">
                  {availableModels.length} models available
                </div>
              </motion.div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className="max-h-48 overflow-y-auto bg-white p-2 nowheel"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    onMouseDown={handleInteractionEvent}
                  >
                    {availableModels.slice(0, 20).map((model, index) => (
                      <motion.div
                        key={model.id}
                        className="flex items-center space-x-2 py-1 hover:bg-cyan-50 rounded transition-colors"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        whileHover={{ scale: 1.01, x: 4 }}
                      >
                        <span className="text-sm">
                          {model.id.includes('embedding') || model.id.includes('embed') ? '🔮' :
                           model.id.includes('gpt') || model.id.includes('chat') ? '💬' : '🤖'}
                        </span>
                        <span className="text-xs text-cyan-700 flex-1 truncate">{model.id}</span>
                        {model.owned_by && (
                          <span className="text-xs text-cyan-500 bg-cyan-100 px-1 rounded">
                            {model.owned_by}
                          </span>
                        )}
                      </motion.div>
                    ))}
                    {availableModels.length > 20 && (
                      <div className="text-xs text-cyan-500 text-center py-1">
                        ...and {availableModels.length - 20} more models
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* **FIXED: Output Handle** */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          background: 'linear-gradient(45deg, #06b6d4, #0891b2)',
          width: '16px',
          height: '16px',
          border: '3px solid white',
          borderRadius: '50%',
          boxShadow: '0 2px 8px rgba(6, 182, 212, 0.4)',
          right: '-8px'
        }}
        isConnectable={isConnectable}
      />
    </motion.div>
  );
};

export default APIConfigNode;
