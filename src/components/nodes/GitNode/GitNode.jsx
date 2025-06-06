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
          id="git-beams"
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
      <rect width="100%" height="100%" fill="url(#git-beams)" />
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

  const { setNodes, getNodes, getEdges } = useReactFlow();
  const nodeRef = useRef(null);
  const abortControllerRef = useRef(null);
  const fetchButtonRef = useRef(null);
  const updateTimeoutRef = useRef(null);

  // **CHAIN REACTION FUNCTIONALITY**
  const triggerNextNodes = useCallback(async (currentNodeId) => {
    const edges = getEdges();
    const nodes = getNodes();

    const outgoingEdges = edges.filter(edge => edge.source === currentNodeId);

    if (outgoingEdges.length > 0) {
      console.log(`🔗 GitNode: Found ${outgoingEdges.length} connected node(s) to trigger`);

      for (let i = 0; i < outgoingEdges.length; i++) {
        const edge = outgoingEdges[i];
        const targetNode = nodes.find(node => node.id === edge.target);

        if (targetNode) {
          console.log(`🎯 GitNode: Triggering ${targetNode.type} node ${edge.target}`);

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
      console.log(`⏹️ GitNode: No connected nodes found after fetching`);
    }
  }, [getEdges, getNodes]);

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
    }, 1000);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [platform, apiKey, repoUrl, customEndpoint, repoData, id, setNodes]);

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

          const response = await fetch(apiUrl, {
            headers,
            signal: abortControllerRef.current?.signal
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

        const response = await fetch(apiUrl, {
          headers,
          signal: abortControllerRef.current?.signal
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

      // **TRIGGER NEXT NODES**
      await new Promise(resolve => setTimeout(resolve, 500));
      await triggerNextNodes(id);

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(`❌ GitNode ${id}: Fetch failed:`, err);
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [apiKey, repoUrl, parseRepoUrl, getApiEndpoint, platform, isLoading, id, triggerNextNodes]);

  const handleNodeExecution = useCallback(async (inputData) => {
    console.log(`🎯 GitNode ${id}: Executing with input data:`, inputData);

    try {
      if (apiKey && repoUrl && !isLoading) {
        console.log(`🔄 GitNode ${id}: Auto-fetching repository data`);
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (fetchButtonRef.current && !isLoading) {
          console.log(`✅ GitNode ${id}: Triggering fetch button`);
          fetchButtonRef.current.click();
        } else {
          await fetchRepoContents();
        }
      }
    } catch (error) {
      console.error(`❌ GitNode ${id}: Error during execution:`, error);
    }
  }, [id, fetchRepoContents, isLoading, apiKey, repoUrl]);

  useEffect(() => {
    const handleAutoExecution = (event) => {
      if (event.detail.nodeId === id) {
        console.log(`🎯 GitNode ${id}: Auto-triggered for execution`);

        if (fetchButtonRef.current && !isLoading && apiKey && repoUrl) {
          console.log(`✅ GitNode ${id}: Triggering fetch button click`);
          fetchButtonRef.current.click();
          return;
        }

        if (apiKey && repoUrl && !isLoading) {
          console.log(`✅ GitNode ${id}: Direct function call for auto-execution`);
          fetchRepoContents();
        } else {
          console.log(`⚠️ GitNode ${id}: Cannot auto-execute - missing credentials or loading`);
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
  }, [id, apiKey, repoUrl, isLoading, fetchRepoContents]);

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

  const handleInteractionEvent = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return (
    <motion.div
      ref={nodeRef}
      className={`relative w-80 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-2 border-amber-200 rounded-xl shadow-lg group nowheel overflow-visible ${
        selected ? 'ring-2 ring-amber-300' : ''
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
      {/* Background Beams when loading */}
      <AnimatePresence>
        {isLoading && (
          <BackgroundBeams className="opacity-20" />
        )}
      </AnimatePresence>

      {/* **FIXED: PlayButton positioning - moved outside container** */}
      <div className="absolute -top-4 -left-4 z-30">
        <PlayButton
          nodeId={id}
          nodeType="git"
          onExecute={handleNodeExecution}
          disabled={isLoading}
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
          background: 'linear-gradient(45deg, #f59e0b, #d97706)',
          width: '16px',
          height: '16px',
          border: '3px solid white',
          borderRadius: '50%',
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
          left: '-8px'
        }}
        isConnectable={isConnectable}
      />

      <div className="p-4 pt-8 nowheel">
        {/* **FIXED: Header - Simplified** */}
        <div className="flex items-center space-x-2 mb-4">
          <FloatingIcon isProcessing={isLoading}>
            <span className="text-xl">🐙</span>
          </FloatingIcon>
          <h3 className="text-sm font-semibold text-amber-800">
            Git Repository
          </h3>
        </div>

        {/* Platform Selection */}
        <div className="mb-4">
          <label className="text-xs font-medium text-amber-700 mb-2 block">
            🏢 Platform
          </label>
          <motion.select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full p-2 text-xs border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-800 nodrag"
            whileFocus={{ scale: 1.01 }}
          >
            <option value="github">GitHub</option>
            <option value="gitlab">GitLab</option>
          </motion.select>
        </div>

        {/* Repository URL */}
        <div className="mb-4">
          <label className="text-xs font-medium text-amber-700 mb-2 block">
            🔗 Repository URL
          </label>
          <motion.input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="https://github.com/owner/repo"
            className="w-full p-2 text-xs border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-800 nodrag"
            whileFocus={{ scale: 1.01 }}
          />
        </div>

        {/* API Key */}
        <div className="mb-4">
          <label className="text-xs font-medium text-amber-700 mb-2 block">
            🔑 API Key
          </label>
          <div className="relative">
            <motion.input
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your API key"
              className="w-full p-2 pr-8 text-xs border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-800 nodrag"
              whileFocus={{ scale: 1.01 }}
            />
            <motion.button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-amber-600 hover:text-amber-800 nodrag"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {showApiKey ? '🙈' : '👁️'}
            </motion.button>
          </div>
        </div>

        {/* Advanced Settings Toggle */}
        <div className="mb-4">
          <motion.button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 text-xs text-amber-700 hover:text-amber-800 transition-colors nodrag"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.span
              animate={{ rotate: showAdvanced ? 90 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              ▶
            </motion.span>
            <span>Advanced Settings</span>
          </motion.button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                className="mt-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <label className="text-xs font-medium text-amber-700 mb-2 block">
                  🌐 Custom Endpoint (Optional)
                </label>
                <motion.input
                  type="text"
                  value={customEndpoint}
                  onChange={(e) => setCustomEndpoint(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="https://api.custom-git.com"
                  className="w-full p-2 text-xs border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-800 nodrag"
                  whileFocus={{ scale: 1.01 }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Fetch Button */}
        <motion.button
          ref={fetchButtonRef}
          onClick={fetchRepoContents}
          onMouseDown={handleInteractionEvent}
          disabled={isLoading || !apiKey || !repoUrl}
          className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 mb-3 nodrag ${
            isLoading || !apiKey || !repoUrl
              ? 'bg-amber-200 text-amber-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg'
          }`}
          whileHover={{
            scale: isLoading || !apiKey || !repoUrl ? 1 : 1.02,
            boxShadow: isLoading || !apiKey || !repoUrl ? undefined : "0 8px 20px rgba(245, 158, 11, 0.3)"
          }}
          whileTap={{ scale: isLoading || !apiKey || !repoUrl ? 1 : 0.98 }}
        >
          <div className="flex items-center justify-center space-x-2">
            {isLoading ? (
              <>
                <motion.div
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span>Fetching Repository...</span>
              </>
            ) : (
              <>
                <span>🐙</span>
                <span>Fetch Repository</span>
              </>
            )}
          </div>
        </motion.button>

        {/* Connection Status */}
        <div className="mb-3">
          <div
            className={`text-xs px-3 py-2 rounded-full inline-block transition-all duration-300 ${
              repoData
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-600 border border-amber-200'
            }`}
          >
            {repoData ? '✅ Repository Data Ready' : '⏸️ Ready to Fetch'}
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

        {/* Repository Results */}
        <AnimatePresence>
          {repoData && (
            <motion.div
              className="text-xs bg-white border border-amber-200 rounded-lg overflow-hidden shadow-lg nowheel"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onMouseDown={handleInteractionEvent}
            >
              <motion.div
                className="bg-gradient-to-r from-amber-50 to-orange-50 p-3 cursor-pointer hover:from-amber-100 hover:to-orange-100 transition-all duration-300 nodrag"
                onClick={() => setIsExpanded(!isExpanded)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-amber-800">
                    📁 {repoData.owner}/{repoData.repo}
                  </div>
                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="text-amber-600"
                  >
                    ▼
                  </motion.span>
                </div>
                <div className="text-amber-700 text-xs mt-1">
                  {repoData.totalFiles} files, {repoData.totalFolders} folders
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
                    {repoData.contents.slice(0, 20).map((item, index) => (
                      <motion.div
                        key={index}
                        className="flex items-center space-x-2 py-1 hover:bg-amber-50 rounded transition-colors"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        whileHover={{ scale: 1.01, x: 4 }}
                      >
                        <span className="text-sm">
                          {item.type === 'folder' ? '📁' : '📄'}
                        </span>
                        <span className="text-xs text-amber-700 flex-1 truncate">{item.name}</span>
                        {item.size > 0 && (
                          <span className="text-xs text-amber-500 bg-amber-100 px-1 rounded">
                            {(item.size / 1024).toFixed(1)}KB
                          </span>
                        )}
                      </motion.div>
                    ))}
                    {repoData.contents.length > 20 && (
                      <div className="text-xs text-amber-500 text-center py-2">
                        ...and {repoData.contents.length - 20} more items
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
});

export default GitNode;
