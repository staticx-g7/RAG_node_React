import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import PlayButton from '../../ui/PlayButton';

// Simplified Background Beams
const BackgroundBeams = ({ className }) => (
  <div className={`absolute inset-0 pointer-events-none ${className}`}>
    <svg className="absolute inset-0 h-full w-full opacity-20" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="chunk-beams" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M0 40L40 0H20L0 20M40 40V20L20 40" stroke="rgba(156, 163, 175, 0.1)" fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#chunk-beams)" />
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

const ChunkNode = ({ id, data, isConnectable, selected }) => {
  const [inputData, setInputData] = useState(data?.inputData || null);
  const [chunkedData, setChunkedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [dataCheckCounter, setDataCheckCounter] = useState(0);

  // Chunking configuration
  const [chunkingStrategy, setChunkingStrategy] = useState('recursive');
  const [chunkSize, setChunkSize] = useState(300);
  const [overlap, setOverlap] = useState(45);
  const [preserveMetadata, setPreserveMetadata] = useState(true);
  const [smartBoundaries, setSmartBoundaries] = useState(true);

  const { setNodes, getNodes, getEdges } = useReactFlow();
  const chunkButtonRef = useRef(null);
  const updateTimeoutRef = useRef(null);

  // **CHAIN REACTION FUNCTIONALITY**
  const triggerNextNodes = useCallback(async (currentNodeId) => {
    const edges = getEdges();
    const nodes = getNodes();

    const outgoingEdges = edges.filter(edge => edge.source === currentNodeId);

    if (outgoingEdges.length > 0) {
      console.log(`🔗 ChunkNode: Found ${outgoingEdges.length} connected node(s) to trigger`);

      for (let i = 0; i < outgoingEdges.length; i++) {
        const edge = outgoingEdges[i];
        const targetNode = nodes.find(node => node.id === edge.target);

        if (targetNode) {
          console.log(`🎯 ChunkNode: Triggering ${targetNode.type} node ${edge.target}`);

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
      console.log(`⏹️ ChunkNode: No connected nodes found after chunking`);
    }
  }, [getEdges, getNodes]);

  // Chunking strategies
  const chunkingStrategies = [
    {
      id: 'fixed',
      name: 'Fixed Size',
      icon: '📏',
      description: 'Split by character/token count with overlap',
      bestFor: 'Uniform content, simple processing'
    },
    {
      id: 'recursive',
      name: 'Recursive',
      icon: '🔄',
      description: 'Split using separators until target size',
      bestFor: 'Most content types, preserves structure'
    },
    {
      id: 'semantic',
      name: 'Semantic',
      icon: '🧠',
      description: 'Split by meaning and context',
      bestFor: 'Documentation, articles, books'
    },
    {
      id: 'code',
      name: 'Code-Aware',
      icon: '💻',
      description: 'Split by functions, classes, modules',
      bestFor: 'Programming files, scripts'
    },
    {
      id: 'hpc',
      name: 'HPC-Optimized',
      icon: '🖥️',
      description: 'Split for scientific/HPC content',
      bestFor: 'Job scripts, configs, scientific data'
    }
  ];

  // **UNIVERSAL CHUNKING ENGINE**
  const createChunks = useCallback(async (content, strategy, size, overlap, fileInfo) => {
    const chunks = [];
    const fileName = fileInfo.name.toLowerCase();
    const ext = fileInfo.extension || '';
    const parser = fileInfo.detectedType || 'text';

    try {
      switch (strategy) {
        case 'fixed':
          for (let i = 0; i < content.length; i += (size - overlap)) {
            const chunk = content.slice(i, i + size);
            if (chunk.trim()) {
              chunks.push({
                id: `${fileInfo.name}_fixed_${chunks.length}`,
                content: chunk.trim(),
                startIndex: i,
                endIndex: Math.min(i + size, content.length),
                strategy: 'fixed',
                metadata: {
                  fileName: fileInfo.name,
                  filePath: fileInfo.path,
                  chunkIndex: chunks.length,
                  parser,
                  size: chunk.length
                }
              });
            }
            if (i + size >= content.length) break;
          }
          break;

        case 'recursive':
          const separators = smartBoundaries ?
            getSmartSeparators(ext, parser) :
            ['\n\n', '\n', '. ', ' ', ''];

          const recursiveChunks = recursiveChunk(content, size, overlap, separators, fileInfo);
          chunks.push(...recursiveChunks);
          break;

        case 'semantic':
          const semanticChunks = await semanticChunk(content, size, fileInfo, parser);
          chunks.push(...semanticChunks);
          break;

        case 'code':
          const codeChunks = await codeAwareChunk(content, size, fileInfo, ext);
          chunks.push(...codeChunks);
          break;

        case 'hpc':
          const hpcChunks = await hpcOptimizedChunk(content, size, fileInfo, ext);
          chunks.push(...hpcChunks);
          break;

        default:
          const fallbackChunks = recursiveChunk(content, size, overlap, ['\n\n', '\n', '. ', ' '], fileInfo);
          chunks.push(...fallbackChunks);
      }

      return chunks.map((chunk, index) => ({
        ...chunk,
        id: chunk.id || `${fileInfo.name}_${strategy}_${index}`,
        chunkIndex: index,
        totalChunks: chunks.length,
        strategy,
        createdAt: new Date().toISOString()
      }));

    } catch (error) {
      console.error(`❌ ChunkNode: Error chunking ${fileInfo.name}:`, error);
      return [{
        id: `${fileInfo.name}_fallback_0`,
        content: content.slice(0, size),
        strategy: 'fallback',
        metadata: { fileName: fileInfo.name, error: error.message }
      }];
    }
  }, [smartBoundaries]);

  // **SMART SEPARATORS BASED ON FILE TYPE**
  const getSmartSeparators = useCallback((ext, parser) => {
    const separatorMap = {
      'js': ['\nfunction ', '\nclass ', '\nconst ', '\nlet ', '\n\n', '\n', '. ', ' '],
      'jsx': ['\nfunction ', '\nconst ', '\nexport ', '\nimport ', '\n\n', '\n', '. ', ' '],
      'ts': ['\ninterface ', '\ntype ', '\nfunction ', '\nclass ', '\n\n', '\n', '. ', ' '],
      'tsx': ['\ninterface ', '\ntype ', '\nfunction ', '\nexport ', '\n\n', '\n', '. ', ' '],
      'py': ['\ndef ', '\nclass ', '\nimport ', '\nfrom ', '\n\n', '\n', '. ', ' '],
      'java': ['\npublic class ', '\nprivate ', '\npublic ', '\n\n', '\n', '. ', ' '],
      'cpp': ['\nclass ', '\nvoid ', '\nint ', '\n#include', '\n\n', '\n', '. ', ' '],
      'c': ['\nvoid ', '\nint ', '\n#include', '\n\n', '\n', '. ', ' '],
      'md': ['\n## ', '\n### ', '\n#### ', '\n\n', '\n', '. ', ' '],
      'html': ['\n<div', '\n<section', '\n<article', '\n\n', '\n', '. ', ' '],
      'xml': ['\n<', '\n\n', '\n', '. ', ' '],
      'json': ['\n  "', '\n    "', '\n\n', '\n', ', ', ' '],
      'yml': ['\n- ', '\n  ', '\n\n', '\n', ': ', ' '],
      'yaml': ['\n- ', '\n  ', '\n\n', '\n', ': ', ' '],
      'eb': ['\neasyblock', '\ntoolchain', '\ndependencies', '\n\n', '\n', '. ', ' '],
      'slurm': ['\n#SBATCH', '\nmodule ', '\nsrun ', '\n\n', '\n', '. ', ' '],
      'pbs': ['\n#PBS', '\nmodule ', '\nqsub ', '\n\n', '\n', '. ', ' '],
      'ini': ['\n[', '\n\n', '\n', '= ', ' '],
      'conf': ['\n[', '\n\n', '\n', '= ', ' '],
      'cfg': ['\n[', '\n\n', '\n', '= ', ' '],
      'default': ['\n\n', '\n', '. ', ' ', '']
    };

    return separatorMap[ext] || separatorMap[parser] || separatorMap.default;
  }, []);

  // **RECURSIVE CHUNKING IMPLEMENTATION**
  const recursiveChunk = useCallback((text, maxSize, overlap, separators, fileInfo) => {
    if (!separators.length || text.length <= maxSize) {
      return [{
        id: `${fileInfo.name}_recursive_0`,
        content: text,
        strategy: 'recursive',
        metadata: { fileName: fileInfo.name, filePath: fileInfo.path }
      }];
    }

    const [separator, ...restSeparators] = separators;
    const splits = text.split(separator);
    const chunks = [];
    let currentChunk = '';

    splits.forEach((split, index) => {
      const potentialChunk = currentChunk + (currentChunk ? separator : '') + split;

      if (potentialChunk.length <= maxSize) {
        currentChunk = potentialChunk;
      } else {
        if (currentChunk) {
          chunks.push({
            id: `${fileInfo.name}_recursive_${chunks.length}`,
            content: currentChunk,
            strategy: 'recursive',
            separator: separator,
            metadata: { fileName: fileInfo.name, filePath: fileInfo.path }
          });
        }

        if (split.length > maxSize) {
          const subChunks = recursiveChunk(split, maxSize, overlap, restSeparators, fileInfo);
          chunks.push(...subChunks);
          currentChunk = '';
        } else {
          currentChunk = split;
        }
      }
    });

    if (currentChunk) {
      chunks.push({
        id: `${fileInfo.name}_recursive_${chunks.length}`,
        content: currentChunk,
        strategy: 'recursive',
        metadata: { fileName: fileInfo.name, filePath: fileInfo.path }
      });
    }

    return chunks;
  }, []);

  // **SEMANTIC CHUNKING IMPLEMENTATION**
  const semanticChunk = useCallback(async (text, maxSize, fileInfo, parser) => {
    const chunks = [];

    if (parser === 'markdown') {
      const sections = text.split(/\n(?=#{1,6}\s)/);
      sections.forEach((section, index) => {
        if (section.trim()) {
          if (section.length > maxSize) {
            const paragraphs = section.split('\n\n');
            let currentChunk = '';

            paragraphs.forEach(paragraph => {
              if ((currentChunk + '\n\n' + paragraph).length > maxSize) {
                if (currentChunk) {
                  chunks.push({
                    id: `${fileInfo.name}_semantic_${chunks.length}`,
                    content: currentChunk.trim(),
                    strategy: 'semantic',
                    type: 'section',
                    metadata: { fileName: fileInfo.name, sectionIndex: index }
                  });
                }
                currentChunk = paragraph;
              } else {
                currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
              }
            });

            if (currentChunk.trim()) {
              chunks.push({
                id: `${fileInfo.name}_semantic_${chunks.length}`,
                content: currentChunk.trim(),
                strategy: 'semantic',
                type: 'section',
                metadata: { fileName: fileInfo.name, sectionIndex: index }
              });
            }
          } else {
            chunks.push({
              id: `${fileInfo.name}_semantic_${index}`,
              content: section.trim(),
              strategy: 'semantic',
              type: 'complete_section',
              metadata: { fileName: fileInfo.name, sectionIndex: index }
            });
          }
        }
      });
    } else {
      const paragraphs = text.split(/\n\s*\n/);
      let currentChunk = '';

      paragraphs.forEach(paragraph => {
        if ((currentChunk + '\n\n' + paragraph).length > maxSize) {
          if (currentChunk) {
            chunks.push({
              id: `${fileInfo.name}_semantic_${chunks.length}`,
              content: currentChunk.trim(),
              strategy: 'semantic',
              type: 'paragraph_group',
              metadata: { fileName: fileInfo.name }
            });
          }
          currentChunk = paragraph;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
      });

      if (currentChunk.trim()) {
        chunks.push({
          id: `${fileInfo.name}_semantic_${chunks.length}`,
          content: currentChunk.trim(),
          strategy: 'semantic',
          type: 'paragraph_group',
          metadata: { fileName: fileInfo.name }
        });
      }
    }

    return chunks;
  }, []);

  // **CODE-AWARE CHUNKING**
  const codeAwareChunk = useCallback(async (text, maxSize, fileInfo, ext) => {
    const chunks = [];

    const codePatterns = {
      'js': /(?:^|\n)(function\s+\w+.*?(?:\n.*?)*?(?=\n(?:function|\n|$)))/gm,
      'jsx': /(?:^|\n)((?:export\s+)?(?:function|const)\s+\w+.*?(?:\n.*?)*?(?=\n(?:export|function|const|\n|$)))/gm,
      'py': /(?:^|\n)((?:def|class)\s+\w+.*?(?:\n.*?)*?(?=\n(?:def|class|\n|$)))/gm,
      'java': /(?:^|\n)((?:public|private|protected)?\s*(?:class|interface|enum)\s+\w+.*?(?:\n.*?)*?(?=\n(?:public|private|protected|\n|$)))/gm,
    };

    const pattern = codePatterns[ext];

    if (pattern) {
      const matches = text.match(pattern) || [];
      const remainingText = text.replace(pattern, '').trim();

      matches.forEach((match, index) => {
        if (match.trim()) {
          chunks.push({
            id: `${fileInfo.name}_code_${index}`,
            content: match.trim(),
            strategy: 'code',
            type: ext === 'py' ? (match.includes('class ') ? 'class' : 'function') : 'code_block',
            metadata: { fileName: fileInfo.name, language: ext }
          });
        }
      });

      if (remainingText) {
        const remainingChunks = recursiveChunk(remainingText, maxSize, 0, ['\n\n', '\n'], fileInfo);
        remainingChunks.forEach((chunk, index) => {
          chunks.push({
            ...chunk,
            id: `${fileInfo.name}_code_remaining_${index}`,
            strategy: 'code',
            type: 'imports_and_variables'
          });
        });
      }
    } else {
      const fallbackChunks = recursiveChunk(text, maxSize, 0, ['\n\n', '\n', '. ', ' '], fileInfo);
      chunks.push(...fallbackChunks.map(chunk => ({ ...chunk, strategy: 'code', type: 'generic' })));
    }

    return chunks;
  }, [recursiveChunk]);

  // **HPC-OPTIMIZED CHUNKING**
  const hpcOptimizedChunk = useCallback(async (text, maxSize, fileInfo, ext) => {
    const chunks = [];

    if (ext === 'eb') {
      const sections = text.split(/\n(?=(?:easyblock|name|version|toolchain|dependencies|sanity_check))/);
      sections.forEach((section, index) => {
        if (section.trim()) {
          chunks.push({
            id: `${fileInfo.name}_eb_${index}`,
            content: section.trim(),
            strategy: 'hpc',
            type: 'easybuild_section',
            metadata: { fileName: fileInfo.name, sectionType: section.split('=')[0]?.trim() }
          });
        }
      });
    } else if (ext === 'slurm' || text.includes('#SBATCH')) {
      const sbatchSection = text.match(/#SBATCH.*?(?=\n[^#])/s)?.[0] || '';
      const moduleSection = text.match(/module.*?(?=\n(?!module))/gms)?.join('\n') || '';
      const commandSection = text.replace(/#SBATCH.*?(?=\n[^#])/s, '').replace(/module.*?(?=\n(?!module))/gms, '').trim();

      if (sbatchSection) chunks.push({
        id: `${fileInfo.name}_slurm_sbatch`,
        content: sbatchSection,
        strategy: 'hpc',
        type: 'slurm_directives',
        metadata: { fileName: fileInfo.name }
      });

      if (moduleSection) chunks.push({
        id: `${fileInfo.name}_slurm_modules`,
        content: moduleSection,
        strategy: 'hpc',
        type: 'module_loads',
        metadata: { fileName: fileInfo.name }
      });

      if (commandSection) chunks.push({
        id: `${fileInfo.name}_slurm_commands`,
        content: commandSection,
        strategy: 'hpc',
        type: 'execution_commands',
        metadata: { fileName: fileInfo.name }
      });
    } else {
      const hpcChunks = recursiveChunk(text, maxSize, 0, ['\n\n', '\n', '. ', ' '], fileInfo);
      chunks.push(...hpcChunks.map(chunk => ({ ...chunk, strategy: 'hpc', type: 'generic_hpc' })));
    }

    return chunks;
  }, [recursiveChunk]);

  // **DEBOUNCED NODE DATA UPDATE**
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
                inputData,
                chunkedData,
                chunkingStrategy,
                chunkSize,
                overlap,
                preserveMetadata,
                smartBoundaries,
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
  }, [inputData, chunkedData, chunkingStrategy, chunkSize, overlap, preserveMetadata, smartBoundaries, id, setNodes]);

  // **ENHANCED DATA DETECTION**
  useEffect(() => {
    const checkForInputData = () => {
      try {
        const edges = getEdges();
        const nodes = getNodes();

        console.log(`🔍 ChunkNode ${id}: Checking for input data (attempt #${dataCheckCounter})`);

        const incomingEdges = edges.filter(edge => edge.target === id);

        if (incomingEdges.length > 0) {
          const sourceEdge = incomingEdges[0];
          const sourceNode = nodes.find(node => node.id === sourceEdge.source);

          if (sourceNode && sourceNode.data) {
            const possibleData = [
              sourceNode.data.parsedData,
              sourceNode.data.filteredData,
              sourceNode.data.repoData
            ].find(data => data && (data.parsedFiles || data.contents));

            if (possibleData) {
              const fileCount = possibleData.parsedFiles?.length || possibleData.contents?.length || 0;
              console.log(`✅ ChunkNode ${id}: Found data with ${fileCount} items`);
              setInputData(possibleData);
              return;
            }
          }
        }

        console.log(`⚠️ ChunkNode ${id}: No valid input data found`);
      } catch (error) {
        console.error(`❌ ChunkNode ${id}: Error checking input data:`, error);
      }
    };

    checkForInputData();
  }, [getEdges, getNodes, id, dataCheckCounter]);

  // **PERIODIC DATA CHECK WHEN WAITING**
  useEffect(() => {
    if (!inputData) {
      const interval = setInterval(() => {
        console.log(`🔍 ChunkNode ${id}: Periodic data check #${dataCheckCounter}`);
        setDataCheckCounter(prev => prev + 1);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [inputData, dataCheckCounter, id]);

  // **MAIN CHUNKING PROCESS**
  const processChunks = useCallback(async () => {
    if (!inputData || !inputData.parsedFiles) {
      console.log(`⚠️ ChunkNode ${id}: No parsed data to chunk`);
      return;
    }

    setIsProcessing(true);
    setError(null);
    console.log(`🔄 ChunkNode ${id}: Starting chunking with ${chunkingStrategy} strategy`);

    try {
      const chunkedFiles = [];
      let totalChunks = 0;

      for (const parsedFile of inputData.parsedFiles) {
        const content = parsedFile.content.raw;
        if (!content || content.trim().length === 0) continue;

        console.log(`📄 ChunkNode ${id}: Chunking ${parsedFile.file.name} (${content.length} chars)`);

        const chunks = await createChunks(
          content,
          chunkingStrategy,
          chunkSize,
          overlap,
          parsedFile.file
        );

        const processedFile = {
          originalFile: parsedFile.file,
          parser: parsedFile.parser,
          chunks: chunks,
          chunkCount: chunks.length,
          originalSize: content.length,
          metadata: preserveMetadata ? parsedFile.metadata : null
        };

        chunkedFiles.push(processedFile);
        totalChunks += chunks.length;

        console.log(`✅ ChunkNode ${id}: Created ${chunks.length} chunks for ${parsedFile.file.name}`);
      }

      const result = {
        ...inputData,
        chunkedFiles: chunkedFiles,
        totalChunks: totalChunks,
        chunkingConfig: {
          strategy: chunkingStrategy,
          chunkSize,
          overlap,
          preserveMetadata,
          smartBoundaries
        },
        chunkedAt: new Date().toISOString()
      };

      setChunkedData(result);
      console.log(`✨ ChunkNode ${id}: Chunking complete! ${chunkedFiles.length} files → ${totalChunks} chunks`);

      await new Promise(resolve => setTimeout(resolve, 500));
      await triggerNextNodes(id);

    } catch (error) {
      console.error(`❌ ChunkNode ${id}: Chunking failed:`, error);
      setError(`Chunking failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [inputData, chunkingStrategy, chunkSize, overlap, preserveMetadata, smartBoundaries, id, createChunks, triggerNextNodes]);

  // **NODE EXECUTION HANDLER**
  const handleNodeExecution = useCallback(async (inputData) => {
    console.log(`🎯 ChunkNode ${id}: Executing with input data:`, inputData);

    try {
      Object.values(inputData).forEach(data => {
        if (data.parsedFiles) {
          console.log(`📥 ChunkNode ${id}: Processing parsed data from connected ParseNode`);
          setInputData(data);
        }
      });

      if (inputData && Object.keys(inputData).length > 0) {
        console.log(`🔄 ChunkNode ${id}: Auto-chunking after receiving data`);
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (chunkButtonRef.current && !isProcessing) {
          console.log(`✅ ChunkNode ${id}: Triggering chunk button`);
          chunkButtonRef.current.click();
        } else {
          await processChunks();
        }
      }
    } catch (error) {
      console.error(`❌ ChunkNode ${id}: Error during execution:`, error);
    }
  }, [id, processChunks, isProcessing]);

  // **AUTO-EXECUTION EVENT LISTENER**
  useEffect(() => {
    const handleAutoExecution = (event) => {
      if (event.detail.nodeId === id) {
        console.log(`🎯 ChunkNode ${id}: Auto-triggered for execution`);

        if (chunkButtonRef.current && !isProcessing && inputData) {
          console.log(`✅ ChunkNode ${id}: Triggering chunk button click`);
          chunkButtonRef.current.click();
          return;
        }

        if (inputData && !isProcessing) {
          console.log(`✅ ChunkNode ${id}: Direct function call for auto-execution`);
          processChunks();
        } else {
          console.log(`⚠️ ChunkNode ${id}: Cannot auto-execute - no input data available or processing`);
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
  }, [id, inputData, isProcessing, processChunks]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('deleteNode', { detail: { id } }));
  }, [id]);

  const handleInteractionEvent = useCallback((e) => {
    e.stopPropagation();
  }, []);

  // **CHUNK STATISTICS**
  const chunkStats = useMemo(() => {
    if (!chunkedData) return null;

    const totalFiles = chunkedData.chunkedFiles.length;
    const totalChunks = chunkedData.totalChunks;
    const avgChunksPerFile = totalFiles > 0 ? (totalChunks / totalFiles).toFixed(1) : 0;

    const strategyCounts = {};
    chunkedData.chunkedFiles.forEach(file => {
      file.chunks.forEach(chunk => {
        strategyCounts[chunk.strategy] = (strategyCounts[chunk.strategy] || 0) + 1;
      });
    });

    return {
      totalFiles,
      totalChunks,
      avgChunksPerFile,
      strategyCounts
    };
  }, [chunkedData]);

  return (
    <motion.div
      className={`relative w-96 bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 border-2 border-rose-200 rounded-xl shadow-lg group nowheel overflow-visible ${
        selected ? 'ring-2 ring-rose-300' : ''
      }`}
      style={{ minHeight: '600px' }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onPointerDown={(e) => {
        if (e.target.closest('input, button, select, .nowheel, .nodrag')) {
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
          nodeType="chunk"
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

      {/* **FIXED: Input Handle** */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{
          background: 'linear-gradient(45deg, #f43f5e, #ec4899)',
          width: '16px',
          height: '16px',
          border: '3px solid white',
          borderRadius: '50%',
          boxShadow: '0 2px 8px rgba(244, 63, 94, 0.4)',
          left: '-8px'
        }}
        isConnectable={isConnectable}
      />

      <div className="p-4 pt-8 nowheel">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-4">
          <FloatingIcon isProcessing={isProcessing}>
            <span className="text-xl">🧩</span>
          </FloatingIcon>
          <h3 className="text-sm font-semibold text-rose-800">
            Universal Chunker
          </h3>
        </div>

        {/* Chunking Strategy Selection */}
        <div className="mb-4">
          <label className="text-xs font-medium text-rose-700 mb-2 block">
            🧠 Chunking Strategy
          </label>
          <motion.select
            value={chunkingStrategy}
            onChange={(e) => setChunkingStrategy(e.target.value)}
            className="w-full p-2 text-xs border border-rose-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 bg-gradient-to-r from-rose-50 to-pink-50 text-rose-800 nodrag"
            whileFocus={{ scale: 1.01 }}
            onMouseDown={handleInteractionEvent}
          >
            {chunkingStrategies.map(strategy => (
              <option key={strategy.id} value={strategy.id}>
                {strategy.icon} {strategy.name} - {strategy.bestFor}
              </option>
            ))}
          </motion.select>
          <div className="text-xs text-rose-600 mt-1">
            {chunkingStrategies.find(s => s.id === chunkingStrategy)?.description}
          </div>
        </div>

        {/* **FIXED: Chunk Size Control with nodrag** */}
        <div className="mb-4">
          <label className="text-xs font-medium text-rose-700 mb-2 block">
            📏 Chunk Size: {chunkSize} characters
          </label>
          <motion.input
            type="range"
            min="100"
            max="2000"
            step="50"
            value={chunkSize}
            onChange={(e) => setChunkSize(parseInt(e.target.value))}
            onMouseDown={handleInteractionEvent}
            className="w-full accent-rose-500 nodrag nowheel"
            whileHover={{ scale: 1.01 }}
          />
          <div className="flex justify-between text-xs text-rose-600 mt-1">
            <span>Small (100)</span>
            <span>Recommended: 200-500</span>
            <span>Large (2000)</span>
          </div>
        </div>

        {/* **FIXED: Overlap Control with nodrag** */}
        <div className="mb-4">
          <label className="text-xs font-medium text-rose-700 mb-2 block">
            🔄 Overlap: {overlap} characters ({((overlap / chunkSize) * 100).toFixed(0)}%)
          </label>
          <motion.input
            type="range"
            min="0"
            max={Math.min(chunkSize * 0.5, 500)}
            step="5"
            value={overlap}
            onChange={(e) => setOverlap(parseInt(e.target.value))}
            onMouseDown={handleInteractionEvent}
            className="w-full accent-rose-500 nodrag nowheel"
            whileHover={{ scale: 1.01 }}
          />
          <div className="text-xs text-rose-600 mt-1">
            Recommended: 15% overlap ({Math.round(chunkSize * 0.15)} chars)
          </div>
        </div>

        {/* Advanced Options */}
        <div className="mb-4 space-y-2">
          <label className="text-xs font-medium text-rose-700 block">⚙️ Advanced Options</label>

          <motion.label
            className="flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs bg-gradient-to-r from-pink-50 to-rose-50 hover:from-pink-100 hover:to-rose-100 text-pink-700 border border-pink-200 nodrag"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <motion.input
              type="checkbox"
              checked={preserveMetadata}
              onChange={(e) => setPreserveMetadata(e.target.checked)}
              onMouseDown={handleInteractionEvent}
              className="w-3 h-3 text-pink-600 rounded focus:ring-pink-500 nodrag"
              whileHover={{ scale: 1.1 }}
            />
            <span>📊 Preserve File Metadata</span>
          </motion.label>

          <motion.label
            className="flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 text-red-700 border border-red-200 nodrag"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <motion.input
              type="checkbox"
              checked={smartBoundaries}
              onChange={(e) => setSmartBoundaries(e.target.checked)}
              onMouseDown={handleInteractionEvent}
              className="w-3 h-3 text-red-600 rounded focus:ring-red-500 nodrag"
              whileHover={{ scale: 1.1 }}
            />
            <span>🧠 Smart Content Boundaries</span>
          </motion.label>
        </div>

        {/* Chunk Button */}
        <motion.button
          ref={chunkButtonRef}
          onClick={processChunks}
          onMouseDown={handleInteractionEvent}
          disabled={isProcessing || !inputData}
          className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 mb-3 nodrag ${
            isProcessing || !inputData
              ? 'bg-rose-200 text-rose-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg'
          }`}
          whileHover={{
            scale: isProcessing || !inputData ? 1 : 1.02,
            boxShadow: isProcessing || !inputData ? undefined : "0 8px 20px rgba(244, 63, 94, 0.3)"
          }}
          whileTap={{ scale: isProcessing || !inputData ? 1 : 0.98 }}
        >
          <div className="flex items-center justify-center space-x-2">
            {isProcessing ? (
              <>
                <motion.div
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span>Chunking Files...</span>
              </>
            ) : (
              <>
                <span>🧩</span>
                <span>Create Chunks</span>
              </>
            )}
          </div>
        </motion.button>

        {/* Connection Status */}
        <div className="mb-3">
          <div
            className={`text-xs px-3 py-2 rounded-full inline-block transition-all duration-300 ${
              inputData
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-600 border border-rose-200'
            }`}
          >
            {inputData ? '🔗 Connected to ParseNode' : '⏸️ Waiting for parsed data'}
          </div>
        </div>

        {/* **DEBUG INFO - TEMPORARY** */}
        {!inputData && (
          <div className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
            <div className="font-medium text-yellow-800 mb-1">🐛 Debug Info</div>
            <div>Connected edges: {getEdges().filter(e => e.target === id).length}</div>
            <div>Check attempts: {dataCheckCounter}</div>
            <div>Source node data: {JSON.stringify(
              getNodes().find(n => n.id === getEdges().find(e => e.target === id)?.source)?.data?.parsedData ? 'Found' : 'Missing'
            )}</div>
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

        {/* Chunking Results */}
        <AnimatePresence>
          {chunkedData && chunkStats && (
            <motion.div
              className="text-xs bg-white border border-rose-200 rounded-lg overflow-hidden shadow-lg nowheel"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onMouseDown={handleInteractionEvent}
            >
              <motion.div
                className="bg-gradient-to-r from-rose-50 to-pink-50 p-3 cursor-pointer hover:from-rose-100 hover:to-pink-100 transition-all duration-300 nodrag"
                onClick={() => setIsExpanded(!isExpanded)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-rose-800">
                    ✅ Chunking Complete
                  </div>
                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="text-rose-600"
                  >
                    ▼
                  </motion.span>
                </div>
                <div className="text-rose-700 text-xs mt-1">
                  {chunkStats.totalFiles} files → {chunkStats.totalChunks} chunks (avg: {chunkStats.avgChunksPerFile})
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
                    {/* Strategy Breakdown */}
                    <div className="mb-3">
                      <div className="font-medium text-rose-700 mb-1">📊 Strategy Breakdown</div>
                      {Object.entries(chunkStats.strategyCounts).map(([strategy, count]) => (
                        <div key={strategy} className="flex justify-between text-xs py-1">
                          <span className="text-rose-600">
                            {chunkingStrategies.find(s => s.id === strategy)?.icon} {strategy}
                          </span>
                          <span className="text-rose-500 bg-rose-100 px-1 rounded">{count}</span>
                        </div>
                      ))}
                    </div>

                    {/* File Details */}
                    <div>
                      <div className="font-medium text-rose-700 mb-1">📄 Chunked Files</div>
                      {chunkedData.chunkedFiles.slice(0, 10).map((file, index) => (
                        <motion.div
                          key={index}
                          className="flex items-center space-x-2 py-1 hover:bg-rose-50 rounded transition-colors"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          whileHover={{ scale: 1.01, x: 4 }}
                        >
                          <span className="text-sm">📄</span>
                          <span className="text-xs text-rose-700 flex-1 truncate">{file.originalFile.name}</span>
                          <span className="text-xs text-rose-500 bg-rose-100 px-1 rounded">
                            {file.chunkCount} chunks
                          </span>
                        </motion.div>
                      ))}
                      {chunkedData.chunkedFiles.length > 10 && (
                        <div className="text-xs text-rose-500 text-center py-1">
                          ...and {chunkedData.chunkedFiles.length - 10} more files
                        </div>
                      )}
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

export default ChunkNode;
