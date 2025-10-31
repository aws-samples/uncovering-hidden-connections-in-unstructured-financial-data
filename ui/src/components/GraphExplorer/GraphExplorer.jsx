import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
    Box,
    Typography,
    Paper,
    IconButton,
    Tooltip,
    Divider,
    Fade,
    Snackbar,
    Alert,
    Drawer,
    AppBar,
    Toolbar,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress
} from '@mui/material';
import {
    Trash2,
    RefreshCw,
    TrendingUp,
    Search,
    X,
    Expand,
    Filter,
    Maximize2
} from 'lucide-react';
import GraphCanvas from './GraphCanvas';
import SearchPanel from './SearchPanel';
import EntityDetailsPanel from './EntityDetailsPanel';
import ConnectionsPanel from './ConnectionsPanel';
import { cachedFetch } from '../../utils/apiCache';
import ErrorBoundary from '../ErrorBoundary';
import { useNormalizedGraphData } from '../../hooks/useNormalizedGraphData';
import FilterPanel from './FilterPanel';

const GraphExplorer = ({
    apiEndpoint,
    apiKey,
    onError,
    graphData: externalGraphData,
    setGraphData: setExternalGraphData,
    searchResults: externalSearchResults,
    setSearchResults: setExternalSearchResults,
    addedEntityIds: externalAddedEntityIds,
    setAddedEntityIds: setExternalAddedEntityIds,
    selectedEntity: externalSelectedEntity,
    setSelectedEntity: setExternalSelectedEntity,
    selectedRelationship: externalSelectedRelationship,
    setSelectedRelationship: setExternalSelectedRelationship,
    currentFilters: externalCurrentFilters,
    setCurrentFilters: setExternalCurrentFilters,
    graphLoaded: externalGraphLoaded,
    setGraphLoaded: setExternalGraphLoaded,
    leftDrawerOpen: externalLeftDrawerOpen,
    setLeftDrawerOpen: setExternalLeftDrawerOpen,
    rightDrawerOpen: externalRightDrawerOpen,
    setRightDrawerOpen: setExternalRightDrawerOpen,
    activeLeftPanel: externalActiveLeftPanel,
    setActiveLeftPanel: setExternalActiveLeftPanel,
    activeRightPanel: externalActiveRightPanel,
    setActiveRightPanel: setExternalActiveRightPanel,
    currentLayout: externalCurrentLayout,
    setCurrentLayout: setExternalCurrentLayout
}) => {
    // Graph state using normalized data - now using external state
    const {
        getGraphData,
        getEntity,
        addEntitiesToGraph,
        addRelationshipsToGraph,
        updateEntityInGraph,
        clearGraphData,
        hasEntity,
        stats,
        uniqueEntityTypes,
        uniqueRelationshipTypes,
        batchUpdate
    } = useNormalizedGraphData(externalGraphData || { nodes: [], edges: [] });

    // Use external state for persistence (with fallbacks for backward compatibility)
    const selectedEntity = externalSelectedEntity;
    const setSelectedEntity = setExternalSelectedEntity || (() => {});
    const selectedRelationship = externalSelectedRelationship;
    const setSelectedRelationship = setExternalSelectedRelationship || (() => {});
    const searchResults = externalSearchResults || [];
    const setSearchResults = setExternalSearchResults || (() => {});
    const addedEntityIds = externalAddedEntityIds || [];
    const setAddedEntityIds = setExternalAddedEntityIds || (() => {});
    const currentFilters = externalCurrentFilters;
    const setCurrentFilters = setExternalCurrentFilters || (() => {});

    // UI state - use external state for persistence (with fallbacks)
    const leftDrawerOpen = externalLeftDrawerOpen !== undefined ? externalLeftDrawerOpen : true;
    const setLeftDrawerOpen = setExternalLeftDrawerOpen || (() => {});
    const rightDrawerOpen = externalRightDrawerOpen !== undefined ? externalRightDrawerOpen : true;
    const setRightDrawerOpen = setExternalRightDrawerOpen || (() => {});
    const activeLeftPanel = externalActiveLeftPanel || 'search';
    const setActiveLeftPanel = setExternalActiveLeftPanel || (() => {});
    const activeRightPanel = externalActiveRightPanel || 'details';
    const setActiveRightPanel = setExternalActiveRightPanel || (() => {});
    const currentLayout = externalCurrentLayout || 'd3-force';
    const setCurrentLayout = setExternalCurrentLayout || (() => {});

    // Local UI state that doesn't need persistence
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

    // Handle window resize to ensure graph adapts to container changes
    useEffect(() => {
        const handleResize = () => {
            if (graphRef.current?.resize) {
                graphRef.current.resize();
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Graph controls
    const graphRef = useRef();
    const graphDataRef = useRef();
    const [isSearching, setIsSearching] = useState(false);
    const [expandingNodeIds, setExpandingNodeIds] = useState(new Set());
    const [isLayoutRunning, setIsLayoutRunning] = useState(false); // Track layout operations

    // Memoized filtered graph data using normalized data
    const filteredGraphData = useMemo(() => {
        const filters = {};
        
        if (currentFilters) {
            // Convert filter format for normalized data
            if (currentFilters.nodeTypes && Object.keys(currentFilters.nodeTypes).length > 0) {
                // Get visible types (those that are true or undefined)
                const visibleTypes = Object.keys(currentFilters.nodeTypes).filter(
                    type => currentFilters.nodeTypes[type] !== false
                );
                // Always apply the filter - empty array means show nothing
                filters.entityTypes = visibleTypes;
            }
            
            if (currentFilters.edgeTypes && Object.keys(currentFilters.edgeTypes).length > 0) {
                // Get visible types (those that are true or undefined)
                const visibleTypes = Object.keys(currentFilters.edgeTypes).filter(
                    type => currentFilters.edgeTypes[type] !== false
                );
                // Always apply the filter - empty array means show nothing
                filters.relationshipTypes = visibleTypes;
            }
            
            if (currentFilters.searchFilter) {
                filters.searchTerm = currentFilters.searchFilter;
            }

            // Add connection count range filter
            if (currentFilters.minConnections !== undefined || currentFilters.maxConnections !== undefined) {
                filters.connectionRange = {
                    min: currentFilters.minConnections || 0,
                    max: currentFilters.maxConnections || 100
                };
            }
        }

        return getGraphData(filters);
    }, [getGraphData, currentFilters, uniqueEntityTypes, uniqueRelationshipTypes]);

    // Keep ref updated
    useEffect(() => {
        graphDataRef.current = filteredGraphData;
    }, [filteredGraphData]);

    // Sync normalized graph data with external state
    useEffect(() => {
        const currentGraphData = getGraphData();
        if (setExternalGraphData && (
            currentGraphData.nodes.length !== (externalGraphData?.nodes?.length || 0) ||
            currentGraphData.edges.length !== (externalGraphData?.edges?.length || 0)
        )) {
            setExternalGraphData(currentGraphData);
        }
    }, [getGraphData, setExternalGraphData, externalGraphData]);

    // Handle filter changes
    const handleFilterChange = useCallback((filters) => {
        setCurrentFilters(filters);
    }, []);

    const showNotification = useCallback((message, severity = 'info') => {
        setNotification({ open: true, message, severity });
    }, []);

    const handleClearSearch = useCallback(() => {
        setSearchResults([]);
    }, []);

    // Helper function to create consistent node structure
    const createNodeFromEntity = useCallback((entity) => {
        return {
            id: entity.ID || entity.id,
            name: entity.NAME || entity.name,
            label: entity.LABEL || entity.label,
            properties: entity.PROPERTIES || entity.properties || {},
            relationshipCount: entity.EDGES ? entity.EDGES.length : 0,
            isExpanded: false
        };
    }, []);

    // Helper function to create consistent node from relationship data
    const createNodeFromRelationship = useCallback((relNode) => {
        return {
            id: relNode.id,
            name: relNode.name,
            label: relNode.label,
            properties: relNode.properties || {}, // This will be empty from API, but consistent
            relationshipCount: 0, // Unknown until expanded
            isExpanded: false,
            needsFullDetails: true // Flag to indicate this node needs full details fetched
        };
    }, []);

    // Function to fetch full entity details for nodes that need them
    const fetchFullEntityDetails = useCallback(async (entityId) => {
        if (!apiEndpoint || !apiKey) return null;

        try {
            const response = await cachedFetch(
                `https://${apiEndpoint}/relationships?entity_id=${encodeURIComponent(entityId)}`,
                {
                    method: 'GET',
                    headers: {
                        'x-api-key': apiKey,
                        'Content-Type': 'application/json'
                    }
                },
                10 * 60 * 1000 // 10 minutes cache for entity details
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.entity;
        } catch (error) {
            console.error('Error fetching entity details:', error);
            return null;
        }
    }, [apiEndpoint, apiKey]);

    // Search functionality
    const handleSearch = useCallback(async (term) => {
        if (!term.trim() || !apiEndpoint || !apiKey) return;

        setIsSearching(true);
        try {
            const response = await cachedFetch(
                `https://${apiEndpoint}/relationships?search=${encodeURIComponent(term.trim())}`,
                {
                    method: 'GET',
                    headers: {
                        'x-api-key': apiKey,
                        'Content-Type': 'application/json'
                    }
                },
                2 * 60 * 1000 // 2 minutes cache for search results
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setSearchResults(data);

            if (data.length === 0) {
                showNotification('No entities found matching your search', 'info');
            } else {
                showNotification(`Found ${data.length} entities matching "${term}"`, 'success');
            }
        } catch (error) {
            console.error('Search error:', error);
            showNotification('Error searching entities', 'error');
            setSearchResults([]);
            onError?.(error);
        }
        setIsSearching(false);
    }, [apiEndpoint, apiKey, showNotification, onError]);

    // Add entity to graph
    const handleAddEntity = useCallback(async (entity) => {

        try {
            // Check if already added first
            setAddedEntityIds(prevIds => {
                if (prevIds.includes(entity.ID)) {
                    showNotification('Entity already exists in graph', 'info');
                    return prevIds;
                }

                // Add to graph data using normalized approach
                if (!hasEntity(entity.ID)) {
                    const newNode = createNodeFromEntity(entity);
                    addEntitiesToGraph([newNode]);
                }

                showNotification(`Added ${entity.NAME} to graph`, 'success');
                return [...prevIds, entity.ID];
            });

        } catch (error) {
            showNotification('Error adding entity to graph', 'error');
            onError?.(error);
        }
    }, [showNotification, onError, hasEntity, addEntitiesToGraph, createNodeFromEntity]);

    // Expand entity relationships
    const handleExpandEntity = useCallback(async (entityId) => {
        if (!apiEndpoint || !apiKey) return;

        // Check if this specific node is already expanding
        if (expandingNodeIds.has(entityId)) return;

        setExpandingNodeIds(prev => new Set([...prev, entityId]));
        try {
            const response = await cachedFetch(
                `https://${apiEndpoint}/relationships?entity_id=${encodeURIComponent(entityId)}`,
                {
                    method: 'GET',
                    headers: {
                        'x-api-key': apiKey,
                        'Content-Type': 'application/json'
                    }
                },
                5 * 60 * 1000 // 5 minutes cache for relationship data
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const { entity, relationships } = data;

            // Update existing entity and add new ones using normalized data
            const operations = [];
            
            // Update the expanded entity
            operations.push({
                type: 'updateEntity',
                entityId: entityId,
                updates: { isExpanded: true, relationshipCount: relationships.length }
            });

            // Collect new entities and relationships
            const newEntities = [];
            const newRelationships = [];

            relationships.forEach(rel => {
                // Add source node if not exists
                if (!hasEntity(rel.source.id)) {
                    newEntities.push(createNodeFromRelationship(rel.source));
                }

                // Add target node if not exists
                if (!hasEntity(rel.target.id)) {
                    newEntities.push(createNodeFromRelationship(rel.target));
                }

                // Add relationship
                newRelationships.push({
                    id: rel.id,
                    source: rel.source.id,
                    target: rel.target.id,
                    label: rel.label,
                    properties: rel.properties || {}
                });
            });

            // Add batch operations for new entities and relationships
            if (newEntities.length > 0) {
                operations.push({
                    type: 'addEntities',
                    entities: newEntities
                });
            }

            if (newRelationships.length > 0) {
                operations.push({
                    type: 'addRelationships',
                    relationships: newRelationships
                });
            }

            // Execute all operations in a batch
            batchUpdate(operations);

            showNotification(`Expanded ${entity.name} - added ${relationships.length} relationships`, 'success');
        } catch (error) {
            console.error('Expand entity error:', error);
            showNotification('Error expanding entity relationships', 'error');
            onError?.(error);
        } finally {
            setExpandingNodeIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(entityId);
                return newSet;
            });
        }
    }, [apiEndpoint, apiKey, expandingNodeIds, showNotification, onError, hasEntity, batchUpdate]);

    // Graph controls
    const fitToView = useCallback(() => {
        if (graphRef.current?.zoomToFit) {
            graphRef.current.zoomToFit();
        } else if (graphRef.current?.cytoscape) {
            graphRef.current.cytoscape.fit(undefined, 50);
        }
    }, []);

    const restartLayout = useCallback(() => {
        if (graphRef.current?.runLayout) {
            setIsLayoutRunning(true);
            graphRef.current.runLayout();
            // Reset loading state after animation completes
            setTimeout(() => setIsLayoutRunning(false), 1000);
        }
    }, []);

    const clearGraph = useCallback(() => {
        clearGraphData();
        setSelectedEntity(null);
        setSelectedRelationship(null);
        setAddedEntityIds([]);
        setSearchResults([]);
        setCurrentFilters(null);
        if (setExternalGraphData) {
            setExternalGraphData({ nodes: [], edges: [] });
        }
        showNotification('Graph cleared', 'info');
    }, [clearGraphData, showNotification, setSelectedEntity, setSelectedRelationship, setAddedEntityIds, setSearchResults, setCurrentFilters, setExternalGraphData]);

    const toggleFullscreen = useCallback(() => {
        setIsFullscreen(prev => !prev);
        if (!isFullscreen) {
            setLeftDrawerOpen(false);
            setRightDrawerOpen(false);
        } else {
            setLeftDrawerOpen(true);
            setRightDrawerOpen(true);
        }
        
        // Trigger resize and fit after DOM updates
        setTimeout(() => {
            if (graphRef.current?.resize) {
                graphRef.current.resize();
            }
            // Also trigger a second resize after a bit more delay to ensure proper sizing
            setTimeout(() => {
                if (graphRef.current?.resize) {
                    graphRef.current.resize();
                }
            }, 50);
        }, 50);
    }, [isFullscreen]);

    // Handle node selection
    const handleNodeSelection = useCallback(async (nodeId) => {

        // Clear relationship selection when node is selected
        setSelectedRelationship(null);

        // Find the node using normalized data
        const node = getEntity(nodeId);
        if (!node) return;

        // Create the selected entity object
        let selectedEntityData = {
            id: node.id,
            name: node.name,
            label: node.label,
            properties: node.properties,
            relationship_count: node.relationshipCount,
            isExpanded: node.isExpanded
        };

        // If node needs full details and doesn't have them, fetch them
        if (node.needsFullDetails && (!node.properties || Object.keys(node.properties).length === 0)) {
            const fullEntity = await fetchFullEntityDetails(nodeId);

            if (fullEntity) {
                // Update the selected entity data with full details
                selectedEntityData = {
                    ...selectedEntityData,
                    properties: fullEntity.properties || {},
                    relationship_count: fullEntity.relationship_count || selectedEntityData.relationship_count
                };

                // Update the entity in normalized data
                updateEntityInGraph(nodeId, {
                    properties: fullEntity.properties || {},
                    relationshipCount: fullEntity.relationship_count || node.relationshipCount,
                    needsFullDetails: false
                });
            }
        }

        // Set selected entity
        setSelectedEntity(prevSelected => {
            // Only update if actually different to prevent unnecessary re-renders
            if (!prevSelected || prevSelected.id !== nodeId) {
                return selectedEntityData;
            }
            return prevSelected;
        });
    }, [fetchFullEntityDetails, getEntity, updateEntityInGraph]); // Add normalized data dependencies

    // Handle edge selection
    const handleEdgeSelection = useCallback((edgeData) => {
        // Clear entity selection and set relationship selection
        setSelectedEntity(null);
        setSelectedRelationship(edgeData);
    }, []);

    // Handle clear selection
    const handleClearSelection = useCallback(() => {
        setSelectedEntity(null);
        setSelectedRelationship(null);
    }, []);

    const drawerWidth = 320;

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Top App Bar */}
            <AppBar position="static" elevation={1} sx={{ zIndex: 1201, backgroundColor: 'white', color: 'text.primary' }}>
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600, color: 'primary.main' }}>
                        Relationships Explorer
                    </Typography>

                    {/* Layout Controls */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mr: 2 }}>
                        {/* Layout Selector */}
                        <FormControl size="small" sx={{ minWidth: 180 }}>
                            <InputLabel sx={{ color: 'text.primary' }}>Layout</InputLabel>
                            <Select
                                value={currentLayout}
                                label="Layout"
                                onChange={(e) => {
                                    const newLayout = e.target.value;
                                    setCurrentLayout(newLayout);
                                    if (graphRef.current?.setLayout) {
                                        graphRef.current.setLayout(newLayout);
                                    }
                                }}
                                sx={{ 
                                    color: 'text.primary',
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'rgba(0, 0, 0, 0.23)'
                                    },
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'rgba(0, 0, 0, 0.87)'
                                    }
                                }}
                                disabled={stats.entityCount === 0}
                            >
                                <MenuItem value="d3-force">Force Directed (D3) ⭐</MenuItem>
                                <MenuItem value="fcose">Force Directed (FCose)</MenuItem>
                                <MenuItem value="dagre">Hierarchical</MenuItem>
                                <MenuItem value="concentric">Concentric</MenuItem>
                            </Select>
                        </FormControl>

                        {/* Control Buttons */}
                        <Tooltip title="Re-run Layout">
                            <IconButton 
                                sx={{ color: 'text.primary' }} 
                                size="small" 
                                onClick={restartLayout} 
                                disabled={stats.entityCount === 0 || isLayoutRunning}
                            >
                                {isLayoutRunning ? (
                                    <CircularProgress size={18} sx={{ color: 'text.primary' }} />
                                ) : (
                                    <RefreshCw size={18} />
                                )}
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Zoom to Fit">
                            <IconButton 
                                sx={{ color: 'text.primary' }} 
                                size="small" 
                                onClick={fitToView} 
                                disabled={stats.entityCount === 0}
                            >
                                <Maximize2 size={18} />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    <Divider orientation="vertical" flexItem sx={{ mx: 1, backgroundColor: 'rgba(0,0,0,0.12)' }} />

                    <Tooltip title="Clear Graph">
                        <IconButton sx={{ color: 'text.primary' }} onClick={clearGraph} disabled={stats.entityCount === 0}>
                            <Trash2 size={18} />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Toggle Fullscreen">
                        <IconButton sx={{ color: 'text.primary' }} onClick={toggleFullscreen}>
                            {isFullscreen ? <X size={18} /> : <Expand size={18} />}
                        </IconButton>
                    </Tooltip>
                </Toolbar>
            </AppBar>

            {/* Main Content */}
            <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Left Drawer */}
                {!isFullscreen && (
                    <Drawer
                        variant="persistent"
                        anchor="left"
                        open={leftDrawerOpen}
                        sx={{
                            width: leftDrawerOpen ? drawerWidth : 0,
                            flexShrink: 0,
                            transition: 'width 0.3s ease-in-out',
                            '& .MuiDrawer-paper': {
                                width: drawerWidth,
                                boxSizing: 'border-box',
                                position: 'relative',
                                height: '100%',
                                transition: 'width 0.3s ease-in-out'
                            },
                        }}
                    >
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        {/* Panel Tabs */}
                        <Box sx={{ borderBottom: 1, borderColor: 'divider', p: 1 }}>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    size="small"
                                    variant={activeLeftPanel === 'search' ? 'contained' : 'text'}
                                    onClick={() => setActiveLeftPanel('search')}
                                    startIcon={<Search size={16} />}
                                    sx={{
                                        ...(activeLeftPanel === 'search' && {
                                            backgroundColor: 'primary.main',
                                            color: 'white',
                                            '&:hover': {
                                                backgroundColor: 'primary.dark'
                                            }
                                        })
                                    }}
                                >
                                    Search
                                </Button>
                                <Button
                                    size="small"
                                    variant={activeLeftPanel === 'connections' ? 'contained' : 'text'}
                                    onClick={() => setActiveLeftPanel('connections')}
                                    startIcon={<TrendingUp size={16} />}
                                    sx={{
                                        ...(activeLeftPanel === 'connections' && {
                                            backgroundColor: 'primary.main',
                                            color: 'white',
                                            '&:hover': {
                                                backgroundColor: 'primary.dark'
                                            }
                                        })
                                    }}
                                >
                                    Connections
                                </Button>
                                <Button
                                    size="small"
                                    variant={activeLeftPanel === 'filter' ? 'contained' : 'text'}
                                    onClick={() => setActiveLeftPanel('filter')}
                                    startIcon={<Filter size={16} />}
                                    sx={{
                                        ...(activeLeftPanel === 'filter' && {
                                            backgroundColor: 'primary.main',
                                            color: 'white',
                                            '&:hover': {
                                                backgroundColor: 'primary.dark'
                                            }
                                        })
                                    }}
                                >
                                    Filter
                                </Button>
                            </Box>
                        </Box>

                        {/* Panel Content */}
                        <Box sx={{ flex: 1, overflow: 'hidden' }}>
                            {activeLeftPanel === 'search' && (
                                <ErrorBoundary>
                                    <SearchPanel
                                        onSearch={handleSearch}
                                        searchResults={searchResults}
                                        onAddEntity={handleAddEntity}
                                        isSearching={isSearching}
                                        addedEntityIds={addedEntityIds}
                                        onClearSearch={handleClearSearch}
                                    />
                                </ErrorBoundary>
                            )}
                            {activeLeftPanel === 'connections' && (
                                <ErrorBoundary>
                                    <ConnectionsPanel
                                        graphData={filteredGraphData}
                                        onExpandEntity={handleExpandEntity}
                                        expandingNodeIds={expandingNodeIds}
                                    />
                                </ErrorBoundary>
                            )}
                            {activeLeftPanel === 'filter' && (
                                <FilterPanel
                                    graphData={getGraphData()}
                                    onFilterChange={handleFilterChange}
                                />
                            )}
                        </Box>
                    </Box>
                </Drawer>
                )}

                {/* Graph Canvas */}
                <Box sx={{
                    flex: 1,
                    height: '100%',
                    position: 'relative',
                    transition: 'all 0.3s ease-in-out'
                }}>
                    <ErrorBoundary>
                        <GraphCanvas
                            ref={graphRef}
                            graphData={filteredGraphData}
                            selectedEntity={selectedEntity}
                            onNodeSelection={handleNodeSelection}
                            onNodeDoubleClick={handleExpandEntity}
                            onEdgeSelection={handleEdgeSelection}
                            onClearSelection={handleClearSelection}
                            layout={currentLayout}
                            displayOptions={currentFilters ? {
                                showLabels: currentFilters.showLabels,
                                showEdgeLabels: currentFilters.showEdgeLabels
                            } : { showLabels: true, showEdgeLabels: true }}
                        />
                    </ErrorBoundary>
                </Box>

                {/* Right Drawer */}
                {!isFullscreen && (
                    <Drawer
                        variant="persistent"
                        anchor="right"
                        open={rightDrawerOpen}
                        sx={{
                            width: rightDrawerOpen ? drawerWidth : 0,
                            flexShrink: 0,
                            transition: 'width 0.3s ease-in-out',
                            '& .MuiDrawer-paper': {
                                width: drawerWidth,
                                boxSizing: 'border-box',
                                position: 'relative',
                                height: '100%',
                                transition: 'width 0.3s ease-in-out'
                            },
                        }}
                    >
                    <ErrorBoundary>
                        <EntityDetailsPanel
                            selectedEntity={selectedEntity}
                            selectedRelationship={selectedRelationship}
                            onClearSelection={handleClearSelection}
                            onExpandEntity={handleExpandEntity}
                            expandingNodeIds={expandingNodeIds}
                        />
                    </ErrorBoundary>
                </Drawer>
                )}
            </Box>

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

export default GraphExplorer;