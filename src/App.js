// App.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TabbedSidebar from './components/ui/Sidebar/TabbedSidebar';
import Flowboard from './components/Flowboard';
import Header from './components/ui/Header';
import { DnDProvider } from './contexts/DnDContext';
import { PipelineProvider } from './contexts/PipelineContext'; // Add this
import SinglePageView from './components-singlepage/SinglePageView';
import './App.css';

// Layout configuration
const LAYOUT = {
  header: { height: 72, top: 24 },
  sidebar: { width: 320, left: 24 },
  gap: 24
};

function App() {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [viewMode, setViewMode] = useState('nodes');

  const canvasPosition = {
    left: sidebarVisible ? LAYOUT.sidebar.left + LAYOUT.sidebar.width + LAYOUT.gap : LAYOUT.gap,
    top: LAYOUT.header.top + LAYOUT.header.height + LAYOUT.gap
  };

  return (
    <DnDProvider>
      <PipelineProvider> {/* Add this wrapper */}
        <div className="w-full h-screen bg-gradient-to-br from-slate-50 to-slate-100">

          {/* Header with View Switcher */}
          <div
            className="fixed bg-white/80 backdrop-blur-md border border-gray-200 shadow-lg rounded-2xl z-50 flex items-center justify-between px-6"
            style={{
              top: LAYOUT.header.top,
              left: LAYOUT.sidebar.left,
              width: `calc(100vw - ${LAYOUT.sidebar.left * 2}px)`,
              height: LAYOUT.header.height
            }}
          >
            {/* Left side */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">R</span>
                </div>
                <h1 className="text-xl font-bold text-gray-800">RAG System</h1>
              </div>
            </div>

            {/* Center - View Mode Switcher */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('nodes')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'nodes'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span>Node View</span>
                </div>
              </button>
              <button
                onClick={() => setViewMode('single')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'single'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Wiki View</span>
                </div>
              </button>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSidebarVisible(!sidebarVisible)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
                title={sidebarVisible ? "Hide Sidebar" : "Show Sidebar"}
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Sidebar - Only show in Node View */}
          <AnimatePresence>
            {sidebarVisible && viewMode === 'nodes' && (
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="fixed bg-white/80 backdrop-blur-md border border-gray-200 shadow-xl rounded-2xl z-40"
                style={{
                  top: canvasPosition.top,
                  left: LAYOUT.sidebar.left,
                  width: LAYOUT.sidebar.width,
                  height: `calc(100vh - ${canvasPosition.top + LAYOUT.gap}px)`
                }}
              >
                <TabbedSidebar />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Content Area */}
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed bg-white/60 backdrop-blur-sm border border-gray-200 shadow-lg rounded-2xl"
            style={{
              top: canvasPosition.top,
              left: viewMode === 'nodes' ? canvasPosition.left : LAYOUT.sidebar.left,
              width: viewMode === 'nodes'
                ? `calc(100vw - ${canvasPosition.left + LAYOUT.gap}px)`
                : `calc(100vw - ${LAYOUT.sidebar.left * 2}px)`,
              height: `calc(100vh - ${canvasPosition.top + LAYOUT.gap}px)`
            }}
          >
            {viewMode === 'nodes' ? <Flowboard /> : <SinglePageView />}
          </motion.div>
        </div>
      </PipelineProvider>
    </DnDProvider>
  );
}

export default App;
