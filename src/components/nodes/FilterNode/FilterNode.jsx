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

  const [selectedFolders, setSelectedFolders] = useState(new Set());
  const [selectedFormats, setSelectedFormats] = useState(new Set());
  const [folderSearchTerm, setFolderSearchTerm] = useState('');
  const [includeRootFiles, setIncludeRootFiles] = useState(true);

  const { setNodes, getNodes, getEdges } = useReactFlow();
  const nodeRef = useRef(null);

  // Motion values declared at top level
  const scale = useMotionValue(1);
  const y = useMotionValue(0);
  const glowOpacity = useMotionValue(0);
  const selectedFoldersCount = useMotionValue(0);
  const selectedFormatsCount = useMotionValue(0);

  // Transform values
  const boxShadow = useTransform(
    [scale, glowOpacity],
    ([s, glow]) => `0px ${s * 8}px ${s * 25}px rgba(147, 51, 234, ${glow * 0.15})`
  );

  const pulseScale = useTransform(glowOpacity, [0, 1], [1, 1.02]);
  const foldersCountScale = useTransform(selectedFoldersCount, [0, 10], [1, 1.2]);
  const formatsCountScale = useTransform(selectedFormatsCount, [0, 20], [1, 1.2]);

  // Static format definitions - moved outside to prevent re-initialization
  const formatDefinitions = useMemo(() => new Map([
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
    ['html', { icon: '🌐', category: 'Web', description: 'HTML' }],
    ['css', { icon: '🎨', category: 'Web', description: 'CSS' }],
    ['scss', { icon: '🎨', category: 'Web', description: 'SASS' }],
    ['sass', { icon: '🎨', category: 'Web', description: 'SASS' }],
    ['less', { icon: '🎨', category: 'Web', description: 'LESS' }],
    ['vue', { icon: '💚', category: 'Web', description: 'Vue.js' }],
    ['svelte', { icon: '🧡', category: 'Web', description: 'Svelte' }],
    ['json', { icon: '📋', category: 'Data', description: 'JSON' }],
    ['xml', { icon: '📄', category: 'Data', description: 'XML' }],
    ['csv', { icon: '📊', category: 'Data', description: 'CSV' }],
    ['yml', { icon: '⚙️', category: 'Config', description: 'YAML' }],
    ['yaml', { icon: '⚙️', category: 'Config', description: 'YAML' }],
    ['toml', { icon: '⚙️', category: 'Config', description: 'TOML' }],
    ['ini', { icon: '⚙️', category: 'Config', description: 'INI' }],
    ['env', { icon: '🔐', category: 'Config', description: 'Environment' }],
    ['config', { icon: '⚙️', category: 'Config', description: 'Config' }],
    ['conf', { icon: '⚙️', category: 'Config', description: 'Config' }],
    ['md', { icon: '📝', category: 'Documentation', description: 'Markdown' }],
    ['txt', { icon: '📄', category: 'Documentation', description: 'Text' }],
    ['rst', { icon: '📝', category: 'Documentation', description: 'reStructuredText' }],
    ['adoc', { icon: '📝', category: 'Documentation', description: 'AsciiDoc' }],
    ['png', { icon: '🖼️', category: 'Image', description: 'PNG' }],
    ['jpg', { icon: '🖼️', category: 'Image', description: 'JPEG' }],
    ['jpeg', { icon: '🖼️', category: 'Image', description: 'JPEG' }],
    ['gif', { icon: '🖼️', category: 'Image', description: 'GIF' }],
    ['svg', { icon: '🎨', category: 'Image', description: 'SVG' }],
    ['webp', { icon: '🖼️', category: 'Image', description: 'WebP' }],
    ['ico', { icon: '🖼️', category: 'Image', description: 'Icon' }],
    ['pdf', { icon: '📕', category: 'Document', description: 'PDF' }],
    ['doc', { icon: '📄', category: 'Document', description: 'Word Document' }],
    ['docx', { icon: '📄', category: 'Document', description: 'Word Document' }],
    ['gitignore', { icon: '🚫', category: 'Config', description: 'Git Ignore' }],
    ['dockerfile', { icon: '🐳', category: 'Config', description: 'Docker' }],
    ['license', { icon: '📜', category: 'Documentation', description: 'License' }],
    ['readme', { icon: '📖', category: 'Documentation', description: 'README' }],
    ['makefile', { icon: '🔨', category: 'Build', description: 'Makefile' }],
    ['cmake', { icon: '🔨', category: 'Build', description: 'CMake' }],
    ['gradle', { icon: '🔨', category: 'Build', description: 'Gradle' }],
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

  const handleMouseEnter = useCallback(() => {
    if (!selected && !isProcessing) {
      setIsHovered(true);
      scale.set(1.02);
      y.set(-2);
      glowOpacity.set(0.3);
    }
  }, [selected, isProcessing, scale, y, glowOpacity]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (!isProcessing) {
      scale.set(1);
      y.set(0);
      glowOpacity.set(0);
    }
  }, [isProcessing, scale, y, glowOpacity]);

  useEffect(() => {
    if (isProcessing) {
      glowOpacity.set(0.5);
    } else {
      glowOpacity.set(0);
    }
  }, [isProcessing, glowOpacity]);

  useEffect(() => {
    selectedFoldersCount.set(selectedFolders.size);
  }, [selectedFolders.size, selectedFoldersCount]);

  useEffect(() => {
    selectedFormatsCount.set(selectedFormats.size);
  }, [selectedFormats.size, selectedFormatsCount]);

  // Debounced node data update
  useEffect(() => {
    const timeoutId = setTimeout(() => {
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
                lastUpdated: new Date().toISOString()
              }
            };
          }
          return node;
        })
      );
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [inputData, filteredData, selectedFolders, selectedFormats, includeRootFiles, id, setNodes]);

  // Listen for data from connected GitNode
  useEffect(() => {
    const checkForInputData = () => {
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
    };

    checkForInputData();
  }, [getEdges, getNodes, id]);

  // FIXED: Stable filtered folders calculation
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

  // FIXED: Completely rewritten format detection logic
  const availableFormats = useMemo(() => {
    if (!inputData || !inputData.contents) {
      console.log('No input data available for format detection');
      return new Map();
    }

    console.log('Detecting formats from input data:', inputData.contents.length, 'items');

    const formatCategories = new Map();
    const processedFormats = new Set();

    // Helper function to get format info for a file
    const getFileFormat = (fileName) => {
      const lowerName = fileName.toLowerCase();

      // Special file name patterns
      if (lowerName === 'dockerfile') return { key: 'dockerfile', format: formatDefinitions.get('dockerfile') };
      if (lowerName.startsWith('readme')) return { key: 'readme', format: formatDefinitions.get('readme') };
      if (lowerName === 'license' || lowerName === 'licence') return { key: 'license', format: formatDefinitions.get('license') };
      if (lowerName === '.gitignore') return { key: 'gitignore', format: formatDefinitions.get('gitignore') };
      if (lowerName === 'makefile') return { key: 'makefile', format: formatDefinitions.get('makefile') };
      if (lowerName === 'package.json') return { key: 'package', format: formatDefinitions.get('package') };
      if (lowerName.endsWith('.lock')) return { key: 'lock', format: formatDefinitions.get('lock') };

      // Extension-based detection
      const parts = fileName.split('.');
      if (parts.length > 1) {
        const ext = parts[parts.length - 1].toLowerCase();
        const format = formatDefinitions.get(ext);
        if (format) {
          return { key: ext, format };
        }
      }

      return null;
    };

    // Helper function to add format to categories
    const addFormatToCategories = (formatKey, format) => {
      if (!formatCategories.has(format.category)) {
        formatCategories.set(format.category, []);
      }

      const categoryFormats = formatCategories.get(format.category);
      if (!categoryFormats.some(f => f.ext === formatKey)) {
        categoryFormats.push({ ext: formatKey, ...format });
        processedFormats.add(formatKey);
      }
    };

    // Determine which files to process based on current selection
    const filesToProcess = [];

    // If root files are included, add root files
    if (includeRootFiles) {
      const rootFiles = inputData.contents.filter(item =>
        item.type === 'file' && !item.path.includes('/')
      );
      filesToProcess.push(...rootFiles);
      console.log('Added', rootFiles.length, 'root files for processing');
    }

    // If folders are selected, add files from those folders
    if (selectedFolders.size > 0) {
      selectedFolders.forEach(folderPath => {
        if (folderPath === '') {
          // Root folder - already handled above if includeRootFiles is true
          if (!includeRootFiles) {
            const rootFiles = inputData.contents.filter(item =>
              item.type === 'file' && !item.path.includes('/')
            );
            filesToProcess.push(...rootFiles);
          }
        } else {
          // Specific folder
          const folderFiles = inputData.contents.filter(item =>
            item.type === 'file' && item.path.startsWith(folderPath + '/')
          );
          filesToProcess.push(...folderFiles);
          console.log('Added', folderFiles.length, 'files from folder:', folderPath);
        }
      });
    }

    console.log('Total files to process for format detection:', filesToProcess.length);

    // Process all files and detect formats
    filesToProcess.forEach(file => {
      const formatInfo = getFileFormat(file.name);
      if (formatInfo && formatInfo.format) {
        addFormatToCategories(formatInfo.key, formatInfo.format);
      }
    });

    // Sort formats within each category
    formatCategories.forEach((formats, category) => {
      formats.sort((a, b) => a.ext.localeCompare(b.ext));
    });

    console.log('Detected format categories:', Array.from(formatCategories.keys()));
    console.log('Total unique formats:', processedFormats.size);

    return formatCategories;
  }, [inputData, selectedFolders, includeRootFiles, formatDefinitions]);

  const applyFilters = useCallback(async () => {
    if (!inputData || !inputData.contents) {
      console.log(`⚠️ FilterNode ${id}: No data to filter`);
      return;
    }

    setIsProcessing(true);
    console.log(`🔍 FilterNode ${id}: Applying smart filters ✨`);

    // Reduced processing time to minimize UI blocking
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

    // Apply file format filtering
    if (selectedFormats.size > 0) {
      filtered = filtered.filter(item => {
        if (item.type === 'folder') return true;

        const fileName = item.name.toLowerCase();
        const ext = item.name.split('.').pop()?.toLowerCase();

        // Check special file patterns
        if (selectedFormats.has('dockerfile') && fileName === 'dockerfile') return true;
        if (selectedFormats.has('readme') && fileName.startsWith('readme')) return true;
        if (selectedFormats.has('license') && (fileName === 'license' || fileName === 'licence')) return true;
        if (selectedFormats.has('gitignore') && fileName === '.gitignore') return true;
        if (selectedFormats.has('makefile') && fileName === 'makefile') return true;
        if (selectedFormats.has('package') && fileName === 'package.json') return true;
        if (selectedFormats.has('lock') && fileName.endsWith('.lock')) return true;

        // Check extension-based formats
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
        includeRootFiles
      },
      filteredAt: new Date().toISOString()
    };

    setFilteredData(result);
    setIsProcessing(false);

    console.log(`✨ FilterNode ${id}: Filtering complete! ${inputData.contents.length} → ${filtered.length} items`);
  }, [inputData, selectedFolders, selectedFormats, includeRootFiles, id]);

  const handleNodeExecution = useCallback(async (inputData) => {
    console.log(`🎯 FilterNode ${id}: Executing with input data:`, inputData);

    Object.values(inputData).forEach(data => {
      if (data.repoData) {
        console.log(`📥 FilterNode ${id}: Processing repo data from connected GitNode`);
        setInputData(data.repoData);
      }
    });

    if (Object.keys(inputData).length === 0) {
      console.log(`⚠️ FilterNode ${id}: No input data available for filtering`);
    }
  }, [id]);

  // FIXED: Folder toggle without clearing formats unnecessarily
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
    // Don't clear formats automatically - let user decide
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
    const allFormats = new Set();
    availableFormats.forEach(formats => {
      formats.forEach(format => allFormats.add(format.ext));
    });
    setSelectedFormats(allFormats);
  }, [availableFormats]);

  const clearAllFormats = useCallback(() => {
    setSelectedFormats(new Set());
  }, []);

  // Simplified animation variants
  const containerVariants = {
    initial: { opacity: 0, scale: 0.98 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    }
  };

  const itemVariants = {
    initial: { opacity: 0, y: 5 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    }
  };

  const buttonVariants = {
    idle: { scale: 1 },
    hover: {
      scale: 1.02,
      transition: { type: "spring", stiffness: 400, damping: 20 }
    },
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
        scale: pulseScale,
        y,
        boxShadow,
        minHeight: '400px'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPointerDown={(e) => {
        if (e.target.closest('input, button, select, .nowheel')) {
          e.stopPropagation();
        }
      }}
    >
      {/* Processing glow effect */}
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

        {/* Step 1: Folder Selection */}
        <motion.div className="mb-4" variants={itemVariants}>
          <motion.div className="flex items-center justify-between mb-2">
            <motion.div className="text-xs font-medium text-gray-700">
              📁 Step 1: Select Folders
              <motion.span
                className="ml-2 text-blue-600"
                style={{ scale: foldersCountScale }}
              >
                ({selectedFolders.size})
              </motion.span>
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

          {/* Folder Search */}
          <motion.div className="mb-2" variants={itemVariants}>
            <motion.input
              type="text"
              placeholder="🔍 Search folders..."
              value={folderSearchTerm}
              onChange={(e) => setFolderSearchTerm(e.target.value)}
              onMouseDown={handleInteractionEvent}
              className="w-full p-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200"
              whileFocus={{ scale: 1.01 }}
            />
          </motion.div>

          {/* Folder Checkboxes */}
          <motion.div
            className="space-y-1 max-h-32 overflow-y-auto nowheel"
            onMouseDown={handleInteractionEvent}
            variants={itemVariants}
          >
            <div className="grid grid-cols-1 gap-1">
              <AnimatePresence mode="popLayout">
                {filteredFolders.map((folder) => (
                  <motion.label
                    key={`folder-${folder.path || 'root'}`}
                    className={`inline-flex items-center space-x-2 px-2 py-1 rounded cursor-pointer transition-colors text-xs ${
                      selectedFolders.has(folder.path)
                        ? 'bg-blue-100 border border-blue-300 text-blue-800'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                    onMouseDown={handleInteractionEvent}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    layout
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
              </AnimatePresence>
            </div>
          </motion.div>

          <AnimatePresence>
            {selectedFolders.size > 0 && (
              <motion.div
                className="text-xs text-blue-600 mt-1"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
              >
                ✓ {selectedFolders.size} folder{selectedFolders.size !== 1 ? 's' : ''} selected
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Step 2: Format Selection - FIXED to always show when formats are available */}
        <AnimatePresence>
          {availableFormats.size > 0 && (
            <motion.div
              className="mb-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              variants={itemVariants}
            >
              <motion.div className="flex items-center justify-between mb-2">
                <motion.div className="text-xs font-medium text-gray-700">
                  📄 Step 2: Select File Formats
                  <motion.span
                    className="text-gray-500 ml-2"
                    style={{ scale: formatsCountScale }}
                  >
                    ({Array.from(availableFormats.values()).reduce((total, formats) => total + formats.length, 0)} available)
                  </motion.span>
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

              {/* Format checkboxes */}
              <motion.div
                className="space-y-2 max-h-32 overflow-y-auto nowheel"
                onMouseDown={handleInteractionEvent}
                variants={itemVariants}
              >
                <AnimatePresence mode="popLayout">
                  {Array.from(availableFormats.entries()).map(([category, formats]) => (
                    <motion.div
                      key={`category-${category}`}
                      className="space-y-1"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      layout
                    >
                      <motion.div className="text-xs font-medium text-gray-600">
                        {category} ({formats.length}):
                      </motion.div>
                      <div className="grid grid-cols-3 gap-1">
                        <AnimatePresence mode="popLayout">
                          {formats.map((format) => (
                            <motion.label
                              key={`format-${category}-${format.ext}`}
                              className={`inline-flex items-center space-x-1 px-2 py-1 rounded cursor-pointer transition-colors text-xs ${
                                selectedFormats.has(format.ext)
                                  ? 'bg-green-100 border border-green-300 text-green-800'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                              }`}
                              onMouseDown={handleInteractionEvent}
                              title={format.description}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              variants={buttonVariants}
                              whileHover="hover"
                              whileTap="tap"
                              layout
                            >
                              <motion.input
                                type="checkbox"
                                checked={selectedFormats.has(format.ext)}
                                onChange={() => toggleFormat(format.ext)}
                                onMouseDown={handleInteractionEvent}
                                className="w-3 h-3 text-green-600 rounded focus:ring-green-500"
                              />
                              <span className="text-xs">{format.icon}</span>
                              <span className="whitespace-nowrap text-xs">{format.ext}</span>
                            </motion.label>
                          ))}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>

              <AnimatePresence>
                {selectedFormats.size > 0 && (
                  <motion.div
                    className="text-xs text-green-600 mt-1"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                  >
                    ✓ {selectedFormats.size} format{selectedFormats.size !== 1 ? 's' : ''} selected
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Debug info for format detection */}
        {inputData && availableFormats.size === 0 && (
          <motion.div
            className="mb-3 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded p-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            ⚠️ No file formats detected.
            {selectedFolders.size === 0 && !includeRootFiles && ' Select folders or enable root files first.'}
            {(selectedFolders.size > 0 || includeRootFiles) && ' The selected location may not contain supported file types.'}
          </motion.div>
        )}

        {/* Apply Filters Button */}
        <motion.button
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

        {/* Filter Results */}
        <AnimatePresence>
          {filteredData && (
            <motion.div
              className="text-xs bg-white border border-purple-200 rounded-lg overflow-hidden nowheel shadow-lg"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
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
                    <AnimatePresence mode="popLayout">
                      {filteredData.contents.slice(0, 20).map((item) => (
                        <motion.div
                          key={`result-${item.path}`}
                          className="flex items-center space-x-2 py-1 hover:bg-purple-50 rounded transition-colors"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          whileHover={{ scale: 1.01, x: 2 }}
                          layout
                        >
                          <span className="text-sm">
                            {item.type === 'folder' ? '📁' : (formatDefinitions.get(item.name.split('.').pop()?.toLowerCase())?.icon || '📄')}
                          </span>
                          <span className="text-xs text-gray-700 flex-1">{item.name}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
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
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
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
