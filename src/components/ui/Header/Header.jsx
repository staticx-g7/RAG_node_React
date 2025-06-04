import React from 'react';

const Header = () => {
  return (
    <header className="bg-blue-600 text-white p-4 shadow-lg">
      <h1 className="text-2xl font-bold mb-2">React Flow Board</h1>
      <p className="text-sm opacity-90">
        Double-click to add nodes • Drag from handles to connect • Drop connections on empty space to create new nodes
      </p>
    </header>
  );
};

export default Header;
