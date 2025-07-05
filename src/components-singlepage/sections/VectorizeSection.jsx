// components-singlepage/sections/VectorizeSection.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePipeline } from '../../contexts/PipelineContext';

const VectorizeSection = () => {
  const { state, dispatch } = usePipeline();
  const { git, filter, chunk, vectorize } = state;

  // Local state management
  const [localState, setLocalState] = useState({
    isProcessing: false,
    isDetectingModels: false,
    error: null,
    processingProgress: 0,
    currentBatch: 0,
    totalBatches: 0,
    previewVectors: [],
    detectedModels: [],
    blabladorModels: [],
    connectionStatus: 'disconnected' // disconnected, connecting, connected, error
  });

  // Settings state with Blablador as default
  const [settings, setSettings] = useState({
    // Core embedding settings
    embeddingModel: vectorize.embeddingModel || '',
    provider: vectorize.provider || 'blablador',
    dimensions: vectorize.dimensions || 1024,

    // Processing settings
    batchSize: vectorize.batchSize || 50,
    rateLimit: vectorize.rateLimit || 60,
    storageType: vectorize.storageType || 'indexeddb',

    // Blablador specific settings
    blabladorApiKey: vectorize.blabladorApiKey || '',
    blabladorBaseUrl: vectorize.blabladorBaseUrl || 'https://helmholtz-blablador.fz-juelich.de:8000/v1',
    autoDetectModels: vectorize.autoDetectModels !== false,

    // Custom metadata keys
    customKeys: vectorize.customKeys || [
      { key: 'source_type', value: 'repository', enabled: true },
      { key: 'repository', value: 'repository', enabled: true },
      { key: 'branch', value: 'branch', enabled: true },
      { key: 'file_extension', value: 'auto', enabled: true },
      { key: 'chunk_method', value: 'chunk_method', enabled: true },
      { key: 'created_at', value: 'timestamp', enabled: true }
    ]
  });

  // Provider configurations
  const embeddingProviders = useMemo(() => [
    {
      id: 'blablador',
      name: 'Blablador (Helmholtz)',
      description: 'Helmholtz research LLM server - Free for research',
      requiresApiKey: true,
      supportsAutoDetection: true,
      models: localState.blabladorModels.length > 0 ? localState.blabladorModels : []
    },
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'OpenAI embedding models',
      requiresApiKey: true,
      supportsAutoDetection: false,
      models: [
        { id: 'text-embedding-3-small', name: 'text-embedding-3-small', dimensions: 1536, cost: '$0.02/1M tokens' },
        { id: 'text-embedding-3-large', name: 'text-embedding-3-large', dimensions: 3072, cost: '$0.13/1M tokens' },
        { id: 'text-embedding-ada-002', name: 'text-embedding-ada-002', dimensions: 1536, cost: '$0.10/1M tokens' }
      ]
    },
    {
      id: 'huggingface',
      name: 'Hugging Face',
      description: 'Open source embedding models',
      requiresApiKey: false,
      supportsAutoDetection: false,
      models: [
        { id: 'sentence-transformers/all-MiniLM-L6-v2', name: 'all-MiniLM-L6-v2', dimensions: 384, cost: 'Free' },
        { id: 'sentence-transformers/all-mpnet-base-v2', name: 'all-mpnet-base-v2', dimensions: 768, cost: 'Free' }
      ]
    },
    {
      id: 'cohere',
      name: 'Cohere',
      description: 'Cohere embedding models',
      requiresApiKey: true,
      supportsAutoDetection: false,
      models: [
        { id: 'embed-english-v3.0', name: 'embed-english-v3.0', dimensions: 1024, cost: '$0.10/1M tokens' },
        { id: 'embed-multilingual-v3.0', name: 'embed-multilingual-v3.0', dimensions: 1024, cost: '$0.10/1M tokens' }
      ]
    }
  ], [localState.blabladorModels]);

  const currentProvider = embeddingProviders.find(p => p.id === settings.provider);
  const currentModel = currentProvider?.models.find(m => m.id === settings.embeddingModel);

  // Calculate processing statistics
  const processingStats = useMemo(() => {
    if (!chunk.processedChunks || chunk.processedChunks.length === 0) {
      return {
        totalVectors: 0,
        estimatedCost: 0,
        processingTime: 0,
        storageSize: 0,
        totalTokens: 0
      };
    }

    const totalChunks = chunk.processedChunks.length;
    const totalTokens = chunk.processedChunks.reduce((sum, chunkItem) =>
      sum + Math.ceil(chunkItem.content.length / 4), 0
    );

    // Cost calculation based on provider
    let costPer1MTokens = 0;
    if (settings.provider === 'blablador') {
      costPer1MTokens = 0; // Free for research
    } else if (settings.provider === 'openai') {
      if (settings.embeddingModel.includes('large')) costPer1MTokens = 0.13;
      else if (settings.embeddingModel.includes('ada-002')) costPer1MTokens = 0.10;
      else costPer1MTokens = 0.02;
    } else if (settings.provider === 'cohere') {
      costPer1MTokens = 0.10;
    }

    const estimatedCost = (totalTokens / 1000000) * costPer1MTokens;
    const processingTime = Math.ceil(totalChunks / settings.batchSize) * (60 / settings.rateLimit);
    const storageSize = (totalChunks * settings.dimensions * 4) / (1024 * 1024); // 4 bytes per float

    return {
      totalVectors: totalChunks,
      estimatedCost: estimatedCost,
      processingTime: processingTime,
      storageSize: storageSize,
      totalTokens: totalTokens
    };
  }, [chunk.processedChunks, settings]);

  // Auto-detect Blablador models
  const detectBlabladorModels = useCallback(async () => {
    if (!settings.blabladorApiKey || !settings.blabladorBaseUrl) {
      setLocalState(prev => ({
        ...prev,
        error: 'API key and base URL are required for model detection',
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

      // Filter for embedding models
      const embeddingModels = allModels.filter(model =>
        model.id.includes('embedding') ||
        model.id.includes('alias-embeddings') ||
        model.id === 'text-embedding-ada-002' ||
        model.id.startsWith('alias-embed')
      );

      // Convert to our model format
      const modelConfigs = embeddingModels.map(model => {
        let dimensions = 1024;
        let name = model.id;

        if (model.id.includes('ada-002')) {
          dimensions = 1536;
          name = 'OpenAI Compatible (ada-002)';
        } else if (model.id === 'alias-embeddings') {
          dimensions = 1024;
          name = 'Alias Embeddings (GritLM-7B)';
        } else if (model.id.includes('large')) {
          dimensions = 1536;
          name = `${model.id} (Large)`;
        }

        return {
          id: model.id,
          name: name,
          dimensions: dimensions,
          cost: 'Free for research'
        };
      });

      setLocalState(prev => ({
        ...prev,
        isDetectingModels: false,
        detectedModels: allModels,
        blabladorModels: modelConfigs,
        connectionStatus: 'connected'
      }));

      // Auto-select first embedding model if none selected
      if (!settings.embeddingModel && modelConfigs.length > 0) {
        const preferredModel = modelConfigs.find(m => m.id === 'alias-embeddings') || modelConfigs[0];
        updateSetting('embeddingModel', preferredModel.id);
        updateSetting('dimensions', preferredModel.dimensions);
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
      type: 'UPDATE_VECTORIZE',
      payload: settings
    });
  }, [settings, dispatch]);

  // Setting update helper
  const updateSetting = useCallback((key, value) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };

      // Auto-update dimensions when model changes
      if (key === 'embeddingModel') {
        const model = currentProvider?.models.find(m => m.id === value);
        if (model) {
          newSettings.dimensions = model.dimensions;
        }
      }

      // Reset model when provider changes
      if (key === 'provider') {
        const newProvider = embeddingProviders.find(p => p.id === value);
        if (newProvider && newProvider.models.length > 0) {
          newSettings.embeddingModel = newProvider.models[0].id;
          newSettings.dimensions = newProvider.models[0].dimensions;
        } else {
          newSettings.embeddingModel = '';
        }

        // Reset connection status for Blablador
        if (value === 'blablador') {
          setLocalState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
        }
      }

      return newSettings;
    });
  }, [currentProvider, embeddingProviders]);

  // Custom keys management
  const handleAddCustomKey = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      customKeys: [...prev.customKeys, { key: '', value: '', enabled: true }]
    }));
  }, []);

  const handleUpdateCustomKey = useCallback((index, field, value) => {
    setSettings(prev => ({
      ...prev,
      customKeys: prev.customKeys.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  }, []);

  const handleRemoveCustomKey = useCallback((index) => {
    setSettings(prev => ({
      ...prev,
      customKeys: prev.customKeys.filter((_, i) => i !== index)
    }));
  }, []);

  const handleToggleCustomKey = useCallback((index) => {
    setSettings(prev => ({
      ...prev,
      customKeys: prev.customKeys.map((item, i) =>
        i === index ? { ...item, enabled: !item.enabled } : item
      )
    }));
  }, []);

  // Generate embeddings
  const generateEmbeddings = useCallback(async () => {
    if (!chunk.processedChunks || chunk.processedChunks.length === 0) {
      setLocalState(prev => ({ ...prev, error: 'No chunks to vectorize. Complete text processing first.' }));
      return;
    }

    if (settings.provider === 'blablador' && !settings.blabladorApiKey) {
      setLocalState(prev => ({ ...prev, error: 'Blablador API key is required for vectorization.' }));
      return;
    }

    setLocalState(prev => ({
      ...prev,
      isProcessing: true,
      error: null,
      processingProgress: 0,
      currentBatch: 0,
      totalBatches: Math.ceil(chunk.processedChunks.length / settings.batchSize)
    }));

    try {
      const vectors = [];
      const totalBatches = Math.ceil(chunk.processedChunks.length / settings.batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const batchStart = i * settings.batchSize;
        const batchEnd = Math.min(batchStart + settings.batchSize, chunk.processedChunks.length);
        const batch = chunk.processedChunks.slice(batchStart, batchEnd);

        setLocalState(prev => ({
          ...prev,
          currentBatch: i + 1,
          processingProgress: Math.round(((i + 1) / totalBatches) * 100)
        }));

        try {
          const batchVectors = await processBatch(batch);
          vectors.push(...batchVectors);
        } catch (error) {
          console.error(`Batch ${i + 1} failed:`, error);
          // Continue with other batches
        }

        // Rate limiting
        if (i < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, (60 / settings.rateLimit) * 1000));
        }
      }

      // Update pipeline state
      dispatch({
        type: 'UPDATE_VECTORIZE',
        payload: {
          ...settings,
          vectors: vectors
        }
      });

      setLocalState(prev => ({
        ...prev,
        isProcessing: false,
        processingProgress: 100,
        previewVectors: vectors.slice(0, 3)
      }));

    } catch (error) {
      setLocalState(prev => ({
        ...prev,
        isProcessing: false,
        error: `Vectorization failed: ${error.message}`
      }));
    }
  }, [chunk.processedChunks, settings, dispatch]);

  // Process a batch of chunks
  const processBatch = useCallback(async (batch) => {
    const vectors = [];

    for (const chunkItem of batch) {
      try {
        const embedding = await generateEmbedding(chunkItem.content);

        // Build metadata with custom keys
        const customMetadata = {};
        settings.customKeys.forEach(ck => {
          if (ck.enabled && ck.key && ck.value) {
            let value = ck.value;

            // Handle dynamic values
            switch (value) {
              case 'repository':
                value = `${git.owner}/${git.repo}`;
                break;
              case 'branch':
                value = git.branch;
                break;
              case 'timestamp':
                value = new Date().toISOString();
                break;
              case 'chunk_method':
                value = chunk.chunkMethod;
                break;
              case 'embedding_model':
                value = settings.embeddingModel;
                break;
              case 'auto':
                if (ck.key === 'file_extension') {
                  value = chunkItem.metadata.source?.split('.').pop() || 'unknown';
                }
                break;
            }

            customMetadata[ck.key] = value;
          }
        });

        const vector = {
          id: chunkItem.id,
          embedding: embedding,
          metadata: {
            ...chunkItem.metadata,
            ...customMetadata,
            vector_id: chunkItem.id,
            embedding_model: settings.embeddingModel,
            embedding_provider: settings.provider,
            dimensions: settings.dimensions,
            created_at: new Date().toISOString()
          },
          content: chunkItem.content
        };

        vectors.push(vector);
      } catch (error) {
        console.error(`Failed to process chunk ${chunkItem.id}:`, error);
      }
    }

    return vectors;
  }, [settings, git, chunk]);

  // Generate single embedding
  const generateEmbedding = useCallback(async (text) => {
    if (settings.provider === 'blablador') {
      const response = await fetch(`${settings.blabladorBaseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.blabladorApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: settings.embeddingModel,
          input: text
        })
      });

      if (!response.ok) {
        throw new Error(`Blablador API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    }

    // For other providers, return mock embedding for now
    return Array.from({ length: settings.dimensions }, () => Math.random() - 0.5);
  }, [settings]);

  // Early return if no chunks
  if (!chunk.processedChunks || chunk.processedChunks.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vectorization</h1>
          <p className="text-gray-600">Convert your text chunks into vector embeddings for semantic search and retrieval.</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-amber-500">⚠️</span>
            <span className="text-amber-700 font-medium">No Chunks Available</span>
          </div>
          <p className="text-amber-700 text-sm mt-1">
            Please complete text processing first to generate chunks for vectorization.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Vectorization</h1>
        <p className="text-gray-600">
          Convert your {chunk.processedChunks.length} text chunks into vector embeddings for semantic search.
        </p>
      </div>

      {/* Input Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">📝 Input Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-blue-600 font-medium">Chunks</div>
            <div className="text-blue-800">{chunk.processedChunks.length}</div>
          </div>
          <div>
            <div className="text-blue-600 font-medium">Method</div>
            <div className="text-blue-800 capitalize">{chunk.chunkMethod}</div>
          </div>
          <div>
            <div className="text-blue-600 font-medium">Avg Size</div>
            <div className="text-blue-800">{chunk.chunkSize} chars</div>
          </div>
          <div>
            <div className="text-blue-600 font-medium">Repository</div>
            <div className="text-blue-800">{git.owner}/{git.repo}</div>
          </div>
        </div>
      </div>

      {/* Provider & Model Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Embedding Model Configuration</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
            <select
              value={settings.provider}
              onChange={(e) => updateSetting('provider', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {embeddingProviders.map(provider => (
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
                value={settings.embeddingModel}
                onChange={(e) => updateSetting('embeddingModel', e.target.value)}
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
                <p className="text-xs text-gray-500 mt-1">
                  Get your API key from <a href="https://codebase.helmholtz.cloud" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Helmholtz Codebase</a>
                </p>
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

            <div className="mt-3 flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.autoDetectModels}
                  onChange={(e) => updateSetting('autoDetectModels', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Auto-detect available models</span>
              </label>

              {localState.detectedModels.length > 0 && (
                <span className="text-green-800 text-sm font-medium">
                  ✅ {localState.detectedModels.length} models detected
                </span>
              )}
            </div>
          </div>
        )}

        {/* Model Information */}
        {currentModel && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Selected Model Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-600 font-medium">Dimensions:</span>
                <span className="text-blue-800 ml-2">{currentModel.dimensions}</span>
              </div>
              <div>
                <span className="text-blue-600 font-medium">Cost:</span>
                <span className="text-blue-800 ml-2">{currentModel.cost}</span>
              </div>
              <div>
                <span className="text-blue-600 font-medium">Provider:</span>
                <span className="text-blue-800 ml-2">{currentProvider.name}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Metadata Keys */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Custom Metadata Keys</h2>
            <p className="text-sm text-gray-600">Add custom key-value pairs to be included in vector metadata</p>
          </div>
          <button
            onClick={handleAddCustomKey}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            + Add Key
          </button>
        </div>

        <div className="space-y-3 mb-4">
          {settings.customKeys.map((customKey, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                checked={customKey.enabled}
                onChange={() => handleToggleCustomKey(index)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />

              <input
                type="text"
                placeholder="Key name (e.g., category)"
                value={customKey.key}
                onChange={(e) => handleUpdateCustomKey(index, 'key', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="text"
                placeholder="Value (e.g., repository, timestamp, custom text)"
                value={customKey.value}
                onChange={(e) => handleUpdateCustomKey(index, 'value', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <button
                onClick={() => handleRemoveCustomKey(index)}
                className="px-2 py-2 text-red-600 hover:text-red-800"
                title="Remove key"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-semibold text-amber-800 mb-2">💡 Dynamic Values</h4>
          <div className="text-amber-700 text-sm grid grid-cols-1 md:grid-cols-2 gap-1">
            <div>• <code className="bg-amber-100 px-1 rounded">repository</code> → {git.owner}/{git.repo}</div>
            <div>• <code className="bg-amber-100 px-1 rounded">branch</code> → {git.branch}</div>
            <div>• <code className="bg-amber-100 px-1 rounded">timestamp</code> → Current ISO timestamp</div>
            <div>• <code className="bg-amber-100 px-1 rounded">chunk_method</code> → {chunk.chunkMethod}</div>
            <div>• <code className="bg-amber-100 px-1 rounded">embedding_model</code> → {settings.embeddingModel}</div>
            <div>• <code className="bg-amber-100 px-1 rounded">auto</code> → Auto-detect based on key name</div>
          </div>
        </div>
      </div>

 

{/* Processing Configuration */}
<div className="bg-white rounded-lg border border-gray-200 p-6">
  <h2 className="text-xl font-semibold text-gray-800 mb-4">Processing Configuration</h2>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {/* ... existing batch size and rate limit inputs ... */}

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Storage Type</label>
      <select
        value={settings.storageType}
        onChange={(e) => updateSetting('storageType', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="indexeddb">IndexedDB (Recommended for large data)</option>
        <option value="memory">In-Memory (Temporary)</option>
        <option value="localStorage">Local Storage (Limited to ~5MB)</option>
      </select>
      <p className="text-xs text-gray-500 mt-1">
        IndexedDB can store much larger amounts of data than localStorage
      </p>
    </div>
  </div>

  {/* Storage Warning */}
  {processingStats.storageSize > 5 && settings.storageType === 'localStorage' && (
    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-center space-x-2">
        <span className="text-amber-500">⚠️</span>
        <span className="text-amber-700 font-medium">Storage Warning</span>
      </div>
      <p className="text-amber-700 text-sm mt-1">
        Estimated storage size ({processingStats.storageSize.toFixed(1)} MB) may exceed localStorage limits.
        Consider using IndexedDB for better performance.
      </p>
    </div>
  )}
</div>


      {/* Processing Status & Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Processing Status</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-3 rounded border">
            <div className="text-sm text-gray-600">Est. Vectors</div>
            <div className="text-lg font-semibold text-gray-800">{processingStats.totalVectors}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded border">
            <div className="text-sm text-gray-600">Est. Cost</div>
            <div className="text-lg font-semibold text-gray-800">${processingStats.estimatedCost.toFixed(3)}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded border">
            <div className="text-sm text-gray-600">Processing Time</div>
            <div className="text-lg font-semibold text-gray-800">{Math.ceil(processingStats.processingTime)}s</div>
          </div>
          <div className="bg-gray-50 p-3 rounded border">
            <div className="text-sm text-gray-600">Storage Size</div>
            <div className="text-lg font-semibold text-gray-800">{processingStats.storageSize.toFixed(1)} MB</div>
          </div>
        </div>

        {localState.isProcessing && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Processing batch {localState.currentBatch} of {localState.totalBatches}...</span>
              <span>{localState.processingProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${localState.processingProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        <button
          onClick={generateEmbeddings}
          disabled={localState.isProcessing || !settings.embeddingModel}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {localState.isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating Embeddings...
            </>
          ) : (
            '🧮 Generate Embeddings'
          )}
        </button>
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

      {/* Vector Preview */}
      {localState.previewVectors.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Vector Preview</h2>
            <p className="text-sm text-gray-600">
              Showing first 3 vectors from {vectorize.vectors?.length || 0} total vectors
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto p-4 space-y-3">
            {localState.previewVectors.map((vector, index) => (
              <div key={vector.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Vector {index + 1} • {vector.metadata.source}
                  </span>
                  <span className="text-xs text-gray-500">
                    {vector.embedding.length} dimensions
                  </span>
                </div>
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded mb-2 max-h-20 overflow-y-auto">
                  {vector.content.substring(0, 150)}
                  {vector.content.length > 150 && '...'}
                </div>
                <div className="text-xs text-gray-500">
                  <strong>Custom Metadata:</strong> {
                    JSON.stringify(
                      Object.fromEntries(
                        Object.entries(vector.metadata).filter(([key]) =>
                          settings.customKeys.some(ck => ck.key === key && ck.enabled)
                        )
                      ),
                      null,
                      1
                    ).substring(0, 200)
                  }...
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Summary */}
      {vectorize.vectors && vectorize.vectors.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">✅ Vectorization Complete</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-green-600 font-medium">Total Vectors</div>
              <div className="text-green-800">{vectorize.vectors.length}</div>
            </div>
            <div>
              <div className="text-green-600 font-medium">Model</div>
              <div className="text-green-800">{settings.embeddingModel}</div>
            </div>
            <div>
              <div className="text-green-600 font-medium">Custom Keys</div>
              <div className="text-green-800">{settings.customKeys.filter(ck => ck.enabled).length}</div>
            </div>
            <div>
              <div className="text-green-600 font-medium">Next Step</div>
              <div className="text-green-800">AI Chat / README</div>
            </div>
          </div>
        </div>
      )}

      {/* Benefits Section */}
      <div className="bg-green-50 border-l-4 border-green-500 p-4">
        <h3 className="font-semibold text-green-800 mb-2">🔬 Blablador Benefits</h3>
        <ul className="text-green-700 text-sm space-y-1">
          <li>• Free for research use at Helmholtz centers</li>
          <li>• OpenAI-compatible API for easy integration</li>
          <li>• Auto-detection of available embedding models</li>
          <li>• Specialized models for different use cases</li>
          <li>• Model aliases that automatically point to best available models</li>
          <li>• Custom metadata support for advanced filtering and categorization</li>
        </ul>
      </div>
    </div>
  );
};

export default VectorizeSection;
