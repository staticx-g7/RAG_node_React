import React from 'react';
import Header from './components/ui/Header';
import Sidebar from './components/ui/Sidebar';
import Flowboard from './components/Flowboard';
import { DnDProvider } from './contexts/DnDContext';
import './App.css';

function App() {
  return (
    <DnDProvider>
      <div className="h-screen flex flex-col bg-gray-100">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1">
            <Flowboard />
          </main>
        </div>
      </div>
    </DnDProvider>
  );
}

export default App;
