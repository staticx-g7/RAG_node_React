import { useCallback } from 'react';
import { addEdge } from '@xyflow/react';

let edgeId = 1;
const getEdgeId = () => `edge_${edgeId++}`;

export const useNodeOperations = (setNodes, setEdges) => {
  const onConnect = useCallback(
    (params) => {
      console.log('🔗 Creating connection:', params);
      console.log('Source:', params.source, 'Target:', params.target);
      console.log('Source Handle:', params.sourceHandle, 'Target Handle:', params.targetHandle);

      // Ensure proper edge direction
      const newEdge = {
        id: getEdgeId(),
        source: params.source,  // FROM node
        target: params.target,  // TO node
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        type: 'custom',
        markerEnd: {
          type: 'arrowclosed',
        }
      };

      console.log('✅ Created edge:', newEdge);

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const onConnectEnd = useCallback(
    (event, connectionState) => {
      if (!connectionState.isValid) {
        const id = `node_${Date.now()}`;
        const { clientX, clientY } =
          'changedTouches' in event ? event.changedTouches[0] : event;

        const newNode = {
          id,
          position: { x: clientX - 50, y: clientY - 50 },
          data: { label: `Node ${id}` },
          origin: [0.5, 0.0],
        };

        setNodes((nds) => nds.concat(newNode));

        if (connectionState.fromNode) {
          const newEdge = {
            id: getEdgeId(),
            source: connectionState.fromNode.id,  // FROM the original node
            target: id,                           // TO the new node
            type: 'custom',
            markerEnd: {
              type: 'arrowclosed',
            }
          };

          setEdges((eds) => addEdge(newEdge, eds));
        }
      }
    },
    [setNodes, setEdges]
  );

  return { onConnect, onConnectEnd };
};
