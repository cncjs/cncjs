import { useContext } from 'react';
import { PortalManagerContext } from './context';

const usePortalManager = () => {
  const portalManager = useContext(PortalManagerContext);

  return portalManager;
};

export default usePortalManager;
