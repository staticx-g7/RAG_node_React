import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Handle, Position, useReactFlow } from '@xyflow/react';

const GitNode = ({ id, data, isConnectable, selected }) => {
  const [platform, setPlatform] = useState(data?.platform || 'github');
  const [apiKey, setApiKey] = useState(data?.apiKey || '');
  const [repoUrl, setRepoUrl] = useState(data?.repoUrl || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [repoData, setRepoData] = useState(null);
  const [error, setError] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const { setNodes } = useReactFlow();

  const handleDelete = (e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('deleteNode', { detail: { id } }));
  };

  // Prevent node deletion on keyboard input[1]
  const handleKeyDown = (e) => {
    e.stopPropagation();
  };

  // Update node data when inputs change
  useEffect(() => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              platform,
              apiKey,
              repoUrl,
              repoData,
              lastUpdated: new Date().toISOString()
            }
          };
        }
        return node;
      })
    );
  }, [platform, apiKey, repoUrl, repoData, id, setNodes]);

  // Parse repository URL to extract owner and repo name
  const parseRepoUrl = (url) => {
    try {
      const regex = platform === 'github' 
        ? /github\.com\/([^\/]+)\/([^\/]+)/
        : /gitlab\.com\/([^\/]+)\/([^\/]+)/;
      
      const match = url.match(regex);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace('.git', '')
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  // Enhanced recursive fetch function
  const fetchRepoContents = async () => {
    if (!apiKey || !repoUrl) {
      setError('API key and repository URL are required');
      return;
    }

    const parsedRepo = parseRepoUrl(repoUrl);
    if (!parsedRepo) {
      setError('Invalid repository URL format');
      return;
    }

    setIsLoading(true);
    setError(null);
    console.log(`🔍 GitNode ${id}: Fetching ${platform} repository contents recursively`);

    try {
      const allContents = [];
      
      // Recursive function to fetch directory contents
      const fetchDirectory = async (dirPath = '') => {
        let apiUrl, headers;

        if (platform === 'github') {
          const pathParam = dirPath ? `/${dirPath}` : '';
          apiUrl = `https://api.github.com/repos/${parsedRepo.owner}/${parsedRepo.repo}/contents${pathParam}`;
          headers = {
            'Authorization': `token ${apiKey}`,
            'Accept': 'application/vnd.github.v3+json'
          };
        } else {
          // GitLab API with recursive parameter
          const pathParam = dirPath ? `&path=${encodeURIComponent(dirPath)}` : '';
          apiUrl = `https://gitlab.com/api/v4/projects/${encodeURIComponent(parsedRepo.owner + '/' + parsedRepo.repo)}/repository/tree?recursive=true${pathParam}`;
          headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          };
        }

        const response = await fetch(apiUrl, { headers });
        
        if (!response.ok) {
          throw new Error(`${platform} API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // For GitHub, we need to recursively fetch subdirectories
        if (platform === 'github') {
          for (const item of data) {
            const formattedItem = {
              name: item.name,
              type: item.type === 'dir' ? 'folder' : 'file',
              path: item.path,
              size: item.size || 0,
              url: item.download_url || item.html_url,
              depth: (item.path.match(/\//g) || []).length
            };
            
            allContents.push(formattedItem);
            
            // If it's a directory, fetch its contents recursively
            if (item.type === 'dir') {
              console.log(`📁 Fetching subdirectory: ${item.path}`);
              await fetchDirectory(item.path);
            }
          }
        } else {
          // GitLab returns recursive results by default
          data.forEach(item => {
            allContents.push({
              name: item.name,
              type: item.type === 'tree' ? 'folder' : 'file',
              path: item.path,
              size: 0, // GitLab tree API doesn't provide size
              url: item.web_url,
              depth: (item.path.match(/\//g) || []).length
            });
          });
        }
      };

      await fetchDirectory();

      // Sort contents: folders first, then files, both alphabetically
      allContents.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      setRepoData({
        owner: parsedRepo.owner,
        repo: parsedRepo.repo,
        platform,
        contents: allContents,
        fetchedAt: new Date().toISOString(),
        totalFiles: allContents.filter(item => item.type === 'file').length,
        totalFolders: allContents.filter(item => item.type === 'folder').length
      });

      console.log(`✅ GitNode ${id}: Successfully fetched ${allContents.length} items (${allContents.filter(i => i.type === 'folder').length} folders, ${allContents.filter(i => i.type === 'file').length} files)`);
      
    } catch (err) {
      setError(err.message);
      console.error(`❌ GitNode ${id}: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
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

  // Enhanced tree organization function
  const organizeIntoTree = (items) => {
    const tree = [];
    const itemMap = new Map();

    // Create a map of all items
    items.forEach(item => {
      itemMap.set(item.path, { ...item, children: [] });
    });

    // Build the tree structure
    items.forEach(item => {
      const pathParts = item.path.split('/');
      
      if (pathParts.length === 1) {
        // Root level item
        tree.push(itemMap.get(item.path));
      } else {
        // Find parent directory
        const parentPath = pathParts.slice(0, -1).join('/');
        const parent = itemMap.get(parentPath);
        
        if (parent) {
          parent.children.push(itemMap.get(item.path));
        }
      }
    });

    // Sort each level: folders first, then files
    const sortLevel = (items) => {
      items.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      
      items.forEach(item => {
        if (item.children && item.children.length > 0) {
          sortLevel(item.children);
        }
      });
    };

    sortLevel(tree);
    return tree;
  };

  // Helper function to get file icons based on extension
  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const iconMap = {
      'js': '🟨',
      'jsx': '⚛️',
      'ts': '🔷',
      'tsx': '⚛️',
      'py': '🐍',
      'java': '☕',
      'cpp': '⚙️',
      'c': '⚙️',
      'html': '🌐',
      'css': '🎨',
      'scss': '🎨',
      'json': '📋',
      'md': '📝',
      'txt': '📄',
      'pdf': '📕',
      'png': '🖼️',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'gif': '🖼️',
      'svg': '🎨',
      'yml': '⚙️',
      'yaml': '⚙️',
      'xml': '📄',
      'csv': '📊',
      'sql': '🗄️',
      'sh': '⚡',
      'bat': '⚡',
      'exe': '⚙️',
      'zip': '📦',
      'tar': '📦',
      'gz': '📦'
    };
    return iconMap[ext] || '📄';
  };

  // Helper function to format file sizes
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Enhanced tree item renderer with better depth handling
  const renderTreeItem = (item, depth = 0) => {
    const isFolder = item.type === 'folder';
    const isExpanded = expandedFolders.has(item.path);
    const paddingLeft = depth * 16;
    const hasChildren = item.children && item.children.length > 0;

    return (
      <motion.div
        key={item.path}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: depth * 0.02 }}
      >
        <div
          className={`flex items-center py-1 px-2 hover:bg-gray-100 rounded cursor-pointer transition-colors ${
            isFolder ? 'hover:bg-blue-50' : 'hover:bg-gray-50'
          }`}
          style={{ paddingLeft: `${paddingLeft + 8}px` }}
          onClick={() => isFolder && hasChildren && toggleFolder(item.path)}
        >
          {isFolder && hasChildren && (
            <motion.span
              className="mr-1 text-xs text-gray-500"
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ▶
            </motion.span>
          )}
          {isFolder && !hasChildren && (
            <span className="mr-1 text-xs text-transparent">▶</span>
          )}
          <span className="mr-2 text-sm">
            {isFolder ? (isExpanded ? '📂' : '📁') : getFileIcon(item.name)}
          </span>
          <span className="text-xs text-gray-700 truncate flex-1" title={item.path}>
            {item.name}
          </span>
          {!isFolder && item.size > 0 && (
            <span className="text-xs text-gray-400 ml-2">
              {formatFileSize(item.size)}
            </span>
          )}
        </div>
        
        {/* Render folder contents if expanded */}
        <AnimatePresence>
          {isFolder && isExpanded && hasChildren && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {item.children.map(child => renderTreeItem(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const getPlatformIcon = () => {
    return platform === 'github' ? '🐙' : '🦊';
  };

  const getPlatformColor = () => {
    return platform === 'github' 
      ? 'from-gray-100 to-gray-200 border-gray-300'
      : 'from-orange-100 to-orange-200 border-orange-300';
  };

  return (
    <motion.div 
      className={`relative min-w-80 bg-gradient-to-br ${getPlatformColor()} border-2 rounded-xl shadow-lg transition-all duration-200 group ${
        selected ? 'ring-2 ring-blue-200' : ''
      } ${isFocused ? 'ring-2 ring-blue-300' : ''}`}
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
        position={Position.Top}
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <motion.span 
              className="text-xl"
              animate={{ rotate: isLoading ? 360 : 0 }}
              transition={{ duration: 1, repeat: isLoading ? Infinity : 0, ease: "linear" }}
            >
              {getPlatformIcon()}
            </motion.span>
            <h3 className="text-sm font-semibold text-gray-800">
              Git Repository
            </h3>
          </div>

          {/* Platform selector */}
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="text-xs bg-white/80 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="github">GitHub</option>
            <option value="gitlab">GitLab</option>
          </select>
        </div>

        {/* API Key Input */}
        <div className="mb-3">
          <label className="text-xs font-medium text-gray-700 mb-1 block">
            {platform === 'github' ? 'GitHub Token' : 'GitLab Token'}
          </label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={`Enter ${platform} API token...`}
              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
            />
            <motion.button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <span className="text-xs">
                {showApiKey ? 'HIDE' : 'SHOW'}
              </span>
            </motion.button>
          </div>
        </div>

        {/* Repository URL Input */}
        <div className="mb-3">
          <label className="text-xs font-medium text-gray-700 mb-1 block">
            Repository URL
          </label>
          <input
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={`https://${platform}.com/owner/repo`}
            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Fetch Button */}
        <motion.button
          onClick={fetchRepoContents}
          disabled={isLoading || !apiKey || !repoUrl}
          className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-all duration-200 mb-3 ${
            isLoading || !apiKey || !repoUrl
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600 text-white hover:scale-105 active:scale-95 shadow-md'
          }`}
          whileHover={!isLoading && apiKey && repoUrl ? { scale: 1.02 } : {}}
          whileTap={!isLoading && apiKey && repoUrl ? { scale: 0.98 } : {}}
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <motion.div 
                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <span>Fetching...</span>
            </div>
          ) : (
            '📁 Fetch Repository'
          )}
        </motion.button>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Repository Data Display with Tree View */}
        <AnimatePresence>
          {repoData && (
            <motion.div
              className="text-xs bg-green-50 border border-green-200 rounded overflow-hidden"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              {/* Header with expand/collapse and detailed stats */}
              <div 
                className="bg-green-100 p-3 cursor-pointer hover:bg-green-150 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-green-800">
                    📊 {repoData.owner}/{repoData.repo}
                  </div>
                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-green-600"
                  >
                    ▼
                  </motion.span>
                </div>
                <div className="text-green-700 text-xs">
                  📁 {repoData.totalFolders} folders • 📄 {repoData.totalFiles} files • Total: {repoData.contents.length} items
                </div>
              </div>

              {/* Expandable Tree View */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className="max-h-80 overflow-y-auto bg-white"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="p-2">
                      {organizeIntoTree(repoData.contents).map(item => 
                        renderTreeItem(item)
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Output Handles */}
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

      <Handle
        type="source"
        position={Position.Bottom}
        id="output-data"
        style={{ 
          background: '#8b5cf6', 
          width: '10px', 
          height: '10px',
          border: '2px solid white'
        }}
        isConnectable={isConnectable}
      />
    </motion.div>
  );
};

export default GitNode;
