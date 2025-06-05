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
      <h3 className="text-lg font-semibold text-blue-800 mb-2">Welcome to React Flow Board</h3>
      <p className="text-sm text-blue-700">
        Build powerful workflows with our intuitive drag-and-drop interface.
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
      <h4 className="font-medium text-gray-800">Getting Started</h4>
      <div className="space-y-2 text-sm text-gray-600">
        {[
          'Switch to the "Nodes" tab to access the node library',
          'Drag nodes from the sidebar to the canvas',
          'Connect nodes by dragging from the handles',
          'Hover over connections to delete them'
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
        <li>• Double-click the canvas to quickly add nodes</li>
        <li>• Use the minimap for easy navigation</li>
        <li>• Select multiple items with Shift+Click</li>
        <li>• Press Delete to remove selected items</li>
      </ul>
    </motion.div>

    <motion.div
      className="bg-green-50 rounded-lg p-3 border border-green-200"
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <h4 className="font-medium text-green-800 mb-2">📊 Features</h4>
      <ul className="text-xs text-green-700 space-y-1">
        <li>• Infinite canvas with zoom & pan</li>
        <li>• Multiple node types available</li>
        <li>• Real-time connection management</li>
        <li>• Responsive design</li>
      </ul>
    </motion.div>
  </motion.div>
);

const NodesTab = () => {
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

  const nodeTypes = [
  {
    type: 'input',
    label: 'Input Node',
    icon: '📥',
    color: 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-300 text-green-800',
    description: 'Start your workflow'
  },
  {
    type: 'text',
    label: 'Text Node',
    icon: '📝',
    color: 'bg-gradient-to-r from-indigo-100 to-blue-100 border-indigo-300 text-indigo-800',
    description: 'Provide text input data'
  },
  {
    type: 'execute',
    label: 'Execute Node',
    icon: '▶️',
    color: 'bg-gradient-to-r from-purple-100 to-violet-100 border-purple-300 text-purple-800',
    description: 'Execute connected nodes'
  },
  {
  type: 'git',
  label: 'Git Node',
  icon: '🐙',
  color: 'bg-gradient-to-r from-gray-100 to-slate-100 border-gray-300 text-gray-800',
  description: 'Fetch repository contents'
  },
  {
    type: 'default',
    label: 'Process Node',
    icon: '⚙️',
    color: 'bg-gradient-to-r from-blue-100 to-cyan-100 border-blue-300 text-blue-800',
    description: 'Process data'
  },
  {
    type: 'output',
    label: 'Output Node',
    icon: '📤',
    color: 'bg-gradient-to-r from-red-100 to-rose-100 border-red-300 text-red-800',
    description: 'End your workflow'
  },
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
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Node Library</h3>
        <p className="text-sm text-gray-600">
          Drag nodes to the canvas to build your workflow
        </p>
      </motion.div>

      <motion.div
        className="space-y-3"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
        }}
        initial="hidden"
        animate="visible"
      >
        {nodeTypes.map((node, index) => (
          <motion.div
            key={node.type}
            className={`${node.color} border-2 border-dashed rounded-xl p-3 cursor-grab active:cursor-grabbing transition-colors duration-150`}
            draggable={true}
            onDragStart={(event) => onDragStart(event, node.type)}
            onDragEnd={onDragEnd}
            style={{ userSelect: 'none' }}
            variants={{
              hidden: { opacity: 0, y: 20, scale: 0.9 },
              visible: { opacity: 1, y: 0, scale: 1 }
            }}
            // OPTIMIZED: Faster, more responsive hover animations
            whileHover={{
              scale: 1.03,
              y: -3,
              boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
              transition: {
                type: "tween",
                duration: 0.15, // Much faster response
                ease: "easeOut"
              }
            }}
            whileTap={{
              scale: 0.98,
              transition: { duration: 0.1 }
            }}
            whileDrag={{
              scale: 1.08,
              rotate: 2,
              zIndex: 1000,
              boxShadow: "0 15px 30px rgba(0,0,0,0.2)",
              transition: { duration: 0.1 }
            }}
            transition={{
              delay: index * 0.03, // Faster stagger
              type: "tween",
              duration: 0.2
            }}
          >
            <div className="flex items-center space-x-3">
              <motion.span
                className="text-2xl"
                whileHover={{
                  scale: 1.15,
                  rotate: 8,
                  transition: {
                    type: "spring",
                    stiffness: 600, // Higher stiffness for snappier response
                    damping: 15,
                    duration: 0.2
                  }
                }}
              >
                {node.icon}
              </motion.span>
              <div className="flex-1">
                <motion.div
                  className="font-medium text-sm"
                  whileHover={{
                    x: 2,
                    transition: { duration: 0.15 }
                  }}
                >
                  {node.label}
                </motion.div>
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
  const [activeTab, setActiveTab] = useState('nodes');
  const [isVisible, setIsVisible] = useState(true);
  const sidebarRef = useRef(null);

  // Simplified height calculation
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
            {/* Drag Handle */}
            <motion.div
              className="absolute top-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gray-400 rounded-full hover:bg-gray-500 transition-colors cursor-grab"
              whileHover={{ scale: 1.2, backgroundColor: "#6b7280" }}
              whileTap={{ scale: 0.9 }}
            />

            {/* Tab Headers */}
            <motion.div
              className="flex border-b border-gray-200 bg-gray-50/50 rounded-t-2xl mx-2 mt-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <motion.button
                onClick={() => setActiveTab('overview')}
                className="flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 relative rounded-tl-2xl"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  color: activeTab === 'overview' ? '#2563eb' : '#6b7280',
                  backgroundColor: activeTab === 'overview' ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0)'
                }}
              >
                📋 Overview
                {activeTab === 'overview' && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                    layoutId="activeTab"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
              <motion.button
                onClick={() => setActiveTab('nodes')}
                className="flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 relative rounded-tr-2xl"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  color: activeTab === 'nodes' ? '#2563eb' : '#6b7280',
                  backgroundColor: activeTab === 'nodes' ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0)'
                }}
              >
                🧩 Nodes
                {activeTab === 'nodes' && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                    layoutId="activeTab"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            </motion.div>

            {/* FIXED: Tab Content with proper height and bottom padding */}
            <motion.div
              className="flex flex-col h-full pt-0 pb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{
                height: 'calc(100% - 60px)', // Account for header height
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
                    {activeTab === 'overview' ? <OverviewTab /> : <NodesTab />}
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
                boxShadow: isVisible
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