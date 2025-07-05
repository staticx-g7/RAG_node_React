// components-singlepage/sections/ReadmeSection.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePipeline } from '../../contexts/PipelineContext';

const ReadmeSection = () => {
  const { state, dispatch } = usePipeline();
  const { git, filter, chunk, vectorize, readme } = state;

  // Local state management
  const [localState, setLocalState] = useState({
    isDetectingModels: false,
    isGenerating: false,
    isAnalyzing: false,
    connectionStatus: 'disconnected',
    error: null,
    detectedModels: [],
    blabladorModels: [],
    existingReadme: '',
    analyzedProject: null,
    generationProgress: 0
  });

  // Simplified settings for README generation
  const [settings, setSettings] = useState({
    // Core generation settings
    model: readme.model || '',
    provider: readme.provider || 'blablador',
    tone: readme.tone || 'professional',
    maxLength: readme.maxLength || 'detailed',
    useRepositoryContext: readme.useRepositoryContext !== false,

    // Content sections to include
    includeInstallation: readme.includeInstallation !== false,
    includeUsage: readme.includeUsage !== false,
    includeFeatures: readme.includeFeatures !== false,
    includeArchitecture: readme.includeArchitecture !== false,
    includeContributing: readme.includeContributing !== false,
    includeLicense: readme.includeLicense !== false,
    includeChangelog: readme.includeChangelog || false,
    includeTesting: readme.includeTesting || false,
    includeDeployment: readme.includeDeployment || false,

    // Advanced options
    preserveExisting: readme.preserveExisting !== false,
    enhanceExisting: readme.enhanceExisting !== false,
    addMissingImplementations: readme.addMissingImplementations !== false,

    // Blablador specific settings
    blabladorApiKey: readme.blabladorApiKey || '',
    blabladorBaseUrl: readme.blabladorBaseUrl || 'https://helmholtz-blablador.fz-juelich.de:8000/v1',
    autoDetectModels: readme.autoDetectModels !== false,

    // Custom sections
    customSections: readme.customSections || []
  });

  const [generatedReadme, setGeneratedReadme] = useState(readme.generatedReadme || '');

  // README providers configuration
  const readmeProviders = useMemo(() => [
    {
      id: 'blablador',
      name: 'Blablador (Helmholtz)',
      description: 'Free research LLM server with detailed analysis',
      requiresApiKey: true,
      models: localState.blabladorModels.length > 0 ? localState.blabladorModels : []
    },
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'GPT models for professional documentation',
      requiresApiKey: true,
      models: [
        { id: 'gpt-4', name: 'GPT-4', description: 'Best for detailed documentation' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Faster generation' }
      ]
    }
  ], [localState.blabladorModels]);

  const currentProvider = readmeProviders.find(p => p.id === settings.provider);
  const currentModel = currentProvider?.models.find(m => m.id === settings.model);

  // Tone options
  const toneOptions = [
    { id: 'professional', name: 'Professional', description: 'Formal and business-oriented' },
    { id: 'friendly', name: 'Friendly', description: 'Approachable and welcoming' },
    { id: 'technical', name: 'Technical', description: 'Detailed and developer-focused' },
    { id: 'academic', name: 'Academic', description: 'Research-oriented and scholarly' }
  ];

  const lengthOptions = [
    { id: 'concise', name: 'Concise', description: 'Brief and to-the-point' },
    { id: 'standard', name: 'Standard', description: 'Balanced detail level' },
    { id: 'detailed', name: 'Detailed', description: 'Comprehensive and thorough' },
    { id: 'comprehensive', name: 'Comprehensive', description: 'Extensive with all details' }
  ];

  // Auto-detect Blablador models
  const detectBlabladorModels = useCallback(async () => {
    if (!settings.blabladorApiKey || !settings.blabladorBaseUrl) {
      setLocalState(prev => ({
        ...prev,
        error: 'API key required for model detection',
        connectionStatus: 'error'
      }));
      return;
    }

    setLocalState(prev => ({
      ...prev,
      isDetectingModels: true,
      error: null,
      connectionStatus: 'connecting'
    }));

    try {
      const response = await fetch(`${settings.blabladorBaseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${settings.blabladorApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const allModels = data.data || [];

      // Filter for text generation models
      const textModels = allModels.filter(model =>
        !model.id.includes('embedding') &&
        (model.id.startsWith('alias-') ||
         model.id.includes('gpt') ||
         model.id.includes('llama') ||
         model.id.includes('qwen'))
      );

      const modelConfigs = textModels.map(model => {
        let name = model.id;
        let description = 'Text generation model';

        if (model.id === 'alias-chat') {
          name = 'Alias Chat (Best Available)';
          description = 'Optimized for documentation generation';
        } else if (model.id === 'alias-large') {
          name = 'Alias Large (Most Capable)';
          description = 'Best for detailed README generation';
        }

        return { id: model.id, name, description };
      });

      setLocalState(prev => ({
        ...prev,
        isDetectingModels: false,
        detectedModels: allModels,
        blabladorModels: modelConfigs,
        connectionStatus: 'connected'
      }));

      if (!settings.model && modelConfigs.length > 0) {
        const preferredModel = modelConfigs.find(m => m.id === 'alias-large') || modelConfigs[0];
        updateSetting('model', preferredModel.id);
      }

    } catch (error) {
      setLocalState(prev => ({
        ...prev,
        isDetectingModels: false,
        error: `Model detection failed: ${error.message}`,
        connectionStatus: 'error'
      }));
    }
  }, [settings.blabladorApiKey, settings.blabladorBaseUrl]);

  // Analyze existing README and project structure
  const analyzeProject = useCallback(async () => {
    setLocalState(prev => ({ ...prev, isAnalyzing: true, error: null }));

    try {
      // Fetch existing README if it exists
      let existingReadme = '';
      if (git.isConnected && git.owner && git.repo) {
        try {
          const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'RAG-Node-React'
          };

          if (git.token) {
            headers['Authorization'] = `token ${git.token}`;
          }

          const readmeResponse = await fetch(
            `https://api.github.com/repos/${git.owner}/${git.repo}/contents/README.md?ref=${git.branch}`,
            { headers }
          );

          if (readmeResponse.ok) {
            const readmeData = await readmeResponse.json();
            existingReadme = atob(readmeData.content);
          }
        } catch (error) {
          console.log('No existing README found or failed to fetch');
        }
      }

      // Analyze project structure from vectors and chunks
      const projectAnalysis = {
        projectType: detectProjectType(),
        mainLanguages: detectLanguages(),
        frameworks: detectFrameworks(),
        dependencies: detectDependencies(),
        features: extractFeatures(),
        architecture: analyzeArchitecture(),
        hasTests: detectTests(),
        hasDockerfile: detectDocker(),
        hasCI: detectCI()
      };

      setLocalState(prev => ({
        ...prev,
        isAnalyzing: false,
        existingReadme,
        analyzedProject: projectAnalysis
      }));

    } catch (error) {
      setLocalState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: `Project analysis failed: ${error.message}`
      }));
    }
  }, [git, vectorize.vectors]);

  // Project analysis helper functions
  const detectProjectType = useCallback(() => {
    if (!vectorize.vectors) return 'unknown';

    const files = vectorize.vectors.map(v => v.metadata.source || '');

    if (files.some(f => f.includes('package.json'))) {
      if (files.some(f => f.includes('.jsx') || f.includes('.tsx'))) return 'React Application';
      if (files.some(f => f.includes('next.config'))) return 'Next.js Application';
      if (files.some(f => f.includes('vue'))) return 'Vue.js Application';
      return 'Node.js Application';
    }

    if (files.some(f => f.includes('.py'))) return 'Python Application';
    if (files.some(f => f.includes('.java'))) return 'Java Application';
    if (files.some(f => f.includes('.go'))) return 'Go Application';

    return 'Software Project';
  }, [vectorize.vectors]);

  const detectLanguages = useCallback(() => {
    if (!vectorize.vectors) return [];

    const extensions = new Set();
    vectorize.vectors.forEach(v => {
      const source = v.metadata.source || '';
      const ext = source.split('.').pop();
      if (ext) extensions.add(ext);
    });

    const languageMap = {
      'js': 'JavaScript', 'jsx': 'React JSX', 'ts': 'TypeScript', 'tsx': 'React TSX',
      'py': 'Python', 'java': 'Java', 'go': 'Go', 'rs': 'Rust', 'cpp': 'C++',
      'css': 'CSS', 'scss': 'SCSS', 'html': 'HTML'
    };

    return Array.from(extensions).map(ext => languageMap[ext] || ext).filter(Boolean);
  }, [vectorize.vectors]);

  const detectFrameworks = useCallback(() => {
    if (!vectorize.vectors) return [];

    const content = vectorize.vectors.map(v => v.content).join(' ').toLowerCase();
    const frameworks = [];

    if (content.includes('react')) frameworks.push('React');
    if (content.includes('next')) frameworks.push('Next.js');
    if (content.includes('express')) frameworks.push('Express.js');
    if (content.includes('django')) frameworks.push('Django');
    if (content.includes('flask')) frameworks.push('Flask');
    if (content.includes('tailwind')) frameworks.push('Tailwind CSS');
    if (content.includes('framer-motion')) frameworks.push('Framer Motion');

    return frameworks;
  }, [vectorize.vectors]);

  const detectDependencies = useCallback(() => {
    if (!vectorize.vectors) return [];

    const packageJsonVector = vectorize.vectors.find(v =>
      v.metadata.source?.includes('package.json')
    );

    if (packageJsonVector) {
      try {
        const packageData = JSON.parse(packageJsonVector.content);
        return Object.keys({
          ...packageData.dependencies,
          ...packageData.devDependencies
        }).slice(0, 10); // Top 10 dependencies
      } catch (error) {
        return [];
      }
    }

    return [];
  }, [vectorize.vectors]);

  const extractFeatures = useCallback(() => {
    if (!vectorize.vectors) return [];

    const features = new Set();

    vectorize.vectors.forEach(v => {
      const content = v.content.toLowerCase();
      const source = v.metadata.source || '';

      // Extract features based on file names and content
      if (source.includes('auth')) features.add('Authentication');
      if (source.includes('api')) features.add('API Integration');
      if (source.includes('database') || content.includes('database')) features.add('Database Integration');
      if (content.includes('responsive')) features.add('Responsive Design');
      if (content.includes('test')) features.add('Testing');
      if (source.includes('component')) features.add('Component-based Architecture');
      if (content.includes('real-time') || content.includes('websocket')) features.add('Real-time Features');
    });

    return Array.from(features);
  }, [vectorize.vectors]);

  const analyzeArchitecture = useCallback(() => {
    if (!vectorize.vectors) return 'Standard';

    const folders = new Set();
    vectorize.vectors.forEach(v => {
      const source = v.metadata.source || '';
      const parts = source.split('/');
      if (parts.length > 1) folders.add(parts[0]);
    });

    if (folders.has('src') && folders.has('components')) return 'Component-based Architecture';
    if (folders.has('pages') && folders.has('api')) return 'Full-stack Architecture';
    if (folders.has('microservices')) return 'Microservices Architecture';

    return 'Modular Architecture';
  }, [vectorize.vectors]);

  const detectTests = useCallback(() => {
    if (!vectorize.vectors) return false;
    return vectorize.vectors.some(v =>
      v.metadata.source?.includes('test') ||
      v.metadata.source?.includes('spec') ||
      v.content.includes('describe(') ||
      v.content.includes('it(')
    );
  }, [vectorize.vectors]);

  const detectDocker = useCallback(() => {
    if (!vectorize.vectors) return false;
    return vectorize.vectors.some(v =>
      v.metadata.source?.includes('Dockerfile') ||
      v.metadata.source?.includes('docker-compose')
    );
  }, [vectorize.vectors]);

  const detectCI = useCallback(() => {
    if (!vectorize.vectors) return false;
    return vectorize.vectors.some(v =>
      v.metadata.source?.includes('.github/workflows') ||
      v.metadata.source?.includes('.gitlab-ci') ||
      v.metadata.source?.includes('Jenkinsfile')
    );
  }, [vectorize.vectors]);

  // Generate comprehensive README
  const generateReadme = useCallback(async () => {
    if (!settings.model) {
      setLocalState(prev => ({ ...prev, error: 'Please select a model first' }));
      return;
    }

    if (!localState.analyzedProject) {
      await analyzeProject();
    }

    setLocalState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
      generationProgress: 0
    }));

    try {
      // Build comprehensive context
      const context = buildReadmeContext();

      // Generate README sections progressively
      const sections = await generateReadmeSections(context);

      // Combine sections into final README
      const finalReadme = combineReadmeSections(sections);

      setGeneratedReadme(finalReadme);

      // Update pipeline context
      dispatch({
        type: 'UPDATE_README',
        payload: {
          ...settings,
          generatedReadme: finalReadme
        }
      });

      setLocalState(prev => ({
        ...prev,
        isGenerating: false,
        generationProgress: 100
      }));

    } catch (error) {
      setLocalState(prev => ({
        ...prev,
        isGenerating: false,
        error: `README generation failed: ${error.message}`
      }));
    }
  }, [settings, localState.analyzedProject, analyzeProject, dispatch]);

  // Build context for README generation
  const buildReadmeContext = useCallback(() => {
    const context = {
      repository: {
        name: git.repoInfo?.name || git.repo,
        fullName: git.repoInfo?.fullName || `${git.owner}/${git.repo}`,
        description: git.repoInfo?.description || '',
        language: git.repoInfo?.language || '',
        isPrivate: git.repoInfo?.isPrivate || false
      },
      project: localState.analyzedProject,
      existingReadme: localState.existingReadme,
      codeContext: vectorize.vectors?.slice(0, 10).map(v => ({
        file: v.metadata.source,
        content: v.content.substring(0, 500)
      })) || [],
      settings: settings
    };

    return context;
  }, [git, localState.analyzedProject, localState.existingReadme, vectorize.vectors, settings]);

  // Generate README sections using AI
  const generateReadmeSections = useCallback(async (context) => {
    const sections = {};
    const sectionPrompts = {
      title: `Generate a compelling title and description for this ${context.project.projectType}`,
      installation: 'Generate detailed installation instructions with prerequisites and step-by-step setup',
      usage: 'Create comprehensive usage examples with code snippets and explanations',
      features: 'List and describe all key features with detailed explanations',
      architecture: 'Explain the project architecture and design patterns used',
      contributing: 'Create contributing guidelines for developers',
      license: 'Generate appropriate license section',
      changelog: 'Create a changelog template with recent updates',
      testing: 'Document testing procedures and how to run tests',
      deployment: 'Provide deployment instructions and best practices'
    };

    let progress = 0;
    const totalSections = Object.keys(sectionPrompts).length;

    for (const [sectionName, prompt] of Object.entries(sectionPrompts)) {
      if (!settings[`include${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}`] &&
          !['title'].includes(sectionName)) {
        continue;
      }

      try {
        const sectionContent = await generateSection(prompt, context, sectionName);
        sections[sectionName] = sectionContent;

        progress++;
        setLocalState(prev => ({
          ...prev,
          generationProgress: Math.round((progress / totalSections) * 100)
        }));

        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Failed to generate ${sectionName} section:`, error);
        sections[sectionName] = `## ${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}\n\nContent generation failed. Please add manually.`;
      }
    }

    return sections;
  }, [settings]);

  // Generate individual section using AI
  const generateSection = useCallback(async (prompt, context, sectionName) => {
    const systemPrompt = `You are a technical documentation expert. Generate high-quality README content that is:
- Detailed and comprehensive
- Professional and well-structured
- Includes code examples where appropriate
- Uses proper markdown formatting
- Tailored to the specific project type and context

Project Context:
- Type: ${context.project.projectType}
- Languages: ${context.project.mainLanguages.join(', ')}
- Frameworks: ${context.project.frameworks.join(', ')}
- Features: ${context.project.features.join(', ')}

${context.existingReadme ? `Existing README to enhance:\n${context.existingReadme.substring(0, 1000)}` : ''}`;

    const userPrompt = `${prompt}

Repository: ${context.repository.fullName}
Description: ${context.repository.description}

Code samples from the project:
${context.codeContext.map(c => `File: ${c.file}\n${c.content}`).join('\n\n').substring(0, 2000)}

Generate the ${sectionName} section in markdown format. Be specific and detailed.`;

    let apiUrl = '';
    let headers = {};
    let body = {};

    if (settings.provider === 'blablador') {
      apiUrl = `${settings.blabladorBaseUrl}/chat/completions`;
      headers = {
        'Authorization': `Bearer ${settings.blabladorApiKey}`,
        'Content-Type': 'application/json'
      };
      body = {
        model: settings.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.7
      };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || `## ${sectionName}\n\nContent generation failed.`;
  }, [settings]);

  // Combine sections into final README
  const combineReadmeSections = useCallback((sections) => {
    let readme = '';

    // Title and description
    if (sections.title) {
      readme += sections.title + '\n\n';
    }

    // Table of contents
    readme += '## Table of Contents\n\n';
    const tocItems = [];
    if (settings.includeFeatures && sections.features) tocItems.push('- [Features](#features)');
    if (settings.includeInstallation && sections.installation) tocItems.push('- [Installation](#installation)');
    if (settings.includeUsage && sections.usage) tocItems.push('- [Usage](#usage)');
    if (settings.includeArchitecture && sections.architecture) tocItems.push('- [Architecture](#architecture)');
    if (settings.includeTesting && sections.testing) tocItems.push('- [Testing](#testing)');
    if (settings.includeDeployment && sections.deployment) tocItems.push('- [Deployment](#deployment)');
    if (settings.includeContributing && sections.contributing) tocItems.push('- [Contributing](#contributing)');
    if (settings.includeChangelog && sections.changelog) tocItems.push('- [Changelog](#changelog)');
    if (settings.includeLicense && sections.license) tocItems.push('- [License](#license)');

    readme += tocItems.join('\n') + '\n\n';

    // Add sections in order
    const sectionOrder = ['features', 'installation', 'usage', 'architecture', 'testing', 'deployment', 'contributing', 'changelog', 'license'];

    sectionOrder.forEach(sectionName => {
      if (sections[sectionName] && settings[`include${sectionName.charAt(0).toUpperCase() + sectionName.slice(1)}`]) {
        readme += sections[sectionName] + '\n\n';
      }
    });

    // Add custom sections
    settings.customSections.forEach(customSection => {
      if (customSection.enabled && customSection.content) {
        readme += `## ${customSection.name}\n\n${customSection.content}\n\n`;
      }
    });

    // Add generation footer
    readme += `---\n\n*This README was generated using [RAG Node React](${git.repoInfo?.fullName || ''}) on ${new Date().toLocaleDateString()}*\n`;

    return readme;
  }, [settings, git.repoInfo]);

  // Auto-detect when conditions are met
  useEffect(() => {
    if (settings.provider === 'blablador' &&
        settings.blabladorApiKey &&
        settings.autoDetectModels &&
        localState.blabladorModels.length === 0 &&
        localState.connectionStatus === 'disconnected') {
      detectBlabladorModels();
    }
  }, [settings.provider, settings.blabladorApiKey, settings.autoDetectModels, detectBlabladorModels]);

  // Auto-analyze project when vectors are available
  useEffect(() => {
    if (vectorize.vectors && vectorize.vectors.length > 0 && !localState.analyzedProject) {
      analyzeProject();
    }
  }, [vectorize.vectors, localState.analyzedProject, analyzeProject]);

  // Update pipeline context when settings change
  useEffect(() => {
    dispatch({
      type: 'UPDATE_README',
      payload: { ...settings, generatedReadme }
    });
  }, [settings, generatedReadme, dispatch]);

  // Setting update helper
  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Custom section management
  const addCustomSection = useCallback(() => {
    const sectionName = prompt('Enter section name:');
    if (sectionName) {
      setSettings(prev => ({
        ...prev,
        customSections: [...prev.customSections, {
          name: sectionName,
          content: '',
          enabled: true
        }]
      }));
    }
  }, []);

  const updateCustomSection = useCallback((index, field, value) => {
    setSettings(prev => ({
      ...prev,
      customSections: prev.customSections.map((section, i) =>
        i === index ? { ...section, [field]: value } : section
      )
    }));
  }, []);

  const removeCustomSection = useCallback((index) => {
    setSettings(prev => ({
      ...prev,
      customSections: prev.customSections.filter((_, i) => i !== index)
    }));
  }, []);

  // Early return if no repository context
  if (!git.isConnected || !vectorize.vectors || vectorize.vectors.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">README Generator</h1>
          <p className="text-gray-600">Generate comprehensive documentation for your repository automatically.</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-amber-500">⚠️</span>
            <span className="text-amber-700 font-medium">Repository Context Required</span>
          </div>
          <p className="text-amber-700 text-sm mt-1">
            Please complete repository connection and vectorization first to enable README generation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">README Generator</h1>
        <p className="text-gray-600">
          Generate comprehensive documentation for {git.owner}/{git.repo} using AI analysis.
        </p>
      </div>

      {/* Project Analysis Summary */}
      {localState.analyzedProject && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">📊 Project Analysis</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-blue-600 font-medium">Project Type</div>
              <div className="text-blue-800">{localState.analyzedProject.projectType}</div>
            </div>
            <div>
              <div className="text-blue-600 font-medium">Languages</div>
              <div className="text-blue-800">{localState.analyzedProject.mainLanguages.slice(0, 2).join(', ')}</div>
            </div>
            <div>
              <div className="text-blue-600 font-medium">Features</div>
              <div className="text-blue-800">{localState.analyzedProject.features.length} detected</div>
            </div>
            <div>
              <div className="text-blue-600 font-medium">Architecture</div>
              <div className="text-blue-800">{localState.analyzedProject.architecture}</div>
            </div>
          </div>
        </div>
      )}

      {/* Model Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Generation Settings</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
            <select
              value={settings.provider}
              onChange={(e) => updateSetting('provider', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {readmeProviders.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} {provider.id === 'blablador' && '(Default)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
            <div className="flex space-x-2">
              <select
                value={settings.model}
                onChange={(e) => updateSetting('model', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={settings.provider === 'blablador' && localState.blabladorModels.length === 0}
              >
                {currentProvider?.models.length > 0 ? (
                  currentProvider.models.map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))
                ) : (
                  <option value="">No models available</option>
                )}
              </select>

              {settings.provider === 'blablador' && (
                <button
                  onClick={detectBlabladorModels}
                  disabled={localState.isDetectingModels || !settings.blabladorApiKey}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {localState.isDetectingModels ? '🔄' : '🔍'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Writing Tone</label>
            <select
              value={settings.tone}
              onChange={(e) => updateSetting('tone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {toneOptions.map(tone => (
                <option key={tone.id} value={tone.id}>{tone.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Detail Level</label>
            <select
              value={settings.maxLength}
              onChange={(e) => updateSetting('maxLength', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {lengthOptions.map(length => (
                <option key={length.id} value={length.id}>{length.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Blablador Configuration */}
        {settings.provider === 'blablador' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <h3 className="font-semibold text-blue-800 mb-3">🔬 Blablador Configuration</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                <input
                  type="password"
                  value={settings.blabladorApiKey}
                  onChange={(e) => updateSetting('blabladorApiKey', e.target.value)}
                  placeholder="Your Blablador API key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Base URL</label>
                <input
                  type="url"
                  value={settings.blabladorBaseUrl}
                  onChange={(e) => updateSetting('blabladorBaseUrl', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* README Sections Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">README Sections</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {[
            { key: 'includeInstallation', label: 'Installation Instructions', icon: '📦', desc: 'Setup and installation guide' },
            { key: 'includeUsage', label: 'Usage Examples', icon: '🚀', desc: 'Code examples and tutorials' },
            { key: 'includeFeatures', label: 'Features List', icon: '✨', desc: 'Key features and capabilities' },
            { key: 'includeArchitecture', label: 'Architecture Overview', icon: '🏗️', desc: 'System design and structure' },
            { key: 'includeTesting', label: 'Testing Guide', icon: '🧪', desc: 'How to run tests' },
            { key: 'includeDeployment', label: 'Deployment Instructions', icon: '🚀', desc: 'Production deployment guide' },
            { key: 'includeContributing', label: 'Contributing Guidelines', icon: '🤝', desc: 'How to contribute' },
            { key: 'includeChangelog', label: 'Changelog', icon: '📝', desc: 'Version history and updates' },
            { key: 'includeLicense', label: 'License Information', icon: '📄', desc: 'Legal and licensing details' }
          ].map((section) => (
            <label key={section.key} className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <input
                type="checkbox"
                checked={settings[section.key]}
                onChange={(e) => updateSetting(section.key, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
              />
              <div className="ml-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{section.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{section.label}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{section.desc}</div>
              </div>
            </label>
          ))}
        </div>

        {/* Advanced Options */}
        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-800 mb-3">Advanced Options</h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.preserveExisting}
                onChange={(e) => updateSetting('preserveExisting', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Preserve existing README content</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.enhanceExisting}
                onChange={(e) => updateSetting('enhanceExisting', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Enhance existing sections with new details</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.addMissingImplementations}
                onChange={(e) => updateSetting('addMissingImplementations', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Add missing implementation details</span>
            </label>
          </div>
        </div>
      </div>

      {/* Custom Sections */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Custom Sections</h2>
          <button
            onClick={addCustomSection}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            + Add Section
          </button>
        </div>

        {settings.customSections.length > 0 && (
          <div className="space-y-3">
            {settings.customSections.map((section, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <input
                    type="text"
                    value={section.name}
                    onChange={(e) => updateCustomSection(index, 'name', e.target.value)}
                    placeholder="Section name"
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <button
                    onClick={() => removeCustomSection(index)}
                    className="ml-2 text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  value={section.content}
                  onChange={(e) => updateCustomSection(index, 'content', e.target.value)}
                  placeholder="Section content (markdown supported)"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  rows="3"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generation Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Generate README</h2>
          {localState.existingReadme && (
            <span className="text-sm text-green-600">
              ✅ Existing README detected - will be enhanced
            </span>
          )}
        </div>

        {localState.isGenerating && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Generating comprehensive README...</span>
              <span>{localState.generationProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${localState.generationProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        <button
          onClick={generateReadme}
          disabled={localState.isGenerating || !settings.model}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {localState.isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating README...
            </>
          ) : (
            '📝 Generate Comprehensive README'
          )}
        </button>
      </div>

      {/* Error Display */}
      {localState.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-red-500">❌</span>
            <span className="text-red-700 text-sm">{localState.error}</span>
          </div>
        </div>
      )}

      {/* Generated README Preview */}
      {generatedReadme && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Generated README</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => navigator.clipboard.writeText(generatedReadme)}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                Copy
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([generatedReadme], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'README.md';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
              >
                Download
              </button>
            </div>
          </div>
          <div className="p-4">
            <div className="max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono bg-gray-50 p-4 rounded border">
                {generatedReadme}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Benefits Section */}
      <div className="bg-green-50 border-l-4 border-green-500 p-4">
        <h3 className="font-semibold text-green-800 mb-2">📚 README Generation Features</h3>
        <ul className="text-green-700 text-sm space-y-1">
          <li>• Analyzes your entire codebase using vector embeddings</li>
          <li>• Preserves and enhances existing README content</li>
          <li>• Detects project type, languages, and frameworks automatically</li>
          <li>• Generates detailed sections with code examples</li>
          <li>• Includes missing implementation details</li>
          <li>• Professional documentation following best practices</li>
          <li>• Customizable sections and writing tone</li>
        </ul>
      </div>
    </div>
  );
};

export default ReadmeSection;
