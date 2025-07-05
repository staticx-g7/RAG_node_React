import React, { useState, useRef, useEffect } from 'react';

const Header = () => {
  const [title, setTitle] = useState('My RAG');
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

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

  // Export functionality
  const handleExport = () => {
    setIsExporting(true);
    // Dispatch custom event that Flowboard can listen to
    window.dispatchEvent(new CustomEvent('exportFlow'));

    // Show success message
    setTimeout(() => {
      setIsExporting(false);
      setShowExportSuccess(true);
      setTimeout(() => setShowExportSuccess(false), 3000);
    }, 500);
  };

  // Import functionality
  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsImporting(true);

    // Dispatch custom event with file data that Flowboard can listen to
    window.dispatchEvent(new CustomEvent('importFlow', {
      detail: { file }
    }));

    // Reset file input
    event.target.value = '';

    setTimeout(() => {
      setIsImporting(false);
    }, 1000);
  };

  // Clear workflow
  const handleClearWorkflow = () => {
    if (window.confirm('Are you sure you want to clear the entire workflow? This cannot be undone.')) {
      window.dispatchEvent(new CustomEvent('clearWorkflow'));
    }
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
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      <div className="relative z-10 p-4">
        <div className="flex items-center justify-between">
          {/* Left side - Title only */}
          <div className="flex items-center">
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

          {/* Right side - Export, Import, Clear buttons */}
          <div className="flex items-center space-x-3">
            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm flex items-center space-x-2 shadow-sm"
              title="Export workflow as JSON (Cmd+E)"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <span>📤</span>
                  <span>Export</span>
                </>
              )}
            </button>

            {/* Import Button */}
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm flex items-center space-x-2 shadow-sm"
              title="Import workflow from JSON (Cmd+I)"
            >
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <span>📥</span>
                  <span>Import</span>
                </>
              )}
            </button>

            {/* Clear Button */}
            <button
              onClick={handleClearWorkflow}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center space-x-2 shadow-sm"
              title="Clear entire workflow"
            >
              <span>🗑️</span>
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Success message */}
        {showExportSuccess && (
          <div className="absolute top-16 right-4 bg-green-100 text-green-800 px-3 py-2 rounded-md text-sm shadow-lg z-50">
            ✅ Workflow exported successfully!
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
