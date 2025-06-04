import React, { useState, useEffect, useRef } from 'react';
import { useDnD } from '../../../contexts/DnDContext';

const OverviewTab = () => (
  <div className="p-4 space-y-4">
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
      <h3 className="text-lg font-semibold text-blue-800 mb-2">Welcome to React Flow Board</h3>
      <p className="text-sm text-blue-700">
        Build powerful workflows with our intuitive drag-and-drop interface.
      </p>
    </div>

    <div className="space-y-3">
      <h4 className="font-medium text-gray-800">Getting Started</h4>
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-start space-x-2">
          <span className="text-blue-500 font-bold">1.</span>
          <span>Switch to the "Nodes" tab to access the node library</span>
        </div>
        <div className="flex items-start space-x-2">
          <span className="text-blue-500 font-bold">2.</span>
          <span>Drag nodes from the sidebar to the canvas</span>
        </div>
        <div className="flex items-start space-x-2">
          <span className="text-blue-500 font-bold">3.</span>
          <span>Connect nodes by dragging from the handles</span>
        </div>
        <div className="flex items-start space-x-2">
          <span className="text-blue-500 font-bold">4.</span>
          <span>Hover over connections to delete them</span>
        </div>
      </div>
    </div>

    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
      <h4 className="font-medium text-amber-800 mb-2">💡 Pro Tips</h4>
      <ul className="text-xs text-amber-700 space-y-1">
        <li>• Double-click the canvas to quickly add nodes</li>
        <li>• Use the minimap for easy navigation</li>
        <li>• Select multiple items with Shift+Click</li>
        <li>• Press Delete to remove selected items</li>
      </ul>
    </div>

    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
      <h4 className="font-medium text-green-800 mb-2">📊 Features</h4>
      <ul className="text-xs text-green-700 space-y-1">
        <li>• Infinite canvas with zoom & pan</li>
        <li>• Multiple node types available</li>
        <li>• Real-time connection management</li>
        <li>• Responsive design</li>
      </ul>
    </div>
  </div>
);

