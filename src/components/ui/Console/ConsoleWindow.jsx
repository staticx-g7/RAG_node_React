import React, { useState, useEffect, useRef } from 'react';

const ConsoleWindow = ({ containerRef }) => {
  const [logs, setLogs] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const logsEndRef = useRef(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
      case 'error': return 'text-red-600 bg-red-50';
      case 'warn': return 'text-yellow-600 bg-yellow-50';
      case 'log':
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="absolute bottom-4 right-4 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-gray-700 transition-all duration-200 z-50"
        title="Show Console"
      >
        📟 Console
      </button>
    );
  }

  return (
    <div className={`absolute bottom-4 left-4 right-4 bg-gray-900/95 backdrop-blur-sm text-white rounded-xl shadow-2xl z-40 transition-all duration-300 ${
      isExpanded ? 'h-80' : 'h-12'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <span className="text-lg">📟</span>
          <h3 className="font-semibold text-sm">Console</h3>
          <span className="text-xs text-gray-400">({logs.length} logs)</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={clearLogs}
            className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded transition-colors"
            title="Clear logs"
          >
            Clear
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-white transition-colors"
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? '▼' : '▲'}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white transition-colors"
            title="Hide console"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Console Content */}
      {isExpanded && (
        <div className="h-full overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No logs yet. Execute nodes to see console output.
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start space-x-2 p-2 rounded ${getLogColor(log.type)} border-l-4 ${
                    log.type === 'error' ? 'border-red-500' :
                    log.type === 'warn' ? 'border-yellow-500' : 'border-blue-500'
                  }`}
                >
                  <span className="text-xs">{getLogIcon(log.type)}</span>
                  <span className="text-xs text-gray-500 min-w-20">{log.timestamp}</span>
                  <span className="flex-1 text-sm break-words">{log.message}</span>
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
