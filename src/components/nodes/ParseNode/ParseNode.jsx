import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import PlayButton from '../../ui/PlayButton';

// Simplified Background Beams
const BackgroundBeams = ({ className }) => (
  <div className={`absolute inset-0 pointer-events-none ${className}`}>
    <svg className="absolute inset-0 h-full w-full opacity-20" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="parse-beams" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M0 40L40 0H20L0 20M40 40V20L20 40" stroke="rgba(156, 163, 175, 0.1)" fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#parse-beams)" />
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

const ParseNode = ({ id, data, isConnectable, selected }) => {
  const [inputData, setInputData] = useState(data?.inputData || null);
  const [parsedData, setParsedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Parse configuration
  const [selectedParsers, setSelectedParsers] = useState(new Set(['text', 'json', 'markdown', 'code']));
  const [preserveMetadata, setPreserveMetadata] = useState(true);
  const [extractCodeBlocks, setExtractCodeBlocks] = useState(true);
  const [normalizeWhitespace, setNormalizeWhitespace] = useState(true);
  const [parseAllFiles, setParseAllFiles] = useState(true);
  const [maxFileSize, setMaxFileSize] = useState(1024 * 1024); // 1MB limit

  const { setNodes, getNodes, getEdges } = useReactFlow();
  const parseButtonRef = useRef(null);
  const updateTimeoutRef = useRef(null);

  // **CHAIN REACTION FUNCTIONALITY**
  const triggerNextNodes = useCallback(async (currentNodeId) => {
    const edges = getEdges();
    const nodes = getNodes();

    const outgoingEdges = edges.filter(edge => edge.source === currentNodeId);

    if (outgoingEdges.length > 0) {
      console.log(`🔗 ParseNode: Found ${outgoingEdges.length} connected node(s) to trigger`);

      for (let i = 0; i < outgoingEdges.length; i++) {
        const edge = outgoingEdges[i];
        const targetNode = nodes.find(node => node.id === edge.target);

        if (targetNode) {
          console.log(`🎯 ParseNode: Triggering ${targetNode.type} node ${edge.target}`);

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
      console.log(`⏹️ ParseNode: No connected nodes found after parsing`);
    }
  }, [getEdges, getNodes]);

  // Available parsers for different file types
  const availableParsers = [
    {
      id: 'text',
      name: 'Plain Text',
      icon: '📄',
      description: 'Extract plain text content from any readable file',
      extensions: ['txt', 'md', 'rst', 'log', 'csv', 'tsv']
    },
    {
      id: 'json',
      name: 'JSON',
      icon: '📋',
      description: 'Parse JSON structure and content',
      extensions: ['json', 'jsonl', 'geojson']
    },
    {
      id: 'markdown',
      name: 'Markdown',
      icon: '📝',
      description: 'Parse markdown with structure preservation',
      extensions: ['md', 'markdown', 'mdown', 'mkd']
    },
    {
      id: 'code',
      name: 'Source Code',
      icon: '💻',
      description: 'Extract code with syntax awareness',
      extensions: ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'r', 'sh', 'bash', 'h', 'hpp']
    },
    {
      id: 'config',
      name: 'Configuration',
      icon: '⚙️',
      description: 'Parse config files (YAML, TOML, INI)',
      extensions: ['yml', 'yaml', 'toml', 'ini', 'env', 'conf', 'config']
    },
    {
      id: 'web',
      name: 'Web Files',
      icon: '🌐',
      description: 'Parse HTML, CSS, and web content',
      extensions: ['html', 'htm', 'css', 'scss', 'sass', 'less']
    },
    {
      id: 'data',
      name: 'Data Files',
      icon: '📊',
      description: 'Parse structured data files',
      extensions: ['xml', 'sql', 'graphql', 'proto']
    }
  ];

  // **FIXED: Fetch actual file content using GitLab Raw endpoint**
  const fetchFileContent = useCallback(async (file) => {
    if (!file || file.size === 0) {
      console.log(`⚠️ ParseNode ${id}: Skipping ${file.name} - zero bytes`);
      return null;
    }

    if (file.size > maxFileSize) {
      console.log(`⚠️ ParseNode ${id}: Skipping ${file.name} - too large (${file.size} bytes)`);
      return null;
    }

    try {
      console.log(`📄 ParseNode ${id}: Fetching content for ${file.name} (${file.size} bytes)`);

      let contentUrl;
      let headers = {};

      // Build proper content URL based on platform
      if (inputData.platform === 'github') {
        const repoPath = `${inputData.owner}/${inputData.repo}`;
        const branchParam = inputData.selectedBranch ? `?ref=${inputData.selectedBranch}` : '';
        contentUrl = `${inputData.endpoint}/repos/${repoPath}/contents/${file.path}${branchParam}`;

        if (inputData.apiKey) {
          headers['Authorization'] = `token ${inputData.apiKey}`;
        }
        headers['Accept'] = 'application/vnd.github.v3+json';

      } else if (inputData.platform === 'gitlab') {
        const projectPath = encodeURIComponent(`${inputData.owner}/${inputData.repo}`);
        const filePath = encodeURIComponent(file.path);
        const branchParam = inputData.selectedBranch || 'main';

        // **FIXED: Use GitLab Raw endpoint for direct file content**
        contentUrl = `${inputData.endpoint}/projects/${projectPath}/repository/files/${filePath}/raw?ref=${branchParam}`;

        if (inputData.apiKey) {
          headers['Authorization'] = `Bearer ${inputData.apiKey}`;
        }
        headers['Accept'] = 'text/plain';
      } else {
        throw new Error(`Unsupported platform: ${inputData.platform}`);
      }

      console.log(`📡 ParseNode ${id}: Fetching from ${contentUrl}`);

      const response = await fetch(contentUrl, { headers });

      if (!response.ok) {
        console.error(`❌ ParseNode ${id}: HTTP ${response.status} for ${file.name}: ${response.statusText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let content;
      if (inputData.platform === 'github') {
        // GitHub API returns JSON with base64 content
        const data = await response.json();
        if (data.encoding === 'base64') {
          content = atob(data.content.replace(/\s/g, ''));
        } else {
          content = data.content;
        }
      } else {
        // **FIXED: GitLab raw endpoint returns plain text directly**
        content = await response.text();
      }

      console.log(`✅ ParseNode ${id}: Fetched ${content.length} characters from ${file.name}`);
      return content;

    } catch (error) {
      console.error(`❌ ParseNode ${id}: Failed to fetch ${file.name}:`, error);
      return null;
    }
  }, [id, inputData, maxFileSize]);

  // **FIXED: Parse content based on file type - ALL STRING LITERAL ERRORS RESOLVED**
  const parseContent = useCallback((content, fileName, fileExtension, parserType) => {
    let parsedContent = {
      raw: content,
      structured: null,
      metadata: {}
    };

    try {
      switch (parserType) {
        case 'json':
          try {
            parsedContent.structured = JSON.parse(content);
            parsedContent.metadata.isValidJson = true;
            parsedContent.metadata.keys = Object.keys(parsedContent.structured).length;
          } catch (e) {
            parsedContent.metadata.jsonError = e.message;
            parsedContent.metadata.isValidJson = false;
          }
          break;

        case 'markdown':
          const markdownLines = content.split('\n');
          const headers = markdownLines.filter(line => line.match(/^#{1,6}\s/));
          // **FIXED: Properly escaped regex pattern for code blocks**
          const codeBlocks = content.match(/``````/g) || [];
          const links = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];

          parsedContent.structured = {
            headers: headers.map(h => ({ level: h.match(/^#+/)[0].length, text: h.replace(/^#+\s/, '') })),
            codeBlocks: codeBlocks.length,
            links: links.length,
            lineCount: markdownLines.length,
            wordCount: content.split(/\s+/).length
          };
          break;

        case 'code':
          const codeAnalysis = analyzeCode(content, fileExtension);
          parsedContent.structured = codeAnalysis;
          break;

        case 'config':
          parsedContent.structured = parseConfigFile(content, fileExtension);
          break;

        case 'web':
          if (fileExtension === 'html' || fileExtension === 'htm') {
            const tags = content.match(/<[^>]+>/g) || [];
            const scripts = content.match(/<script[\s\S]*?<\/script>/gi) || [];
            const styles = content.match(/<style[\s\S]*?<\/style>/gi) || [];

            parsedContent.structured = {
              tagCount: tags.length,
              scriptBlocks: scripts.length,
              styleBlocks: styles.length,
              hasDoctype: content.includes('<!DOCTYPE'),
              title: content.match(/<title>(.*?)<\/title>/i)?.[1] || null
            };
          } else if (fileExtension === 'css') {
            const rules = content.match(/[^{}]+\{[^{}]*\}/g) || [];
            const imports = content.match(/@import[^;]+;/g) || [];

            parsedContent.structured = {
              ruleCount: rules.length,
              importCount: imports.length,
              hasMediaQueries: content.includes('@media')
            };
          }
          break;

        case 'data':
          if (fileExtension === 'xml') {
            const tags = content.match(/<[^/>][^>]*>/g) || [];
            parsedContent.structured = {
              tagCount: tags.length,
              hasXmlDeclaration: content.includes('<?xml'),
              rootElement: content.match(/<([^>\s]+)/)?.[1] || null
            };
          } else if (fileExtension === 'csv') {
            const csvLines = content.split('\n').filter(line => line.trim());
            const headers = csvLines[0] ? csvLines[0].split(',').length : 0;

            parsedContent.structured = {
              rowCount: csvLines.length,
              columnCount: headers,
              estimatedHeaders: csvLines[0] ? csvLines[0].split(',') : []
            };
          }
          break;

        default: // text - **FIXED: Renamed variable to avoid conflict**
          const textLines = content.split('\n');
          parsedContent.structured = {
            lineCount: textLines.length,
            wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
            charCount: content.length,
            isEmpty: content.trim().length === 0,
            encoding: 'utf-8'
          };
      }

      // **FIXED: Extract code blocks if enabled - ALL STRING LITERAL ERRORS RESOLVED**
      const tripleBacktick = '```';
      if (extractCodeBlocks && (parserType === 'markdown' || content.includes(tripleBacktick))) {
        // **FIXED: Use proper regex pattern with escaped backticks**
        const codeBlockPattern = /``````/g;
        const extractedCodeBlocks = [];
        let match;

        while ((match = codeBlockPattern.exec(content)) !== null) {
          extractedCodeBlocks.push({
            index: extractedCodeBlocks.length,
            language: match[1] || 'unknown',
            code: match[2] || ''
          });
        }

        parsedContent.metadata.extractedCodeBlocks = extractedCodeBlocks;
      }

      // **FIXED: Normalize whitespace if enabled**
      if (normalizeWhitespace) {
        parsedContent.normalized = content
          .replace(/\r\n/g, '\n')
          .replace(/\t/g, '  ')
          .replace(/[ \t]+$/gm, '')
          .replace(/\n{3,}/g, '\n\n');
      }

    } catch (parseError) {
      console.error(`❌ ParseNode ${id}: Error parsing ${fileName}:`, parseError);
      parsedContent.metadata.parseError = parseError.message;
    }

    return parsedContent;
  }, [id, extractCodeBlocks, normalizeWhitespace]);

  // **FIXED: Analyze code files - ALL VARIABLE CONFLICTS RESOLVED**
  const analyzeCode = useCallback((content, extension) => {
    const codeLines = content.split('\n');
    let analysis = {
      lineCount: codeLines.length,
      emptyLines: codeLines.filter(line => line.trim() === '').length,
      commentLines: 0,
      functions: [],
      classes: [],
      imports: [],
      complexity: 0
    };

    try {
      switch (extension) {
        case 'js':
        case 'jsx':
        case 'ts':
        case 'tsx':
          analysis.functions = content.match(/(?:function\s+\w+|const\s+\w+\s*=\s*(?:$$[^)]*$$\s*)?=>|\w+\s*$$[^)]*$$\s*{)/g) || [];
          analysis.classes = content.match(/class\s+\w+/g) || [];
          analysis.imports = content.match(/import\s+.*?from\s+['"][^'"]+['"]|require\s*$$\s*['"][^'"]+['"]\s*$$/g) || [];
          analysis.commentLines = codeLines.filter(line => line.trim().startsWith('//') || line.trim().startsWith('/*')).length;
          break;

        case 'py':
          analysis.functions = content.match(/def\s+\w+\s*$$/g) || [];
          analysis.classes = content.match(/class\s+\w+/g) || [];
          analysis.imports = content.match(/(?:import\s+\w+|from\s+\w+\s+import)/g) || [];
          analysis.commentLines = codeLines.filter(line => line.trim().startsWith('#')).length;
          break;

        case 'java':
        case 'cs':
          analysis.functions = content.match(/(?:public|private|protected)?\s*(?:static\s+)?(?:\w+\s+)*\w+\s*$$[^)]*$$\s*{/g) || [];
          analysis.classes = content.match(/(?:public\s+)?class\s+\w+/g) || [];
          analysis.imports = content.match(/import\s+[\w.]+;|using\s+[\w.]+;/g) || [];
          analysis.commentLines = codeLines.filter(line => line.trim().startsWith('//') || line.trim().startsWith('/*')).length;
          break;

        case 'cpp':
        case 'c':
        case 'h':
        case 'hpp':
          analysis.functions = content.match(/(?:\w+\s+)*\w+\s*$$[^)]*$$\s*{/g) || [];
          analysis.classes = content.match(/class\s+\w+/g) || [];
          analysis.imports = content.match(/#include\s*[<"][^>"]+[>"]/g) || [];
          analysis.commentLines = codeLines.filter(line => line.trim().startsWith('//') || line.trim().startsWith('/*')).length;
          break;

        default:
          analysis.commentLines = codeLines.filter(line => {
            const trimmed = line.trim();
            return trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('/*');
          }).length;
      }

      // Calculate basic complexity
      analysis.complexity = (content.match(/\b(if|for|while|switch|catch|&&|\|\|)\b/g) || []).length;

    } catch (error) {
      analysis.error = error.message;
    }

    return analysis;
  }, []);

  // **FIXED: Parse configuration files - ALL VARIABLE CONFLICTS RESOLVED**
  const parseConfigFile = useCallback((content, extension) => {
    let config = {};

    try {
      switch (extension) {
        case 'json':
          config = JSON.parse(content);
          break;

        case 'yml':
        case 'yaml':
          const yamlContentLines = content.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
          config.keys = yamlContentLines.filter(line => line.includes(':')).length;
          config.comments = content.split('\n').filter(line => line.trim().startsWith('#')).length;
          break;

        case 'ini':
        case 'env':
          const iniContentLines = content.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
          config.sections = (content.match(/$$[^$$]+$$/g) || []).length;
          config.properties = iniContentLines.filter(line => line.includes('=')).length;
          break;

        case 'toml':
          config.sections = (content.match(/$$[^$$]+$$/g) || []).length;
          config.properties = content.split('\n').filter(line => line.includes('=')).length;
          break;

        default:
          config.lineCount = content.split('\n').length;
      }
    } catch (error) {
      config.error = error.message;
    }

    return config;
  }, []);

  const isNonReadableFile = useCallback((fileName, fileExtension) => {
    const nonReadableExtensions = [
      'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'tiff', 'webp', 'avif',
      'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v',
      'mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a',
      'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'lz', 'lzma',
      'exe', 'dll', 'so', 'dylib', 'bin', 'app', 'deb', 'rpm',
      'db', 'sqlite', 'sqlite3', 'mdb', 'accdb',
      'doc', 'xls', 'ppt', 'docx', 'xlsx', 'pptx',
      'pdf', 'ps', 'eps', 'ai', 'psd', 'sketch',
      'ttf', 'otf', 'woff', 'woff2', 'eot',
      'p12', 'pfx', 'key', 'crt', 'cer', 'pem'
    ];

    const binaryFileNames = ['favicon.ico', 'thumbs.db', '.ds_store', 'desktop.ini'];
    const readableDotFiles = ['.gitignore', '.gitattributes', '.dockerignore', '.eslintrc', '.prettierrc', '.babelrc', '.npmrc', '.yarnrc', '.editorconfig', '.env'];

    if (fileName.startsWith('.') && readableDotFiles.includes(fileName)) {
      return false;
    }

    return nonReadableExtensions.includes(fileExtension) ||
           binaryFileNames.includes(fileName) ||
           (fileName.startsWith('.') && !readableDotFiles.includes(fileName));
  }, []);

  const determineParserType = useCallback((fileName, fileExtension) => {
    if (parseAllFiles) {
      for (const parser of availableParsers) {
        if (selectedParsers.has(parser.id)) {
          if (parser.extensions.includes(fileExtension) ||
              (parser.id === 'markdown' && (fileName.startsWith('readme') || fileName.startsWith('changelog'))) ||
              (parser.id === 'config' && (fileName === 'dockerfile' || fileName === 'makefile' || fileName.startsWith('.git')))) {
            return parser.id;
          }
        }
      }

      if (['json', 'jsonl', 'geojson'].includes(fileExtension)) return 'json';
      if (['md', 'markdown', 'mdown', 'mkd'].includes(fileExtension) ||
          fileName.startsWith('readme') || fileName.startsWith('changelog') || fileName.startsWith('license')) return 'markdown';

      const codeExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'r', 'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd', 'h', 'hpp'];
      if (codeExtensions.includes(fileExtension)) return 'code';

      const configExtensions = ['yml', 'yaml', 'toml', 'ini', 'env', 'conf', 'config', 'cfg', 'properties'];
      if (configExtensions.includes(fileExtension) ||
          fileName === 'dockerfile' || fileName === '.gitignore' || fileName === 'makefile' || fileName.startsWith('.')) return 'config';

      if (['html', 'htm', 'css', 'scss', 'sass', 'less', 'styl'].includes(fileExtension)) return 'web';
      if (['xml', 'sql', 'graphql', 'proto', 'csv', 'tsv'].includes(fileExtension)) return 'data';

      return 'text';
    } else {
      for (const parser of availableParsers) {
        if (selectedParsers.has(parser.id)) {
          if (parser.extensions.includes(fileExtension) ||
              (parser.id === 'markdown' && fileName.startsWith('readme')) ||
              (parser.id === 'config' && (fileName === 'dockerfile' || fileName === '.gitignore'))) {
            return parser.id;
          }
        }
      }
      return null;
    }
  }, [parseAllFiles, selectedParsers, availableParsers]);

  const toggleParser = useCallback((parserId) => {
    setSelectedParsers(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(parserId)) {
        newSelected.delete(parserId);
      } else {
        newSelected.add(parserId);
      }
      return newSelected;
    });
  }, []);

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
                parsedData,
                selectedParsers: Array.from(selectedParsers),
                preserveMetadata,
                extractCodeBlocks,
                normalizeWhitespace,
                parseAllFiles,
                maxFileSize,
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
  }, [inputData, parsedData, selectedParsers, preserveMetadata, extractCodeBlocks, normalizeWhitespace, parseAllFiles, maxFileSize, id, setNodes]);

  // **ENHANCED DATA DETECTION**
  useEffect(() => {
    const checkForInputData = () => {
      try {
        const edges = getEdges();
        const nodes = getNodes();

        const incomingEdges = edges.filter(edge => edge.target === id);

        if (incomingEdges.length > 0) {
          const sourceEdge = incomingEdges;
          const sourceNode = nodes.find(node => node.id === sourceEdge.source);

          if (sourceNode && sourceNode.data && (sourceNode.data.filteredData || sourceNode.data.repoData)) {
            console.log(`📥 ParseNode ${id}: Received data from previous node`);
            setInputData(sourceNode.data.filteredData || sourceNode.data.repoData);
          }
        }
      } catch (error) {
        console.error(`❌ ParseNode ${id}: Error checking input data:`, error);
      }
    };

    checkForInputData();
  }, [getEdges, getNodes, id]);

  // **MAIN PARSING FUNCTION WITH CONTENT FETCHING**
  const parseFiles = useCallback(async () => {
    if (!inputData || !inputData.contents) {
      console.log(`⚠️ ParseNode ${id}: No data to parse`);
      return;
    }

    setIsProcessing(true);
    setError(null);
    console.log(`🔄 ParseNode ${id}: Starting enhanced file parsing with GitLab Raw endpoint`);

    try {
      const parsedFiles = [];
      const skippedFiles = [];
      const filesToProcess = inputData.contents.filter(item => item.type === 'file');

      console.log(`📊 ParseNode ${id}: Processing ${filesToProcess.length} files`);

      for (const file of filesToProcess) {
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
        const fileName = file.name.toLowerCase();

        // Skip non-readable files
        if (isNonReadableFile(fileName, fileExtension)) {
          skippedFiles.push({
            file: file,
            reason: 'Non-readable or binary file type',
            extension: fileExtension
          });
          console.log(`⏭️ ParseNode ${id}: Skipping ${file.name} - binary file type`);
          continue;
        }

        // Determine parser type
        const parserType = determineParserType(fileName, fileExtension);

        if (parserType === null && !parseAllFiles) {
          skippedFiles.push({
            file: file,
            reason: 'No matching parser selected',
            extension: fileExtension
          });
          console.log(`⏭️ ParseNode ${id}: Skipping ${file.name} - no matching parser`);
          continue;
        }

        // **FIXED: Fetch actual file content using GitLab Raw endpoint**
        const rawContent = await fetchFileContent(file);

        if (!rawContent) {
          skippedFiles.push({
            file: file,
            reason: 'Failed to fetch content or empty file',
            extension: fileExtension
          });
          console.log(`⏭️ ParseNode ${id}: Skipping ${file.name} - no content`);
          continue;
        }

        // Parse the actual content
        const finalParserType = parserType || 'text';
        const parsedContent = parseContent(rawContent, fileName, fileExtension, finalParserType);

        const parsedFile = {
          file: {
            name: file.name,
            path: file.path,
            size: file.size,
            extension: fileExtension,
            detectedType: finalParserType,
            branch: inputData.selectedBranch || 'default'
          },
          parser: finalParserType,
          content: parsedContent,
          metadata: preserveMetadata ? {
            parsedAt: new Date().toISOString(),
            parser: finalParserType,
            originalSize: file.size,
            contentLength: rawContent.length,
            platform: inputData.platform,
            repository: `${inputData.owner}/${inputData.repo}`,
            ...parsedContent.metadata
          } : {}
        };

        parsedFiles.push(parsedFile);
        console.log(`✅ ParseNode ${id}: Parsed ${file.name} using ${finalParserType} parser (${rawContent.length} chars)`);
      }

      const result = {
        ...inputData,
        parsedFiles: parsedFiles,
        skippedFiles: skippedFiles,
        originalFileCount: filesToProcess.length,
        parsedFileCount: parsedFiles.length,
        skippedFileCount: skippedFiles.length,
        parsingConfig: {
          selectedParsers: Array.from(selectedParsers),
          preserveMetadata,
          extractCodeBlocks,
          normalizeWhitespace,
          parseAllFiles,
          maxFileSize
        },
        parsedAt: new Date().toISOString()
      };

      setParsedData(result);
      console.log(`✨ ParseNode ${id}: Parsing complete! ${parsedFiles.length} files parsed, ${skippedFiles.length} skipped`);

      // **BROADCAST DATA UPDATE**
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('nodeDataUpdated', {
          detail: { nodeId: id, data: result }
        }));
      }, 100);

      await new Promise(resolve => setTimeout(resolve, 500));
      await triggerNextNodes(id);

    } catch (error) {
      console.error(`❌ ParseNode ${id}: Parsing failed:`, error);
      setError(`Parsing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [inputData, selectedParsers, preserveMetadata, extractCodeBlocks, normalizeWhitespace, parseAllFiles, maxFileSize, id, triggerNextNodes, isNonReadableFile, determineParserType, fetchFileContent, parseContent]);

  const handleNodeExecution = useCallback(async (inputData) => {
    console.log(`🎯 ParseNode ${id}: Executing with input data:`, inputData);

    try {
      Object.values(inputData).forEach(data => {
        if (data.contents || data.filteredData) {
          console.log(`📥 ParseNode ${id}: Processing data from connected node`);
          setInputData(data.contents ? data : data.filteredData);
        }
      });

      if (inputData && Object.keys(inputData).length > 0) {
        console.log(`🔄 ParseNode ${id}: Auto-parsing files after receiving data`);
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (parseButtonRef.current && !isProcessing) {
          console.log(`✅ ParseNode ${id}: Triggering parse button`);
          parseButtonRef.current.click();
        } else {
          await parseFiles();
        }
      }
    } catch (error) {
      console.error(`❌ ParseNode ${id}: Error during execution:`, error);
    }
  }, [id, parseFiles, isProcessing]);

  useEffect(() => {
    const handleAutoExecution = (event) => {
      if (event.detail.nodeId === id) {
        console.log(`🎯 ParseNode ${id}: Auto-triggered for execution`);

        if (parseButtonRef.current && !isProcessing && inputData) {
          console.log(`✅ ParseNode ${id}: Triggering parse button click`);
          parseButtonRef.current.click();
          return;
        }

        if (inputData && !isProcessing) {
          console.log(`✅ ParseNode ${id}: Direct function call for auto-execution`);
          parseFiles();
        } else {
          console.log(`⚠️ ParseNode ${id}: Cannot auto-execute - no input data available or processing`);
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
  }, [id, inputData, isProcessing, parseFiles]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('deleteNode', { detail: { id } }));
  }, [id]);

  const handleInteractionEvent = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return (
    <motion.div
      className={`relative w-96 bg-gradient-to-br from-slate-50 via-stone-50 to-zinc-50 border-2 border-stone-200 rounded-xl shadow-lg group nowheel overflow-visible ${
        selected ? 'ring-2 ring-violet-300' : ''
      }`}
      style={{ minHeight: '600px' }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onPointerDown={(e) => {
        if (e.target.closest('input, button, select, .nowheel')) {
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
          nodeType="parse"
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
          background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
          width: '16px',
          height: '16px',
          border: '3px solid white',
          borderRadius: '50%',
          boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
          left: '-8px'
        }}
        isConnectable={isConnectable}
      />

      <div className="p-4 pt-8 nowheel">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-4">
          <FloatingIcon isProcessing={isProcessing}>
            <span className="text-xl">🔧</span>
          </FloatingIcon>
          <h3 className="text-sm font-semibold text-stone-700">
            Enhanced File Parser
          </h3>
        </div>

        {/* Parse All Files Toggle */}
        <div className="mb-4">
          <motion.label
            className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs bg-gradient-to-r from-blue-50 to-sky-50 hover:from-blue-100 hover:to-sky-100 text-blue-700 border border-blue-200 nodrag"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.input
              type="checkbox"
              checked={parseAllFiles}
              onChange={(e) => setParseAllFiles(e.target.checked)}
              onMouseDown={handleInteractionEvent}
              className="w-3 h-3 text-blue-500 rounded focus:ring-blue-400 nodrag"
              whileHover={{ scale: 1.1 }}
            />
            <span>🚀 Parse All Readable Files</span>
          </motion.label>
          <div className="text-xs text-stone-600 mt-1 ml-5">
            {parseAllFiles ? 'Will fetch and parse all files except binary/encrypted files' : 'Only parse files matching selected parsers'}
          </div>
        </div>

        {/* File Size Limit */}
        <div className="mb-4">
          <label className="text-xs font-medium text-stone-700 mb-2 block">
            📏 Max File Size: {(maxFileSize / 1024).toFixed(0)}KB
          </label>
          <motion.input
            type="range"
            min="10240"
            max="10485760"
            step="10240"
            value={maxFileSize}
            onChange={(e) => setMaxFileSize(parseInt(e.target.value))}
            onMouseDown={handleInteractionEvent}
            className="w-full accent-stone-500 nodrag nowheel"
            whileHover={{ scale: 1.01 }}
          />
          <div className="flex justify-between text-xs text-stone-600 mt-1">
            <span>10KB</span>
            <span>Recommended: 1MB</span>
            <span>10MB</span>
          </div>
        </div>

        {/* Parser Selection */}
        <div className="mb-4">
          <label className="text-xs font-medium text-stone-700 mb-2 block">
            🔧 File Parsers ({selectedParsers.size} selected)
          </label>
          <div className="space-y-1 max-h-48 overflow-y-auto nowheel">
            {availableParsers.map((parser, index) => (
              <motion.label
                key={parser.id}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs nodrag ${
                  selectedParsers.has(parser.id)
                    ? 'bg-violet-50 border border-violet-200 text-violet-800'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
                onMouseDown={handleInteractionEvent}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                whileHover={{
                  scale: 1.01,
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)"
                }}
                whileTap={{ scale: 0.99 }}
              >
                <motion.input
                  type="checkbox"
                  checked={selectedParsers.has(parser.id)}
                  onChange={() => toggleParser(parser.id)}
                  onMouseDown={handleInteractionEvent}
                  className="w-3 h-3 text-violet-500 rounded focus:ring-violet-400 nodrag flex-shrink-0"
                  whileHover={{ scale: 1.1 }}
                />
                <span className="text-sm flex-shrink-0">{parser.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-xs">{parser.name}</div>
                  <div className="text-xs text-slate-500 truncate">{parser.description}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {parser.extensions.slice(0, 4).join(', ')}
                    {parser.extensions.length > 4 && ` +${parser.extensions.length - 4} more`}
                  </div>
                </div>
              </motion.label>
            ))}
          </div>
        </div>

        {/* Parse Options */}
        <div className="mb-4 space-y-2">
          <label className="text-xs font-medium text-stone-700 block">⚙️ Parse Options</label>

          <motion.label
            className="flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 text-violet-700 border border-violet-200 nodrag"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <motion.input
              type="checkbox"
              checked={preserveMetadata}
              onChange={(e) => setPreserveMetadata(e.target.checked)}
              onMouseDown={handleInteractionEvent}
              className="w-3 h-3 text-violet-500 rounded focus:ring-violet-400 nodrag"
              whileHover={{ scale: 1.1 }}
            />
            <span>📊 Preserve File Metadata</span>
          </motion.label>

          <motion.label
            className="flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs bg-gradient-to-r from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 text-rose-700 border border-rose-200 nodrag"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <motion.input
              type="checkbox"
              checked={extractCodeBlocks}
              onChange={(e) => setExtractCodeBlocks(e.target.checked)}
              onMouseDown={handleInteractionEvent}
              className="w-3 h-3 text-rose-500 rounded focus:ring-rose-400 nodrag"
              whileHover={{ scale: 1.1 }}
            />
            <span>💻 Extract Code Blocks</span>
          </motion.label>

          <motion.label
            className="flex items-center space-x-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs bg-gradient-to-r from-teal-50 to-cyan-50 hover:from-teal-100 hover:to-cyan-100 text-teal-700 border border-teal-200 nodrag"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <motion.input
              type="checkbox"
              checked={normalizeWhitespace}
              onChange={(e) => setNormalizeWhitespace(e.target.checked)}
              onMouseDown={handleInteractionEvent}
              className="w-3 h-3 text-teal-500 rounded focus:ring-teal-400 nodrag"
              whileHover={{ scale: 1.1 }}
            />
            <span>📝 Normalize Whitespace</span>
          </motion.label>
        </div>

        {/* Parse Button */}
        <motion.button
          ref={parseButtonRef}
          onClick={parseFiles}
          onMouseDown={handleInteractionEvent}
          disabled={isProcessing || !inputData || (!parseAllFiles && selectedParsers.size === 0)}
          className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 mb-3 nodrag ${
            isProcessing || !inputData || (!parseAllFiles && selectedParsers.size === 0)
              ? 'bg-stone-200 text-stone-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg'
          }`}
          whileHover={{
            scale: isProcessing || !inputData || (!parseAllFiles && selectedParsers.size === 0) ? 1 : 1.02,
            boxShadow: isProcessing || !inputData || (!parseAllFiles && selectedParsers.size === 0) ? undefined : "0 8px 20px rgba(139, 92, 246, 0.3)"
          }}
          whileTap={{ scale: isProcessing || !inputData || (!parseAllFiles && selectedParsers.size === 0) ? 1 : 0.98 }}
        >
          <div className="flex items-center justify-center space-x-2">
            {isProcessing ? (
              <>
                <motion.div
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span>Fetching & Parsing...</span>
              </>
            ) : (
              <>
                <span>🔧</span>
                <span>{parseAllFiles ? 'Parse All Files' : 'Parse Selected'}</span>
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
                : 'bg-stone-50 text-stone-600 border border-stone-200'
            }`}
          >
            {inputData ? '🔗 Connected to FilterNode' : '⏸️ Waiting for filtered data'}
          </div>
        </div>

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

        {/* Parse Results */}
        <AnimatePresence>
          {parsedData && (
            <motion.div
              className="text-xs bg-white border border-stone-200 rounded-lg overflow-hidden shadow-lg nowheel"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onMouseDown={handleInteractionEvent}
            >
              <motion.div
                className="bg-gradient-to-r from-stone-50 to-slate-50 p-3 cursor-pointer hover:from-stone-100 hover:to-slate-100 transition-all duration-300 nodrag"
                onClick={() => setIsExpanded(!isExpanded)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-stone-700">
                    ✅ Enhanced Parsing Complete
                  </div>
                  <motion.span
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="text-stone-500"
                  >
                    ▼
                  </motion.span>
                </div>
                <div className="text-stone-600 text-xs mt-1">
                  {parsedData.originalFileCount} files → {parsedData.parsedFileCount} parsed with content, {parsedData.skippedFileCount} skipped
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
                    {/* Parsed Files */}
                    <div className="mb-3">
                      <div className="font-medium text-emerald-600 mb-1">📄 Parsed Files ({parsedData.parsedFileCount})</div>
                      {parsedData.parsedFiles.slice(0, 10).map((file, index) => (
                        <motion.div
                          key={index}
                          className="flex items-center space-x-2 py-1 hover:bg-stone-50 rounded transition-colors"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          whileHover={{ scale: 1.01, x: 4 }}
                        >
                          <span className="text-sm">
                            {availableParsers.find(p => p.id === file.parser)?.icon || '📄'}
                          </span>
                          <span className="text-xs text-stone-700 flex-1 truncate">{file.file.name}</span>
                          <span className="text-xs text-stone-500 bg-stone-100 px-1 rounded">
                            {file.content.raw?.length || 0} chars
                          </span>
                        </motion.div>
                      ))}
                      {parsedData.parsedFiles.length > 10 && (
                        <div className="text-xs text-stone-500 text-center py-1">
                          ...and {parsedData.parsedFiles.length - 10} more files
                        </div>
                      )}
                    </div>

                    {/* Skipped Files */}
                    {parsedData.skippedFiles.length > 0 && (
                      <div>
                        <div className="font-medium text-amber-600 mb-1">⏭️ Skipped Files ({parsedData.skippedFileCount})</div>
                        {parsedData.skippedFiles.slice(0, 5).map((item, index) => (
                          <motion.div
                            key={index}
                            className="flex items-center space-x-2 py-1 hover:bg-amber-50 rounded transition-colors"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.02 }}
                            whileHover={{ scale: 1.01, x: 4 }}
                          >
                            <span className="text-sm">⏭️</span>
                            <span className="text-xs text-stone-700 flex-1 truncate">{item.file.name}</span>
                            <span className="text-xs text-amber-600 bg-amber-100 px-1 rounded text-center">
                              {item.reason.includes('Failed') ? 'No content' :
                               item.reason.includes('binary') ? 'Binary' :
                               item.reason.includes('large') ? 'Too large' : 'Skipped'}
                            </span>
                          </motion.div>
                        ))}
                        {parsedData.skippedFiles.length > 5 && (
                          <div className="text-xs text-stone-500 text-center py-1">
                            ...and {parsedData.skippedFiles.length - 5} more skipped
                          </div>
                        )}
                      </div>
                    )}
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

export default ParseNode;
