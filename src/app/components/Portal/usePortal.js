import { useContext } from 'react';
import { PortalContext } from './context';

const usePortal = () => {
  const portal = useContext(PortalContext);

  return portal;
};

export default usePortal;
