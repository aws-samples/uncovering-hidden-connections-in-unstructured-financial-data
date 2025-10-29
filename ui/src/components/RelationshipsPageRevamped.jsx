import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Snackbar,
  Alert,
  Fade
} from '@mui/material';
import { TrendingUp } from 'lucide-react';

// Import our new graph components
import GraphViewer from './graph/GraphViewer';
import SearchPanel from './graph/SearchPanel';
import EntityDetailsPanel from './graph/EntityDetailsPanel';

const RelationshipsPageRevamped = ({
  apiEndpoint,
  apiKey,
  graphData,
  setGraphData,
  selectedEntity,
  setSelectedEntity,
  searchResults,
  setSearchResults
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingEntity, setIsLoadingEntity] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [addedEntityIds, setAddedEntityIds] = useState([]);

  const headers = { headers: { 'x-api-key': apiKey } };

  const showNotification = useCallback((message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  }, []);

  // Get node color based on label
  const getNodeColor = useCallback((label) => {
    const colors = {
      'PERSON': '#FF6B6B',
      'ORGANIZATION': '#4ECDC4',
      'COMPANY': '#45B7D1',
      'LOCATION': '#96CEB4',
      'EVENT': '#FFEAA7',
      'PRODUCT': '#DDA0DD',
      'TECHNOLOGY': '#98D8C8'
    };
    return colors[label] || '#95A5A6';
  }, []);

  // Load entity and its relationships
  const loadEntity = useCallback(async (entityId) => {
    if (!entityId || !apiEndpoint || !apiKey) return;

    setIsLoadingEntity(true);
    try {
      const response = await axios.get(`https://${apiEndpoint}/relationships`, {
        ...headers,
        params: { entity_id: entityId }
      });

      const { entity, relationships } = response.data;

      // Create nodes and links for the graph
      const nodes = new Map();
      const links = [];

      // Add the entity
      nodes.set(entity.id, {
        id: entity.id,
        name: entity.name,
        label: entity.label,
        properties: entity.properties,
        relationshipCount: expandedNodes.has(entity.id) ? 0 : entity.relationship_count,
        isExpanded: expandedNodes.has(entity.id),
        color: getNodeColor(entity.label),
        size: 12
      });

      // Collect new nodes for better initial positioning
      const newNodeIds = [];
      
      // Always add related entities and relationships when loading an entity
      relationships.forEach(rel => {
        // Add source node if not exists
        if (!nodes.has(rel.source.id)) {
          const isNewNode = !graphData.nodes.find(n => n.id === rel.source.id);
          if (isNewNode && rel.source.id !== entity.id) {
            newNodeIds.push(rel.source.id);
          }
          
          nodes.set(rel.source.id, {
            id: rel.source.id,
            name: rel.source.name,
            label: rel.source.label,
            properties: rel.source.properties || {},
            relationshipCount: 0,
            isExpanded: false,
            color: getNodeColor(rel.source.label),
            size: 8
          });
        }

        // Add target node if not exists
        if (!nodes.has(rel.target.id)) {
          const isNewNode = !graphData.nodes.find(n => n.id === rel.target.id);
          if (isNewNode && rel.target.id !== entity.id) {
            newNodeIds.push(rel.target.id);
          }
          
          nodes.set(rel.target.id, {
            id: rel.target.id,
            name: rel.target.name,
            label: rel.target.label,
            properties: rel.target.properties || {},
            relationshipCount: 0,
            isExpanded: false,
            color: getNodeColor(rel.target.label),
            size: 8
          });
        }

        // Add link
        links.push({
          source: rel.source.id,
          target: rel.target.id,
          label: rel.label,
          properties: rel.properties,
          id: rel.id
        });
      });

      // Merge with existing graph data
      const existingNodes = new Map(graphData.nodes.map(n => [n.id, n]));
      const existingLinks = [...graphData.links];

      // Position new nodes in a large circle around existing graph with better spacing
      const radius = Math.max(500, newNodeIds.length * 15);
      const angleStep = (2 * Math.PI) / Math.max(newNodeIds.length, 1);
      
      // Update or add nodes with initial positioning for new ones
      nodes.forEach((node, id) => {
        const existingNode = existingNodes.get(id);
        const newNodeIndex = newNodeIds.indexOf(id);
        
        if (newNodeIndex >= 0) {
          // Position new nodes in a circle with some randomization to prevent perfect alignment
          const angle = newNodeIndex * angleStep + (Math.random() - 0.5) * 0.2;
          const radiusVariation = radius + (Math.random() - 0.5) * 100;
          const initialX = Math.cos(angle) * radiusVariation;
          const initialY = Math.sin(angle) * radiusVariation;
          
          existingNodes.set(id, { 
            ...existingNode, 
            ...node,
            x: initialX,
            y: initialY,
            vx: (Math.random() - 0.5) * 50, // Add some initial velocity
            vy: (Math.random() - 0.5) * 50
          });
        } else {
          existingNodes.set(id, { ...existingNode, ...node });
        }
      });

      // Add new links (avoid duplicates)
      const existingLinkIds = new Set(existingLinks.map(l => `${l.source}-${l.target}-${l.label}`));
      links.forEach(link => {
        const linkId = `${link.source}-${link.target}-${link.label}`;
        if (!existingLinkIds.has(linkId)) {
          existingLinks.push(link);
        }
      });

      setGraphData({
        nodes: Array.from(existingNodes.values()),
        links: existingLinks
      });

      setSelectedEntity(entity);
      setSelectedNodeId(entity.id);
      showNotification(`Loaded ${entity.name} with ${relationships.length} relationships`, 'success');

    } catch (error) {
      console.error('Load entity error:', error);
      showNotification('Error loading entity relationships', 'error');
    }
    setIsLoadingEntity(false);
  }, [apiEndpoint, apiKey, headers, expandedNodes, getNodeColor, graphData.nodes, graphData.links, setGraphData, setSelectedEntity, showNotification]);

  // Expand node relationships
  const expandNode = useCallback(async (nodeId) => {
    if (expandedNodes.has(nodeId)) return;

    const newExpandedNodes = new Set(expandedNodes);
    newExpandedNodes.add(nodeId);
    setExpandedNodes(newExpandedNodes);

    await loadEntity(nodeId);
  }, [expandedNodes, loadEntity]);

  // Handle node click
  const handleNodeClick = useCallback((node) => {
    setSelectedNodeId(node.id);
    const nodeEntity = graphData.nodes.find(n => n.id === node.id);
    if (nodeEntity) {
      setSelectedEntity({
        id: nodeEntity.id,
        name: nodeEntity.name,
        label: nodeEntity.label,
        properties: nodeEntity.properties || {},
        relationship_count: nodeEntity.relationshipCount,
        isExpanded: nodeEntity.isExpanded
      });
    }
  }, [graphData.nodes, setSelectedEntity]);

  // Handle node double click
  const handleNodeDoubleClick = useCallback((node) => {
    expandNode(node.id);
  }, [expandNode]);

  // Search for entities
  const handleSearch = useCallback(async (term) => {
    if (!term.trim() || !apiEndpoint || !apiKey) return;

    setIsSearching(true);
    try {
      const response = await axios.get(`https://${apiEndpoint}/relationships`, {
        ...headers,
        params: { search: term.trim() }
      });

      setSearchResults(response.data);
      


      if (response.data.length === 0) {
        showNotification('No entities found matching your search', 'info');
      } else {
        showNotification(`Found ${response.data.length} entities matching "${term}"`, 'success');
      }
    } catch (error) {
      console.error('Search error:', error);
      showNotification('Error searching entities', 'error');
      setSearchResults([]);
    }
    setIsSearching(false);
  }, [apiEndpoint, apiKey, headers, setSearchResults, showNotification]);

  // Handle entity selection from search results (for viewing details)
  const handleSelectEntity = useCallback((entity) => {
    loadEntity(entity.ID);
  }, [loadEntity]);

  // Handle adding entity to graph (separate from viewing details)
  const handleAddEntity = useCallback(async (entity) => {
    if (addedEntityIds.includes(entity.ID)) {
      showNotification('Entity already added to graph', 'info');
      return;
    }

    try {
      // Add entity ID to the added list immediately for UI feedback
      setAddedEntityIds(prev => [...prev, entity.ID]);
      
      // Create a single node without relationships
      const singleNode = {
        id: entity.ID,
        name: entity.NAME,
        label: entity.LABEL,
        properties: entity.DESCRIPTION ? { description: entity.DESCRIPTION } : {},
        relationshipCount: 0,
        isExpanded: false,
        color: getNodeColor(entity.LABEL),
        size: 12
      };

      // Add only this single node to the graph
      setGraphData(prevData => ({
        nodes: [...prevData.nodes, singleNode],
        links: [...prevData.links] // Keep existing links unchanged
      }));

      // Set this as the selected entity
      setSelectedEntity({
        id: entity.ID,
        name: entity.NAME,
        label: entity.LABEL,
        properties: entity.DESCRIPTION ? { description: entity.DESCRIPTION } : {},
        relationship_count: 0,
        isExpanded: false
      });
      
      setSelectedNodeId(entity.ID);
      
      showNotification(`Added ${entity.NAME} to graph`, 'success');
    } catch (error) {
      // Remove from added list if there was an error
      setAddedEntityIds(prev => prev.filter(id => id !== entity.ID));
      console.error('Add entity error:', error);
      showNotification('Error adding entity to graph', 'error');
    }
  }, [addedEntityIds, getNodeColor, setGraphData, setSelectedEntity, showNotification]);

  // Clear graph
  const clearGraph = useCallback(() => {
    setGraphData({ nodes: [], links: [] });
    setSelectedEntity(null);
    setSelectedNodeId(null);
    setExpandedNodes(new Set());
    setAddedEntityIds([]);
    showNotification('Graph cleared', 'info');
  }, [setGraphData, setSelectedEntity, showNotification]);



  // Clear entity selection
  const clearSelection = useCallback(() => {
    setSelectedEntity(null);
    setSelectedNodeId(null);
  }, [setSelectedEntity]);

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Keyboard shortcut for fullscreen toggle
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Toggle fullscreen with 'F' key (when not typing in input fields)
      if (event.key === 'f' || event.key === 'F') {
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
          activeElement.tagName === 'INPUT' || 
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.contentEditable === 'true'
        );
        
        if (!isInputFocused) {
          event.preventDefault();
          toggleFullscreen();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [toggleFullscreen]);

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Fade in={true}>
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Page Header */}
          <Box sx={{ py: 2, px: 3, borderBottom: '1px solid #E9ECEF', backgroundColor: '#F8F9FA' }}>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 700, 
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
              }}
            >
              <TrendingUp size={24} />
              Knowledge Graph Explorer
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'text.secondary',
                fontWeight: 400,
                mt: 0.5
              }}
            >
              Discover and explore relationships between entities in your knowledge graph
            </Typography>
          </Box>

          {/* Main Content - Full height layout */}
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            overflow: 'hidden',
            height: 'calc(100vh - 120px)', // Subtract header height
            transition: 'all 0.3s ease-in-out' // Smooth transition for layout changes
          }}>
            {/* Graph Visualization - Dynamic width based on fullscreen state */}
            <Box sx={{ 
              width: isFullscreen ? '100%' : '70%', 
              height: '100%',
              p: 2,
              pr: isFullscreen ? 2 : 1, // Full padding when fullscreen
              transition: 'width 0.3s ease-in-out' // Smooth transition
            }}>
              <GraphViewer
                graphData={graphData}
                onNodeClick={handleNodeClick}
                onNodeDoubleClick={handleNodeDoubleClick}
                selectedNodeId={selectedNodeId}
                onClearGraph={clearGraph}
                sx={{ height: '100%' }}
              />
            </Box>

            {/* Right Side Panels - 30% width, hidden when fullscreen */}
            {!isFullscreen && (
              <Fade in={!isFullscreen} timeout={300}>
                <Box sx={{ 
                  width: '30%', 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  p: 2,
                  pl: 1 // Reduced left padding for tighter spacing
                }}>
                {/* Search Panel - 50% height */}
                <Box sx={{ height: '50%', mb: 1 }}>
                  <SearchPanel
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    onSearch={handleSearch}
                    searchResults={searchResults}
                    onAddEntity={handleAddEntity}
                    addedEntityIds={addedEntityIds}
                    isSearching={isSearching}
                    sx={{ height: '100%' }}
                  />
                </Box>

                {/* Entity Details Panel - 50% height */}
                <Box sx={{ height: '50%', mt: 1 }}>
                  <EntityDetailsPanel
                    selectedEntity={selectedEntity}
                    onExpandEntity={expandNode}
                    onClearSelection={clearSelection}
                    sx={{ height: '100%' }}
                  />
                </Box>
                </Box>
              </Fade>
            )}
          </Box>
        </Box>
      </Fade>

      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RelationshipsPageRevamped;