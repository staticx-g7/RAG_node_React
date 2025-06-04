import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

  // Capture console logs for your development workflow[4]
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      const timestamp = new Date().toLocaleTimeString();
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');

      setLogs(prev => [...prev.slice(-99), {
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

  // Optimized animation variants for better performance[3]
  const consoleVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "tween",
        duration: 0.3,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      y: 10,
      scale: 0.98,
      transition: {
        duration: 0.2,
        ease: "easeIn"
      }
    }
  };

  // Subtle log entry animations
  const logVariants = {
    hidden: {
      opacity: 0,
      y: 10
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "tween",
        duration: 0.2,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      y: -5,
      transition: {
        duration: 0.15
      }
    }
  };

  if (!isVisible) {
    return (
      <motion.button
        onClick={() => setIsVisible(true)}
        className="absolute bottom-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-all duration-200 z-50"
        title="Show Console"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        📟 Console
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm border border-gray-300 rounded-xl shadow-2xl z-50 overflow-hidden"
        variants={consoleVariants}
        initial="hidden"
        // FIXED: Combine both animate properties into one
        animate={{
          ...consoleVariants.visible,
          height: isExpanded ? '320px' : '48px'
        }}
        exit="exit"
        transition={{
          height: { duration: 0.3, ease: "easeInOut" },
          ...consoleVariants.visible.transition
        }}
      >
        {/* Optimized Header for your UI implementation preferences[2] */}
        <motion.div
          className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50/80 rounded-t-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <motion.div
            className="flex items-center space-x-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <span className="text-lg">📟</span>
            <h3 className="font-semibold text-sm text-gray-800">Console</h3>
            <motion.span
              className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full"
              key={logs.length}
              animate={{
                backgroundColor: logs.length > 0 ? ["#e5e7eb", "#dbeafe", "#e5e7eb"] : "#e5e7eb"
              }}
              transition={{ duration: 0.5 }}
            >
              {logs.length} logs
            </motion.span>
          </motion.div>

          <motion.div
            className="flex items-center space-x-2"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.button
              onClick={clearLogs}
              className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded transition-colors"
              title="Clear logs"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Clear
            </motion.button>
            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 hover:text-gray-700 transition-colors w-6 h-6 flex items-center justify-center"
              title={isExpanded ? 'Minimize' : 'Expand'}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              animate={{ rotate: isExpanded ? 0 : 180 }}
              transition={{ duration: 0.2 }}
            >
              ▼
            </motion.button>
            <motion.button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700 transition-colors w-6 h-6 flex items-center justify-center"
              title="Hide console"
              whileHover={{ scale: 1.1, color: "#ef4444" }}
              whileTap={{ scale: 0.9 }}
            >
              ✕
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Console Content with fixed height to prevent stretching */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className="flex flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ height: '272px' }}
            >
              <div
                ref={logsContainerRef}
                className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/30"
                style={{ scrollBehavior: 'smooth' }}
              >
                {logs.length === 0 ? (
                  <motion.div
                    className="text-gray-500 text-center py-8 text-sm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <motion.div
                      animate={{
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      No logs yet. Execute nodes to see console output.
                    </motion.div>
                  </motion.div>
                ) : (
                  <AnimatePresence>
                    {logs.map((log, index) => (
                      <motion.div
                        key={log.id}
                        className={`flex items-start space-x-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${getLogColor(log.type)}`}
                        variants={logVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        whileHover={{
                          scale: 1.01,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                        }}
                        transition={{ delay: index * 0.02 }}
                      >
                        <motion.span
                          className="text-sm flex-shrink-0"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.05 }}
                        >
                          {getLogIcon(log.type)}
                        </motion.span>
                        <span className="text-xs text-gray-500 min-w-20 flex-shrink-0 font-mono">
                          {log.timestamp}
                        </span>
                        <motion.span
                          className="flex-1 text-sm break-words font-mono leading-relaxed"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.1 }}
                        >
                          {log.message}
                        </motion.span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
                <div ref={logsEndRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subtle glow effect */}
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          animate={{
            boxShadow: logs.length > 0
              ? "0 0 20px rgba(59, 130, 246, 0.1)"
              : "0 0 0px rgba(59, 130, 246, 0)"
          }}
          transition={{ duration: 0.5 }}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default ConsoleWindow;
