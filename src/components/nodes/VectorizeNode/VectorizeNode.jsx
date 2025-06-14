import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Handle, Position, useReactFlow } from '@xyflow/react';

const BackgroundBeams = ({ className }) => (
  <div className={`absolute inset-0 overflow-hidden ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-orange-50/20 via-red-50/20 to-pink-50/20" />
    <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-orange-200/30 to-transparent" />
    <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-200/30 to-transparent" />
  </div>
);

const VectorizeNode = ({ id, data, selected }) => {
  const { updateNodeData, getNodes, getEdges } = useReactFlow();

  // State management
  const [showSettings, setShowSettings] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectedApiConfig, setConnectedApiConfig] = useState(null);
  const [connectedChunkData, setConnectedChunkData] = useState(null);
  const [vectorizationResults, setVectorizationResults] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [availableEmbeddingModels, setAvailableEmbeddingModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [testResults, setTestResults] = useState(null);

  // Vectorization settings
  const [settings, setSettings] = useState({
    embeddingModel: data.embeddingModel || '',
    batchSize: data.batchSize || 10,
    dimensions: data.dimensions || 1536,
    vectorStore: data.vectorStore || 'memory',
    indexName: data.indexName || 'default-index',
    useChunkData: data.useChunkData !== false,
    manualText: data.manualText || '',
    namespace: data.namespace || '',
    preserveMetadata: data.preserveMetadata !== false,
    autoSelectModel: data.autoSelectModel !== false,
  });

  const [stats, setStats] = useState({
    totalVectors: 0,
    processingTime: 0,
    averageEmbeddingTime: 0,
    lastProcessed: null,
    tokensUsed: 0,
    batchesProcessed: 0,
    modelsDetected: 0,
    lastTestResult: null,
    chunksProcessed: 0,
  });

  // FIXED: Enhanced API config detection with universal fallback
  const getApiConfig = useCallback(() => {
    try {
      const edges = getEdges();
      const nodes = getNodes();

      console.log('🔍 VectorizeNode searching for API config...');
      console.log('📊 Current node ID:', id);
      console.log('📊 All edges:', edges);
      console.log('📊 All nodes:', nodes.map(n => ({ id: n.id, type: n.type, hasData: !!n.data })));

      // Method 1: Look for any connection from apiConfigNode (most flexible)
      let apiConfigEdge = edges.find(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        return edge.target === id && sourceNode && sourceNode.type === 'apiConfigNode';
      });

      // Method 2: Look for direct connection to api-config handle
      if (!apiConfigEdge) {
        apiConfigEdge = edges.find(edge =>
          edge.target === id && edge.targetHandle === 'api-config'
        );
      }

      // Method 3: Look for any connected apiConfigNode in the entire flow
      if (!apiConfigEdge) {
        console.log('🔍 No direct connection, looking for any API config node...');
        const apiConfigNode = nodes.find(node =>
          node.type === 'apiConfigNode' &&
          node.data &&
          node.data.isConnected
        );

        if (apiConfigNode) {
          console.log('✅ Found standalone API config node:', apiConfigNode);
          const config = {
            provider: apiConfigNode.data.provider || 'custom',
            endpoint: apiConfigNode.data.endpoint || '',
            apiKey: apiConfigNode.data.apiKey || '',
            token: apiConfigNode.data.token || '',
            headers: apiConfigNode.data.headers || {},
            isConnected: apiConfigNode.data.isConnected || false,
            availableModels: apiConfigNode.data.availableModels || [],
            chatModels: apiConfigNode.data.chatModels || [],
            embeddingModels: apiConfigNode.data.embeddingModels || [],
          };

          setConnectedApiConfig(config);
          return config;
        }
      }

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
            embeddingModels: apiConfigNode.data.embeddingModels || [],
          };

          console.log('✅ Extracted config for Vectorize:', config);
          setConnectedApiConfig(config);
          return config;
        }
      }

      console.log('❌ No API config found for VectorizeNode');
      setConnectedApiConfig(null);
      return {};
    } catch (error) {
      console.error('❌ Error getting API config:', error);
      setConnectedApiConfig(null);
      return {};
    }
  }, [id, getNodes, getEdges]);

  // FIXED: Enhanced chunk data detection with universal compatibility
  const getChunkData = useCallback(() => {
    try {
      const edges = getEdges();
      const nodes = getNodes();

      console.log('🔍 VectorizeNode looking for chunk data...');
      console.log('📊 Edges targeting this node:', edges.filter(e => e.target === id));

      // Method 1: Look for any connection from chunkNode (most flexible)
      let chunkEdge = edges.find(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        return edge.target === id && sourceNode && sourceNode.type === 'chunkNode';
      });

      // Method 2: Look for connection to input handle
      if (!chunkEdge) {
        chunkEdge = edges.find(edge =>
          edge.target === id && edge.targetHandle === 'input'
        );
      }

      // Method 3: Look for any node that can provide chunk data
      if (!chunkEdge) {
        chunkEdge = edges.find(edge => {
          const sourceNode = nodes.find(n => n.id === edge.source);
          return edge.target === id && sourceNode &&
                 ['chunkNode', 'parseNode', 'filterNode', 'textNode'].includes(sourceNode.type);
        });
      }

      if (chunkEdge) {
        console.log('✅ Found chunk edge:', chunkEdge);
        const chunkNode = nodes.find(node => node.id === chunkEdge.source);

        if (chunkNode && chunkNode.data) {
          console.log('✅ Found chunk node:', chunkNode.type, chunkNode.data);

          let chunkData = {
            chunks: [],
            chunkSettings: {},
            sourceMetadata: {},
            stats: {},
            nodeType: chunkNode.type
          };

          // Handle different node types that can provide chunk data
          switch (chunkNode.type) {
            case 'chunkNode':
              // Primary ChunkNode compatibility
              chunkData.chunks = chunkNode.data.processedChunks ||
                                 chunkNode.data.chunks ||
                                 chunkNode.data.textChunks ||
                                 chunkNode.data.outputChunks ||
                                 [];

              chunkData.chunkSettings = {
                chunkSize: chunkNode.data.chunkSize || 1000,
                chunkMethod: chunkNode.data.chunkMethod || 'recursive',
                chunkOverlap: chunkNode.data.chunkOverlap || 200,
                preserveStructure: chunkNode.data.preserveStructure || false,
              };

              chunkData.sourceMetadata = chunkNode.data.sourceMetadata ||
                                        chunkNode.data.connectedInputData?.metadata ||
                                        {};

              chunkData.stats = chunkNode.data.stats || {};
              break;

            case 'parseNode':
              // ParseNode compatibility
              const parsedContent = chunkNode.data.parsedContent ||
                                   chunkNode.data.content ||
                                   chunkNode.data.text ||
                                   '';

              if (parsedContent) {
                const chunkSize = 1000;
                const chunks = [];
                for (let i = 0; i < parsedContent.length; i += chunkSize) {
                  chunks.push({
                    content: parsedContent.slice(i, i + chunkSize),
                    text: parsedContent.slice(i, i + chunkSize),
                    index: Math.floor(i / chunkSize),
                    metadata: {
                      source: 'parse_node',
                      chunk_method: 'fixed_size',
                      chunk_size: chunkSize
                    }
                  });
                }
                chunkData.chunks = chunks;
              }
              break;

            case 'filterNode':
              // FilterNode compatibility
              const filteredContent = chunkNode.data.filteredContent ||
                                     chunkNode.data.content ||
                                     '';

              if (filteredContent) {
                const chunkSize = 1000;
                const chunks = [];
                for (let i = 0; i < filteredContent.length; i += chunkSize) {
                  chunks.push({
                    content: filteredContent.slice(i, i + chunkSize),
                    text: filteredContent.slice(i, i + chunkSize),
                    index: Math.floor(i / chunkSize),
                    metadata: {
                      source: 'filter_node',
                      chunk_method: 'fixed_size'
                    }
                  });
                }
                chunkData.chunks = chunks;
              }
              break;

            case 'textNode':
              // TextNode compatibility
              const textContent = chunkNode.data.text || chunkNode.data.content || '';
              if (textContent) {
                chunkData.chunks = [{
                  content: textContent,
                  text: textContent,
                  index: 0,
                  metadata: {
                    source: 'text_node',
                    chunk_method: 'single'
                  }
                }];
              }
              break;

            default:
              // Generic fallback
              const genericContent = chunkNode.data.content ||
                                    chunkNode.data.text ||
                                    chunkNode.data.output ||
                                    '';

              if (genericContent) {
                chunkData.chunks = [{
                  content: genericContent,
                  text: genericContent,
                  index: 0,
                  metadata: {
                    source: chunkNode.type || 'unknown',
                    chunk_method: 'single'
                  }
                }];
              }
          }

          console.log('✅ Extracted chunk data:', {
            nodeType: chunkData.nodeType,
            chunksCount: chunkData.chunks.length
          });

          setConnectedChunkData(chunkData);
          return chunkData;
        }
      }

      console.log('❌ No chunk data found');
      setConnectedChunkData(null);
      return { chunks: [], chunkSettings: {}, sourceMetadata: {}, stats: {}, nodeType: null };
    } catch (error) {
      console.error('❌ Error getting chunk data:', error);
      setConnectedChunkData(null);
      return { chunks: [], chunkSettings: {}, sourceMetadata: {}, stats: {}, nodeType: null };
    }
  }, [id, getNodes, getEdges]);

  // Use embedding models from API config if available
  const fetchAvailableEmbeddingModels = useCallback(async (apiConfig) => {
    // First try to use models from API config node
    if (apiConfig && apiConfig.embeddingModels && apiConfig.embeddingModels.length > 0) {
      console.log('✅ Using embedding models from API config:', apiConfig.embeddingModels);
      setAvailableEmbeddingModels(apiConfig.embeddingModels);
      setStats(prev => ({ ...prev, modelsDetected: apiConfig.embeddingModels.length }));
      return apiConfig.embeddingModels;
    }

    if (!apiConfig || (!apiConfig.apiKey && !apiConfig.token) || !apiConfig.isConnected) {
      console.log('❌ No API config or not connected, clearing models');
      setAvailableEmbeddingModels([]);
      setStats(prev => ({ ...prev, modelsDetected: 0 }));
      return [];
    }

    setIsLoadingModels(true);

    try {
      let modelsEndpoint;

      if (apiConfig.provider === 'blablador' || apiConfig.endpoint?.includes('blablador')) {
        modelsEndpoint = `${apiConfig.endpoint}/models`;
      } else if (apiConfig.provider === 'openai' || apiConfig.endpoint?.includes('openai.com')) {
        modelsEndpoint = 'https://api.openai.com/v1/models';
      } else {
        modelsEndpoint = `${apiConfig.endpoint}/models`;
      }

      console.log('🔍 Fetching embedding models from:', modelsEndpoint);

      const response = await fetch(modelsEndpoint, {
        headers: {
          'Authorization': `Bearer ${apiConfig.apiKey || apiConfig.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      let embeddingModels = [];

      if (data.data && Array.isArray(data.data)) {
        embeddingModels = data.data
          .filter(model =>
            model.id.includes('embedding') ||
            model.id.includes('embed') ||
            model.id === 'alias-embeddings' ||
            model.id === 'text-embedding-ada-002' ||
            model.id.includes('text-embedding')
          )
          .map(model => model.id);
      }

      console.log('✅ Found embedding models:', embeddingModels);
      setStats(prev => ({ ...prev, modelsDetected: embeddingModels.length }));

      return embeddingModels;

    } catch (error) {
      console.error('❌ Error fetching embedding models:', error);
      setAvailableEmbeddingModels([]);
      setStats(prev => ({ ...prev, modelsDetected: 0 }));
      return [];
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  // TEST EMBEDDING CONNECTION
  const testEmbeddingConnection = useCallback(async () => {
    const apiConfig = getApiConfig();

    if (!apiConfig || (!apiConfig.apiKey && !apiConfig.token)) {
      alert('Please connect an API Configuration node first');
      return;
    }

    setIsTesting(true);
    setTestResults(null);

    try {
      console.log('🧪 Testing embedding connection...');

      const testEndpoints = [];

      if (apiConfig.provider === 'blablador' || apiConfig.endpoint?.includes('blablador')) {
        testEndpoints.push({
          name: 'Standard Embeddings',
          url: `${apiConfig.endpoint}/embeddings`,
          model: 'alias-embeddings'
        });
        testEndpoints.push({
          name: 'Engine-specific Embeddings',
          url: `${apiConfig.endpoint}/engines/alias-embeddings/embeddings`,
          model: 'alias-embeddings'
        });
      } else {
        testEndpoints.push({
          name: 'Standard Embeddings',
          url: `${apiConfig.endpoint}/embeddings`,
          model: 'text-embedding-ada-002'
        });
      }

      const testText = "This is a test sentence for embedding generation.";
      const results = [];

      for (const endpoint of testEndpoints) {
        try {
          console.log(`🧪 Testing: ${endpoint.url}`);

          const response = await fetch(endpoint.url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiConfig.apiKey || apiConfig.token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              input: testText,
              model: endpoint.model,
              encoding_format: 'float'
            })
          });

          const responseData = await response.json().catch(() => ({}));

          results.push({
            endpoint: endpoint.name,
            url: endpoint.url,
            model: endpoint.model,
            status: response.status,
            success: response.ok,
            data: responseData,
            error: response.ok ? null : `HTTP ${response.status}`
          });

          if (response.ok) {
            console.log(`✅ ${endpoint.name} SUCCESS`);
            if (!settings.embeddingModel) {
              handleSettingChange('embeddingModel', endpoint.model);
            }
            break;
          }

        } catch (error) {
          results.push({
            endpoint: endpoint.name,
            url: endpoint.url,
            model: endpoint.model,
            status: 'ERROR',
            success: false,
            error: error.message
          });
        }
      }

      setTestResults(results);
      setStats(prev => ({ ...prev, lastTestResult: Date.now() }));

      const successfulTests = results.filter(r => r.success);
      if (successfulTests.length > 0) {
        alert(`✅ Embedding test successful!\n\nWorking: ${successfulTests[0].endpoint}\nModel: ${successfulTests[0].model}`);
      } else {
        alert(`❌ All tests failed. Check console for details.`);
      }

    } catch (error) {
      console.error('❌ Test error:', error);
      alert(`Test failed: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  }, [getApiConfig, settings.embeddingModel]);

  // ENHANCED: Process vectorization with full compatibility
  const processVectorization = useCallback(async () => {
    const apiConfig = getApiConfig();
    const chunkData = getChunkData();

    if (!apiConfig || (!apiConfig.apiKey && !apiConfig.token)) {
      alert('Please connect an API Configuration node first');
      return;
    }

    if (!settings.embeddingModel) {
      alert('Please select an embedding model first');
      return;
    }

    // Determine what to vectorize
    let textToProcess = [];
    let useChunks = false;

    if (settings.useChunkData && chunkData.chunks.length > 0) {
      console.log('✅ Using chunks from connected node:', chunkData.nodeType);
      textToProcess = chunkData.chunks;
      useChunks = true;
    } else if (settings.manualText.trim()) {
      console.log('📝 Using manual text input');
      textToProcess = [{
        content: settings.manualText,
        text: settings.manualText,
        index: 0,
        metadata: { source: 'manual_input' }
      }];
    } else {
      alert('Please connect a node with chunk data or enter text manually');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    const startTime = Date.now();

    try {
      console.log('🚀 Starting vectorization process...');
      console.log(`📊 Processing ${textToProcess.length} chunks from ${chunkData.nodeType || 'manual'}`);

      const vectors = [];
      const totalChunks = textToProcess.length;
      const batchSize = settings.batchSize;

      for (let i = 0; i < totalChunks; i += batchSize) {
        const batch = textToProcess.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(totalChunks / batchSize);

        console.log(`🔄 Processing batch ${batchNumber}/${totalBatches}`);
        setProcessingProgress((batchNumber / totalBatches) * 100);

        try {
          const batchPromises = batch.map(async (chunk, batchIndex) => {
            const text = typeof chunk === 'string' ? chunk : (chunk.content || chunk.text || chunk);

            // Generate embedding
            const embeddingsEndpoint = `${apiConfig.endpoint}/embeddings`;
            const response = await fetch(embeddingsEndpoint, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiConfig.apiKey || apiConfig.token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                input: text,
                model: settings.embeddingModel,
                encoding_format: 'float'
              })
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const embedding = data.data[0].embedding;

            return {
              id: `${settings.indexName}_${Date.now()}_${i + batchIndex}`,
              values: embedding,
              metadata: {
                text: text,
                text_length: text.length,
                embedding_model: settings.embeddingModel,
                embedding_dimensions: embedding.length,
                created_at: new Date().toISOString(),
                node_id: id,
                chunk_index: typeof chunk === 'object' ? chunk.index : (i + batchIndex),
                source: typeof chunk === 'object' ? chunk.metadata?.source : 'unknown',
                chunk_method: typeof chunk === 'object' ? chunk.metadata?.chunk_method : 'unknown',
                source_node_type: chunkData.nodeType || 'manual',
                ...(typeof chunk === 'object' ? chunk.metadata || {} : {})
              },
              namespace: settings.namespace || undefined,
            };
          });

          const batchResults = await Promise.all(batchPromises);
          vectors.push(...batchResults);

          // Small delay between batches
          if (i + batchSize < totalChunks) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }

        } catch (error) {
          console.error(`❌ Batch ${batchNumber} failed:`, error);
          throw error;
        }
      }

      const processingTime = Date.now() - startTime;

      const finalStats = {
        totalVectors: vectors.length,
        processingTime,
        averageEmbeddingTime: processingTime / vectors.length,
        lastProcessed: Date.now(),
        tokensUsed: vectors.length * 100,
        batchesProcessed: Math.ceil(totalChunks / batchSize),
        modelsDetected: availableEmbeddingModels.length,
        chunksProcessed: totalChunks,
      };

      setStats(finalStats);

      const results = {
        vectors: vectors,
        metadata: {
          model: settings.embeddingModel,
          dimensions: vectors[0]?.values?.length || settings.dimensions,
          totalTokens: finalStats.tokensUsed,
          processingTime,
          batchSize: settings.batchSize,
          useChunks,
          chunkSettings: useChunks ? chunkData.chunkSettings : null,
          sourceMetadata: useChunks ? chunkData.sourceMetadata : null,
          sourceNodeType: chunkData.nodeType || 'manual',
          createdAt: new Date().toISOString(),
        }
      };

      setVectorizationResults(results);

      console.log('✅ Vectorization completed successfully');

    } catch (error) {
      console.error('❌ Vectorization error:', error);
      alert(`Vectorization failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  }, [getApiConfig, getChunkData, settings, availableEmbeddingModels, id]);

  // Monitor for API config and chunk data changes
  useEffect(() => {
    const interval = setInterval(() => {
      getApiConfig();
      getChunkData();
    }, 2000);

    return () => clearInterval(interval);
  }, [getApiConfig, getChunkData]);

  // Fetch embedding models when API config changes
  useEffect(() => {
    if (connectedApiConfig && connectedApiConfig.isConnected && (connectedApiConfig.apiKey || connectedApiConfig.token)) {
      console.log('🔍 API connected, fetching embedding models...');
      fetchAvailableEmbeddingModels(connectedApiConfig).then(models => {
        setAvailableEmbeddingModels(models);

        if (settings.autoSelectModel && models.length > 0 && !settings.embeddingModel) {
          handleSettingChange('embeddingModel', models[0]);
        }
      });
    } else {
      setAvailableEmbeddingModels([]);
      setStats(prev => ({ ...prev, modelsDetected: 0 }));
    }
  }, [connectedApiConfig, fetchAvailableEmbeddingModels, settings.autoSelectModel]);

  // Update node data when settings change
  useEffect(() => {
    updateNodeData(id, {
      ...settings,
      stats,
      connectedApiConfig,
      connectedChunkData,
      vectorizationResults,
      availableEmbeddingModels,
      testResults,
      lastUpdated: Date.now()
    });
  }, [settings, stats, connectedApiConfig, connectedChunkData, vectorizationResults, availableEmbeddingModels, testResults, id, updateNodeData]);

  // Handle setting changes
  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
  };

  // DEBUG: Add debug button to test connections
  const debugConnections = useCallback(() => {
    const edges = getEdges();
    const nodes = getNodes();

    console.log('🧪 Debug VectorizeNode connections:');
    console.log('All edges:', edges);
    console.log('Edges to this node:', edges.filter(e => e.target === id));
    console.log('All nodes:', nodes.map(n => ({ id: n.id, type: n.type, hasData: !!n.data })));

    const apiTest = getApiConfig();
    const chunkTest = getChunkData();

    alert(`Debug Results:
API Config Found: ${!!apiTest.isConnected}
Provider: ${apiTest.provider || 'none'}
Chunk Data Found: ${!!chunkTest.chunks?.length}
Chunks Count: ${chunkTest.chunks?.length || 0}
Source Node: ${chunkTest.nodeType || 'none'}

Check console for detailed logs`);
  }, [getApiConfig, getChunkData, getEdges, getNodes, id]);

  // Get provider display name
  const getProviderDisplayName = (provider) => {
    const providerNames = {
      'openai': 'OpenAI',
      'blablador': 'Blablador (JSC)',
      'anthropic': 'Anthropic',
      'huggingface': 'Hugging Face',
      'custom': 'Custom API'
    };
    return providerNames[provider] || provider || 'Unknown';
  };

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
        className={`bg-white rounded-xl shadow-lg border-2 transition-all duration-300 overflow-hidden ${
          selected ? 'border-orange-400 shadow-orange-100' : 'border-gray-200'
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
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">🔮</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Vector Embeddings</h3>
                <p className="text-xs text-gray-500">
                  {settings.embeddingModel || 'No model selected'}
                  {stats.totalVectors > 0 && (
                    <span className="text-green-600"> • {stats.totalVectors} vectors</span>
                  )}
                  {stats.modelsDetected > 0 && (
                    <span className="text-blue-600"> • {stats.modelsDetected} models</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                title="Settings"
              >
                ⚙️
              </button>
              <button
                onClick={debugConnections}
                className="w-6 h-6 flex items-center justify-center rounded bg-red-100 hover:bg-red-200 transition-colors"
                title="Debug Connections"
              >
                🧪
              </button>
              <button
                onClick={testEmbeddingConnection}
                disabled={isTesting || !connectedApiConfig}
                className="w-6 h-6 flex items-center justify-center rounded bg-purple-100 hover:bg-purple-200 transition-colors disabled:opacity-50"
                title="Test Embedding Connection"
              >
                {isTesting ? '🔄' : '🔬'}
              </button>
              <button
                onClick={processVectorization}
                disabled={isProcessing || !connectedApiConfig || !settings.embeddingModel}
                className="w-6 h-6 flex items-center justify-center rounded bg-orange-100 hover:bg-orange-200 transition-colors disabled:opacity-50"
                title="Process Vectorization"
              >
                {isProcessing ? '🔄' : '▶️'}
              </button>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="relative z-10 px-4 py-2 border-b border-gray-100 space-y-1">
          <div className={`text-xs px-2 py-1 rounded-full text-center ${
            connectedApiConfig && connectedApiConfig.isConnected
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {connectedApiConfig && connectedApiConfig.isConnected
              ? `✅ API: ${getProviderDisplayName(connectedApiConfig.provider)}`
              : '❌ No API Config Connected'
            }
          </div>

          <div className={`text-xs px-2 py-1 rounded-full text-center ${
            connectedChunkData && connectedChunkData.chunks.length > 0
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {connectedChunkData && connectedChunkData.chunks.length > 0
              ? `📊 ${connectedChunkData.chunks.length} chunks from ${connectedChunkData.nodeType}`
              : '📝 No chunk data connected'
            }
          </div>
        </div>

        {/* Processing Progress */}
        {isProcessing && (
          <div className="relative z-10 px-4 py-2 bg-orange-50 border-b border-orange-100">
            <div className="flex items-center justify-between text-xs text-orange-700 mb-1">
              <span>Processing embeddings...</span>
              <span>{Math.round(processingProgress)}%</span>
            </div>
            <div className="w-full bg-orange-200 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Test Results */}
        {testResults && (
          <div className="relative z-10 px-4 py-2 border-b border-gray-100">
            <div className="text-xs font-medium text-gray-700 mb-2">Test Results:</div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {testResults.map((result, index) => (
                <div key={index} className={`text-xs px-2 py-1 rounded ${
                  result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  <div className="font-medium">{result.endpoint}</div>
                  <div>{result.success ? `✅ ${result.status} (${result.model})` : `❌ ${result.error}`}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Display */}
        {stats.totalVectors > 0 && (
          <div className="relative z-10 px-4 py-2 bg-orange-50 border-b border-orange-100">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-semibold text-orange-700">{stats.totalVectors}</div>
                <div className="text-orange-600">Vectors</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-orange-700">{stats.chunksProcessed}</div>
                <div className="text-orange-600">Chunks</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-orange-700">{stats.processingTime}ms</div>
                <div className="text-orange-600">Time</div>
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
                {/* Data Source Toggle */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Use Chunk Data</label>
                    <p className="text-xs text-gray-500">Use data from connected nodes</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.useChunkData}
                      onChange={(e) => handleSettingChange('useChunkData', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>

                {/* Manual Text Input */}
                {!settings.useChunkData && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Manual Text Input
                    </label>
                    <textarea
                      value={settings.manualText}
                      onChange={(e) => handleSettingChange('manualText', e.target.value)}
                      placeholder="Enter text to convert to embeddings..."
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                      rows="4"
                    />
                  </div>
                )}

                {/* Embedding Model */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Embedding Model
                    {connectedApiConfig && connectedApiConfig.isConnected ? (
                      availableEmbeddingModels.length > 0 ? (
                        <span className="text-green-600"> ({availableEmbeddingModels.length} detected)</span>
                      ) : (
                        <span className="text-orange-600"> (loading...)</span>
                      )
                    ) : (
                      <span className="text-red-600"> (connect API first)</span>
                    )}
                  </label>
                  <select
                    value={settings.embeddingModel}
                    onChange={(e) => handleSettingChange('embeddingModel', e.target.value)}
                    disabled={!connectedApiConfig || !connectedApiConfig.isConnected}
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
                  >
                    <option value="">Select a model...</option>
                    {availableEmbeddingModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>

                {/* Batch Size */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Batch Size ({settings.batchSize})
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={settings.batchSize}
                    onChange={(e) => handleSettingChange('batchSize', parseInt(e.target.value))}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full nodrag"
                  />
                </div>

                {/* Connection Info */}
                {connectedChunkData && connectedChunkData.chunks.length > 0 && (
                  <div className="bg-blue-100 p-2 rounded text-xs">
                    <div className="font-medium text-blue-800 mb-1">Chunk Data Info:</div>
                    <div className="text-blue-700">
                      Source: {connectedChunkData.nodeType}<br />
                      Chunks: {connectedChunkData.chunks.length}<br />
                      {connectedChunkData.chunkSettings?.chunkMethod && (
                        <>Method: {connectedChunkData.chunkSettings.chunkMethod}<br /></>
                      )}
                    </div>
                  </div>
                )}

                {/* Debug Info */}
                {connectedApiConfig && (
                  <div className="bg-gray-100 p-2 rounded text-xs">
                    <div className="font-medium text-gray-700 mb-1">API Debug:</div>
                    <div>Provider: {connectedApiConfig.provider}</div>
                    <div>Endpoint: {connectedApiConfig.endpoint}</div>
                    <div>Connected: {connectedApiConfig.isConnected ? 'Yes' : 'No'}</div>
                    <div>Models: {connectedApiConfig.embeddingModels?.length || 0}</div>
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

export default VectorizeNode;
