import React, { useState } from 'react';
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

  return (
    <aside className="w-80 bg-white/95 backdrop-blur-sm border-r border-gray-200 shadow-xl rounded-r-2xl">
      {/* Tab Headers */}
      <div className="flex border-b border-gray-200 bg-gray-50/50 rounded-tr-2xl">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
            activeTab === 'overview'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          📋 Overview
        </button>
        <button
          onClick={() => setActiveTab('nodes')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
            activeTab === 'nodes'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          🧩 Nodes
        </button>
      </div>

            {/* Tab Content */}
            <div className="h-full overflow-y-auto">
              {activeTab === 'overview' ? <OverviewTab /> : <NodesTab />}
            </div>
          </aside>
        );
      };

      export default TabbedSidebar;
