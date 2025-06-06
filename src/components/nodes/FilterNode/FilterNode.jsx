import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
          id="filter-beams"
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
      <rect width="100%" height="100%" fill="url(#filter-beams)" />
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

const FilterNode = ({ id, data, isConnectable, selected }) => {
  const [inputData, setInputData] = useState(data?.inputData || null);
  const [filteredData, setFilteredData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState(null);

  const [selectedFolders, setSelectedFolders] = useState(new Set());
  const [selectedFormats, setSelectedFormats] = useState(new Set());
  const [folderSearchTerm, setFolderSearchTerm] = useState('');
  const [formatSearchTerm, setFormatSearchTerm] = useState('');
  const [includeRootFiles, setIncludeRootFiles] = useState(true);
  const [showUnknownFormats, setShowUnknownFormats] = useState(true);

  const { setNodes, getNodes, getEdges } = useReactFlow();
  const nodeRef = useRef(null);
  const applyButtonRef = useRef(null);
  const isInitializedRef = useRef(false);
  const updateTimeoutRef = useRef(null);

  // **CHAIN REACTION FUNCTIONALITY**
  const triggerNextNodes = useCallback(async (currentNodeId) => {
    const edges = getEdges();
    const nodes = getNodes();

    const outgoingEdges = edges.filter(edge => edge.source === currentNodeId);

    if (outgoingEdges.length > 0) {
      console.log(`🔗 FilterNode: Found ${outgoingEdges.length} connected node(s) to trigger`);

      for (let i = 0; i < outgoingEdges.length; i++) {
        const edge = outgoingEdges[i];
        const targetNode = nodes.find(node => node.id === edge.target);

        if (targetNode) {
          console.log(`🎯 FilterNode: Triggering ${targetNode.type} node ${edge.target}`);

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
      console.log(`⏹️ FilterNode: No connected nodes found after filtering`);
    }
  }, [getEdges, getNodes]);

  // Known formats map
  const knownFormats = useMemo(() => new Map([
    ['js', { icon: '🟨', category: 'Programming', description: 'JavaScript' }],
    ['jsx', { icon: '⚛️', category: 'Programming', description: 'React JSX' }],
    ['ts', { icon: '🔷', category: 'Programming', description: 'TypeScript' }],
    ['tsx', { icon: '⚛️', category: 'Programming', description: 'React TypeScript' }],
    ['py', { icon: '🐍', category: 'Programming', description: 'Python' }],
    ['java', { icon: '☕', category: 'Programming', description: 'Java' }],
    ['cpp', { icon: '⚙️', category: 'Programming', description: 'C++' }],
    ['c', { icon: '⚙️', category: 'Programming', description: 'C' }],
    ['h', { icon: '📋', category: 'Programming', description: 'C/C++ Header' }],
    ['hpp', { icon: '📋', category: 'Programming', description: 'C++ Header' }],
    ['cs', { icon: '🔷', category: 'Programming', description: 'C#' }],
    ['php', { icon: '🐘', category: 'Programming', description: 'PHP' }],
    ['rb', { icon: '💎', category: 'Programming', description: 'Ruby' }],
    ['go', { icon: '🐹', category: 'Programming', description: 'Go' }],
    ['rs', { icon: '🦀', category: 'Programming', description: 'Rust' }],
    ['sh', { icon: '🐚', category: 'Programming', description: 'Shell Script' }],
    ['bat', { icon: '🦇', category: 'Programming', description: 'Batch File' }],
    ['html', { icon: '🌐', category: 'Web', description: 'HTML' }],
    ['css', { icon: '🎨', category: 'Web', description: 'CSS' }],
    ['scss', { icon: '🎨', category: 'Web', description: 'SASS' }],
    ['vue', { icon: '💚', category: 'Web', description: 'Vue.js' }],
    ['json', { icon: '📋', category: 'Data', description: 'JSON' }],
    ['xml', { icon: '📄', category: 'Data', description: 'XML' }],
    ['csv', { icon: '📊', category: 'Data', description: 'CSV' }],
    ['sql', { icon: '🗄️', category: 'Data', description: 'SQL' }],
    ['yml', { icon: '⚙️', category: 'Config', description: 'YAML' }],
    ['yaml', { icon: '⚙️', category: 'Config', description: 'YAML' }],
    ['toml', { icon: '⚙️', category: 'Config', description: 'TOML' }],
    ['ini', { icon: '⚙️', category: 'Config', description: 'INI' }],
    ['env', { icon: '🔐', category: 'Config', description: 'Environment' }],
    ['md', { icon: '📝', category: 'Documentation', description: 'Markdown' }],
    ['txt', { icon: '📄', category: 'Documentation', description: 'Text' }],
    ['png', { icon: '🖼️', category: 'Image', description: 'PNG' }],
    ['jpg', { icon: '🖼️', category: 'Image', description: 'JPEG' }],
    ['jpeg', { icon: '🖼️', category: 'Image', description: 'JPEG' }],
    ['gif', { icon: '🖼️', category: 'Image', description: 'GIF' }],
    ['svg', { icon: '🎨', category: 'Image', description: 'SVG' }],
    ['pdf', { icon: '📕', category: 'Document', description: 'PDF' }],
    ['doc', { icon: '📄', category: 'Document', description: 'Word Document' }],
    ['docx', { icon: '📄', category: 'Document', description: 'Word Document' }],
    ['gitignore', { icon: '🚫', category: 'Config', description: 'Git Ignore' }],
    ['dockerfile', { icon: '🐳', category: 'Config', description: 'Docker' }],
    ['license', { icon: '📜', category: 'Documentation', description: 'License' }],
    ['readme', { icon: '📖', category: 'Documentation', description: 'README' }],
    ['makefile', { icon: '🔨', category: 'Build', description: 'Makefile' }],
    ['package', { icon: '📦', category: 'Package', description: 'Package' }],
    ['lock', { icon: '🔒', category: 'Package', description: 'Lock File' }],
  ]), []);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('deleteNode', { detail: { id } }));
  }, [id]);

  const handleInteractionEvent = useCallback((e) => {
    e.stopPropagation();
  }, []);

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
                filteredData,
                selectedFolders: Array.from(selectedFolders),
                selectedFormats: Array.from(selectedFormats),
                includeRootFiles,
                showUnknownFormats,
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
  }, [inputData, filteredData, selectedFolders, selectedFormats, includeRootFiles, showUnknownFormats, id, setNodes]);

  // **LISTEN FOR DATA FROM CONNECTED GITNODE**
  useEffect(() => {
    if (isInitializedRef.current) return;

    const checkForInputData = () => {
      try {
        const edges = getEdges();
        const nodes = getNodes();

        const incomingEdges = edges.filter(edge => edge.target === id);

        if (incomingEdges.length > 0) {
          const sourceEdge = incomingEdges[0];
          const sourceNode = nodes.find(node => node.id === sourceEdge.source);

          if (sourceNode && sourceNode.data && sourceNode.data.repoData) {
            console.log(`📥 FilterNode ${id}: Received repository data from GitNode`);
            setInputData(sourceNode.data.repoData);
          }
        }
      } catch (error) {
        console.error(`❌ FilterNode ${id}: Error checking input data:`, error);
      }
    };

    checkForInputData();
    isInitializedRef.current = true;
  }, [getEdges, getNodes, id]);

  // Filtered folders
  const filteredFolders = useMemo(() => {
    if (!inputData || !inputData.contents) return [];

    const folders = inputData.contents.filter(item => item.type === 'folder');
    const foldersWithRoot = [
      { name: '📁 Root Directory', path: '', type: 'folder' },
      ...folders
    ];

    if (!folderSearchTerm) return foldersWithRoot;

    return foldersWithRoot.filter(folder =>
      folder.name.toLowerCase().includes(folderSearchTerm.toLowerCase()) ||
      folder.path.toLowerCase().includes(folderSearchTerm.toLowerCase())
    );
  }, [inputData, folderSearchTerm]);

  // Format detection
  const availableFormats = useMemo(() => {
    if (!inputData || !inputData.contents) {
      return [];
    }

    const formatMap = new Map();
    let filesToProcess = [];

    try {
      if (selectedFolders.size === 0) {
        if (includeRootFiles) {
          filesToProcess = inputData.contents.filter(item =>
            item.type === 'file' && !item.path.includes('/')
          );
        } else {
          filesToProcess = inputData.contents.filter(item => item.type === 'file');
        }
      } else {
        selectedFolders.forEach(folderPath => {
          if (folderPath === '') {
            const rootFiles = inputData.contents.filter(item =>
              item.type === 'file' && !item.path.includes('/')
            );
            filesToProcess.push(...rootFiles);
          } else {
            const folderFiles = inputData.contents.filter(item =>
              item.type === 'file' && item.path.startsWith(folderPath + '/')
            );
            filesToProcess.push(...folderFiles);
          }
        });
      }

      const limitedFiles = filesToProcess.slice(0, 1000);

      limitedFiles.forEach(file => {
        let formatKey = null;
        let formatInfo = null;

        const fileName = file.name.toLowerCase();

        // Special files
        if (fileName === 'dockerfile') {
          formatKey = 'dockerfile';
          formatInfo = knownFormats.get('dockerfile');
        } else if (fileName.startsWith('readme')) {
          formatKey = 'readme';
          formatInfo = knownFormats.get('readme');
        } else if (fileName === 'license' || fileName === 'licence') {
          formatKey = 'license';
          formatInfo = knownFormats.get('license');
        } else if (fileName === '.gitignore') {
          formatKey = 'gitignore';
          formatInfo = knownFormats.get('gitignore');
        } else if (fileName === 'makefile') {
          formatKey = 'makefile';
          formatInfo = knownFormats.get('makefile');
        } else if (fileName === 'package.json') {
          formatKey = 'package';
          formatInfo = knownFormats.get('package');
        } else if (fileName.endsWith('.lock')) {
          formatKey = 'lock';
          formatInfo = knownFormats.get('lock');
        } else {
          const parts = file.name.split('.');
          if (parts.length > 1) {
            const ext = parts[parts.length - 1].toLowerCase();
            formatKey = ext;
            formatInfo = knownFormats.get(ext) || {
              icon: '❓',
              category: 'Unknown',
              description: `${ext.toUpperCase()} File`
            };
          } else {
            formatKey = 'no-extension';
            formatInfo = {
              icon: '📄',
              category: 'Other',
              description: 'No Extension'
            };
          }
        }

        if (formatKey && formatInfo) {
          if (!formatMap.has(formatKey)) {
            formatMap.set(formatKey, {
              ext: formatKey,
              ...formatInfo,
              count: 0,
              isKnown: knownFormats.has(formatKey)
            });
          }
          const format = formatMap.get(formatKey);
          format.count++;
        }
      });

      const formats = Array.from(formatMap.values());
      formats.sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.ext.localeCompare(b.ext);
      });

      return formats;
    } catch (error) {
      console.error(`❌ FilterNode ${id}: Error in format detection:`, error);
      return [];
    }
  }, [inputData, selectedFolders, includeRootFiles, knownFormats]);

  // Filter formats by search and unknown toggle
  const displayFormats = useMemo(() => {
    let filtered = availableFormats;

    if (formatSearchTerm) {
      filtered = filtered.filter(format =>
        format.ext.toLowerCase().includes(formatSearchTerm.toLowerCase()) ||
        format.description.toLowerCase().includes(formatSearchTerm.toLowerCase()) ||
        format.category.toLowerCase().includes(formatSearchTerm.toLowerCase())
      );
    }

    if (!showUnknownFormats) {
      filtered = filtered.filter(format => format.isKnown);
    }

    return filtered;
  }, [availableFormats, formatSearchTerm, showUnknownFormats]);

  // Group formats by category for display
  const groupedFormats = useMemo(() => {
    const groups = new Map();

    displayFormats.forEach(format => {
      if (!groups.has(format.category)) {
        groups.set(format.category, []);
      }
      groups.get(format.category).push(format);
    });

    const sortedGroups = new Map();
    const categoryOrder = ['Programming', 'Web', 'Data', 'Config', 'Documentation', 'Image', 'Document', 'Build', 'Package', 'Unknown', 'Other'];

    categoryOrder.forEach(category => {
      if (groups.has(category)) {
        sortedGroups.set(category, groups.get(category));
      }
    });

    return sortedGroups;
  }, [displayFormats]);

  // **APPLY FILTERS WITH CHAIN REACTION**
  const applyFilters = useCallback(async () => {
    if (!inputData || !inputData.contents) {
      console.log(`⚠️ FilterNode ${id}: No data to filter`);
      return;
    }

    setIsProcessing(true);
    console.log(`🔍 FilterNode ${id}: Applying filters`);

    try {
      await new Promise(resolve => setTimeout(resolve, 400));

      let filtered = [...inputData.contents];

      // Apply folder filtering
      if (selectedFolders.size > 0) {
        filtered = filtered.filter(item => {
          if (item.type === 'folder') {
            return selectedFolders.has(item.path);
          } else {
            return Array.from(selectedFolders).some(folderPath => {
              if (folderPath === '') {
                return !item.path.includes('/');
              }
              return item.path.startsWith(folderPath + '/');
            });
          }
        });
      } else if (includeRootFiles) {
        filtered = filtered.filter(item => {
          if (item.type === 'folder') return false;
          return !item.path.includes('/');
        });
      }

      // Apply format filtering
      if (selectedFormats.size > 0) {
        filtered = filtered.filter(item => {
          if (item.type === 'folder') return true;

          const fileName = item.name.toLowerCase();
          const ext = item.name.split('.').pop()?.toLowerCase();

          // Check special files
          if (selectedFormats.has('dockerfile') && fileName === 'dockerfile') return true;
          if (selectedFormats.has('readme') && fileName.startsWith('readme')) return true;
          if (selectedFormats.has('license') && (fileName === 'license' || fileName === 'licence')) return true;
          if (selectedFormats.has('gitignore') && fileName === '.gitignore') return true;
          if (selectedFormats.has('makefile') && fileName === 'makefile') return true;
          if (selectedFormats.has('package') && fileName === 'package.json') return true;
          if (selectedFormats.has('lock') && fileName.endsWith('.lock')) return true;
          if (selectedFormats.has('no-extension') && !item.name.includes('.')) return true;

          return ext && selectedFormats.has(ext);
        });
      }

      const result = {
        ...inputData,
        contents: filtered,
        originalCount: inputData.contents.length,
        filteredCount: filtered.length,
        filterSettings: {
          selectedFolders: Array.from(selectedFolders),
          selectedFormats: Array.from(selectedFormats),
          includeRootFiles,
          showUnknownFormats
        },
        filteredAt: new Date().toISOString()
      };

      setFilteredData(result);
      console.log(`✨ FilterNode ${id}: Complete! ${inputData.contents.length} → ${filtered.length} items`);

      // **TRIGGER NEXT NODES**
      await new Promise(resolve => setTimeout(resolve, 500));
      await triggerNextNodes(id);

    } catch (error) {
      console.error(`❌ FilterNode ${id}: Error during filtering:`, error);
      setError(`Filtering failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [inputData, selectedFolders, selectedFormats, includeRootFiles, showUnknownFormats, id, triggerNextNodes]);

  // **NODE EXECUTION HANDLER**
  const handleNodeExecution = useCallback(async (inputData) => {
    console.log(`🎯 FilterNode ${id}: Executing with input data:`, inputData);

    try {
      Object.values(inputData).forEach(data => {
        if (data.repoData) {
          console.log(`📥 FilterNode ${id}: Processing repo data from connected GitNode`);
          setInputData(data.repoData);
        }
      });

      if (inputData && Object.keys(inputData).length > 0) {
        console.log(`🔄 FilterNode ${id}: Auto-applying filters after receiving data`);
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (applyButtonRef.current && !isProcessing) {
          console.log(`✅ FilterNode ${id}: Triggering apply filters button`);
          applyButtonRef.current.click();
        } else {
          console.log(`🔄 FilterNode ${id}: Direct filter application`);
          await applyFilters();
        }
      }
    } catch (error) {
      console.error(`❌ FilterNode ${id}: Error during execution:`, error);
    }
  }, [id, applyFilters, isProcessing]);

  const toggleFolder = useCallback((folderPath) => {
    setSelectedFolders(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(folderPath)) {
        newSelected.delete(folderPath);
      } else {
        newSelected.add(folderPath);
      }
      return newSelected;
    });
  }, []);

  const toggleFormat = useCallback((format) => {
    setSelectedFormats(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(format)) {
        newSelected.delete(format);
      } else {
        newSelected.add(format);
      }
      return newSelected;
    });
  }, []);

  const selectAllFolders = useCallback(() => {
    const allFolderPaths = new Set(filteredFolders.map(folder => folder.path));
    setSelectedFolders(allFolderPaths);
  }, [filteredFolders]);

  const clearAllFolders = useCallback(() => {
    setSelectedFolders(new Set());
  }, []);

  const selectAllFormats = useCallback(() => {
    const allFormats = new Set(displayFormats.map(format => format.ext));
    setSelectedFormats(allFormats);
  }, [displayFormats]);

  const clearAllFormats = useCallback(() => {
    setSelectedFormats(new Set());
  }, []);

  // **AUTO-EXECUTION EVENT LISTENER**
  useEffect(() => {
    const handleAutoExecution = (event) => {
      if (event.detail.nodeId === id) {
        console.log(`🎯 FilterNode ${id}: Auto-triggered for execution`);

        if (applyButtonRef.current && !isProcessing && inputData) {
          console.log(`✅ FilterNode ${id}: Triggering apply filters button click`);
          applyButtonRef.current.click();
          return;
        }

        if (inputData && !isProcessing) {
          console.log(`✅ FilterNode ${id}: Direct function call for auto-execution`);
          applyFilters();
        } else {
          console.log(`⚠️ FilterNode ${id}: Cannot auto-execute - no input data available or processing`);
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
  }, [id, inputData, isProcessing, applyFilters]);

  return (
    <motion.div
      ref={nodeRef}
      className={`relative w-80 bg-gradient-to-br from-indigo-50 via-blue-50 to-sky-50 border-2 border-indigo-200 rounded-xl shadow-lg group nowheel overflow-visible ${
        selected ? 'ring-2 ring-indigo-300' : ''
      }`}
      style={{ minHeight: '500px' }}
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
      {/* Background Beams when processing */}
      <AnimatePresence>
        {isProcessing && (
          <BackgroundBeams className="opacity-20" />
        )}
      </AnimatePresence>

      {/* **FIXED: PlayButton positioning - moved outside container** */}
      <div className="absolute -top-4 -left-4 z-30">
        <PlayButton
          nodeId={id}
          nodeType="filter"
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
          background: 'linear-gradient(45deg, #6366f1, #3b82f6)',
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
        {/* **FIXED: Header - Simplified** */}
        <div className="flex items-center space-x-2 mb-4">
          <FloatingIcon isProcessing={isProcessing}>
            <span className="text-xl">🔍</span>
          </FloatingIcon>
          <h3 className="text-sm font-semibold text-indigo-800">
            Smart Filter
          </h3>
        </div>

        {/* Root Files Toggle */}
        <div className="mb-4">
          <motion.label
            className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-700 border border-emerald-200 nodrag"
            onMouseDown={handleInteractionEvent}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.input
              type="checkbox"
              checked={includeRootFiles}
              onChange={(e) => setIncludeRootFiles(e.target.checked)}
              onMouseDown={handleInteractionEvent}
              className="w-3 h-3 text-emerald-600 rounded focus:ring-emerald-500 nodrag"
              whileHover={{ scale: 1.1 }}
            />
            <span>📁 Include Root Directory Files</span>
          </motion.label>
        </div>

        {/* Unknown Formats Toggle */}
        <div className="mb-4">
          <motion.label
            className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs bg-gradient-to-r from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 text-rose-700 border border-rose-200 nodrag"
            onMouseDown={handleInteractionEvent}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.input
              type="checkbox"
              checked={showUnknownFormats}
              onChange={(e) => setShowUnknownFormats(e.target.checked)}
              onMouseDown={handleInteractionEvent}
              className="w-3 h-3 text-rose-600 rounded focus:ring-rose-500 nodrag"
              whileHover={{ scale: 1.1 }}
            />
            <span>❓ Show Unknown File Formats</span>
          </motion.label>
        </div>

        {/* Step 1: Folder Selection */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-indigo-700">
              📁 Step 1: Select Folders ({selectedFolders.size})
            </div>
            <div className="flex space-x-1">
              <motion.button
                onClick={selectAllFolders}
                onMouseDown={handleInteractionEvent}
                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 nodrag"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                All
              </motion.button>
              <motion.button
                onClick={clearAllFolders}
                onMouseDown={handleInteractionEvent}
                className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600 nodrag"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Clear
              </motion.button>
            </div>
          </div>

          <div className="mb-2">
            <motion.input
              type="text"
              placeholder="🔍 Search folders..."
              value={folderSearchTerm}
              onChange={(e) => setFolderSearchTerm(e.target.value)}
              onMouseDown={handleInteractionEvent}
              className="w-full p-2 text-xs border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-800 nodrag"
              whileFocus={{ scale: 1.01 }}
            />
          </div>

          <div className="space-y-1 max-h-32 overflow-y-auto nowheel">
            <div className="grid grid-cols-1 gap-1">
              {filteredFolders.map((folder) => (
                <motion.label
                  key={`folder-${folder.path || 'root'}`}
                  className={`inline-flex items-center space-x-2 px-2 py-1 rounded cursor-pointer transition-colors text-xs nodrag ${
                    selectedFolders.has(folder.path)
                      ? 'bg-blue-100 border border-blue-300 text-blue-800'
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                  }`}
                  onMouseDown={handleInteractionEvent}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <motion.input
                    type="checkbox"
                    checked={selectedFolders.has(folder.path)}
                    onChange={() => toggleFolder(folder.path)}
                    onMouseDown={handleInteractionEvent}
                    className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500 nodrag"
                    whileHover={{ scale: 1.1 }}
                  />
                  <span className="text-sm">📁</span>
                  <span className="flex-1 text-xs truncate" title={folder.path || 'Root Directory'}>
                    {folder.name}
                  </span>
                </motion.label>
              ))}
            </div>
          </div>

          {selectedFolders.size > 0 && (
            <motion.div
              className="text-xs text-blue-600 mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              ✓ {selectedFolders.size} folder{selectedFolders.size !== 1 ? 's' : ''} selected
            </motion.div>
          )}
        </div>

        {/* Step 2: Format Selection */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-indigo-700">
              📄 Step 2: Select File Formats ({displayFormats.length} available)
            </div>
            <div className="flex space-x-1">
              <motion.button
                onClick={selectAllFormats}
                onMouseDown={handleInteractionEvent}
                className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 nodrag"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                All
              </motion.button>
              <motion.button
                onClick={clearAllFormats}
                onMouseDown={handleInteractionEvent}
                className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600 nodrag"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Clear
              </motion.button>
            </div>
          </div>

          {/* Format Search */}
          <div className="mb-2">
            <motion.input
              type="text"
              placeholder="🔍 Search file formats..."
              value={formatSearchTerm}
              onChange={(e) => setFormatSearchTerm(e.target.value)}
              onMouseDown={handleInteractionEvent}
              className="w-full p-2 text-xs border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-800 nodrag"
              whileFocus={{ scale: 1.01 }}
            />
          </div>

          {/* Format Display */}
          {displayFormats.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto nowheel">
              {groupedFormats.size > 0 ? (
                Array.from(groupedFormats.entries()).map(([category, formats]) => (
                  <div key={`category-${category}`} className="space-y-1">
                    <div className="text-xs font-medium text-indigo-600 flex items-center justify-between">
                      <span>{category} ({formats.length}):</span>
                      {category === 'Unknown' && (
                        <span className="text-xs text-orange-600">❓ Auto-detected</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {formats.map((format) => (
                        <motion.label
                          key={`format-${category}-${format.ext}`}
                          className={`inline-flex items-center space-x-1 px-2 py-1 rounded cursor-pointer transition-colors text-xs nodrag ${
                            selectedFormats.has(format.ext)
                              ? 'bg-green-100 border border-green-300 text-green-800'
                              : format.isKnown
                                ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                                : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200'
                          }`}
                          onMouseDown={handleInteractionEvent}
                          title={`${format.description} (${format.count} files)`}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <motion.input
                            type="checkbox"
                            checked={selectedFormats.has(format.ext)}
                            onChange={() => toggleFormat(format.ext)}
                            onMouseDown={handleInteractionEvent}
                            className="w-3 h-3 text-green-600 rounded focus:ring-green-500 nodrag"
                            whileHover={{ scale: 1.1 }}
                          />
                          <span className="text-xs">{format.icon}</span>
                          <span className="whitespace-nowrap text-xs flex-1">{format.ext}</span>
                          <span className="text-xs text-gray-400">({format.count})</span>
                        </motion.label>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500 text-center py-2">
                  No formats found matching search criteria
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded p-2">
              <div className="font-medium mb-1">🔍 Format Detection Debug:</div>
              <div>• Total files in repo: {inputData ? inputData.contents.filter(item => item.type === 'file').length : 0}</div>
              <div>• Selected folders: {selectedFolders.size}</div>
              <div>• Include root files: {includeRootFiles ? 'Yes' : 'No'}</div>
              <div>• Available formats: {availableFormats.length}</div>
              {selectedFolders.size === 0 && !includeRootFiles && (
                <div className="text-red-600 mt-1">⚠️ Select folders or enable root files to see formats</div>
              )}
            </div>
          )}

          {selectedFormats.size > 0 && (
            <motion.div
              className="text-xs text-green-600 mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              ✓ {selectedFormats.size} format{selectedFormats.size !== 1 ? 's' : ''} selected
            </motion.div>
          )}
        </div>

        {/* Apply Filters Button */}
        <motion.button
          ref={applyButtonRef}
          onClick={applyFilters}
          onMouseDown={handleInteractionEvent}
          disabled={isProcessing || !inputData || (selectedFolders.size === 0 && !includeRootFiles)}
          className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 mb-3 nodrag ${
            isProcessing || !inputData || (selectedFolders.size === 0 && !includeRootFiles)
              ? 'bg-indigo-200 text-indigo-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-lg'
          }`}
          whileHover={{
            scale: isProcessing || !inputData || (selectedFolders.size === 0 && !includeRootFiles) ? 1 : 1.02,
            boxShadow: isProcessing || !inputData || (selectedFolders.size === 0 && !includeRootFiles) ? undefined : "0 8px 20px rgba(99, 102, 241, 0.3)"
          }}
          whileTap={{ scale: isProcessing || !inputData || (selectedFolders.size === 0 && !includeRootFiles) ? 1 : 0.98 }}
        >
          <div className="flex items-center justify-center space-x-2">
            {isProcessing ? (
              <>
                <motion.div
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span>Applying Magic...</span>
              </>
            ) : (
              <>
                <span>🔍</span>
                <span>Apply Smart Filter</span>
              </>
            )}
          </div>
        </motion.button>

        {/* Connection Status */}
        <div className="mb-3">
          <div
            className={`text-xs px-3 py-2 rounded-full inline-block transition-all duration-300 ${
              inputData
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
            }`}
          >
            {inputData ? '🔗 Connected to GitNode' : '⏸️ Waiting for GitNode data'}
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

        {/* Filter Results */}
        <AnimatePresence>
          {filteredData && (
            <motion.div
              className="text-xs bg-white border border-indigo-200 rounded-lg overflow-hidden shadow-lg nowheel"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onMouseDown={handleInteractionEvent}
            >
              <motion.div
                className="bg-gradient-to-r from-indigo-50 to-blue-50 p-3 cursor-pointer hover:from-indigo-100 hover:to-blue-100 transition-all duration-300 nodrag"
                onClick={() => setIsExpanded(!isExpanded)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-indigo-800">
                    ✅ Filtered Results
                  </div>
                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="text-indigo-600"
                  >
                    ▼
                  </motion.span>
                </div>
                <div className="text-indigo-700 text-xs mt-1">
                  {filteredData.originalCount} → {filteredData.filteredCount} items
                </div>
              </motion.div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className="max-h-48 overflow-y-auto bg-white p-2 nowheel"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    onMouseDown={handleInteractionEvent}
                  >
                    {filteredData.contents.slice(0, 20).map((item) => (
                      <motion.div
                        key={`result-${item.path}`}
                        className="flex items-center space-x-2 py-1 hover:bg-indigo-50 rounded transition-colors"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.01, x: 4 }}
                      >
                        <span className="text-sm">
                          {item.type === 'folder' ? '📁' : (knownFormats.get(item.name.split('.').pop()?.toLowerCase())?.icon || '📄')}
                        </span>
                        <span className="text-xs text-indigo-700 flex-1 truncate">{item.name}</span>
                      </motion.div>
                    ))}
                    {filteredData.contents.length > 20 && (
                      <div className="text-xs text-indigo-500 text-center py-2">
                        ...and {filteredData.contents.length - 20} more items
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

export default FilterNode;
