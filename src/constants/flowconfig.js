export const INITIAL_NODES = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Start Node' },
    position: { x: 250, y: 25 },
  },
  {
    id: '2',
    data: { label: 'Process Node' },
    position: { x: 100, y: 125 },
  },
  {
    id: '3',
    type: 'output',
    data: { label: 'End Node' },
    position: { x: 250, y: 250 },
  },
];

export const INITIAL_EDGES = [
  { id: 'e1-2', source: '1', target: '2', type: 'custom' },
  { id: 'e2-3', source: '2', target: '3', type: 'custom' },
];

export const FLOW_CONFIG = {
  fitViewOptions: { padding: 0.2 },
  nodeOrigin: [0.5, 0],
  backgroundVariant: 'dots',
  backgroundGap: 20,
  backgroundSize: 1,
};
