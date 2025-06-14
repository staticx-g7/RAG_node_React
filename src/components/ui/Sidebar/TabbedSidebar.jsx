import React, {useState, useEffect, useRef, useCallback} from 'react';
import { motion, AnimatePresence, useCycle } from 'framer-motion';
import { useDnD } from '../../../contexts/DnDContext';

const OverviewTab = () => (
  <motion.div
    className="p-4 space-y-4"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, staggerChildren: 0.05 }}
  >
    <motion.div
      className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200"
      whileHover={{
        scale: 1.02,
        boxShadow: "0 6px 20px rgba(59, 130, 246, 0.15)",
        transition: { duration: 0.15, ease: "easeOut" }
      }}
    >
      <h3 className="text-lg font-semibold text-blue-800 mb-2">Welcome to Workflow Automation</h3>
      <p className="text-sm text-blue-700">
        Build powerful RAG pipelines with our intuitive drag-and-drop interface.
      </p>
    </motion.div>

    <motion.div
      className="space-y-3"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
      }}
      initial="hidden"
      animate="visible"
    >
      <h4 className="font-medium text-gray-800">Complete RAG Pipeline Workflow</h4>
      <div className="space-y-2 text-sm text-gray-600">
        {[
          'Start with Execute Node to trigger the workflow',
          'Configure API credentials with API Config Node',
          'Use Git Node to fetch repository data',
          'Apply Filter Node to select relevant files',
          'Parse files with Parse Node for content extraction',
          'Chunk content with Chunk Node for RAG processing',
          'Generate embeddings with Vectorize Node for semantic search'
        ].map((step, index) => (
          <motion.div
            key={index}
            className="flex items-start space-x-2"
            variants={{
              hidden: { opacity: 0, x: -20 },
              visible: { opacity: 1, x: 0 }
            }}
            whileHover={{ x: 5, color: "#3b82f6" }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <span className="text-blue-500 font-bold">{index + 1}.</span>
            <span>{step}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>

    <motion.div
      className="bg-amber-50 rounded-lg p-3 border border-amber-200"
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <h4 className="font-medium text-amber-800 mb-2">💡 Pro Tips</h4>
      <ul className="text-xs text-amber-700 space-y-1">
        <li>• Connect API Config Node to multiple processing nodes</li>
        <li>• Use the floating console to monitor workflow progress</li>
        <li>• Enable "Parse All Files" for comprehensive processing</li>
        <li>• Adjust chunk sizes based on your LLM context window</li>
        <li>• Test API connections before running vectorization</li>
      </ul>
    </motion.div>
  </motion.div>
);

// **CATEGORIZED NODE TABS**
const ControlTab = () => {
  const [type, setType] = useDnD();

  const onDragStart = (event, nodeType) => {
    setType(nodeType);
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('text/plain', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragEnd = () => {
    setType(null);
  };

  const controlNodes = [
    {
      type: 'executeNode',
      label: 'Execute Node',
      icon: '▶️',
      color: 'bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200 text-purple-800',
      description: 'Start workflow execution and trigger connected nodes'
    }
  ];

  return (
    <motion.div
      className="p-4 space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="mb-4"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-lg font-semibold text-purple-800 mb-2">🎮 Control Nodes</h3>
        <p className="text-sm text-purple-600">
          Nodes that control workflow execution and timing
        </p>
      </motion.div>

      <motion.div className="space-y-3">
        {controlNodes.map((node, index) => (
          <motion.div
            key={node.type}
            className={`${node.color} border-2 border-dashed rounded-xl p-3 cursor-grab active:cursor-grabbing transition-colors duration-150`}
            draggable={true}
            onDragStart={(event) => onDragStart(event, node.type)}
            onDragEnd={onDragEnd}
            style={{ userSelect: 'none' }}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={{
              scale: 1.03,
              y: -3,
              boxShadow: "0 8px 20px rgba(147, 51, 234, 0.15)",
              transition: { duration: 0.15, ease: "easeOut" }
            }}
            whileTap={{ scale: 0.98 }}
            whileDrag={{
              scale: 1.08,
              rotate: 2,
              zIndex: 1000,
              boxShadow: "0 15px 30px rgba(147, 51, 234, 0.25)"
            }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
          >
            <div className="flex items-center space-x-3">
              <motion.span
                className="text-2xl"
                whileHover={{ scale: 1.15, rotate: 8 }}
              >
                {node.icon}
              </motion.span>
              <div className="flex-1">
                <div className="font-medium text-sm">{node.label}</div>
                <div className="text-xs opacity-75">{node.description}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

const DataSourcesTab = () => {
  const [type, setType] = useDnD();

  const onDragStart = (event, nodeType) => {
    setType(nodeType);
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('text/plain', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragEnd = () => {
    setType(null);
  };

  const dataSourceNodes = [
    {
      type: 'apiConfigNode',
      label: 'API Configuration',
      icon: '🔑',
      color: 'bg-gradient-to-r from-cyan-50 to-teal-50 border-cyan-200 text-cyan-800',
      description: 'Configure API credentials for LLM services'
    },
    {
      type: 'gitNode',
      label: 'Git Repository',
      icon: '🐙',
      color: 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 text-amber-800',
      description: 'Fetch repository contents from GitHub/GitLab'
    },
    {
      type: 'textNode',
      label: 'Text Input',
      icon: '📝',
      color: 'bg-gradient-to-r from-blue-50 to-sky-50 border-blue-200 text-blue-800',
      description: 'Provide manual text input or display data'
    }
  ];

  return (
    <motion.div
      className="p-4 space-y-4"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="mb-4"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-lg font-semibold text-amber-800 mb-2">📊 Data Sources</h3>
        <p className="text-sm text-amber-600">
          Nodes that provide input data and configuration for your workflow
        </p>
      </motion.div>

      <motion.div className="space-y-3">
        {dataSourceNodes.map((node, index) => (
          <motion.div
            key={node.type}
            className={`${node.color} border-2 border-dashed rounded-xl p-3 cursor-grab active:cursor-grabbing transition-colors duration-150`}
            draggable={true}
            onDragStart={(event) => onDragStart(event, node.type)}
            onDragEnd={onDragEnd}
            style={{ userSelect: 'none' }}
            initial={{ opacity: 0, x: -20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            whileHover={{
              scale: 1.03,
              y: -3,
              boxShadow: "0 8px 20px rgba(245, 158, 11, 0.15)",
              transition: { duration: 0.15, ease: "easeOut" }
            }}
            whileTap={{ scale: 0.98 }}
            whileDrag={{
              scale: 1.08,
              rotate: 2,
              zIndex: 1000,
              boxShadow: "0 15px 30px rgba(245, 158, 11, 0.25)"
            }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
          >
            <div className="flex items-center space-x-3">
              <motion.span
                className="text-2xl"
                whileHover={{ scale: 1.15, rotate: 8 }}
              >
                {node.icon}
              </motion.span>
              <div className="flex-1">
                <div className="font-medium text-sm">{node.label}</div>
                <div className="text-xs opacity-75">{node.description}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

const ProcessingTab = () => {
  const [type, setType] = useDnD();

  const onDragStart = (event, nodeType) => {
    setType(nodeType);
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('text/plain', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragEnd = () => {
    setType(null);
  };

  const processingNodes = [
    {
      type: 'filterNode',
      label: 'Smart Filter',
      icon: '🔍',
      color: 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200 text-indigo-800',
      description: 'Filter repository files and folders intelligently'
    },
    {
      type: 'parseNode',
      label: 'File Parser',
      icon: '🔧',
      color: 'bg-gradient-to-r from-slate-50 to-stone-50 border-slate-200 text-slate-800',
      description: 'Parse and extract content from various file formats'
    },
    {
      type: 'chunkNode',
      label: 'Universal Chunker',
      icon: '🧩',
      color: 'bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200 text-rose-800',
      description: 'Chunk content for RAG and LLM processing'
    },
    {
      type: 'vectorizeNode',
      label: 'Vector Embeddings',
      icon: '🔮',
      color: 'bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200 text-purple-800',
      description: 'Generate vector embeddings for semantic search'
    },
    {
      type: 'chatNode',
      label: 'RAG Chat Query',
      icon: '💬',
      color: 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-800',
      description: 'Query your knowledge base with intelligent conversation'
    }
  ];

  return (
    <motion.div
      className="p-4 space-y-4"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="mb-4"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-lg font-semibold text-green-800 mb-2">⚙️ Processing Nodes</h3>
        <p className="text-sm text-green-600">
          Nodes that transform and process your data for RAG
        </p>
      </motion.div>

      <motion.div className="space-y-3">
        {processingNodes.map((node, index) => (
          <motion.div
            key={node.type}
            className={`${node.color} border-2 border-dashed rounded-xl p-3 cursor-grab active:cursor-grabbing transition-colors duration-150`}
            draggable={true}
            onDragStart={(event) => onDragStart(event, node.type)}
            onDragEnd={onDragEnd}
            style={{ userSelect: 'none' }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{
              scale: 1.03,
              y: -3,
              boxShadow: "0 8px 20px rgba(34, 197, 94, 0.15)",
              transition: { duration: 0.15, ease: "easeOut" }
            }}
            whileTap={{ scale: 0.98 }}
            whileDrag={{
              scale: 1.08,
              rotate: 2,
              zIndex: 1000,
              boxShadow: "0 15px 30px rgba(34, 197, 94, 0.25)"
            }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
          >
            <div className="flex items-center space-x-3">
              <motion.span
                className="text-2xl"
                whileHover={{ scale: 1.15, rotate: 8 }}
              >
                {node.icon}
              </motion.span>
              <div className="flex-1">
                <div className="font-medium text-sm">{node.label}</div>
                <div className="text-xs opacity-75">{node.description}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

const TabbedSidebar = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: '📋 Overview', icon: '📋' },
    { id: 'control', label: '🎮 Control', icon: '🎮' },
    { id: 'data', label: '📊 Data', icon: '📊' },
    { id: 'processing', label: '⚙️ Processing', icon: '⚙️' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab />;
      case 'control': return <ControlTab />;
      case 'data': return <DataSourcesTab />;
      case 'processing': return <ProcessingTab />;
      default: return <OverviewTab />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Drag Handle */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-gray-400/60 rounded-full hover:bg-gray-500/90 transition-colors cursor-grab" />

      {/* Tab Headers */}
      <div className="flex border-b border-white/20 bg-white/10 w-full pt-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-0 px-2 py-3 text-xs font-medium transition-all duration-200 relative
              ${activeTab === tab.id ? 'text-blue-700 bg-white/40' : 'text-gray-700 bg-transparent'}`}
          >
            <div className="flex flex-col items-center space-y-1">
              <span className="text-sm">{tab.icon}</span>
              <span className="truncate">{tab.label.split(' ')[1]}</span>
            </div>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content - flush left, no extra padding */}
      <div className="flex-1 overflow-y-auto w-full px-4 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TabbedSidebar;

