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

  // Animation variants for console window
  const consoleVariants = {
    hidden: {
      opacity: 0,
      y: 100,
      scale: 0.8,
      filter: "blur(10px)"
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 300,
        duration: 0.6
      }
    },
    exit: {
      opacity: 0,
      y: 50,
      scale: 0.9,
      filter: "blur(5px)",
      transition: {
        duration: 0.3
      }
    }
  };

  // Animation variants for log entries
  const logVariants = {
    hidden: {
      opacity: 0,
      x: -50,
      scale: 0.8
    },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 500,
        duration: 0.4
      }
    },
    exit: {
      opacity: 0,
      x: 50,
      scale: 0.8,
      transition: {
        duration: 0.2
      }
    }
  };

  // Animation variants for header
  const headerVariants = {
    collapsed: {
      backgroundColor: "rgba(249, 250, 251, 0.9)",
      borderRadius: "12px"
    },
    expanded: {
      backgroundColor: "rgba(249, 250, 251, 0.8)",
      borderRadius: "12px 12px 0 0"
    }
  };

  if (!isVisible) {
    return (
      <motion.button
        onClick={() => setIsVisible(true)}
        className="absolute bottom-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-all duration-200 z-50"
        title="Show Console"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        whileHover={{
          scale: 1.1,
          boxShadow: "0 10px 25px rgba(59, 130, 246, 0.4)"
        }}
        whileTap={{ scale: 0.95 }}
        transition={{
          type: "spring",
          damping: 15,
          stiffness: 400
        }}
      >
        📟 Console
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        className={`absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm border border-gray-300 rounded-xl shadow-2xl z-40 overflow-hidden ${
          isExpanded ? 'h-80' : 'h-12'
        }`}
        variants={consoleVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        layout
      >
        {/* Animated Header */}
        <motion.div
          className="flex items-center justify-between p-3 border-b border-gray-200"
          variants={headerVariants}
          animate={isExpanded ? "expanded" : "collapsed"}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="flex items-center space-x-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.span
              className="text-lg"
              animate={{
                rotate: logs.length > 0 ? [0, 10, -10, 0] : 0
              }}
              transition={{
                duration: 0.5,
                repeat: logs.length > 0 ? 1 : 0
              }}
            >
              📟
            </motion.span>
            <h3 className="font-semibold text-sm text-gray-800">Console</h3>
            <motion.span
              className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full"
              key={logs.length}
              initial={{ scale: 1.2, backgroundColor: "#3b82f6" }}
              animate={{ scale: 1, backgroundColor: "#e5e7eb" }}
              transition={{ duration: 0.3 }}
            >
              {logs.length} logs
            </motion.span>
          </motion.div>

          <motion.div
            className="flex items-center space-x-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
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
              transition={{ duration: 0.3 }}
            >
              ▼
            </motion.button>
            <motion.button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700 transition-colors w-6 h-6 flex items-center justify-center"
              title="Hide console"
              whileHover={{
                scale: 1.1,
                rotate: 90,
                color: "#ef4444"
              }}
              whileTap={{ scale: 0.9 }}
            >
              ✕
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Animated Console Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className="flex flex-col h-full"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div
                ref={logsContainerRef}
                className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50/30"
                style={{
                  maxHeight: 'calc(20rem - 3rem)',
                  scrollBehavior: 'smooth'
                }}
              >
                {logs.length === 0 ? (
                  <motion.div
                    className="text-gray-500 text-center py-8 text-sm"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
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
                          scale: 1.02,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                        }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <motion.span
                          className="text-sm flex-shrink-0"
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.1 }}
                        >
                          {getLogIcon(log.type)}
                        </motion.span>
                        <motion.span
                          className="text-xs text-gray-500 min-w-20 flex-shrink-0 font-mono"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          {log.timestamp}
                        </motion.span>
                        <motion.span
                          className="flex-1 text-sm break-words font-mono leading-relaxed"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
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

        {/* Animated border glow effect */}
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          animate={{
            boxShadow: logs.length > 0
              ? "0 0 20px rgba(59, 130, 246, 0.3)"
              : "0 0 0px rgba(59, 130, 246, 0)"
          }}
          transition={{ duration: 0.5 }}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default ConsoleWindow;
