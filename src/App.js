import React from 'react';
import Header from './components/ui/Header';
import Flowboard from './components/Flowboard';
import './App.css';

function App() {
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Header />
      <main className="flex-1 overflow-hidden">
        <Flowboard />
      </main>
    </div>
  );
}

export default App;
