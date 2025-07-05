// components-singlepage/sections/GitConfigSection.jsx
import React, { useState, useEffect } from 'react';
import { usePipeline } from '../../contexts/PipelineContext';

const GitConfigSection = () => {
  const { state, dispatch } = usePipeline();
  const { git } = state;

  const [localState, setLocalState] = useState({
    isConnecting: false,
    fetchingBranches: false,
    error: null
  });

  // Auto-detect platform from URL
  const detectPlatform = (url) => {
    if (!url) return 'github';
    if (url.includes('github.com')) return 'github';
    if (url.includes('gitlab.com') || url.includes('gitlab.')) return 'gitlab';
    if (url.includes('bitbucket.org') || url.includes('bitbucket.')) return 'bitbucket';
    return 'github';
  };

  // Parse repository URL
  const parseRepositoryUrl = (url) => {
    if (!url) return { owner: '', repo: '' };
    const cleanUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');

    let match;
    if (cleanUrl.includes('github.com')) {
      match = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    } else if (cleanUrl.includes('gitlab.com')) {
      match = cleanUrl.match(/gitlab\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    } else if (cleanUrl.includes('bitbucket.org')) {
      match = cleanUrl.match(/bitbucket\.org\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    } else if (cleanUrl.includes('/') && !cleanUrl.includes('.')) {
      match = cleanUrl.match(/^([^\/]+)\/([^\/]+)$/);
    }

    if (match) {
      return { owner: match[1], repo: match[2] };
    }
    return { owner: '', repo: '' };
  };

  // Handle URL change
  const handleUrlChange = (url) => {
    const platform = detectPlatform(url);
    const { owner, repo } = parseRepositoryUrl(url);

    dispatch({
      type: 'UPDATE_GIT',
      payload: {
        repositoryUrl: url,
        platform,
        owner,
        repo,
        isConnected: false,
        availableBranches: [],
        repoInfo: null
      }
    });

    setLocalState(prev => ({ ...prev, error: null }));
  };

  // GitHub API calls (same as before)
  const fetchGitHubBranches = async (owner, repo, token) => {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'RAG-Node-React'
    };

    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!repoResponse.ok) {
      throw new Error(`Failed to fetch repository: ${repoResponse.status} ${repoResponse.statusText}`);
    }
    const repoData = await repoResponse.json();

    const branchesResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, { headers });
    if (!branchesResponse.ok) {
      throw new Error(`Failed to fetch branches: ${branchesResponse.status} ${branchesResponse.statusText}`);
    }
    const branchesData = await branchesResponse.json();

    return {
      repoInfo: {
        name: repoData.name,
        fullName: repoData.full_name,
        description: repoData.description,
        defaultBranch: repoData.default_branch,
        isPrivate: repoData.private,
        language: repoData.language,
        size: repoData.size,
        stargazersCount: repoData.stargazers_count
      },
      branches: branchesData.map(branch => ({
        name: branch.name,
        isDefault: branch.name === repoData.default_branch,
        sha: branch.commit.sha
      }))
    };
  };

  // Handle connect
  const handleConnect = async () => {
    if (!git.owner || !git.repo) {
      setLocalState(prev => ({ ...prev, error: 'Please enter a valid repository URL' }));
      return;
    }

    setLocalState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const { repoInfo, branches } = await fetchGitHubBranches(git.owner, git.repo, git.token);

      const defaultBranch = branches.find(b => b.isDefault) || branches[0];

      dispatch({
        type: 'UPDATE_GIT',
        payload: {
          isConnected: true,
          availableBranches: branches,
          repoInfo,
          branch: defaultBranch?.name || 'main'
        }
      });

      setLocalState(prev => ({ ...prev, isConnecting: false }));
    } catch (error) {
      setLocalState(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message
      }));
    }
  };

  // Update other fields
  const updateGitField = (field, value) => {
    dispatch({
      type: 'UPDATE_GIT',
      payload: { [field]: value }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Repository Configuration</h1>
        <p className="text-gray-600">Connect to your Git repository to start the RAG pipeline.</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Repository Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Repository URL</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://github.com/owner/repo or owner/repo"
              value={git.repositoryUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Supports GitHub, GitLab, and Bitbucket URLs. Platform will be auto-detected.
            </p>
          </div>

          {git.owner && git.repo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <span className="text-lg">
                  {git.platform === 'github' && '🐙'}
                  {git.platform === 'gitlab' && '🦊'}
                  {git.platform === 'bitbucket' && '🪣'}
                </span>
                <div>
                  <div className="font-medium text-blue-800">
                    {git.platform.charAt(0).toUpperCase() + git.platform.slice(1)} Repository
                  </div>
                  <div className="text-sm text-blue-600">{git.owner}/{git.repo}</div>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Access Token (Optional)</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="ghp_xxxxxxxxxxxx (for private repositories)"
              value={git.token}
              onChange={(e) => updateGitField('token', e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Required for private repositories</p>
          </div>

          {git.availableBranches.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={git.branch}
                onChange={(e) => updateGitField('branch', e.target.value)}
              >
                {git.availableBranches.map(branch => (
                  <option key={branch.name} value={branch.name}>
                    {branch.name} {branch.isDefault && '(default)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {localState.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <span className="text-red-500">❌</span>
                <span className="text-red-700 text-sm">{localState.error}</span>
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={handleConnect}
              disabled={localState.isConnecting || !git.owner || !git.repo}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                git.isConnected
                  ? 'bg-green-600 text-white'
                  : localState.isConnecting
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {localState.isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                  Connecting...
                </>
              ) : git.isConnected ? (
                '✓ Connected'
              ) : (
                'Connect Repository'
              )}
            </button>
          </div>
        </div>
      </div>

      {git.repoInfo && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Repository Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-600">Name:</span>
              <span className="text-sm text-gray-800 ml-2">{git.repoInfo.name}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Default Branch:</span>
              <span className="text-sm text-gray-800 ml-2">{git.repoInfo.defaultBranch}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Visibility:</span>
              <span className="text-sm text-gray-800 ml-2">{git.repoInfo.isPrivate ? 'Private' : 'Public'}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Branches:</span>
              <span className="text-sm text-gray-800 ml-2">{git.availableBranches.length}</span>
            </div>
          </div>

          {git.repoInfo.description && (
            <div className="mt-4">
              <span className="text-sm font-medium text-gray-600">Description:</span>
              <p className="text-sm text-gray-800 mt-1">{git.repoInfo.description}</p>
            </div>
          )}
        </div>
      )}

      {/* Pipeline Status */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-green-800 mb-2">🔄 Pipeline Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-green-600 font-medium">Repository:</span>
            <span className="text-green-800 ml-2">
              {git.isConnected ? '✅ Connected' : '❌ Not Connected'}
            </span>
          </div>
          <div>
            <span className="text-green-600 font-medium">Next Step:</span>
            <span className="text-green-800 ml-2">
              {git.isConnected ? 'File Filtering' : 'Connect Repository'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitConfigSection;
