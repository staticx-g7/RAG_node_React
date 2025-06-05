import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import PlayButton from '../../ui/PlayButton';

const FilterNode = ({ id, data, isConnectable, selected }) => {
  const [inputData, setInputData] = useState(data?.inputData || null);
  const [filteredData, setFilteredData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [error, setError] = useState(null); // **ADDED: Missing error state**

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
  const updateTimeoutRef = useRef(null); // **ADDED: Missing timeout ref**

  // **FIXED: Simplified motion values to prevent concurrent rendering issues**
  const scale = useMotionValue(1);
  const y = useMotionValue(0);
  const glowOpacity = useMotionValue(0);

  const boxShadow = useTransform(
    [scale, glowOpacity],
    ([s, glow]) => `0px ${s * 8}px ${s * 25}px rgba(147, 51, 234, ${glow * 0.15})`
  );

  // **ADD CHAIN REACTION FUNCTIONALITY**
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

  // Known formats map (keeping your existing implementation)
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

  // **FIXED: Simplified mouse handlers to prevent render conflicts**
  const handleMouseEnter = useCallback(() => {
    if (!selected && !isProcessing) {
      setIsHovered(true);
    }
  }, [selected, isProcessing]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // **FIXED: Moved motion value updates to useEffect to prevent render conflicts**
  useEffect(() => {
    if (isProcessing) {
      glowOpacity.set(0.5);
      scale.set(1.02);
    } else if (isHovered) {
      glowOpacity.set(0.3);
      scale.set(1.01);
    } else {
      glowOpacity.set(0);
      scale.set(1);
      y.set(0);
    }
  }, [isProcessing, isHovered, glowOpacity, scale, y]);

  // **FIXED: Proper debounced node data update to prevent excessive re-renders**
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
    }, 1000); // Longer debounce to prevent concurrent rendering issues

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [inputData, filteredData, selectedFolders, selectedFormats, includeRootFiles, showUnknownFormats, id, setNodes]);

  // **FIXED: Listen for data from connected GitNode with proper cleanup**
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

  // Filtered folders (keeping your existing implementation)
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

  // **FIXED: Simplified format detection**
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

      // **FIXED: Limit processing to prevent blocking**
      const limitedFiles = filesToProcess.slice(0, 1000); // Limit to prevent blocking

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

  // **UPDATED APPLY FILTERS WITH CHAIN REACTION**
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

      // **ADD CHAIN REACTION: Trigger next nodes after filtering completes**
      await new Promise(resolve => setTimeout(resolve, 500));
      await triggerNextNodes(id);

    } catch (error) {
      console.error(`❌ FilterNode ${id}: Error during filtering:`, error);
      setError(`Filtering failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [inputData, selectedFolders, selectedFormats, includeRootFiles, showUnknownFormats, id, triggerNextNodes]);

  // **UPDATED NODE EXECUTION HANDLER**
  const handleNodeExecution = useCallback(async (inputData) => {
    console.log(`🎯 FilterNode ${id}: Executing with input data:`, inputData);

    try {
      Object.values(inputData).forEach(data => {
        if (data.repoData) {
          console.log(`📥 FilterNode ${id}: Processing repo data from connected GitNode`);
          setInputData(data.repoData);
        }
      });

      // Auto-apply filters if we have data
      if (inputData && Object.keys(inputData).length > 0) {
        console.log(`🔄 FilterNode ${id}: Auto-applying filters after receiving data`);
        // Wait a moment for UI to update
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Trigger the apply filters function
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

  // **FIXED AUTO-EXECUTION EVENT LISTENER WITH CHAIN REACTION**
  useEffect(() => {
    const handleAutoExecution = (event) => {
      if (event.detail.nodeId === id) {
        console.log(`🎯 FilterNode ${id}: Auto-triggered for execution`);

        // Method 1: Try direct button click first
        if (applyButtonRef.current && !isProcessing && inputData) {
          console.log(`✅ FilterNode ${id}: Triggering apply filters button click`);
          applyButtonRef.current.click();
          return;
        }

        // Method 2: Direct function call if button click fails
        if (inputData && !isProcessing) {
          console.log(`✅ FilterNode ${id}: Direct function call for auto-execution`);
          applyFilters();
        } else {
          console.log(`⚠️ FilterNode ${id}: Cannot auto-execute - no input data available or processing`);
        }
      }
    };

    // Listen for multiple event types
    window.addEventListener('triggerExecution', handleAutoExecution);
    window.addEventListener('triggerPlayButton', handleAutoExecution);
    window.addEventListener('autoExecute', handleAutoExecution);

    return () => {
      window.removeEventListener('triggerExecution', handleAutoExecution);
      window.removeEventListener('triggerPlayButton', handleAutoExecution);
      window.removeEventListener('autoExecute', handleAutoExecution);
    };
  }, [id, inputData, isProcessing, applyFilters]);

  // **FIXED: Simplified animation variants**
  const containerVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 }
  };

  const itemVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 }
  };

  const buttonVariants = {
    idle: { scale: 1 },
    hover: { scale: 1.02 },
    tap: { scale: 0.98 }
  };

  return (
    <motion.div 
      ref={nodeRef}
      className={`relative w-80 bg-gradient-to-br from-purple-100 via-purple-150 to-purple-200 border-2 border-purple-300 rounded-xl shadow-lg group ${
        selected ? 'ring-2 ring-purple-200' : ''
      }`}
      variants={containerVariants}
      initial="initial"
      animate="animate"
      style={{
        y,
        boxShadow,
        minHeight: '500px'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPointerDown={(e) => {
        if (e.target.closest('input, button, select, .nowheel')) {
          e.stopPropagation();
        }
      }}
    >
      {/* Simplified loading indicator */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 opacity-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      <PlayButton
        nodeId={id}
        nodeType="filter"
        onExecute={handleNodeExecution}
        disabled={isProcessing}
      />

      <motion.button
        onClick={handleDelete}
        className={`absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 shadow-lg z-10 ${
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        title="Delete node"
        variants={buttonVariants}
        initial="idle"
        whileHover="hover"
        whileTap="tap"
      >
        ×
      </motion.button>

      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{ 
          background: '#6b7280', 
          width: '10px', 
          height: '10px',
          border: '2px solid white'
        }}
        isConnectable={isConnectable}
      />

      <motion.div className="p-4 nowheel" variants={itemVariants}>
        {/* Header */}
        <motion.div className="flex items-center space-x-2 mb-4">
          <motion.span 
            className="text-xl"
            animate={{
              rotate: isProcessing ? 360 : 0
            }}
            transition={{
              rotate: {
                duration: 2,
                repeat: isProcessing ? Infinity : 0,
                ease: "linear"
              }
            }}
          >
            🔍
          </motion.span>
          <motion.h3 className="text-sm font-semibold text-purple-800">
            Smart Filter ✨
          </motion.h3>
        </motion.div>

        {/* Root Files Toggle */}
        <motion.div className="mb-4" variants={itemVariants}>
          <motion.label
            className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs bg-gradient-to-r from-yellow-100 to-orange-100 hover:from-yellow-200 hover:to-orange-200 text-yellow-800 border border-yellow-300"
            onMouseDown={handleInteractionEvent}
            variants={buttonVariants}
            initial="idle"
            whileHover="hover"
            whileTap="tap"
          >
            <motion.input
              type="checkbox"
              checked={includeRootFiles}
              onChange={(e) => setIncludeRootFiles(e.target.checked)}
              onMouseDown={handleInteractionEvent}
              className="w-3 h-3 text-yellow-600 rounded focus:ring-yellow-500"
            />
            <span>📁 Include Root Directory Files</span>
          </motion.label>
        </motion.div>

        {/* Unknown Formats Toggle */}
        <motion.div className="mb-4" variants={itemVariants}>
          <motion.label
            className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-800 border border-gray-300"
            onMouseDown={handleInteractionEvent}
            variants={buttonVariants}
            initial="idle"
            whileHover="hover"
            whileTap="tap"
          >
            <motion.input
              type="checkbox"
              checked={showUnknownFormats}
              onChange={(e) => setShowUnknownFormats(e.target.checked)}
              onMouseDown={handleInteractionEvent}
              className="w-3 h-3 text-gray-600 rounded focus:ring-gray-500"
            />
            <span>❓ Show Unknown File Formats</span>
          </motion.label>
        </motion.div>

        {/* Step 1: Folder Selection */}
        <motion.div className="mb-4" variants={itemVariants}>
          <motion.div className="flex items-center justify-between mb-2">
            <motion.div className="text-xs font-medium text-gray-700">
              📁 Step 1: Select Folders ({selectedFolders.size})
            </motion.div>
            <div className="flex space-x-1">
              <motion.button
                onClick={selectAllFolders}
                onMouseDown={handleInteractionEvent}
                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                variants={buttonVariants}
                initial="idle"
                whileHover="hover"
                whileTap="tap"
              >
                All
              </motion.button>
              <motion.button
                onClick={clearAllFolders}
                onMouseDown={handleInteractionEvent}
                className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                variants={buttonVariants}
                initial="idle"
                whileHover="hover"
                whileTap="tap"
              >
                Clear
              </motion.button>
            </div>
          </motion.div>

          <motion.div className="mb-2" variants={itemVariants}>
            <motion.input
              type="text"
              placeholder="🔍 Search folders..."
              value={folderSearchTerm}
              onChange={(e) => setFolderSearchTerm(e.target.value)}
              onMouseDown={handleInteractionEvent}
              className="w-full p-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </motion.div>

          <motion.div
            className="space-y-1 max-h-32 overflow-y-auto nowheel"
            onMouseDown={handleInteractionEvent}
            variants={itemVariants}
          >
            <div className="grid grid-cols-1 gap-1">
              {filteredFolders.map((folder) => (
                <motion.label
                  key={`folder-${folder.path || 'root'}`}
                  className={`inline-flex items-center space-x-2 px-2 py-1 rounded cursor-pointer transition-colors text-xs ${
                    selectedFolders.has(folder.path)
                      ? 'bg-blue-100 border border-blue-300 text-blue-800'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  onMouseDown={handleInteractionEvent}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <motion.input
                    type="checkbox"
                    checked={selectedFolders.has(folder.path)}
                    onChange={() => toggleFolder(folder.path)}
                    onMouseDown={handleInteractionEvent}
                    className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">📁</span>
                  <span className="flex-1 text-xs truncate" title={folder.path || 'Root Directory'}>
                    {folder.name}
                  </span>
                </motion.label>
              ))}
            </div>
          </motion.div>

          {selectedFolders.size > 0 && (
            <motion.div
              className="text-xs text-blue-600 mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              ✓ {selectedFolders.size} folder{selectedFolders.size !== 1 ? 's' : ''} selected
            </motion.div>
          )}
        </motion.div>

        {/* Step 2: Format Selection */}
        <motion.div className="mb-4" variants={itemVariants}>
          <motion.div className="flex items-center justify-between mb-2">
            <motion.div className="text-xs font-medium text-gray-700">
              📄 Step 2: Select File Formats ({displayFormats.length} available)
            </motion.div>
            <div className="flex space-x-1">
              <motion.button
                onClick={selectAllFormats}
                onMouseDown={handleInteractionEvent}
                className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                variants={buttonVariants}
                initial="idle"
                whileHover="hover"
                whileTap="tap"
              >
                All
              </motion.button>
              <motion.button
                onClick={clearAllFormats}
                onMouseDown={handleInteractionEvent}
                className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                variants={buttonVariants}
                initial="idle"
                whileHover="hover"
                whileTap="tap"
              >
                Clear
              </motion.button>
            </div>
          </motion.div>

          {/* Format Search */}
          <motion.div className="mb-2" variants={itemVariants}>
            <motion.input
              type="text"
              placeholder="🔍 Search file formats..."
              value={formatSearchTerm}
              onChange={(e) => setFormatSearchTerm(e.target.value)}
              onMouseDown={handleInteractionEvent}
              className="w-full p-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </motion.div>

          {/* Format Display */}
          {displayFormats.length > 0 ? (
            <motion.div
              className="space-y-2 max-h-40 overflow-y-auto nowheel"
              onMouseDown={handleInteractionEvent}
              variants={itemVariants}
            >
              {groupedFormats.size > 0 ? (
                Array.from(groupedFormats.entries()).map(([category, formats]) => (
                  <motion.div
                    key={`category-${category}`}
                    className="space-y-1"
                  >
                    <motion.div className="text-xs font-medium text-gray-600 flex items-center justify-between">
                      <span>{category} ({formats.length}):</span>
                      {category === 'Unknown' && (
                        <span className="text-xs text-orange-600">❓ Auto-detected</span>
                      )}
                    </motion.div>
                    <div className="grid grid-cols-2 gap-1">
                      {formats.map((format) => (
                        <motion.label
                          key={`format-${category}-${format.ext}`}
                          className={`inline-flex items-center space-x-1 px-2 py-1 rounded cursor-pointer transition-colors text-xs ${
                            selectedFormats.has(format.ext)
                              ? 'bg-green-100 border border-green-300 text-green-800'
                              : format.isKnown
                                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200'
                          }`}
                          onMouseDown={handleInteractionEvent}
                          title={`${format.description} (${format.count} files)`}
                          variants={buttonVariants}
                          whileHover="hover"
                          whileTap="tap"
                        >
                          <motion.input
                            type="checkbox"
                            checked={selectedFormats.has(format.ext)}
                            onChange={() => toggleFormat(format.ext)}
                            onMouseDown={handleInteractionEvent}
                            className="w-3 h-3 text-green-600 rounded focus:ring-green-500"
                          />
                          <span className="text-xs">{format.icon}</span>
                          <span className="whitespace-nowrap text-xs flex-1">{format.ext}</span>
                          <span className="text-xs text-gray-400">({format.count})</span>
                        </motion.label>
                      ))}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-xs text-gray-500 text-center py-2">
                  No formats found matching search criteria
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded p-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="font-medium mb-1">🔍 Format Detection Debug:</div>
              <div>• Total files in repo: {inputData ? inputData.contents.filter(item => item.type === 'file').length : 0}</div>
              <div>• Selected folders: {selectedFolders.size}</div>
              <div>• Include root files: {includeRootFiles ? 'Yes' : 'No'}</div>
              <div>• Available formats: {availableFormats.length}</div>
              {selectedFolders.size === 0 && !includeRootFiles && (
                <div className="text-red-600 mt-1">⚠️ Select folders or enable root files to see formats</div>
              )}
            </motion.div>
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
        </motion.div>

        {/* **APPLY FILTERS BUTTON WITH REF FOR AUTO-EXECUTION** */}
        <motion.button
          ref={applyButtonRef} // Add the ref here for auto-execution
          onClick={applyFilters}
          onMouseDown={handleInteractionEvent}
          disabled={isProcessing || !inputData || (selectedFolders.size === 0 && !includeRootFiles)}
          className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 mb-3 ${
            isProcessing || !inputData || (selectedFolders.size === 0 && !includeRootFiles)
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg'
          }`}
          variants={buttonVariants}
          initial="idle"
          whileHover={!isProcessing && inputData && (selectedFolders.size > 0 || includeRootFiles) ? "hover" : "idle"}
          whileTap={!isProcessing && inputData && (selectedFolders.size > 0 || includeRootFiles) ? "tap" : "idle"}
        >
          <motion.div className="flex items-center justify-center space-x-2">
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
                <span>✨</span>
              </>
            )}
          </motion.div>
        </motion.button>

        {/* Connection Status */}
        <motion.div className="mb-3" variants={itemVariants}>
          <motion.div
            className={`text-xs px-3 py-2 rounded-full inline-block transition-all duration-300 ${
              inputData
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-gray-100 text-gray-600 border border-gray-300'
            }`}
          >
            <span>
              {inputData ? '🔗 Connected to GitNode' : '⏸️ Waiting for GitNode data'}
            </span>
          </motion.div>
        </motion.div>

        {/* **ADDED: Error Display** */}
        {error && (
          <motion.div
            className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            ❌ {error}
          </motion.div>
        )}

        {/* Filter Results */}
        {filteredData && (
          <motion.div
            className="text-xs bg-white border border-purple-200 rounded-lg overflow-hidden nowheel shadow-lg"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onMouseDown={handleInteractionEvent}
          >
            <motion.div
              className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 cursor-pointer hover:from-purple-100 hover:to-pink-100 transition-all duration-300"
              onClick={() => setIsExpanded(!isExpanded)}
              onMouseDown={handleInteractionEvent}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <div className="flex items-center justify-between">
                <motion.div className="font-medium text-purple-800">
                  ✅ Filtered Results
                </motion.div>
                <motion.span
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="text-purple-600"
                >
                  ▼
                </motion.span>
              </div>
              <motion.div className="text-purple-700 text-xs mt-1">
                {filteredData.originalCount} → {filteredData.filteredCount} items
              </motion.div>
            </motion.div>

            {isExpanded && (
              <motion.div
                className="max-h-48 overflow-y-auto bg-white p-2 nowheel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
                onMouseDown={handleInteractionEvent}
              >
                {filteredData.contents.slice(0, 20).map((item) => (
                  <motion.div
                    key={`result-${item.path}`}
                    className="flex items-center space-x-2 py-1 hover:bg-purple-50 rounded transition-colors"
                    whileHover={{ scale: 1.01, x: 2 }}
                  >
                    <span className="text-sm">
                      {item.type === 'folder' ? '📁' : (knownFormats.get(item.name.split('.').pop()?.toLowerCase())?.icon || '📄')}
                    </span>
                    <span className="text-xs text-gray-700 flex-1">{item.name}</span>
                  </motion.div>
                ))}
                {filteredData.contents.length > 20 && (
                  <motion.div
                    className="text-xs text-gray-500 text-center py-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    ...and {filteredData.contents.length - 20} more items ✨
                  </motion.div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </motion.div>

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ 
          background: 'linear-gradient(45deg, #10b981, #3b82f6)',
          width: '12px',
          height: '12px',
          border: '2px solid white',
          boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)'
        }}
        isConnectable={isConnectable}
      />
    </motion.div>
  );
};

export default FilterNode;
