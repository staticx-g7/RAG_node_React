// components-singlepage/sections/ChatSection.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePipeline } from '../../contexts/PipelineContext';

const ChatSection = () => {
  const { state, dispatch } = usePipeline();
  const { git, filter, chunk, vectorize, chat } = state;

  // Local state management
  const [localState, setLocalState] = useState({
    isDetectingModels: false,
    isTestingModel: false,
    connectionStatus: 'disconnected', // disconnected, connecting, connected, error
    error: null,
    detectedModels: [],
    blabladorModels: [],
    modelHealthStatus: new Map()
  });

  const [messages, setMessages] = useState(chat.messages || []);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Simplified settings - no complex parameters
  const [settings, setSettings] = useState({
    // Core chat settings
    model: chat.model || '',
    provider: chat.provider || 'blablador',
    useRepositoryContext: chat.useRepositoryContext !== false,
    useInternetAccess: chat.useInternetAccess || false,
    systemPrompt: chat.systemPrompt || 'You are a helpful AI assistant that can answer questions about code repositories. Use the provided repository context to give accurate answers.',

    // Blablador specific settings
    blabladorApiKey: chat.blabladorApiKey || '',
    blabladorBaseUrl: chat.blabladorBaseUrl || 'https://helmholtz-blablador.fz-juelich.de:8000/v1',
    autoDetectModels: chat.autoDetectModels !== false
  });

  // Chat providers configuration
  const chatProviders = useMemo(() => [
    {
      id: 'blablador',
      name: 'Blablador (Helmholtz)',
      description: 'Free research LLM server with internet access',
      requiresApiKey: true,
      supportsInternet: true,
      models: localState.blabladorModels.length > 0 ? localState.blabladorModels : []
    },
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'GPT models (requires API key)',
      requiresApiKey: true,
      supportsInternet: false,
      models: [
        { id: 'gpt-4', name: 'GPT-4', description: 'Most capable model' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Faster and cheaper' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and efficient' }
      ]
    }
  ], [localState.blabladorModels]);

  const currentProvider = chatProviders.find(p => p.id === settings.provider);
  const currentModel = currentProvider?.models.find(m => m.id === settings.model);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-detect Blablador models
  const detectBlabladorModels = useCallback(async () => {
    if (!settings.blabladorApiKey || !settings.blabladorBaseUrl) {
      setLocalState(prev => ({
        ...prev,
        error: 'API key required for model detection',
        connectionStatus: 'error'
      }));
      return;
    }

    setLocalState(prev => ({
      ...prev,
      isDetectingModels: true,
      error: null,
      connectionStatus: 'connecting'
    }));

    try {
      const response = await fetch(`${settings.blabladorBaseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${settings.blabladorApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const allModels = data.data || [];

      // Filter for chat models (exclude embedding models)
      const chatModels = allModels.filter(model =>
        !model.id.includes('embedding') &&
        (model.id.startsWith('alias-') ||
         model.id.includes('gpt') ||
         model.id.includes('llama') ||
         model.id.includes('qwen') ||
         model.id.includes('mistral'))
      );

      // Convert to our model format
      const modelConfigs = chatModels.map(model => {
        let name = model.id;
        let description = 'Chat model';

        if (model.id === 'alias-chat') {
          name = 'Alias Chat (Best Available)';
          description = 'Automatically uses the best chat model';
        } else if (model.id === 'alias-fast') {
          name = 'Alias Fast (Quick Responses)';
          description = 'Optimized for speed';
        } else if (model.id === 'alias-large') {
          name = 'Alias Large (Most Capable)';
          description = 'Most powerful model available';
        } else if (model.id.includes('llama')) {
          name = `Llama ${model.id.split('-').pop()}`;
          description = 'Open source model';
        } else if (model.id.includes('qwen')) {
          name = `Qwen ${model.id.split('-').pop()}`;
          description = 'Multilingual model';
        }

        return {
          id: model.id,
          name: name,
          description: description
        };
      });

      setLocalState(prev => ({
        ...prev,
        isDetectingModels: false,
        detectedModels: allModels,
        blabladorModels: modelConfigs,
        connectionStatus: 'connected'
      }));

      // Auto-select first chat model if none selected
      if (!settings.model && modelConfigs.length > 0) {
        const preferredModel = modelConfigs.find(m => m.id === 'alias-chat') || modelConfigs[0];
        updateSetting('model', preferredModel.id);
      }

    } catch (error) {
      setLocalState(prev => ({
        ...prev,
        isDetectingModels: false,
        error: `Model detection failed: ${error.message}`,
        connectionStatus: 'error'
      }));
    }
  }, [settings.blabladorApiKey, settings.blabladorBaseUrl]);

  // Test model health
  const testModelHealth = useCallback(async (modelId) => {
    if (!settings.blabladorApiKey || !modelId) return;

    setLocalState(prev => ({
      ...prev,
      isTestingModel: true,
      modelHealthStatus: new Map(prev.modelHealthStatus).set(modelId, { status: 'testing', lastTest: Date.now() })
    }));

    try {
      const response = await fetch(`${settings.blabladorBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.blabladorApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10
        })
      });

      const isHealthy = response.ok;
      setLocalState(prev => ({
        ...prev,
        isTestingModel: false,
        modelHealthStatus: new Map(prev.modelHealthStatus).set(modelId, {
          status: isHealthy ? 'healthy' : 'unhealthy',
          lastTest: Date.now()
        })
      }));

    } catch (error) {
      setLocalState(prev => ({
        ...prev,
        isTestingModel: false,
        modelHealthStatus: new Map(prev.modelHealthStatus).set(modelId, {
          status: 'unhealthy',
          lastTest: Date.now()
        })
      }));
    }
  }, [settings.blabladorApiKey, settings.blabladorBaseUrl]);

  // Auto-detect when conditions are met
  useEffect(() => {
    if (settings.provider === 'blablador' &&
        settings.blabladorApiKey &&
        settings.autoDetectModels &&
        localState.blabladorModels.length === 0 &&
        localState.connectionStatus === 'disconnected') {
      detectBlabladorModels();
    }
  }, [settings.provider, settings.blabladorApiKey, settings.autoDetectModels, detectBlabladorModels]);

  // Update pipeline context when settings change
  useEffect(() => {
    dispatch({
      type: 'UPDATE_CHAT',
      payload: { ...settings, messages }
    });
  }, [settings, messages, dispatch]);

  // Setting update helper
  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Build context from repository data
  const buildRepositoryContext = useCallback(() => {
    if (!settings.useRepositoryContext) return '';

    let context = '';

    // Add repository information
    if (git.repoInfo) {
      context += `Repository: ${git.repoInfo.fullName}\n`;
      context += `Description: ${git.repoInfo.description || 'No description'}\n`;
      context += `Language: ${git.repoInfo.language || 'Multiple'}\n\n`;
    }

    // Add vector context if available
    if (vectorize.vectors && vectorize.vectors.length > 0) {
      context += `Available code context from ${vectorize.vectors.length} code chunks:\n`;

      // Use first few vectors as context (limit to avoid token overflow)
      const contextVectors = vectorize.vectors.slice(0, 5);
      contextVectors.forEach((vector, index) => {
        context += `\n[Chunk ${index + 1}] ${vector.metadata.source}:\n`;
        context += `${vector.content.substring(0, 300)}...\n`;
      });
    }

    return context;
  }, [settings.useRepositoryContext, git.repoInfo, vectorize.vectors]);

  // Send message
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isLoading) return;

    if (!settings.model) {
      setLocalState(prev => ({ ...prev, error: 'Please select a model first' }));
      return;
    }

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);
    setLocalState(prev => ({ ...prev, error: null }));

    try {
      // Build messages for API
      const apiMessages = [
        {
          role: 'system',
          content: settings.systemPrompt + '\n\n' + buildRepositoryContext()
        },
        ...newMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ];

      let apiUrl = '';
      let headers = {};
      let body = {};

      if (settings.provider === 'blablador') {
        apiUrl = `${settings.blabladorBaseUrl}/chat/completions`;
        headers = {
          'Authorization': `Bearer ${settings.blabladorApiKey}`,
          'Content-Type': 'application/json'
        };
        body = {
          model: settings.model,
          messages: apiMessages,
          max_tokens: 2048,
          temperature: 0.7,
          stream: false
        };

        // Add internet access if enabled and supported
        if (settings.useInternetAccess && currentProvider?.supportsInternet) {
          body.tools = [{ type: 'web_search' }];
        }
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const aiContent = data.choices?.[0]?.message?.content || 'No response received';

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: aiContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      setLocalState(prev => ({ ...prev, error: `Chat failed: ${error.message}` }));
    } finally {
      setIsLoading(false);
    }
  }, [inputMessage, isLoading, settings, messages, buildRepositoryContext, currentProvider]);

  // Clear conversation
  const clearConversation = useCallback(() => {
    setMessages([]);
    setLocalState(prev => ({ ...prev, error: null }));
  }, []);

  // Early return if no vectors available
  if (!vectorize.vectors || vectorize.vectors.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Chat Interface</h1>
          <p className="text-gray-600">Chat with AI about your repository using vector embeddings.</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-amber-500">⚠️</span>
            <span className="text-amber-700 font-medium">No Vector Data Available</span>
          </div>
          <p className="text-amber-700 text-sm mt-1">
            Please complete vectorization first to enable AI chat with repository context.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Chat Interface</h1>
        <p className="text-gray-600">
          Chat with AI about your repository using {vectorize.vectors.length} vector embeddings.
        </p>
      </div>

      {/* Repository Context Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">📚 Repository Context</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-blue-600 font-medium">Repository</div>
            <div className="text-blue-800">{git.owner}/{git.repo}</div>
          </div>
          <div>
            <div className="text-blue-600 font-medium">Vectors</div>
            <div className="text-blue-800">{vectorize.vectors.length}</div>
          </div>
          <div>
            <div className="text-blue-600 font-medium">Model</div>
            <div className="text-blue-800">{currentModel?.name || 'None selected'}</div>
          </div>
          <div>
            <div className="text-blue-600 font-medium">Messages</div>
            <div className="text-blue-800">{messages.length}</div>
          </div>
        </div>
      </div>

      {/* Model Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Model Configuration</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
            <select
              value={settings.provider}
              onChange={(e) => updateSetting('provider', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {chatProviders.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} {provider.id === 'blablador' && '(Default)'}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">{currentProvider?.description}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
            <div className="flex space-x-2">
              <select
                value={settings.model}
                onChange={(e) => updateSetting('model', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={settings.provider === 'blablador' && localState.blabladorModels.length === 0}
              >
                {currentProvider?.models.length > 0 ? (
                  currentProvider.models.map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))
                ) : (
                  <option value="">No models available</option>
                )}
              </select>

              {settings.provider === 'blablador' && (
                <button
                  onClick={detectBlabladorModels}
                  disabled={localState.isDetectingModels || !settings.blabladorApiKey}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                  title="Auto-detect available models"
                >
                  {localState.isDetectingModels ? '🔄' : '🔍'}
                </button>
              )}

              {settings.model && (
                <button
                  onClick={() => testModelHealth(settings.model)}
                  disabled={localState.isTestingModel}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
                  title="Test model health"
                >
                  {localState.isTestingModel ? '🔄' : '🩺'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Blablador Configuration */}
        {settings.provider === 'blablador' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-blue-800">🔬 Blablador Configuration</h3>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                localState.connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
                localState.connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
                localState.connectionStatus === 'error' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {localState.connectionStatus === 'connected' && '✅ Connected'}
                {localState.connectionStatus === 'connecting' && '🔄 Connecting'}
                {localState.connectionStatus === 'error' && '❌ Error'}
                {localState.connectionStatus === 'disconnected' && '⚪ Not Connected'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                <input
                  type="password"
                  value={settings.blabladorApiKey}
                  onChange={(e) => updateSetting('blabladorApiKey', e.target.value)}
                  placeholder="Your Blablador API key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Base URL</label>
                <input
                  type="url"
                  value={settings.blabladorBaseUrl}
                  onChange={(e) => updateSetting('blabladorBaseUrl', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Model Health Status */}
        {currentModel && localState.modelHealthStatus.has(settings.model) && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Model Health</span>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                localState.modelHealthStatus.get(settings.model)?.status === 'healthy' ? 'bg-green-100 text-green-800' :
                localState.modelHealthStatus.get(settings.model)?.status === 'testing' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {localState.modelHealthStatus.get(settings.model)?.status === 'healthy' && '✅ Healthy'}
                {localState.modelHealthStatus.get(settings.model)?.status === 'testing' && '🔄 Testing'}
                {localState.modelHealthStatus.get(settings.model)?.status === 'unhealthy' && '❌ Unhealthy'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Options */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Chat Options</h2>

        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.useRepositoryContext}
              onChange={(e) => updateSetting('useRepositoryContext', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Use repository context in conversations</span>
          </label>

          {currentProvider?.supportsInternet && (
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.useInternetAccess}
                onChange={(e) => updateSetting('useInternetAccess', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enable internet access for real-time information</span>
            </label>
          )}
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">System Prompt</label>
          <textarea
            value={settings.systemPrompt}
            onChange={(e) => updateSetting('systemPrompt', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder="Define how the AI should behave..."
          />
        </div>
      </div>

      {/* Chat Interface */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Chat Interface</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">{messages.length} messages</span>
            {messages.length > 0 && (
              <button
                onClick={clearConversation}
                className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">💬</div>
              <p>Start a conversation about your repository!</p>
              <p className="text-sm mt-1">
                Ask about code structure, functionality, or get help with development.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-sm">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask about your repository..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading || !settings.model}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading || !settings.model}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {localState.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-red-500">❌</span>
            <span className="text-red-700 text-sm">{localState.error}</span>
          </div>
        </div>
      )}

      {/* Benefits Section */}
      <div className="bg-green-50 border-l-4 border-green-500 p-4">
        <h3 className="font-semibold text-green-800 mb-2">🤖 AI Chat Features</h3>
        <ul className="text-green-700 text-sm space-y-1">
          <li>• Repository-aware conversations using your vector embeddings</li>
          <li>• Internet access for real-time information (Blablador)</li>
          <li>• Model health checking to ensure reliability</li>
          <li>• Auto-detection of available chat models</li>
          <li>• Simple interface without complex parameters</li>
          <li>• Context from {vectorize.vectors.length} code chunks</li>
        </ul>
      </div>
    </div>
  );
};

export default ChatSection;
