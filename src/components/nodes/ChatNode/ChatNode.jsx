import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Handle, Position, useReactFlow } from '@xyflow/react';

const BackgroundBeams = ({ className }) => (
  <div className={`absolute inset-0 overflow-hidden ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/20 via-green-50/20 to-teal-50/20" />
    <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-emerald-200/30 to-transparent" />
    <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-green-200/30 to-transparent" />
  </div>
);

const ChatNode = ({ id, data, selected }) => {
  const { updateNodeData, getNodes, getEdges } = useReactFlow();

  // State management
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectedApiConfig, setConnectedApiConfig] = useState(null);
  const [connectedVectorData, setConnectedVectorData] = useState(null);
  const [messages, setMessages] = useState(data.messages || []);
  const [availableModels, setAvailableModels] = useState([]);
  const [isChatWindowOpen, setIsChatWindowOpen] = useState(false);

  // Chat settings
  const [settings, setSettings] = useState({
    model: data.model || '',
    creativity: data.creativity || 0.7,
    maxResponseLength: data.maxResponseLength || 2000, // Increased for better responses
    useKnowledgeBase: data.useKnowledgeBase !== false,
    knowledgeBaseContent: data.knowledgeBaseContent || '',
    systemPrompt: data.systemPrompt || 'You are a helpful AI assistant with access to repository information. Use the provided context to answer questions accurately.',
    contextWindow: data.contextWindow || 10,
    streamResponse: data.streamResponse !== false,
    autoOpenChat: data.autoOpenChat !== false,
  });

  const [stats, setStats] = useState({
    totalMessages: messages.length,
    lastMessageTime: null,
    tokensUsed: 0,
    averageResponseTime: 0,
    knowledgeBaseSize: 0,
  });

  // ENHANCED: Strict API config detection
  const getApiConfig = useCallback(() => {
    try {
      const edges = getEdges();
      const nodes = getNodes();

      console.log('🔍 ChatNode searching for API config...');
      console.log('📊 Current node ID:', id);
      console.log('📊 Edges targeting this node:', edges.filter(e => e.target === id));

      // Only look for direct connections to this specific node
      const apiConfigEdge = edges.find(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        return edge.target === id && sourceNode && sourceNode.type === 'apiConfigNode';
      });

      if (apiConfigEdge) {
        console.log('✅ Found API config edge:', apiConfigEdge);
        const apiConfigNode = nodes.find(node => node.id === apiConfigEdge.source);

        if (apiConfigNode && apiConfigNode.type === 'apiConfigNode' && apiConfigNode.data) {
          const config = {
            provider: apiConfigNode.data.provider || 'custom',
            endpoint: apiConfigNode.data.endpoint || '',
            apiKey: apiConfigNode.data.apiKey || '',
            token: apiConfigNode.data.token || '',
            headers: apiConfigNode.data.headers || {},
            isConnected: apiConfigNode.data.isConnected || false,
            availableModels: apiConfigNode.data.availableModels || [],
            chatModels: apiConfigNode.data.chatModels || [],
          };

          console.log('✅ Extracted config for Chat:', config);
          setConnectedApiConfig(config);
          return config;
        }
      }

      console.log('❌ No API config found for ChatNode (strict mode)');
      setConnectedApiConfig(null);
      return {};
    } catch (error) {
      console.error('❌ Error getting API config:', error);
      setConnectedApiConfig(null);
      return {};
    }
  }, [id, getNodes, getEdges]);

  // ENHANCED: Get vector data with comprehensive metadata extraction
  const getVectorData = useCallback(() => {
    try {
      const edges = getEdges();
      const nodes = getNodes();

      console.log('🔍 ChatNode looking for vector data...');

      const vectorEdge = edges.find(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        return edge.target === id && sourceNode && sourceNode.type === 'vectorizeNode';
      });

      if (vectorEdge) {
        const vectorNode = nodes.find(node => node.id === vectorEdge.source);

        if (vectorNode && vectorNode.data) {
          console.log('✅ Found vector node:', vectorNode.data);

          const vectorData = {
            vectors: vectorNode.data.vectorizationResults?.vectors || [],
            metadata: vectorNode.data.vectorizationResults?.metadata || {},
            stats: vectorNode.data.stats || {},
            nodeType: vectorNode.type,
            // ENHANCED: Extract comprehensive repository context
            repositoryInfo: {
              totalVectors: vectorNode.data.stats?.totalVectors || 0,
              embeddingModel: vectorNode.data.vectorizationResults?.metadata?.model || 'unknown',
              dimensions: vectorNode.data.vectorizationResults?.metadata?.dimensions || 0,
              sourceNodeType: vectorNode.data.vectorizationResults?.metadata?.sourceNodeType || 'unknown'
            }
          };

          // ENHANCED: Process and structure knowledge base content
          if (vectorData.vectors.length > 0) {
            const structuredKnowledge = vectorData.vectors.map((vector, index) => {
              const metadata = vector.metadata || {};
              return {
                id: vector.id || `chunk_${index}`,
                content: metadata.text || '',
                filename: metadata.filename || metadata.path || metadata.source || `file_${index}`,
                chunkIndex: metadata.chunk_index || index,
                source: metadata.source || 'unknown',
                textLength: metadata.text_length || 0,
                embeddingModel: metadata.embedding_model || 'unknown'
              };
            }).filter(item => item.content.trim().length > 0);

            // Create comprehensive knowledge base content
            const knowledgeContent = structuredKnowledge
              .map((item, index) => {
                return `[${item.filename} - Chunk ${item.chunkIndex + 1}]\n${item.content}`;
              })
              .join('\n\n---\n\n');

            console.log('📚 Processed knowledge base:', {
              totalChunks: structuredKnowledge.length,
              contentLength: knowledgeContent.length,
              sampleFiles: structuredKnowledge.slice(0, 3).map(s => s.filename)
            });

            // Update settings with processed knowledge
            if (settings.useKnowledgeBase && knowledgeContent) {
              handleSettingChange('knowledgeBaseContent', knowledgeContent);
              setStats(prev => ({
                ...prev,
                knowledgeBaseSize: knowledgeContent.length
              }));
            }

            vectorData.structuredKnowledge = structuredKnowledge;
            vectorData.processedContent = knowledgeContent;
          }

          setConnectedVectorData(vectorData);
          return vectorData;
        }
      }

      console.log('❌ No vector data found');
      setConnectedVectorData(null);
      return { vectors: [], metadata: {}, stats: {}, nodeType: null };
    } catch (error) {
      console.error('❌ Error getting vector data:', error);
      setConnectedVectorData(null);
      return { vectors: [], metadata: {}, stats: {}, nodeType: null };
    }
  }, [id, getNodes, getEdges, settings.useKnowledgeBase]);

  // Monitor for API config and vector data changes
  useEffect(() => {
    const interval = setInterval(() => {
      getApiConfig();
      getVectorData();
    }, 2000);

    return () => clearInterval(interval);
  }, [getApiConfig, getVectorData]);

  // Extract available models with proper type checking
  useEffect(() => {
    if (connectedApiConfig && connectedApiConfig.chatModels && connectedApiConfig.chatModels.length > 0) {
      setAvailableModels(connectedApiConfig.chatModels);

      if (!settings.model && connectedApiConfig.chatModels.length > 0) {
        handleSettingChange('model', connectedApiConfig.chatModels[0]);
      }
    } else if (connectedApiConfig && connectedApiConfig.availableModels && connectedApiConfig.availableModels.length > 0) {
      // Filter out embedding models with proper type checking
      const chatModels = connectedApiConfig.availableModels.filter(model => {
        try {
          if (typeof model !== 'string') {
            const modelName = model?.id || model?.name || model?.model || '';
            return typeof modelName === 'string' &&
                   !modelName.toLowerCase().includes('embedding') &&
                   !modelName.toLowerCase().includes('embed');
          }

          return !model.toLowerCase().includes('embedding') &&
                 !model.toLowerCase().includes('embed');
        } catch (error) {
          console.warn('Error filtering model:', model, error);
          return false;
        }
      }).map(model => {
        try {
          if (typeof model === 'string') {
            return model;
          }
          return model?.id || model?.name || model?.model || 'Unknown Model';
        } catch (error) {
          console.warn('Error normalizing model:', model, error);
          return 'Unknown Model';
        }
      }).filter(modelName => modelName !== 'Unknown Model');

      setAvailableModels(chatModels);

      if (!settings.model && chatModels.length > 0) {
        handleSettingChange('model', chatModels[0]);
      }
    } else {
      setAvailableModels([]);
    }
  }, [connectedApiConfig, settings.model]);

  // Update node data when settings change
  useEffect(() => {
    updateNodeData(id, {
      ...settings,
      stats,
      connectedApiConfig,
      connectedVectorData,
      messages,
      availableModels,
      isChatWindowOpen,
      lastUpdated: Date.now()
    });
  }, [settings, stats, connectedApiConfig, connectedVectorData, messages, availableModels, isChatWindowOpen, id, updateNodeData]);

  // Handle setting changes
  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
  };

  // ENHANCED: Send message with proper endpoint construction
  const sendMessage = useCallback(async (messageText) => {
    if (!messageText.trim() || !connectedApiConfig) return;

    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    const startTime = Date.now();

    try {
      // Construct proper chat completions endpoint
      let chatEndpoint;
      if (connectedApiConfig.provider === 'blablador' || connectedApiConfig.endpoint?.includes('blablador')) {
        chatEndpoint = `${connectedApiConfig.endpoint}/chat/completions`;
      } else if (connectedApiConfig.provider === 'openai') {
        chatEndpoint = 'https://api.openai.com/v1/chat/completions';
      } else {
        chatEndpoint = `${connectedApiConfig.endpoint}/chat/completions`;
      }

      console.log('🔍 Using chat endpoint:', chatEndpoint);

      // Prepare messages for API
      const apiMessages = [];

      if (settings.systemPrompt) {
        apiMessages.push({
          role: 'system',
          content: settings.systemPrompt
        });
      }

      // ENHANCED: Better knowledge base integration
      if (settings.useKnowledgeBase && connectedVectorData?.processedContent) {
        apiMessages.push({
          role: 'system',
          content: `You have access to the hellogitworld repository. Here is the repository content:

${connectedVectorData.processedContent}

Instructions:
- Use the above repository information to answer questions about the hellogitworld repository
- Reference specific files and code when relevant
- Be specific about what the repository contains and does
- Don't say you don't have access - you have the repository content above`
        });

        console.log('📚 Added repository context:', connectedVectorData.processedContent.length, 'characters');
      }

      const recentMessages = messages.slice(-settings.contextWindow);
      recentMessages.forEach(msg => {
        apiMessages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        });
      });

      apiMessages.push({
        role: 'user',
        content: messageText
      });

      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connectedApiConfig.apiKey || connectedApiConfig.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: settings.model,
          messages: apiMessages,
          temperature: settings.creativity,
          max_tokens: settings.maxResponseLength,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      const assistantMessage = {
        id: Date.now() + 1,
        text: data.choices[0].message.content,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        responseTime
      };

      setMessages(prev => [...prev, assistantMessage]);

      setStats(prev => ({
        ...prev,
        totalMessages: prev.totalMessages + 2,
        lastMessageTime: Date.now(),
        tokensUsed: prev.tokensUsed + (data.usage?.total_tokens || 0),
        averageResponseTime: (prev.averageResponseTime + responseTime) / 2
      }));

    } catch (error) {
      console.error('❌ Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: `Error: ${error.message}`,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [connectedApiConfig, settings, messages]);

  // ENHANCED: Open chat window with comprehensive data
  const openChatWindow = useCallback(() => {
    console.log('🔥 Opening chat window...', {
      nodeId: id,
      hasApiConfig: !!connectedApiConfig,
      hasModel: !!settings.model,
      isConnected: connectedApiConfig?.isConnected,
      vectorsCount: connectedVectorData?.vectors?.length || 0
    });

    // Create comprehensive chat data object
    const chatData = {
      nodeId: id,
      apiConfig: connectedApiConfig,
      settings: settings,
      messages: messages,
      sendMessage: sendMessage,
      isLoading: isLoading,
      availableModels: availableModels,
      // ENHANCED: Pass comprehensive vector data
      vectorData: connectedVectorData ? {
        vectors: connectedVectorData.vectors,
        metadata: connectedVectorData.metadata,
        stats: connectedVectorData.stats,
        repositoryInfo: connectedVectorData.repositoryInfo,
        structuredKnowledge: connectedVectorData.structuredKnowledge,
        processedContent: connectedVectorData.processedContent
      } : null
    };

    console.log('🚀 Dispatching openChatWindow event with enhanced data:', {
      vectorsCount: chatData.vectorData?.vectors?.length || 0,
      knowledgeSize: chatData.vectorData?.processedContent?.length || 0,
      hasKnowledge: !!chatData.vectorData?.processedContent
    });

    // Dispatch custom event to open chat window
    const chatEvent = new CustomEvent('openChatWindow', {
      detail: chatData
    });

    window.dispatchEvent(chatEvent);
    setIsChatWindowOpen(true);
  }, [id, connectedApiConfig, settings, messages, sendMessage, isLoading, availableModels, connectedVectorData]);

  // Clear conversation
  const clearConversation = useCallback(() => {
    setMessages([]);
    setStats(prev => ({
      ...prev,
      totalMessages: 0,
      tokensUsed: 0
    }));
  }, []);

  // Debug connections
  const debugConnections = useCallback(() => {
    const edges = getEdges();
    const nodes = getNodes();

    console.log('🧪 Debug ChatNode connections:');
    console.log('All edges:', edges);
    console.log('Edges to this node:', edges.filter(e => e.target === id));
    console.log('All nodes:', nodes.map(n => ({ id: n.id, type: n.type, hasData: !!n.data })));
    console.log('API Config:', connectedApiConfig);
    console.log('Vector Data:', connectedVectorData);
    console.log('Available Models:', availableModels);

    alert(`Debug Info:
Node ID: ${id}
API Connected: ${!!connectedApiConfig?.isConnected}
Model Selected: ${!!settings.model}
Vectors Available: ${connectedVectorData?.vectors?.length || 0}
Knowledge Base Size: ${connectedVectorData?.processedContent?.length || 0} chars
Use Knowledge Base: ${settings.useKnowledgeBase}

Check console for detailed logs`);
  }, [getEdges, getNodes, id, connectedApiConfig, connectedVectorData, availableModels, settings]);

  // Get connection status for display
  const getConnectionStatus = () => {
    if (connectedApiConfig && connectedApiConfig.isConnected && settings.model) {
      return { status: 'ready', message: 'Ready to Chat', color: 'green' };
    } else if (connectedApiConfig && connectedApiConfig.isConnected && !settings.model) {
      return { status: 'no-model', message: 'Select Model', color: 'orange' };
    } else if (connectedApiConfig && !connectedApiConfig.isConnected) {
      return { status: 'disconnected', message: 'API Disconnected', color: 'red' };
    } else {
      return { status: 'no-api', message: 'Connect API Config Node', color: 'red' };
    }
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="relative">
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-3 h-3 bg-blue-400 border-2 border-white"
        style={{ top: '20px' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="api-config"
        className="w-3 h-3 bg-purple-400 border-2 border-white"
        style={{ top: '40px' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 bg-green-400 border-2 border-white"
        style={{ top: '20px' }}
      />

      <motion.div
        className={`bg-white rounded-xl shadow-lg border-2 transition-all duration-300 overflow-hidden cursor-pointer ${
          selected ? 'border-emerald-400 shadow-emerald-100' : 'border-gray-200'
        }`}
        style={{ width: '300px', minHeight: '140px' }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
        onClick={connectionStatus.status === 'ready' ? openChatWindow : undefined}
      >
        <BackgroundBeams className="rounded-xl" />

        {/* Header */}
        <div className="relative z-10 p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">💬</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">AI Chat</h3>
                <p className="text-xs text-gray-500">
                  {settings.model || 'No model selected'}
                  {messages.length > 0 && (
                    <span className="text-green-600"> • {messages.length} messages</span>
                  )}
                  {connectedVectorData && connectedVectorData.vectors.length > 0 && (
                    <span className="text-blue-600"> • {connectedVectorData.vectors.length} vectors</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSettings(!showSettings);
                }}
                className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                title="Settings"
              >
                ⚙️
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  debugConnections();
                }}
                className="w-6 h-6 flex items-center justify-center rounded bg-red-100 hover:bg-red-200 transition-colors"
                title="Debug Connections"
              >
                🧪
              </button>
              {messages.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearConversation();
                  }}
                  className="w-6 h-6 flex items-center justify-center rounded bg-red-100 hover:bg-red-200 transition-colors"
                  title="Clear Conversation"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ENHANCED: Clean Status Display with Repository Info */}
        <div className="relative z-10 px-4 py-3 border-b border-gray-100">
          <div
            className={`text-sm px-3 py-2 rounded-lg text-center font-medium transition-all cursor-pointer ${
              connectionStatus.color === 'green'
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : connectionStatus.color === 'orange'
                ? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                : 'bg-red-100 text-red-800'
            }`}
            onClick={connectionStatus.status === 'ready' ? openChatWindow : undefined}
          >
            {connectionStatus.status === 'ready' ? (
              <>
                <span className="text-lg">💬</span>
                <div className="mt-1">Click to Open Chat</div>
                <div className="text-xs opacity-75">
                  {connectedApiConfig?.provider === 'blablador' ? 'Blablador (JSC)' :
                   connectedApiConfig?.provider === 'openai' ? 'OpenAI' :
                   connectedApiConfig?.provider || 'API'} • {settings.model}
                </div>
                {connectedVectorData && connectedVectorData.vectors.length > 0 && (
                  <div className="text-xs opacity-75 mt-1 text-blue-700">
                    📚 Repository loaded ({connectedVectorData.vectors.length} vectors)
                  </div>
                )}
              </>
            ) : (
              <>
                <span className="text-lg">⚠️</span>
                <div className="mt-1">{connectionStatus.message}</div>
                <div className="text-xs opacity-75">
                  {connectionStatus.status === 'no-model' ? 'Select a model in settings' :
                   connectionStatus.status === 'disconnected' ? 'Check API configuration' :
                   'Connect an API Configuration node'}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Enhanced Message Stats */}
        {(messages.length > 0 || (connectedVectorData && connectedVectorData.vectors.length > 0)) && (
          <div className="relative z-10 px-4 py-2 bg-emerald-50 border-b border-emerald-100">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-semibold text-emerald-700">{messages.length}</div>
                <div className="text-emerald-600">Messages</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-emerald-700">{connectedVectorData?.vectors?.length || 0}</div>
                <div className="text-emerald-600">Vectors</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-emerald-700">{Math.round(stats.averageResponseTime) || 0}ms</div>
                <div className="text-emerald-600">Avg Time</div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="relative z-10 border-b border-gray-100 bg-gray-50/50"
            >
              <div className="p-4 space-y-4">
                {/* Model Selection */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Chat Model
                    {availableModels.length > 0 && (
                      <span className="text-green-600"> ({availableModels.length} available)</span>
                    )}
                  </label>
                  <select
                    value={settings.model}
                    onChange={(e) => handleSettingChange('model', e.target.value)}
                    disabled={!connectedApiConfig || availableModels.length === 0}
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
                  >
                    <option value="">Select a model...</option>
                    {availableModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>

                {/* Creativity Slider */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Creativity ({settings.creativity})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={settings.creativity}
                    onChange={(e) => handleSettingChange('creativity', parseFloat(e.target.value))}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full nodrag"
                  />
                </div>

                {/* Max Response Length */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Max Response Length ({settings.maxResponseLength} tokens)
                  </label>
                  <input
                    type="range"
                    min="500"
                    max="4000"
                    step="100"
                    value={settings.maxResponseLength}
                    onChange={(e) => handleSettingChange('maxResponseLength', parseInt(e.target.value))}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full nodrag"
                  />
                </div>

                {/* Use Knowledge Base Toggle */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Use Knowledge Base</label>
                    <p className="text-xs text-gray-500">Add repository data as context</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.useKnowledgeBase}
                      onChange={(e) => handleSettingChange('useKnowledgeBase', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* System Prompt */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    System Prompt
                  </label>
                  <textarea
                    value={settings.systemPrompt}
                    onChange={(e) => handleSettingChange('systemPrompt', e.target.value)}
                    placeholder="You are a helpful assistant..."
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                    rows="3"
                  />
                </div>

                {/* Context Window */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Context Window ({settings.contextWindow} messages)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={settings.contextWindow}
                    onChange={(e) => handleSettingChange('contextWindow', parseInt(e.target.value))}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full nodrag"
                  />
                </div>

                {/* Enhanced Repository Info */}
                {connectedVectorData && connectedVectorData.vectors.length > 0 && (
                  <div className="bg-blue-100 p-3 rounded-lg text-xs">
                    <div className="font-medium text-blue-800 mb-2">Repository Knowledge Base:</div>
                    <div className="text-blue-700 space-y-1">
                      <div>📚 Vectors: {connectedVectorData.vectors.length}</div>
                      <div>🤖 Model: {connectedVectorData.repositoryInfo?.embeddingModel || 'Unknown'}</div>
                      <div>📐 Dimensions: {connectedVectorData.repositoryInfo?.dimensions || 'Unknown'}</div>
                      <div>📝 Content Size: {Math.round((connectedVectorData.processedContent?.length || 0) / 1000)}K chars</div>
                      {connectedVectorData.structuredKnowledge && (
                        <div>📁 Files: {new Set(connectedVectorData.structuredKnowledge.map(s => s.filename)).size}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Connection Debug Info */}
                {connectedApiConfig && (
                  <div className="bg-gray-100 p-2 rounded text-xs">
                    <div className="font-medium text-gray-700 mb-1">Connection Info:</div>
                    <div>Provider: {connectedApiConfig.provider}</div>
                    <div>Connected: {connectedApiConfig.isConnected ? 'Yes' : 'No'}</div>
                    <div>Models: {availableModels.length}</div>
                  </div>
                )}

                {/* No Connection Warning */}
                {!connectedApiConfig && (
                  <div className="bg-yellow-100 p-2 rounded text-xs">
                    <div className="font-medium text-yellow-800 mb-1">No API Connection:</div>
                    <div className="text-yellow-700">
                      Connect an API Configuration node to the purple handle (api-config) to enable chat functionality.
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ChatNode;
