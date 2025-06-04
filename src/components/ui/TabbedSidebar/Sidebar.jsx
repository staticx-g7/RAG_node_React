import React from 'react';
import { useDnD } from '../../../contexts/DnDContext';

const Sidebar = () => {
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
      color: 'bg-green-100 border-green-300 text-green-800',
      description: 'Start your workflow'
    },
    {
      type: 'default',
      label: 'Process Node',
      icon: '⚙️',
      color: 'bg-blue-100 border-blue-300 text-blue-800',
      description: 'Process data'
    },
    {
      type: 'output',
      label: 'Output Node',
      icon: '📤',
      color: 'bg-red-100 border-red-300 text-red-800',
      description: 'End your workflow'
    },
    {
      type: 'decision',
      label: 'Decision Node',
      icon: '🔀',
      color: 'bg-yellow-100 border-yellow-300 text-yellow-800',
      description: 'Make decisions'
    },
    {
      type: 'database',
      label: 'Database Node',
      icon: '🗄️',
      color: 'bg-purple-100 border-purple-300 text-purple-800',
      description: 'Store or retrieve data'
    },
    {
      type: 'api',
      label: 'API Node',
      icon: '🌐',
      color: 'bg-indigo-100 border-indigo-300 text-indigo-800',
      description: 'External API calls'
    }
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-4 shadow-lg">
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
            className={`${node.color} border-2 border-dashed rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 hover:scale-105`}
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

      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-sm text-gray-700 mb-2">Instructions</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Drag nodes to canvas</li>
          <li>• Double-click canvas to add nodes</li>
          <li>• Connect nodes by dragging handles</li>
          <li>• Hover edges to delete connections</li>
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
