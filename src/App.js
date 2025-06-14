// src/App.js
import React from 'react';
import { motion } from 'framer-motion';
import Header from './components/ui/Header';
import TabbedSidebar from './components/ui/Sidebar/TabbedSidebar';
import Flowboard from './components/Flowboard';
import ChatWindow from './components/ui/ChatWindow';
import { DnDProvider } from './contexts/DnDContext';
import './App.css';

function App() {
  return (
    <DnDProvider>
      <div className="h-screen w-screen bg-gray-50 flex flex-col overflow-hidden">
        <Header />

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar container */}
          <div className="relative z-20">
            <TabbedSidebar />
          </div>

          {/* Canvas with ChatWindow INSIDE the Flowboard component */}
          <div className="flex-1 relative">
            <Flowboard />
            {/* Remove ChatWindow from here */}
          </div>
        </div>
      </div>
    </DnDProvider>
  );
}

export default App;
