import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { API_PROVIDERS } from '../../../constants/flowconfig';

const BackgroundBeams = ({ className }) => (
  <div className={`absolute inset-0 overflow-hidden ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-amber-50/20 via-orange-50/20 to-yellow-50/20" />
    <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-amber-200/30 to-transparent" />
    <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-200/30 to-transparent" />
  </div>
);

const ReadmeNode = ({ id, data, selected }) => {
  const { setNodes, getNodes, getEdges } = useReactFlow();

  // State management - following exact ChatNode pattern
  const [showSettings, setShowSettings] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [connectedApiConfig, setConnectedApiConfig] = useState(null);
  const [connectedVectorData, setConnectedVectorData] = useState(null);
  const [generatedReadme, setGeneratedReadme] = useState(data.generatedReadme || '');
  const [availableModels, setAvailableModels] = useState([]);

  // Settings - following exact ChatNode pattern
  const [settings, setSettings] = useState(() => ({
    model: data.model || '',
    includeInstallation: data.includeInstallation !== false,
    includeUsage: data.includeUsage !== false,
    includeContributing: data.includeContributing !== false,
    includeLicense: data.includeLicense !== false,
    includeFeatures: data.includeFeatures !== false,
    includeTechStack: data.includeTechStack !== false,
    includeArchitecture: data.includeArchitecture !== false,
    includeAPI: data.includeAPI !== false,
    includeTesting: data.includeTesting !== false,
    includeDeployment: data.includeDeployment !== false,
    includeTroubleshooting: data.includeTroubleshooting !== false,
    tone: data.tone || 'professional',
    useVectorData: data.useVectorData !== false,
    maxTokens: data.maxTokens || 4000,
    temperature: data.temperature || 0.7,
    topP: data.topP || 1.0,
    frequencyPenalty: data.frequencyPenalty || 0,
    presencePenalty: data.presencePenalty || 0,
    responseStyle: data.responseStyle || 'detailed',
    projectType: data.projectType || 'auto-detect',
    includeCodeExamples: data.includeCodeExamples !== false,
    includeBadges: data.includeBadges !== false,
    includeTableOfContents: data.includeTableOfContents !== false,
    maxCharacters: data.maxCharacters || 50000, // Character limit
    ...data.settings
  }));

  const [stats, setStats] = useState({
    vectorCount: 0,
    filesAnalyzed: 0,
    readmeLength: generatedReadme.length || 0,
    lastGenerated: data.lastGenerated || null,
    generationTime: 0,
    tokensUsed: 0,
    wordCount: 0,
    sections: 0,
    detectedLanguages: [],
    projectType: 'unknown'
  });

  // Enhanced output data structure for other nodes
  const [outputData, setOutputData] = useState({
    // Primary content fields
    generatedReadme: generatedReadme,
    readmeContent: generatedReadme,
    content: generatedReadme,
    text: generatedReadme,
    output: generatedReadme,

    // Enhanced metadata for other nodes
    metadata: {
      nodeType: 'readmeNode',
      model: settings.model,
      tone: settings.tone,
      projectType: stats.projectType,
      generatedAt: data.lastGenerated || null,
      characterCount: generatedReadme.length,
      wordCount: generatedReadme.split(' ').length,
      detectedLanguages: stats.detectedLanguages,
      sections: {
        includeFeatures: settings.includeFeatures,
        includeTechStack: settings.includeTechStack,
        includeInstallation: settings.includeInstallation,
        includeUsage: settings.includeUsage,
        includeContributing: settings.includeContributing,
        includeLicense: settings.includeLicense,
        includeArchitecture: settings.includeArchitecture,
        includeAPI: settings.includeAPI,
        includeTesting: settings.includeTesting,
        includeDeployment: settings.includeDeployment,
        includeTroubleshooting: settings.includeTroubleshooting
      },
      sourceVectors: 0,
      processingTime: 0
    },

    // Statistics for monitoring
    stats: stats,

    // Settings used for generation
    generationSettings: settings,

    // For compatibility with other node types
    processedContent: generatedReadme,
    extractedText: generatedReadme,
    fileContent: generatedReadme,
    documentationContent: generatedReadme
  });

  const textareaRef = useRef(null);

  // Debounced update - following exact ChatNode pattern
  const updateNodeDataDebounced = useRef(null);

  const updateNodeData = useCallback((updates) => {
    if (updateNodeDataDebounced.current) {
      clearTimeout(updateNodeDataDebounced.current);
    }

    updateNodeDataDebounced.current = setTimeout(() => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...updates,
                  // Ensure output data is always available
                  outputData: outputData,
                  // Multiple field names for compatibility
                  generatedReadme: generatedReadme,
                  readmeContent: generatedReadme,
                  content: generatedReadme,
                  text: generatedReadme,
                  output: generatedReadme
                }
              }
            : node
        )
      );
    }, 300);
  }, [id, setNodes, outputData, generatedReadme]);

  // API Config detection - EXACT same pattern as ChatNode
  const getApiConfig = useCallback(() => {
    try {
      const edges = getEdges();
      const nodes = getNodes();

      const apiConfigEdge = edges.find(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        return edge.target === id && sourceNode && sourceNode.type === 'apiConfigNode';
      });

      if (apiConfigEdge) {
        const apiConfigNode = nodes.find(node => node.id === apiConfigEdge.source);

        if (apiConfigNode && apiConfigNode.type === 'apiConfigNode' && apiConfigNode.data) {
          const config = {
            provider: apiConfigNode.data.provider || 'custom',
            endpoint: apiConfigNode.data.endpoint || '',
            apiKey: apiConfigNode.data.apiKey || '',
            token: apiConfigNode.data.token || '',
            headers: apiConfigNode.data.headers || {},
            isConnected: apiConfigNode.data.isConnected || false,
            availableModels: apiConfigNode.data.availableModels || [],
            chatModels: apiConfigNode.data.chatModels || [],
          };

          setConnectedApiConfig(config);
          return config;
        }
      }

      setConnectedApiConfig(null);
      return {};
    } catch (error) {
      console.error('❌ Error getting API config:', error);
      setConnectedApiConfig(null);
      return {};
    }
  }, [id, getNodes, getEdges]);

  // Enhanced Vector Data detection with repository analysis
  const getVectorData = useCallback(() => {
    try {
      const edges = getEdges();
      const nodes = getNodes();

      const vectorEdge = edges.find(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        return edge.target === id && sourceNode && sourceNode.type === 'vectorizeNode';
      });

      if (vectorEdge) {
        const vectorNode = nodes.find(node => node.id === vectorEdge.source);

        if (vectorNode && vectorNode.data) {
          const vectorData = {
            vectors: vectorNode.data.vectorizationResults?.vectors || [],
            metadata: vectorNode.data.vectorizationResults?.metadata || {},
            stats: vectorNode.data.stats || {},
            nodeType: vectorNode.type,
            repositoryInfo: {
              totalVectors: vectorNode.data.stats?.totalVectors || 0,
              embeddingModel: vectorNode.data.vectorizationResults?.metadata?.model || 'unknown',
              dimensions: vectorNode.data.vectorizationResults?.metadata?.dimensions || 0,
              sourceNodeType: vectorNode.data.vectorizationResults?.metadata?.sourceNodeType || 'unknown'
            }
          };

          if (vectorData.vectors.length > 0) {
            const structuredKnowledge = vectorData.vectors.map((vector, index) => {
              const metadata = vector.metadata || {};
              return {
                id: vector.id || `chunk_${index}`,
                content: metadata.text || '',
                filename: metadata.filename || metadata.path || metadata.source || `file_${index}`,
                chunkIndex: metadata.chunk_index || index,
                source: metadata.source || 'unknown',
                textLength: metadata.text_length || 0,
                embeddingModel: metadata.embedding_model || 'unknown',
                fileType: metadata.fileType || 'unknown'
              };
            }).filter(item => item.content.trim().length > 0);

            // Analyze repository structure and detect languages/frameworks
            const fileExtensions = new Set();
            const detectedLanguages = new Set();
            const frameworkIndicators = new Set();

            structuredKnowledge.forEach(item => {
              const filename = item.filename.toLowerCase();
              const content = item.content.toLowerCase();

              // Extract file extensions
              const ext = filename.split('.').pop();
              if (ext) fileExtensions.add(ext);

              // Detect programming languages
              if (filename.includes('.js') || filename.includes('.jsx')) detectedLanguages.add('JavaScript');
              if (filename.includes('.ts') || filename.includes('.tsx')) detectedLanguages.add('TypeScript');
              if (filename.includes('.py')) detectedLanguages.add('Python');
              if (filename.includes('.java')) detectedLanguages.add('Java');
              if (filename.includes('.cpp') || filename.includes('.c')) detectedLanguages.add('C/C++');
              if (filename.includes('.go')) detectedLanguages.add('Go');
              if (filename.includes('.rs')) detectedLanguages.add('Rust');
              if (filename.includes('.php')) detectedLanguages.add('PHP');
              if (filename.includes('.rb')) detectedLanguages.add('Ruby');
              if (filename.includes('.cs')) detectedLanguages.add('C#');

              // Detect frameworks and tools
              if (content.includes('react') || filename.includes('package.json')) frameworkIndicators.add('React');
              if (content.includes('vue')) frameworkIndicators.add('Vue.js');
              if (content.includes('angular')) frameworkIndicators.add('Angular');
              if (content.includes('express')) frameworkIndicators.add('Express.js');
              if (content.includes('django') || content.includes('flask')) frameworkIndicators.add('Python Web Framework');
              if (content.includes('spring')) frameworkIndicators.add('Spring');
              if (content.includes('docker')) frameworkIndicators.add('Docker');
              if (content.includes('kubernetes')) frameworkIndicators.add('Kubernetes');
              if (filename.includes('requirements.txt') || filename.includes('pyproject.toml')) frameworkIndicators.add('Python');
              if (filename.includes('package.json')) frameworkIndicators.add('Node.js');
              if (filename.includes('pom.xml') || filename.includes('build.gradle')) frameworkIndicators.add('Java Build Tool');
              if (filename.includes('cargo.toml')) frameworkIndicators.add('Rust');
            });

            // Determine project type
            let projectType = 'unknown';
            if (detectedLanguages.has('JavaScript') || detectedLanguages.has('TypeScript')) {
              if (frameworkIndicators.has('React')) projectType = 'React Application';
              else if (frameworkIndicators.has('Vue.js')) projectType = 'Vue.js Application';
              else if (frameworkIndicators.has('Angular')) projectType = 'Angular Application';
              else if (frameworkIndicators.has('Express.js')) projectType = 'Node.js API';
              else projectType = 'JavaScript/TypeScript Project';
            } else if (detectedLanguages.has('Python')) {
              if (frameworkIndicators.has('Python Web Framework')) projectType = 'Python Web Application';
              else projectType = 'Python Project';
            } else if (detectedLanguages.has('Java')) {
              projectType = 'Java Application';
            } else if (detectedLanguages.has('Go')) {
              projectType = 'Go Application';
            } else if (detectedLanguages.has('Rust')) {
              projectType = 'Rust Project';
            }

            const processedContent = structuredKnowledge
              .map((item, index) => {
                return `[${item.filename} - Chunk ${item.chunkIndex + 1}]\n${item.content}`;
              })
              .join('\n\n---\n\n');

            vectorData.structuredKnowledge = structuredKnowledge;
            vectorData.processedContent = processedContent;
            vectorData.detectedLanguages = Array.from(detectedLanguages);
            vectorData.frameworkIndicators = Array.from(frameworkIndicators);
            vectorData.projectType = projectType;

            setStats(prev => ({
              ...prev,
              vectorCount: vectorData.vectors.length,
              filesAnalyzed: new Set(structuredKnowledge.map(s => s.filename)).size,
              detectedLanguages: Array.from(detectedLanguages),
              projectType: projectType
            }));
          }

          setConnectedVectorData(vectorData);
          return vectorData;
        }
      }

      setConnectedVectorData(null);
      return { vectors: [], metadata: {}, stats: {}, nodeType: null };
    } catch (error) {
      console.error('❌ Error getting vector data:', error);
      setConnectedVectorData(null);
      return { vectors: [], metadata: {}, stats: {}, nodeType: null };
    }
  }, [id, getNodes, getEdges]);

  // Monitor connections - following exact ChatNode pattern
  useEffect(() => {
    const interval = setInterval(() => {
      getApiConfig();
      getVectorData();
    }, 2000);

    return () => clearInterval(interval);
  }, [getApiConfig, getVectorData]);

  // Extract available models - following exact ChatNode pattern
  useEffect(() => {
    if (connectedApiConfig && connectedApiConfig.chatModels && connectedApiConfig.chatModels.length > 0) {
      setAvailableModels(connectedApiConfig.chatModels);

      if (!settings.model && connectedApiConfig.chatModels.length > 0) {
        setSettings(prev => ({ ...prev, model: connectedApiConfig.chatModels[0] }));
      }
    } else if (connectedApiConfig && connectedApiConfig.availableModels && connectedApiConfig.availableModels.length > 0) {
      const chatModels = connectedApiConfig.availableModels.filter(model => {
        try {
          if (typeof model !== 'string') {
            const modelName = model?.id || model?.name || model?.model || '';
            return typeof modelName === 'string' &&
                   !modelName.toLowerCase().includes('embedding') &&
                   !modelName.toLowerCase().includes('embed');
          }
          return !model.toLowerCase().includes('embedding') &&
                 !model.toLowerCase().includes('embed');
        } catch (error) {
          console.warn('Error filtering model:', model, error);
          return false;
        }
      }).map(model => {
        try {
          if (typeof model === 'string') {
            return model;
          }
          return model?.id || model?.name || model?.model || 'Unknown Model';
        } catch (error) {
          console.warn('Error normalizing model:', model, error);
          return 'Unknown Model';
        }
      }).filter(modelName => modelName !== 'Unknown Model');

      setAvailableModels(chatModels);

      if (!settings.model && chatModels.length > 0) {
        setSettings(prev => ({ ...prev, model: chatModels[0] }));
      }
    } else {
      setAvailableModels([]);
    }
  }, [connectedApiConfig, settings.model]);

  // Update output data whenever README changes
  useEffect(() => {
    const newOutputData = {
      // Primary content fields
      generatedReadme: generatedReadme,
      readmeContent: generatedReadme,
      content: generatedReadme,
      text: generatedReadme,
      output: generatedReadme,

      // Enhanced metadata for other nodes
      metadata: {
        nodeType: 'readmeNode',
        model: settings.model,
        tone: settings.tone,
        projectType: stats.projectType,
        generatedAt: stats.lastGenerated,
        characterCount: generatedReadme.length,
        wordCount: generatedReadme.split(' ').length,
        detectedLanguages: stats.detectedLanguages,
        sections: {
          includeFeatures: settings.includeFeatures,
          includeTechStack: settings.includeTechStack,
          includeInstallation: settings.includeInstallation,
          includeUsage: settings.includeUsage,
          includeContributing: settings.includeContributing,
          includeLicense: settings.includeLicense,
          includeArchitecture: settings.includeArchitecture,
          includeAPI: settings.includeAPI,
          includeTesting: settings.includeTesting,
          includeDeployment: settings.includeDeployment,
          includeTroubleshooting: settings.includeTroubleshooting
        },
        sourceVectors: stats.vectorCount,
        processingTime: stats.generationTime
      },

      // Statistics for monitoring
      stats: stats,

      // Settings used for generation
      generationSettings: settings,

      // For compatibility with other node types
      processedContent: generatedReadme,
      extractedText: generatedReadme,
      fileContent: generatedReadme,
      documentationContent: generatedReadme
    };

    setOutputData(newOutputData);
  }, [generatedReadme, settings, stats]);

  // Update node data when necessary
  useEffect(() => {
    updateNodeData({
      ...settings,
      stats,
      generatedReadme,
      availableModels,
      outputData,
      lastUpdated: Date.now()
    });
  }, [generatedReadme, availableModels, outputData, updateNodeData]);

  // Handle setting changes
  const handleSettingChange = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Enhanced response style presets
  const responseStyles = {
    brief: {
      maxTokens: 1500,
      temperature: 0.3,
      description: 'Essential information only - quick overview'
    },
    professional: {
      maxTokens: 3000,
      temperature: 0.7,
      description: 'Standard professional documentation'
    },
    detailed: {
      maxTokens: 5000,
      temperature: 0.8,
      description: 'Comprehensive documentation with examples'
    },
    creative: {
      maxTokens: 4000,
      temperature: 0.9,
      description: 'Engaging documentation with storytelling'
    }
  };

  // Apply response style preset
  const applyResponseStyle = useCallback((style) => {
    const preset = responseStyles[style];
    if (preset) {
      setSettings(prev => ({
        ...prev,
        responseStyle: style,
        maxTokens: preset.maxTokens,
        temperature: preset.temperature
      }));
    }
  }, []);

  // Enhanced README generation with NO AI INTRODUCTION WORDING
  const generateReadme = useCallback(async () => {
    if (!connectedApiConfig || (!connectedApiConfig.apiKey && !connectedApiConfig.token)) {
      alert('Please connect an API Configuration node first');
      return;
    }

    if (!connectedApiConfig.isConnected) {
      alert('API Configuration is not connected. Please test the connection first.');
      return;
    }

    if (!settings.model) {
      alert('Please select a model first');
      return;
    }

    setIsGenerating(true);
    const startTime = Date.now();

    try {
      // Prepare context from vector data - EXACT same as ChatNode
      let context = '';
      if (settings.useVectorData && connectedVectorData?.processedContent) {
        context = connectedVectorData.processedContent;
      }

      if (!context && settings.useVectorData) {
        alert('No vector data available. Please ensure the Vector node has processed data.');
        setIsGenerating(false);
        return;
      }

      // Enhanced prompt generation based on detected project type and languages
      const projectType = connectedVectorData?.projectType || stats.projectType || 'Software Project';
      const detectedLanguages = connectedVectorData?.detectedLanguages || stats.detectedLanguages || [];
      const frameworkIndicators = connectedVectorData?.frameworkIndicators || [];

      // Build sections list
      const sections = [];
      if (settings.includeFeatures) sections.push('- **Features**: Key capabilities and functionality');
      if (settings.includeTechStack) sections.push('- **Technology Stack**: Programming languages, frameworks, and tools');
      if (settings.includeArchitecture) sections.push('- **Architecture**: System design and component overview');
      if (settings.includeInstallation) sections.push('- **Installation**: Step-by-step setup instructions');
      if (settings.includeUsage) sections.push('- **Usage**: Code examples and usage patterns');
      if (settings.includeAPI) sections.push('- **API Documentation**: Endpoints, parameters, and examples');
      if (settings.includeTesting) sections.push('- **Testing**: How to run tests and testing strategy');
      if (settings.includeDeployment) sections.push('- **Deployment**: Production deployment instructions');
      if (settings.includeContributing) sections.push('- **Contributing**: Guidelines for contributors');
      if (settings.includeTroubleshooting) sections.push('- **Troubleshooting**: Common issues and solutions');
      if (settings.includeLicense) sections.push('- **License**: License information');

      // PROJECT-FOCUSED PROMPT - NO AI INTRODUCTION
const prompt = `Create a comprehensive README.md file for this software project. Analyze the provided codebase and generate ONLY the final README content in Markdown format.

**Repository Analysis:**
${context}

**Universal README Structure:**

**1. Project Title & Description:**
- Start with clear project name based on repository analysis
- Brief description of what this software does
- Key value proposition and main purpose

**2. Technology Detection & Stack:**
- Automatically detect programming languages used
- Identify frameworks, libraries, and tools
- List build systems and package managers found
- Note database systems or external services

**3. Features Section:**
- Core functionality based on code analysis
- Key capabilities and use cases
- Notable technical features

**4. Installation Instructions:**
- Detect package manager (npm, pip, cargo, maven, etc.)
- Provide appropriate installation commands
- Include system requirements and dependencies
- Environment setup if configuration files detected

**5. Usage Instructions:**
- Main entry points and how to run the application
- Command-line usage if CLI tools detected
- API usage if web services detected
- Configuration options if config files found

**6. Project Structure:**
- Explain directory organization
- Document important files and their purposes
- Describe module/component architecture

**7. Development Setup:**
- How to set up development environment
- Build commands and scripts
- Testing procedures if test files detected
- Debugging and development tools

**8. API Documentation (if applicable):**
- REST endpoints if web API detected
- GraphQL schema if GraphQL found
- WebSocket connections if real-time features
- Authentication methods

**9. Configuration:**
- Environment variables if .env files detected
- Configuration files and their purposes
- Deployment settings

**10. Contributing:**
- How to contribute to the project
- Code style and standards
- Pull request process
- Issue reporting

**11. License & Contact:**
- License information if LICENSE file detected
- Contact information and support

**Language-Specific Adaptations:**

**For JavaScript/TypeScript Projects:**
- npm/yarn commands, package.json scripts
- Node.js version requirements
- Frontend/backend separation if applicable

**For Python Projects:**
- pip/conda installation, requirements.txt
- Virtual environment setup
- Python version compatibility

**For Java Projects:**
- Maven/Gradle build instructions
- JDK version requirements
- JAR/WAR deployment

**For C/C++ Projects:**
- Compiler requirements (GCC, Clang, MSVC)
- CMake/Make build instructions
- Library dependencies

**For Go Projects:**
- Go modules and version requirements
- Build and install commands
- Cross-compilation instructions

**For Rust Projects:**
- Cargo commands and features
- Rust edition and MSRV
- Binary/library distinction

**For Web Projects:**
- Browser compatibility
- Build tools (Webpack, Vite, etc.)
- Deployment instructions

**For Mobile Projects:**
- Platform requirements (iOS/Android)
- SDK versions and dependencies
- Build and deployment process

**For Data Science/ML Projects:**
- Dataset requirements and sources
- Model training instructions
- Jupyter notebook usage
- Results and visualizations

**For DevOps/Infrastructure:**
- Infrastructure as Code tools
- Deployment pipelines
- Monitoring and logging
- Security considerations

**Writing Guidelines:**
- Use clear, technical language appropriate for developers
- Include practical code examples with proper syntax highlighting
- Focus on getting the project running quickly
- Provide troubleshooting for common issues
- Use proper markdown formatting throughout
- Add badges for build status, version, license if appropriate
- Keep explanations concise but comprehensive
- Avoid marketing language - focus on technical facts

**Auto-Detection Rules:**
- Detect project type from file extensions and structure
- Identify entry points (main.py, index.js, main.go, etc.)
- Find configuration files and explain their purpose
- Locate test directories and testing frameworks
- Identify CI/CD configurations
- Find documentation and example files

**Tone:** Professional and technical, focused on practical usage

**Avoid:**
- Generic technology explanations
- Marketing buzzwords
- Theoretical background unless necessary
- Assumptions about user knowledge level

**Focus on:**
- Practical steps to use THIS specific project
- Real examples from the actual codebase
- Specific commands and configurations
- Actual file names and directory structure

Begin the README immediately with the project title based on repository analysis:`;

// Construct API endpoint - EXACT same as ChatNode
let chatEndpoint;
if (connectedApiConfig.provider === 'blablador' || connectedApiConfig.endpoint?.includes('blablador')) {
  chatEndpoint = `${connectedApiConfig.endpoint}/chat/completions`;
} else if (connectedApiConfig.provider === 'openai') {
  chatEndpoint = 'https://api.openai.com/v1/chat/completions';
} else {
  chatEndpoint = `${connectedApiConfig.endpoint}/chat/completions`;
}

const apiMessages = [
  {
    role: 'system',
    content: 'You are a technical documentation writer. Generate README files directly without any meta-commentary, explanations, or thinking process. Start immediately with the project title and content. Output only valid Markdown format.'
  },
  {
    role: 'user',
    content: prompt
  }
];

      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connectedApiConfig.apiKey || connectedApiConfig.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: settings.model,
          messages: apiMessages,
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
          top_p: settings.topP,
          frequency_penalty: settings.frequencyPenalty,
          presence_penalty: settings.presencePenalty,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const generationTime = Date.now() - startTime;

      const readme = data.choices[0].message.content;

      // Check character limit
      if (readme.length > settings.maxCharacters) {
        console.warn(`Generated README (${readme.length} chars) exceeds limit (${settings.maxCharacters} chars)`);
      }

      setGeneratedReadme(readme);

      // Count sections in the generated README
      const sectionCount = (readme.match(/^#+\s/gm) || []).length;

      setStats(prev => ({
        ...prev,
        readmeLength: readme.length,
        wordCount: readme.split(' ').length,
        sections: sectionCount,
        lastGenerated: Date.now(),
        generationTime,
        tokensUsed: prev.tokensUsed + (data.usage?.total_tokens || 0)
      }));

    } catch (error) {
      console.error('❌ README generation failed:', error);
      alert(`Failed to generate README: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [connectedApiConfig, connectedVectorData, settings, stats]);

  // Copy and download functions
  const copyToClipboard = useCallback(() => {
    if (generatedReadme) {
      navigator.clipboard.writeText(generatedReadme);
    }
  }, [generatedReadme]);

  const downloadReadme = useCallback(() => {
    if (generatedReadme) {
      const blob = new Blob([generatedReadme], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'README.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [generatedReadme]);

  // Debug connections
  const debugConnections = useCallback(() => {
    const edges = getEdges();
    const nodes = getNodes();

    console.log('🧪 Debug ReadmeNode connections:');
    console.log('All edges:', edges);
    console.log('Edges to this node:', edges.filter(e => e.target === id));
    console.log('All nodes:', nodes.map(n => ({ id: n.id, type: n.type, hasData: !!n.data })));
    console.log('API Config:', connectedApiConfig);
    console.log('Vector Data:', connectedVectorData);
    console.log('Available Models:', availableModels);
    console.log('Output Data:', outputData);
    console.log('Detected Languages:', stats.detectedLanguages);
    console.log('Project Type:', stats.projectType);

    alert(`Debug Info:
Node ID: ${id}
API Connected: ${!!connectedApiConfig?.isConnected}
Model Selected: ${!!settings.model}
Vectors Available: ${connectedVectorData?.vectors?.length || 0}
README Generated: ${!!generatedReadme}
Project Type: ${stats.projectType}
Languages: ${stats.detectedLanguages.join(', ') || 'None detected'}
Character Count: ${stats.readmeLength}/${settings.maxCharacters}
Output Data Ready: ${!!outputData.content}

Check console for detailed logs`);
  }, [getEdges, getNodes, id, connectedApiConfig, connectedVectorData, availableModels, outputData, generatedReadme, settings, stats]);

  const getConnectionStatus = () => {
    if (connectedApiConfig && connectedApiConfig.isConnected && settings.model) {
      return { status: 'ready', message: 'Ready to Generate', color: 'amber' };
    } else if (connectedApiConfig && connectedApiConfig.isConnected && !settings.model) {
      return { status: 'no-model', message: 'Select Model', color: 'orange' };
    } else if (connectedApiConfig && !connectedApiConfig.isConnected) {
      return { status: 'disconnected', message: 'API Disconnected', color: 'red' };
    } else {
      return { status: 'no-api', message: 'Connect API Config Node', color: 'red' };
    }
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="relative">
      {/* Handles - following exact ChatNode pattern with OUTPUT handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-3 h-3 bg-blue-400 border-2 border-white"
        style={{ top: '20px' }}
        title="Connect Vector Data"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="api-config"
        className="w-3 h-3 bg-purple-400 border-2 border-white"
        style={{ top: '40px' }}
        title="Connect API Configuration"
      />
      {/* OUTPUT HANDLE */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 bg-amber-400 border-2 border-white"
        style={{ top: '30px' }}
        title="Generated README Output"
      />

      <motion.div
        className={`bg-white rounded-xl shadow-lg border-2 transition-all duration-300 overflow-hidden cursor-pointer ${
          selected ? 'border-amber-400 shadow-amber-100' : 'border-gray-200'
        }`}
        style={{ width: '300px', minHeight: '140px' }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
      >
        <BackgroundBeams className="rounded-xl" />

        {/* Header - following exact ChatNode pattern */}
        <div className="relative z-10 p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">📝</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">README Generator</h3>
                <p className="text-xs text-gray-500">
                  {settings.model || 'No model selected'}
                  {stats.readmeLength > 0 && (
                    <span className={`${stats.readmeLength > settings.maxCharacters ? 'text-red-600' : 'text-amber-600'}`}>
                      • {Math.round(stats.readmeLength / 1000)}k chars
                    </span>
                  )}
                  {stats.projectType !== 'unknown' && (
                    <span className="text-green-600"> • {stats.projectType}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSettings(!showSettings);
                }}
                className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 transition-colors"
                title="Settings"
              >
                ⚙️
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  debugConnections();
                }}
                className="w-6 h-6 flex items-center justify-center rounded bg-red-100 hover:bg-red-200 transition-colors"
                title="Debug Connections"
              >
                🧪
              </button>
              {generatedReadme && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setGeneratedReadme('');
                    setStats(prev => ({ ...prev, readmeLength: 0, wordCount: 0, sections: 0 }));
                  }}
                  className="w-6 h-6 flex items-center justify-center rounded bg-red-100 hover:bg-red-200 transition-colors"
                  title="Clear README"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Display - following exact ChatNode pattern */}
        <div className="relative z-10 px-4 py-3 border-b border-gray-100">
          <div
            className={`text-sm px-3 py-2 rounded-lg text-center font-medium transition-all cursor-pointer ${
              connectionStatus.color === 'amber'
                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                : connectionStatus.color === 'orange'
                ? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                : 'bg-red-100 text-red-800'
            }`}
            onClick={connectionStatus.status === 'ready' ? generateReadme : undefined}
          >
            {connectionStatus.status === 'ready' ? (
              <>
                <span className="text-lg">📝</span>
                <div className="mt-1">Click to Generate README</div>
                <div className="text-xs opacity-75">
                  {connectedApiConfig?.provider === 'blablador' ? 'Blablador (JSC)' :
                   connectedApiConfig?.provider === 'openai' ? 'OpenAI' :
                   connectedApiConfig?.provider || 'API'} • {settings.model}
                </div>
                {connectedVectorData && connectedVectorData.vectors.length > 0 && (
                  <div className="text-xs opacity-75 mt-1 text-blue-700">
                    📚 {stats.projectType} ({connectedVectorData.vectors.length} vectors)
                  </div>
                )}
              </>
            ) : (
              <>
                <span className="text-lg">⚠️</span>
                <div className="mt-1">{connectionStatus.message}</div>
                <div className="text-xs opacity-75">
                  {connectionStatus.status === 'no-model' ? 'Select a model in settings' :
                   connectionStatus.status === 'disconnected' ? 'Check API configuration' :
                   'Connect an API Configuration node'}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Generate Button */}
        {connectionStatus.status === 'ready' && (
          <div className="relative z-10 px-4 py-3 border-b border-gray-100">
            <button
              onClick={generateReadme}
              disabled={isGenerating}
              className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>📝</span>
                  <span>Generate README</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Enhanced Stats Display */}
        {(stats.readmeLength > 0 || (connectedVectorData && connectedVectorData.vectors.length > 0)) && (
          <div className="relative z-10 px-4 py-2 bg-amber-50 border-b border-amber-100">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className={`font-semibold ${stats.readmeLength > settings.maxCharacters ? 'text-red-700' : 'text-amber-700'}`}>
                  {Math.round(stats.readmeLength / 1000)}k
                </div>
                <div className="text-amber-600">Chars</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-amber-700">{stats.sections}</div>
                <div className="text-amber-600">Sections</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-amber-700">{stats.detectedLanguages.length}</div>
                <div className="text-amber-600">Languages</div>
              </div>
            </div>
            {stats.detectedLanguages.length > 0 && (
              <div className="mt-2 text-xs text-center text-amber-700">
                {stats.detectedLanguages.join(', ')}
              </div>
            )}
            {stats.readmeLength > settings.maxCharacters && (
              <div className="mt-2 text-xs text-center text-red-600">
                ⚠️ Exceeds {Math.round(settings.maxCharacters / 1000)}k char limit
              </div>
            )}
          </div>
        )}

        {/* Enhanced Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="relative z-10 border-b border-gray-100 bg-gray-50/50"
            >
              <div className="p-4 space-y-4">
                {/* Response Style Selector */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Response Style
                  </label>
                  <select
                    value={settings.responseStyle}
                    onChange={(e) => applyResponseStyle(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="brief">Brief ({responseStyles.brief.maxTokens} tokens)</option>
                    <option value="professional">Professional ({responseStyles.professional.maxTokens} tokens)</option>
                    <option value="detailed">Detailed ({responseStyles.detailed.maxTokens} tokens)</option>
                    <option value="creative">Creative ({responseStyles.creative.maxTokens} tokens)</option>
                  </select>
                  <div className="text-xs text-gray-500 mt-1">
                    {responseStyles[settings.responseStyle]?.description}
                  </div>
                </div>

                {/* Character Limit */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Character Limit: {Math.round(settings.maxCharacters / 1000)}k
                  </label>
                  <input
                    type="range"
                    min="10000"
                    max="100000"
                    step="5000"
                    value={settings.maxCharacters}
                    onChange={(e) => handleSettingChange('maxCharacters', parseInt(e.target.value))}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full nodrag"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    GitHub displays up to 512KB (~500k chars) on main page
                  </div>
                </div>

                {/* Model Selection */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Model
                    {availableModels.length > 0 && (
                      <span className="text-green-600"> ({availableModels.length} available)</span>
                    )}
                  </label>
                  <select
                    value={settings.model}
                    onChange={(e) => handleSettingChange('model', e.target.value)}
                    disabled={!connectedApiConfig || availableModels.length === 0}
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                  >
                    <option value="">Select a model...</option>
                    {availableModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>

                {/* Writing Style */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Writing Style
                  </label>
                  <select
                    value={settings.tone}
                    onChange={(e) => handleSettingChange('tone', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual & Friendly</option>
                    <option value="technical">Technical & Detailed</option>
                  </select>
                </div>

                {/* Temperature */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Creativity: {settings.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.temperature}
                    onChange={(e) => handleSettingChange('temperature', parseFloat(e.target.value))}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full nodrag"
                  />
                </div>

                {/* Max Tokens */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Max Tokens: {settings.maxTokens}
                  </label>
                  <input
                    type="range"
                    min="1000"
                    max="8000"
                    step="500"
                    value={settings.maxTokens}
                    onChange={(e) => handleSettingChange('maxTokens', parseInt(e.target.value))}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full nodrag"
                  />
                </div>

                {/* Enhanced Sections to Include */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Include Sections
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { key: 'includeFeatures', label: 'Features' },
                      { key: 'includeTechStack', label: 'Tech Stack' },
                      { key: 'includeArchitecture', label: 'Architecture' },
                      { key: 'includeInstallation', label: 'Installation' },
                      { key: 'includeUsage', label: 'Usage' },
                      { key: 'includeAPI', label: 'API Docs' },
                      { key: 'includeTesting', label: 'Testing' },
                      { key: 'includeDeployment', label: 'Deployment' },
                      { key: 'includeContributing', label: 'Contributing' },
                      { key: 'includeTroubleshooting', label: 'Troubleshooting' },
                      { key: 'includeLicense', label: 'License' }
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center space-x-1">
                        <input
                          type="checkbox"
                          checked={settings[key]}
                          onChange={(e) => handleSettingChange(key, e.target.checked)}
                          className="rounded nodrag text-xs"
                        />
                        <span className="text-xs text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Additional Options */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Additional Options
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.includeBadges}
                        onChange={(e) => handleSettingChange('includeBadges', e.target.checked)}
                        className="rounded nodrag"
                      />
                      <span className="text-xs text-gray-700">Include Badges</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.includeTableOfContents}
                        onChange={(e) => handleSettingChange('includeTableOfContents', e.target.checked)}
                        className="rounded nodrag"
                      />
                      <span className="text-xs text-gray-700">Table of Contents</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.includeCodeExamples}
                        onChange={(e) => handleSettingChange('includeCodeExamples', e.target.checked)}
                        className="rounded nodrag"
                      />
                      <span className="text-xs text-gray-700">Code Examples</span>
                    </label>
                  </div>
                </div>

                {/* Use Vector Data Toggle */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Use Vector Data</label>
                    <p className="text-xs text-gray-500">Add repository data as context</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.useVectorData}
                      onChange={(e) => handleSettingChange('useVectorData', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                {/* Enhanced Repository Info */}
                {connectedVectorData && connectedVectorData.vectors.length > 0 && (
                  <div className="bg-blue-100 p-3 rounded-lg text-xs">
                    <div className="font-medium text-blue-800 mb-2">Repository Analysis:</div>
                    <div className="text-blue-700 space-y-1">
                      <div>📚 Vectors: {connectedVectorData.vectors.length}</div>
                      <div>📁 Files: {stats.filesAnalyzed}</div>
                      <div>🏗️ Project Type: {stats.projectType}</div>
                      <div>💻 Languages: {stats.detectedLanguages.join(', ') || 'None detected'}</div>
                      <div>📝 Content Size: {Math.round((connectedVectorData.processedContent?.length || 0) / 1000)}K chars</div>
                    </div>
                  </div>
                )}

                {/* Output Data Info */}
                {generatedReadme && (
                  <div className="bg-amber-100 p-3 rounded-lg text-xs">
                    <div className="font-medium text-amber-800 mb-2">Output Data Available:</div>
                    <div className="text-amber-700 space-y-1">
                      <div>📄 README Length: {stats.readmeLength} chars</div>
                      <div>📊 Word Count: {stats.wordCount}</div>
                      <div>📋 Sections: {stats.sections}</div>
                      <div>🔗 Ready for connection to other nodes</div>
                    </div>
                  </div>
                )}

                {/* Connection Info */}
                {connectedApiConfig && (
                  <div className="bg-gray-100 p-2 rounded text-xs">
                    <div className="font-medium text-gray-700 mb-1">Connection Info:</div>
                    <div>Provider: {connectedApiConfig.provider}</div>
                    <div>Connected: {connectedApiConfig.isConnected ? 'Yes' : 'No'}</div>
                    <div>Models: {availableModels.length}</div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generated README Display */}
        {generatedReadme && (
          <div className="relative z-10 p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Generated README ({Math.round(generatedReadme.length / 1000)}k chars)
                {generatedReadme.length > settings.maxCharacters && (
                  <span className="text-red-600 ml-2">⚠️ Over limit</span>
                )}
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={copyToClipboard}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  title="Copy to clipboard"
                >
                  📋
                </button>
                <button
                  onClick={downloadReadme}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  title="Download as README.md"
                >
                  💾
                </button>
              </div>
            </div>
            <textarea
              ref={textareaRef}
              value={generatedReadme}
              onChange={(e) => setGeneratedReadme(e.target.value)}
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md text-xs font-mono resize-none nodrag"
              placeholder="Generated README will appear here..."
            />
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ReadmeNode;
