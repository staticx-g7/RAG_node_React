import React, { createContext, useContext, useState } from 'react';

const DnDContext = createContext([null, () => {}]);

export const DnDProvider = ({ children }) => {
  const [type, setType] = useState(null);

  const setTypeWithDebug = (newType) => {
    console.log('🔄 DnD Context: Setting type from', type, 'to', newType);
    setType(newType);
  };

  return (
    <DnDContext.Provider value={[type, setTypeWithDebug]}>
      {children}
    </DnDContext.Provider>
  );
};

export const useDnD = () => {
  const context = useContext(DnDContext);
  if (!context) {
    console.error('❌ useDnD must be used within a DnDProvider');
  }
  return context;
};
