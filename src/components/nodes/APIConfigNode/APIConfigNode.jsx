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
  const { updateNodeData } = useReactFlow();
  const [showSettings, setShowSettings] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [availableModels, setAvailableModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // API Configuration Settings
  const [settings, setSettings] = useState({
    provider: data.provider || 'custom',
    endpoint: data.endpoint || '',
    apiKey: data.apiKey || '',
    token: data.token || '',
    headers: data.headers || {},
    additionalParams: data.additionalParams || {},
    isConnected: data.isConnected || false,
    availableModels: data.availableModels || [],
  });

  // Provider configurations
  const providers = {
    openai: {
      name: 'OpenAI',
      icon: '🤖',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      modelsEndpoint: 'https://api.openai.com/v1/models',
      placeholder: 'sk-...',
      keyLabel: 'API Key'
    },
    blablador: {
      name: 'Blablador (JSC)',
      icon: '🔬',
      // FIXED: Use base endpoint, not chat completions endpoint
      endpoint: 'https://api.helmholtz-blablador.fz-juelich.de/v1',
      modelsEndpoint: 'https://api.helmholtz-blablador.fz-juelich.de/v1/models',
      embeddingsEndpoint: 'https://api.helmholtz-blablador.fz-juelich.de/v1/embeddings',
      requiresApiKey: true,
      keyFormat: 'glpat-...',
    },
    anthropic: {
      name: 'Anthropic',
      icon: '🧠',
      endpoint: 'https://api.anthropic.com/v1/messages',
      modelsEndpoint: 'https://api.anthropic.com/v1/models',
      placeholder: 'sk-ant-...',
      keyLabel: 'API Key'
    },
    huggingface: {
      name: 'Hugging Face',
      icon: '🤗',
      endpoint: 'https://api-inference.huggingface.co/models/',
      modelsEndpoint: 'https://api-inference.huggingface.co/models',
      placeholder: 'hf_...',
      keyLabel: 'API Token'
    },
    custom: {
      name: 'Custom API',
      icon: '⚙️',
      endpoint: '',
      modelsEndpoint: '',
      placeholder: 'Enter your API key...',
      keyLabel: 'API Key'
    }
  };

  // Update node data when settings change
  useEffect(() => {
    updateNodeData(id, {
      ...settings,
      lastUpdated: Date.now()
    });
  }, [settings, id, updateNodeData]);

  // Handle setting changes with provider auto-detection
  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };

    // Auto-detect provider based on endpoint
    if (key === 'endpoint') {
      if (value.includes('blablador') || value.includes('juelich')) {
        newSettings.provider = 'blablador';
      } else if (value.includes('openai.com')) {
        newSettings.provider = 'openai';
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

    setSettings(newSettings);
  };

  // Test API connection
  const testConnection = useCallback(async () => {
    if (!settings.apiKey && !settings.token) {
      setConnectionStatus('error');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('testing');

    try {
      const providerConfig = providers[settings.provider] || providers.custom;
      let testEndpoint = providerConfig.modelsEndpoint || settings.endpoint;

      // For custom endpoints, construct models endpoint
      if (settings.provider === 'custom' && settings.endpoint) {
        testEndpoint = settings.endpoint.replace('/chat/completions', '/models');
      }

      console.log('🧪 Testing connection to:', testEndpoint);

      const headers = {
        'Authorization': `Bearer ${settings.apiKey || settings.token}`,
        'Content-Type': 'application/json',
        ...settings.headers
      };

      const response = await fetch(testEndpoint, {
        method: 'GET',
        headers
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Connection test successful:', result);

        // Extract models from response
        let models = [];
        if (result.data && Array.isArray(result.data)) {
          models = result.data
            .filter(model => model.id && !model.id.includes('whisper') && !model.id.includes('tts'))
            .map(model => ({
              id: model.id,
              name: model.id,
              object: model.object,
              created: model.created,
              owned_by: model.owned_by
            }));
        }

        setAvailableModels(models);
        setConnectionStatus('connected');

        // Update settings with connection status and models
        const connectedSettings = {
          ...settings,
          isConnected: true,
          availableModels: models
        };
        setSettings(connectedSettings);

      } else {
        const errorText = await response.text();
        console.error('❌ Connection test failed:', response.status, errorText);
        setConnectionStatus('error');
        setSettings(prev => ({ ...prev, isConnected: false, availableModels: [] }));
      }
    } catch (error) {
      console.error('❌ Connection test error:', error);
      setConnectionStatus('error');
      setSettings(prev => ({ ...prev, isConnected: false, availableModels: [] }));
    } finally {
      setIsTestingConnection(false);
    }
  }, [settings]);

  // Fetch models manually
  const fetchModels = useCallback(async () => {
    if (!settings.apiKey && !settings.token) {
      console.log('❌ No API key for fetching models');
      return;
    }

    setIsLoadingModels(true);
    try {
      await testConnection();
    } finally {
      setIsLoadingModels(false);
    }
  }, [testConnection]);

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
        style={{ width: '280px', minHeight: '120px' }}
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
        <div className="relative z-10 px-4 py-2 border-b border-gray-100">
          <div className={`text-xs px-2 py-1 rounded-full text-center ${
            connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
            connectionStatus === 'testing' ? 'bg-yellow-100 text-yellow-800' :
            connectionStatus === 'error' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-600'
          }`}>
            {connectionStatus === 'connected' ? '✅ Connected' :
             connectionStatus === 'testing' ? '🔄 Testing...' :
             connectionStatus === 'error' ? '❌ Connection Failed' :
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
                    <option value="blablador">🔬 Blablador (JSC)</option>
                    <option value="anthropic">🧠 Anthropic</option>
                    <option value="huggingface">🤗 Hugging Face</option>
                    <option value="custom">⚙️ Custom API</option>
                  </select>
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
                    placeholder={currentProvider.endpoint || 'https://api.example.com/v1/chat/completions'}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
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
              <h4 className="text-xs font-medium text-gray-700">Available Models</h4>
              <button
                onClick={fetchModels}
                disabled={isLoadingModels}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {isLoadingModels ? '🔄' : '🔍'}
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {availableModels.slice(0, 5).map((model, index) => (
                <div key={index} className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                  {model.name || model.id}
                </div>
              ))}
              {availableModels.length > 5 && (
                <div className="text-xs text-gray-500 text-center">
                  +{availableModels.length - 5} more models
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default APIConfigNode;
