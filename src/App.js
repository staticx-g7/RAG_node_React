import React from 'react';
import { motion } from 'framer-motion';
import Header from './components/ui/Header';
import TabbedSidebar from './components/ui/Sidebar/TabbedSidebar';
import Flowboard from './components/Flowboard';
import { DnDProvider } from './contexts/DnDContext';
import './App.css';

function App() {
  return (
    <DnDProvider>
      <motion.div
        className="h-screen flex flex-col"
        style={{
          background: 'linear-gradient(135deg, #f8f5f0 0%, #f0ebe3 50%, #e8ddd4 100%)'
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      >
        <Header />
        {/* Fixed: Use flex with consistent height for both sidebar and canvas */}
        <div className="flex flex-1 gap-3 p-4 min-h-0">
          {/* Sidebar container with exact height matching */}
          <div className="relative flex flex-col" style={{ width: '320px' }}>
            <div className="flex-1 min-h-0">
              <TabbedSidebar />
            </div>
          </div>
          {/* Canvas with matching flex height */}
          <main className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 min-h-0">
              <Flowboard />
            </div>
          </main>
        </div>
      </motion.div>
    </DnDProvider>
  );
}

export default App;
