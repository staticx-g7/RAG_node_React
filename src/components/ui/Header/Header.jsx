import React, { useState, useRef, useEffect } from 'react';

const Header = () => {
  const [title, setTitle] = useState('My RAG');
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleTitleClick = () => {
    setIsEditing(true);
    setTempTitle(title);
  };

  const handleTitleSave = () => {
    setTitle(tempTitle.trim() || 'My RAG');
    setIsEditing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setTempTitle(title);
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    handleTitleSave();
  };

  return (
    <header
      id="main-header"
      className="relative bg-transparent"
      style={{
        background: 'transparent',
        backdropFilter: 'none',
        borderBottom: 'none',
        boxShadow: 'none',
      }}
    >
      <div className="relative z-10 p-4">
        <div className="flex items-center space-x-3 mb-2">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onKeyDown={handleKeyPress}
              onBlur={handleBlur}
              className="text-2xl font-bold bg-transparent border-b-2 border-blue-400 text-gray-800 outline-none px-2 py-1 rounded-sm"
              style={{
                background: 'transparent',
                backdropFilter: 'none',
                boxShadow: 'none',
                color: '#374151',
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
              }}
              maxLength={50}
            />
          ) : (
            <h1
              onClick={handleTitleClick}
              className="text-2xl font-bold text-gray-700 cursor-pointer hover:text-gray-900 transition-all duration-200 px-2 py-1 rounded-md group flex items-center"
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                textShadow: 'none'
              }}
              title="Click to edit title"
            >
              {title}
              <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-sm">
                ✏️
              </span>
            </h1>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
