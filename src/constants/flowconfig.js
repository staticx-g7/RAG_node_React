// src/constants/flowconfig.js
import React from 'react';
import ExecuteNode from '../components/nodes/ExecuteNode';
import TextNode from '../components/nodes/TextNode';
import GitNode from '../components/nodes/GitNode';
import FilterNode from '../components/nodes/FilterNode';
import ParseNode from '../components/nodes/ParseNode';
import ChunkNode from '../components/nodes/ChunkNode';
import APIConfigNode from '../components/nodes/APIConfigNode';
import VectorizeNode from '../components/nodes/VectorizeNode';
import ChatNode from '../components/nodes/ChatNode';
import ReadmeNode from '../components/nodes/ReadmeNode';

// Node type definitions with enhanced compatibility
export const nodeTypes = {
  executeNode: ExecuteNode,
  textNode: TextNode,
  gitNode: GitNode,
  filterNode: FilterNode,
  parseNode: ParseNode,
  chunkNode: ChunkNode,
  apiConfigNode: APIConfigNode,
  vectorizeNode: VectorizeNode,
  chatNode: ChatNode,
  readmeNode: ReadmeNode,
};


// Universal data format standards for cross-node compatibility
export const NODE_DATA_FORMATS = {
  // Standard field names for different data types
  FILES: ['files', 'filteredFiles', 'repositoryFiles', 'selectedFiles', 'processedFiles', 'fetchedFiles', 'output'],
  CONTENT: ['content', 'text', 'parsedContent', 'extractedText', 'fileContent', 'output', 'repositoryContent', 'filteredContent'],
  CHUNKS: ['chunks', 'processedChunks', 'textChunks', 'outputChunks'],
  VECTORS: ['vectors', 'embeddings', 'vectorData', 'vectorizationResults'],
  API_CONFIG: ['apiConfig', 'configuration', 'settings'],

  // Helper function to extract data with fallbacks
  extractData: (nodeData, dataType) => {
    if (!nodeData) return dataType === 'FILES' || dataType === 'CHUNKS' || dataType === 'VECTORS' ? [] : '';

    const fieldNames = NODE_DATA_FORMATS[dataType] || [];
    for (const fieldName of fieldNames) {
      if (nodeData[fieldName] !== undefined && nodeData[fieldName] !== null) {
        return nodeData[fieldName];
      }
    }
    return dataType === 'FILES' || dataType === 'CHUNKS' || dataType === 'VECTORS' ? [] : '';
  },

  // Validate data compatibility between nodes
  validateConnection: (sourceNode, targetNode, dataType) => {
    const sourceData = NODE_DATA_FORMATS.extractData(sourceNode.data, dataType);
    return sourceData && (Array.isArray(sourceData) ? sourceData.length > 0 : sourceData.length > 0);
  }
};

// API Provider configurations
export const API_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    icon: '🤖',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    modelsEndpoint: 'https://api.openai.com/v1/models',
    embeddingsEndpoint: 'https://api.openai.com/v1/embeddings',
    requiresApiKey: true,
    keyFormat: 'sk-...',
    supportedModels: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o'],
    embeddingModels: ['text-embedding-ada-002', 'text-embedding-3-small', 'text-embedding-3-large']
  },
  blablador: {
    name: 'Blablador (JSC)',
    icon: '🔬',
    // FIXED: Use base endpoint, not chat completions endpoint
    endpoint: 'https://api.helmholtz-blablador.fz-juelich.de/v1',
    modelsEndpoint: 'https://api.helmholtz-blablador.fz-juelich.de/v1/models',
    embeddingsEndpoint: 'https://api.helmholtz-blablador.fz-juelich.de/v1/embeddings',
    requiresApiKey: true,
    keyFormat: 'glpat-...',
  },
  anthropic: {
    name: 'Anthropic',
    icon: '🧠',
    endpoint: 'https://api.anthropic.com/v1/messages',
    modelsEndpoint: 'https://api.anthropic.com/v1/models',
    requiresApiKey: true,
    keyFormat: 'sk-ant-...',
    supportedModels: ['claude-3-sonnet-20240229', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    embeddingModels: []
  },
  huggingface: {
    name: 'Hugging Face',
    icon: '🤗',
    endpoint: 'https://api-inference.huggingface.co/models/',
    requiresApiKey: true,
    keyFormat: 'hf_...',
    supportedModels: ['microsoft/DialoGPT-large', 'facebook/blenderbot-400M-distill'],
    embeddingModels: ['sentence-transformers/all-MiniLM-L6-v2']
  },
  custom: {
    name: 'Custom API',
    icon: '⚙️',
    endpoint: '',
    modelsEndpoint: '',
    embeddingsEndpoint: '',
    requiresApiKey: true,
    keyFormat: 'custom',
    supportedModels: [],
    embeddingModels: []
  }
};

