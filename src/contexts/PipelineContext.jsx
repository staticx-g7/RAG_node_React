// contexts/PipelineContext.jsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';

const PipelineContext = createContext();

const initialState = {
  // Your existing state structure...
  git: {
    platform: 'github',
    repositoryUrl: '',
    owner: '',
    repo: '',
    branch: 'main',
    token: '',
    includeExtensions: ['.js', '.jsx', '.ts', '.tsx', '.py', '.md'],
    isConnected: false,
    availableBranches: [],
    repoInfo: null,
    fetchedFiles: []
  },
  filter: {
    selectedFolders: new Set(['src', 'components', 'utils']),
    selectedFormats: new Set(['.js', '.jsx', '.ts', '.tsx', '.py', '.md']),
    excludePatterns: ['node_modules', '.git', 'dist', 'build'],
    maxFileSize: 1000000,
    minFileSize: 100,
    includeHidden: false,
    filteredFiles: []
  },
  chunk: {
    chunkMethod: 'character',
    chunkSize: 1000,
    overlap: 200,
    preserveStructure: true,
    respectBoundaries: true,
    customSeparators: ['\n\n', '\n', '. ', '! ', '? '],
    processedChunks: []
  },
  vectorize: {
    embeddingModel: 'alias-embeddings',
    provider: 'blablador',
    dimensions: 1024,
    batchSize: 100,
    rateLimit: 1000,
    storageType: 'indexeddb', // Changed default to IndexedDB
    vectors: [],
    customKeys: [
      { key: 'source', value: 'repository', enabled: true },
      { key: 'timestamp', value: new Date().toISOString(), enabled: true }
    ]
  },
  chat: {
    model: 'gpt-4',
    provider: 'openai',
    temperature: 0.7,
    maxTokens: 2048,
    contextWindowTokens: 4096,
    maxResponseLength: 2048,
    useRepositoryContext: true,
    systemPrompt: 'You are a helpful AI assistant that can answer questions about code repositories.',
    messages: []
  },
  readme: {
    model: 'gpt-4',
    provider: 'openai',
    includeInstallation: true,
    includeUsage: true,
    includeContributing: true,
    includeLicense: true,
    includeFeatures: true,
    includeArchitecture: true,
    tone: 'professional',
    maxCharacters: 10000,
    useRepositoryContext: true,
    customSections: [],
    generatedReadme: ''
  }
};

const pipelineReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_GIT':
      return { ...state, git: { ...state.git, ...action.payload } };
    case 'UPDATE_FILTER':
      return { ...state, filter: { ...state.filter, ...action.payload } };
    case 'UPDATE_CHUNK':
      return { ...state, chunk: { ...state.chunk, ...action.payload } };
    case 'UPDATE_VECTORIZE':
      return { ...state, vectorize: { ...state.vectorize, ...action.payload } };
    case 'UPDATE_CHAT':
      return { ...state, chat: { ...state.chat, ...action.payload } };
    case 'UPDATE_README':
      return { ...state, readme: { ...state.readme, ...action.payload } };
    case 'RESET_PIPELINE':
      return initialState;
    case 'RESTORE_STATE':
      return { ...action.payload };
    default:
      return state;
  }
};

