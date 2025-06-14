import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Handle, Position, useReactFlow } from '@xyflow/react';

const BackgroundBeams = ({ className }) => (
  <div className={`absolute inset-0 overflow-hidden ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-green-50/20 via-blue-50/20 to-purple-50/20" />
    <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-green-200/30 to-transparent" />
    <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-200/30 to-transparent" />
  </div>
);

const ChunkNode = ({ id, data, selected }) => {
  const { updateNodeData, getNodes, getEdges } = useReactFlow();

  // State management
  const [showSettings, setShowSettings] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectedInputData, setConnectedInputData] = useState(null);
  const [processedChunks, setProcessedChunks] = useState([]);

  // Chunking settings
  const [settings, setSettings] = useState({
    chunkSize: data.chunkSize || 1000,
    chunkOverlap: data.chunkOverlap || 200,
    chunkMethod: data.chunkMethod || 'recursive',
    preserveStructure: data.preserveStructure !== false,
    minChunkSize: data.minChunkSize || 100,
    maxChunkSize: data.maxChunkSize || 4000,
    separators: data.separators || ['\n\n', '\n', '. ', ' ', ''],
    manualText: data.manualText || '',
    useInputData: data.useInputData !== false,
    respectSentences: data.respectSentences !== false,
    respectParagraphs: data.respectParagraphs !== false,
    addMetadata: data.addMetadata !== false,
  });

  const [stats, setStats] = useState({
    totalChunks: 0,
    averageChunkSize: 0,
    processingTime: 0,
    lastProcessed: null,
    sourceLength: 0,
  });

  // Get input data from connected nodes (ParseNode, FilterNode, GitNode, etc.)
  const getInputData = useCallback(() => {
    try {
      const edges = getEdges();
      const nodes = getNodes();

      console.log('🔍 ChunkNode looking for input data...');

      const inputEdge = edges.find(edge =>
        edge.target === id && edge.targetHandle === 'input'
      );

      if (inputEdge) {
        const inputNode = nodes.find(node => node.id === inputEdge.source);

        if (inputNode && inputNode.data) {
          console.log('✅ Found input node:', inputNode);

          let inputData = {
            content: '',
            metadata: {},
            nodeType: inputNode.type
          };

          switch (inputNode.type) {
            case 'parseNode':
              // FIXED: Try all possible field names for ParseNode compatibility
              inputData.content = inputNode.data.parsedContent ||
                                 inputNode.data.content ||
                                 inputNode.data.text ||
                                 inputNode.data.extractedText ||
                                 inputNode.data.fileContent ||
                                 inputNode.data.output ||
                                 '';
              inputData.metadata = {
                source: 'parse_node',
                files: inputNode.data.files || inputNode.data.processedFiles || [],
                parseMethod: inputNode.data.parseMethod || 'unknown',
                totalFiles: inputNode.data.stats?.parsedFiles || 0,
                originalSize: inputNode.data.stats?.totalSize || 0
              };
              break;

            case 'filterNode':
              inputData.content = inputNode.data.filteredContent ||
                                 inputNode.data.content ||
                                 inputNode.data.text ||
                                 '';
              inputData.metadata = {
                source: 'filter_node',
                filteredFiles: inputNode.data.filteredFiles || [],
                totalFiltered: inputNode.data.stats?.filteredFiles || 0
              };
              break;

            case 'gitNode':
              inputData.content = inputNode.data.repositoryContent ||
                                 inputNode.data.content ||
                                 inputNode.data.text ||
                                 '';
              inputData.metadata = {
                source: 'git_node',
                repository: inputNode.data.repository || '',
                branch: inputNode.data.branch || 'main',
                totalFiles: inputNode.data.stats?.fetchedFiles || 0
              };
              break;

            case 'textNode':
              inputData.content = inputNode.data.text ||
                                 inputNode.data.content ||
                                 '';
              inputData.metadata = {
                source: 'text_node'
              };
              break;

            default:
              // Enhanced generic fallback
              inputData.content = inputNode.data.content ||
                                 inputNode.data.text ||
                                 inputNode.data.output ||
                                 inputNode.data.result ||
                                 '';
              inputData.metadata = {
                source: inputNode.type || 'unknown'
              };
          }

          console.log('✅ Extracted input data:', inputData);
          console.log('📄 Content length:', inputData.content.length);

          setConnectedInputData(inputData);
          return inputData;
        }
      }

      console.log('❌ No input data found');
      setConnectedInputData(null);
      return { content: '', metadata: {}, nodeType: null };
    } catch (error) {
      console.error('❌ Error getting input data:', error);
      setConnectedInputData(null);
      return { content: '', metadata: {}, nodeType: null };
    }
  }, [id, getNodes, getEdges]);

  // Monitor for input data changes
  useEffect(() => {
    const interval = setInterval(() => {
      getInputData();
    }, 2000);

    return () => clearInterval(interval);
  }, [getInputData]);

  // Update node data when settings or chunks change
  useEffect(() => {
    // Store data in multiple formats for VectorizeNode compatibility
    updateNodeData(id, {
      ...settings,
      stats,
      connectedInputData,

      // Primary chunk data
      processedChunks: processedChunks,

      // Alternative field names for VectorizeNode compatibility
      chunks: processedChunks,
      textChunks: processedChunks,
      outputChunks: processedChunks,

      // Metadata for downstream nodes
      chunkSettings: {
        chunkSize: settings.chunkSize,
        chunkMethod: settings.chunkMethod,
        chunkOverlap: settings.chunkOverlap,
      },

      lastUpdated: Date.now()
    });
  }, [settings, stats, connectedInputData, processedChunks, id, updateNodeData]);

  // Handle setting changes
  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
  };

  // Enhanced chunking algorithms
  const chunkByRecursive = (text, chunkSize, overlap, separators) => {
    const chunks = [];
    let currentChunk = '';

    // Split by separators in order of preference
    let segments = [text];
    for (const separator of separators) {
      const newSegments = [];
      for (const segment of segments) {
        if (segment.length <= chunkSize) {
          newSegments.push(segment);
        } else {
          newSegments.push(...segment.split(separator));
        }
      }
      segments = newSegments;
    }

    for (const segment of segments) {
      if ((currentChunk + segment).length <= chunkSize) {
        currentChunk += (currentChunk ? ' ' : '') + segment;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          // Add overlap
          const words = currentChunk.split(' ');
          const overlapWords = Math.floor(words.length * (overlap / chunkSize));
          currentChunk = words.slice(-overlapWords).join(' ');
        }
        currentChunk += (currentChunk ? ' ' : '') + segment;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  };

  const chunkByCharacter = (text, chunkSize, overlap) => {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      const chunk = text.slice(i, i + chunkSize);
      if (chunk.trim()) {
        chunks.push(chunk.trim());
      }
    }
    return chunks;
  };

  const chunkByToken = (text, chunkSize, overlap) => {
    const tokens = text.split(/\s+/).filter(token => token.length > 0);
    const chunks = [];

    for (let i = 0; i < tokens.length; i += chunkSize - overlap) {
      const chunk = tokens.slice(i, i + chunkSize).join(' ');
      if (chunk.trim()) {
        chunks.push(chunk.trim());
      }
    }

    return chunks;
  };

  const chunkBySemantic = (text, chunkSize, overlap) => {
    const chunks = [];
    let currentChunk = '';

    // First try paragraphs
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());

    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length <= chunkSize) {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          // Semantic overlap - keep last sentence
          const sentences = currentChunk.split(/[.!?]+/).filter(s => s.trim());
          currentChunk = sentences[sentences.length - 1] || '';
        }

        // If paragraph is too large, split by sentences
        if (paragraph.length > chunkSize) {
          const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim());
          let sentenceChunk = '';

          for (const sentence of sentences) {
            if ((sentenceChunk + sentence).length <= chunkSize) {
              sentenceChunk += (sentenceChunk ? '. ' : '') + sentence;
            } else {
              if (sentenceChunk) {
                chunks.push(sentenceChunk.trim());
              }
              sentenceChunk = sentence;
            }
          }

          if (sentenceChunk.trim()) {
            currentChunk = sentenceChunk.trim();
          }
        } else {
          currentChunk = paragraph;
        }
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  };

  const chunkByStructure = (text, chunkSize, overlap) => {
    // Respect both sentences and paragraphs
    const chunks = [];
    let currentChunk = '';

    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());

    for (const paragraph of paragraphs) {
      const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim());

      for (const sentence of sentences) {
        const sentenceWithPunctuation = sentence.trim() + '.';

        if ((currentChunk + sentenceWithPunctuation).length <= chunkSize) {
          currentChunk += (currentChunk ? ' ' : '') + sentenceWithPunctuation;
        } else {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
            // Keep last sentence for overlap
            if (settings.chunkOverlap > 0) {
              const words = currentChunk.split(' ');
              const overlapWords = Math.min(Math.floor(words.length * 0.2), 20);
              currentChunk = words.slice(-overlapWords).join(' ') + ' ';
            } else {
              currentChunk = '';
            }
          }
          currentChunk += sentenceWithPunctuation;
        }
      }

      // Add paragraph break if preserving structure
      if (settings.preserveStructure && currentChunk && !currentChunk.endsWith('\n')) {
        currentChunk += '\n';
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  };

  // Main chunking process
  const processChunking = useCallback(async () => {
    const { content: inputContent, metadata: inputMetadata } = getInputData();

    // Determine what to chunk
    let textToChunk = '';
    let sourceMetadata = {};

    console.log('🔍 Checking data sources...');
    console.log('📊 Input content length:', inputContent?.length || 0);
    console.log('📝 Manual text length:', settings.manualText?.length || 0);
    console.log('🔧 Use input data:', settings.useInputData);

    if (settings.useInputData && inputContent && inputContent.trim().length > 0) {
      console.log('✅ Using input data from connected node');
      textToChunk = inputContent;
      sourceMetadata = inputMetadata;
    } else if (settings.manualText && settings.manualText.trim().length > 0) {
      console.log('📝 Using manual text input');
      textToChunk = settings.manualText;
      sourceMetadata = { source: 'manual_input' };
    } else {
      console.error('❌ No text to chunk');
      console.log('Debug info:', {
        useInputData: settings.useInputData,
        inputContentLength: inputContent?.length || 0,
        manualTextLength: settings.manualText?.length || 0,
        inputMetadata
      });
      alert('Please connect an input node with content or enter text manually');
      return;
    }

    setIsProcessing(true);
    const startTime = Date.now();

    try {
      console.log('🚀 Starting chunking process...');
      console.log('📝 Text length:', textToChunk.length);
      console.log('🔧 Chunk method:', settings.chunkMethod);
      console.log('📏 Chunk size:', settings.chunkSize);

      let rawChunks = [];

      // Apply chunking algorithm based on method
      switch (settings.chunkMethod) {
        case 'recursive':
          rawChunks = chunkByRecursive(
            textToChunk,
            settings.chunkSize,
            settings.chunkOverlap,
            settings.separators
          );
          break;
        case 'character':
          rawChunks = chunkByCharacter(textToChunk, settings.chunkSize, settings.chunkOverlap);
          break;
        case 'token':
          rawChunks = chunkByToken(textToChunk, settings.chunkSize, settings.chunkOverlap);
          break;
        case 'semantic':
          rawChunks = chunkBySemantic(textToChunk, settings.chunkSize, settings.chunkOverlap);
          break;
        case 'structure':
          rawChunks = chunkByStructure(textToChunk, settings.chunkSize, settings.chunkOverlap);
          break;
        default:
          rawChunks = chunkByRecursive(textToChunk, settings.chunkSize, settings.chunkOverlap, settings.separators);
      }

      // Filter chunks by size constraints
      const filteredChunks = rawChunks.filter(chunk =>
        chunk.length >= settings.minChunkSize && chunk.length <= settings.maxChunkSize
      );

      // Create chunk objects with enhanced metadata
      const chunks = filteredChunks.map((chunk, index) => ({
        id: `chunk_${id}_${Date.now()}_${index}`,
        content: chunk.trim(),
        text: chunk.trim(), // Alternative field name for compatibility
        index: index,
        size: chunk.length,
        wordCount: chunk.split(/\s+/).length,
        metadata: settings.addMetadata ? {
          ...sourceMetadata,
          chunk_index: index,
          chunk_method: settings.chunkMethod,
          chunk_size: settings.chunkSize,
          chunk_overlap: settings.chunkOverlap,
          actual_size: chunk.length,
          word_count: chunk.split(/\s+/).length,
          created_at: new Date().toISOString(),
          node_id: id,
          source_length: textToChunk.length,
          total_chunks: filteredChunks.length
        } : {
          chunk_index: index,
          chunk_method: settings.chunkMethod,
          actual_size: chunk.length
        }
      }));

      const processingTime = Date.now() - startTime;
      const averageChunkSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0) / chunks.length;

      // Update stats
      const newStats = {
        totalChunks: chunks.length,
        averageChunkSize: Math.round(averageChunkSize),
        processingTime,
        lastProcessed: Date.now(),
        sourceLength: textToChunk.length,
      };

      setStats(newStats);
      setProcessedChunks(chunks);

      console.log('✅ Chunking completed successfully');
      console.log('📊 Results:', {
        totalChunks: chunks.length,
        averageSize: Math.round(averageChunkSize),
        processingTime,
        sourceLength: textToChunk.length
      });

    } catch (error) {
      console.error('❌ Chunking error:', error);
      alert(`Chunking failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [getInputData, settings, id]);

  // Export chunks
  const exportChunks = () => {
    if (processedChunks.length === 0) {
      alert('No chunks to export');
      return;
    }

    const exportData = {
      chunks: processedChunks,
      settings: settings,
      stats: stats,
      metadata: {
        total_chunks: processedChunks.length,
        chunk_method: settings.chunkMethod,
        average_size: stats.averageChunkSize,
        source_length: stats.sourceLength,
        created_at: new Date().toISOString(),
        node_id: id
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chunks-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 bg-green-400 border-2 border-white"
        style={{ top: '20px' }}
      />

      <motion.div
        className={`bg-white rounded-xl shadow-lg border-2 transition-all duration-300 overflow-hidden ${
          selected ? 'border-green-400 shadow-green-100' : 'border-gray-200'
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
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">🧩</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Universal Chunker</h3>
                <p className="text-xs text-gray-500">
                  {settings.chunkMethod} • {settings.chunkSize} chars
                  {stats.totalChunks > 0 && (
                    <span className="text-green-600"> • {stats.totalChunks} chunks</span>
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
                onClick={processChunking}
                disabled={isProcessing}
                className="w-6 h-6 flex items-center justify-center rounded bg-green-100 hover:bg-green-200 transition-colors disabled:opacity-50"
                title="Process Chunks"
              >
                {isProcessing ? '🔄' : '▶️'}
              </button>
              {processedChunks.length > 0 && (
                <button
                  onClick={exportChunks}
                  className="w-6 h-6 flex items-center justify-center rounded bg-blue-100 hover:bg-blue-200 transition-colors"
                  title="Export Chunks"
                >
                  📥
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Input Data Status */}
        <div className="relative z-10 px-4 py-2 border-b border-gray-100">
          <div className={`text-xs px-2 py-1 rounded-full text-center ${
            connectedInputData && connectedInputData.content
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {connectedInputData && connectedInputData.content
              ? `📊 ${connectedInputData.content.length} chars from ${connectedInputData.nodeType}`
              : '📝 Manual text input mode'
            }
          </div>
        </div>

        {/* Stats Display */}
        {stats.totalChunks > 0 && (
          <div className="relative z-10 px-4 py-2 bg-green-50 border-b border-green-100">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-semibold text-green-700">{stats.totalChunks}</div>
                <div className="text-green-600">Chunks</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-green-700">{stats.averageChunkSize}</div>
                <div className="text-green-600">Avg Size</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-green-700">{stats.processingTime}ms</div>
                <div className="text-green-600">Time</div>
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
                    <label className="text-sm font-medium text-gray-700">Use Input Data</label>
                    <p className="text-xs text-gray-500">Use data from connected nodes</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.useInputData}
                      onChange={(e) => handleSettingChange('useInputData', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>

                {/* Manual Text Input (only show if not using input data) */}
                {!settings.useInputData && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Manual Text Input
                    </label>
                    <textarea
                      value={settings.manualText}
                      onChange={(e) => handleSettingChange('manualText', e.target.value)}
                      placeholder="Enter text to chunk..."
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                      rows="4"
                    />
                  </div>
                )}

                {/* Chunk Method */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Chunking Method
                  </label>
                  <select
                    value={settings.chunkMethod}
                    onChange={(e) => handleSettingChange('chunkMethod', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
                  >
                    <option value="recursive">Recursive Text Splitter</option>
                    <option value="character">Character Splitter</option>
                    <option value="token">Token Splitter</option>
                    <option value="semantic">Semantic Splitter</option>
                    <option value="structure">Structure-Aware Splitter</option>
                  </select>
                </div>

                {/* Chunk Size */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Chunk Size ({settings.chunkSize} characters)
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="4000"
                    step="100"
                    value={settings.chunkSize}
                    onChange={(e) => handleSettingChange('chunkSize', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Chunk Overlap */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Chunk Overlap ({settings.chunkOverlap} characters)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="50"
                    value={settings.chunkOverlap}
                    onChange={(e) => handleSettingChange('chunkOverlap', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Size Constraints */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Min Size ({settings.minChunkSize})
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="500"
                      step="25"
                      value={settings.minChunkSize}
                      onChange={(e) => handleSettingChange('minChunkSize', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Max Size ({settings.maxChunkSize})
                    </label>
                    <input
                      type="range"
                      min="1000"
                      max="8000"
                      step="500"
                      value={settings.maxChunkSize}
                      onChange={(e) => handleSettingChange('maxChunkSize', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Advanced Options */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Preserve Structure</label>
                    <input
                      type="checkbox"
                      checked={settings.preserveStructure}
                      onChange={(e) => handleSettingChange('preserveStructure', e.target.checked)}
                      className="rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Add Metadata</label>
                    <input
                      type="checkbox"
                      checked={settings.addMetadata}
                      onChange={(e) => handleSettingChange('addMetadata', e.target.checked)}
                      className="rounded"
                    />
                  </div>
                </div>

                {/* Custom Separators (for recursive method) */}
                {settings.chunkMethod === 'recursive' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Custom Separators (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={settings.separators.join(', ')}
                      onChange={(e) => handleSettingChange('separators', e.target.value.split(', '))}
                      placeholder="\\n\\n, \\n, . , , ''"
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="relative z-10 p-4">
            <div className="flex items-center justify-center space-x-2 text-sm text-green-600">
              <div className="animate-spin w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full"></div>
              <span>Processing chunks...</span>
            </div>
          </div>
        )}

        {/* Chunk Preview */}
        {processedChunks.length > 0 && (
          <div className="relative z-10 p-4 border-t border-gray-100">
            <h4 className="text-xs font-medium text-gray-700 mb-2">Chunk Preview</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {processedChunks.slice(0, 3).map((chunk, index) => (
                <div key={index} className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                  <div className="font-medium">
                    Chunk {index + 1} ({chunk.size} chars, {chunk.wordCount} words)
                  </div>
                  <div className="truncate">{chunk.content}</div>
                </div>
              ))}
              {processedChunks.length > 3 && (
                <div className="text-xs text-gray-500 text-center">
                  +{processedChunks.length - 3} more chunks
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ChunkNode;
