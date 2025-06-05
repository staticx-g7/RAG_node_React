import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Handle, Position, useReactFlow } from '@xyflow/react';

const FilterNode = ({ id, data, isConnectable, selected }) => {
  const [inputData, setInputData] = useState(data?.inputData || null);
  const [folderStructure, setFolderStructure] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const { setNodes, getNodes, getEdges } = useReactFlow();

  const handleDelete = (e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('deleteNode', { detail: { id } }));
  };

  // Update node data when structure changes
  useEffect(() => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              inputData,
              folderStructure,
              lastUpdated: new Date().toISOString()
            }
          };
        }
        return node;
      })
    );
  }, [inputData, folderStructure, id, setNodes]);

  // Listen for data from connected GitNode
  useEffect(() => {
    const checkForInputData = () => {
      const edges = getEdges();
      const nodes = getNodes();
      
      // Find edges that connect TO this filter node
      const incomingEdges = edges.filter(edge => edge.target === id);
      
      if (incomingEdges.length > 0) {
        // Get data from the first connected source node
        const sourceEdge = incomingEdges[0];
        const sourceNode = nodes.find(node => node.id === sourceEdge.source);
        
        if (sourceNode && sourceNode.data && sourceNode.data.repoData) {
          console.log(`📥 FilterNode ${id}: Received repository data from GitNode`);
          setInputData(sourceNode.data.repoData);
          buildFolderStructure(sourceNode.data.repoData);
        }
      }
    };

    checkForInputData();
  }, [getEdges, getNodes, id]);

  // Build hierarchical folder structure with subfiles
  const buildFolderStructure = async (data) => {
    if (!data || !data.contents) {
      console.log(`⚠️ FilterNode ${id}: No repository data to process`);
      return;
    }

    setIsProcessing(true);
    console.log(`🔍 FilterNode ${id}: Building folder structure from ${data.contents.length} items`);

    // Simulate processing delay for visual feedback[3]
    await new Promise(resolve => setTimeout(resolve, 300));

    // Create folder map and organize items
    const folderMap = new Map();
    const rootFolders = [];

    // Initialize all folders
    data.contents.forEach(item => {
      if (item.type === 'folder') {
        folderMap.set(item.path, {
          ...item,
          subfolders: [],
          files: [],
          totalItems: 0
        });
      }
    });

    // Add files to their parent folders and count subfolder items
    data.contents.forEach(item => {
      if (item.type === 'file') {
        const pathParts = item.path.split('/');
        if (pathParts.length > 1) {
          // File is in a subfolder
          const parentPath = pathParts.slice(0, -1).join('/');
          const parentFolder = folderMap.get(parentPath);
          if (parentFolder) {
            parentFolder.files.push(item);
            parentFolder.totalItems++;
          }
        }
      }
    });

    // Build hierarchical structure
    folderMap.forEach((folder, path) => {
      const pathParts = path.split('/');
      
      if (pathParts.length === 1) {
        // Root level folder
        rootFolders.push(folder);
      } else {
        // Nested folder - find parent
        const parentPath = pathParts.slice(0, -1).join('/');
        const parent = folderMap.get(parentPath);
        if (parent) {
          parent.subfolders.push(folder);
          parent.totalItems += folder.totalItems + folder.files.length + 1; // +1 for the folder itself
        }
      }
    });

    // Calculate total items for each folder recursively
    const calculateTotalItems = (folder) => {
      let total = folder.files.length;
      folder.subfolders.forEach(subfolder => {
        total += calculateTotalItems(subfolder) + 1; // +1 for the subfolder itself
      });
      folder.totalItems = total;
      return total;
    };

    rootFolders.forEach(calculateTotalItems);

    // Sort folders and files
    const sortItems = (folders, files) => {
      folders.sort((a, b) => a.name.localeCompare(b.name));
      files.sort((a, b) => a.name.localeCompare(b.name));
      folders.forEach(folder => {
        sortItems(folder.subfolders, folder.files);
      });
    };

    rootFolders.forEach(folder => {
      sortItems(folder.subfolders, folder.files);
    });

    const structure = {
      owner: data.owner,
      repo: data.repo,
      platform: data.platform,
      rootFolders: rootFolders,
      totalFolders: folderMap.size,
      totalFiles: data.contents.filter(item => item.type === 'file').length,
      processedAt: new Date().toISOString()
    };

    setFolderStructure(structure);
    setIsProcessing(false);

    console.log(`✅ FilterNode ${id}: Built folder structure with ${structure.totalFolders} folders and ${structure.totalFiles} files`);
  };

  const toggleFolder = (folderPath) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const iconMap = {
      'js': '🟨', 'jsx': '⚛️', 'ts': '🔷', 'tsx': '⚛️',
      'py': '🐍', 'java': '☕', 'cpp': '⚙️', 'c': '⚙️',
      'html': '🌐', 'css': '🎨', 'scss': '🎨',
      'json': '📋', 'md': '📝', 'txt': '📄',
      'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️', 'svg': '🎨',
      'yml': '⚙️', 'yaml': '⚙️', 'xml': '📄'
    };
    return iconMap[ext] || '📄';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderFolderTree = (folder, depth = 0) => {
    const isExpanded = expandedFolders.has(folder.path);
    const paddingLeft = depth * 16;
    const hasContent = folder.subfolders.length > 0 || folder.files.length > 0;

    return (
      <motion.div
        key={folder.path}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: depth * 0.02 }}
      >
        {/* Folder Header */}
        <div
          className="flex items-center py-1 px-2 hover:bg-blue-50 rounded cursor-pointer transition-colors"
          style={{ paddingLeft: `${paddingLeft + 8}px` }}
          onClick={() => hasContent && toggleFolder(folder.path)}
        >
          {hasContent && (
            <motion.span
              className="mr-1 text-xs text-gray-500"
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ▶
            </motion.span>
          )}
          {!hasContent && (
            <span className="mr-1 text-xs text-transparent">▶</span>
          )}
          <span className="mr-2 text-sm">
            {isExpanded ? '📂' : '📁'}
          </span>
          <div className="flex-1">
            <span className="text-xs font-medium text-gray-800">
              {folder.name}
            </span>
            <span className="text-xs text-gray-500 ml-2">
              ({folder.subfolders.length + folder.files.length} items)
            </span>
          </div>
        </div>

        {/* Folder Contents */}
        <AnimatePresence>
          {isExpanded && hasContent && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Render subfolders */}
              {folder.subfolders.map(subfolder => 
                renderFolderTree(subfolder, depth + 1)
              )}
              
              {/* Render files */}
              {folder.files.map((file, index) => (
                <motion.div
                  key={file.path}
                  className="flex items-center py-1 px-2 hover:bg-gray-50 rounded transition-colors"
                  style={{ paddingLeft: `${(depth + 1) * 16 + 24}px` }}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.01 }}
                >
                  <span className="mr-2 text-sm">
                    {getFileIcon(file.name)}
                  </span>
                  <span className="text-xs text-gray-700 flex-1">
                    {file.name}
                  </span>
                  {file.size > 0 && (
                    <span className="text-xs text-gray-400 ml-2">
                      {formatFileSize(file.size)}
                    </span>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <motion.div 
      className={`relative min-w-80 bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-blue-300 rounded-xl shadow-lg transition-all duration-200 group ${
        selected ? 'ring-2 ring-blue-200' : ''
      }`}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {/* Delete button */}
      <motion.button
        onClick={handleDelete}
        className={`absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 shadow-lg z-10 ${
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
            📁
          </motion.span>
          <h3 className="text-sm font-semibold text-blue-800">
            Folder Structure
          </h3>
        </div>

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

        {/* Processing Status */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded p-2 mb-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center space-x-2">
                <motion.div 
                  className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span>Building folder structure...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Folder Structure Display */}
        <AnimatePresence>
          {folderStructure && (
            <motion.div
              className="text-xs bg-white border border-blue-200 rounded overflow-hidden"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              {/* Structure Header */}
              <div 
                className="bg-blue-50 p-3 cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-blue-800">
                    📊 {folderStructure.owner}/{folderStructure.repo}
                  </div>
                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-blue-600"
                  >
                    ▼
                  </motion.span>
                </div>
                <div className="text-blue-700 text-xs mt-1">
                  📁 {folderStructure.totalFolders} folders • 📄 {folderStructure.totalFiles} files
                </div>
              </div>

              {/* Expandable Folder Tree */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className="max-h-96 overflow-y-auto bg-white"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="p-2">
                      {folderStructure.rootFolders.map(folder => 
                        renderFolderTree(folder)
                      )}
                    </div>
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
