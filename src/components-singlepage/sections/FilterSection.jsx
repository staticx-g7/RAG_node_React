// components-singlepage/sections/FilterSection.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePipeline } from '../../contexts/PipelineContext';

// Enhanced Tree Component with Checkboxes
const TreeNode = ({
  node,
  level = 0,
  onToggle,
  onCheck,
  expandedPaths,
  checkedPaths,
  showCheckboxes = true
}) => {
  const isExpanded = expandedPaths.has(node.path);
  const isChecked = checkedPaths.has(node.path);
  const hasChildren = node.children && node.children.length > 0;

  // Check if partially checked (some children checked)
  const isPartiallyChecked = useMemo(() => {
    if (!hasChildren) return false;
    const childPaths = getAllChildPaths(node);
    const checkedChildren = childPaths.filter(path => checkedPaths.has(path));
    return checkedChildren.length > 0 && checkedChildren.length < childPaths.length;
  }, [node, checkedPaths, hasChildren]);

  return (
    <div>
      <div
        className={`flex items-center py-2 px-2 hover:bg-gray-50 ${
          isChecked ? 'bg-blue-50' : ''
        }`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {/* Expand/Collapse Button */}
        {hasChildren && (
          <button
            onClick={() => onToggle(node.path)}
            className="mr-2 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        )}

        {/* Checkbox for folders */}
        {showCheckboxes && node.type === 'dir' && (
          <input
            type="checkbox"
            checked={isChecked}
            ref={input => {
              if (input) input.indeterminate = isPartiallyChecked;
            }}
            onChange={(e) => onCheck(node.path, e.target.checked)}
            className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        )}

        {/* Icon */}
        <span className="mr-2 text-lg">
          {node.type === 'dir' ? (isExpanded ? '📂' : '📁') : getFileIcon(node.name)}
        </span>

        {/* Name */}
        <span className="text-sm text-gray-700 flex-1">{node.name}</span>

        {/* File count for folders */}
        {node.type === 'dir' && hasChildren && (
          <span className="text-xs text-gray-500 ml-2">
            {getFileCount(node)} files
          </span>
        )}

        {/* File size for files */}
        {node.type === 'file' && (
          <span className="text-xs text-gray-500 ml-2">
            {formatFileSize(node.size)}
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              level={level + 1}
              onToggle={onToggle}
              onCheck={onCheck}
              expandedPaths={expandedPaths}
              checkedPaths={checkedPaths}
              showCheckboxes={showCheckboxes}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Helper functions
const getAllChildPaths = (node) => {
  let paths = [];
  if (node.children) {
    node.children.forEach(child => {
      paths.push(child.path);
      if (child.children) {
        paths = paths.concat(getAllChildPaths(child));
      }
    });
  }
  return paths;
};

const getFileCount = (node) => {
  let count = 0;
  if (node.children) {
    node.children.forEach(child => {
      if (child.type === 'file') {
        count++;
      } else if (child.children) {
        count += getFileCount(child);
      }
    });
  }
  return count;
};

const getFileIcon = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const iconMap = {
    js: '📄', jsx: '⚛️', ts: '📘', tsx: '⚛️',
    py: '🐍', java: '☕', cpp: '⚙️', c: '⚙️', h: '🔧',
    html: '🌐', css: '🎨', scss: '🎨', sass: '🎨',
    json: '📋', xml: '📄', yaml: '📄', yml: '📄',
    md: '📝', txt: '📄', pdf: '📕',
    png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🖼️',
    mp4: '🎬', mov: '🎬', avi: '🎬',
    zip: '📦', tar: '📦', gz: '📦',
    gitignore: '🚫', dockerfile: '🐳',
    package: '📦', lock: '🔒'
  };

  if (filename.startsWith('.')) return '⚙️';
  return iconMap[ext] || '📄';
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

const FilterSection = () => {
  const { state, dispatch } = usePipeline();
  const { git, filter } = state;

  // Local processing state only (not persistent data)
  const [localState, setLocalState] = useState({
    isLoading: false,
    error: null,
    fileStats: {
      totalFiles: 0,
      totalFolders: 0,
      selectedFiles: 0,
      totalSize: 0
    }
  });

  // Get persistent state from pipeline context
  const {
    repoStructure = null,
    expandedPaths = new Set(['/']),
    checkedFolders = new Set(['/']),
    step = 1,
    detectedFormats = new Map(),
    selectedFormats = new Set(),
    availableFiles = [],
    selectedFiles = new Set(),
    filteredFiles = []
  } = filter;

  // Update filter state helper
  const updateFilterState = useCallback((updates) => {
    dispatch({
      type: 'UPDATE_FILTER',
      payload: {
        ...filter,
        ...updates
      }
    });
  }, [dispatch, filter]);

  // Fetch repository structure when git connection is available
  useEffect(() => {
    if (git.isConnected && git.owner && git.repo && git.branch && !repoStructure) {
      fetchRepositoryStructure();
    }
  }, [git.isConnected, git.owner, git.repo, git.branch, repoStructure]);

  // Auto-detect formats when folders are selected
  useEffect(() => {
    if (repoStructure && checkedFolders.size > 0) {
      detectFileFormats();
    }
  }, [checkedFolders, repoStructure]);

  // Update available files when formats are selected
  useEffect(() => {
    if (selectedFormats.size > 0) {
      updateAvailableFiles();
    }
  }, [selectedFormats, checkedFolders, repoStructure]);

  const fetchRepositoryStructure = async () => {
    setLocalState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'RAG-Node-React'
      };

      if (git.token) {
        headers['Authorization'] = `token ${git.token}`;
      }

      const treeResponse = await fetch(
        `https://api.github.com/repos/${git.owner}/${git.repo}/git/trees/${git.branch}?recursive=1`,
        { headers }
      );

      if (!treeResponse.ok) {
        throw new Error(`Failed to fetch repository structure: ${treeResponse.status}`);
      }

      const treeData = await treeResponse.json();
      const structure = buildTreeStructure(treeData.tree);
      const stats = calculateFileStats(treeData.tree);

      updateFilterState({
        repoStructure: structure
      });

      setLocalState(prev => ({
        ...prev,
        isLoading: false,
        fileStats: stats
      }));

    } catch (error) {
      setLocalState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
    }
  };

  const buildTreeStructure = (treeItems) => {
    const root = {
      name: git.repo,
      path: '/',
      type: 'dir',
      children: []
    };

    const pathMap = { '/': root };

    const sortedItems = [...treeItems].sort((a, b) => {
      if (a.type === 'tree' && b.type === 'blob') return -1;
      if (a.type === 'blob' && b.type === 'tree') return 1;
      return a.path.localeCompare(b.path);
    });

    sortedItems.forEach(item => {
      const pathParts = item.path.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const parentPath = pathParts.length > 1 ? '/' + pathParts.slice(0, -1).join('/') : '/';

      // Ensure parent directories exist
      let currentPath = '/';
      for (let i = 0; i < pathParts.length - 1; i++) {
        const nextPath = currentPath === '/' ? `/${pathParts[i]}` : `${currentPath}/${pathParts[i]}`;

        if (!pathMap[nextPath]) {
          const dirNode = {
            name: pathParts[i],
            path: nextPath,
            type: 'dir',
            children: []
          };
          pathMap[nextPath] = dirNode;
          pathMap[currentPath].children.push(dirNode);
        }
        currentPath = nextPath;
      }

      // Add the current item
      const node = {
        name: fileName,
        path: '/' + item.path,
        type: item.type === 'tree' ? 'dir' : 'file',
        size: item.size,
        sha: item.sha,
        url: item.url,
        children: item.type === 'tree' ? [] : undefined
      };

      if (pathMap[parentPath]) {
        pathMap[parentPath].children.push(node);
        pathMap['/' + item.path] = node;
      }
    });

    return root;
  };

  const calculateFileStats = (treeItems) => {
    const stats = {
      totalFiles: 0,
      totalFolders: 0,
      selectedFiles: 0,
      totalSize: 0
    };

    treeItems.forEach(item => {
      if (item.type === 'blob') {
        stats.totalFiles++;
        stats.totalSize += item.size || 0;
      } else {
        stats.totalFolders++;
      }
    });

    return stats;
  };

  const detectFileFormats = () => {
    const formats = new Map();

    const scanNode = (node) => {
      if (node.type === 'file') {
        const ext = '.' + node.name.split('.').pop()?.toLowerCase();
        if (ext && ext !== '.') {
          const current = formats.get(ext) || { count: 0, size: 0 };
          formats.set(ext, {
            count: current.count + 1,
            size: current.size + (node.size || 0)
          });
        }
      }

      if (node.children) {
        node.children.forEach(child => {
          // Only scan if this folder is selected or if it's a child of selected folder
          const isInSelectedFolder = Array.from(checkedFolders).some(folderPath =>
            child.path.startsWith(folderPath) || folderPath === '/'
          );

          if (isInSelectedFolder) {
            scanNode(child);
          }
        });
      }
    };

    if (repoStructure) {
      scanNode(repoStructure);
    }

    // Auto-select common formats
    const commonFormats = ['.js', '.jsx', '.ts', '.tsx', '.py', '.md', '.json', '.css', '.cpp', '.h', '.c'];
    const autoSelected = new Set();
    commonFormats.forEach(format => {
      if (formats.has(format)) {
        autoSelected.add(format);
      }
    });

    updateFilterState({
      detectedFormats: formats,
      selectedFormats: autoSelected
    });
  };

  const updateAvailableFiles = () => {
    const files = [];

    const scanNode = (node) => {
      if (node.type === 'file') {
        const ext = '.' + node.name.split('.').pop()?.toLowerCase();
        if (selectedFormats.has(ext)) {
          files.push({
            ...node,
            extension: ext
          });
        }
      }

      if (node.children) {
        node.children.forEach(child => {
          const isInSelectedFolder = Array.from(checkedFolders).some(folderPath =>
            child.path.startsWith(folderPath) || folderPath === '/'
          );

          if (isInSelectedFolder) {
            scanNode(child);
          }
        });
      }
    };

    if (repoStructure) {
      scanNode(repoStructure);
    }

    // Auto-select all files initially
    const autoSelectedFiles = new Set(files.map(f => f.path));

    updateFilterState({
      availableFiles: files,
      selectedFiles: autoSelectedFiles
    });
  };

  const handleToggleExpand = (path) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    updateFilterState({ expandedPaths: newExpanded });
  };

  const handleCheckFolder = (path, checked) => {
    const newChecked = new Set(checkedFolders);
    if (checked) {
      newChecked.add(path);
    } else {
      newChecked.delete(path);
    }
    updateFilterState({ checkedFolders: newChecked });
  };

  const handleFormatToggle = (format) => {
    const newFormats = new Set(selectedFormats);
    if (newFormats.has(format)) {
      newFormats.delete(format);
    } else {
      newFormats.add(format);
    }
    updateFilterState({ selectedFormats: newFormats });
  };

  const handleFileToggle = (filePath) => {
    const newFiles = new Set(selectedFiles);
    if (newFiles.has(filePath)) {
      newFiles.delete(filePath);
    } else {
      newFiles.add(filePath);
    }
    updateFilterState({ selectedFiles: newFiles });
  };

  const setStep = (newStep) => {
    updateFilterState({ step: newStep });
  };

  const applyFilters = () => {
    const filteredFilesList = availableFiles.filter(file => selectedFiles.has(file.path));

    updateFilterState({
      filteredFiles: filteredFilesList
    });

    console.log('🔧 Applied filters:', {
      selectedFolders: checkedFolders.size,
      selectedFormats: selectedFormats.size,
      finalFiles: filteredFilesList.length,
      cppFiles: filteredFilesList.filter(f => f.path.includes('.cpp')).length
    });
  };

  if (!git.isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">File Filtering</h1>
          <p className="text-gray-600">Configure which files and folders to include in your RAG pipeline.</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-amber-500">⚠️</span>
            <span className="text-amber-700 font-medium">Repository Not Connected</span>
          </div>
          <p className="text-amber-700 text-sm mt-1">
            Please connect to a repository in the "Repository Setup" section first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">File Filtering</h1>
        <p className="text-gray-600">Select folders, then file formats, then specific files to include in your RAG pipeline.</p>
      </div>

      {/* Repository Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-800">Connected Repository</h3>
            <p className="text-blue-600 text-sm">{git.owner}/{git.repo} • {git.branch}</p>
          </div>
          <button
            onClick={fetchRepositoryStructure}
            disabled={localState.isLoading}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {localState.isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          {[
            { num: 1, title: 'Select Folders', desc: 'Choose directories' },
            { num: 2, title: 'File Formats', desc: 'Pick file types' },
            { num: 3, title: 'Final Selection', desc: 'Review & filter' }
          ].map((stepInfo, index) => (
            <div key={stepInfo.num} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                step >= stepInfo.num ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {stepInfo.num}
              </div>
              <div className="ml-2">
                <div className="text-sm font-medium text-gray-800">{stepInfo.title}</div>
                <div className="text-xs text-gray-500">{stepInfo.desc}</div>
              </div>
              {index < 2 && <div className="mx-4 w-8 h-px bg-gray-300"></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Folder Selection */}
      {step === 1 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Step 1: Select Folders</h2>
            <p className="text-sm text-gray-600">Choose which folders to include. Root folder is selected by default.</p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {localState.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading repository structure...</span>
              </div>
            ) : localState.error ? (
              <div className="p-4 text-red-600">
                <span className="font-medium">Error:</span> {localState.error}
              </div>
            ) : repoStructure ? (
              <TreeNode
                node={repoStructure}
                onToggle={handleToggleExpand}
                onCheck={handleCheckFolder}
                expandedPaths={expandedPaths}
                checkedPaths={checkedFolders}
                showCheckboxes={true}
              />
            ) : null}
          </div>

          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {checkedFolders.size} folders selected
            </span>
            <button
              onClick={() => setStep(2)}
              disabled={checkedFolders.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Next: File Formats →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: File Format Selection */}
      {step === 2 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Step 2: File Formats</h2>
              <p className="text-sm text-gray-600">Auto-detected file types in selected folders</p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="px-3 py-1 text-blue-600 hover:text-blue-800"
            >
              ← Back to Folders
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from(detectedFormats.entries()).map(([format, info]) => (
              <button
                key={format}
                onClick={() => handleFormatToggle(format)}
                className={`p-3 rounded-lg border transition-all ${
                  selectedFormats.has(format)
                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="font-mono text-sm font-semibold">{format}</div>
                <div className="text-xs">{info.count} files</div>
                <div className="text-xs">{formatFileSize(info.size)}</div>
              </button>
            ))}
          </div>

          <div className="mt-6 flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {selectedFormats.size} formats selected
            </span>
            <button
              onClick={() => setStep(3)}
              disabled={selectedFormats.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Next: File Selection →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Final File Selection */}
      {step === 3 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Step 3: Final Selection</h2>
              <p className="text-sm text-gray-600">{availableFiles.length} files available for processing</p>
            </div>
            <button
              onClick={() => setStep(2)}
              className="px-3 py-1 text-blue-600 hover:text-blue-800"
            >
              ← Back to Formats
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto p-4">
            <div className="space-y-2">
              {availableFiles.map((file) => (
                <div key={file.path} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.path)}
                    onChange={() => handleFileToggle(file.path)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-lg">{getFileIcon(file.name)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{file.name}</div>
                    <div className="text-xs text-gray-500">{file.path}</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {selectedFiles.size} of {availableFiles.length} files selected
            </span>
            <button
              onClick={applyFilters}
              disabled={selectedFiles.size === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              ✅ Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {filteredFiles.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">📊 Filter Results</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-green-600 font-medium">Selected Folders</div>
              <div className="text-green-800">{checkedFolders.size}</div>
            </div>
            <div>
              <div className="text-green-600 font-medium">File Formats</div>
              <div className="text-green-800">{selectedFormats.size}</div>
            </div>
            <div>
              <div className="text-green-600 font-medium">Final Files</div>
              <div className="text-green-800">{filteredFiles.length}</div>
            </div>
            <div>
              <div className="text-green-600 font-medium">CPP Files</div>
              <div className="text-green-800">{filteredFiles.filter(f => f.path.includes('.cpp')).length}</div>
            </div>
          </div>
          <div className="mt-2 text-sm text-green-700">
            <strong>Next Step:</strong> Go to "Text Processing" to chunk these files for vectorization.
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterSection;
