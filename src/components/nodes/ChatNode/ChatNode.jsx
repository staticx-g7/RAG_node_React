import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import PlayButton from '../../ui/PlayButton';

// Simplified Background Beams
const BackgroundBeams = ({ className }) => (
  <div className={`absolute inset-0 pointer-events-none ${className}`}>
    <svg className="absolute inset-0 h-full w-full opacity-20" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="chat-beams" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M0 40L40 0H20L0 20M40 40V20L20 40" stroke="rgba(156, 163, 175, 0.1)" fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#chat-beams)" />
    </svg>
  </div>
);

// Floating icon animation
const FloatingIcon = ({ children, isProcessing }) => (
  <motion.div
    animate={{
      y: [0, -2, 0],
      rotate: isProcessing ? 360 : 0,
    }}
    transition={{
      y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
      rotate: { duration: isProcessing ? 2 : 0, repeat: isProcessing ? Infinity : 0, ease: "linear" }
    }}
  >
    {children}
  </motion.div>
);

const ChatNode = ({ id, data, isConnectable, selected }) => {
  const [apiConfig, setApiConfig] = useState(data?.apiConfig || null);
  const [vectorizedData, setVectorizedData] = useState([]);
  const [textInput, setTextInput] = useState(data?.textInput || '');
  const [chatResponse, setChatResponse] = useState(null);
  const [conversation, setConversation] = useState(data?.conversation || []); // **NEW: Conversation history**
  const [currentInput, setCurrentInput] = useState(''); // **NEW: Current follow-up input**
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showChat, setShowChat] = useState(false); // **NEW: Toggle chat interface**
  const [dataCheckCounter, setDataCheckCounter] = useState(0);

  // Chat configuration
  const [selectedModel, setSelectedModel] = useState(data?.selectedModel || '');
  const [topK, setTopK] = useState(data?.topK || 5);
  const [similarityThreshold, setSimilarityThreshold] = useState(data?.similarityThreshold || 0.4); // **CHANGED: Default to 0.4**
  const [temperature, setTemperature] = useState(data?.temperature || 0.7);
  const [maxTokens, setMaxTokens] = useState(data?.maxTokens || 1000);
  const [systemPrompt, setSystemPrompt] = useState(data?.systemPrompt || 'You are a helpful assistant. Answer questions based on the provided context.');

  const { setNodes, getNodes, getEdges } = useReactFlow();
  const chatButtonRef = useRef(null);
  const chatContainerRef = useRef(null); // **NEW: Chat scroll container**
  const inputRef = useRef(null); // **NEW: Chat input ref**
  const updateTimeoutRef = useRef(null);

  // **CHAIN REACTION FUNCTIONALITY**
  const triggerNextNodes = useCallback(async (currentNodeId) => {
    const edges = getEdges();
    const nodes = getNodes();

    const outgoingEdges = edges.filter(edge => edge.source === currentNodeId);

    if (outgoingEdges.length > 0) {
      console.log(`🔗 ChatNode: Found ${outgoingEdges.length} connected node(s) to trigger`);

      for (let i = 0; i < outgoingEdges.length; i++) {
        const edge = outgoingEdges[i];
        const targetNode = nodes.find(node => node.id === edge.target);

        if (targetNode) {
          console.log(`🎯 ChatNode: Triggering ${targetNode.type} node ${edge.target}`);

          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('triggerExecution', {
              detail: { nodeId: edge.target, sourceNodeId: currentNodeId }
            }));

            window.dispatchEvent(new CustomEvent('triggerPlayButton', {
              detail: { nodeId: edge.target, sourceNodeId: currentNodeId }
            }));

            window.dispatchEvent(new CustomEvent('autoExecute', {
              detail: { nodeId: edge.target, sourceNodeId: currentNodeId }
            }));
          }, i * 500);
        }
      }
    } else {
      console.log(`⏹️ ChatNode: No connected nodes found after chat processing`);
    }
  }, [getEdges, getNodes]);

  // **COSINE SIMILARITY CALCULATION**
  const calculateCosineSimilarity = useCallback((vecA, vecB) => {
    if (vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }, []);

  // **GENERATE QUERY EMBEDDING**
  const generateQueryEmbedding = useCallback(async (query) => {
    if (!apiConfig || !apiConfig.apiKey || !apiConfig.apiEndpoint) {
      throw new Error('API configuration not available');
    }

    try {
      const embeddingModel = apiConfig.availableModels?.find(model =>
        model.id.includes('embedding') ||
        model.id.includes('embed') ||
        model.id === 'text-embedding-ada-002' ||
        model.id === 'alias-embeddings'
      )?.id || 'text-embedding-ada-002';

      const response = await fetch(`${apiConfig.apiEndpoint}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: query,
          model: embeddingModel,
          encoding_format: 'float'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error(`❌ ChatNode ${id}: Query embedding generation failed:`, error);
      throw error;
    }
  }, [apiConfig, id]);

  // **ADAPTIVE SIMILARITY SEARCH**
  const adaptiveSimilaritySearch = useCallback(async (queryEmbedding) => {
    const allChunks = [];

    vectorizedData.forEach(vectorData => {
      if (vectorData.vectorizedFiles) {
        vectorData.vectorizedFiles.forEach(file => {
          if (file.chunks) {
            file.chunks.forEach(chunk => {
              if (chunk.embedding) {
                allChunks.push({
                  ...chunk,
                  sourceFile: file.originalFile.name,
                  filePath: file.originalFile.path,
                  parser: file.parser
                });
              }
            });
          }
        });
      }
    });

    const similarities = allChunks.map(chunk => {
      const similarity = calculateCosineSimilarity(queryEmbedding, chunk.embedding);
      return { ...chunk, similarity };
    }).sort((a, b) => b.similarity - a.similarity);

    console.log(`🔍 ChatNode ${id}: Top similarities:`,
      similarities.slice(0, 5).map(s => s.similarity.toFixed(3))
    );

    // Auto-detect optimal threshold
    const topSimilarity = similarities[0]?.similarity || 0;
    const adaptiveThreshold = Math.max(topSimilarity * 0.7, 0.2);
    const effectiveThreshold = Math.min(similarityThreshold, adaptiveThreshold);

    const topChunks = similarities
      .slice(0, topK)
      .filter(chunk => chunk.similarity >= effectiveThreshold);

    if (topChunks.length === 0 && similarities.length > 0) {
      console.log(`⚠️ ChatNode ${id}: No chunks above threshold, using best match`);
      topChunks.push(similarities[0]);
    }

    console.log(`✅ ChatNode ${id}: Found ${topChunks.length} chunks (adaptive threshold: ${effectiveThreshold.toFixed(3)})`);

    return topChunks;
  }, [vectorizedData, topK, similarityThreshold, calculateCosineSimilarity, id]);

  // **AUTO-CONFIGURE SETTINGS**
  const autoConfigureSettings = useCallback(() => {
    if (vectorizedData.length === 0) return;

    let totalChunks = 0;
    let hasCodeContent = false;
    let hasDocumentation = false;

    vectorizedData.forEach(vectorData => {
      if (vectorData.vectorizedFiles) {
        vectorData.vectorizedFiles.forEach(file => {
          if (file.chunks) {
            totalChunks += file.chunks.length;

            if (file.parser === 'code' || file.originalFile.name.match(/\.(js|py|java|cpp|ts)$/)) {
              hasCodeContent = true;
            }
            if (file.parser === 'markdown' || file.originalFile.name.match(/\.(md|txt|rst)$/)) {
              hasDocumentation = true;
            }
          }
        });
      }
    });

    let recommendedThreshold = 0.4;
    let recommendedTopK = 5;

    if (hasCodeContent) {
      recommendedThreshold = 0.3;
      recommendedTopK = 3;
      console.log(`🤖 ChatNode ${id}: Detected code content, adjusting settings`);
    }

    if (hasDocumentation) {
      recommendedThreshold = 0.5;
      recommendedTopK = 7;
      console.log(`📚 ChatNode ${id}: Detected documentation, adjusting settings`);
    }

    if (totalChunks < 10) {
      recommendedThreshold = 0.2;
      console.log(`📊 ChatNode ${id}: Small dataset detected, lowering threshold`);
    }

    if (similarityThreshold === 0.7) {
      setSimilarityThreshold(recommendedThreshold);
    }
    if (topK === 5) {
      setTopK(recommendedTopK);
    }

    console.log(`⚙️ ChatNode ${id}: Auto-configured - Threshold: ${recommendedThreshold}, TopK: ${recommendedTopK}`);
  }, [vectorizedData, similarityThreshold, topK, id]);

  useEffect(() => {
    autoConfigureSettings();
  }, [vectorizedData, autoConfigureSettings]);

  // **RETRIEVE RELEVANT CHUNKS**
  const retrieveRelevantChunks = useCallback(async (queryEmbedding) => {
    return await adaptiveSimilaritySearch(queryEmbedding);
  }, [adaptiveSimilaritySearch]);

  // **GENERATE CHAT COMPLETION WITH CONVERSATION HISTORY** - **ENHANCED**
  const generateChatCompletion = useCallback(async (query, relevantChunks, conversationHistory = []) => {
    if (!apiConfig || !apiConfig.apiKey || !selectedModel) {
      throw new Error('API configuration or model not selected');
    }

    const context = relevantChunks.map(chunk =>
      `Source: ${chunk.sourceFile}\n${chunk.content}`
    ).join('\n\n---\n\n');

    // **NEW: Build conversation history for context**
    const messages = [
      {
        role: 'system',
        content: `${systemPrompt}\n\nContext:\n${context}`
      }
    ];

    // **NEW: Add conversation history (last 6 messages)**
    const recentHistory = conversationHistory.slice(-6);
    recentHistory.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });

    // Add current query
    messages.push({
      role: 'user',
      content: query
    });

    try {
      const response = await fetch(`${apiConfig.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: messages,
          temperature: temperature,
          max_tokens: maxTokens
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return {
        response: data.choices[0].message.content,
        usage: data.usage,
        model: selectedModel,
        relevantChunks: relevantChunks,
        query: query
      };
    } catch (error) {
      console.error(`❌ ChatNode ${id}: Chat completion failed:`, error);
      throw error;
    }
  }, [apiConfig, selectedModel, systemPrompt, temperature, maxTokens, id]);

  // **MAIN CHAT PROCESSING**
  const processChatQuery = useCallback(async (queryText = null, isFollowUp = false) => {
    const query = queryText || textInput;

    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    if (!apiConfig || !apiConfig.apiKey || !selectedModel) {
      setError('Please connect API configuration and select a model');
      return;
    }

    if (vectorizedData.length === 0) {
      setError('Please connect vectorized data sources');
      return;
    }

    setIsProcessing(true);
    setError(null);
    console.log(`🔄 ChatNode ${id}: Processing query: "${query}"`);

    try {
      // **NEW: Add user message to conversation if it's a follow-up**
      if (isFollowUp) {
        const userMessage = {
          role: 'user',
          content: query,
          timestamp: new Date().toISOString()
        };
        setConversation(prev => [...prev, userMessage]);
      }

      const queryEmbedding = await generateQueryEmbedding(query);
      const relevantChunks = await retrieveRelevantChunks(queryEmbedding);

      if (relevantChunks.length === 0) {
        throw new Error(`No relevant content found for query (threshold: ${similarityThreshold})`);
      }

      // **NEW: Pass conversation history for context**
      const result = await generateChatCompletion(query, relevantChunks, conversation);

      const responseData = {
        ...result,
        processedAt: new Date().toISOString(),
        config: {
          topK,
          similarityThreshold,
          temperature,
          maxTokens,
          systemPrompt
        }
      };

      if (isFollowUp) {
        // **NEW: Add assistant response to conversation**
        const assistantMessage = {
          role: 'assistant',
          content: result.response,
          timestamp: new Date().toISOString(),
          relevantChunks: result.relevantChunks,
          usage: result.usage
        };
        setConversation(prev => [...prev, assistantMessage]);
      } else {
        // **NEW: Initialize conversation for first query**
        setChatResponse(responseData);
        const initialConversation = [
          {
            role: 'user',
            content: query,
            timestamp: responseData.processedAt
          },
          {
            role: 'assistant',
            content: result.response,
            timestamp: responseData.processedAt,
            relevantChunks: result.relevantChunks,
            usage: result.usage
          }
        ];
        setConversation(initialConversation);
        setShowChat(true); // **NEW: Show chat interface after first response**
      }

      console.log(`✅ ChatNode ${id}: Chat processing complete`);

      if (!isFollowUp) {
        await new Promise(resolve => setTimeout(resolve, 500));
        await triggerNextNodes(id);
      }

    } catch (error) {
      console.error(`❌ ChatNode ${id}: Chat processing failed:`, error);
      setError(`Chat processing failed: ${error.message}`);

      if (isFollowUp) {
        // **NEW: Add error message to conversation**
        const errorMessage = {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error.message}`,
          timestamp: new Date().toISOString(),
          isError: true
        };
        setConversation(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [textInput, apiConfig, selectedModel, vectorizedData, topK, similarityThreshold, temperature, maxTokens, systemPrompt, id, generateQueryEmbedding, retrieveRelevantChunks, generateChatCompletion, triggerNextNodes, conversation]);

  // **NEW: Handle follow-up questions**
  const handleFollowUpQuestion = useCallback(async () => {
    if (!currentInput.trim()) return;

    const query = currentInput.trim();
    setCurrentInput('');

    await processChatQuery(query, true);
  }, [currentInput, processChatQuery]);

  // **NEW: Handle Enter key in chat input**
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFollowUpQuestion();
    }
  }, [handleFollowUpQuestion]);

  // **NEW: Auto-scroll chat to bottom**
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation]);

  // **DEBOUNCED NODE DATA UPDATE** - **ENHANCED**
  useEffect(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                apiConfig,
                vectorizedData,
                textInput,
                chatResponse,
                conversation, // **NEW: Save conversation**
                selectedModel,
                topK,
                similarityThreshold,
                temperature,
                maxTokens,
                systemPrompt,
                lastUpdated: new Date().toISOString()
              }
            };
          }
          return node;
        })
      );
    }, 1000);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [apiConfig, vectorizedData, textInput, chatResponse, conversation, selectedModel, topK, similarityThreshold, temperature, maxTokens, systemPrompt, id, setNodes]);

  // **ENHANCED DATA DETECTION - RECEIVES FROM MULTIPLE SOURCES**
  useEffect(() => {
    const checkForInputData = () => {
      try {
        const edges = getEdges();
        const nodes = getNodes();

        console.log(`🔍 ChatNode ${id}: Checking for input data (attempt #${dataCheckCounter})`);

        const incomingEdges = edges.filter(edge => edge.target === id);

        incomingEdges.forEach(edge => {
          const sourceNode = nodes.find(node => node.id === edge.source);

          if (sourceNode && sourceNode.data) {
            if (sourceNode.data.apiKey && sourceNode.data.apiEndpoint) {
              console.log(`✅ ChatNode ${id}: Found API configuration`);
              setApiConfig({
                apiKey: sourceNode.data.apiKey,
                apiEndpoint: sourceNode.data.apiEndpoint,
                availableModels: sourceNode.data.availableModels || []
              });

              if (!selectedModel && sourceNode.data.availableModels) {
                const chatModels = sourceNode.data.availableModels.filter(model =>
                  model.id.includes('gpt') ||
                  model.id.includes('claude') ||
                  model.id.includes('chat') ||
                  model.id.includes('mistral') ||
                  model.id.includes('llama')
                );
                if (chatModels.length > 0) {
                  setSelectedModel(chatModels[0].id);
                }
              }
            }

            if (sourceNode.data.vectorizedData || sourceNode.data.vectorizedFiles) {
              console.log(`✅ ChatNode ${id}: Found vectorized data`);
              const vectorData = sourceNode.data.vectorizedData || sourceNode.data;
              setVectorizedData(prev => {
                const existingIndex = prev.findIndex(item => item.sourceNodeId === edge.source);
                if (existingIndex >= 0) {
                  const updated = [...prev];
                  updated[existingIndex] = { ...vectorData, sourceNodeId: edge.source };
                  return updated;
                } else {
                  return [...prev, { ...vectorData, sourceNodeId: edge.source }];
                }
              });
            }

            if (sourceNode.data.text || sourceNode.data.content) {
              console.log(`✅ ChatNode ${id}: Found text input`);
              setTextInput(sourceNode.data.text || sourceNode.data.content);
            }
          }
        });

      } catch (error) {
        console.error(`❌ ChatNode ${id}: Error checking input data:`, error);
      }
    };

    checkForInputData();
  }, [getEdges, getNodes, id, dataCheckCounter, selectedModel]);

  // **PERIODIC DATA CHECK WHEN WAITING**
  useEffect(() => {
    if (!apiConfig || vectorizedData.length === 0) {
      const interval = setInterval(() => {
        console.log(`🔍 ChatNode ${id}: Periodic data check #${dataCheckCounter}`);
        setDataCheckCounter(prev => prev + 1);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [apiConfig, vectorizedData, dataCheckCounter, id]);

  // **NODE EXECUTION HANDLER**
  const handleNodeExecution = useCallback(async (inputData) => {
    console.log(`🎯 ChatNode ${id}: Executing with input data:`, inputData);

    try {
      Object.values(inputData).forEach(data => {
        if (data.vectorizedFiles) {
          console.log(`📥 ChatNode ${id}: Processing vectorized data`);
          setVectorizedData(prev => [...prev, data]);
        }
        if (data.apiKey && data.apiEndpoint) {
          console.log(`📥 ChatNode ${id}: Processing API config`);
          setApiConfig(data);
        }
        if (data.text || data.content) {
          console.log(`📥 ChatNode ${id}: Processing text input`);
          setTextInput(data.text || data.content);
        }
      });

      if (inputData && Object.keys(inputData).length > 0) {
        console.log(`🔄 ChatNode ${id}: Auto-processing after receiving data`);
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (chatButtonRef.current && !isProcessing && apiConfig && vectorizedData.length > 0 && textInput) {
          console.log(`✅ ChatNode ${id}: Triggering chat button`);
          chatButtonRef.current.click();
        }
      }
    } catch (error) {
      console.error(`❌ ChatNode ${id}: Error during execution:`, error);
    }
  }, [id, isProcessing, apiConfig, vectorizedData, textInput]);

  // **AUTO-EXECUTION EVENT LISTENER**
  useEffect(() => {
    const handleAutoExecution = (event) => {
      if (event.detail.nodeId === id) {
        console.log(`🎯 ChatNode ${id}: Auto-triggered for execution`);

        if (chatButtonRef.current && !isProcessing && apiConfig && vectorizedData.length > 0 && textInput && selectedModel) {
          console.log(`✅ ChatNode ${id}: Triggering chat button click`);
          chatButtonRef.current.click();
          return;
        }

        if (!isProcessing && apiConfig && vectorizedData.length > 0 && textInput && selectedModel) {
          console.log(`✅ ChatNode ${id}: Direct function call for auto-execution`);
          processChatQuery();
        } else {
          console.log(`⚠️ ChatNode ${id}: Cannot auto-execute - missing requirements`);
        }
      }
    };

    window.addEventListener('triggerExecution', handleAutoExecution);
    window.addEventListener('triggerPlayButton', handleAutoExecution);
    window.addEventListener('autoExecute', handleAutoExecution);

    return () => {
      window.removeEventListener('triggerExecution', handleAutoExecution);
      window.removeEventListener('triggerPlayButton', handleAutoExecution);
      window.removeEventListener('autoExecute', handleAutoExecution);
    };
  }, [id, isProcessing, apiConfig, vectorizedData, textInput, selectedModel, processChatQuery]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('deleteNode', { detail: { id } }));
  }, [id]);

  const handleInteractionEvent = useCallback((e) => {
    e.stopPropagation();
  }, []);

  // **AVAILABLE CHAT MODELS**
  const chatModels = useMemo(() => {
    if (!apiConfig || !apiConfig.availableModels) return [];

    return apiConfig.availableModels.filter(model =>
      model.id.includes('gpt') ||
      model.id.includes('claude') ||
      model.id.includes('chat') ||
      model.id.includes('mistral') ||
      model.id.includes('llama') ||
      model.id.includes('gemini') ||
      (!model.id.includes('embedding') && !model.id.includes('embed'))
    );
  }, [apiConfig]);

  // **CHAT STATISTICS** - **ENHANCED**
  const chatStats = useMemo(() => {
    if (!chatResponse && conversation.length === 0) return null;

    const totalSources = vectorizedData.length;
    const totalChunks = vectorizedData.reduce((sum, data) => {
      return sum + (data.vectorizedFiles?.reduce((fileSum, file) => fileSum + (file.chunks?.length || 0), 0) || 0);
    }, 0);

    const relevantChunks = chatResponse?.relevantChunks?.length ||
      conversation.filter(msg => msg.relevantChunks).reduce((sum, msg) => sum + msg.relevantChunks.length, 0);

    return {
      totalSources,
      totalChunks,
      relevantChunks,
      conversationLength: conversation.length,
      model: chatResponse?.model || selectedModel
    };
  }, [chatResponse, vectorizedData, conversation, selectedModel]);

  return (
    <motion.div
      className={`relative w-[500px] bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 border-2 border-emerald-200 rounded-xl shadow-lg group nowheel overflow-visible ${
        selected ? 'ring-2 ring-emerald-300' : ''
      }`}
      style={{ minHeight: showChat ? '800px' : '700px' }} // **NEW: Dynamic height**
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onPointerDown={(e) => {
        if (e.target.closest('input, button, select, textarea, .nowheel, .nodrag')) {
          e.stopPropagation();
        }
      }}
      whileHover={{
        scale: 1.01,
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)"
      }}
    >
      {/* Background Beams when processing */}
      <AnimatePresence>
        {isProcessing && (
          <BackgroundBeams className="opacity-20" />
        )}
      </AnimatePresence>

      {/* **FIXED: PlayButton positioning** */}
      <div className="absolute -top-4 -left-4 z-30">
        <PlayButton
          nodeId={id}
          nodeType="chat"
          onExecute={handleNodeExecution}
          disabled={isProcessing}
        />
      </div>

      {/* **FIXED: Delete button positioning** */}
      <motion.button
        onClick={handleDelete}
        className={`absolute -top-2 -right-2 w-6 h-6 bg-red-400 text-white rounded-full flex items-center justify-center text-sm font-bold hover:bg-red-500 shadow-lg z-30 ${
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        title="Delete node"
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
      >
        ×
      </motion.button>

      {/* **MULTIPLE INPUT HANDLES** */}
      <Handle
        type="target"
        position={Position.Left}
        id="apiConfig"
        style={{
          background: 'linear-gradient(45deg, #06b6d4, #0891b2)',
          width: '16px',
          height: '16px',
          border: '3px solid white',
          borderRadius: '50%',
          boxShadow: '0 2px 8px rgba(6, 182, 212, 0.4)',
          left: '-8px',
          top: '25%'
        }}
        isConnectable={isConnectable}
      />

      <Handle
        type="target"
        position={Position.Left}
        id="vectors"
        style={{
          background: 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
          width: '16px',
          height: '16px',
          border: '3px solid white',
          borderRadius: '50%',
          boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)',
          left: '-8px',
          top: '50%'
        }}
        isConnectable={isConnectable}
      />

      <Handle
        type="target"
        position={Position.Left}
        id="textInput"
        style={{
          background: 'linear-gradient(45deg, #10b981, #059669)',
          width: '16px',
          height: '16px',
          border: '3px solid white',
          borderRadius: '50%',
          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
          left: '-8px',
          top: '75%'
        }}
        isConnectable={isConnectable}
      />

      <div className="p-4 pt-8 nowheel">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <FloatingIcon isProcessing={isProcessing}>
              <span className="text-xl">💬</span>
            </FloatingIcon>
            <h3 className="text-sm font-semibold text-emerald-800">
              RAG Chat Interface
            </h3>
          </div>

          {/* **NEW: Chat toggle button** */}
          {conversation.length > 0 && (
            <motion.button
              onClick={() => setShowChat(!showChat)}
              className="text-xs bg-emerald-200 hover:bg-emerald-300 px-2 py-1 rounded transition-colors nodrag"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {showChat ? '📖 Hide Chat' : '💬 Show Chat'}
            </motion.button>
          )}
        </div>

        {/* Connection Status */}
        <div className="mb-4 space-y-2">
          <div
            className={`text-xs px-3 py-2 rounded-full inline-block transition-all duration-300 ${
              apiConfig
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-cyan-50 text-cyan-600 border border-cyan-200'
            }`}
          >
            {apiConfig ? '🔑 API Connected' : '⏸️ Waiting for API config'}
          </div>

          <div
            className={`text-xs px-3 py-2 rounded-full inline-block transition-all duration-300 ${
              vectorizedData.length > 0
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-purple-50 text-purple-600 border border-purple-200'
            }`}
          >
            {vectorizedData.length > 0 ? `🔮 ${vectorizedData.length} Vector Source(s)` : '⏸️ Waiting for vectors'}
          </div>
        </div>

        {/* **NEW: Chat Interface** */}
        <AnimatePresence>
          {showChat && conversation.length > 0 && (
            <motion.div
              className="mb-4 bg-white border border-emerald-200 rounded-lg shadow-sm overflow-hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-emerald-100 px-3 py-2 border-b border-emerald-200">
                <div className="text-xs font-medium text-emerald-700">💬 Conversation ({conversation.length} messages)</div>
              </div>

              <div
                ref={chatContainerRef}
                className="h-64 overflow-y-auto p-3 space-y-3 nowheel"
                onMouseDown={handleInteractionEvent}
              >
                {conversation.map((message, index) => (
                  <motion.div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div
                      className={`max-w-[80%] p-2 rounded-lg text-xs ${
                        message.role === 'user'
                          ? 'bg-emerald-500 text-white'
                          : message.isError
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      {message.relevantChunks && message.relevantChunks.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-emerald-300 text-xs opacity-75">
                          📄 Sources: {message.relevantChunks.map(chunk => chunk.sourceFile).join(', ')}
                        </div>
                      )}
                      <div className="text-xs opacity-50 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {isProcessing && (
                  <motion.div
                    className="flex justify-start"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg text-xs border border-emerald-200">
                      <motion.div
                        className="flex space-x-1"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <span>●</span>
                        <span>●</span>
                        <span>●</span>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* **NEW: Chat Input Area** */}
              <div className="border-t border-emerald-200 p-3">
                <div className="flex space-x-2">
                  <motion.textarea
                    ref={inputRef}
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    onMouseDown={handleInteractionEvent}
                    placeholder="Ask a follow-up question..."
                    className="flex-1 p-2 text-xs border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white text-emerald-800 nodrag resize-none"
                    rows={2}
                    disabled={isProcessing || !apiConfig || !selectedModel}
                    whileFocus={{ scale: 1.01 }}
                  />
                  <motion.button
                    onClick={handleFollowUpQuestion}
                    onMouseDown={handleInteractionEvent}
                    disabled={isProcessing || !currentInput.trim() || !apiConfig || !selectedModel}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 nodrag ${
                      isProcessing || !currentInput.trim() || !apiConfig || !selectedModel
                        ? 'bg-emerald-200 text-emerald-500 cursor-not-allowed'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                    }`}
                    whileHover={{ scale: isProcessing || !currentInput.trim() || !apiConfig || !selectedModel ? 1 : 1.05 }}
                    whileTap={{ scale: isProcessing || !currentInput.trim() || !apiConfig || !selectedModel ? 1 : 0.95 }}
                  >
                    {isProcessing ? '⏳' : '📤'}
                  </motion.button>
                </div>
                <div className="text-xs text-emerald-500 mt-1">
                  Press Enter to send • Shift+Enter for new line
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Model Selection */}
        {apiConfig && chatModels.length > 0 && (
          <div className="mb-4">
            <label className="text-xs font-medium text-emerald-700 mb-2 block">
              🤖 Chat Model
            </label>
            <motion.select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              onMouseDown={handleInteractionEvent}
              className="w-full p-2 text-xs border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 nodrag"
              whileFocus={{ scale: 1.01 }}
            >
              <option value="">Select chat model...</option>
              {chatModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.id} {model.owned_by ? `(${model.owned_by})` : ''}
                </option>
              ))}
            </motion.select>
            <div className="text-xs text-emerald-600 mt-1">
              {chatModels.length} chat models available
            </div>
          </div>
        )}

        {/* Text Input */}
        <div className="mb-4">
          <label className="text-xs font-medium text-emerald-700 mb-2 block">
            💭 Your Query
          </label>
          <motion.textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onMouseDown={handleInteractionEvent}
            placeholder="Ask a question about your documents..."
            className="w-full p-3 text-xs border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 nodrag resize-none"
            rows={3}
            whileFocus={{ scale: 1.01 }}
          />
        </div>

        {/* Retrieval Settings */}
        <div className="mb-4 space-y-3">
          <label className="text-xs font-medium text-emerald-700 block">🔍 Retrieval Settings</label>

          {/* Top-K */}
          <div>
            <label className="text-xs text-emerald-600 mb-1 block">
              📊 Top-K Results: {topK}
            </label>
            <motion.input
              type="range"
              min="1"
              max="20"
              step="1"
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value))}
              onMouseDown={handleInteractionEvent}
              className="w-full accent-emerald-500 nodrag nowheel"
              whileHover={{ scale: 1.01 }}
            />
          </div>

          {/* Similarity Threshold */}
          <div>
            <label className="text-xs text-emerald-600 mb-1 block">
              🎯 Similarity Threshold: {similarityThreshold}
            </label>
            <motion.input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
              onMouseDown={handleInteractionEvent}
              className="w-full accent-emerald-500 nodrag nowheel"
              whileHover={{ scale: 1.01 }}
            />
          </div>
        </div>

        {/* Generation Settings */}
        <div className="mb-4 space-y-3">
          <label className="text-xs font-medium text-emerald-700 block">⚙️ Generation Settings</label>

          {/* Temperature */}
          <div>
            <label className="text-xs text-emerald-600 mb-1 block">
              🌡️ Temperature: {temperature}
            </label>
            <motion.input
              type="range"
              min="0.0"
              max="1.0"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              onMouseDown={handleInteractionEvent}
              className="w-full accent-emerald-500 nodrag nowheel"
              whileHover={{ scale: 1.01 }}
            />
          </div>

          {/* Max Tokens */}
          <div>
            <label className="text-xs text-emerald-600 mb-1 block">
              📝 Max Tokens: {maxTokens}
            </label>
            <motion.input
              type="range"
              min="100"
              max="4000"
              step="100"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              onMouseDown={handleInteractionEvent}
              className="w-full accent-emerald-500 nodrag nowheel"
              whileHover={{ scale: 1.01 }}
            />
          </div>
        </div>

        {/* System Prompt */}
        <div className="mb-4">
          <label className="text-xs font-medium text-emerald-700 mb-2 block">
            🎭 System Prompt
          </label>
          <motion.textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            onMouseDown={handleInteractionEvent}
            placeholder="You are a helpful assistant..."
            className="w-full p-2 text-xs border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 nodrag resize-none"
            rows={2}
            whileFocus={{ scale: 1.01 }}
          />
        </div>

        {/* Process Query Button */}
        <motion.button
          ref={chatButtonRef}
          onClick={() => processChatQuery()}
          onMouseDown={handleInteractionEvent}
          disabled={isProcessing || !textInput.trim() || !apiConfig || !selectedModel || vectorizedData.length === 0}
          className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 mb-3 nodrag ${
            isProcessing || !textInput.trim() || !apiConfig || !selectedModel || vectorizedData.length === 0
              ? 'bg-emerald-200 text-emerald-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg'
          }`}
          whileHover={{
            scale: isProcessing || !textInput.trim() || !apiConfig || !selectedModel || vectorizedData.length === 0 ? 1 : 1.02,
            boxShadow: isProcessing || !textInput.trim() || !apiConfig || !selectedModel || vectorizedData.length === 0 ? undefined : "0 8px 20px rgba(16, 185, 129, 0.3)"
          }}
          whileTap={{ scale: isProcessing || !textInput.trim() || !apiConfig || !selectedModel || vectorizedData.length === 0 ? 1 : 0.98 }}
        >
          <div className="flex items-center justify-center space-x-2">
            {isProcessing ? (
              <>
                <motion.div
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span>Processing Query...</span>
              </>
            ) : (
              <>
                <span>💬</span>
                <span>Process Query</span>
              </>
            )}
          </div>
        </motion.button>

        {/* **DEBUG INFO - TEMPORARY** */}
        {(!apiConfig || vectorizedData.length === 0) && (
          <div className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
            <div className="font-medium text-yellow-800 mb-1">🐛 Debug Info</div>
            <div>Connected edges: {getEdges().filter(e => e.target === id).length}</div>
            <div>Check attempts: {dataCheckCounter}</div>
            <div>Has API config: {apiConfig ? 'Yes' : 'No'}</div>
            <div>Vector sources: {vectorizedData.length}</div>
            <div>Selected model: {selectedModel || 'None'}</div>
            <div>Query length: {textInput.length} chars</div>
            <div>Conversation messages: {conversation.length}</div>
          </div>
        )}

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-3"
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              ❌ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Results */}
        <AnimatePresence>
          {chatStats && (
            <motion.div
              className="text-xs bg-white border border-emerald-200 rounded-lg overflow-hidden shadow-lg nowheel"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onMouseDown={handleInteractionEvent}
            >
              <motion.div
                className="bg-gradient-to-r from-emerald-50 to-teal-50 p-3 cursor-pointer hover:from-emerald-100 hover:to-teal-100 transition-all duration-300 nodrag"
                onClick={() => setIsExpanded(!isExpanded)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-emerald-800">
                    ✅ Chat Active ({chatStats.conversationLength} messages)
                  </div>
                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="text-emerald-600"
                  >
                    ▼
                  </motion.span>
                </div>
                <div className="text-emerald-700 text-xs mt-1">
                  {chatStats.relevantChunks} relevant chunks from {chatStats.totalSources} sources
                </div>
              </motion.div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className="max-h-64 overflow-y-auto bg-white p-2 nowheel"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    onMouseDown={handleInteractionEvent}
                  >
                    {/* Chat Statistics */}
                    <div className="mb-3">
                      <div className="font-medium text-emerald-700 mb-1">📊 Chat Statistics</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-emerald-600">Model:</span>
                          <span className="text-emerald-500 bg-emerald-100 px-1 rounded">{chatStats.model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-emerald-600">Messages:</span>
                          <span className="text-emerald-500 bg-emerald-100 px-1 rounded">{chatStats.conversationLength}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-emerald-600">Total sources:</span>
                          <span className="text-emerald-500 bg-emerald-100 px-1 rounded">{chatStats.totalSources}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-emerald-600">Available chunks:</span>
                          <span className="text-emerald-500 bg-emerald-100 px-1 rounded">{chatStats.totalChunks}</span>
                        </div>
                      </div>
                    </div>

                    {/* Recent Sources */}
                    <div>
                      <div className="font-medium text-emerald-700 mb-1">📄 Recent Sources Used</div>
                      {conversation
                        .filter(msg => msg.relevantChunks && msg.relevantChunks.length > 0)
                        .slice(-3)
                        .map((msg, index) => (
                          <div key={index} className="mb-2">
                            <div className="text-xs text-emerald-600 font-medium">
                              Query: {msg.content?.substring(0, 50)}...
                            </div>
                            {msg.relevantChunks.slice(0, 3).map((chunk, chunkIndex) => (
                              <motion.div
                                key={chunkIndex}
                                className="flex items-center space-x-2 py-1 hover:bg-emerald-50 rounded transition-colors ml-2"
                                whileHover={{ scale: 1.01, x: 4 }}
                              >
                                <span className="text-sm">📄</span>
                                <span className="text-xs text-emerald-700 flex-1 truncate">{chunk.sourceFile}</span>
                                <span className="text-xs text-emerald-500 bg-emerald-100 px-1 rounded">
                                  {(chunk.similarity * 100).toFixed(1)}%
                                </span>
                              </motion.div>
                            ))}
                          </div>
                        ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

            {/* **FIXED: Output Handle** */}
            <Handle
              type="source"
              position={Position.Right}
              id="output"
              style={{
                background: 'linear-gradient(45deg, #10b981, #3b82f6)',
                width: '16px',
                height: '16px',
                border: '3px solid white',
                borderRadius: '50%',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
                right: '-8px'
              }}
              isConnectable={isConnectable}
            />
          </motion.div>
        );
      };

      export default ChatNode;
      