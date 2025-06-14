import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReactFlow } from '@xyflow/react';

const ChatWindow = () => {
  const { getNodes, getEdges } = useReactFlow();

  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [activeChatNode, setActiveChatNode] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Enhanced event system
  useEffect(() => {
    const handleOpenChatWindow = (event) => {
      console.log('🔥 Received openChatWindow event:', event.detail);

      if (event.detail) {
        setActiveChatNode({
          id: event.detail.nodeId,
          data: event.detail.settings,
          apiConfig: event.detail.apiConfig,
          sendMessage: event.detail.sendMessage,
          isLoading: event.detail.isLoading,
          availableModels: event.detail.availableModels || [],
          vectorData: event.detail.vectorData
        });

        // Debug vector data
        console.log('🔍 Vector Data Received:', event.detail.vectorData);
        console.log('🔍 Vectors Count:', event.detail.vectorData?.vectors?.length || 0);

        if (messages.length === 0 && event.detail.messages && event.detail.messages.length > 0) {
          setMessages(event.detail.messages);
        }

        setIsOpen(true);
        setIsMinimized(false);
        setConnectionStatus('connected');
      }
    };

    window.addEventListener('openChatWindow', handleOpenChatWindow);
    return () => window.removeEventListener('openChatWindow', handleOpenChatWindow);
  }, [messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current && !isMinimized) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, [messages, isMinimized]);

  // Focus input when window opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isMinimized]);

  // ENHANCED: Send message with proper knowledge base integration
  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !activeChatNode || isLoading) return;

    const messageText = inputMessage.trim();
    const userMessage = {
      id: `user_${Date.now()}`,
      text: messageText,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    const startTime = Date.now();

    try {
      // Construct endpoint
      let chatEndpoint;
      const apiConfig = activeChatNode.apiConfig;

      if (apiConfig.provider === 'blablador' || apiConfig.endpoint?.includes('blablador')) {
        chatEndpoint = `${apiConfig.endpoint}/chat/completions`;
      } else if (apiConfig.provider === 'openai') {
        chatEndpoint = 'https://api.openai.com/v1/chat/completions';
      } else {
        chatEndpoint = `${apiConfig.endpoint}/chat/completions`;
      }

      console.log('🔍 Using chat endpoint:', chatEndpoint);

      // ENHANCED: Prepare messages with better knowledge base integration
      const apiMessages = [];

      // System prompt
      if (activeChatNode.data.systemPrompt) {
        apiMessages.push({
          role: 'system',
          content: activeChatNode.data.systemPrompt
        });
      }

      // ENHANCED: Knowledge base integration with repository context
      if (activeChatNode.data.useKnowledgeBase && activeChatNode.vectorData?.vectors?.length > 0) {
        console.log('📚 Integrating knowledge base with', activeChatNode.vectorData.vectors.length, 'vectors');

        // Get comprehensive repository context
        const repositoryContext = activeChatNode.vectorData.vectors
          .slice(0, 15) // Increased from 3 to 15 vectors
          .map((vector, index) => {
            const text = vector.metadata?.text || '';
            const filename = vector.metadata?.filename ||
                           vector.metadata?.path ||
                           vector.metadata?.source ||
                           `file_${index}`;
            const chunkIndex = vector.metadata?.chunk_index || index;

            return `[${filename} - Part ${chunkIndex + 1}]\n${text.slice(0, 1000)}`;
          })
          .filter(content => content.trim().length > 0)
          .join('\n\n---\n\n');

        if (repositoryContext) {
          apiMessages.push({
            role: 'system',
            content: `You are an AI assistant with access to the "hellogitworld" repository. Here is the repository content:

${repositoryContext}

Instructions:
- Use the above repository information to answer questions about the hellogitworld repository
- Reference specific files and code when relevant
- Be specific about what the repository contains and does
- If asked about the repository, explain its purpose based on the actual content shown above
- Don't say you don't have access - you have the repository content above`
          });

          console.log('📚 Added repository context:', repositoryContext.length, 'characters');
        }
      }

      // Add recent conversation history (reduced to make room for knowledge base)
      const recentMessages = messages.slice(-3);
      recentMessages.forEach(msg => {
        if (msg.sender && msg.text && !msg.isError) {
          apiMessages.push({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          });
        }
      });

      // Current message
      apiMessages.push({
        role: 'user',
        content: messageText
      });

      console.log('📤 Sending API request with', apiMessages.length, 'messages');

      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiConfig.apiKey || apiConfig.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: activeChatNode.data.model,
          messages: apiMessages,
          temperature: activeChatNode.data.creativity || 0.7,
          max_tokens: activeChatNode.data.maxResponseLength || 2000 // Increased for better responses
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      const assistantMessage = {
        id: `assistant_${Date.now()}`,
        text: data.choices[0].message.content,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        responseTime
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('❌ Chat error:', error);
      const errorMessage = {
        id: `error_${Date.now()}`,
        text: `Error: ${error.message}`,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputMessage, activeChatNode, messages, isLoading]);

  // Keyboard handling
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Window controls
  const closeChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
    setConnectionStatus('disconnected');
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const clearConversation = () => {
    setMessages([]);
  };

  // Debug function
  const debugVectorData = () => {
    console.log('🔍 Debug Vector Data:');
    console.log('Active Chat Node:', activeChatNode);
    console.log('Vector Data:', activeChatNode?.vectorData);
    console.log('Vectors Count:', activeChatNode?.vectorData?.vectors?.length || 0);
    console.log('Use Knowledge Base:', activeChatNode?.data?.useKnowledgeBase);

    if (activeChatNode?.vectorData?.vectors?.length > 0) {
      console.log('Sample vectors:', activeChatNode.vectorData.vectors.slice(0, 3));
    }

    alert(`Vector Debug:
Vectors: ${activeChatNode?.vectorData?.vectors?.length || 0}
Knowledge Base Enabled: ${activeChatNode?.data?.useKnowledgeBase}
Connection: ${connectionStatus}
Model: ${activeChatNode?.data?.model}`);
  };

  // Message rendering with proper overflow handling
  const renderMessage = (message) => (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex mb-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`relative max-w-[75%] px-4 py-3 rounded-2xl shadow-sm ${
          message.sender === 'user'
            ? 'bg-emerald-500 text-white rounded-br-md'
            : message.isError
            ? 'bg-red-50 text-red-800 border border-red-200 rounded-bl-md'
            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
        }`}
        style={{
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
          hyphens: 'auto'
        }}
      >
        <div
          className="text-sm leading-relaxed"
          style={{
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
            maxWidth: '100%',
            overflow: 'hidden'
          }}
        >
          {message.text}
        </div>
        <div className={`text-xs mt-2 opacity-75 flex items-center justify-between ${
          message.sender === 'user' ? 'text-emerald-100' : 'text-gray-500'
        }`}>
          <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
          {message.responseTime && (
            <span className="ml-2">{message.responseTime}ms</span>
          )}
        </div>
      </div>
    </motion.div>
  );

  if (!isOpen) return null;

  return (
    <motion.div
      ref={chatContainerRef}
      data-chat-window
      initial={{ opacity: 0, y: 100, scale: 0.9 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        height: isMinimized ? 60 : 500
      }}
      exit={{ opacity: 0, y: 100, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="fixed bottom-4 right-4 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden z-50"
      style={{
        height: isMinimized ? '60px' : '500px',
        maxWidth: '384px',
        width: '384px'
      }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold">💬</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate">AI Chat</h3>
            <p className="text-xs opacity-90 flex items-center space-x-2">
              <span className="truncate">{activeChatNode?.data?.model || 'Unknown'}</span>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                connectionStatus === 'connected' ? 'bg-green-300' : 'bg-red-300'
              }`} />
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1 flex-shrink-0">
          <button
            onClick={debugVectorData}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            title="Debug Vectors"
          >
            🔍
          </button>
          <button
            onClick={toggleMinimize}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            title={isMinimized ? "Maximize" : "Minimize"}
          >
            {isMinimized ? '🔼' : '🔽'}
          </button>
          <button
            onClick={closeChat}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Chat Content */}
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col flex-1 min-h-0"
          >
            {/* Enhanced Status Bar */}
            <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex-shrink-0">
              <div className="text-xs text-emerald-700 text-center truncate">
                Connected to {activeChatNode?.apiConfig?.provider === 'blablador' ? 'Blablador (JSC)' :
                             activeChatNode?.apiConfig?.provider === 'openai' ? 'OpenAI' :
                             activeChatNode?.apiConfig?.provider || 'API'}
                {activeChatNode?.vectorData?.vectors?.length > 0 && (
                  <span className="ml-2 font-medium">• {activeChatNode.vectorData.vectors.length} vectors loaded</span>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div
              className="flex-1 p-4 bg-gray-50 min-h-0"
              style={{
                overflowY: 'auto',
                overflowX: 'hidden',
                maxHeight: '320px'
              }}
            >
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <div className="text-3xl mb-2">💬</div>
                  <p className="text-sm font-medium">Ask about your repository!</p>
                  <p className="text-xs mt-1 opacity-75">
                    Model: {activeChatNode?.data?.model || 'Unknown'}
                  </p>
                  {activeChatNode?.vectorData?.vectors?.length > 0 && (
                    <p className="text-xs mt-1 text-emerald-600 font-medium">
                      📚 Repository knowledge loaded ({activeChatNode.vectorData.vectors.length} vectors)
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {messages.map(renderMessage)}
                </div>
              )}

              {/* Loading indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start mb-3"
                >
                  <div className="bg-white text-gray-800 border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-xs text-gray-500">AI is analyzing repository...</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
              <div className="flex space-x-3">
                <div className="flex-1">
                  <textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about your hellogitworld repository..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none text-sm"
                    rows="1"
                    style={{
                      minHeight: '40px',
                      maxHeight: '80px',
                      overflow: 'hidden'
                    }}
                    disabled={isLoading}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
                >
                  {isLoading ? '⏳' : '📤'}
                </button>
              </div>

              {/* Action Bar */}
              <div className="flex justify-between items-center mt-2">
                <div className="text-xs text-gray-500 truncate">
                  {activeChatNode?.data?.model} • Vectors: {activeChatNode?.vectorData?.vectors?.length || 0}
                </div>
                {messages.length > 0 && (
                  <button
                    onClick={clearConversation}
                    className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ChatWindow;
