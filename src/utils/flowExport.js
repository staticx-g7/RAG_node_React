// Export/Import utilities for workflow save/restore
export const exportFlow = (reactFlowInstance, nodes, edges) => {
  if (!reactFlowInstance) {
    console.error('ReactFlow instance not available');
    return null;
  }

  // Get the complete flow object including viewport
  const flow = reactFlowInstance.toObject();

  // Clean sensitive data (API keys, tokens) from nodes
  const cleanedNodes = flow.nodes.map(node => {
    const cleanedData = { ...node.data };

    // Remove sensitive fields from API Config nodes
    if (cleanedData.apiKey) delete cleanedData.apiKey;
    if (cleanedData.token) delete cleanedData.token;
    if (cleanedData.headers) {
      cleanedData.headers = Object.keys(cleanedData.headers).reduce((acc, key) => {
        if (!key.toLowerCase().includes('authorization') &&
            !key.toLowerCase().includes('key') &&
            !key.toLowerCase().includes('token')) {
          acc[key] = cleanedData.headers[key];
        }
        return acc;
      }, {});
    }

    return {
      ...node,
      data: cleanedData
    };
  });

  return {
    ...flow,
    nodes: cleanedNodes,
    metadata: {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      appName: 'RAG Node React',
      nodeCount: cleanedNodes.length,
      edgeCount: flow.edges.length
    }
  };
};

export const downloadFlowAsJSON = (flowData, filename = 'workflow') => {
  const timestamp = new Date().toISOString().split('T')[0];
  const dataStr = JSON.stringify(flowData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });

  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${timestamp}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

export const importFlowFromJSON = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const flowData = JSON.parse(event.target.result);

        // Validate the flow data structure
        if (!flowData.nodes || !flowData.edges) {
          throw new Error('Invalid workflow file format - missing nodes or edges');
        }

        // Validate node types exist in your system
        const validNodeTypes = Object.keys(require('../constants/flowconfig').nodeTypes);
        const invalidNodes = flowData.nodes.filter(node =>
          !validNodeTypes.includes(node.type)
        );

        if (invalidNodes.length > 0) {
          console.warn('Found unknown node types:', invalidNodes.map(n => n.type));
        }

        resolve(flowData);
      } catch (error) {
        reject(new Error('Failed to parse workflow file: ' + error.message));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

// Auto-save functionality
export const saveToLocalStorage = (flowData, key = 'rag-workflow-autosave') => {
  try {
    localStorage.setItem(key, JSON.stringify(flowData));
    return true;
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    return false;
  }
};

export const loadFromLocalStorage = (key = 'rag-workflow-autosave') => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
};