// File format configurations
export const FILE_FORMATS = {
  text: {
    extensions: ['txt', 'md', 'markdown'],
    icon: '📝',
    color: 'text-blue-600',
    parser: 'text'
  },
  code: {
    extensions: ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs'],
    icon: '💻',
    color: 'text-green-600',
    parser: 'code'
  },
  data: {
    extensions: ['json', 'xml', 'yaml', 'yml', 'csv', 'toml'],
    icon: '📊',
    color: 'text-purple-600',
    parser: 'structured'
  },
  web: {
    extensions: ['html', 'htm', 'css', 'scss', 'sass', 'less'],
    icon: '🌐',
    color: 'text-orange-600',
    parser: 'web'
  },
  document: {
    extensions: ['pdf', 'doc', 'docx', 'rtf'],
    icon: '📄',
    color: 'text-red-600',
    parser: 'document'
  }
};

// Chunking strategies
export const CHUNKING_STRATEGIES = {
  recursive: {
    name: 'Recursive Text Splitter',
    description: 'Splits text recursively using multiple separators',
    icon: '🔄',
    separators: ['\n\n', '\n', '. ', ' ', ''],
    preserveStructure: true
  },
  character: {
    name: 'Character Splitter',
    description: 'Splits text by fixed character count',
    icon: '📏',
    preserveStructure: false
  },
  token: {
    name: 'Token Splitter',
    description: 'Splits text by token count (words)',
    icon: '🔤',
    preserveStructure: false
  },
  semantic: {
    name: 'Semantic Splitter',
    description: 'Splits text by semantic boundaries (paragraphs)',
    icon: '🧠',
    preserveStructure: true
  },
  structure: {
    name: 'Structure-Aware Splitter',
    description: 'Respects document structure (sentences, paragraphs)',
    icon: '🏗️',
    preserveStructure: true
  }
};

// Vector store configurations
export const VECTOR_STORES = {
  memory: {
    name: 'In-Memory',
    icon: '💾',
    description: 'Store vectors in memory (temporary)',
    persistent: false
  },
  pinecone: {
    name: 'Pinecone',
    icon: '🌲',
    description: 'Pinecone vector database',
    persistent: true,
    requiresApiKey: true
  },
  weaviate: {
    name: 'Weaviate',
    icon: '🕸️',
    description: 'Weaviate vector database',
    persistent: true,
    requiresApiKey: false
  },
  chroma: {
    name: 'ChromaDB',
    icon: '🎨',
    description: 'Chroma vector database',
    persistent: true,
    requiresApiKey: false
  },
  redis: {
    name: 'Redis',
    icon: '🔴',
    description: 'Redis vector search',
    persistent: true,
    requiresApiKey: false
  }
};

// Initial nodes for the flow
export const INITIAL_NODES = [
  {
    id: 'api-config-1',
    type: 'apiConfigNode',
    data: {
      label: 'API Configuration',
      description: 'Configure AI API settings',
      provider: 'custom',
      endpoint: '',
      apiKey: '',
      isConnected: false,
      availableModels: []
    },
    position: { x: 100, y: 100 },
  },
  {
    id: 'git-1',
    type: 'gitNode',
    data: {
      label: 'Git Repository',
      description: 'Fetch repository data',
      platform: 'github',
      repository: '',
      branch: 'main',
      files: [],
      repositoryFiles: [],
      content: '',
      repositoryContent: ''
    },
    position: { x: 100, y: 250 },
  },
  {
    id: 'chat-1',
    type: 'chatNode',
    data: {
      label: 'AI Chat',
      description: 'Chat with AI models',
      model: 'gpt-3.5-turbo',
      messages: [],
      isExpanded: false,
      connectedApiConfig: null
    },
    position: { x: 700, y: 100 },
  },
];

