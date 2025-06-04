import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Handle, Position, useReactFlow } from '@xyflow/react';

const TextNode = ({ id, data, isConnectable, selected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(data?.value || '');
  const [inputType, setInputType] = useState(data?.inputType || 'text');
  const [label, setLabel] = useState(data?.label || 'Text Input');
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const { setNodes } = useReactFlow();

  const handleDelete = (e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('deleteNode', { detail: { id } }));
  };

  // Update node data when input changes
  useEffect(() => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              value: inputValue,
              inputType: inputType,
              label: label,
              lastUpdated: new Date().toISOString()
            }
          };
        }
        return node;
      })
    );
  }, [inputValue, inputType, label, id, setNodes]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    console.log(`📝 TextNode ${id}: Updated value to "${newValue}"`);
  };

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setInputType(newType);
    setShowPassword(false); // Reset password visibility
    console.log(`🔧 TextNode ${id}: Changed type to ${newType}`);
  };

  const handleLabelChange = (e) => {
    setLabel(e.target.value);
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e) => {
    // Prevent React Flow from handling keyboard events when typing in input
    e.stopPropagation();
  };
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getInputTypeIcon = (type) => {
    switch (type) {
      case 'number': return '🔢';
      case 'password': return '🔐';
      case 'email': return '📧';
      case 'url': return '🔗';
      case 'api-key': return '🗝️';
      case 'json': return '📋';
      default: return '📝';
    }
  };

  const getInputTypeColor = (type) => {
    switch (type) {
      case 'number': return 'from-blue-100 to-blue-200 border-blue-300';
      case 'password': return 'from-red-100 to-red-200 border-red-300';
      case 'email': return 'from-green-100 to-green-200 border-green-300';
      case 'url': return 'from-purple-100 to-purple-200 border-purple-300';
      case 'api-key': return 'from-yellow-100 to-yellow-200 border-yellow-300';
      case 'json': return 'from-gray-100 to-gray-200 border-gray-300';
      default: return 'from-indigo-100 to-indigo-200 border-indigo-300';
    }
  };

  const getValidationStatus = () => {
  if (!inputValue) return null;

  switch (inputType) {
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputValue);
    case 'url':
      // More flexible URL validation - allows URLs with or without protocol
      return /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(inputValue) ||
             /^(https?:\/\/)?([a-zA-Z0-9]([a-zA-ZäöüÄÖÜ0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$/.test(inputValue);
    case 'json':
      try {
        JSON.parse(inputValue);
        return true;
      } catch {
        return false;
      }
    default:
      return null;
  }
};


  const validationStatus = getValidationStatus();
  const shouldShowPassword = (inputType === 'password' || inputType === 'api-key');
  const actualInputType = shouldShowPassword && !showPassword ? 'password' :
                          shouldShowPassword && showPassword ? 'text' : inputType;


  return (
  <motion.div
    className={`relative min-w-64 bg-gradient-to-br ${getInputTypeColor(inputType)} border-2 rounded-xl shadow-lg transition-all duration-200 group ${
      selected ? 'ring-2 ring-blue-200' : ''
    } ${isFocused ? 'ring-2 ring-blue-300' : ''}`}
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.98 }}
    transition={{ type: "spring", stiffness: 400, damping: 25 }}
    animate={{
      boxShadow: isFocused
        ? "0 8px 25px rgba(59, 130, 246, 0.15)"
        : "0 4px 12px rgba(0, 0, 0, 0.1)"
    }}
  >
    {/* Delete button */}
    <motion.button
      onClick={handleDelete}
      className={`absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 shadow-lg z-10 ${
        selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}
      title="Delete node"
      whileHover={{ scale: 1.2, rotate: 90 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 500 }}
    >
      ×
    </motion.button>

    {/* Input Handle - Top */}
    <Handle
      type="target"
      position={Position.Top}
      id="input"
      style={{
        background: '#6b7280',
        width: '10px',
        height: '10px',
        border: '2px solid white'
      }}
      isConnectable={isConnectable}
    />

    {/* Node Content */}
    <motion.div
      className="p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      {/* Header with editable label */}
      <div className="flex items-center justify-between mb-3">
        <motion.div
          className="flex items-center space-x-2"
          whileHover={{ x: 2 }}
          transition={{ type: "spring", stiffness: 500 }}
        >
          <motion.span
            className="text-lg"
            animate={{ rotate: isFocused ? [0, 10, -10, 0] : 0 }}
            transition={{ duration: 0.5 }}
          >
            {getInputTypeIcon(inputType)}
          </motion.span>
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.input
                key="editing"
                type="text"
                value={label}
                onChange={handleLabelChange}
                onBlur={handleBlur}
                onKeyPress={handleKeyPress}
                onKeyDown={handleKeyDown}
                className="text-sm font-semibold bg-transparent border-b border-gray-400 focus:outline-none focus:border-blue-500"
                autoFocus
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              />
            ) : (
              <motion.h3
                key="display"
                className="text-sm font-semibold text-gray-800 cursor-pointer hover:text-blue-600"
                onDoubleClick={handleDoubleClick}
                title="Double-click to edit"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                {label}
              </motion.h3>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Type selector */}
        <motion.select
          value={inputType}
          onChange={handleTypeChange}
          className="text-xs bg-white/80 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="password">Password</option>
          <option value="email">Email</option>
          <option value="url">URL</option>
          <option value="api-key">API Key</option>
          <option value="json">JSON</option>
        </motion.select>
      </div>

      {/* Input Field with enhanced design and fixed event handling */}
      <motion.div
        className="mb-3 relative"
        animate={{ scale: isFocused ? 1.02 : 1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {inputType === 'json' ? (
          <motion.textarea
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Enter JSON data..."
            className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
            rows={3}
          />
        ) : (
          <div className="relative">
            <motion.input
              type={actualInputType}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={`Enter ${inputType}...`}
              className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              style={{ paddingRight: shouldShowPassword ? '40px' : '12px' }}
            />

            {/* Simple, centered visibility toggle */}
            {shouldShowPassword && (
            <motion.button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-gray-50 hover:bg-gray-100 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-800"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-center w-full h-full">
                <span className="text-xs font-mono">
                  {showPassword ? 'HIDE' : 'SHOW'}
                </span>
              </div>
            </motion.button>
          )}
          </div>
        )}
      </motion.div>

      {/* Character count for text inputs */}
      <AnimatePresence>
        {inputType === 'text' && inputValue && (
          <motion.div
            className="text-xs text-gray-500 mb-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            Length: {inputValue.length} characters
          </motion.div>
        )}
      </AnimatePresence>

      {/* Validation indicators with animations */}
      <AnimatePresence>
        {validationStatus !== null && (
          <motion.div
            className="text-xs mt-2"
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            <motion.span
              className={validationStatus ? 'text-green-600' : 'text-red-600'}
              animate={{
                scale: validationStatus ? [1, 1.1, 1] : [1, 0.9, 1]
              }}
              transition={{ duration: 0.3 }}
            >
              {validationStatus ? '✓' : '✗'}
              {validationStatus
                ? `Valid ${inputType}`
                : `Invalid ${inputType}`
              }
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>

    {/* Output Handles */}
    <Handle
      type="source"
      position={Position.Right}
      id="output"
      style={{
        background: '#10b981',
        width: '10px',
        height: '10px',
        border: '2px solid white'
      }}
      isConnectable={isConnectable}
    />

    <Handle
      type="source"
      position={Position.Bottom}
      id="output-bottom"
      style={{
        background: '#10b981',
        width: '10px',
        height: '10px',
        border: '2px solid white'
      }}
      isConnectable={isConnectable}
    />

    {/* Animated glow effect */}
    <motion.div
      className="absolute inset-0 rounded-xl pointer-events-none"
      animate={{
        boxShadow: isFocused
          ? "0 0 20px rgba(59, 130, 246, 0.2)"
          : "0 0 0px rgba(59, 130, 246, 0)"
      }}
      transition={{ duration: 0.3 }}
    />
  </motion.div>
);

};

export default TextNode;
