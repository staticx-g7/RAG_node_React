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
  </div>
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
            draggable={true}
            onDragStart={(event) => onDragStart(event, node.type)}
            onDragEnd={onDragEnd}
            style={{ userSelect: 'none' }}
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
  const [activeTab, setActiveTab] = useState('nodes'); // Start with nodes tab
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(80);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const detectHeaderHeight = () => {
      const header = document.querySelector('header');
      if (header) {
        const height = header.getBoundingClientRect().height;
        setHeaderHeight(height);
        console.log('📏 Header height detected:', height);
      }
    };

    detectHeaderHeight();
    window.addEventListener('resize', detectHeaderHeight);

    return () => {
      window.removeEventListener('resize', detectHeaderHeight);
    };
  }, []);

  return (
    <>
      {!isVisible && (
        <button
          onClick={() => setIsVisible(true)}
          className="fixed left-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:scale-110 transition-all duration-300 z-50 flex items-center justify-center"
          style={{
            top: `${headerHeight + 16}px`,
            width: '48px',
            height: '48px'
          }}
        >
          ☰
        </button>
      )}

      <aside
        className={`fixed left-0 bg-white/95 backdrop-blur-sm border-r border-gray-200 shadow-2xl z-40 transition-all duration-300 ease-in-out rounded-tr-xl ${
          isCollapsed ? 'w-12' : 'w-80'
        } ${isVisible ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          top: `${headerHeight}px`,
          height: `calc(100vh - ${headerHeight}px)`
        }}
      >
        <div className="absolute -right-3 top-4 flex flex-col space-y-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 hover:scale-110 transition-all duration-200 z-10"
          >
            {isCollapsed ? '→' : '←'}
          </button>

          <button
            onClick={() => setIsVisible(false)}
            className="w-6 h-6 bg-gray-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-700 hover:scale-110 transition-all duration-200 z-10"
          >
            ✕
          </button>
        </div>

        {!isCollapsed && (
          <>
            <div className="flex border-b border-gray-200 bg-gray-50/50 rounded-tr-xl">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  activeTab === 'overview'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                📋 Overview
              </button>
              <button
                onClick={() => setActiveTab('nodes')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  activeTab === 'nodes'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                🧩 Nodes
              </button>
            </div>

            <div className="h-full overflow-y-auto pb-16">
              {activeTab === 'overview' ? <OverviewTab /> : <NodesTab />}
            </div>
          </>
        )}
      </aside>
      {isVisible && !isCollapsed && (
        <div
          className="fixed inset-0 bg-black/10 z-30 transition-opacity duration-300"
          onClick={() => setIsVisible(false)}
          style={{
            top: `${headerHeight}px`,
            pointerEvents: 'none' // CRITICAL: Allow drag events to pass through
          }}
        />
      )}
    </>
  );
};

export default TabbedSidebar;
