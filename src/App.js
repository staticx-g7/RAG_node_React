import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TabbedSidebar from './components/ui/Sidebar/TabbedSidebar';
import Flowboard from './components/Flowboard';
import Header from './components/ui/Header';
import { DnDProvider } from './contexts/DnDContext';
import LetterGlitch from './components/ui/LetterGlitch';
import './App.css';

// Layout constants
const HEADER_HEIGHT = 72; // px
const HEADER_TOP = 24;    // px
const SIDEBAR_WIDTH = 320; // px (w-80)
const SIDEBAR_LEFT = 24;   // px (ml-6)
const GAP = 24;            // px

function App() {
  const [sidebarVisible, setSidebarVisible] = useState(true);

  // Calculate offsets
  const canvasLeft = sidebarVisible
    ? SIDEBAR_LEFT + SIDEBAR_WIDTH + GAP
    : GAP;
  const canvasTop = HEADER_TOP + HEADER_HEIGHT + GAP;

  return (
    <DnDProvider>
      <div className="w-screen h-screen relative overflow-hidden">

        {/* Animated Letter Glitch Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <LetterGlitch
            glitchColors={['#2563eb', '#60a5fa', '#a5b4fc']}
            glitchSpeed={60}
            outerVignette={true}
            centerVignette={false}
            smooth={true}
          />
        </div>

        {/* Glassmorphic Floating Header */}
        <motion.div
          className="fixed left-6 right-6 z-20"
          style={{ top: HEADER_TOP, height: HEADER_HEIGHT }}
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-white/30 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-2xl h-full flex items-center px-8">
            <Header />
          </div>
        </motion.div>

        {/* Glassmorphic Floating Sidebar */}
        <AnimatePresence>
          {sidebarVisible && (
            <motion.div
              className="fixed z-30"
              style={{
                top: canvasTop,
                left: SIDEBAR_LEFT,
                bottom: GAP,
                width: SIDEBAR_WIDTH,
              }}
              initial={{ x: -SIDEBAR_WIDTH, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -SIDEBAR_WIDTH, opacity: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 22 }}
            >
              <div className="relative h-full bg-white/20 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-2xl overflow-hidden">
                {/* X Button in top-right corner */}
                <button
                  onClick={() => setSidebarVisible(false)}
                  className="absolute top-3 right-3 z-50 p-1 rounded-full bg-white/60 hover:bg-white/80 border border-white/30 shadow transition"
                  title="Close Sidebar"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="11" stroke="#e5e7eb" strokeWidth="2" fill="#fff" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l6 6m0-6l-6 6" />
                  </svg>
                </button>
                <TabbedSidebar />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Glassmorphic Floating Canvas */}
        <motion.div
          className="fixed z-10 transition-all duration-300"
          style={{
            top: canvasTop,
            left: canvasLeft,
            right: GAP,
            bottom: GAP,
            minWidth: 300,
            minHeight: 200,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div className="w-full h-full bg-white/30 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-2xl overflow-hidden">
            <Flowboard />
          </div>
        </motion.div>

        {/* Hamburger: Rendered LAST with z-50 so always on top */}
        {!sidebarVisible && (
          <button
            onClick={() => setSidebarVisible(true)}
            className="fixed z-50"
            style={{ top: canvasTop, left: SIDEBAR_LEFT }}
            title="Open Sidebar"
            aria-label="Open sidebar"
          >
            <div className="w-12 h-12 bg-white/30 backdrop-blur-2xl border border-white/30 shadow-xl rounded-2xl flex items-center justify-center transition hover:bg-white/50 group">
              <div className="flex flex-col items-center justify-center w-7 h-7 gap-[5px]">
                <span className="block w-7 h-1 rounded-full bg-blue-600 transition-all duration-300 group-hover:translate-y-[3px] group-hover:rotate-6"></span>
                <span className="block w-7 h-1 rounded-full bg-blue-600 transition-all duration-300 group-hover:scale-x-75"></span>
                <span className="block w-7 h-1 rounded-full bg-blue-600 transition-all duration-300 group-hover:-translate-y-[3px] group-hover:-rotate-6"></span>
              </div>
            </div>
          </button>
        )}
      </div>
    </DnDProvider>
  );
}

export default App;
