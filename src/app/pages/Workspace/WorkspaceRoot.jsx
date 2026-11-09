import React from 'react';
import { useLocation } from 'react-router-dom';
import { WorkspaceLayoutProvider } from './WorkspaceLayoutProvider';
import WorkspacePage from './Workspace';

/** @param {{ [key: string]: unknown }} props */
function WorkspaceRoot(props) {
  const location = useLocation();
  return (
    <WorkspaceLayoutProvider>
      <WorkspacePage {...props} location={location} />
    </WorkspaceLayoutProvider>
  );
}

export default WorkspaceRoot;
