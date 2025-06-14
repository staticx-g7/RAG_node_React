import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Handle, Position, useReactFlow } from '@xyflow/react';

const BackgroundBeams = ({ className }) => (
  <div className={`absolute inset-0 overflow-hidden ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-slate-50/20 via-stone-50/20 to-gray-50/20" />
    <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-slate-200/30 to-transparent" />
    <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-stone-200/30 to-transparent" />
  </div>
);

const ParseNode = ({ id, data, selected }) => {
  const { updateNodeData, getNodes, getEdges } = useReactFlow();

  // State management
  const [showSettings, setShowSettings] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectedInputData, setConnectedInputData] = useState(null);
  const [parsedContent, setParsedContent] = useState('');
  const [processedFiles, setProcessedFiles] = useState([]);

  // Parsing settings
  const [settings, setSettings] = useState({
    parseMethod: data.parseMethod || 'auto',
    includeMetadata: data.includeMetadata !== false,
    preserveFormatting: data.preserveFormatting !== false,
    extractImages: data.extractImages || false,
    extractTables: data.extractTables !== false,
    maxFileSize: data.maxFileSize || 10, // MB
    supportedFormats: data.supportedFormats || ['txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'py', 'json', 'xml', 'html', 'css', 'yaml'],
    useInputData: data.useInputData !== false,
    manualFiles: data.manualFiles || [],
    contentSeparator: data.contentSeparator || '\n\n',
    removeEmptyLines: data.removeEmptyLines !== false,
    normalizeWhitespace: data.normalizeWhitespace !== false,
  });

  const [stats, setStats] = useState({
    totalFiles: 0,
    parsedFiles: 0,
    totalSize: 0,
    processingTime: 0,
    lastProcessed: null,
    errors: 0,
    contentLength: 0,
  });

  // Get input data from connected nodes (FilterNode, GitNode, etc.)
  const getInputData = useCallback(() => {
    try {
      const edges = getEdges();
      const nodes = getNodes();

      console.log('🔍 ParseNode looking for input data...');

      const inputEdge = edges.find(edge =>
        edge.target === id && edge.targetHandle === 'input'
      );

      if (inputEdge) {
        const inputNode = nodes.find(node => node.id === inputEdge.source);

        if (inputNode && inputNode.data) {
          console.log('✅ Found input node:', inputNode);

          let inputData = {
            files: [],
            metadata: {},
            nodeType: inputNode.type
          };

          switch (inputNode.type) {
            case 'filterNode':
              // FIXED: Try multiple field names for FilterNode compatibility
              inputData.files = inputNode.data.filteredFiles ||
                                inputNode.data.files ||
                                inputNode.data.selectedFiles ||
                                inputNode.data.output ||
                                [];
              inputData.metadata = {
                source: 'filter_node',
                filterCriteria: inputNode.data.filterCriteria || {},
                totalFiltered: inputNode.data.totalFiltered || inputData.files.length,
                originalTotal: inputNode.data.stats?.totalFiles || 0
              };
              break;

            case 'gitNode':
              inputData.files = inputNode.data.files ||
                                inputNode.data.repositoryFiles ||
                                inputNode.data.fetchedFiles ||
                                [];

              // If no files array but has content, create virtual file
              if (inputData.files.length === 0 && (inputNode.data.content || inputNode.data.repositoryContent)) {
                const content = inputNode.data.content || inputNode.data.repositoryContent;
                inputData.files = [{
                  name: 'repository_content.txt',
                  filename: 'repository_content.txt',
                  content: content,
                  text: content,
                  path: 'repository_content.txt',
                  type: 'text/plain',
                  size: content.length,
                  extension: 'txt'
                }];
              }

              inputData.metadata = {
                source: 'git_node',
                repository: inputNode.data.repository || '',
                branch: inputNode.data.branch || 'main',
                totalFiles: inputNode.data.stats?.fetchedFiles || 0
              };
              break;

            case 'textNode':
              if (inputNode.data.text || inputNode.data.content) {
                const content = inputNode.data.text || inputNode.data.content;
                inputData.files = [{
                  name: 'text_input.txt',
                  filename: 'text_input.txt',
                  content: content,
                  text: content,
                  path: 'text_input.txt',
                  type: 'text/plain',
                  size: content.length,
                  extension: 'txt'
                }];
              }
              inputData.metadata = {
                source: 'text_node'
              };
              break;

            default:
              // Enhanced generic fallback
              const possibleFiles = inputNode.data.files ||
                                   inputNode.data.output ||
                                   inputNode.data.data ||
                                   [];

              // If no files but has content, create virtual file
              if (possibleFiles.length === 0) {
                const content = inputNode.data.content ||
                               inputNode.data.text ||
                               inputNode.data.output ||
                               '';
                if (content) {
                  inputData.files = [{
                    name: `${inputNode.type}_content.txt`,
                    filename: `${inputNode.type}_content.txt`,
                    content: content,
                    text: content,
                    path: `${inputNode.type}_content.txt`,
                    type: 'text/plain',
                    size: content.length,
                    extension: 'txt'
                  }];
                }
              } else {
                inputData.files = possibleFiles;
              }

              inputData.metadata = {
                source: inputNode.type || 'unknown'
              };
          }

          console.log('✅ Extracted input data:', inputData);
          console.log('📁 Number of files found:', inputData.files.length);

          setConnectedInputData(inputData);
          return inputData;
        }
      }

      console.log('❌ No input data found');
      setConnectedInputData(null);
      return { files: [], metadata: {}, nodeType: null };
    } catch (error) {
      console.error('❌ Error getting input data:', error);
      setConnectedInputData(null);
      return { files: [], metadata: {}, nodeType: null };
    }
  }, [id, getNodes, getEdges]);

  // Monitor for input data changes
  useEffect(() => {
    const interval = setInterval(() => {
      getInputData();
    }, 2000);

    return () => clearInterval(interval);
  }, [getInputData]);

  // Update node data when settings or content changes
  useEffect(() => {
    // Store parsed content in multiple field names for ChunkNode compatibility
    updateNodeData(id, {
      ...settings,
      stats,
      connectedInputData,
      processedFiles,

      // Store parsed content in multiple formats for downstream compatibility
      parsedContent: parsedContent,
      content: parsedContent,
      text: parsedContent,
      extractedText: parsedContent,
      fileContent: parsedContent,
      output: parsedContent,

      // Alternative field names
      files: processedFiles,

      lastUpdated: Date.now()
    });
  }, [settings, stats, connectedInputData, processedFiles, parsedContent, id, updateNodeData]);

  // Handle setting changes
  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
  };

  // Enhanced file parsing functions
  const parseTextFile = (content, filename) => {
    let processedContent = content.trim();

    if (settings.removeEmptyLines) {
      processedContent = processedContent.replace(/^\s*[\r\n]/gm, '');
    }

    if (settings.normalizeWhitespace) {
      processedContent = processedContent.replace(/\s+/g, ' ');
    }

    return {
      content: processedContent,
      metadata: {
        filename,
        type: 'text',
        lines: content.split('\n').length,
        characters: processedContent.length,
        words: processedContent.split(/\s+/).length
      }
    };
  };

  const parseJavaScriptFile = (content, filename) => {
    // Extract comments, functions, classes, and imports
    const comments = content.match(/\/\*[\s\S]*?\*\/|\/\/.*$/gm) || [];
    const functions = content.match(/function\s+\w+\s*\([^)]*\)|const\s+\w+\s*=\s*\([^)]*\)\s*=>/g) || [];
    const classes = content.match(/class\s+\w+/g) || [];
    const imports = content.match(/import\s+.*?from\s+['"].*?['"];?/g) || [];
    const exports = content.match(/export\s+.*?[;{]/g) || [];

    let processedContent = content.trim();

    if (settings.removeEmptyLines) {
      processedContent = processedContent.replace(/^\s*[\r\n]/gm, '');
    }

    return {
      content: processedContent,
      metadata: {
        filename,
        type: 'javascript',
        comments: comments.length,
        functions: functions.length,
        classes: classes.length,
        imports: imports.length,
        exports: exports.length,
        lines: content.split('\n').length
      }
    };
  };

  const parseJSONFile = (content, filename) => {
    try {
      const parsed = JSON.parse(content);
      const flattened = settings.preserveFormatting ? content : JSON.stringify(parsed, null, 2);

      return {
        content: flattened,
        metadata: {
          filename,
          type: 'json',
          keys: typeof parsed === 'object' ? Object.keys(parsed).length : 0,
          valid: true,
          size: flattened.length
        }
      };
    } catch (error) {
      return {
        content: content.trim(),
        metadata: {
          filename,
          type: 'json',
          valid: false,
          error: error.message
        }
      };
    }
  };

  const parseMarkdownFile = (content, filename) => {
    const headers = content.match(/^#{1,6}\s+.+$/gm) || [];
    const codeBlocks = content.match(/``````/g) || [];
    const links = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
    const images = content.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];

    let processedContent = content.trim();

    if (!settings.preserveFormatting) {
      // Convert markdown to plain text
      processedContent = processedContent
        .replace(/#{1,6}\s+/g, '') // Remove headers
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1') // Remove italic
        .replace(/`(.*?)`/g, '$1') // Remove inline code
        .replace(/``````/g, '') // Remove code blocks
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Convert links to text
    }

    return {
      content: processedContent,
      metadata: {
        filename,
        type: 'markdown',
        headers: headers.length,
        codeBlocks: codeBlocks.length,
        links: links.length,
        images: images.length,
        lines: content.split('\n').length
      }
    };
  };

  const parseHTMLFile = (content, filename) => {
    const tags = content.match(/<[^>]+>/g) || [];
    const scripts = content.match(/<script[\s\S]*?<\/script>/gi) || [];
    const styles = content.match(/<style[\s\S]*?<\/style>/gi) || [];

    // Extract text content (remove HTML tags)
    const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    return {
      content: settings.preserveFormatting ? content.trim() : textContent,
      metadata: {
        filename,
        type: 'html',
        tags: tags.length,
        scripts: scripts.length,
        styles: styles.length,
        textLength: textContent.length
      }
    };
  };

  const parseYAMLFile = (content, filename) => {
    const lines = content.split('\n');
    const keys = lines.filter(line => line.match(/^\s*\w+:/)).length;

    return {
      content: content.trim(),
      metadata: {
        filename,
        type: 'yaml',
        lines: lines.length,
        keys: keys
      }
    };
  };

  // Main parsing process
  const processParsing = useCallback(async () => {
    const { files: inputFiles, metadata: inputMetadata } = getInputData();

    // Determine what to parse
    let filesToParse = [];
    let sourceMetadata = {};

    if (settings.useInputData && inputFiles.length > 0) {
      console.log('✅ Using files from connected node');
      filesToParse = inputFiles;
      sourceMetadata = inputMetadata;
    } else if (settings.manualFiles.length > 0) {
      console.log('📁 Using manual file input');
      filesToParse = settings.manualFiles;
      sourceMetadata = { source: 'manual_input' };
    } else {
      console.error('❌ No files to parse');
      alert('Please connect an input node with files or add files manually');
      return;
    }

    setIsProcessing(true);
    const startTime = Date.now();

    try {
      console.log('🚀 Starting parsing process...');
      console.log('📁 Files to parse:', filesToParse.length);

      const allParsedContent = [];
      const processedFilesList = [];
      let totalSize = 0;
      let errors = 0;

      for (const file of filesToParse) {
        try {
          console.log(`📄 Parsing file: ${file.name || file.filename || 'unknown'}`);

          const filename = file.name || file.filename || 'unknown';
          const content = file.content || file.text || '';
          const fileSize = file.size || content.length;

          // Check file size limit
          if (fileSize > settings.maxFileSize * 1024 * 1024) {
            console.log(`⚠️ Skipping large file: ${filename} (${fileSize} bytes)`);
            continue;
          }

          // Determine file type and parse accordingly
          const extension = filename.split('.').pop()?.toLowerCase() || 'txt';
          let parsed;



          switch (extension) {
            case 'js':
            case 'jsx':
            case 'ts':
            case 'tsx':
              parsed = parseJavaScriptFile(content, filename);
              break;
            case 'json':
              parsed = parseJSONFile(content, filename);
              break;
            case 'md':
            case 'markdown':
              parsed = parseMarkdownFile(content, filename);
              break;
            case 'html':
            case 'htm':
              parsed = parseHTMLFile(content, filename);
              break;
            case 'yaml':
            case 'yml':
              parsed = parseYAMLFile(content, filename);
              break;
            case 'txt':
            case 'py':
            case 'css':
            case 'xml':
            default:
              parsed = parseTextFile(content, filename);
          }

          // Add to parsed content if valid
          if (parsed.content && parsed.content.trim().length > 0) {
            allParsedContent.push(parsed.content);

            processedFilesList.push({
              filename,
              originalName: file.name || file.filename,
              type: extension,
              size: fileSize,
              contentLength: parsed.content.length,
              metadata: {
                ...parsed.metadata,
                originalPath: file.path || filename,
                parsedAt: new Date().toISOString(),
                parseMethod: settings.parseMethod
              }
            });

            totalSize += fileSize;
          }

        } catch (error) {
          console.error(`❌ Error parsing file ${file.name}:`, error);
          errors++;
        }
      }

      // Combine all parsed content
      const combinedContent = allParsedContent.join(settings.contentSeparator);
      const processingTime = Date.now() - startTime;

      // Update stats
      const newStats = {
        totalFiles: filesToParse.length,
        parsedFiles: processedFilesList.length,
        totalSize,
        contentLength: combinedContent.length,
        processingTime,
        lastProcessed: Date.now(),
        errors,
      };

      setStats(newStats);
      setParsedContent(combinedContent);
      setProcessedFiles(processedFilesList);

      console.log('✅ Parsing completed successfully');
      console.log('📊 Results:', {
        parsedFiles: processedFilesList.length,
        contentLength: combinedContent.length,
        processingTime,
        errors
      });

    } catch (error) {
      console.error('❌ Parsing error:', error);
      alert(`Parsing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [getInputData, settings]);

  // Export parsed content
  const exportParsedContent = () => {
    if (!parsedContent) {
      alert('No parsed content to export');
      return;
    }

    const exportData = {
      content: parsedContent,
      files: processedFiles,
      settings: settings,
      stats: stats,
      metadata: {
        total_files: processedFiles.length,
        content_length: parsedContent.length,
        parse_method: settings.parseMethod,
        created_at: new Date().toISOString(),
        node_id: id
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parsed-content-${Date.now()}.json`;
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
          selected ? 'border-slate-400 shadow-slate-100' : 'border-gray-200'
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
              <div className="w-8 h-8 bg-gradient-to-br from-slate-400 to-stone-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">🔧</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">File Parser</h3>
                <p className="text-xs text-gray-500">
                  {settings.parseMethod} • {settings.supportedFormats.length} formats
                  {stats.parsedFiles > 0 && (
                    <span className="text-green-600"> • {stats.parsedFiles} parsed</span>
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
                onClick={processParsing}
                disabled={isProcessing}
                className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
                title="Parse Files"
              >
                {isProcessing ? '🔄' : '▶️'}
              </button>
              {parsedContent && (
                <button
                  onClick={exportParsedContent}
                  className="w-6 h-6 flex items-center justify-center rounded bg-blue-100 hover:bg-blue-200 transition-colors"
                  title="Export Content"
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
            connectedInputData && connectedInputData.files.length > 0
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {connectedInputData && connectedInputData.files.length > 0
              ? `📁 ${connectedInputData.files.length} files from ${connectedInputData.nodeType}`
              : '📁 No input files detected'
            }
          </div>
        </div>

        {/* Stats Display */}
        {stats.parsedFiles > 0 && (
          <div className="relative z-10 px-4 py-2 bg-slate-50 border-b border-slate-100">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-semibold text-slate-700">{stats.parsedFiles}</div>
                <div className="text-slate-600">Files</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-slate-700">{Math.round(stats.totalSize / 1024)}KB</div>
                <div className="text-slate-600">Size</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-slate-700">{stats.processingTime}ms</div>
                <div className="text-slate-600">Time</div>
              </div>
            </div>
            {stats.errors > 0 && (
              <div className="text-xs text-center text-red-600 mt-1">
                {stats.errors} errors
              </div>
            )}
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
                    <p className="text-xs text-gray-500">Use files from connected nodes</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.useInputData}
                      onChange={(e) => handleSettingChange('useInputData', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-600"></div>
                  </label>
                </div>

                {/* Parse Method */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Parse Method
                  </label>
                  <select
                    value={settings.parseMethod}
                    onChange={(e) => handleSettingChange('parseMethod', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="text">Plain Text</option>
                    <option value="structured">Structured</option>
                    <option value="code">Code Analysis</option>
                  </select>
                </div>

                {/* File Size Limit */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Max File Size ({settings.maxFileSize} MB)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={settings.maxFileSize}
                    onChange={(e) => handleSettingChange('maxFileSize', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Content Processing Options */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Include Metadata</label>
                    <input
                      type="checkbox"
                      checked={settings.includeMetadata}
                      onChange={(e) => handleSettingChange('includeMetadata', e.target.checked)}
                      className="rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Preserve Formatting</label>
                    <input
                      type="checkbox"
                      checked={settings.preserveFormatting}
                      onChange={(e) => handleSettingChange('preserveFormatting', e.target.checked)}
                      className="rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Remove Empty Lines</label>
                    <input
                      type="checkbox"
                      checked={settings.removeEmptyLines}
                      onChange={(e) => handleSettingChange('removeEmptyLines', e.target.checked)}
                      className="rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Normalize Whitespace</label>
                    <input
                      type="checkbox"
                      checked={settings.normalizeWhitespace}
                      onChange={(e) => handleSettingChange('normalizeWhitespace', e.target.checked)}
                      className="rounded"
                    />
                  </div>
                </div>

                {/* Content Separator */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Content Separator
                  </label>
                  <select
                    value={settings.contentSeparator}
                    onChange={(e) => handleSettingChange('contentSeparator', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="\n\n">Double Newline</option>
                    <option value="\n">Single Newline</option>
                    <option value=" ">Space</option>
                    <option value="---">Separator Line</option>
                  </select>
                </div>

                {/* Supported Formats */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Supported Formats
                  </label>
                  <div className="grid grid-cols-4 gap-1 text-xs">
                    {['txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'py', 'json', 'xml', 'html', 'css', 'yaml'].map(format => (
                      <div
                        key={format}
                        className={`px-2 py-1 rounded text-center cursor-pointer transition-colors ${
                          settings.supportedFormats.includes(format)
                            ? 'bg-slate-200 text-slate-800'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                        onClick={() => {
                          const newFormats = settings.supportedFormats.includes(format)
                            ? settings.supportedFormats.filter(f => f !== format)
                            : [...settings.supportedFormats, format];
                          handleSettingChange('supportedFormats', newFormats);
                        }}
                      >
                        {format}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="relative z-10 p-4">
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-600">
              <div className="animate-spin w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full"></div>
              <span>Parsing files...</span>
            </div>
          </div>
        )}

        {/* Content Preview */}
        {parsedContent && (
          <div className="relative z-10 p-4 border-t border-gray-100">
            <h4 className="text-xs font-medium text-gray-700 mb-2">Content Preview</h4>
            <div className="max-h-32 overflow-y-auto">
              <div className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                <div className="font-medium">
                  {parsedContent.length} characters from {processedFiles.length} files
                </div>
                <div className="truncate mt-1">
                  {parsedContent.substring(0, 100)}...
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ParseNode;
