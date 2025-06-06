import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import PlayButton from '../../ui/PlayButton';

// Simplified Background Beams
const BackgroundBeams = ({ className }) => (
  <div className={`absolute inset-0 pointer-events-none ${className}`}>
    <svg className="absolute inset-0 h-full w-full opacity-20" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="vector-beams" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M0 40L40 0H20L0 20M40 40V20L20 40" stroke="rgba(156, 163, 175, 0.1)" fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#vector-beams)" />
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

const VectorizeNode = ({ id, data, isConnectable, selected }) => {
  const [inputData, setInputData] = useState(data?.inputData || null);
  const [apiConfig, setApiConfig] = useState(data?.apiConfig || null);
  const [vectorizedData, setVectorizedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [dataCheckCounter, setDataCheckCounter] = useState(0);

  // Vectorization configuration
  const [selectedModel, setSelectedModel] = useState(data?.selectedModel || '');
  const [batchSize, setBatchSize] = useState(data?.batchSize || 10);
  const [preserveMetadata, setPreserveMetadata] = useState(true);

  const { setNodes, getNodes, getEdges } = useReactFlow();
  const vectorizeButtonRef = useRef(null);
  const updateTimeoutRef = useRef(null);

  // **CHAIN REACTION FUNCTIONALITY**
  const triggerNextNodes = useCallback(async (currentNodeId) => {
    const edges = getEdges();
    const nodes = getNodes();

    const outgoingEdges = edges.filter(edge => edge.source === currentNodeId);

    if (outgoingEdges.length > 0) {
      console.log(`🔗 VectorizeNode: Found ${outgoingEdges.length} connected node(s) to trigger`);

      for (let i = 0; i < outgoingEdges.length; i++) {
        const edge = outgoingEdges[i];
        const targetNode = nodes.find(node => node.id === edge.target);

        if (targetNode) {
          console.log(`🎯 VectorizeNode: Triggering ${targetNode.type} node ${edge.target}`);

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
    } else {
      console.log(`⏹️ VectorizeNode: No connected nodes found after vectorization`);
    }
  }, [getEdges, getNodes]);

  // **GENERATE EMBEDDINGS**
  const generateEmbedding = useCallback(async (text, model) => {
    if (!apiConfig || !apiConfig.apiKey || !apiConfig.apiEndpoint) {
      throw new Error('API configuration not available');
    }

    try {
      const response = await fetch(`${apiConfig.apiEndpoint}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: text,
          model: model,
          encoding_format: 'float'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error(`❌ VectorizeNode ${id}: Embedding generation failed:`, error);
      throw error;
    }
  }, [apiConfig, id]);

  // **BATCH PROCESS CHUNKS**
  const processChunksInBatches = useCallback(async (chunks, model, batchSize) => {
    const vectorizedChunks = [];
    const totalBatches = Math.ceil(chunks.length / batchSize);

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      console.log(`🔄 VectorizeNode ${id}: Processing batch ${batchNumber}/${totalBatches} (${batch.length} chunks)`);

      try {
        const batchPromises = batch.map(async (chunk) => {
          const embedding = await generateEmbedding(chunk.content, model);
          return {
            ...chunk,
            embedding: embedding,
            embeddingDimensions: embedding.length,
            vectorizedAt: new Date().toISOString(),
            model: model
          };
        });

        const batchResults = await Promise.all(batchPromises);
        vectorizedChunks.push(...batchResults);

        // Small delay between batches to respect rate limits
        if (i + batchSize < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        console.error(`❌ VectorizeNode ${id}: Batch ${batchNumber} failed:`, error);
        throw error;
      }
    }

    return vectorizedChunks;
  }, [generateEmbedding, id]);

  // **MAIN VECTORIZATION PROCESS**
  const processVectorization = useCallback(async () => {
    if (!inputData || !inputData.chunkedFiles) {
      console.log(`⚠️ VectorizeNode ${id}: No chunked data to vectorize`);
      return;
    }

    if (!apiConfig || !apiConfig.apiKey || !selectedModel) {
      setError('Please connect API configuration and select a model');
      return;
    }

    setIsProcessing(true);
    setError(null);
    console.log(`🔄 VectorizeNode ${id}: Starting vectorization with ${selectedModel}`);

    try {
      const vectorizedFiles = [];
      let totalVectors = 0;

      for (const chunkedFile of inputData.chunkedFiles) {
        if (!chunkedFile.chunks || chunkedFile.chunks.length === 0) continue;

        console.log(`📄 VectorizeNode ${id}: Vectorizing ${chunkedFile.originalFile.name} (${chunkedFile.chunks.length} chunks)`);

        const vectorizedChunks = await processChunksInBatches(
          chunkedFile.chunks,
          selectedModel,
          batchSize
        );

        const processedFile = {
          originalFile: chunkedFile.originalFile,
          parser: chunkedFile.parser,
          chunks: vectorizedChunks,
          chunkCount: vectorizedChunks.length,
          vectorCount: vectorizedChunks.length,
          embeddingDimensions: vectorizedChunks[0]?.embeddingDimensions || 0,
          model: selectedModel,
          metadata: preserveMetadata ? chunkedFile.metadata : null
        };

        vectorizedFiles.push(processedFile);
        totalVectors += vectorizedChunks.length;

        console.log(`✅ VectorizeNode ${id}: Created ${vectorizedChunks.length} vectors for ${chunkedFile.originalFile.name}`);
      }

      const result = {
        ...inputData,
        vectorizedFiles: vectorizedFiles,
        totalVectors: totalVectors,
        vectorizationConfig: {
          model: selectedModel,
          apiEndpoint: apiConfig.apiEndpoint,
          batchSize,
          preserveMetadata,
          embeddingDimensions: vectorizedFiles[0]?.embeddingDimensions || 0
        },
        vectorizedAt: new Date().toISOString()
      };

      setVectorizedData(result);
      console.log(`✨ VectorizeNode ${id}: Vectorization complete! ${vectorizedFiles.length} files → ${totalVectors} vectors`);

      await new Promise(resolve => setTimeout(resolve, 500));
      await triggerNextNodes(id);

    } catch (error) {
      console.error(`❌ VectorizeNode ${id}: Vectorization failed:`, error);
      setError(`Vectorization failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [inputData, apiConfig, selectedModel, batchSize, preserveMetadata, id, processChunksInBatches, triggerNextNodes]);

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
                inputData,
                apiConfig,
                vectorizedData,
                selectedModel,
                batchSize,
                preserveMetadata,
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
  }, [inputData, apiConfig, vectorizedData, selectedModel, batchSize, preserveMetadata, id, setNodes]);

  // **ENHANCED DATA DETECTION - RECEIVES FROM BOTH CHUNKNODE AND APICONFIGNODE**
  useEffect(() => {
    const checkForInputData = () => {
      try {
        const edges = getEdges();
        const nodes = getNodes();

        console.log(`🔍 VectorizeNode ${id}: Checking for input data (attempt #${dataCheckCounter})`);

        const incomingEdges = edges.filter(edge => edge.target === id);

        incomingEdges.forEach(edge => {
          const sourceNode = nodes.find(node => node.id === edge.source);

          if (sourceNode && sourceNode.data) {
            // Check for chunked data from ChunkNode
            if (sourceNode.data.chunkedData || sourceNode.data.chunkedFiles) {
              const chunkData = sourceNode.data.chunkedData || sourceNode.data;
              const chunkCount = chunkData.chunkedFiles?.reduce((sum, file) => sum + (file.chunks?.length || 0), 0) || 0;
              console.log(`✅ VectorizeNode ${id}: Found chunked data with ${chunkCount} chunks`);
              setInputData(chunkData);
            }

            // Check for API config from APIConfigNode
            if (sourceNode.data.apiKey && sourceNode.data.apiEndpoint) {
              console.log(`✅ VectorizeNode ${id}: Found API configuration`);
              setApiConfig({
                apiKey: sourceNode.data.apiKey,
                apiEndpoint: sourceNode.data.apiEndpoint,
                availableModels: sourceNode.data.availableModels || []
              });

              // Auto-select first embedding model if none selected
              if (!selectedModel && sourceNode.data.availableModels) {
                const embeddingModels = sourceNode.data.availableModels.filter(model =>
                  model.id.includes('embedding') ||
                  model.id.includes('embed') ||
                  model.id === 'text-embedding-ada-002' ||
                  model.id === 'alias-embeddings'
                );
                if (embeddingModels.length > 0) {
                  setSelectedModel(embeddingModels[0].id);
                }
              }
            }
          }
        });

        if (!inputData) {
          console.log(`⚠️ VectorizeNode ${id}: No chunked data found`);
        }
        if (!apiConfig) {
          console.log(`⚠️ VectorizeNode ${id}: No API configuration found`);
        }
      } catch (error) {
        console.error(`❌ VectorizeNode ${id}: Error checking input data:`, error);
      }
    };

    checkForInputData();
  }, [getEdges, getNodes, id, dataCheckCounter, selectedModel]);

  // **PERIODIC DATA CHECK WHEN WAITING**
  useEffect(() => {
    if (!inputData || !apiConfig) {
      const interval = setInterval(() => {
        console.log(`🔍 VectorizeNode ${id}: Periodic data check #${dataCheckCounter}`);
        setDataCheckCounter(prev => prev + 1);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [inputData, apiConfig, dataCheckCounter, id]);

  // **NODE EXECUTION HANDLER**
  const handleNodeExecution = useCallback(async (inputData) => {
    console.log(`🎯 VectorizeNode ${id}: Executing with input data:`, inputData);

    try {
      Object.values(inputData).forEach(data => {
        if (data.chunkedFiles) {
          console.log(`📥 VectorizeNode ${id}: Processing chunked data from connected ChunkNode`);
          setInputData(data);
        }
        if (data.apiKey && data.apiEndpoint) {
          console.log(`📥 VectorizeNode ${id}: Processing API config from connected APIConfigNode`);
          setApiConfig({
            apiKey: data.apiKey,
            apiEndpoint: data.apiEndpoint,
            availableModels: data.availableModels || []
          });
        }
      });

      if (inputData && Object.keys(inputData).length > 0) {
        console.log(`🔄 VectorizeNode ${id}: Auto-vectorizing after receiving data`);
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (vectorizeButtonRef.current && !isProcessing && apiConfig && selectedModel) {
          console.log(`✅ VectorizeNode ${id}: Triggering vectorize button`);
          vectorizeButtonRef.current.click();
        } else {
          await processVectorization();
        }
      }
    } catch (error) {
      console.error(`❌ VectorizeNode ${id}: Error during execution:`, error);
    }
  }, [id, processVectorization, isProcessing, apiConfig, selectedModel]);

  // **AUTO-EXECUTION EVENT LISTENER**
  useEffect(() => {
    const handleAutoExecution = (event) => {
      if (event.detail.nodeId === id) {
        console.log(`🎯 VectorizeNode ${id}: Auto-triggered for execution`);

        if (vectorizeButtonRef.current && !isProcessing && inputData && apiConfig && selectedModel) {
          console.log(`✅ VectorizeNode ${id}: Triggering vectorize button click`);
          vectorizeButtonRef.current.click();
          return;
        }

        if (inputData && !isProcessing && apiConfig && selectedModel) {
          console.log(`✅ VectorizeNode ${id}: Direct function call for auto-execution`);
          processVectorization();
        } else {
          console.log(`⚠️ VectorizeNode ${id}: Cannot auto-execute - missing requirements`);
        }
      }
    };

    window.addEventListener('triggerExecution', handleAutoExecution);
    window.addEventListener('triggerPlayButton', handleAutoExecution);
    window.addEventListener('autoExecute', handleAutoExecution);

    return () => {
      window.removeEventListener('triggerExecution', handleAutoExecution);
      window.removeEventListener('triggerPlayButton', handleAutoExecution);
      window.removeEventListener('autoExecute', handleAutoExecution);
    };
  }, [id, inputData, isProcessing, apiConfig, selectedModel, processVectorization]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('deleteNode', { detail: { id } }));
  }, [id]);

  const handleInteractionEvent = useCallback((e) => {
    e.stopPropagation();
  }, []);

  // **VECTOR STATISTICS**
  const vectorStats = useMemo(() => {
    if (!vectorizedData) return null;

    const totalFiles = vectorizedData.vectorizedFiles.length;
    const totalVectors = vectorizedData.totalVectors;
    const avgVectorsPerFile = totalFiles > 0 ? (totalVectors / totalFiles).toFixed(1) : 0;
    const embeddingDimensions = vectorizedData.vectorizationConfig.embeddingDimensions;

    return {
      totalFiles,
      totalVectors,
      avgVectorsPerFile,
      embeddingDimensions,
      model: vectorizedData.vectorizationConfig.model
    };
  }, [vectorizedData]);

  // **AVAILABLE EMBEDDING MODELS**
  const embeddingModels = useMemo(() => {
    if (!apiConfig || !apiConfig.availableModels) return [];

    return apiConfig.availableModels.filter(model =>
      model.id.includes('embedding') ||
      model.id.includes('embed') ||
      model.id === 'text-embedding-ada-002' ||
      model.id === 'alias-embeddings' ||
      model.id.includes('gritlm')
    );
  }, [apiConfig]);

  return (
    <motion.div
      className={`relative w-96 bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50 border-2 border-purple-200 rounded-xl shadow-lg group nowheel overflow-visible ${
        selected ? 'ring-2 ring-purple-300' : ''
      }`}
      style={{ minHeight: '600px' }}
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
      {/* Background Beams when processing */}
      <AnimatePresence>
        {isProcessing && (
          <BackgroundBeams className="opacity-20" />
        )}
      </AnimatePresence>

      {/* **FIXED: PlayButton positioning** */}
      <div className="absolute -top-4 -left-4 z-30">
        <PlayButton
          nodeId={id}
          nodeType="vectorize"
          onExecute={handleNodeExecution}
          disabled={isProcessing}
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

      {/* **FIXED: Input Handles - Two inputs for chunked data and API config** */}
      <Handle
        type="target"
        position={Position.Left}
        id="chunks"
        style={{
          background: 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
          width: '16px',
          height: '16px',
          border: '3px solid white',
          borderRadius: '50%',
          boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)',
          left: '-8px',
          top: '40%'
        }}
        isConnectable={isConnectable}
      />

      <Handle
        type="target"
        position={Position.Left}
        id="apiConfig"
        style={{
          background: 'linear-gradient(45deg, #06b6d4, #0891b2)',
          width: '16px',
          height: '16px',
          border: '3px solid white',
          borderRadius: '50%',
          boxShadow: '0 2px 8px rgba(6, 182, 212, 0.4)',
          left: '-8px',
          top: '60%'
        }}
        isConnectable={isConnectable}
      />

      <div className="p-4 pt-8 nowheel">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-4">
          <FloatingIcon isProcessing={isProcessing}>
            <span className="text-xl">🔮</span>
          </FloatingIcon>
          <h3 className="text-sm font-semibold text-purple-800">
            Vector Embeddings
          </h3>
        </div>

        {/* Connection Status */}
        <div className="mb-4 space-y-2">
          <div
            className={`text-xs px-3 py-2 rounded-full inline-block transition-all duration-300 ${
              inputData
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-purple-50 text-purple-600 border border-purple-200'
            }`}
          >
            {inputData ? '🧩 Chunks Connected' : '⏸️ Waiting for chunks'}
          </div>

          <div
            className={`text-xs px-3 py-2 rounded-full inline-block transition-all duration-300 ${
              apiConfig
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-cyan-50 text-cyan-600 border border-cyan-200'
            }`}
          >
            {apiConfig ? '🔑 API Connected' : '⏸️ Waiting for API config'}
          </div>
        </div>

        {/* Model Selection */}
        {apiConfig && embeddingModels.length > 0 && (
          <div className="mb-4">
            <label className="text-xs font-medium text-purple-700 mb-2 block">
              🤖 Embedding Model
            </label>
            <motion.select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              onMouseDown={handleInteractionEvent}
              className="w-full p-2 text-xs border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gradient-to-r from-purple-50 to-violet-50 text-purple-800 nodrag"
              whileFocus={{ scale: 1.01 }}
            >
              <option value="">Select embedding model...</option>
              {embeddingModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.id} {model.owned_by ? `(${model.owned_by})` : ''}
                </option>
              ))}
            </motion.select>
            <div className="text-xs text-purple-600 mt-1">
              {embeddingModels.length} embedding models available
            </div>
          </div>
        )}

        {/* Batch Size Control */}
        <div className="mb-4">
          <label className="text-xs font-medium text-purple-700 mb-2 block">
            📦 Batch Size: {batchSize} chunks
          </label>
          <motion.input
            type="range"
            min="1"
            max="50"
            step="1"
            value={batchSize}
            onChange={(e) => setBatchSize(parseInt(e.target.value))}
            onMouseDown={handleInteractionEvent}
            className="w-full accent-purple-500 nodrag nowheel"
            whileHover={{ scale: 1.01 }}
          />
          <div className="flex justify-between text-xs text-purple-600 mt-1">
            <span>Sequential (1)</span>
            <span>Recommended: 5-15</span>
            <span>Fast (50)</span>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="mb-4">
          <motion.label
            className="flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 text-violet-700 border border-violet-200 nodrag"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <motion.input
              type="checkbox"
              checked={preserveMetadata}
              onChange={(e) => setPreserveMetadata(e.target.checked)}
              onMouseDown={handleInteractionEvent}
              className="w-3 h-3 text-violet-600 rounded focus:ring-violet-500 nodrag"
              whileHover={{ scale: 1.1 }}
            />
            <span>📊 Preserve Chunk Metadata</span>
          </motion.label>
        </div>

        {/* Vectorize Button */}
        <motion.button
          ref={vectorizeButtonRef}
          onClick={processVectorization}
          onMouseDown={handleInteractionEvent}
          disabled={isProcessing || !inputData || !apiConfig || !selectedModel}
          className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 mb-3 nodrag ${
            isProcessing || !inputData || !apiConfig || !selectedModel
              ? 'bg-purple-200 text-purple-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white shadow-lg'
          }`}
          whileHover={{
            scale: isProcessing || !inputData || !apiConfig || !selectedModel ? 1 : 1.02,
            boxShadow: isProcessing || !inputData || !apiConfig || !selectedModel ? undefined : "0 8px 20px rgba(139, 92, 246, 0.3)"
          }}
          whileTap={{ scale: isProcessing || !inputData || !apiConfig || !selectedModel ? 1 : 0.98 }}
        >
          <div className="flex items-center justify-center space-x-2">
            {isProcessing ? (
              <>
                <motion.div
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span>Creating Vectors...</span>
              </>
            ) : (
              <>
                <span>🔮</span>
                <span>Generate Embeddings</span>
              </>
            )}
          </div>
        </motion.button>

        {/* **DEBUG INFO - TEMPORARY** */}
        {(!inputData || !apiConfig) && (
          <div className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
            <div className="font-medium text-yellow-800 mb-1">🐛 Debug Info</div>
            <div>Connected edges: {getEdges().filter(e => e.target === id).length}</div>
            <div>Check attempts: {dataCheckCounter}</div>
            <div>Has chunks: {inputData ? 'Yes' : 'No'}</div>
            <div>Has API config: {apiConfig ? 'Yes' : 'No'}</div>
            <div>Selected model: {selectedModel || 'None'}</div>
          </div>
        )}

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

        {/* Vectorization Results */}
        <AnimatePresence>
          {vectorizedData && vectorStats && (
            <motion.div
              className="text-xs bg-white border border-purple-200 rounded-lg overflow-hidden shadow-lg nowheel"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onMouseDown={handleInteractionEvent}
            >
              <motion.div
                className="bg-gradient-to-r from-purple-50 to-violet-50 p-3 cursor-pointer hover:from-purple-100 hover:to-violet-100 transition-all duration-300 nodrag"
                onClick={() => setIsExpanded(!isExpanded)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-purple-800">
                    ✅ Vectorization Complete
                  </div>
                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="text-purple-600"
                  >
                    ▼
                  </motion.span>
                </div>
                <div className="text-purple-700 text-xs mt-1">
                  {vectorStats.totalFiles} files → {vectorStats.totalVectors} vectors ({vectorStats.embeddingDimensions}D)
                </div>
              </motion.div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className="max-h-64 overflow-y-auto bg-white p-2 nowheel"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    onMouseDown={handleInteractionEvent}
                  >
                    {/* Vector Statistics */}
                    <div className="mb-3">
                      <div className="font-medium text-purple-700 mb-1">📊 Vector Statistics</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-purple-600">Model:</span>
                          <span className="text-purple-500 bg-purple-100 px-1 rounded">{vectorStats.model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-600">Dimensions:</span>
                          <span className="text-purple-500 bg-purple-100 px-1 rounded">{vectorStats.embeddingDimensions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-purple-600">Avg vectors/file:</span>
                          <span className="text-purple-500 bg-purple-100 px-1 rounded">{vectorStats.avgVectorsPerFile}</span>
                        </div>
                      </div>
                    </div>

                    {/* File Details */}
                    <div>
                      <div className="font-medium text-purple-700 mb-1">📄 Vectorized Files</div>
                      {vectorizedData.vectorizedFiles.slice(0, 10).map((file, index) => (
                        <motion.div
                          key={index}
                          className="flex items-center space-x-2 py-1 hover:bg-purple-50 rounded transition-colors"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          whileHover={{ scale: 1.01, x: 4 }}
                        >
                          <span className="text-sm">🔮</span>
                          <span className="text-xs text-purple-700 flex-1 truncate">{file.originalFile.name}</span>
                          <span className="text-xs text-purple-500 bg-purple-100 px-1 rounded">
                            {file.vectorCount} vectors
                          </span>
                        </motion.div>
                      ))}
                      {vectorizedData.vectorizedFiles.length > 10 && (
                        <div className="text-xs text-purple-500 text-center py-1">
                          ...and {vectorizedData.vectorizedFiles.length - 10} more files
                        </div>
                      )}
                    </div>
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
          background: 'linear-gradient(45deg, #10b981, #3b82f6)',
          width: '16px',
          height: '16px',
          border: '3px solid white',
          borderRadius: '50%',
          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
          right: '-8px'
        }}
        isConnectable={isConnectable}
      />
    </motion.div>
  );
};

export default VectorizeNode;
