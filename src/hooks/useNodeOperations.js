import { useCallback } from 'react';
import { addEdge, useReactFlow } from '@xyflow/react';

let nodeId = 4;
const getId = () => `${nodeId++}`;

export const useNodeOperations = (setNodes, setEdges) => {
  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, type: 'custom' }, eds)),
    [setEdges]
  );

  const onConnectEnd = useCallback(
    (event, connectionState) => {
      if (!connectionState.isValid) {
        const id = getId();
        const { clientX, clientY } =
          'changedTouches' in event ? event.changedTouches[0] : event;

        const newNode = {
          id,
          position: screenToFlowPosition({
            x: clientX,
            y: clientY,
          }),
          data: { label: `Node ${id}` },
          origin: [0.5, 0.0],
        };

        setNodes((nds) => nds.concat(newNode));
        setEdges((eds) =>
          eds.concat({
            id: `e${connectionState.fromNode.id}-${id}`,
            source: connectionState.fromNode.id,
            target: id,
            type: 'custom'
          })
        );
      }
    },
    [screenToFlowPosition, setNodes, setEdges]
  );

  const onPaneDoubleClick = useCallback(
    (event) => {
      const id = getId();
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id,
        data: { label: `Node ${id}` },
        position,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  return {
    onConnect,
    onConnectEnd,
    onPaneDoubleClick,
  };
};