// Initial edges for the flow
export const INITIAL_EDGES = [];

// Flow configuration
export const FLOW_CONFIG = {
  nodesDraggable: true,
  nodesConnectable: true,
  elementsSelectable: true,
  snapToGrid: true,
  snapGrid: [15, 15],
  defaultViewport: { x: 0, y: 0, zoom: 1 },
  minZoom: 0.2,
  maxZoom: 2,
  attributionPosition: 'bottom-left',

  // Enhanced connection validation
  isValidConnection: (connection) => {
    console.log('🔗 Validating connection:', connection);

    // Prevent self-connections
    if (connection.source === connection.target) {
      console.log('❌ Self-connection not allowed');
      return false;
    }

    // Define valid connection patterns
    const validConnections = {
      gitNode: ['filterNode', 'parseNode', 'chunkNode'],
      filterNode: ['parseNode', 'chunkNode'],
      parseNode: ['chunkNode'],
      chunkNode: ['vectorizeNode'],
      vectorizeNode: ['chatNode'],
      apiConfigNode: ['chatNode', 'vectorizeNode'],
      textNode: ['filterNode', 'parseNode', 'chunkNode'],
      executeNode: ['gitNode', 'filterNode', 'parseNode', 'chunkNode', 'vectorizeNode', 'chatNode']
    };

    // Get source and target node types (this would need to be implemented with actual node lookup)
    // For now, allow all connections
    return true;
  },

  // Connection line styling
  connectionLineStyle: {
    stroke: '#3b82f6',
    strokeWidth: 3,
    strokeDasharray: '8,8'
  },

  // Default edge options
  defaultEdgeOptions: {
    type: 'smoothstep',
    animated: true,
    style: {
      stroke: '#6b7280',
      strokeWidth: 2
    },
    markerEnd: {
      type: 'arrowclosed',
      color: '#6b7280',
    },
  },
};

// Node categories for the sidebar
export const NODE_CATEGORIES = {
  control: {
    name: 'Control',
    icon: '⚡',
    color: 'purple',
    nodes: [
      {
        type: 'executeNode',
        label: 'Execute Node',
        icon: '▶️',
        description: 'Start workflow execution and trigger connected nodes'
      }
    ]
  },
  dataSources: {
    name: 'Data Sources',
    icon: '📁',
    color: 'blue',
    nodes: [
      {
        type: 'apiConfigNode',
        label: 'API Configuration',
        icon: '🔑',
        description: 'Configure API credentials for LLM services'
      },
      {
        type: 'gitNode',
        label: 'Git Repository',
        icon: '🐙',
        description: 'Fetch repository contents from GitHub/GitLab'
      },
      {
        type: 'textNode',
        label: 'Text Input',
        icon: '📝',
        description: 'Provide manual text input or display data'
      }
    ]
  },
  processing: {
    name: 'Processing',
    icon: '⚙️',
    color: 'green',
    nodes: [
      {
        type: 'filterNode',
        label: 'Smart Filter',
        icon: '🔍',
        description: 'Filter repository files and folders intelligently'
      },
      {
        type: 'parseNode',
        label: 'File Parser',
        icon: '🔧',
        description: 'Parse and extract content from various file formats'
      },
      {
        type: 'chunkNode',
        label: 'Universal Chunker',
        icon: '🧩',
        description: 'Chunk content for RAG and LLM processing'
      },
      {
        type: 'vectorizeNode',
        label: 'Vector Embeddings',
        icon: '🔮',
        description: 'Generate vector embeddings for semantic search'
      },
      {
        type: 'chatNode',
        label: 'RAG Chat Query',
        icon: '💬',
        description: 'Query your knowledge base with intelligent conversation'
      },
      {
        type: 'readmeNode',
        label: 'README Generator',
        icon: '📝',
        description: 'Generate comprehensive README files using AI'
      },
    ]
  }
};

