// components-singlepage/SinglePageView.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { usePipeline } from '../contexts/PipelineContext';
import OverviewSection from './sections/OverviewSection';
import GitConfigSection from './sections/GitConfigSection';
import FilterSection from './sections/FilterSection';
import ChunkSection from './sections/ChunkSection';
import VectorizeSection from './sections/VectorizeSection';
import ChatSection from './sections/ChatSection';
import ReadmeSection from './sections/ReadmeSection';

const SinglePageView = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const { state } = usePipeline();

  const sections = [
    {
      id: 'overview',
      title: 'Overview',
      icon: '📋',
      description: 'System overview and pipeline flow',
      completed: true
    },
    {
      id: 'git',
      title: 'Repository Setup',
      icon: '🔗',
      description: 'Connect to your Git repository',
      completed: state.git.isConnected,
      hasData: state.git.repoInfo !== null
    },
    {
      id: 'filter',
      title: 'File Filtering',
      icon: '🔍',
      description: 'Filter and select relevant files',
      completed: state.filter.filteredFiles.length > 0,
      hasData: state.git.isConnected,
      disabled: !state.git.isConnected
    },
    {
      id: 'chunk',
      title: 'Text Processing',
      icon: '📝',
      description: 'Break down content into chunks',
      completed: state.chunk.processedChunks.length > 0,
      hasData: state.filter.filteredFiles.length > 0,
      disabled: state.filter.filteredFiles.length === 0
    },
    {
      id: 'vectorize',
      title: 'Vectorization',
      icon: '🧮',
      description: 'Convert text to embeddings',
      completed: state.vectorize.vectors.length > 0,
      hasData: state.chunk.processedChunks.length > 0,
      disabled: state.chunk.processedChunks.length === 0
    },
    {
      id: 'chat',
      title: 'AI Chat',
      icon: '💬',
      description: 'Interact with your data',
      completed: state.chat.messages.length > 0,
      hasData: state.vectorize.vectors.length > 0,
      disabled: false // Chat can work without vectors
    },
    {
      id: 'readme',
      title: 'Documentation',
      icon: '📚',
      description: 'Generate project documentation',
      completed: state.readme.generatedReadme.length > 0,
      hasData: state.git.isConnected,
      disabled: !state.git.isConnected
    }
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'overview': return <OverviewSection />;
      case 'git': return <GitConfigSection />;
      case 'filter': return <FilterSection />;
      case 'chunk': return <ChunkSection />;
      case 'vectorize': return <VectorizeSection />;
      case 'chat': return <ChatSection />;
      case 'readme': return <ReadmeSection />;
      default: return <OverviewSection />;
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Navigation */}
      <div className="w-64 bg-white/80 backdrop-blur-sm border-r border-gray-200 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">RAG Pipeline</h3>
          <div className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => !section.disabled && setActiveSection(section.id)}
                disabled={section.disabled}
                className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-200 group ${
                  activeSection === section.id
                    ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
                    : section.disabled
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 relative">
                    <span className="text-lg">{section.icon}</span>
                    {section.completed && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{section.title}</div>
                    <div className="text-xs text-gray-500 mt-1 group-hover:text-gray-600">
                      {section.description}
                    </div>
                    {section.hasData && !section.completed && (
                      <div className="text-xs text-amber-600 mt-1">
                        Ready to configure
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderSection()}
          </motion.div>
        </div>
      </div>

      {/* Right Progress Panel */}
      <div className="w-48 bg-white/80 backdrop-blur-sm border-l border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-600 mb-3">Pipeline Progress</h4>
        <div className="space-y-2">
          {sections.map((section) => (
            <div key={section.id} className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                section.completed ? 'bg-green-500' :
                section.hasData ? 'bg-yellow-500' :
                section.disabled ? 'bg-gray-300' : 'bg-gray-400'
              }`} />
              <span className={`text-xs ${
                section.completed ? 'text-green-700' :
                section.disabled ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {section.title}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Overall Progress</div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(sections.filter(s => s.completed).length / sections.length) * 100}%`
              }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {sections.filter(s => s.completed).length} of {sections.length} completed
          </div>
        </div>
      </div>
    </div>
  );
};

export default SinglePageView;
