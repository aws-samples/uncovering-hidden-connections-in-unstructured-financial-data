import React from 'react';
import { GraphExplorer } from './GraphExplorer';

const RelationshipsPage = ({
  apiEndpoint,
  apiKey
}) => {
  const handleError = (error) => {
    console.error('Graph Explorer Error:', error);
  };

  return (
    <GraphExplorer
      apiEndpoint={apiEndpoint}
      apiKey={apiKey}
      onError={handleError}
    />
  );
};

export default RelationshipsPage;