// Storage management utilities
const StorageManager = {
  // Calculate size of data in bytes
  calculateSize: (data) => {
    return new Blob([JSON.stringify(data)]).size;
  },

  // Check available storage
  checkStorageAvailability: async (neededBytes) => {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimation = await navigator.storage.estimate();
        const remaining = estimation.quota - estimation.usage;
        return remaining >= neededBytes;
      } catch (error) {
        console.warn('Storage estimation failed:', error);
        return null;
      }
    }
    return null;
  },

  // Clean up old or large data
  cleanupStorage: (state) => {
    const cleanedState = { ...state };

    // Remove large vector data but keep metadata
    if (cleanedState.vectorize.vectors && cleanedState.vectorize.vectors.length > 0) {
      console.log('Removing vector embeddings to save space...');
      cleanedState.vectorize.vectors = cleanedState.vectorize.vectors.map(vector => ({
        id: vector.id,
        metadata: vector.metadata,
        content: vector.content.substring(0, 200) + '...', // Truncate content
        // Remove the actual embedding array
        embedding: null,
        _truncated: true
      }));
    }

    // Remove large processed chunks, keep only metadata
    if (cleanedState.chunk.processedChunks && cleanedState.chunk.processedChunks.length > 100) {
      console.log('Truncating processed chunks to save space...');
      cleanedState.chunk.processedChunks = cleanedState.chunk.processedChunks.slice(0, 100).map(chunk => ({
        ...chunk,
        content: chunk.content.substring(0, 100) + '...',
        _truncated: true
      }));
    }

    // Remove sensitive data
    if (cleanedState.git.token) {
      cleanedState.git.token = '';
    }
    if (cleanedState.vectorize.blabladorApiKey) {
      cleanedState.vectorize.blabladorApiKey = '';
    }

    return cleanedState;
  },

  // Safe localStorage save with quota management
  safeLocalStorageSave: (key, data) => {
    try {
      const dataString = JSON.stringify(data);
      const dataSize = new Blob([dataString]).size;

      // If data is larger than 2MB, clean it up
      if (dataSize > 2 * 1024 * 1024) {
        console.warn('Data too large for localStorage, cleaning up...');
        const cleanedData = StorageManager.cleanupStorage(data);
        const cleanedString = JSON.stringify(cleanedData);
        localStorage.setItem(key, cleanedString);
        return { success: true, cleaned: true };
      }

      localStorage.setItem(key, dataString);
      return { success: true, cleaned: false };
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, attempting cleanup...');

        try {
          // Clear old autosaves
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('rag-pipeline-state-backup-')) {
              localStorage.removeItem(key);
            }
          }

          // Try saving cleaned data
          const cleanedData = StorageManager.cleanupStorage(data);
          const cleanedString = JSON.stringify(cleanedData);
          localStorage.setItem(key, cleanedString);
          return { success: true, cleaned: true };
        } catch (retryError) {
          console.error('Failed to save even after cleanup:', retryError);
          return { success: false, error: retryError.message };
        }
      }

      console.error('Storage error:', error);
      return { success: false, error: error.message };
    }
  },

  // IndexedDB storage for large data
  saveToIndexedDB: async (key, data) => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('RAGPipelineDB', 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('pipeline')) {
          db.createObjectStore('pipeline', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['pipeline'], 'readwrite');
        const store = transaction.objectStore('pipeline');

        const saveRequest = store.put({ id: key, data: data, timestamp: Date.now() });

        saveRequest.onsuccess = () => resolve(true);
        saveRequest.onerror = () => reject(saveRequest.error);
      };
    });
  },

  // Load from IndexedDB
  loadFromIndexedDB: async (key) => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('RAGPipelineDB', 1);

      request.onerror = () => resolve(null);

      request.onsuccess = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('pipeline')) {
          resolve(null);
          return;
        }

        const transaction = db.transaction(['pipeline'], 'readonly');
        const store = transaction.objectStore('pipeline');
        const getRequest = store.get(key);

        getRequest.onsuccess = () => {
          resolve(getRequest.result ? getRequest.result.data : null);
        };
        getRequest.onerror = () => resolve(null);
      };
    });
  }
};

export const PipelineProvider = ({ children }) => {
  const [state, dispatch] = useReducer(pipelineReducer, initialState);

  // Auto-save with quota management
  useEffect(() => {
    const saveState = async () => {
      // Choose storage method based on data size and user preference
      const dataSize = StorageManager.calculateSize(state);

      if (state.vectorize.storageType === 'indexeddb' || dataSize > 1024 * 1024) {
        // Use IndexedDB for large data
        try {
          await StorageManager.saveToIndexedDB('rag-pipeline-state', state);
          console.log('State saved to IndexedDB');
        } catch (error) {
          console.error('Failed to save to IndexedDB:', error);
        }
      } else {
        // Use localStorage for smaller data
        const result = StorageManager.safeLocalStorageSave('rag-pipeline-state', state);
        if (result.success) {
          console.log(`State saved to localStorage${result.cleaned ? ' (cleaned)' : ''}`);
        } else {
          console.error('Failed to save to localStorage:', result.error);
        }
      }
    };

    // Debounce saves to avoid excessive storage operations
    const timeoutId = setTimeout(saveState, 1000);
    return () => clearTimeout(timeoutId);
  }, [state]);

  // Load from storage on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        // Try IndexedDB first
        const indexedDBState = await StorageManager.loadFromIndexedDB('rag-pipeline-state');
        if (indexedDBState) {
          // Restore Sets from arrays
          if (indexedDBState.filter.selectedFolders) {
            indexedDBState.filter.selectedFolders = new Set(indexedDBState.filter.selectedFolders);
          }
          if (indexedDBState.filter.selectedFormats) {
            indexedDBState.filter.selectedFormats = new Set(indexedDBState.filter.selectedFormats);
          }
          dispatch({ type: 'RESTORE_STATE', payload: indexedDBState });
          console.log('State loaded from IndexedDB');
          return;
        }

        // Fallback to localStorage
        const savedState = localStorage.getItem('rag-pipeline-state');
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          // Restore Sets from arrays
          if (parsedState.filter.selectedFolders) {
            parsedState.filter.selectedFolders = new Set(parsedState.filter.selectedFolders);
          }
          if (parsedState.filter.selectedFormats) {
            parsedState.filter.selectedFormats = new Set(parsedState.filter.selectedFormats);
          }
          dispatch({ type: 'RESTORE_STATE', payload: parsedState });
          console.log('State loaded from localStorage');
        }
      } catch (error) {
        console.error('Failed to restore pipeline state:', error);
      }
    };

    loadState();
  }, []);

  return (
    <PipelineContext.Provider value={{ state, dispatch }}>
      {children}
    </PipelineContext.Provider>
  );
};

export const usePipeline = () => {
  const context = useContext(PipelineContext);
  if (!context) {
    throw new Error('usePipeline must be used within a PipelineProvider');
  }
  return context;
};
