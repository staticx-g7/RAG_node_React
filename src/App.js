import React from 'react';
import Header from './components/ui/Header';
// Import directly from the file instead of using index.js
import TabbedSidebar from './components/ui/Sidebar/TabbedSidebar';
import Flowboard from './components/Flowboard';
import { DnDProvider } from './contexts/DnDContext';
import './App.css';

function App() {
  return (
    <DnDProvider>
      <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <TabbedSidebar />
          <main className="flex-1 p-4">
            <div className="h-full rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <Flowboard />
            </div>
          </main>
        </div>
      </div>
    </DnDProvider>
  );
}

export default App;
