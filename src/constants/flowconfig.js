import {
  ExecuteNode,
  TextNode,
  GitNode,
  FilterNode,
  ParseNode,
  ChunkNode
} from '../components/nodes';

// **CUSTOM NODE TYPES FOR YOUR WORKFLOW AUTOMATION SYSTEM**
export const nodeTypes = {
  executeNode: ExecuteNode,
  textNode: TextNode,
  gitNode: GitNode,
  filterNode: FilterNode,
  parseNode: ParseNode,
  chunkNode: ChunkNode,
};

// **INITIAL WORKFLOW SETUP - RAG PIPELINE EXAMPLE**
export const INITIAL_NODES = [
  {
    id: 'execute-1',
    type: 'executeNode',
    data: {
      label: 'Execute Workflow',
      description: 'Start your RAG pipeline'
    },
    position: { x: 100, y: 100 },
  },
  {
    id: 'git-1',
    type: 'gitNode',
    data: {
      label: 'Git Repository',
      platform: 'github',
      description: 'Fetch repository data'
    },
    position: { x: 400, y: 100 },
  },
  {
    id: 'filter-1',
    type: 'filterNode',
    data: {
      label: 'Smart Filter',
      description: 'Filter files for processing'
    },
    position: { x: 700, y: 100 },
  },
  {
    id: 'parse-1',
    type: 'parseNode',
    data: {
      label: 'Parse Files',
      description: 'Extract content from files'
    },
    position: { x: 1000, y: 100 },
  },
  {
    id: 'chunk-1',
    type: 'chunkNode',
    data: {
      label: 'Universal Chunker',
      description: 'Chunk content for RAG'
    },
    position: { x: 1300, y: 100 },
  },
];

// **INITIAL CONNECTIONS FOR RAG WORKFLOW**
export const INITIAL_EDGES = [
  {
    id: 'e-execute-git',
    source: 'execute-1',
    target: 'git-1',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#f59e0b', strokeWidth: 2 },
    markerEnd: {
      type: 'arrowclosed',
      color: '#f59e0b',
    }
  },
  {
    id: 'e-git-filter',
    source: 'git-1',
    target: 'filter-1',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#6366f1', strokeWidth: 2 },
    markerEnd: {
      type: 'arrowclosed',
      color: '#6366f1',
    }
  },
  {
    id: 'e-filter-parse',
    source: 'filter-1',
    target: 'parse-1',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#8b5cf6', strokeWidth: 2 },
    markerEnd: {
      type: 'arrowclosed',
      color: '#8b5cf6',
    }
  },
  {
    id: 'e-parse-chunk',
    source: 'parse-1',
    target: 'chunk-1',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#10b981', strokeWidth: 2 },
    markerEnd: {
      type: 'arrowclosed',
      color: '#10b981',
    }
  },
];

// **NODE CATEGORIES FOR SIDEBAR ORGANIZATION**
export const NODE_CATEGORIES = {
  CONTROL: 'Control',
  DATA: 'Data Sources',
  PROCESSING: 'Processing',
  OUTPUT: 'Output',
  UTILITY: 'Utility'
};

// **AVAILABLE NODES FOR DRAG & DROP SIDEBAR**
export const AVAILABLE_NODES = [
  // Control Nodes
  {
    type: 'executeNode',
    label: 'Execute',
    icon: '▶️',
    category: NODE_CATEGORIES.CONTROL,
    description: 'Start workflow execution',
    color: '#ef4444'
  },

  // Data Source Nodes
  {
    type: 'gitNode',
    label: 'Git Repository',
    icon: '🐙',
    category: NODE_CATEGORIES.DATA,
    description: 'Fetch from GitHub/GitLab',
    color: '#f59e0b'
  },

  // Processing Nodes
  {
    type: 'filterNode',
    label: 'Smart Filter',
    icon: '🔍',
    category: NODE_CATEGORIES.PROCESSING,
    description: 'Filter files and folders',
    color: '#6366f1'
  },
  {
    type: 'parseNode',
    label: 'Parse Files',
    icon: '🔧',
    category: NODE_CATEGORIES.PROCESSING,
    description: 'Extract content from files',
    color: '#8b5cf6'
  },
  {
    type: 'chunkNode',
    label: 'Universal Chunker',
    icon: '🧩',
    category: NODE_CATEGORIES.PROCESSING,
    description: 'Chunk content for RAG',
    color: '#10b981'
  },

  // Utility Nodes
  {
    type: 'textNode',
    label: 'Text Node',
    icon: '📝',
    category: NODE_CATEGORIES.UTILITY,
    description: 'Display or edit text',
    color: '#6b7280'
  },
];

