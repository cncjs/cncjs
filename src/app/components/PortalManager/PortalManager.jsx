import { v4 as uuidv4 } from 'uuid';
import { Portal } from '@tonic-ui/react';
import memoize from 'micro-memoize';
import React, { useCallback, useState } from 'react';
import { PortalManagerContext } from './context';

const getMemoizedState = memoize(state => ({ ...state }));

const PortalManager = ({ children }) => {
  const [portals, setPortals] = useState([]);
  const add = useCallback((render) => {
    const id = uuidv4();
    setPortals(portals => [
      ...portals,
      { id, render },
    ]);
    return id;
  }, []);
  const remove = useCallback(id => {
    setPortals(portals => portals.filter(portal => portal.id !== id));
  }, []);
  const context = getMemoizedState({ add, remove });

  return (
    <PortalManagerContext.Provider value={context}>
      {portals.map(portal => (
        <Portal key={portal.id}>
          {portal.render({
            id: portal.id,
            remove: () => remove(portal.id),
          })}
        </Portal>
      ))}
      {children}
    </PortalManagerContext.Provider>
  );
};

export default PortalManager;