const NodesTab = () => {
  const [, setType] = useDnD();

  const onDragStart = (event, nodeType) => {
    setType(nodeType);
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
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
    {
      type: 'decision',
      label: 'Decision Node',
      icon: '🔀',
      color: 'bg-gradient-to-r from-yellow-100 to-amber-100 border-yellow-300 text-yellow-800',
      description: 'Make decisions'
    },
    {
      type: 'database',
      label: 'Database Node',
      icon: '🗄️',
      color: 'bg-gradient-to-r from-purple-100 to-violet-100 border-purple-300 text-purple-800',
      description: 'Store or retrieve data'
    },
    {
      type: 'api',
      label: 'API Node',
      icon: '🌐',
      color: 'bg-gradient-to-r from-indigo-100 to-blue-100 border-indigo-300 text-indigo-800',
      description: 'External API calls'
    }
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Node Library</h3>
        <p className="text-sm text-gray-600">
          Drag nodes to the canvas to build your workflow
        </p>
      </div>

      <div className="space-y-3">
        {nodeTypes.map((node) => (
          <div
            key={node.type}
            className={`${node.color} border-2 border-dashed rounded-xl p-3 cursor-grab active:cursor-grabbing hover:shadow-lg transition-all duration-200 hover:scale-105 hover:-translate-y-1`}
            onDragStart={(event) => onDragStart(event, node.type)}
            draggable
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{node.icon}</span>
              <div className="flex-1">
                <div className="font-medium text-sm">{node.label}</div>
                <div className="text-xs opacity-75">{node.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const TabbedSidebar = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(80);
  const [isVisible, setIsVisible] = useState(true);
  const sidebarRef = useRef(null);

  // Dynamic header height detection
  useEffect(() => {
    const detectHeaderHeight = () => {
      const header = document.querySelector('header');
      if (header) {
        const height = header.getBoundingClientRect().height;
        setHeaderHeight(height);
      }
    };

    // Initial detection
    detectHeaderHeight();

    // Re-detect on window resize
    const handleResize = () => {
      detectHeaderHeight();
    };

    window.addEventListener('resize', handleResize);

    // Use ResizeObserver for more accurate header size changes
    const header = document.querySelector('header');
    let resizeObserver;

    if (header && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        detectHeaderHeight();
      });
      resizeObserver.observe(header);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  // Enhanced hover effects for interactive elements
  const handleMouseEnter = (e) => {
    e.target.style.transform = 'scale(1.02)';
  };

  const handleMouseLeave = (e) => {
    e.target.style.transform = 'scale(1)';
  };

  return (
    <>
      {/* Floating Toggle Button when sidebar is hidden */}
      {!isVisible && (
        <button
          onClick={() => setIsVisible(true)}
          className="fixed left-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:scale-110 transition-all duration-300 z-50 flex items-center justify-center"
          style={{
            top: `${headerHeight + 16}px`,
            width: '48px',
            height: '48px'
          }}
          title="Open sidebar"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          ☰
        </button>
      )}

      {/* Main Sidebar */}
      <aside
        ref={sidebarRef}
        className={`fixed left-0 bg-white/95 backdrop-blur-sm border-r border-gray-200 shadow-2xl z-40 transition-all duration-300 ease-in-out rounded-tr-xl ${
          isCollapsed ? 'w-12' : 'w-80'
        } ${isVisible ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          top: `${headerHeight}px`,
          height: `calc(100vh - ${headerHeight}px)`
        }}
      >
        {/* Control Buttons */}
        <div className="absolute -right-3 top-4 flex flex-col space-y-2">
          {/* Collapse/Expand Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 hover:scale-110 transition-all duration-200 z-10"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? '→' : '←'}
          </button>

          {/* Hide Button */}
          <button
            onClick={() => setIsVisible(false)}
            className="w-6 h-6 bg-gray-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-700 hover:scale-110 transition-all duration-200 z-10"
            title="Hide sidebar"
          >
            ✕
          </button>
        </div>

        {/* Sidebar Content */}
        {!isCollapsed && (
          <>
            {/* Tab Headers with enhanced hover effects */}
            <div className="flex border-b border-gray-200 bg-gray-50/50 rounded-tr-xl">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 hover:scale-105 ${
                  activeTab === 'overview'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
                onMouseEnter={(e) => {
                  if (activeTab !== 'overview') {
                    e.target.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                📋 Overview
              </button>
              <button
                onClick={() => setActiveTab('nodes')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 hover:scale-105 ${
                  activeTab === 'nodes'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
                onMouseEnter={(e) => {
                  if (activeTab !== 'nodes') {
                    e.target.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                🧩 Nodes
              </button>
            </div>

            {/* Tab Content with smooth transitions */}
            <div className="h-full overflow-y-auto pb-16">
              <div className={`transition-opacity duration-300 ${activeTab === 'overview' ? 'opacity-100' : 'opacity-0 hidden'}`}>
                {activeTab === 'overview' && <OverviewTab />}
              </div>
              <div className={`transition-opacity duration-300 ${activeTab === 'nodes' ? 'opacity-100' : 'opacity-0 hidden'}`}>
                {activeTab === 'nodes' && <NodesTab />}
              </div>
            </div>
          </>
        )}

        {/* Collapsed State with enhanced icons */}
        {isCollapsed && (
          <div className="flex flex-col items-center pt-4 space-y-4">
            <button
              onClick={() => {
                setIsCollapsed(false);
                setActiveTab('overview');
              }}
              className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center hover:bg-blue-200 hover:scale-110 transition-all duration-200"
              title="Overview"
            >
              <span className="text-blue-600 text-sm">📋</span>
            </button>
            <button
              onClick={() => {
                setIsCollapsed(false);
                setActiveTab('nodes');
              }}
              className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 hover:scale-110 transition-all duration-200"
              title="Nodes"
            >
              <span className="text-gray-600 text-sm">🧩</span>
            </button>
          </div>
        )}
      </aside>

      {/* Backdrop overlay with smooth fade */}
      {isVisible && !isCollapsed && (
        <div
          className="fixed inset-0 bg-black/10 z-30 transition-opacity duration-300"
          onClick={() => setIsVisible(false)}
          style={{ top: `${headerHeight}px` }}
        />
      )}
    </>
  );
};

export default TabbedSidebar;
