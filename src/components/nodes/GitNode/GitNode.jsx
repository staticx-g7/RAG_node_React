import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Handle, Position, useReactFlow } from '@xyflow/react';

const BackgroundBeams = ({ className }) => (
  <div className={`absolute inset-0 overflow-hidden ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-amber-50/20 via-orange-50/20 to-yellow-50/20" />
    <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-amber-200/30 to-transparent" />
    <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-200/30 to-transparent" />
  </div>
);

const GitNode = ({ id, data, selected }) => {
  const { updateNodeData } = useReactFlow();

  // State management
  const [showSettings, setShowSettings] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [repositoryFiles, setRepositoryFiles] = useState([]);
  const [repositoryContent, setRepositoryContent] = useState('');
  const [availableBranches, setAvailableBranches] = useState([]);
  const [availableExtensions, setAvailableExtensions] = useState([]);
  const [repositoryInfo, setRepositoryInfo] = useState(null);

  // Git settings
  const [settings, setSettings] = useState({
    platform: data.platform || 'github',
    repositoryUrl: data.repositoryUrl || '',
    repository: data.repository || '',
    branch: data.branch || 'main',
    accessToken: data.accessToken || '',
    includePrivate: data.includePrivate || false,
    maxFiles: data.maxFiles || 100,
    maxFileSize: data.maxFileSize || 5, // MB
    includeExtensions: data.includeExtensions || [],
    excludePatterns: data.excludePatterns || ['node_modules', '.git', 'dist', 'build', '.next'],
    fetchContent: data.fetchContent !== false,
    includeMetadata: data.includeMetadata !== false,
    autoDetectPlatform: data.autoDetectPlatform !== false,
  });

  const [stats, setStats] = useState({
    totalFiles: 0,
    fetchedFiles: 0,
    totalSize: 0,
    processingTime: 0,
    lastFetched: null,
    errors: 0,
    totalBranches: 0,
    totalExtensions: 0,
  });

  // Update node data when settings or files change
  useEffect(() => {
    updateNodeData(id, {
      ...settings,
      stats,
      repositoryInfo,
      availableBranches,
      availableExtensions,

      // Store data in multiple formats for FilterNode compatibility
      repositoryFiles: repositoryFiles,
      repositoryContent: repositoryContent,
      files: repositoryFiles,
      fetchedFiles: repositoryFiles,
      output: repositoryFiles,
      content: repositoryContent,
      text: repositoryContent,
      extractedText: repositoryContent,

      lastUpdated: Date.now()
    });
  }, [settings, stats, repositoryFiles, repositoryContent, availableBranches, availableExtensions, repositoryInfo, id, updateNodeData]);

  // Handle setting changes
  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };

    // Auto-detect platform from URL
    if (key === 'repositoryUrl' && settings.autoDetectPlatform) {
      if (value.includes('github.com')) {
        newSettings.platform = 'github';
        const match = value.match(/github\.com\/([^\/]+\/[^\/]+)/);
        if (match) {
          newSettings.repository = match[1].replace('.git', '');
        }
      } else if (value.includes('gitlab.com')) {
        newSettings.platform = 'gitlab';
        const match = value.match(/gitlab\.com\/([^\/]+\/[^\/]+)/);
        if (match) {
          newSettings.repository = match[1].replace('.git', '');
        }
      }
    }

    setSettings(newSettings);
  };

  // Analyze repository to get all available extensions
  const analyzeRepository = useCallback(async () => {
    if (!settings.repository) {
      alert('Please enter a repository name first');
      return;
    }

    setIsAnalyzing(true);

    try {
      console.log('🔍 Analyzing repository for extensions...');

      let allFiles = [];
      if (settings.platform === 'github') {
        allFiles = await fetchGitHubFileList();
      } else if (settings.platform === 'gitlab') {
        allFiles = await fetchGitLabFileList();
      }

      // Extract unique extensions
      const extensions = new Set();
      allFiles.forEach(file => {
        const fileName = file.path || file.name || '';
        const extension = fileName.split('.').pop()?.toLowerCase();
        if (extension && extension !== fileName.toLowerCase()) {
          extensions.add(extension);
        }
      });

      const sortedExtensions = Array.from(extensions).sort();
      setAvailableExtensions(sortedExtensions);

      // Auto-select common code extensions if none selected
      if (settings.includeExtensions.length === 0) {
        const commonExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'md', 'txt', 'json'];
        const autoSelected = sortedExtensions.filter(ext => commonExtensions.includes(ext));
        handleSettingChange('includeExtensions', autoSelected);
      }

      setStats(prev => ({
        ...prev,
        totalExtensions: sortedExtensions.length
      }));

      console.log('✅ Found extensions:', sortedExtensions);

    } catch (error) {
      console.error('❌ Repository analysis error:', error);
      alert(`Failed to analyze repository: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [settings]);

  // Fetch file list without content for analysis
  const fetchGitHubFileList = async () => {
    const [owner, repo] = settings.repository.split('/');
    if (!owner || !repo) {
      throw new Error('Invalid repository format. Use: owner/repository');
    }

    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'RAG-Node-App'
    };

    if (settings.accessToken) {
      headers['Authorization'] = `token ${settings.accessToken}`;
    }

    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${settings.branch || 'main'}?recursive=1`;
    const response = await fetch(treeUrl, { headers });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`GitHub API error: ${errorData.message}`);
    }

    const data = await response.json();
    return data.tree.filter(item => item.type === 'blob');
  };

  const fetchGitLabFileList = async () => {
    const projectId = encodeURIComponent(settings.repository);
    const headers = { 'Content-Type': 'application/json' };

    if (settings.accessToken) {
      headers['Authorization'] = `Bearer ${settings.accessToken}`;
    }

    const treeUrl = `https://gitlab.com/api/v4/projects/${projectId}/repository/tree?recursive=true&ref=${settings.branch || 'main'}`;
    const response = await fetch(treeUrl, { headers });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`GitLab API error: ${errorData.message}`);
    }

    return await response.json();
  };

  // Handle extension selection
  const handleExtensionToggle = (extension, isSelected) => {
    const newExtensions = isSelected
      ? [...settings.includeExtensions, extension]
      : settings.includeExtensions.filter(ext => ext !== extension);

    handleSettingChange('includeExtensions', newExtensions);
  };

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    if (!settings.repository) {
      alert('Please enter a repository name first');
      return;
    }

    setIsLoadingBranches(true);

    try {
      console.log('🌿 Fetching branches...');
      let branches = [];

      if (settings.platform === 'github') {
        branches = await fetchGitHubBranches();
      } else if (settings.platform === 'gitlab') {
        branches = await fetchGitLabBranches();
      }

      setAvailableBranches(branches);
      setStats(prev => ({ ...prev, totalBranches: branches.length }));

      // Auto-select default branch if available
      if (branches.length > 0) {
        const defaultBranch = branches.find(b => b.isDefault);
        if (defaultBranch && !settings.branch) {
          handleSettingChange('branch', defaultBranch.name);
        }
      }

    } catch (error) {
      console.error('❌ Branch fetch error:', error);
      alert(`Failed to fetch branches: ${error.message}`);
    } finally {
      setIsLoadingBranches(false);
    }
  }, [settings]);

  // GitHub branch fetching
  const fetchGitHubBranches = async () => {
    const [owner, repo] = settings.repository.split('/');
    if (!owner || !repo) {
      throw new Error('Invalid repository format. Use: owner/repository');
    }

    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'RAG-Node-App'
    };

    if (settings.accessToken) {
      headers['Authorization'] = `token ${settings.accessToken}`;
    }

    // Get repository info first
    const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const repoResponse = await fetch(repoUrl, { headers });

    if (!repoResponse.ok) {
      const errorData = await repoResponse.json();
      throw new Error(`GitHub API error: ${errorData.message || repoResponse.statusText}`);
    }

    const repoData = await repoResponse.json();
    setRepositoryInfo({
      name: repoData.name,
      fullName: repoData.full_name,
      description: repoData.description,
      defaultBranch: repoData.default_branch,
      isPrivate: repoData.private,
      language: repoData.language,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count
    });

    // Get branches
    const branchesUrl = `https://api.github.com/repos/${owner}/${repo}/branches`;
    const branchesResponse = await fetch(branchesUrl, { headers });

    if (!branchesResponse.ok) {
      const errorData = await branchesResponse.json();
      throw new Error(`GitHub API error: ${errorData.message || branchesResponse.statusText}`);
    }

    const branchesData = await branchesResponse.json();

    return branchesData.map(branch => ({
      name: branch.name,
      sha: branch.commit.sha,
      isDefault: branch.name === repoData.default_branch,
      protected: branch.protected || false
    }));
  };

  const fetchGitLabBranches = async () => {
    const projectId = encodeURIComponent(settings.repository);
    const baseUrl = 'https://gitlab.com/api/v4';

    const headers = { 'Content-Type': 'application/json' };
    if (settings.accessToken) {
      headers['Authorization'] = `Bearer ${settings.accessToken}`;
    }

    const projectUrl = `${baseUrl}/projects/${projectId}`;
    const projectResponse = await fetch(projectUrl, { headers });

    if (!projectResponse.ok) {
      const errorData = await projectResponse.json();
      throw new Error(`GitLab API error: ${errorData.message || projectResponse.statusText}`);
    }

    const projectData = await projectResponse.json();
    setRepositoryInfo({
      name: projectData.name,
      fullName: projectData.path_with_namespace,
      description: projectData.description,
      defaultBranch: projectData.default_branch,
      isPrivate: projectData.visibility === 'private',
      language: projectData.languages ? Object.keys(projectData.languages)[0] : null,
      stars: projectData.star_count,
      forks: projectData.forks_count
    });

    const branchesUrl = `${baseUrl}/projects/${projectId}/repository/branches`;
    const branchesResponse = await fetch(branchesUrl, { headers });

    if (!branchesResponse.ok) {
      const errorData = await branchesResponse.json();
      throw new Error(`GitLab API error: ${errorData.message || branchesResponse.statusText}`);
    }

    const branchesData = await branchesResponse.json();

    return branchesData.map(branch => ({
      name: branch.name,
      sha: branch.commit.id,
      isDefault: branch.default,
      protected: branch.protected
    }));
  };

  // Fetch repository
  const fetchRepository = useCallback(async () => {
    if (!settings.repository.trim()) {
      alert('Please enter a repository name');
      return;
    }

    if (!settings.branch) {
      alert('Please select a branch to fetch');
      return;
    }

    setIsFetching(true);
    const startTime = Date.now();

    try {
      console.log('🚀 Starting repository fetch...');
      console.log('📁 Repository:', settings.repository);
      console.log('🌿 Branch:', settings.branch);
      console.log('📄 Extensions:', settings.includeExtensions);

      let allFiles = [];
      if (settings.platform === 'github') {
        allFiles = await fetchGitHubRepositoryFiles(settings.branch);
      } else if (settings.platform === 'gitlab') {
        allFiles = await fetchGitLabRepositoryFiles(settings.branch);
      }

      const combinedContent = allFiles
        .map(file => file.content || '')
        .filter(content => content.trim().length > 0)
        .join('\n\n');

      const processingTime = Date.now() - startTime;
      const totalSize = allFiles.reduce((sum, file) => sum + (file.size || 0), 0);

      const newStats = {
        totalFiles: allFiles.length,
        fetchedFiles: allFiles.length,
        totalSize,
        processingTime,
        lastFetched: Date.now(),
        errors: 0,
        totalBranches: 1,
        totalExtensions: availableExtensions.length,
      };

      setStats(newStats);
      setRepositoryFiles(allFiles);
      setRepositoryContent(combinedContent);

      console.log('✅ Repository fetch completed successfully');

    } catch (error) {
      console.error('❌ Repository fetch error:', error);
      alert(`Repository fetch failed: ${error.message}`);
    } finally {
      setIsFetching(false);
    }
  }, [settings, availableExtensions]);

  // GitHub file fetching
  const fetchGitHubRepositoryFiles = async (branch) => {
    const [owner, repo] = settings.repository.split('/');

    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'RAG-Node-App'
    };

    if (settings.accessToken) {
      headers['Authorization'] = `token ${settings.accessToken}`;
    }

    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    const treeResponse = await fetch(treeUrl, { headers });

    if (!treeResponse.ok) {
      const errorData = await treeResponse.json();
      throw new Error(`GitHub API error: ${errorData.message}`);
    }

    const treeData = await treeResponse.json();
    const files = [];

    for (const item of treeData.tree) {
      if (item.type !== 'blob') continue;

      const fileName = item.path.split('/').pop();
      const fileExtension = fileName.split('.').pop()?.toLowerCase();

      // Apply extension filter
      if (settings.includeExtensions.length > 0 && !settings.includeExtensions.includes(fileExtension)) {
        continue;
      }

      // Apply exclude patterns
      const shouldExclude = settings.excludePatterns.some(pattern =>
        item.path.includes(pattern)
      );
      if (shouldExclude) continue;

      if (item.size && item.size > settings.maxFileSize * 1024 * 1024) {
        continue;
      }

      let fileContent = '';
      if (settings.fetchContent && item.size < 1024 * 1024) {
        try {
          const contentResponse = await fetch(item.url, { headers });
          if (contentResponse.ok) {
            const contentData = await contentResponse.json();
            if (contentData.content) {
              fileContent = atob(contentData.content);
            }
          }
        } catch (error) {
          console.error(`Error fetching content for ${item.path}:`, error);
        }
      }

      files.push({
        name: fileName,
        filename: fileName,
        path: item.path,
        content: fileContent,
        text: fileContent,
        size: item.size || 0,
        extension: fileExtension,
        type: `text/${fileExtension}`,
        url: item.url,
        sha: item.sha,
        metadata: {
          repository: settings.repository,
          branch: branch,
          path: item.path,
          sha: item.sha,
          size: item.size,
          lastModified: new Date().toISOString()
        }
      });

      if (files.length >= settings.maxFiles) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return files;
  };

  // Similar implementation for GitLab
  const fetchGitLabRepositoryFiles = async (branch) => {
    const projectId = encodeURIComponent(settings.repository);
    const baseUrl = 'https://gitlab.com/api/v4';

    const headers = { 'Content-Type': 'application/json' };
    if (settings.accessToken) {
      headers['Authorization'] = `Bearer ${settings.accessToken}`;
    }

    const treeUrl = `${baseUrl}/projects/${projectId}/repository/tree?recursive=true&ref=${branch}`;
    const treeResponse = await fetch(treeUrl, { headers });

    if (!treeResponse.ok) {
      const errorData = await treeResponse.json();
      throw new Error(`GitLab API error: ${errorData.message}`);
    }

    const treeData = await treeResponse.json();
    const files = [];

    for (const item of treeData) {
      if (item.type !== 'blob') continue;

      const fileName = item.name;
      const fileExtension = fileName.split('.').pop()?.toLowerCase();

      if (settings.includeExtensions.length > 0 && !settings.includeExtensions.includes(fileExtension)) {
        continue;
      }

      const shouldExclude = settings.excludePatterns.some(pattern =>
        item.path.includes(pattern)
      );
      if (shouldExclude) continue;

      let fileContent = '';
      if (settings.fetchContent) {
        try {
          const contentUrl = `${baseUrl}/projects/${projectId}/repository/files/${encodeURIComponent(item.path)}/raw?ref=${branch}`;
          const contentResponse = await fetch(contentUrl, { headers });
          if (contentResponse.ok) {
            fileContent = await contentResponse.text();
          }
        } catch (error) {
          console.error(`Error fetching content for ${item.path}:`, error);
        }
      }

      files.push({
        name: fileName,
        filename: fileName,
        path: item.path,
        content: fileContent,
        text: fileContent,
        size: fileContent.length,
        extension: fileExtension,
        type: `text/${fileExtension}`,
        id: item.id,
        metadata: {
          repository: settings.repository,
          branch: branch,
          path: item.path,
          id: item.id,
          lastModified: new Date().toISOString()
        }
      });

      if (files.length >= settings.maxFiles) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return files;
  };

  return (
    <div className="relative">
      {/* FIXED: Added proper target handle for connections */}
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
          selected ? 'border-amber-400 shadow-amber-100' : 'border-gray-200'
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
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">🐙</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Git Repository</h3>
                <p className="text-xs text-gray-500">
                  {settings.platform} • {settings.branch} • {settings.includeExtensions.length} extensions
                  {stats.fetchedFiles > 0 && (
                    <span className="text-green-600"> • {stats.fetchedFiles} files</span>
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
                onClick={analyzeRepository}
                disabled={isAnalyzing}
                className="w-6 h-6 flex items-center justify-center rounded bg-purple-100 hover:bg-purple-200 transition-colors disabled:opacity-50"
                title="Analyze Extensions"
              >
                {isAnalyzing ? '🔄' : '🔍'}
              </button>
              <button
                onClick={fetchBranches}
                disabled={isLoadingBranches}
                className="w-6 h-6 flex items-center justify-center rounded bg-blue-100 hover:bg-blue-200 transition-colors disabled:opacity-50"
                title="Fetch Branches"
              >
                {isLoadingBranches ? '🔄' : '🌿'}
              </button>
              <button
                onClick={fetchRepository}
                disabled={isFetching}
                className="w-6 h-6 flex items-center justify-center rounded bg-amber-100 hover:bg-amber-200 transition-colors disabled:opacity-50"
                title="Fetch Repository"
              >
                {isFetching ? '🔄' : '📥'}
              </button>
            </div>
          </div>
        </div>

        {/* Repository Info */}
        {repositoryInfo && (
          <div className="relative z-10 px-4 py-2 bg-amber-50 border-b border-amber-100">
            <div className="text-xs">
              <div className="font-semibold text-amber-800">{repositoryInfo.name}</div>
              <div className="text-amber-700">
                {repositoryInfo.language} • ⭐ {repositoryInfo.stars} • 🍴 {repositoryInfo.forks}
              </div>
            </div>
          </div>
        )}

        {/* FIXED: Branch Selection as Dropdown */}
        {availableBranches.length > 0 && (
          <div className="relative z-10 px-4 py-2 border-b border-gray-100">
            <div className="text-xs font-medium text-gray-700 mb-2">
              Select Branch
            </div>
            <select
              value={settings.branch}
              onChange={(e) => {
                e.stopPropagation();
                handleSettingChange('branch', e.target.value);
              }}
              className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">Select a branch...</option>
              {availableBranches.map((branch, index) => (
                <option key={index} value={branch.name}>
                  {branch.name}
                  {branch.isDefault && ' (default)'}
                  {branch.protected && ' 🔒'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Extension Selection */}
        {availableExtensions.length > 0 && (
          <div className="relative z-10 px-4 py-2 border-b border-gray-100">
            <div className="text-xs font-medium text-gray-700 mb-2">
              File Extensions ({settings.includeExtensions.length}/{availableExtensions.length})
            </div>
            <div className="max-h-24 overflow-y-auto">
              <div className="grid grid-cols-4 gap-1">
                {availableExtensions.map((ext, index) => (
                  <label key={index} className="flex items-center space-x-1 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.includeExtensions.includes(ext)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleExtensionToggle(ext, e.target.checked);
                      }}
                      className="rounded text-xs"
                      style={{ transform: 'scale(0.8)' }}
                    />
                    <span className="text-xs">.{ext}</span>
                  </label>
                ))}
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
                {/* Repository URL */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Repository URL
                  </label>
                  <input
                    type="text"
                    value={settings.repositoryUrl}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSettingChange('repositoryUrl', e.target.value);
                    }}
                    placeholder="https://github.com/owner/repo"
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                {/* Platform Selection */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Platform
                  </label>
                  <select
                    value={settings.platform}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSettingChange('platform', e.target.value);
                    }}
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="github">GitHub</option>
                    <option value="gitlab">GitLab</option>
                  </select>
                </div>

                {/* Repository Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Repository (owner/repo)
                  </label>
                  <input
                    type="text"
                    value={settings.repository}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSettingChange('repository', e.target.value);
                    }}
                    placeholder="facebook/react"
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                {/* Access Token */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Access Token (optional)
                  </label>
                  <input
                    type="password"
                    value={settings.accessToken}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSettingChange('accessToken', e.target.value);
                    }}
                    placeholder="ghp_... or glpat-..."
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                {/* File Limits with proper event handling */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Max Files ({settings.maxFiles})
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="1000"
                      step="10"
                      value={settings.maxFiles}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSettingChange('maxFiles', parseInt(e.target.value));
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      className="w-full nodrag"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Max Size ({settings.maxFileSize} MB)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      step="1"
                      value={settings.maxFileSize}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSettingChange('maxFileSize', parseInt(e.target.value));
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      className="w-full nodrag"
                    />
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Auto-detect Platform</label>
                    <input
                      type="checkbox"
                      checked={settings.autoDetectPlatform}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSettingChange('autoDetectPlatform', e.target.checked);
                      }}
                      className="rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-700">Fetch Content</label>
                    <input
                      type="checkbox"
                      checked={settings.fetchContent}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSettingChange('fetchContent', e.target.checked);
                      }}
                      className="rounded"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Processing Indicators */}
        {(isFetching || isLoadingBranches || isAnalyzing) && (
          <div className="relative z-10 p-4">
            <div className="flex items-center justify-center space-x-2 text-sm text-amber-600">
              <div className="animate-spin w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full"></div>
              <span>
                {isAnalyzing ? 'Analyzing extensions...' :
                 isLoadingBranches ? 'Loading branches...' :
                 'Fetching repository...'}
              </span>
            </div>
          </div>
        )}

        {/* Stats Display */}
        {stats.fetchedFiles > 0 && (
          <div className="relative z-10 px-4 py-2 bg-amber-50 border-b border-amber-100">
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="text-center">
                <div className="font-semibold text-amber-700">{stats.fetchedFiles}</div>
                <div className="text-amber-600">Files</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-amber-700">1</div>
                <div className="text-amber-600">Branch</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-amber-700">{settings.includeExtensions.length}</div>
                <div className="text-amber-600">Types</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-amber-700">{Math.round(stats.totalSize / 1024)}KB</div>
                <div className="text-amber-600">Size</div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default GitNode;