// Workflow templates
export const WORKFLOW_TEMPLATES = {
  basicRAG: {
    name: 'Basic RAG Pipeline',
    description: 'Complete RAG workflow from repository to chat',
    nodes: [
      { type: 'apiConfigNode', position: { x: 100, y: 100 } },
      { type: 'gitNode', position: { x: 100, y: 250 } },
      { type: 'filterNode', position: { x: 300, y: 250 } },
      { type: 'parseNode', position: { x: 500, y: 250 } },
      { type: 'chunkNode', position: { x: 700, y: 250 } },
      { type: 'vectorizeNode', position: { x: 900, y: 250 } },
      { type: 'chatNode', position: { x: 700, y: 100 } }
    ],
    edges: [
      { source: 'gitNode', target: 'filterNode' },
      { source: 'filterNode', target: 'parseNode' },
      { source: 'parseNode', target: 'chunkNode' },
      { source: 'chunkNode', target: 'vectorizeNode' },
      { source: 'apiConfigNode', target: 'chatNode' },
      { source: 'apiConfigNode', target: 'vectorizeNode' }
    ]
  },
  simpleChat: {
    name: 'Simple Chat',
    description: 'Basic chat setup with API configuration',
    nodes: [
      { type: 'apiConfigNode', position: { x: 100, y: 100 } },
      { type: 'chatNode', position: { x: 400, y: 100 } }
    ],
    edges: [
      { source: 'apiConfigNode', target: 'chatNode' }
    ]
  },
  documentProcessing: {
    name: 'Document Processing',
    description: 'Process and chunk documents without chat',
    nodes: [
      { type: 'gitNode', position: { x: 100, y: 100 } },
      { type: 'filterNode', position: { x: 300, y: 100 } },
      { type: 'parseNode', position: { x: 500, y: 100 } },
      { type: 'chunkNode', position: { x: 700, y: 100 } }
    ],
    edges: [
      { source: 'gitNode', target: 'filterNode' },
      { source: 'filterNode', target: 'parseNode' },
      { source: 'parseNode', target: 'chunkNode' }
    ]
  }
};

// Export utility functions
export const FlowUtils = {
  // Get node by ID
  getNodeById: (nodes, id) => nodes.find(node => node.id === id),

  // Get connected nodes
  getConnectedNodes: (nodes, edges, nodeId, direction = 'target') => {
    const connectedEdges = edges.filter(edge =>
      direction === 'target' ? edge.source === nodeId : edge.target === nodeId
    );
    return connectedEdges.map(edge => {
      const connectedNodeId = direction === 'target' ? edge.target : edge.source;
      return nodes.find(node => node.id === connectedNodeId);
    }).filter(Boolean);
  },

  // Validate workflow
  validateWorkflow: (nodes, edges) => {
    const errors = [];
    const warnings = [];

    // Check for isolated nodes
    const connectedNodeIds = new Set();
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    nodes.forEach(node => {
      if (!connectedNodeIds.has(node.id) && node.type !== 'textNode') {
        warnings.push(`Node ${node.data.label} (${node.id}) is not connected`);
      }
    });

    // Check for API configuration
    const hasApiConfig = nodes.some(node => node.type === 'apiConfigNode');
    const hasChatNode = nodes.some(node => node.type === 'chatNode');

    if (hasChatNode && !hasApiConfig) {
      errors.push('Chat node requires an API Configuration node');
    }

    return { errors, warnings, isValid: errors.length === 0 };
  },

  // Generate workflow summary
  getWorkflowSummary: (nodes, edges) => {
    const nodeTypes = {};
    nodes.forEach(node => {
      nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
    });

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodeTypes,
      hasRAGPipeline: nodes.some(n => n.type === 'vectorizeNode'),
      hasChat: nodes.some(n => n.type === 'chatNode'),
      hasApiConfig: nodes.some(n => n.type === 'apiConfigNode')
    };
  }
};

export default {
  nodeTypes,
  NODE_DATA_FORMATS,
  API_PROVIDERS,
  FILE_FORMATS,
  CHUNKING_STRATEGIES,
  VECTOR_STORES,
  INITIAL_NODES,
  INITIAL_EDGES,
  FLOW_CONFIG,
  NODE_CATEGORIES,
  WORKFLOW_TEMPLATES,
  FlowUtils
};
