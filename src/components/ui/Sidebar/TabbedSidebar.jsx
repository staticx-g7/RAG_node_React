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
      <h4 className="font-medium text-gray-800">RAG Pipeline Workflow</h4>
      <div className="space-y-2 text-sm text-gray-600">
        {[
          'Start with Execute Node to trigger the workflow',
          'Use Git Node to fetch repository data',
          'Apply Filter Node to select relevant files',
          'Parse files with Parse Node for content extraction',
          'Chunk content with Chunk Node for RAG processing'
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
        <li>• Connect nodes in sequence for chain reaction execution</li>
        <li>• Use the floating console to monitor workflow progress</li>
        <li>• Enable "Parse All Files" for comprehensive processing</li>
        <li>• Adjust chunk sizes based on your LLM context window</li>
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
          Nodes that provide input data for your workflow
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
          Nodes that transform and process your data
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

const TabbedSidebar = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isVisible, setIsVisible] = useState(true);
  const sidebarRef = useRef(null);

  const tabs = [
    { id: 'overview', label: '📋 Overview', icon: '📋' },
    { id: 'control', label: '🎮 Control', icon: '🎮' },
    { id: 'data', label: '📊 Data', icon: '📊' },
    { id: 'processing', label: '⚙️ Processing', icon: '⚙️' }
  ];

  const sidebarVariants = {
    hidden: {
      x: -320,
      opacity: 0,
      scale: 0.8,
      filter: "blur(10px)"
    },
    visible: {
      x: 0,
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 200,
        staggerChildren: 0.1
      }
    },
    exit: {
      x: -320,
      opacity: 0,
      scale: 0.8,
      filter: "blur(5px)",
      transition: {
        duration: 0.3
      }
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'control':
        return <ControlTab />;
      case 'data':
        return <DataSourcesTab />;
      case 'processing':
        return <ProcessingTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isVisible && (
          <motion.button
            onClick={() => setIsVisible(true)}
            className="absolute left-4 top-4 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 z-50 flex items-center justify-center"
            style={{
              width: '48px',
              height: '48px'
            }}
            title="Show sidebar"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            whileHover={{
              scale: 1.1,
              boxShadow: "0 10px 25px rgba(59, 130, 246, 0.4)"
            }}
            whileTap={{ scale: 0.9 }}
            transition={{
              type: "spring",
              damping: 15,
              stiffness: 400
            }}
          >
            ☰
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVisible && (
          <motion.aside
            ref={sidebarRef}
            className="absolute inset-0 w-80 bg-white/95 backdrop-blur-sm border border-gray-300 shadow-2xl z-40 rounded-2xl overflow-hidden"
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Close Button */}
            <motion.button
              onClick={() => setIsVisible(false)}
              className="absolute top-3 right-3 w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 z-50"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              ×
            </motion.button>

            {/* Drag Handle */}
            <motion.div
              className="absolute top-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gray-400 rounded-full hover:bg-gray-500 transition-colors cursor-grab"
              whileHover={{ scale: 1.2, backgroundColor: "#6b7280" }}
              whileTap={{ scale: 0.9 }}
            />

            {/* **ENHANCED: Multi-Tab Headers** */}
            <motion.div
              className="flex border-b border-gray-200 bg-gray-50/50 rounded-t-2xl mx-2 mt-6 overflow-x-auto"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {tabs.map((tab) => (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 min-w-0 px-2 py-3 text-xs font-medium transition-all duration-200 relative"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    color: activeTab === tab.id ? '#2563eb' : '#6b7280',
                    backgroundColor: activeTab === tab.id ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0)'
                  }}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-sm">{tab.icon}</span>
                    <span className="truncate">{tab.label.split(' ')[1]}</span>
                  </div>
                  {activeTab === tab.id && (
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                      layoutId="activeTab"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.button>
              ))}
            </motion.div>

            {/* **ENHANCED: Tab Content with proper categorization** */}
            <motion.div
              className="flex flex-col h-full pt-0 pb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{
                height: 'calc(100% - 80px)', // Account for larger header
                overflow: 'hidden'
              }}
            >
              <div className="flex-1 overflow-y-auto">
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
              {/* Bottom padding spacer */}
              <div className="h-4 flex-shrink-0" />
            </motion.div>

            {/* Glow effect */}
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              animate={{
                boxShadow: isVisiblegit
                  ? "0 0 30px rgba(59, 130, 246, 0.1)"
                  : "0 0 0px rgba(59, 130, 246, 0)"
              }}
              transition={{ duration: 0.5 }}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default TabbedSidebar;
