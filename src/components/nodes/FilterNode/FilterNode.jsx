import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import PlayButton from '../../ui/PlayButton';

const FilterNode = ({ id, data, isConnectable, selected }) => {
  const [inputData, setInputData] = useState(data?.inputData || null);
  const [filteredData, setFilteredData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Enhanced filter settings
  const [selectedFolders, setSelectedFolders] = useState(new Set());
  const [selectedFormats, setSelectedFormats] = useState(new Set());
  const [folderSearchTerm, setFolderSearchTerm] = useState('');

  const { setNodes, getNodes, getEdges } = useReactFlow();

  // Auto-detected file formats
  const detectedFormats = new Map([
    ['js', { icon: '🟨', category: 'Programming', description: 'JavaScript' }],
    ['jsx', { icon: '⚛️', category: 'Programming', description: 'React JSX' }],
    ['ts', { icon: '🔷', category: 'Programming', description: 'TypeScript' }],
    ['tsx', { icon: '⚛️', category: 'Programming', description: 'React TypeScript' }],
    ['py', { icon: '🐍', category: 'Programming', description: 'Python' }],
    ['java', { icon: '☕', category: 'Programming', description: 'Java' }],
    ['cpp', { icon: '⚙️', category: 'Programming', description: 'C++' }],
    ['c', { icon: '⚙️', category: 'Programming', description: 'C' }],
    ['cs', { icon: '🔷', category: 'Programming', description: 'C#' }],
    ['php', { icon: '🐘', category: 'Programming', description: 'PHP' }],
    ['rb', { icon: '💎', category: 'Programming', description: 'Ruby' }],
    ['go', { icon: '🐹', category: 'Programming', description: 'Go' }],
    ['rs', { icon: '🦀', category: 'Programming', description: 'Rust' }],
    ['html', { icon: '🌐', category: 'Web', description: 'HTML' }],
    ['css', { icon: '🎨', category: 'Web', description: 'CSS' }],
    ['scss', { icon: '🎨', category: 'Web', description: 'SASS' }],
    ['json', { icon: '📋', category: 'Data', description: 'JSON' }],
    ['xml', { icon: '📄', category: 'Data', description: 'XML' }],
    ['yml', { icon: '⚙️', category: 'Config', description: 'YAML' }],
    ['yaml', { icon: '⚙️', category: 'Config', description: 'YAML' }],
    ['md', { icon: '📝', category: 'Documentation', description: 'Markdown' }],
    ['txt', { icon: '📄', category: 'Documentation', description: 'Text' }],
    ['png', { icon: '🖼️', category: 'Image', description: 'PNG' }],
    ['jpg', { icon: '🖼️', category: 'Image', description: 'JPEG' }],
    ['jpeg', { icon: '🖼️', category: 'Image', description: 'JPEG' }],
    ['gif', { icon: '🖼️', category: 'Image', description: 'GIF' }],
    ['svg', { icon: '🎨', category: 'Image', description: 'SVG' }],
    ['pdf', { icon: '📕', category: 'Document', description: 'PDF' }],
  ]);

  const handleDelete = (e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('deleteNode', { detail: { id } }));
  };

  const handleInteractionEvent = (e) => {
    e.stopPropagation();
  };

  // Update node data when filters change[1]
  useEffect(() => {
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
              lastUpdated: new Date().toISOString()
            }
          };
        }
        return node;
      })
    );
  }, [inputData, filteredData, selectedFolders, selectedFormats, id, setNodes]);

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

  // Get filtered folders based on search term
  const filteredFolders = useMemo(() => {
    if (!inputData || !inputData.contents) return [];

    const folders = inputData.contents.filter(item => item.type === 'folder');

    if (!folderSearchTerm) return folders;

    return folders.filter(folder =>
      folder.name.toLowerCase().includes(folderSearchTerm.toLowerCase()) ||
      folder.path.toLowerCase().includes(folderSearchTerm.toLowerCase())
    );
  }, [inputData, folderSearchTerm]);

  // Get available formats in selected folders
  const availableFormats = useMemo(() => {
    if (!inputData || !inputData.contents || selectedFolders.size === 0) {
      return new Map();
    }

    const formatsInSelectedFolders = new Set();
    const formatCategories = new Map();

    inputData.contents.forEach(item => {
      if (item.type === 'file') {
        // Check if file is in any selected folder
        const isInSelectedFolder = Array.from(selectedFolders).some(folderPath =>
          item.path.startsWith(folderPath + '/') || folderPath === ''
        );

        if (isInSelectedFolder) {
          const ext = item.name.split('.').pop()?.toLowerCase();
          if (ext) {
            formatsInSelectedFolders.add(ext);
            const format = detectedFormats.get(ext) || { icon: '📄', category: 'Other', description: ext.toUpperCase() };

            if (!formatCategories.has(format.category)) {
              formatCategories.set(format.category, []);
            }

            if (!formatCategories.get(format.category).some(f => f.ext === ext)) {
              formatCategories.get(format.category).push({ ext, ...format });
            }
          }
        }
      }
    });

    return formatCategories;
  }, [inputData, selectedFolders, detectedFormats]);

  // Apply filters to the data
  const applyFilters = async () => {
    if (!inputData || !inputData.contents) {
      console.log(`⚠️ FilterNode ${id}: No data to filter`);
      return;
    }

    setIsProcessing(true);
    console.log(`🔍 FilterNode ${id}: Applying filters - Folders: ${selectedFolders.size}, Formats: ${selectedFormats.size}`);

    await new Promise(resolve => setTimeout(resolve, 300));

    let filtered = [...inputData.contents];

    // Apply folder filtering first
    if (selectedFolders.size > 0) {
      filtered = filtered.filter(item => {
        if (item.type === 'folder') {
          return selectedFolders.has(item.path);
        } else {
          // Include files that are in selected folders
          return Array.from(selectedFolders).some(folderPath =>
            item.path.startsWith(folderPath + '/') || selectedFolders.has('')
          );
        }
      });
    }

    // Apply file format filtering
    if (selectedFormats.size > 0) {
      filtered = filtered.filter(item => {
        if (item.type === 'folder') return true; // Keep folders

        const ext = item.name.split('.').pop()?.toLowerCase();
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
        selectedFormats: Array.from(selectedFormats)
      },
      filteredAt: new Date().toISOString()
    };

    setFilteredData(result);
    setIsProcessing(false);

    console.log(`✅ FilterNode ${id}: Filtered ${inputData.contents.length} → ${filtered.length} items`);
  };

  // PlayButton execution handler
  const handleNodeExecution = async (inputData) => {
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
  };

  const toggleFolder = (folderPath) => {
    const newSelected = new Set(selectedFolders);
    if (newSelected.has(folderPath)) {
      newSelected.delete(folderPath);
    } else {
      newSelected.add(folderPath);
    }
    setSelectedFolders(newSelected);

    // Clear format selection when folders change
    setSelectedFormats(new Set());
  };

  const toggleFormat = (format) => {
    const newSelected = new Set(selectedFormats);
    if (newSelected.has(format)) {
      newSelected.delete(format);
    } else {
      newSelected.add(format);
    }
    setSelectedFormats(newSelected);
  };

  const selectAllFolders = () => {
    const allFolderPaths = new Set(filteredFolders.map(folder => folder.path));
    setSelectedFolders(allFolderPaths);
    setSelectedFormats(new Set());
  };

  const clearAllFolders = () => {
    setSelectedFolders(new Set());
    setSelectedFormats(new Set());
  };

  const selectAllFormats = () => {
    const allFormats = new Set();
    availableFormats.forEach(formats => {
      formats.forEach(format => allFormats.add(format.ext));
    });
    setSelectedFormats(allFormats);
  };

  const clearAllFormats = () => {
    setSelectedFormats(new Set());
  };

  return (
    <motion.div 
      className={`relative w-80 bg-gradient-to-br from-purple-100 to-purple-200 border-2 border-purple-300 rounded-xl shadow-lg transition-all duration-200 group ${
        selected ? 'ring-2 ring-purple-200' : ''
      }`}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {/* Corner Play Button */}
      <PlayButton
        nodeId={id}
        nodeType="filter"
        onExecute={handleNodeExecution}
        disabled={isProcessing}
      />

      {/* Delete button */}
      <motion.button
        onClick={handleDelete}
        className={`absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 shadow-lg z-10 ${
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        title="Delete node"
        whileHover={{ scale: 1.2, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
      >
        ×
      </motion.button>

      {/* Input Handle */}
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

      {/* Node Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-4">
          <motion.span 
            className="text-xl"
            animate={{ rotate: isProcessing ? 360 : 0 }}
            transition={{ duration: 1, repeat: isProcessing ? Infinity : 0, ease: "linear" }}
          >
            🔍
          </motion.span>
          <h3 className="text-sm font-semibold text-purple-800">
            Smart Filter
          </h3>
        </div>

        {/* Step 1: Folder Selection */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-gray-700">📁 Step 1: Select Folders</div>
            <div className="flex space-x-1">
              <motion.button
                onClick={selectAllFolders}
                onMouseDown={handleInteractionEvent}
                className="nopan text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                All
              </motion.button>
              <motion.button
                onClick={clearAllFolders}
                onMouseDown={handleInteractionEvent}
                className="nopan text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Clear
              </motion.button>
            </div>
          </div>

          {/* Folder Search */}
          <div className="mb-2">
            <input
              type="text"
              placeholder="🔍 Search folders..."
              value={folderSearchTerm}
              onChange={(e) => setFolderSearchTerm(e.target.value)}
              onMouseDown={handleInteractionEvent}
              className="nopan w-full p-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Folder Checkboxes */}
          <div className="space-y-1 max-h-32 overflow-y-auto nopan" onMouseDown={handleInteractionEvent} onWheel={handleInteractionEvent}>
            <div className="grid grid-cols-1 gap-1 nopan">
              {filteredFolders.map(folder => (
                <motion.label
                  key={folder.path}
                  className={`nopan inline-flex items-center space-x-2 px-2 py-1 rounded cursor-pointer transition-colors text-xs ${
                    selectedFolders.has(folder.path)
                      ? 'bg-blue-100 border border-blue-300 text-blue-800'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  onMouseDown={handleInteractionEvent}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <input
                    type="checkbox"
                    checked={selectedFolders.has(folder.path)}
                    onChange={() => toggleFolder(folder.path)}
                    onMouseDown={handleInteractionEvent}
                    className="nopan w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">📁</span>
                  <span className="flex-1 text-xs truncate" title={folder.path}>{folder.name}</span>
                </motion.label>
              ))}
            </div>
          </div>

          {selectedFolders.size > 0 && (
            <div className="text-xs text-blue-600 mt-1">
              ✓ {selectedFolders.size} folder{selectedFolders.size !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        {/* Step 2: Format Selection (only show if folders are selected) */}
        {selectedFolders.size > 0 && availableFormats.size > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-gray-700">📄 Step 2: Select File Formats</div>
              <div className="flex space-x-1">
                <motion.button
                  onClick={selectAllFormats}
                  onMouseDown={handleInteractionEvent}
                  className="nopan text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  All
                </motion.button>
                <motion.button
                  onClick={clearAllFormats}
                  onMouseDown={handleInteractionEvent}
                  className="nopan text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Clear
                </motion.button>
              </div>
            </div>

            <div className="space-y-2 max-h-32 overflow-y-auto nopan" onMouseDown={handleInteractionEvent} onWheel={handleInteractionEvent}>
              {Array.from(availableFormats.entries()).map(([category, formats]) => (
                <div key={category} className="space-y-1 nopan">
                  <div className="text-xs font-medium text-gray-600">{category}:</div>
                  <div className="grid grid-cols-3 gap-1 nopan">
                    {formats.map(format => (
                      <motion.label
                        key={format.ext}
                        className={`nopan inline-flex items-center space-x-1 px-2 py-1 rounded cursor-pointer transition-colors text-xs ${
                          selectedFormats.has(format.ext)
                            ? 'bg-green-100 border border-green-300 text-green-800'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                        onMouseDown={handleInteractionEvent}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        title={format.description}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFormats.has(format.ext)}
                          onChange={() => toggleFormat(format.ext)}
                          onMouseDown={handleInteractionEvent}
                          className="nopan w-3 h-3 text-green-600 rounded focus:ring-green-500"
                        />
                        <span className="text-xs">{format.icon}</span>
                        <span className="whitespace-nowrap text-xs">{format.ext}</span>
                      </motion.label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {selectedFormats.size > 0 && (
              <div className="text-xs text-green-600 mt-1">
                ✓ {selectedFormats.size} format{selectedFormats.size !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        )}

        {/* Apply Filters Button */}
        <motion.button
          onClick={applyFilters}
          onMouseDown={handleInteractionEvent}
          disabled={isProcessing || !inputData || selectedFolders.size === 0}
          className={`nopan w-full py-2 px-4 rounded-lg font-medium text-sm transition-all duration-200 mb-3 ${
            isProcessing || !inputData || selectedFolders.size === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-purple-500 hover:bg-purple-600 text-white hover:scale-105 active:scale-95 shadow-md'
          }`}
          whileHover={!isProcessing && inputData && selectedFolders.size > 0 ? { scale: 1.02 } : {}}
          whileTap={!isProcessing && inputData && selectedFolders.size > 0 ? { scale: 0.98 } : {}}
        >
          {isProcessing ? 'Applying Filters...' : '🔍 Apply Smart Filter'}
        </motion.button>

        {/* Connection Status */}
        <div className="mb-3">
          <div className={`text-xs px-2 py-1 rounded-full inline-block ${
            inputData 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {inputData ? '🔗 Connected to GitNode' : '⏸️ Waiting for GitNode data'}
          </div>
        </div>

        {/* Filter Results */}
        <AnimatePresence>
          {filteredData && (
            <motion.div
              className="text-xs bg-white border border-purple-200 rounded overflow-hidden nopan"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onMouseDown={handleInteractionEvent}
            >
              <div 
                className="nopan bg-purple-50 p-3 cursor-pointer hover:bg-purple-100 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
                onMouseDown={handleInteractionEvent}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-purple-800">
                    ✅ Filtered Results
                  </div>
                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-purple-600"
                  >
                    ▼
                  </motion.span>
                </div>
                <div className="text-purple-700 text-xs mt-1">
                  {filteredData.originalCount} → {filteredData.filteredCount} items
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className="max-h-48 overflow-y-auto bg-white p-2 nopan"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    onMouseDown={handleInteractionEvent}
                    onWheel={handleInteractionEvent}
                  >
                    {filteredData.contents.slice(0, 20).map((item, index) => (
                      <div key={item.path} className="nopan flex items-center space-x-2 py-1">
                        <span className="text-sm">
                          {item.type === 'folder' ? '📁' : (detectedFormats.get(item.name.split('.').pop()?.toLowerCase())?.icon || '📄')}
                        </span>
                        <span className="text-xs text-gray-700 flex-1">{item.name}</span>
                      </div>
                    ))}
                    {filteredData.contents.length > 20 && (
                      <div className="text-xs text-gray-500 text-center py-2 nopan">
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

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ 
          background: '#10b981', 
          width: '10px', 
          height: '10px',
          border: '2px solid white'
        }}
        isConnectable={isConnectable}
      />
    </motion.div>
  );
};

export default FilterNode;
