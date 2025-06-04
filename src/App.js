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
        className="h-screen flex flex-col relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #f8f5f0 0%, #f0ebe3 50%, #e8ddd4 100%)'
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      >
        <Header />
        <TabbedSidebar />
        {/* CRITICAL: Remove any wrapper divs that might block events */}
        <main className="flex-1 relative z-10">
          <div className="h-full p-4">
            <Flowboard />
          </div>
        </main>
      </motion.div>
    </DnDProvider>
  );
}

export default App;