// **WORKFLOW TEMPLATES**
export const WORKFLOW_TEMPLATES = {
  RAG_PIPELINE: {
    name: 'RAG Pipeline',
    description: 'Complete RAG workflow from Git to Chunks',
    nodes: INITIAL_NODES,
    edges: INITIAL_EDGES
  },
  SIMPLE_PROCESSING: {
    name: 'Simple Processing',
    description: 'Basic file processing workflow',
    nodes: [
      {
        id: 'git-simple',
        type: 'gitNode',
        data: { label: 'Git Repository' },
        position: { x: 200, y: 100 },
      },
      {
        id: 'parse-simple',
        type: 'parseNode',
        data: { label: 'Parse Files' },
        position: { x: 500, y: 100 },
      },
    ],
    edges: [
      {
        id: 'e-simple',
        source: 'git-simple',
        target: 'parse-simple',
        type: 'smoothstep',
        animated: true,
      }
    ]
  }
};

// **ENHANCED FLOW CONFIGURATION**
export const FLOW_CONFIG = {
  // View and positioning
  fitViewOptions: {
    padding: 0.3,
    includeHiddenNodes: false,
    minZoom: 0.1,
    maxZoom: 2
  },
  nodeOrigin: [0.5, 0.5], // Center origin for better handle positioning

  // Grid and snapping
  snapToGrid: true,
  snapGrid: [20, 20],

  // Background styling
  backgroundVariant: 'dots', // Changed to dots for better visual appeal
  backgroundGap: 20,
  backgroundSize: 1,
  backgroundColor: '#fafafa',

  // Interaction settings
  nodesDraggable: true,
  nodesConnectable: true,
  elementsSelectable: true,
  selectNodesOnDrag: false,

  // Connection settings
  connectionMode: 'strict', // Only allow valid connections
  connectionLineType: 'smoothstep',
  connectionLineStyle: {
    stroke: '#94a3b8',
    strokeWidth: 2,
    strokeDasharray: '5,5'
  },

  // Default edge options
  defaultEdgeOptions: {
    type: 'smoothstep',
    animated: false,
    style: {
      stroke: '#94a3b8',
      strokeWidth: 2
    },
    markerEnd: {
      type: 'arrowclosed',
      color: '#94a3b8',
    }
  },

  // Zoom and pan settings
  zoomOnScroll: true,
  zoomOnPinch: true,
  panOnScroll: false,
  panOnScrollSpeed: 0.5,
  zoomOnDoubleClick: false,

  // Selection settings
  multiSelectionKeyCode: 'Meta', // Cmd on Mac, Ctrl on Windows
  deleteKeyCode: 'Delete',

  // Auto-layout settings
  autoLayout: {
    direction: 'LR', // Left to Right
    spacing: [300, 150], // [horizontal, vertical] spacing
  }
};

// **NODE VALIDATION RULES**
export const NODE_VALIDATION = {
  // Maximum connections per node type
  maxConnections: {
    executeNode: { input: 0, output: 5 },
    gitNode: { input: 1, output: 5 },
    filterNode: { input: 1, output: 3 },
    parseNode: { input: 1, output: 3 },
    chunkNode: { input: 1, output: 3 },
    textNode: { input: 3, output: 1 },
  },

  // Valid connection types
  validConnections: {
    executeNode: ['gitNode', 'textNode'],
    gitNode: ['filterNode', 'parseNode'],
    filterNode: ['parseNode'],
    parseNode: ['chunkNode'],
    chunkNode: ['textNode'], // Future: vectorizeNode
    textNode: []
  }
};

// **KEYBOARD SHORTCUTS**
export const KEYBOARD_SHORTCUTS = {
  DELETE_SELECTED: 'Delete',
  SELECT_ALL: 'Meta+a',
  COPY: 'Meta+c',
  PASTE: 'Meta+v',
  UNDO: 'Meta+z',
  REDO: 'Meta+Shift+z',
  FIT_VIEW: 'f',
  ZOOM_IN: 'Meta+=',
  ZOOM_OUT: 'Meta+-',
  TOGGLE_CONSOLE: 'Meta+`', // For your floating console preference
};

// **ANIMATION SETTINGS FOR FRAMER MOTION**
export const ANIMATION_CONFIG = {
  nodeAppear: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    transition: { type: "spring", stiffness: 300, damping: 20 }
  },
  edgeAppear: {
    initial: { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: { duration: 0.5, ease: "easeInOut" }
  },
  nodeHover: {
    whileHover: { scale: 1.02 },
    transition: { type: "spring", stiffness: 400, damping: 10 }
  }
};

// **EXPORT ALL CONFIGURATIONS**
export default {
  nodeTypes,
  INITIAL_NODES,
  INITIAL_EDGES,
  NODE_CATEGORIES,
  AVAILABLE_NODES,
  WORKFLOW_TEMPLATES,
  FLOW_CONFIG,
  NODE_VALIDATION,
  KEYBOARD_SHORTCUTS,
  ANIMATION_CONFIG
};
