import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Handle, Position, useReactFlow } from '@xyflow/react';

const BackgroundBeams = ({ className }) => (
  <div className={`absolute inset-0 overflow-hidden ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-cyan-50/20 to-teal-50/20" />
    <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-blue-200/30 to-transparent" />
    <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-200/30 to-transparent" />
  </div>
);

const APIConfigNode = ({ id, data, selected }) => {
  const { setNodes, getNodes, getEdges } = useReactFlow();

  // State management
  const [showSettings, setShowSettings] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [availableModels, setAvailableModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [lastError, setLastError] = useState('');

  // Enhanced settings with better defaults
  const [settings, setSettings] = useState(() => ({
    provider: data.provider || 'custom',
    endpoint: data.endpoint || '',
    apiKey: data.apiKey || '',
    token: data.token || '',
    headers: data.headers || {},
    additionalParams: data.additionalParams || {},
    isConnected: data.isConnected || false,
    availableModels: data.availableModels || [],
    chatModels: data.chatModels || [],
    embeddingModels: data.embeddingModels || [],
    lastTested: data.lastTested || null,
    connectionTimeout: data.connectionTimeout || 30000,
    retryAttempts: data.retryAttempts || 3
  }));

  // Enhanced provider configurations
  const providers = {
    openai: {
      name: 'OpenAI',
      icon: '🤖',
      endpoint: 'https://api.openai.com/v1',
      modelsEndpoint: 'https://api.openai.com/v1/models',
      chatEndpoint: 'https://api.openai.com/v1/chat/completions',
      embeddingsEndpoint: 'https://api.openai.com/v1/embeddings',
      placeholder: 'sk-...',
      keyLabel: 'API Key',
      supportsModelsEndpoint: true,
      requiresAuth: true,
      description: 'OpenAI GPT models and embeddings'
    },
    perplexity: {
      name: 'Perplexity AI',
      icon: '🔮',
      endpoint: 'https://api.perplexity.ai',
      chatEndpoint: 'https://api.perplexity.ai/chat/completions',
      placeholder: 'pplx-...',
      keyLabel: 'API Key',
      supportsModelsEndpoint: false,
      requiresAuth: true,
      description: 'Perplexity Sonar models for search-augmented responses',
      testMethod: 'chat', // Use chat endpoint for testing
      defaultModels: [
        { id: 'sonar-pro', name: 'Sonar Pro', type: 'premium', context: '28k' },
        { id: 'sonar-small-online', name: 'Sonar Small Online', type: 'online', context: '12k' },
        { id: 'sonar-medium-online', name: 'Sonar Medium Online', type: 'online', context: '12k' },
        { id: 'sonar-large-online', name: 'Sonar Large Online', type: 'online', context: '28k' },
        { id: 'sonar-small-chat', name: 'Sonar Small Chat', type: 'chat', context: '16k' },
        { id: 'sonar-medium-chat', name: 'Sonar Medium Chat', type: 'chat', context: '16k' },
        { id: 'llama-3.1-sonar-small-128k-online', name: 'Llama 3.1 Sonar Small 128k Online', type: 'llama', context: '127k' },
        { id: 'llama-3.1-sonar-large-128k-online', name: 'Llama 3.1 Sonar Large 128k Online', type: 'llama', context: '127k' },
        { id: 'llama-3.1-sonar-huge-128k-online', name: 'Llama 3.1 Sonar Huge 128k Online', type: 'llama', context: '127k' }
      ]
    },
    blablador: {
      name: 'Blablador (JSC)',
      icon: '🔬',
      endpoint: 'https://api.helmholtz-blablador.fz-juelich.de/v1',
      modelsEndpoint: 'https://api.helmholtz-blablador.fz-juelich.de/v1/models',
      chatEndpoint: 'https://api.helmholtz-blablador.fz-juelich.de/v1/chat/completions',
      embeddingsEndpoint: 'https://api.helmholtz-blablador.fz-juelich.de/v1/embeddings',
      placeholder: 'glpat-...',
      keyLabel: 'API Token',
      supportsModelsEndpoint: true,
      requiresAuth: true,
      description: 'Helmholtz research computing models'
    },
    anthropic: {
      name: 'Anthropic',
      icon: '🧠',
      endpoint: 'https://api.anthropic.com/v1',
      chatEndpoint: 'https://api.anthropic.com/v1/messages',
      placeholder: 'sk-ant-...',
      keyLabel: 'API Key',
      supportsModelsEndpoint: false,
      requiresAuth: true,
      description: 'Claude models for advanced reasoning',
      testMethod: 'chat',
      defaultModels: [
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', type: 'latest', context: '200k' },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', type: 'premium', context: '200k' },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', type: 'balanced', context: '200k' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', type: 'fast', context: '200k' }
      ]
    },
    huggingface: {
      name: 'Hugging Face',
      icon: '🤗',
      endpoint: 'https://api-inference.huggingface.co',
      modelsEndpoint: 'https://huggingface.co/api/models',
      placeholder: 'hf_...',
      keyLabel: 'API Token',
      supportsModelsEndpoint: true,
      requiresAuth: true,
      description: 'Open source models via Hugging Face'
    },
    custom: {
      name: 'Custom API',
      icon: '⚙️',
      endpoint: '',
      placeholder: 'Enter your API key...',
      keyLabel: 'API Key',
      supportsModelsEndpoint: true,
      requiresAuth: true,
      description: 'Custom OpenAI-compatible API endpoint'
    }
  };

  // Update node data efficiently
  const updateNodeData = useCallback((updates) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                ...updates,
                lastUpdated: Date.now()
              }
            }
          : node
      )
    );
  }, [id, setNodes]);

  // Persist settings changes
  useEffect(() => {
    updateNodeData(settings);
  }, [settings, updateNodeData]);

  // Enhanced setting change handler with auto-detection
  const handleSettingChange = useCallback((key, value) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };

      // Auto-detect provider based on endpoint
      if (key === 'endpoint') {
        if (value.includes('perplexity.ai')) {
          newSettings.provider = 'perplexity';
        } else if (value.includes('openai.com')) {
          newSettings.provider = 'openai';
        } else if (value.includes('blablador') || value.includes('juelich')) {
          newSettings.provider = 'blablador';
        } else if (value.includes('anthropic.com')) {
          newSettings.provider = 'anthropic';
        } else if (value.includes('huggingface.co')) {
          newSettings.provider = 'huggingface';
        } else if (value.trim() !== '') {
          newSettings.provider = 'custom';
        }
      }

      // Auto-fill endpoint when provider changes
      if (key === 'provider' && providers[value]) {
        newSettings.endpoint = providers[value].endpoint;
      }

      // Reset connection status when key settings change
      if (['provider', 'endpoint', 'apiKey', 'token'].includes(key)) {
        newSettings.isConnected = false;
        setConnectionStatus('disconnected');
        setLastError('');
      }

      return newSettings;
    });
  }, []);

  // Enhanced dynamic model fetching
  const fetchModelsFromProvider = useCallback(async (providerConfig, apiKey) => {
    try {
      // For providers with predefined models
      if (providerConfig.defaultModels) {
        return providerConfig.defaultModels;
      }

      // For providers with models endpoint
      if (providerConfig.supportsModelsEndpoint && providerConfig.modelsEndpoint) {
        const response = await fetch(providerConfig.modelsEndpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(settings.connectionTimeout)
        });

        if (response.ok) {
          const data = await response.json();

          if (data.data && Array.isArray(data.data)) {
            return data.data
              .filter(model => model.id && !model.id.includes('whisper') && !model.id.includes('tts'))
              .map(model => ({
                id: model.id,
                name: model.id,
                type: model.object || 'model',
                created: model.created,
                owned_by: model.owned_by
              }));
          }
        }
      }

      return [];
    } catch (error) {
      console.warn('Failed to fetch models:', error);
      return [];
    }
  }, [settings.connectionTimeout]);

  // Enhanced connection testing with retry logic
  const testConnection = useCallback(async () => {
    if (!settings.apiKey && !settings.token) {
      setConnectionStatus('error');
      setLastError('API key is required');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('testing');
    setLastError('');

    const providerConfig = providers[settings.provider] || providers.custom;
    let attempt = 0;

    while (attempt < settings.retryAttempts) {
      try {
        let testEndpoint;
        let testMethod = 'GET';
        let testBody = null;
        let testHeaders = {
          'Authorization': `Bearer ${settings.apiKey || settings.token}`,
          'Content-Type': 'application/json',
          ...settings.headers
        };

        // Provider-specific testing logic
        if (settings.provider === 'perplexity' || settings.endpoint.includes('perplexity.ai')) {
          testEndpoint = `${settings.endpoint}/chat/completions`;
          testMethod = 'POST';
          testBody = JSON.stringify({
            model: 'sonar-small-chat',
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 1
          });
        } else if (settings.provider === 'anthropic' || settings.endpoint.includes('anthropic.com')) {
          testEndpoint = `${settings.endpoint}/messages`;
          testMethod = 'POST';
          testHeaders['anthropic-version'] = '2023-06-01';
          testBody = JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'test' }]
          });
        } else {
          // Standard models endpoint
          testEndpoint = providerConfig.modelsEndpoint || `${settings.endpoint}/models`;
          if (settings.endpoint.includes('/chat/completions')) {
            testEndpoint = settings.endpoint.replace('/chat/completions', '/models');
          }
        }

        console.log(`🧪 Testing connection (attempt ${attempt + 1}):`, testEndpoint);

        const response = await fetch(testEndpoint, {
          method: testMethod,
          headers: testHeaders,
          ...(testBody && { body: testBody }),
          signal: AbortSignal.timeout(settings.connectionTimeout)
        });

        if (response.ok) {
          console.log('✅ Connection test successful');

          // Fetch models
          setIsLoadingModels(true);
          const models = await fetchModelsFromProvider(providerConfig, settings.apiKey || settings.token);

          // Separate chat and embedding models
          const chatModels = models.filter(m => !m.id.includes('embedding'));
          const embeddingModels = models.filter(m => m.id.includes('embedding'));

          setAvailableModels(models);
          setConnectionStatus('connected');
          setLastError('');

          const connectedSettings = {
            ...settings,
            isConnected: true,
            availableModels: models,
            chatModels: chatModels.map(m => m.id),
            embeddingModels: embeddingModels.map(m => m.id),
            lastTested: Date.now()
          };
          setSettings(connectedSettings);

          setIsLoadingModels(false);
          setIsTestingConnection(false);
          return;

        } else {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

      } catch (error) {
        attempt++;
        console.error(`❌ Connection test attempt ${attempt} failed:`, error);

        if (attempt >= settings.retryAttempts) {
          let errorMessage = 'Connection failed';
          if (error.name === 'TimeoutError') {
            errorMessage = 'Connection timeout';
          } else if (error.message.includes('401')) {
            errorMessage = 'Invalid API key';
          } else if (error.message.includes('429')) {
            errorMessage = 'Rate limit exceeded';
          } else if (error.message.includes('404')) {
            errorMessage = 'Endpoint not found';
          } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error or CORS issue';
          }

          setConnectionStatus('error');
          setLastError(errorMessage);
          setSettings(prev => ({ ...prev, isConnected: false, availableModels: [] }));
        } else {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    setIsLoadingModels(false);
    setIsTestingConnection(false);
  }, [settings, fetchModelsFromProvider]);

  // Manual model refresh
  const refreshModels = useCallback(async () => {
    if (!settings.isConnected) {
      await testConnection();
      return;
    }

    setIsLoadingModels(true);
    try {
      const providerConfig = providers[settings.provider] || providers.custom;
      const models = await fetchModelsFromProvider(providerConfig, settings.apiKey || settings.token);

      setAvailableModels(models);
      setSettings(prev => ({
        ...prev,
        availableModels: models,
        chatModels: models.filter(m => !m.id.includes('embedding')).map(m => m.id),
        embeddingModels: models.filter(m => m.id.includes('embedding')).map(m => m.id)
      }));
    } catch (error) {
      console.error('Failed to refresh models:', error);
      setLastError('Failed to refresh models');
    } finally {
      setIsLoadingModels(false);
    }
  }, [settings.isConnected, settings.provider, settings.apiKey, settings.token, testConnection, fetchModelsFromProvider]);

  const currentProvider = providers[settings.provider] || providers.custom;

  return (
    <div className="relative">
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 bg-green-400 border-2 border-white"
        style={{ top: '20px' }}
      />

      <motion.div
        className={`bg-white rounded-xl shadow-lg border-2 transition-all duration-300 overflow-hidden ${
          selected ? 'border-blue-400 shadow-blue-100' : 'border-gray-200'
        }`}
        style={{ width: '300px', minHeight: '140px' }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        <BackgroundBeams className="rounded-xl" />

        {/* Header */}
        <div className="relative z-10 p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">{currentProvider.icon}</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">API Configuration</h3>
                <p className="text-xs text-gray-500">
                  {currentProvider.name}
                  {settings.isConnected && availableModels.length > 0 && (
                    <span className="text-green-600"> • {availableModels.length} models</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                title="Settings"
              >
                ⚙️
              </button>
              <button
                onClick={testConnection}
                disabled={isTestingConnection || (!settings.apiKey && !settings.token)}
                className="w-6 h-6 flex items-center justify-center rounded bg-blue-100 hover:bg-blue-200 transition-colors disabled:opacity-50"
                title="Test Connection"
              >
                {isTestingConnection ? '🔄' : '🔗'}
              </button>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="relative z-10 px-4 py-3 border-b border-gray-100">
          <div className={`text-sm px-3 py-2 rounded-lg text-center font-medium transition-all ${
            connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
            connectionStatus === 'testing' ? 'bg-yellow-100 text-yellow-800' :
            connectionStatus === 'error' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-600'
          }`}>
            {connectionStatus === 'connected' ? '✅ Connected' :
             connectionStatus === 'testing' ? '🔄 Testing Connection...' :
             connectionStatus === 'error' ? `❌ ${lastError || 'Connection Failed'}` :
             '⚪ Not Connected'}
          </div>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="relative z-10 bg-gray-50/50"
            >
              <div className="p-4 space-y-4">
                {/* Provider Selection */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    API Provider
                  </label>
                  <select
                    value={settings.provider}
                    onChange={(e) => handleSettingChange('provider', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="openai">🤖 OpenAI</option>
                    <option value="perplexity">🔮 Perplexity AI</option>
                    <option value="anthropic">🧠 Anthropic</option>
                    <option value="blablador">🔬 Blablador (JSC)</option>
                    <option value="huggingface">🤗 Hugging Face</option>
                    <option value="custom">⚙️ Custom API</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">{currentProvider.description}</p>
                </div>

                {/* API Endpoint */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    API Endpoint
                  </label>
                  <input
                    type="text"
                    value={settings.endpoint}
                    onChange={(e) => handleSettingChange('endpoint', e.target.value)}
                    placeholder={currentProvider.endpoint || 'https://api.example.com/v1'}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  {settings.provider === 'perplexity' && (
                    <p className="text-xs text-blue-600 mt-1">
                      ℹ️ Perplexity uses predefined models. Connection test uses chat endpoint.
                    </p>
                  )}
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {currentProvider.keyLabel}
                  </label>
                  <input
                    type="password"
                    value={settings.apiKey}
                    onChange={(e) => handleSettingChange('apiKey', e.target.value)}
                    placeholder={currentProvider.placeholder}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>

                {/* Advanced Settings */}
                <details className="border border-gray-200 rounded-lg p-3">
                  <summary className="cursor-pointer font-medium text-gray-700 text-sm">
                    Advanced Settings
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Connection Timeout (ms)
                      </label>
                      <input
                        type="number"
                        value={settings.connectionTimeout}
                        onChange={(e) => handleSettingChange('connectionTimeout', parseInt(e.target.value))}
                        min="5000"
                        max="60000"
                        step="5000"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Retry Attempts
                      </label>
                      <input
                        type="number"
                        value={settings.retryAttempts}
                        onChange={(e) => handleSettingChange('retryAttempts', parseInt(e.target.value))}
                        min="1"
                        max="5"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </div>
                </details>

                {/* Test Connection Button */}
                <button
                  onClick={testConnection}
                  disabled={isTestingConnection || (!settings.apiKey && !settings.token)}
                  className="w-full px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isTestingConnection ? 'Testing Connection...' : 'Test API Connection'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Available Models */}
        {availableModels.length > 0 && (
          <div className="relative z-10 p-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-gray-700">
                Available Models
                {settings.provider === 'perplexity' && (
                  <span className="text-xs text-blue-600 ml-1">(Predefined)</span>
                )}
              </h4>
              <button
                onClick={refreshModels}
                disabled={isLoadingModels}
                className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                title="Refresh Models"
              >
                {isLoadingModels ? '🔄' : '🔍'}
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {availableModels.slice(0, 6).map((model, index) => (
                <div key={index} className="text-xs text-gray-600 bg-white px-2 py-1 rounded border flex justify-between items-center">
                  <span className="truncate">{model.name || model.id}</span>
                  {model.context && (
                    <span className="text-xs text-blue-500 ml-2">{model.context}</span>
                  )}
                </div>
              ))}
              {availableModels.length > 6 && (
                <div className="text-xs text-gray-500 text-center py-1">
                  +{availableModels.length - 6} more models
                </div>
              )}
            </div>
          </div>
        )}

        {/* Connection Info */}
        {settings.lastTested && (
          <div className="relative z-10 px-4 py-2 bg-gray-50 text-xs text-gray-500 text-center">
            Last tested: {new Date(settings.lastTested).toLocaleTimeString()}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default APIConfigNode;
