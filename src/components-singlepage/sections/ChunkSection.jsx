// components-singlepage/sections/ChunkSection.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { usePipeline } from '../../contexts/PipelineContext';

const ChunkSection = () => {
  const { state, dispatch } = usePipeline();
  const { git, filter, chunk } = state;

  const [localState, setLocalState] = useState({
    isProcessing: false,
    error: null,
    previewChunks: [],
    processingProgress: 0
  });

  const [settings, setSettings] = useState({
    chunkMethod: chunk.chunkMethod || 'character',
    chunkSize: chunk.chunkSize || 1000,
    overlap: chunk.overlap || 200,
    preserveStructure: chunk.preserveStructure || true,
    respectBoundaries: chunk.respectBoundaries || true,
    customSeparators: chunk.customSeparators || ['\n\n', '\n', '. ', '! ', '? ']
  });

  // Calculate estimated chunks and stats
  const estimatedStats = useMemo(() => {
    if (!filter.filteredFiles || filter.filteredFiles.length === 0) {
      return { totalChunks: 0, avgChunkSize: 0, totalTokens: 0, processingTime: 0 };
    }

    const totalSize = filter.filteredFiles.reduce((sum, file) => sum + (file.size || 0), 0);
    const estimatedChunks = Math.ceil(totalSize / settings.chunkSize);
    const estimatedTokens = Math.ceil(totalSize / 4); // Rough estimate: 4 chars per token
    const processingTime = Math.ceil(filter.filteredFiles.length * 0.1); // 100ms per file

    return {
      totalChunks: estimatedChunks,
      avgChunkSize: settings.chunkSize,
      totalTokens: estimatedTokens,
      processingTime: processingTime
    };
  }, [filter.filteredFiles, settings.chunkSize]);

  // Update pipeline context when settings change
  useEffect(() => {
    dispatch({
      type: 'UPDATE_CHUNK',
      payload: settings
    });
  }, [settings, dispatch]);

  const chunkMethods = [
    {
      id: 'character',
      name: 'Character-based',
      description: 'Split text by character count (recommended)',
      icon: '📝',
      recommended: true
    },
    {
      id: 'token',
      name: 'Token-based',
      description: 'Split by token count (more accurate for LLMs)',
      icon: '🔤',
      recommended: false
    },
    {
      id: 'sentence',
      name: 'Sentence-based',
      description: 'Split at sentence boundaries',
      icon: '📄',
      recommended: false
    },
    {
      id: 'semantic',
      name: 'Semantic',
      description: 'Split based on semantic similarity',
      icon: '🧠',
      recommended: false
    }
  ];

  // Fetch file contents and process chunks
  const processFiles = async () => {
    if (!filter.filteredFiles || filter.filteredFiles.length === 0) {
      setLocalState(prev => ({ ...prev, error: 'No files to process. Please complete file filtering first.' }));
      return;
    }

    setLocalState(prev => ({ ...prev, isProcessing: true, error: null, processingProgress: 0 }));

    try {
      const processedChunks = [];
      const totalFiles = filter.filteredFiles.length;

      for (let i = 0; i < totalFiles; i++) {
        const file = filter.filteredFiles[i];

        // Update progress
        setLocalState(prev => ({
          ...prev,
          processingProgress: Math.round((i / totalFiles) * 100)
        }));

        try {
          // Fetch file content from GitHub API
          const content = await fetchFileContent(file);

          if (content) {
            // Process the content into chunks
            const chunks = await chunkText(content, file, settings);
            processedChunks.push(...chunks);
          }
        } catch (error) {
          console.error(`Error processing file ${file.path}:`, error);
          // Continue with other files
        }

        // Small delay to prevent API rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update pipeline context with processed chunks
      dispatch({
        type: 'UPDATE_CHUNK',
        payload: {
          ...settings,
          processedChunks: processedChunks
        }
      });

      setLocalState(prev => ({
        ...prev,
        isProcessing: false,
        processingProgress: 100,
        previewChunks: processedChunks.slice(0, 5) // Show first 5 chunks as preview
      }));

    } catch (error) {
      setLocalState(prev => ({
        ...prev,
        isProcessing: false,
        error: error.message
      }));
    }
  };

  // Fetch file content from GitHub API
  const fetchFileContent = async (file) => {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'RAG-Node-React'
    };

    if (git.token) {
      headers['Authorization'] = `token ${git.token}`;
    }

    const response = await fetch(
      `https://api.github.com/repos/${git.owner}/${git.repo}/contents${file.path}?ref=${git.branch}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch ${file.path}: ${response.status}`);
    }

    const data = await response.json();

    // Decode base64 content
    if (data.content) {
      return atob(data.content);
    }

    return null;
  };

  // Chunk text based on method
  const chunkText = async (content, file, chunkSettings) => {
    const chunks = [];
    let chunkId = 1;

    switch (chunkSettings.chunkMethod) {
      case 'character':
        return characterBasedChunking(content, file, chunkSettings);
      case 'token':
        return tokenBasedChunking(content, file, chunkSettings);
      case 'sentence':
        return sentenceBasedChunking(content, file, chunkSettings);
      case 'semantic':
        return semanticChunking(content, file, chunkSettings);
      default:
        return characterBasedChunking(content, file, chunkSettings);
    }
  };

  // Character-based chunking (similar to your existing ChunkNode)
  const characterBasedChunking = (content, file, chunkSettings) => {
    const chunks = [];
    const { chunkSize, overlap, customSeparators, respectBoundaries } = chunkSettings;

    if (respectBoundaries) {
      // Use separators for better boundaries
      return recursiveCharacterSplit(content, file, chunkSize, overlap, customSeparators);
    } else {
      // Simple character splitting
      for (let i = 0; i < content.length; i += chunkSize - overlap) {
        const chunk = content.slice(i, i + chunkSize);
        if (chunk.trim()) {
          chunks.push({
            id: `${file.path}_chunk_${chunks.length + 1}`,
            content: chunk,
            metadata: {
              source: file.path,
              chunkIndex: chunks.length,
              startChar: i,
              endChar: i + chunk.length,
              size: chunk.length,
              method: 'character'
            }
          });
        }
      }
    }

    return chunks;
  };

  // Recursive character splitting (like LangChain)
  const recursiveCharacterSplit = (content, file, chunkSize, overlap, separators) => {
    const chunks = [];

    const splitText = (text, sepIndex = 0) => {
      if (text.length <= chunkSize) {
        return [text];
      }

      if (sepIndex >= separators.length) {
        // No more separators, do character split
        const result = [];
        for (let i = 0; i < text.length; i += chunkSize - overlap) {
          result.push(text.slice(i, i + chunkSize));
        }
        return result;
      }

      const separator = separators[sepIndex];
      const parts = text.split(separator);
      const result = [];
      let currentChunk = '';

      for (const part of parts) {
        const testChunk = currentChunk + (currentChunk ? separator : '') + part;

        if (testChunk.length <= chunkSize) {
          currentChunk = testChunk;
        } else {
          if (currentChunk) {
            result.push(currentChunk);
            currentChunk = part;
          } else {
            // Part is too large, split with next separator
            result.push(...splitText(part, sepIndex + 1));
          }
        }
      }

      if (currentChunk) {
        result.push(currentChunk);
      }

      return result;
    };

    const textChunks = splitText(content);

    textChunks.forEach((chunk, index) => {
      if (chunk.trim()) {
        chunks.push({
          id: `${file.path}_chunk_${index + 1}`,
          content: chunk.trim(),
          metadata: {
            source: file.path,
            chunkIndex: index,
            size: chunk.length,
            method: 'recursive_character'
          }
        });
      }
    });

    return chunks;
  };

  // Token-based chunking (simplified)
  const tokenBasedChunking = (content, file, chunkSettings) => {
    // Simplified token estimation: ~4 characters per token
    const estimatedTokens = content.length / 4;
    const tokenChunkSize = chunkSettings.chunkSize;
    const charChunkSize = tokenChunkSize * 4;

    return characterBasedChunking(content, file, {
      ...chunkSettings,
      chunkSize: charChunkSize
    });
  };

  // Sentence-based chunking
  const sentenceBasedChunking = (content, file, chunkSettings) => {
    const sentences = content.match(/[^\.!?]+[\.!?]+/g) || [content];
    const chunks = [];
    let currentChunk = '';

    sentences.forEach((sentence, index) => {
      const testChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;

      if (testChunk.length <= chunkSettings.chunkSize) {
        currentChunk = testChunk;
      } else {
        if (currentChunk) {
          chunks.push({
            id: `${file.path}_chunk_${chunks.length + 1}`,
            content: currentChunk.trim(),
            metadata: {
              source: file.path,
              chunkIndex: chunks.length,
              size: currentChunk.length,
              method: 'sentence'
            }
          });
        }
        currentChunk = sentence;
      }
    });

    if (currentChunk) {
      chunks.push({
        id: `${file.path}_chunk_${chunks.length + 1}`,
        content: currentChunk.trim(),
        metadata: {
          source: file.path,
          chunkIndex: chunks.length,
          size: currentChunk.length,
          method: 'sentence'
        }
      });
    }

    return chunks;
  };

  // Semantic chunking (placeholder - would need embedding model)
  const semanticChunking = (content, file, chunkSettings) => {
    // For now, fall back to sentence-based chunking
    // In a real implementation, you'd use embeddings to group semantically similar content
    return sentenceBasedChunking(content, file, chunkSettings);
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!filter.filteredFiles || filter.filteredFiles.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Text Processing & Chunking</h1>
          <p className="text-gray-600">Configure how your documents are split into manageable chunks for processing.</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-amber-500">⚠️</span>
            <span className="text-amber-700 font-medium">No Files to Process</span>
          </div>
          <p className="text-amber-700 text-sm mt-1">
            Please complete file filtering first to select files for chunking.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Text Processing & Chunking</h1>
        <p className="text-gray-600">Configure how your {filter.filteredFiles.length} selected files are split into manageable chunks.</p>
      </div>

      {/* Input Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">📁 Input Files</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-blue-600 font-medium">Total Files</div>
            <div className="text-blue-800">{filter.filteredFiles.length}</div>
          </div>
          <div>
            <div className="text-blue-600 font-medium">File Formats</div>
            <div className="text-blue-800">{filter.selectedFormats?.size || 0}</div>
          </div>
          <div>
            <div className="text-blue-600 font-medium">Total Size</div>
            <div className="text-blue-800">
              {(filter.filteredFiles.reduce((sum, f) => sum + (f.size || 0), 0) / 1024).toFixed(1)} KB
            </div>
          </div>
          <div>
            <div className="text-blue-600 font-medium">Repository</div>
            <div className="text-blue-800">{git.owner}/{git.repo}</div>
          </div>
        </div>
      </div>

      {/* Chunking Method Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Chunking Method</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {chunkMethods.map((method) => (
            <button
              key={method.id}
              onClick={() => updateSetting('chunkMethod', method.id)}
              className={`p-4 rounded-lg border text-left transition-all ${
                settings.chunkMethod === method.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start space-x-3">
                <span className="text-2xl">{method.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-gray-800">{method.name}</h3>
                    {method.recommended && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{method.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chunk Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Chunk Configuration</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chunk Size ({settings.chunkMethod === 'token' ? 'tokens' : 'characters'})
            </label>
            <input
              type="number"
              value={settings.chunkSize}
              onChange={(e) => updateSetting('chunkSize', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="100"
              max="4000"
            />
            <div className="mt-1 text-xs text-gray-500">
              Recommended: 1000-1500 characters or 250-400 tokens
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overlap ({settings.chunkMethod === 'token' ? 'tokens' : 'characters'})
            </label>
            <input
              type="number"
              value={settings.overlap}
              onChange={(e) => updateSetting('overlap', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              max={Math.floor(settings.chunkSize * 0.5)}
            />
            <div className="mt-1 text-xs text-gray-500">
              Overlap between chunks to maintain context
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.preserveStructure}
              onChange={(e) => updateSetting('preserveStructure', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Preserve document structure (headers, lists, etc.)</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.respectBoundaries}
              onChange={(e) => updateSetting('respectBoundaries', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Respect word/sentence boundaries</span>
          </label>
        </div>
      </div>

      {/* Processing Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Processing</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 p-3 rounded border">
            <div className="text-sm text-gray-600">Estimated Chunks</div>
            <div className="text-lg font-semibold text-gray-800">{estimatedStats.totalChunks}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded border">
            <div className="text-sm text-gray-600">Avg Chunk Size</div>
            <div className="text-lg font-semibold text-gray-800">{estimatedStats.avgChunkSize}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded border">
            <div className="text-sm text-gray-600">Est. Tokens</div>
            <div className="text-lg font-semibold text-gray-800">{estimatedStats.totalTokens.toLocaleString()}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded border">
            <div className="text-sm text-gray-600">Processing Time</div>
            <div className="text-lg font-semibold text-gray-800">{estimatedStats.processingTime}s</div>
          </div>
        </div>

        {localState.isProcessing && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Processing files...</span>
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

        {localState.error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <span className="text-red-500">❌</span>
              <span className="text-red-700 text-sm">{localState.error}</span>
            </div>
          </div>
        )}

        <button
          onClick={processFiles}
          disabled={localState.isProcessing}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {localState.isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
              Processing Files...
            </>
          ) : (
            '🔄 Process Files into Chunks'
          )}
        </button>
      </div>

      {/* Preview Chunks */}
      {localState.previewChunks.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Chunk Preview</h2>
            <p className="text-sm text-gray-600">Showing first 5 chunks from {chunk.processedChunks?.length || 0} total chunks</p>
          </div>

          <div className="max-h-96 overflow-y-auto p-4 space-y-3">
            {localState.previewChunks.map((chunkItem, index) => (
              <div key={chunkItem.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Chunk {index + 1} • {chunkItem.metadata.source}
                  </span>
                  <span className="text-xs text-gray-500">
                    {chunkItem.metadata.size} chars
                  </span>
                </div>
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">
                  {chunkItem.content.substring(0, 200)}
                  {chunkItem.content.length > 200 && '...'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Summary */}
      {chunk.processedChunks && chunk.processedChunks.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">✅ Processing Complete</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-green-600 font-medium">Total Chunks</div>
              <div className="text-green-800">{chunk.processedChunks.length}</div>
            </div>
            <div>
              <div className="text-green-600 font-medium">Method</div>
              <div className="text-green-800 capitalize">{settings.chunkMethod}</div>
            </div>
            <div>
              <div className="text-green-600 font-medium">Avg Size</div>
              <div className="text-green-800">{settings.chunkSize} chars</div>
            </div>
            <div>
              <div className="text-green-600 font-medium">Next Step</div>
              <div className="text-green-800">Vectorization</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
        <h3 className="font-semibold text-amber-800 mb-2">💡 Chunking Best Practices</h3>
        <ul className="text-amber-700 text-sm space-y-1">
          <li>• Use 1000-1500 characters for general text processing</li>
          <li>• Add 10-20% overlap to maintain context between chunks</li>
          <li>• Preserve document structure for better semantic understanding</li>
          <li>• Consider your target LLM's context window when sizing chunks</li>
        </ul>
      </div>
    </div>
  );
};

export default ChunkSection;
