import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import PlayButton from '../../ui/PlayButton';

// Simplified Background Beams (fixed pointer events)
const BackgroundBeams = ({ className }) => (
  <div className={`absolute inset-0 pointer-events-none ${className}`}>
    <svg
      className="absolute inset-0 h-full w-full opacity-20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="beams"
          x="0"
          y="0"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 40L40 0H20L0 20M40 40V20L20 40"
            stroke="rgba(156, 163, 175, 0.1)"
            fill="none"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#beams)" />
    </svg>
  </div>
);

// Simplified floating icon (reduced animation)
const FloatingIcon = ({ children, isProcessing }) => (
  <motion.div
    animate={{
      y: [0, -2, 0],
      rotate: isProcessing ? 360 : 0,
    }}
    transition={{
      y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
      rotate: {
        duration: isProcessing ? 2 : 0,
        repeat: isProcessing ? Infinity : 0,
        ease: "linear"
      }
    }}
  >
    {children}
  </motion.div>
);

const ParseNode = ({ id, data, isConnectable, selected }) => {
  const [inputData, setInputData] = useState(data?.inputData || null);
  const [parsedData, setParsedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Parse configuration
  const [selectedParsers, setSelectedParsers] = useState(new Set(['text', 'json', 'markdown', 'code']));
  const [preserveMetadata, setPreserveMetadata] = useState(true);
  const [extractCodeBlocks, setExtractCodeBlocks] = useState(true);
  const [normalizeWhitespace, setNormalizeWhitespace] = useState(true);
  const [parseAllFiles, setParseAllFiles] = useState(true);

  const { setNodes, getNodes, getEdges } = useReactFlow();
  const parseButtonRef = useRef(null);
  const updateTimeoutRef = useRef(null);

  // **CHAIN REACTION FUNCTIONALITY**
  const triggerNextNodes = useCallback(async (currentNodeId) => {
    const edges = getEdges();
    const nodes = getNodes();

    const outgoingEdges = edges.filter(edge => edge.source === currentNodeId);

    if (outgoingEdges.length > 0) {
      console.log(`🔗 ParseNode: Found ${outgoingEdges.length} connected node(s) to trigger`);

      for (let i = 0; i < outgoingEdges.length; i++) {
        const edge = outgoingEdges[i];
        const targetNode = nodes.find(node => node.id === edge.target);

        if (targetNode) {
          console.log(`🎯 ParseNode: Triggering ${targetNode.type} node ${edge.target}`);

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
      console.log(`⏹️ ParseNode: No connected nodes found after parsing`);
    }
  }, [getEdges, getNodes]);

  // Available parsers for different file types
  const availableParsers = [
    {
      id: 'text',
      name: 'Plain Text',
      icon: '📄',
      description: 'Extract plain text content from any readable file',
      extensions: ['txt', 'md', 'rst', 'log', 'csv', 'tsv']
    },
    {
      id: 'json',
      name: 'JSON',
      icon: '📋',
      description: 'Parse JSON structure and content',
      extensions: ['json', 'jsonl', 'geojson']
    },
    {
      id: 'markdown',
      name: 'Markdown',
      icon: '📝',
      description: 'Parse markdown with structure preservation',
      extensions: ['md', 'markdown', 'mdown', 'mkd']
    },
    {
      id: 'code',
      name: 'Source Code',
      icon: '💻',
      description: 'Extract code with syntax awareness',
      extensions: ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'r', 'sh', 'bash']
    },
    {
      id: 'config',
      name: 'Configuration',
      icon: '⚙️',
      description: 'Parse config files (YAML, TOML, INI)',
      extensions: ['yml', 'yaml', 'toml', 'ini', 'env', 'conf', 'config']
    },
    {
      id: 'web',
      name: 'Web Files',
      icon: '🌐',
      description: 'Parse HTML, CSS, and web content',
      extensions: ['html', 'htm', 'css', 'scss', 'sass', 'less']
    },
    {
      id: 'data',
      name: 'Data Files',
      icon: '📊',
      description: 'Parse structured data files',
      extensions: ['xml', 'sql', 'graphql', 'proto']
    }
  ];

  // All your existing helper functions remain the same
  const isNonReadableFile = useCallback((fileName, fileExtension) => {
    const nonReadableExtensions = [
      'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'tiff', 'webp', 'avif',
      'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v',
      'mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a',
      'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'lz', 'lzma',
      'exe', 'dll', 'so', 'dylib', 'bin', 'app', 'deb', 'rpm',
      'db', 'sqlite', 'sqlite3', 'mdb', 'accdb',
      'doc', 'xls', 'ppt', 'docx', 'xlsx', 'pptx',
      'pdf', 'ps', 'eps', 'ai', 'psd', 'sketch',
      'ttf', 'otf', 'woff', 'woff2', 'eot',
      'p12', 'pfx', 'key', 'crt', 'cer', 'pem'
    ];

    const binaryFileNames = ['favicon.ico', 'thumbs.db', '.ds_store', 'desktop.ini'];
    const readableDotFiles = ['.gitignore', '.gitattributes', '.dockerignore', '.eslintrc', '.prettierrc', '.babelrc', '.npmrc', '.yarnrc', '.editorconfig', '.env'];

    if (fileName.startsWith('.') && readableDotFiles.includes(fileName)) {
      return false;
    }

    return nonReadableExtensions.includes(fileExtension) ||
           binaryFileNames.includes(fileName) ||
           (fileName.startsWith('.') && !readableDotFiles.includes(fileName));
  }, []);

  const determineParserType = useCallback((fileName, fileExtension) => {
    if (parseAllFiles) {
      for (const parser of availableParsers) {
        if (selectedParsers.has(parser.id)) {
          if (parser.extensions.includes(fileExtension) ||
              (parser.id === 'markdown' && (fileName.startsWith('readme') || fileName.startsWith('changelog'))) ||
              (parser.id === 'config' && (fileName === 'dockerfile' || fileName === 'makefile' || fileName.startsWith('.git')))) {
            return parser.id;
          }
        }
      }

      if (['json', 'jsonl', 'geojson'].includes(fileExtension)) return 'json';
      if (['md', 'markdown', 'mdown', 'mkd'].includes(fileExtension) ||
          fileName.startsWith('readme') || fileName.startsWith('changelog') || fileName.startsWith('license')) return 'markdown';

      const codeExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'r', 'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd'];
      if (codeExtensions.includes(fileExtension)) return 'code';

      const configExtensions = ['yml', 'yaml', 'toml', 'ini', 'env', 'conf', 'config', 'cfg', 'properties'];
      if (configExtensions.includes(fileExtension) ||
          fileName === 'dockerfile' || fileName === '.gitignore' || fileName === 'makefile' || fileName.startsWith('.')) return 'config';

      if (['html', 'htm', 'css', 'scss', 'sass', 'less', 'styl'].includes(fileExtension)) return 'web';
      if (['xml', 'sql', 'graphql', 'proto', 'csv', 'tsv'].includes(fileExtension)) return 'data';

      return 'text';
    } else {
      for (const parser of availableParsers) {
        if (selectedParsers.has(parser.id)) {
          if (parser.extensions.includes(fileExtension) ||
              (parser.id === 'markdown' && fileName.startsWith('readme')) ||
              (parser.id === 'config' && (fileName === 'dockerfile' || fileName === '.gitignore'))) {
            return parser.id;
          }
        }
      }
      return null;
    }
  }, [parseAllFiles, selectedParsers, availableParsers]);

  const toggleParser = useCallback((parserId) => {
    setSelectedParsers(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(parserId)) {
        newSelected.delete(parserId);
      } else {
        newSelected.add(parserId);
      }
      return newSelected;
    });
  }, []);

  // All your existing useEffect hooks and functions remain the same...
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
                parsedData,
                selectedParsers: Array.from(selectedParsers),
                preserveMetadata,
                extractCodeBlocks,
                normalizeWhitespace,
                parseAllFiles,
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
  }, [inputData, parsedData, selectedParsers, preserveMetadata, extractCodeBlocks, normalizeWhitespace, parseAllFiles, id, setNodes]);

  useEffect(() => {
    const checkForInputData = () => {
      try {
        const edges = getEdges();
        const nodes = getNodes();

        const incomingEdges = edges.filter(edge => edge.target === id);

        if (incomingEdges.length > 0) {
          const sourceEdge = incomingEdges[0];
          const sourceNode = nodes.find(node => node.id === sourceEdge.source);

          if (sourceNode && sourceNode.data && (sourceNode.data.filteredData || sourceNode.data.repoData)) {
            console.log(`📥 ParseNode ${id}: Received filtered data from previous node`);
            setInputData(sourceNode.data.filteredData || sourceNode.data.repoData);
          }
        }
      } catch (error) {
        console.error(`❌ ParseNode ${id}: Error checking input data:`, error);
      }
    };

    checkForInputData();
  }, [getEdges, getNodes, id]);

  // Your existing parseFiles function with all the logic...
  const parseFiles = useCallback(async () => {
    if (!inputData || !inputData.contents) {
      console.log(`⚠️ ParseNode ${id}: No data to parse`);
      return;
    }

    setIsProcessing(true);
    setError(null);
    console.log(`🔄 ParseNode ${id}: Starting file parsing (parseAllFiles: ${parseAllFiles})`);

    try {
      const parsedFiles = [];
      const skippedFiles = [];

      for (const item of inputData.contents) {
        if (item.type === 'file') {
          const fileExtension = item.name.split('.').pop()?.toLowerCase() || '';
          const fileName = item.name.toLowerCase();

          const shouldSkip = isNonReadableFile(fileName, fileExtension);

          if (shouldSkip) {
            skippedFiles.push({
              file: item,
              reason: 'Non-readable or binary file type',
              extension: fileExtension
            });
            console.log(`⏭️ ParseNode ${id}: Skipping ${item.name} - binary file type`);
            continue;
          }

          const parserType = determineParserType(fileName, fileExtension);

          if (parserType === null && !parseAllFiles) {
            skippedFiles.push({
              file: item,
              reason: 'No matching parser selected',
              extension: fileExtension
            });
            console.log(`⏭️ ParseNode ${id}: Skipping ${item.name} - no matching parser`);
            continue;
          }

          const finalParserType = parserType || 'text';
          const parsedContent = await parseFileContent(item, finalParserType);
          parsedFiles.push(parsedContent);

          console.log(`✅ ParseNode ${id}: Parsed ${item.name} using ${finalParserType} parser`);
        }
      }

      const result = {
        ...inputData,
        parsedFiles: parsedFiles,
        skippedFiles: skippedFiles,
        originalFileCount: inputData.contents.filter(item => item.type === 'file').length,
        parsedFileCount: parsedFiles.length,
        skippedFileCount: skippedFiles.length,
        parsingConfig: {
          selectedParsers: Array.from(selectedParsers),
          preserveMetadata,
          extractCodeBlocks,
          normalizeWhitespace,
          parseAllFiles
        },
        parsedAt: new Date().toISOString()
      };

      setParsedData(result);
      console.log(`✅ ParseNode ${id}: Parsed ${parsedFiles.length} files, skipped ${skippedFiles.length} files`);

      await new Promise(resolve => setTimeout(resolve, 500));
      await triggerNextNodes(id);

    } catch (error) {
      console.error(`❌ ParseNode ${id}: Parsing failed:`, error);
      setError(`Parsing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [inputData, selectedParsers, preserveMetadata, extractCodeBlocks, normalizeWhitespace, parseAllFiles, id, triggerNextNodes, isNonReadableFile, determineParserType]);

  // Simplified parseFileContent for demo
  const parseFileContent = async (file, parserType) => {
    const baseContent = `Content of ${file.name}\n\nThis represents the parsed content from ${file.name} using the ${parserType} parser.\n\nFile size: ${file.size} bytes\nPath: ${file.path}\nExtension: ${file.name.split('.').pop()?.toLowerCase() || 'none'}`;

    return {
      file: {
        name: file.name,
        path: file.path,
        size: file.size,
        extension: file.name.split('.').pop()?.toLowerCase() || 'none',
        detectedType: parserType
      },
      parser: parserType,
      content: { raw: baseContent },
      metadata: preserveMetadata ? {
        parsedAt: new Date().toISOString(),
        parser: parserType,
        originalSize: file.size
      } : {}
    };
  };

  const handleNodeExecution = useCallback(async (inputData) => {
    console.log(`🎯 ParseNode ${id}: Executing with input data:`, inputData);

    try {
      Object.values(inputData).forEach(data => {
        if (data.contents || data.filteredData) {
          console.log(`📥 ParseNode ${id}: Processing data from connected node`);
          setInputData(data.contents ? data : data.filteredData);
        }
      });

      if (inputData && Object.keys(inputData).length > 0) {
        console.log(`🔄 ParseNode ${id}: Auto-parsing files after receiving data`);
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (parseButtonRef.current && !isProcessing) {
          console.log(`✅ ParseNode ${id}: Triggering parse button`);
          parseButtonRef.current.click();
        } else {
          await parseFiles();
        }
      }
    } catch (error) {
      console.error(`❌ ParseNode ${id}: Error during execution:`, error);
    }
  }, [id, parseFiles, isProcessing]);

  useEffect(() => {
    const handleAutoExecution = (event) => {
      if (event.detail.nodeId === id) {
        console.log(`🎯 ParseNode ${id}: Auto-triggered for execution`);

        if (parseButtonRef.current && !isProcessing && inputData) {
          console.log(`✅ ParseNode ${id}: Triggering parse button click`);
          parseButtonRef.current.click();
          return;
        }

        if (inputData && !isProcessing) {
          console.log(`✅ ParseNode ${id}: Direct function call for auto-execution`);
          parseFiles();
        } else {
          console.log(`⚠️ ParseNode ${id}: Cannot auto-execute - no input data available or processing`);
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
  }, [id, inputData, isProcessing, parseFiles]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('deleteNode', { detail: { id } }));
  }, [id]);

  const handleInteractionEvent = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return (
    <motion.div
      className={`relative w-96 bg-gradient-to-br from-slate-50 via-stone-50 to-zinc-50 border-2 border-stone-200 rounded-xl shadow-lg group nowheel overflow-visible ${
        selected ? 'ring-2 ring-violet-300' : ''
      }`}
      style={{ minHeight: '600px' }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onPointerDown={(e) => {
        if (e.target.closest('input, button, select, .nowheel')) {
          e.stopPropagation();
        }
      }}
      whileHover={{
        scale: 1.01,
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)"
      }}
    >
      {/* Background Beams when processing - FIXED */}
      <AnimatePresence>
        {isProcessing && (
          <BackgroundBeams className="opacity-20" />
        )}
      </AnimatePresence>

      {/* **FIXED: PlayButton positioning - moved outside container** */}
      <div className="absolute -top-4 -left-4 z-30">
        <PlayButton
          nodeId={id}
          nodeType="parse"
          onExecute={handleNodeExecution}
          disabled={isProcessing}
        />
      </div>

      {/* **FIXED: Delete button positioning - moved outside container** */}
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

      {/* **FIXED: Input Handle - Made larger and more visible** */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{
          background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
          width: '16px',
          height: '16px',
          border: '3px solid white',
          borderRadius: '50%',
          boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
          left: '-8px'
        }}
        isConnectable={isConnectable}
      />

      <div className="p-4 pt-8 nowheel">
        {/* **FIXED: Header - Removed SparkleText, simplified** */}
        <div className="flex items-center space-x-2 mb-4">
          <FloatingIcon isProcessing={isProcessing}>
            <span className="text-xl">🔧</span>
          </FloatingIcon>
          <h3 className="text-sm font-semibold text-stone-700">
            Parse Node
          </h3>
        </div>

        {/* **FIXED: Parse All Files Toggle - Removed GlowCard wrapper** */}
        <div className="mb-4">
          <motion.label
            className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs bg-gradient-to-r from-blue-50 to-sky-50 hover:from-blue-100 hover:to-sky-100 text-blue-700 border border-blue-200 nodrag"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.input
              type="checkbox"
              checked={parseAllFiles}
              onChange={(e) => setParseAllFiles(e.target.checked)}
              onMouseDown={handleInteractionEvent}
              className="w-3 h-3 text-blue-500 rounded focus:ring-blue-400 nodrag"
              whileHover={{ scale: 1.1 }}
            />
            <span>🚀 Parse All Readable Files</span>
          </motion.label>
          <div className="text-xs text-stone-600 mt-1 ml-5">
            {parseAllFiles ? 'Will parse all files except binary/encrypted files' : 'Only parse files matching selected parsers'}
          </div>
        </div>

        {/* **FIXED: Parser Selection - Removed GlowCard, simplified layout** */}
        <div className="mb-4">
          <label className="text-xs font-medium text-stone-700 mb-2 block">
            🔧 File Parsers ({selectedParsers.size} selected)
          </label>
          <div className="space-y-1 max-h-48 overflow-y-auto nowheel">
            {availableParsers.map((parser, index) => (
              <motion.label
                key={parser.id}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs nodrag ${
                  selectedParsers.has(parser.id)
                    ? 'bg-violet-50 border border-violet-200 text-violet-800'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
                onMouseDown={handleInteractionEvent}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                whileHover={{
                  scale: 1.01,
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)"
                }}
                whileTap={{ scale: 0.99 }}
              >
                <motion.input
                  type="checkbox"
                  checked={selectedParsers.has(parser.id)}
                  onChange={() => toggleParser(parser.id)}
                  onMouseDown={handleInteractionEvent}
                  className="w-3 h-3 text-violet-500 rounded focus:ring-violet-400 nodrag flex-shrink-0"
                  whileHover={{ scale: 1.1 }}
                />
                <span className="text-sm flex-shrink-0">{parser.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-xs">{parser.name}</div>
                  <div className="text-xs text-slate-500 truncate">{parser.description}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {parser.extensions.slice(0, 4).join(', ')}
                    {parser.extensions.length > 4 && ` +${parser.extensions.length - 4} more`}
                  </div>
                </div>
              </motion.label>
            ))}
          </div>
        </div>

        {/* **FIXED: Parse Options - Removed GlowCard wrapper, simplified** */}
        <div className="mb-4 space-y-2">
          <label className="text-xs font-medium text-stone-700 block">⚙️ Parse Options</label>

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
              className="w-3 h-3 text-violet-500 rounded focus:ring-violet-400 nodrag"
              whileHover={{ scale: 1.1 }}
            />
            <span>📊 Preserve File Metadata</span>
          </motion.label>

          <motion.label
            className="flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs bg-gradient-to-r from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 text-rose-700 border border-rose-200 nodrag"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <motion.input
              type="checkbox"
              checked={extractCodeBlocks}
              onChange={(e) => setExtractCodeBlocks(e.target.checked)}
              onMouseDown={handleInteractionEvent}
              className="w-3 h-3 text-rose-500 rounded focus:ring-rose-400 nodrag"
              whileHover={{ scale: 1.1 }}
            />
            <span>💻 Extract Code Blocks</span>
          </motion.label>

          <motion.label
            className="flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs bg-gradient-to-r from-teal-50 to-cyan-50 hover:from-teal-100 hover:to-cyan-100 text-teal-700 border border-teal-200 nodrag"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <motion.input
              type="checkbox"
              checked={normalizeWhitespace}
              onChange={(e) => setNormalizeWhitespace(e.target.checked)}
              onMouseDown={handleInteractionEvent}
              className="w-3 h-3 text-teal-500 rounded focus:ring-teal-400 nodrag"
              whileHover={{ scale: 1.1 }}
            />
            <span>📝 Normalize Whitespace</span>
          </motion.label>
        </div>

        {/* **FIXED: Parse Button - Removed AnimatedButton wrapper** */}
        <motion.button
          ref={parseButtonRef}
          onClick={parseFiles}
          onMouseDown={handleInteractionEvent}
          disabled={isProcessing || !inputData || (!parseAllFiles && selectedParsers.size === 0)}
          className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 mb-3 nodrag ${
            isProcessing || !inputData || (!parseAllFiles && selectedParsers.size === 0)
              ? 'bg-stone-200 text-stone-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg'
          }`}
          whileHover={{
            scale: isProcessing || !inputData || (!parseAllFiles && selectedParsers.size === 0) ? 1 : 1.02,
            boxShadow: isProcessing || !inputData || (!parseAllFiles && selectedParsers.size === 0) ? undefined : "0 8px 20px rgba(139, 92, 246, 0.3)"
          }}
          whileTap={{ scale: isProcessing || !inputData || (!parseAllFiles && selectedParsers.size === 0) ? 1 : 0.98 }}
        >
          <div className="flex items-center justify-center space-x-2">
            {isProcessing ? (
              <>
                <motion.div
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span>Parsing Files...</span>
              </>
            ) : (
              <>
                <span>🔧</span>
                <span>{parseAllFiles ? 'Parse All Files' : 'Parse Selected'}</span>
              </>
            )}
          </div>
        </motion.button>

        {/* **FIXED: Connection Status - Removed GlowCard wrapper** */}
        <div className="mb-3">
          <div
            className={`text-xs px-3 py-2 rounded-full inline-block transition-all duration-300 ${
              inputData
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-stone-50 text-stone-600 border border-stone-200'
            }`}
          >
            {inputData ? '🔗 Connected to FilterNode' : '⏸️ Waiting for filtered data'}
          </div>
        </div>

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

        {/* **FIXED: Parse Results - Removed CardHoverEffect wrapper** */}
        <AnimatePresence>
          {parsedData && (
            <motion.div
              className="text-xs bg-white border border-stone-200 rounded-lg overflow-hidden shadow-lg nowheel"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onMouseDown={handleInteractionEvent}
            >
              <motion.div
                className="bg-gradient-to-r from-stone-50 to-slate-50 p-3 cursor-pointer hover:from-stone-100 hover:to-slate-100 transition-all duration-300 nodrag"
                onClick={() => setIsExpanded(!isExpanded)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-stone-700">
                    ✅ Parsing Complete
                  </div>
                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="text-stone-500"
                  >
                    ▼
                  </motion.span>
                </div>
                <div className="text-stone-600 text-xs mt-1">
                  {parsedData.originalFileCount} files → {parsedData.parsedFileCount} parsed, {parsedData.skippedFileCount} skipped
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
                    {/* Parsed Files */}
                    <div className="mb-3">
                      <div className="font-medium text-emerald-600 mb-1">📄 Parsed Files ({parsedData.parsedFileCount})</div>
                      {parsedData.parsedFiles.slice(0, 10).map((file, index) => (
                        <motion.div
                          key={index}
                          className="flex items-center space-x-2 py-1 hover:bg-stone-50 rounded transition-colors"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          whileHover={{ scale: 1.01, x: 4 }}
                        >
                          <span className="text-sm">
                            {availableParsers.find(p => p.id === file.parser)?.icon || '📄'}
                          </span>
                          <span className="text-xs text-stone-700 flex-1 truncate">{file.file.name}</span>
                          <span className="text-xs text-stone-500 bg-stone-100 px-1 rounded">
                            {file.parser}
                          </span>
                        </motion.div>
                      ))}
                      {parsedData.parsedFiles.length > 10 && (
                        <div className="text-xs text-stone-500 text-center py-1">
                          ...and {parsedData.parsedFiles.length - 10} more files
                        </div>
                      )}
                    </div>

                    {/* Skipped Files */}
                    {parsedData.skippedFiles.length > 0 && (
                      <div>
                        <div className="font-medium text-amber-600 mb-1">⏭️ Skipped Files ({parsedData.skippedFileCount})</div>
                        {parsedData.skippedFiles.slice(0, 5).map((item, index) => (
                          <motion.div
                            key={index}
                            className="flex items-center space-x-2 py-1 hover:bg-amber-50 rounded transition-colors"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.02 }}
                            whileHover={{ scale: 1.01, x: 4 }}
                          >
                            <span className="text-sm">⏭️</span>
                            <span className="text-xs text-stone-700 flex-1 truncate">{item.file.name}</span>
                            <span className="text-xs text-amber-600 bg-amber-100 px-1 rounded">
                              {item.reason}
                            </span>
                          </motion.div>
                        ))}
                        {parsedData.skippedFiles.length > 5 && (
                          <div className="text-xs text-stone-500 text-center py-1">
                            ...and {parsedData.skippedFiles.length - 5} more skipped
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* **FIXED: Output Handle - Made larger and more visible** */}
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

export default ParseNode;
