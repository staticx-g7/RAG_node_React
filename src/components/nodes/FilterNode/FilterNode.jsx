import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Handle, Position, useReactFlow } from '@xyflow/react';

const BackgroundBeams = ({ className }) => (
  <div className={`absolute inset-0 overflow-hidden ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/20 via-blue-50/20 to-sky-50/20" />
    <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-indigo-200/30 to-transparent" />
    <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-200/30 to-transparent" />
  </div>
);

// Hierarchical Folder Tree Component
const FolderTree = ({ files, selectedFolders, onFolderToggle, expandedFolders, onFolderExpand }) => {
  // Build folder hierarchy from files
  const folderHierarchy = useMemo(() => {
    const hierarchy = {};

    files.forEach(file => {
      const path = file.path || file.name || '';
      const pathParts = path.split('/').filter(part => part);

      let current = hierarchy;
      let currentPath = '';

      pathParts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!current[part]) {
          current[part] = {
            name: part,
            fullPath: currentPath,
            isFolder: index < pathParts.length - 1,
            children: {},
            files: []
          };
        }

        if (index === pathParts.length - 1) {
          // This is a file
          current[part].files.push(file);
        } else {
          // This is a folder
          current = current[part].children;
        }
      });
    });

    return hierarchy;
  }, [files]);

  const renderFolderNode = (node, depth = 0) => {
    const isExpanded = expandedFolders.has(node.fullPath);
    const isSelected = selectedFolders.has(node.fullPath);
    const hasChildren = Object.keys(node.children).length > 0;

    return (
      <div key={node.fullPath} className="select-none">
        <div
          className={`flex items-center py-1 px-2 hover:bg-gray-100 cursor-pointer text-xs ${
            isSelected ? 'bg-indigo-100 text-indigo-800' : 'text-gray-700'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => onFolderToggle(node.fullPath)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFolderExpand(node.fullPath);
              }}
              className="mr-1 w-4 h-4 flex items-center justify-center hover:bg-gray-200 rounded"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}
          <span className="mr-2">{hasChildren ? '📁' : '📄'}</span>
          <span className="truncate">{node.name}</span>
          {node.files.length > 0 && (
            <span className="ml-auto text-gray-500">({node.files.length})</span>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div>
            {Object.values(node.children).map(child => renderFolderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded bg-white">
      {Object.values(folderHierarchy).map(node => renderFolderNode(node))}
    </div>
  );
};

// File Format Selection Component
const FileFormatSelector = ({ availableFormats, selectedFormats, onFormatToggle, onSelectAll, onSelectNone }) => {
  const formatCategories = useMemo(() => {
    const categories = {
      code: { name: 'Code Files', icon: '💻', formats: [] },
      text: { name: 'Text Files', icon: '📝', formats: [] },
      data: { name: 'Data Files', icon: '📊', formats: [] },
      config: { name: 'Config Files', icon: '⚙️', formats: [] },
      other: { name: 'Other Files', icon: '📄', formats: [] }
    };

    availableFormats.forEach(format => {
      const ext = format.toLowerCase();
      if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'kt', 'swift'].includes(ext)) {
        categories.code.formats.push(format);
      } else if (['txt', 'md', 'markdown', 'rst', 'adoc'].includes(ext)) {
        categories.text.formats.push(format);
      } else if (['json', 'xml', 'csv', 'yaml', 'yml', 'toml'].includes(ext)) {
        categories.data.formats.push(format);
      } else if (['gitignore', 'gitattributes', 'dockerfile', 'makefile', 'gradle', 'properties', 'ini', 'conf'].includes(ext)) {
        categories.config.formats.push(format);
      } else {
        categories.other.formats.push(format);
      }
    });

    return Object.entries(categories).filter(([_, cat]) => cat.formats.length > 0);
  }, [availableFormats]);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-gray-700">
          File Formats ({selectedFormats.size}/{availableFormats.length})
        </span>
        <div className="flex space-x-2">
          <button
            onClick={onSelectAll}
            className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
          >
            All
          </button>
          <button
            onClick={onSelectNone}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            None
          </button>
        </div>
      </div>

      <div className="max-h-40 overflow-y-auto space-y-2">
        {formatCategories.map(([categoryKey, category]) => (
          <div key={categoryKey} className="border border-gray-200 rounded">
            <div className="px-2 py-1 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-medium text-gray-700">
                {category.icon} {category.name} ({category.formats.length})
              </span>
            </div>
            <div className="p-2 grid grid-cols-3 gap-1">
              {category.formats.map(format => (
                <label key={format} className="flex items-center space-x-1 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFormats.has(format)}
                    onChange={(e) => {
                      e.stopPropagation();
                      onFormatToggle(format, e.target.checked);
                    }}
                    className="rounded text-xs"
                    style={{ transform: 'scale(0.8)' }}
                  />
                  <span className="text-xs">.{format}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const FilterNode = ({ id, data, selected }) => {
  const { updateNodeData, getNodes, getEdges } = useReactFlow();

  // State management
  const [showSettings, setShowSettings] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectedInputData, setConnectedInputData] = useState(null);
  const [filteredFiles, setFilteredFiles] = useState([]);

  // Hierarchical selection state
  const [selectedFolders, setSelectedFolders] = useState(new Set());
  const [expandedFolders, setExpandedFolders] = useState(new Set([''])); // Root expanded by default
  const [selectedFormats, setSelectedFormats] = useState(new Set());
  const [availableFormats, setAvailableFormats] = useState([]);

  // Filter settings
  const [settings, setSettings] = useState({
    filterMode: data.filterMode || 'include',
    maxFileSize: data.maxFileSize || 5, // MB
    minFileSize: data.minFileSize || 0, // KB
    useInputData: data.useInputData !== false,
    caseSensitive: data.caseSensitive || false,
    filterByContent: data.filterByContent || false,
    contentKeywords: data.contentKeywords || [],
    preserveStructure: data.preserveStructure !== false,
    enableSmartFiltering: data.enableSmartFiltering !== false,
    useHierarchicalSelection: data.useHierarchicalSelection !== false,
  });

  const [stats, setStats] = useState({
    totalFiles: 0,
    filteredFiles: 0,
    excludedFiles: 0,
    processingTime: 0,
    lastFiltered: null,
    totalSize: 0,
    filteredSize: 0,
    selectedFolders: 0,
    selectedFormats: 0,
  });

  // Get input data from connected nodes
  const getInputData = useCallback(() => {
    try {
      const edges = getEdges();
      const nodes = getNodes();

      console.log('🔍 FilterNode looking for input data...');

      const inputEdge = edges.find(edge =>
        edge.target === id && edge.targetHandle === 'input'
      );

      if (inputEdge) {
        const inputNode = nodes.find(node => node.id === inputEdge.source);

        if (inputNode && inputNode.data) {
          let inputData = {
            files: [],
            metadata: {},
            nodeType: inputNode.type
          };

          switch (inputNode.type) {
            case 'gitNode':
              inputData.files = inputNode.data.repositoryFiles ||
                                inputNode.data.files ||
                                inputNode.data.fetchedFiles ||
                                inputNode.data.output ||
                                [];
              inputData.metadata = {
                source: 'git_node',
                repository: inputNode.data.repository || '',
                branch: inputNode.data.branch || 'main',
                totalFiles: inputNode.data.stats?.fetchedFiles || inputData.files.length,
                platform: inputNode.data.platform || 'github'
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
              inputData.files = inputNode.data.files ||
                                inputNode.data.output ||
                                [];
              inputData.metadata = {
                source: inputNode.type || 'unknown'
              };
          }

          setConnectedInputData(inputData);

          // Auto-detect available formats
          const formats = new Set();
          inputData.files.forEach(file => {
            const fileName = file.name || file.filename || '';
            const extension = fileName.split('.').pop()?.toLowerCase();
            if (extension && extension !== fileName.toLowerCase()) {
              formats.add(extension);
            }
          });
          setAvailableFormats(Array.from(formats).sort());

          return inputData;
        }
      }

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

    getInputData();
    return () => clearInterval(interval);
  }, [getInputData]);

  // Update node data when settings or filtered files change
  useEffect(() => {
    const filteredContent = filteredFiles
      .map(file => file.content || file.text || '')
      .filter(content => content.trim().length > 0)
      .join('\n\n');

    const totalFilteredSize = filteredFiles.reduce((sum, file) => sum + (file.size || 0), 0);

    updateNodeData(id, {
      ...settings,
      stats: {
        ...stats,
        filteredSize: totalFilteredSize,
        selectedFolders: selectedFolders.size,
        selectedFormats: selectedFormats.size,
      },
      connectedInputData,

      // Store filtered data in multiple formats for compatibility
      filteredFiles: filteredFiles,
      files: filteredFiles,
      selectedFiles: filteredFiles,
      output: filteredFiles,
      processedFiles: filteredFiles,

      // Content data
      filteredContent: filteredContent,
      content: filteredContent,
      text: filteredContent,
      extractedText: filteredContent,

      // Selection metadata
      selectedFolders: Array.from(selectedFolders),
      selectedFormats: Array.from(selectedFormats),

      lastUpdated: Date.now()
    });
  }, [settings, stats, connectedInputData, filteredFiles, selectedFolders, selectedFormats, id, updateNodeData]);

  // Handle setting changes
  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
  };

  // Folder selection handlers
  const handleFolderToggle = (folderPath) => {
    const newSelected = new Set(selectedFolders);
    if (newSelected.has(folderPath)) {
      newSelected.delete(folderPath);
    } else {
      newSelected.add(folderPath);
    }
    setSelectedFolders(newSelected);
  };

  const handleFolderExpand = (folderPath) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  // Format selection handlers
  const handleFormatToggle = (format, isSelected) => {
    const newSelected = new Set(selectedFormats);
    if (isSelected) {
      newSelected.add(format);
    } else {
      newSelected.delete(format);
    }
    setSelectedFormats(newSelected);
  };

  const handleSelectAllFormats = () => {
    setSelectedFormats(new Set(availableFormats));
  };

  const handleSelectNoFormats = () => {
    setSelectedFormats(new Set());
  };

  // Enhanced filter logic with hierarchical selection
  const shouldIncludeFile = useCallback((file) => {
    const fileName = file.name || file.filename || '';
    const filePath = file.path || fileName;
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    const fileSize = file.size || 0;
    const fileContent = file.content || file.text || '';

    // Size filters
    if (fileSize > settings.maxFileSize * 1024 * 1024) return false;
    if (fileSize < settings.minFileSize * 1024) return false;

    // Hierarchical folder selection
    if (settings.useHierarchicalSelection && selectedFolders.size > 0) {
      const fileFolder = filePath.substring(0, filePath.lastIndexOf('/')) || '';
      const isInSelectedFolder = Array.from(selectedFolders).some(folder =>
        filePath.startsWith(folder) || folder === '' // Root folder
      );
      if (!isInSelectedFolder) return false;
    }

    // Format selection
    if (selectedFormats.size > 0) {
      if (!selectedFormats.has(fileExtension)) return false;
    }

    // Content keyword filter
    if (settings.filterByContent && settings.contentKeywords.length > 0) {
      let hasKeyword = false;
      for (const keyword of settings.contentKeywords) {
        const regex = new RegExp(keyword, settings.caseSensitive ? 'g' : 'gi');
        if (regex.test(fileContent)) {
          hasKeyword = true;
          break;
        }
      }
      if (!hasKeyword) return false;
    }

    return true;
  }, [settings, selectedFolders, selectedFormats]);

  // Main filtering process
  const processFiltering = useCallback(async () => {
    const { files: inputFiles } = getInputData();

    if (!inputFiles || inputFiles.length === 0) {
      alert('Please connect a node with files to filter');
      return;
    }

    setIsProcessing(true);
    const startTime = Date.now();

    try {
      console.log('🚀 Starting hierarchical filtering...');
      console.log('📁 Files to filter:', inputFiles.length);
      console.log('📂 Selected folders:', Array.from(selectedFolders));
      console.log('📄 Selected formats:', Array.from(selectedFormats));

      const filtered = inputFiles.filter(shouldIncludeFile);
      const processingTime = Date.now() - startTime;
      const totalInputSize = inputFiles.reduce((sum, file) => sum + (file.size || 0), 0);
      const totalFilteredSize = filtered.reduce((sum, file) => sum + (file.size || 0), 0);

      const newStats = {
        totalFiles: inputFiles.length,
        filteredFiles: filtered.length,
        excludedFiles: inputFiles.length - filtered.length,
        processingTime,
        lastFiltered: Date.now(),
        totalSize: totalInputSize,
        filteredSize: totalFilteredSize,
        selectedFolders: selectedFolders.size,
        selectedFormats: selectedFormats.size,
      };

      setStats(newStats);
      setFilteredFiles(filtered);

      console.log('✅ Hierarchical filtering completed successfully');

    } catch (error) {
      console.error('❌ Filtering error:', error);
      alert(`Filtering failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [getInputData, shouldIncludeFile, selectedFolders, selectedFormats]);

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
          selected ? 'border-indigo-400 shadow-indigo-100' : 'border-gray-200'
        }`}
        style={{ width: '320px', minHeight: '140px' }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        <BackgroundBeams className="rounded-xl" />

        {/* Header */}
        <div className="relative z-10 p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">🗂️</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Hierarchical Filter</h3>
                <p className="text-xs text-gray-500">
                  {selectedFolders.size} folders • {selectedFormats.size} formats
                  {stats.filteredFiles > 0 && (
                    <span className="text-green-600"> • {stats.filteredFiles} filtered</span>
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
                onClick={processFiltering}
                disabled={isProcessing}
                className="w-6 h-6 flex items-center justify-center rounded bg-indigo-100 hover:bg-indigo-200 transition-colors disabled:opacity-50"
                title="Apply Filter"
              >
                {isProcessing ? '🔄' : '▶️'}
              </button>
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

        {/* Hierarchical Folder Selection */}
        {connectedInputData && connectedInputData.files.length > 0 && (
          <div className="relative z-10 px-4 py-2 border-b border-gray-100">
            <div className="text-xs font-medium text-gray-700 mb-2">
              📂 Folder Selection ({selectedFolders.size} selected)
            </div>
            <FolderTree
              files={connectedInputData.files}
              selectedFolders={selectedFolders}
              onFolderToggle={handleFolderToggle}
              expandedFolders={expandedFolders}
              onFolderExpand={handleFolderExpand}
            />
          </div>
        )}

        {/* File Format Selection */}
        {availableFormats.length > 0 && (
          <div className="relative z-10 px-4 py-2 border-b border-gray-100">
            <FileFormatSelector
              availableFormats={availableFormats}
              selectedFormats={selectedFormats}
              onFormatToggle={handleFormatToggle}
              onSelectAll={handleSelectAllFormats}
              onSelectNone={handleSelectNoFormats}
            />
          </div>
        )}

        {/* Stats Display */}
        {stats.filteredFiles > 0 && (
          <div className="relative z-10 px-4 py-2 bg-indigo-50 border-b border-indigo-100">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-semibold text-indigo-700">{stats.totalFiles}</div>
                <div className="text-indigo-600">Total</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-indigo-700">{stats.filteredFiles}</div>
                <div className="text-indigo-600">Filtered</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-indigo-700">{stats.excludedFiles}</div>
                <div className="text-indigo-600">Excluded</div>
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
                {/* Size Filters */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Max Size ({settings.maxFileSize} MB)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="1"
                      value={settings.maxFileSize}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSettingChange('maxFileSize', parseInt(e.target.value));
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-full nodrag"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Min Size ({settings.minFileSize} KB)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      step="10"
                      value={settings.minFileSize}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSettingChange('minFileSize', parseInt(e.target.value));
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-full nodrag"
                    />
                  </div>
                </div>

                {/* Content Filter */}
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-700">Filter by Content</label>
                  <input
                    type="checkbox"
                    checked={settings.filterByContent}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSettingChange('filterByContent', e.target.checked);
                    }}
                    className="rounded"
                  />
                </div>

                {settings.filterByContent && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Content Keywords (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={settings.contentKeywords.join(', ')}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSettingChange('contentKeywords', e.target.value.split(',').map(k => k.trim()));
                      }}
                      placeholder="function, class, import"
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                )}

                {/* Advanced Options */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Use Hierarchical Selection</label>
                    <input
                      type="checkbox"
                      checked={settings.useHierarchicalSelection}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSettingChange('useHierarchicalSelection', e.target.checked);
                      }}
                      className="rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Case Sensitive</label>
                    <input
                      type="checkbox"
                      checked={settings.caseSensitive}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSettingChange('caseSensitive', e.target.checked);
                      }}
                      className="rounded"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="relative z-10 p-4">
            <div className="flex items-center justify-center space-x-2 text-sm text-indigo-600">
              <div className="animate-spin w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
              <span>Filtering files...</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default FilterNode;
