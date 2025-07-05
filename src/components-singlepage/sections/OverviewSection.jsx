// components-singlepage/sections/OverviewSection.jsx
import React from 'react';

const OverviewSection = () => {
  return (
    <div className="prose max-w-none">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">RAG System Overview</h1>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-blue-800 font-medium">
              This RAG (Retrieval-Augmented Generation) system processes repository data through a pipeline
              of connected components to enable intelligent document search and AI-powered conversations.
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Pipeline Flow</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {[
          { icon: '🔗', title: 'Data Ingestion', desc: 'Connect to repositories and fetch source code files' },
          { icon: '🔍', title: 'Content Filtering', desc: 'Filter files by type, size, and relevance' },
          { icon: '📝', title: 'Text Processing', desc: 'Chunk documents into manageable pieces' },
          { icon: '🧮', title: 'Vectorization', desc: 'Convert text to embeddings for semantic search' }
        ].map((item, index) => (
          <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
        <h3 className="font-semibold text-amber-800 mb-2">💡 Getting Started</h3>
        <p className="text-amber-700 text-sm">
          Start by configuring your repository connection in the "Repository Setup" section,
          then work through each step of the pipeline to build your RAG system.
        </p>
      </div>
    </div>
  );
};

export default OverviewSection;
