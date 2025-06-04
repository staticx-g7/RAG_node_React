export const INITIAL_NODES = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Start Node' },
    position: { x: 240, y: 20 },
  },
  {
    id: '2',
    type: 'default',
    data: { label: 'Process Node' },
    position: { x: 100, y: 120 },
  },
  {
    id: '3',
    type: 'output',
    data: { label: 'End Node' },
    position: { x: 240, y: 240 },
  },
];

export const INITIAL_EDGES = [
  { id: 'e1-2', source: '1', target: '2', type: 'custom', sourceHandle: 'bottom', targetHandle: 'top' },
  { id: 'e2-3', source: '2', target: '3', type: 'custom', sourceHandle: 'bottom', targetHandle: 'top' },
];

export const FLOW_CONFIG = {
  fitViewOptions: { padding: 0.2 },
  nodeOrigin: [0.5, 0.5], // Center origin for better handle positioning
  snapToGrid: true,
  snapGrid: [20, 20],
  backgroundVariant: 'lines',
  backgroundGap: 20,
  backgroundSize: 1,
};
