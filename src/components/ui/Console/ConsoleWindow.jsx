import React, { useState, useEffect, useRef } from 'react';

const ConsoleWindow = ({ containerRef }) => {
  const [logs, setLogs] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const logsEndRef = useRef(null);
  const logsContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
        inline: "nearest"
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  // Capture console logs
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      const timestamp = new Date().toLocaleTimeString();
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');

      setLogs(prev => [...prev.slice(-99), { // Keep last 100 logs
        id: Date.now() + Math.random(),
        timestamp,
        message,
        type: 'log',
        level: 'info'
      }]);

      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      const timestamp = new Date().toLocaleTimeString();
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');

      setLogs(prev => [...prev.slice(-99), {
        id: Date.now() + Math.random(),
        timestamp,
        message,
        type: 'error',
        level: 'error'
      }]);

      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      const timestamp = new Date().toLocaleTimeString();
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');

      setLogs(prev => [...prev.slice(-99), {
        id: Date.now() + Math.random(),
        timestamp,
        message,
        type: 'warn',
        level: 'warning'
      }]);

      originalWarn.apply(console, args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  const clearLogs = () => {
    setLogs([]);
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'log':
      default: return '📝';
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'error': return 'text-red-700 bg-red-50 border-red-200';
      case 'warn': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'log':
      default: return 'text-gray-700 bg-white border-gray-200';
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="absolute bottom-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-all duration-200 z-50"
        title="Show Console"
      >
        📟 Console
      </button>
    );
  }

  return (
    <div className={`absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm border border-gray-300 rounded-xl shadow-2xl z-40 transition-all duration-300 ${
      isExpanded ? 'h-80' : 'h-12'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50/80 rounded-t-xl">
        <div className="flex items-center space-x-2">
          <span className="text-lg">📟</span>
          <h3 className="font-semibold text-sm text-gray-800">Console</h3>
          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
            {logs.length} logs
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={clearLogs}
            className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded transition-colors"
            title="Clear logs"
          >
            Clear
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 transition-colors w-6 h-6 flex items-center justify-center"
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? '▼' : '▲'}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-700 transition-colors w-6 h-6 flex items-center justify-center"
            title="Hide console"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Console Content */}
      {isExpanded && (
        <div className="flex flex-col h-full">
          <div
            ref={logsContainerRef}
            className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/30"
            style={{
              maxHeight: 'calc(20rem - 3rem)', // 80 - header height
              scrollBehavior: 'smooth'
            }}
          >
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-8 text-sm">
                No logs yet. Execute nodes to see console output.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start space-x-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${getLogColor(log.type)}`}
                >
                  <span className="text-sm flex-shrink-0">{getLogIcon(log.type)}</span>
                  <span className="text-xs text-gray-500 min-w-20 flex-shrink-0 font-mono">
                    {log.timestamp}
                  </span>
                  <span className="flex-1 text-sm break-words font-mono leading-relaxed">
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsoleWindow;
