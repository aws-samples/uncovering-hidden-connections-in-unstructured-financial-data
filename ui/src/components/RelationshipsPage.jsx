import React from 'react';
import { GraphExplorer } from './GraphExplorer';

const RelationshipsPage = ({
  apiEndpoint,
  apiKey,
  graphData,
  setGraphData,
  searchResults,
  setSearchResults,
  addedEntityIds,
  setAddedEntityIds,
  selectedEntity,
  setSelectedEntity,
  selectedRelationship,
  setSelectedRelationship,
  currentFilters,
  setCurrentFilters,
  graphLoaded,
  setGraphLoaded,
  leftDrawerOpen,
  setLeftDrawerOpen,
  rightDrawerOpen,
  setRightDrawerOpen,
  activeLeftPanel,
  setActiveLeftPanel,
  activeRightPanel,
  setActiveRightPanel,
  currentLayout,
  setCurrentLayout
}) => {
  const handleError = (error) => {
    // Handle Graph Explorer errors silently
  };

  return (
    <GraphExplorer
      apiEndpoint={apiEndpoint}
      apiKey={apiKey}
      onError={handleError}
      graphData={graphData}
      setGraphData={setGraphData}
      searchResults={searchResults}
      setSearchResults={setSearchResults}
      addedEntityIds={addedEntityIds}
      setAddedEntityIds={setAddedEntityIds}
      selectedEntity={selectedEntity}
      setSelectedEntity={setSelectedEntity}
      selectedRelationship={selectedRelationship}
      setSelectedRelationship={setSelectedRelationship}
      currentFilters={currentFilters}
      setCurrentFilters={setCurrentFilters}
      graphLoaded={graphLoaded}
      setGraphLoaded={setGraphLoaded}
      leftDrawerOpen={leftDrawerOpen}
      setLeftDrawerOpen={setLeftDrawerOpen}
      rightDrawerOpen={rightDrawerOpen}
      setRightDrawerOpen={setRightDrawerOpen}
      activeLeftPanel={activeLeftPanel}
      setActiveLeftPanel={setActiveLeftPanel}
      activeRightPanel={activeRightPanel}
      setActiveRightPanel={setActiveRightPanel}
      currentLayout={currentLayout}
      setCurrentLayout={setCurrentLayout}
    />
  );
};

export default RelationshipsPage;