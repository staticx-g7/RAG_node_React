import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import PlayButton from '../../ui/PlayButton';

const GitNode = React.memo(({ id, data, isConnectable, selected }) => {
  const [platform, setPlatform] = useState(data?.platform || 'github');
  const [apiKey, setApiKey] = useState(data?.apiKey || '');
  const [repoUrl, setRepoUrl] = useState(data?.repoUrl || '');
  const [customEndpoint, setCustomEndpoint] = useState(data?.customEndpoint || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [repoData, setRepoData] = useState(null);
  const [error, setError] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [isHovered, setIsHovered] = useState(false);

  const { setNodes } = useReactFlow();
  const nodeRef = useRef(null);
  const abortControllerRef = useRef(null);
  const fetchButtonRef = useRef(null); // Add ref for the fetch button

  // Framer Motion values - simplified to prevent conflicts
  const scale = useMotionValue(1);
  const y = useMotionValue(0);
  const glowOpacity = useMotionValue(0);

  const boxShadow = useTransform(
    [scale, glowOpacity],
    ([s, glow]) => `0px ${s * 8}px ${s * 25}px rgba(59, 130, 246, ${glow * 0.15})`
  );

  const getDefaultEndpoint = useCallback((platform) => {
    switch (platform) {
      case 'github': return 'https://api.github.com';
      case 'gitlab': return 'https://gitlab.com/api/v4';
      default: return '';
    }
  }, []);

  const getApiEndpoint = useCallback(() => {
    return customEndpoint || getDefaultEndpoint(platform);
  }, [customEndpoint, platform, getDefaultEndpoint]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    window.dispatchEvent(new CustomEvent('deleteNode', { detail: { id } }));
  }, [id]);

  const handleKeyDown = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!selected && !isLoading) {
      setIsHovered(true);
      scale.set(1.02);
      y.set(-2);
      glowOpacity.set(1);
    }
  }, [selected, isLoading, scale, y, glowOpacity]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (!isLoading) {
      scale.set(1);
      y.set(0);
      glowOpacity.set(0);
    }
  }, [isLoading, scale, y, glowOpacity]);

  // Simplified loading effect without conflicts
  useEffect(() => {
    if (isLoading) {
      glowOpacity.set(0.3);
    } else {
      glowOpacity.set(0);
      scale.set(1);
      y.set(0);
    }
  }, [isLoading, glowOpacity, scale, y]);

  const updateNodeData = useCallback(() => {
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
              customEndpoint,
              repoData,
              lastUpdated: new Date().toISOString()
            }
          };
        }
        return node;
      })
    );
  }, [platform, apiKey, repoUrl, customEndpoint, repoData, id, setNodes]);

  useEffect(() => {
    const timeoutId = setTimeout(updateNodeData, 300);
    return () => clearTimeout(timeoutId);
  }, [updateNodeData]);

  const parseRepoUrl = useCallback((url) => {
    try {
      let regex;
      if (customEndpoint) {
        const domain = new URL(customEndpoint).hostname;
        regex = new RegExp(`${domain.replace('.', '\\.')}\/([^\/]+)\/([^\/]+)`);
      } else {
        regex = platform === 'github'
          ? /github\.com\/([^\/]+)\/([^\/]+)/
          : /gitlab\.com\/([^\/]+)\/([^\/]+)/;
      }
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
  }, [customEndpoint, platform]);

  const fetchRepoContents = useCallback(async () => {
  if (!apiKey || !repoUrl || isLoading) {
    console.log(`⚠️ GitNode ${id}: Cannot fetch - missing data or already loading`);
    return;
  }

  const parsedRepo = parseRepoUrl(repoUrl);
  if (!parsedRepo) {
    setError('Invalid repository URL format');
    return;
  }

  const endpoint = getApiEndpoint();
  if (!endpoint) {
    setError('API endpoint not configured');
    return;
  }

  // Cancel any previous request
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }

  // Create new abort controller
  abortControllerRef.current = new AbortController();

  setIsLoading(true);
  setError(null);

  try {
    console.log(`🔍 GitNode ${id}: Starting repository fetch for ${repoUrl}`);

    let allContents = [];
    if (platform === 'github') {
      const fetchedPaths = new Set();
      const fetchDirectory = async (dirPath = '') => {
        if (fetchedPaths.has(dirPath)) return;
        fetchedPaths.add(dirPath);
        const pathParam = dirPath ? `/${dirPath}` : '';
        const apiUrl = `${endpoint}/repos/${parsedRepo.owner}/${parsedRepo.repo}/contents${pathParam}`;
        const headers = {
          'Authorization': `token ${apiKey}`,
          'Accept': 'application/vnd.github.v3+json'
        };

        console.log(`📡 GitNode ${id}: Fetching ${apiUrl}`);

        // **FIX: Check if abortController still exists before using signal**
        const response = await fetch(apiUrl, {
          headers,
          signal: abortControllerRef.current?.signal // Use optional chaining
        });

        if (!response.ok) {
          throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
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
          if (item.type === 'dir') {
            await fetchDirectory(item.path);
          }
        }
      };
      await fetchDirectory();
    } else {
      const apiUrl = `${endpoint}/projects/${encodeURIComponent(parsedRepo.owner + '/' + parsedRepo.repo)}/repository/tree?recursive=true&per_page=1000`;
      const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };

      console.log(`📡 GitNode ${id}: Fetching ${apiUrl}`);

      // **FIX: Check if abortController still exists before using signal**
      const response = await fetch(apiUrl, {
        headers,
        signal: abortControllerRef.current?.signal // Use optional chaining
      });

      if (!response.ok) {
        throw new Error(`GitLab API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      allContents = data.map(item => ({
        name: item.name,
        type: item.type === 'tree' ? 'folder' : 'file',
        path: item.path,
        size: 0,
        url: item.web_url,
        depth: (item.path.match(/\//g) || []).length
      }));
    }

    const result = {
      owner: parsedRepo.owner,
      repo: parsedRepo.repo,
      platform,
      endpoint,
      contents: allContents,
      fetchedAt: new Date().toISOString(),
      totalFiles: allContents.filter(item => item.type === 'file').length,
      totalFolders: allContents.filter(item => item.type === 'folder').length
    };

    console.log(`✅ GitNode ${id}: Successfully fetched ${allContents.length} items`);
    setRepoData(result);

  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error(`❌ GitNode ${id}: Fetch failed:`, err);
      setError(err.message);
    }
  } finally {
    setIsLoading(false);
    abortControllerRef.current = null;
  }
}, [apiKey, repoUrl, parseRepoUrl, getApiEndpoint, platform, isLoading, id]);
  
  const handleNodeExecution = useCallback(async (inputData) => {
    console.log(`🎯 GitNode ${id}: Starting execution with input data:`, inputData);

    let apiKeyToUse = apiKey;
    let repoUrlToUse = repoUrl;
    let hasUpdatedData = false;

    // Process input data from connected nodes
    Object.values(inputData).forEach(data => {
      if (data && data.value) {
        if (data.inputType === 'api-key' || data.label?.toLowerCase().includes('api')) {
          console.log(`🔑 GitNode ${id}: Using API key from connected node`);
          apiKeyToUse = data.value;
          setApiKey(data.value);
          hasUpdatedData = true;
        }
        if (data.inputType === 'url' || data.label?.toLowerCase().includes('url')) {
          console.log(`🔗 GitNode ${id}: Using repository URL from connected node`);
          repoUrlToUse = data.value;
          setRepoUrl(data.value);
          hasUpdatedData = true;
        }
      }
    });

    // Clear any previous errors
    setError(null);

    // Validate required data
    if (!apiKeyToUse || !repoUrlToUse) {
      const missingItems = [];
      if (!apiKeyToUse) missingItems.push('API key');
      if (!repoUrlToUse) missingItems.push('repository URL');

      const errorMsg = `Missing required data: ${missingItems.join(' and ')}`;
      console.log(`❌ GitNode ${id}: ${errorMsg}`);
      setError(errorMsg);
      return;
    }

    console.log(`✅ GitNode ${id}: All required data present, fetching repository...`);

    // Wait a moment if we updated data to let the UI update
    if (hasUpdatedData) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Fetch the repository data
    try {
      await fetchRepoContents();
      console.log(`🎉 GitNode ${id}: Repository fetch completed successfully`);
    } catch (error) {
      console.error(`❌ GitNode ${id}: Repository fetch failed:`, error);
      setError(`Failed to fetch repository: ${error.message}`);
    }
  }, [id, apiKey, repoUrl, fetchRepoContents]);

  // **FIXED AUTO-EXECUTION EVENT LISTENER WITH PROPER DEPENDENCIES**
  useEffect(() => {
    const handleAutoExecution = (event) => {
      if (event.detail.nodeId === id) {
        console.log(`🎯 GitNode ${id}: Auto-triggered for execution`);

        // Method 1: Try direct button click first
        if (fetchButtonRef.current && !isLoading && apiKey && repoUrl) {
          console.log(`✅ GitNode ${id}: Triggering fetch button click`);
          fetchButtonRef.current.click();
          return;
        }

        // Method 2: Direct function call if button click fails
        if (apiKey && repoUrl && !isLoading) {
          console.log(`✅ GitNode ${id}: Direct function call for auto-execution`);
          fetchRepoContents();
        } else {
          console.log(`⚠️ GitNode ${id}: Cannot auto-execute - missing required data or loading`);
          console.log(`   - API Key: ${apiKey ? 'Present' : 'Missing'}`);
          console.log(`   - Repo URL: ${repoUrl ? 'Present' : 'Missing'}`);
          console.log(`   - Is Loading: ${isLoading}`);
          console.log(`   - Button Ref: ${fetchButtonRef.current ? 'Present' : 'Missing'}`);

          // Show error in UI
          const missing = [];
          if (!apiKey) missing.push('API key');
          if (!repoUrl) missing.push('repository URL');
          if (isLoading) missing.push('node is busy');

          setError(`Cannot auto-execute - ${missing.join(', ')}`);
        }
      }
    };

    // Listen for multiple event types to ensure compatibility
    window.addEventListener('triggerExecution', handleAutoExecution);
    window.addEventListener('triggerPlayButton', handleAutoExecution);
    window.addEventListener('autoExecute', handleAutoExecution);

    return () => {
      window.removeEventListener('triggerExecution', handleAutoExecution);
      window.removeEventListener('triggerPlayButton', handleAutoExecution);
      window.removeEventListener('autoExecute', handleAutoExecution);
    };
  }, [id, apiKey, repoUrl, isLoading, fetchRepoContents]); // FIXED: Added fetchRepoContents to dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const toggleFolder = useCallback((folderPath) => {
    setExpandedFolders(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(folderPath)) {
        newExpanded.delete(folderPath);
      } else {
        newExpanded.add(folderPath);
      }
      return newExpanded;
    });
  }, []);

  const organizeIntoTree = useCallback((items) => {
    const tree = [];
    const itemMap = new Map();
    const sortedItems = [...items].sort((a, b) => {
      const aDepth = (a.path.match(/\//g) || []).length;
      const bDepth = (b.path.match(/\//g) || []).length;
      return aDepth - bDepth;
    });
    sortedItems.forEach(item => {
      itemMap.set(item.path, { ...item, children: [] });
    });
    sortedItems.forEach(item => {
      const pathParts = item.path.split('/');
      if (pathParts.length === 1) {
        tree.push(itemMap.get(item.path));
      } else {
        const parentPath = pathParts.slice(0, -1).join('/');
        const parent = itemMap.get(parentPath);
        const current = itemMap.get(item.path);
        if (parent && current) {
          parent.children.push(current);
        }
      }
    });
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
  }, []);

  const getFileIcon = useCallback((filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const iconMap = {
      'js': '🟨', 'jsx': '⚛️', 'ts': '🔷', 'tsx': '⚛️',
      'py': '🐍', 'java': '☕', 'cpp': '⚙️', 'c': '⚙️',
      'h': '📋', 'hpp': '📋',
      'html': '🌐', 'css': '🎨', 'scss': '🎨',
      'json': '📋', 'md': '📝', 'txt': '📄',
      'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️', 'svg': '🎨',
      'yml': '⚙️', 'yaml': '⚙️', 'xml': '📄'
    };
    return iconMap[ext] || '📄';
  }, []);

  const formatFileSize = useCallback((bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  const renderTreeItem = useCallback((item, depth = 0) => {
    const isFolder = item.type === 'folder';
    const isExpanded = expandedFolders.has(item.path);
    const paddingLeft = depth * 16;
    const hasChildren = item.children && item.children.length > 0;

    return (
      <motion.div
        key={item.path}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{
          delay: depth * 0.02,
          type: "spring",
          stiffness: 400,
          damping: 20
        }}
        layout
      >
        <motion.div
          className={`flex items-center py-1 px-2 hover:bg-gray-100 rounded cursor-pointer ${
            isFolder ? 'hover:bg-blue-50' : 'hover:bg-gray-50'
          }`}
          style={{ paddingLeft: `${paddingLeft + 8}px` }}
          onClick={() => {
            if (isFolder && hasChildren) {
              toggleFolder(item.path);
            }
          }}
          whileHover={{ scale: 1.01, x: 2 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          {isFolder && hasChildren && (
            <motion.span
              className="mr-1 text-xs text-gray-500"
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2, type: "spring", stiffness: 400 }}
            >
              ▶
            </motion.span>
          )}
          {isFolder && !hasChildren && (
            <span className="mr-1 text-xs text-transparent">▶</span>
          )}
          <motion.span
            className="mr-2 text-sm"
            animate={{
              scale: isExpanded && isFolder ? [1, 1.1, 1] : 1
            }}
            transition={{ duration: 0.3 }}
          >
            {isFolder ? (isExpanded ? '📂' : '📁') : getFileIcon(item.name)}
          </motion.span>
          <span className="text-xs text-gray-700 truncate flex-1" title={item.path}>
            {item.name}
          </span>
          {!isFolder && item.size > 0 && (
            <span className="text-xs text-gray-400 ml-2">
              {formatFileSize(item.size)}
            </span>
          )}
          {isFolder && hasChildren && (
            <motion.span
              className="text-xs text-gray-400 ml-2"
              animate={{
                color: isExpanded ? "#3b82f6" : "#9ca3af"
              }}
            >
              ({item.children.length})
            </motion.span>
          )}
        </motion.div>
        <AnimatePresence>
          {isFolder && isExpanded && hasChildren && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, type: "spring" }}
            >
              {item.children.map(child => renderTreeItem(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }, [expandedFolders, toggleFolder, getFileIcon, formatFileSize]);

  const getPlatformIcon = () => platform === 'github' ? '🐙' : '🦊';
  const getPlatformColor = () => platform === 'github'
    ? 'from-gray-100 to-gray-200 border-gray-300'
    : 'from-orange-100 to-orange-200 border-orange-300';

  const containerVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    initial: { opacity: 0, y: 10 },
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
      scale: 1.05,
      transition: { type: "spring", stiffness: 400, damping: 20 }
    },
    tap: { scale: 0.95 }
  };

  return (
    <motion.div
      ref={nodeRef}
      className={`relative bg-gradient-to-br ${getPlatformColor()} border-2 rounded-xl shadow-lg group ${
        selected ? 'ring-2 ring-blue-200' : ''
      } ${isFocused ? 'ring-2 ring-blue-300' : ''}`}
      variants={containerVariants}
      initial="initial"
      animate="animate"
      style={{
        width: '320px',
        minHeight: '400px',
        scale,
        y,
        boxShadow
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPointerDown={(e) => {
        if (e.target.closest('input, button, select')) {
          e.stopPropagation();
        }
      }}
    >
      {/* Simplified loading glow */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-20 blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      <PlayButton
        nodeId={id}
        nodeType="git"
        onExecute={handleNodeExecution}
        disabled={isLoading}
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

      <motion.div className="p-4" variants={itemVariants}>
        <motion.div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <motion.span
              className="text-xl"
              animate={{
                rotate: isLoading ? 360 : 0
              }}
              transition={{
                rotate: {
                  duration: 2,
                  repeat: isLoading ? Infinity : 0,
                  ease: "linear"
                }
              }}
            >
              {getPlatformIcon()}
            </motion.span>
            <motion.h3 className="text-sm font-semibold text-gray-800">
              Git Repository ✨
            </motion.h3>
          </div>
          <motion.select
            value={platform}
            onChange={(e) => {
              setPlatform(e.target.value);
              setCustomEndpoint('');
            }}
            className="text-xs bg-white/80 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            variants={buttonVariants}
            whileFocus="hover"
            disabled={isLoading}
          >
            <option value="github">GitHub</option>
            <option value="gitlab">GitLab</option>
          </motion.select>
        </motion.div>

        <motion.div className="mb-3" variants={itemVariants}>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-700">API Endpoint:</label>
            <motion.button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-blue-600 hover:text-blue-800"
              variants={buttonVariants}
              initial="idle"
              whileHover="hover"
              whileTap="tap"
              disabled={isLoading}
            >
              {showAdvanced ? 'Hide' : 'Customize'}
            </motion.button>
          </div>
          <motion.div
            className="text-xs bg-gray-100 p-2 rounded border font-mono text-gray-700"
            animate={{
              backgroundColor: getApiEndpoint() ? "#f3f4f6" : "#fef2f2",
              borderColor: getApiEndpoint() ? "#d1d5db" : "#fecaca"
            }}
            transition={{ duration: 0.3 }}
          >
            {getApiEndpoint() || 'Not configured'}
          </motion.div>
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                className="mt-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, type: "spring" }}
              >
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Custom Endpoint (leave empty for default):
                </label>
                <motion.input
                  type="url"
                  value={customEndpoint}
                  onChange={(e) => setCustomEndpoint(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder={`Default: ${getDefaultEndpoint(platform)}`}
                  className="w-full p-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  variants={buttonVariants}
                  whileFocus="hover"
                  disabled={isLoading}
                />
                <motion.div
                  className="text-xs text-gray-500 mt-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Examples: https://git.company.com/api/v4 (GitLab), https://github.enterprise.com/api/v3 (GitHub)
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div className="mb-3" variants={itemVariants}>
          <label className="text-xs font-medium text-gray-700 mb-1 block">
            {platform === 'github' ? 'GitHub Token' : 'GitLab Token'}
          </label>
          <div className="relative">
            <motion.input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={`Enter ${platform} API token...`}
              className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
              variants={buttonVariants}
              whileFocus="hover"
              disabled={isLoading}
            />
            <motion.button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500"
              variants={buttonVariants}
              initial="idle"
              whileHover="hover"
              whileTap="tap"
              disabled={isLoading}
            >
              <span className="text-xs">
                {showApiKey ? 'HIDE' : 'SHOW'}
              </span>
            </motion.button>
          </div>
        </motion.div>

        <motion.div className="mb-3" variants={itemVariants}>
          <label className="text-xs font-medium text-gray-700 mb-1 block">
            Repository URL
          </label>
          <motion.input
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={`https://${platform}.com/owner/repo`}
            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            variants={buttonVariants}
            whileFocus="hover"
            disabled={isLoading}
          />
        </motion.div>

        <motion.button
          ref={fetchButtonRef} // CRITICAL: Add the ref here for auto-execution
          onClick={fetchRepoContents}
          disabled={isLoading || !apiKey || !repoUrl}
          className={`w-full py-2 px-4 rounded-lg font-medium text-sm mb-3 transition-all duration-200 ${
            isLoading || !apiKey || !repoUrl
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl'
          }`}
          variants={buttonVariants}
          initial="idle"
          whileHover={!isLoading && apiKey && repoUrl ? "hover" : "idle"}
          whileTap={!isLoading && apiKey && repoUrl ? "tap" : "idle"}
        >
          <motion.div className="flex items-center justify-center space-x-2">
            {isLoading ? (
              <>
                <motion.div
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span>Fetching...</span>
              </>
            ) : (
              <>
                <span>📁</span>
                <span>Fetch Repository</span>
                <span>✨</span>
              </>
            )}
          </motion.div>
        </motion.button>

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

        <AnimatePresence>
          {repoData && (
            <motion.div
              className="text-xs bg-green-50 border border-green-200 rounded overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <motion.div
                className="bg-green-100 p-3 cursor-pointer hover:bg-green-150"
                onClick={() => setIsExpanded(!isExpanded)}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <div className="flex items-center justify-between mb-1">
                  <motion.div className="font-medium text-green-800">
                    📊 {repoData.owner}/{repoData.repo}
                  </motion.div>
                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="text-green-600"
                  >
                    ▼
                  </motion.span>
                </div>
                <motion.div className="text-green-700 text-xs">
                  📁 {repoData.totalFolders} folders • 📄 {repoData.totalFiles} files • Total: {repoData.contents.length} items
                </motion.div>
                <motion.div
                  className="text-green-600 text-xs mt-1 font-mono"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  📡 {repoData.endpoint}
                </motion.div>
              </motion.div>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className="max-h-80 overflow-y-auto bg-white nowheel"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.5, type: "spring" }}
                  >
                    <motion.div
                      className="p-2"
                      variants={{
                        animate: {
                          transition: {
                            staggerChildren: 0.02
                          }
                        }
                      }}
                      initial="initial"
                      animate="animate"
                    >
                      <AnimatePresence mode="popLayout">
                        {organizeIntoTree(repoData.contents).map(item =>
                          renderTreeItem(item)
                        )}
                      </AnimatePresence>
                    </motion.div>
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
          width: '10px',
          height: '10px',
          border: '2px solid white',
          boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)'
        }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="output-data"
        style={{
          background: 'linear-gradient(45deg, #8b5cf6, #ec4899)',
          width: '10px',
          height: '10px',
          border: '2px solid white',
          boxShadow: '0 0 8px rgba(139, 92, 246, 0.4)'
        }}
        isConnectable={isConnectable}
      />
    </motion.div>
  );
});

GitNode.displayName = 'GitNode';

export default GitNode;
