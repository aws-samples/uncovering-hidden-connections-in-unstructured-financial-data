import { forwardRef, useImperativeHandle, useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { Box, Typography, Paper, Fade } from '@mui/material';
import { Settings } from 'lucide-react';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import dagre from 'cytoscape-dagre';
import d3Force from 'cytoscape-d3-force';
import klay from 'cytoscape-klay';

// Register cytoscape extensions
cytoscape.use(fcose);
cytoscape.use(dagre);
cytoscape.use(d3Force);
cytoscape.use(klay);

const GraphCanvas = forwardRef(({
  graphData,
  selectedEntity,
  onNodeSelection,
  onNodeDoubleClick,
  onEdgeSelection,
  onClearSelection,
  displayOptions = { showLabels: true, showEdgeLabels: true },
  layout = 'd3-force'
}, ref) => {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [showLegend, setShowLegend] = useState(false);
  const [currentLayout, setCurrentLayout] = useState(layout); // Use prop as initial value

  // Use refs to store callbacks to prevent re-initialization
  const callbacksRef = useRef({
    onNodeSelection,
    onNodeDoubleClick,
    onEdgeSelection,
    onClearSelection
  });

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = {
      onNodeSelection,
      onNodeDoubleClick,
      onEdgeSelection,
      onClearSelection
    };
  }, [onNodeSelection, onNodeDoubleClick, onEdgeSelection, onClearSelection]);



  // Layout configurations
  const layoutConfigs = {
    'd3-force': {
      name: 'd3-force',
      animate: 'end',
      padding: 60,
      alphaMin: 0.3,
      ungrabifyWhileSimulating: true,
      fit: true,
      linkId: function id(d) { return d.id; },
      linkDistance: 200,
      manyBodyStrength: -600,
      collideRadius: 2,
      manyBodyDistanceMin: 20,
      randomize: false,
      infinite: false
    },
    'fcose': {
      name: 'fcose',
      quality: 'default',
      randomize: true,
      animate: 'end',
      animationDuration: 400,
      fit: true,
      padding: 30,
      nodeRepulsion: 4500,
      idealEdgeLength: 100,
      edgeElasticity: 0.55,
      nestingFactor: 0.1,
      numIter: 2500,
      tile: true,
      gravity: 0.25,
      gravityRange: 2
    },
    'dagre': {
      name: 'dagre',
      nodeSep: 130,
      edgeSep: 10,
      rankSep: 70,
      rankDir: 'TB',
      fit: true,
      padding: 100,
      animate: true,
      animationDuration: 500
    },
    'concentric': {
      name: 'concentric',
      fit: true,
      padding: 50,
      startAngle: 0,
      clockwise: true,
      equidistant: false,
      minNodeSpacing: 10,
      avoidOverlap: true,
      spacingFactor: 1.5,
      concentric: function (node) {
        return node.degree(false);
      },
      levelWidth: function () {
        return 1;
      },
      animate: true,
      animationDuration: 300
    }
  };

  // Node color mapping
  const getNodeColor = useCallback((label) => {
    const colors = {
      'PERSON': '#F8BBD9',           // Pastel pink - for people (soft and distinct from red)
      'ORGANIZATION': '#4ECDC4',
      'COMPANY': '#45B7D1',
      'LOCATION': '#96CEB4',
      'EVENT': '#FFEAA7',
      'PRODUCT': '#DDA0DD',
      'TECHNOLOGY': '#98D8C8'
    };
    return colors[label] || '#95A5A6';
  }, []);

  // Edge color mapping for different relationship types
  const getEdgeColor = useCallback((relationshipType) => {
    const colors = {
      'is a supplier/partner of': '#FFC107',    // Yellow - supplier/partner relationships
      'is a director of': '#F8BBD9',            // Pastel pink - director relationships (soft and distinct from red)
      'is a customer of': '#4CAF50',            // Green - customer relationships
      'is a competitor of': '#D32F2F',          // Bright red - competitor relationships (distinct from pastel pink)
      'is an employee/director of': '#F8BBD9'   // Pastel pink - employee/director relationships
    };
    return colors[relationshipType] || '#95A5A6'; // Default gray for unknown types
  }, []);

  // Run layout function with flicker prevention and memory management
  const runLayout = useCallback((layoutName = currentLayout, useAnimation = true) => {
    if (!cyRef.current || cyRef.current.destroyed()) {
      return;
    }

    const cy = cyRef.current;
    const config = { ...layoutConfigs[layoutName] };

    if (!config) {
      return;
    }

    try {
      // Prevent layout conflicts by stopping any running layouts
      cy.stop();

      config.animate = useAnimation ? config.animate || 'end' : false;

      // For incremental updates, use gentler animation settings
      if (useAnimation && cy.nodes().length > 0) {
        config.animationDuration = Math.min(config.animationDuration || 500, 300);
      }

      const layout = cy.layout(config);

      // Store layout reference for cleanup
      const currentLayoutRef = layout;

      // Add cleanup for layout animations
      if (useAnimation) {
        layout.one('layoutstop', () => {
          // Layout completed, cleanup if needed
          if (currentLayoutRef && typeof currentLayoutRef.destroy === 'function') {
            currentLayoutRef.destroy();
          }
        });
      }

      layout.run();
    } catch (error) {
      console.error(`Error running ${layoutName} layout:`, error);
    }
  }, [currentLayout, layoutConfigs]);

  // Zoom to fit function
  const zoomToFit = useCallback(() => {
    if (!cyRef.current) return;

    const cy = cyRef.current;
    cy.fit(undefined, 50); // 50px padding
  }, []);



  // Sync layout when prop changes
  useEffect(() => {
    if (layout !== currentLayout) {
      setCurrentLayout(layout);
      runLayout(layout, true);
    }
  }, [layout, currentLayout, runLayout]);

  // Initialize cytoscape
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele) => getNodeColor(ele.data('label')),
            'border-width': 2,
            'border-color': '#34495E',
            'width': 35,
            'height': 35,
            'label': 'data(name)',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 8,
            'font-size': 11,
            'font-weight': 'normal',
            'font-family': 'Inter, Arial, sans-serif',
            'color': '#2C3E50',
            'text-wrap': 'wrap',
            'cursor': 'grab',
            'overlay-opacity': 0,
            'z-index': 10
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#FF9900',
            'border-width': 4,
            'overlay-opacity': 0.1,
            'overlay-color': '#FF9900',
            'z-index': 999
          }
        },
        {
          selector: 'node:active',
          style: {
            'cursor': 'grabbing',
            'z-index': 999
          }
        },
        {
          selector: 'node.expanded',
          style: {
            'border-color': '#27AE60',
            'border-width': 3
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': (ele) => getEdgeColor(ele.data('label')),
            'target-arrow-color': (ele) => getEdgeColor(ele.data('label')),
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': 10,
            'font-family': 'Inter, Arial, sans-serif',
            'color': '#34495E',
            'text-rotation': 'autorotate',
            'text-margin-y': -8,
            'text-background-color': '#fff',
            'text-background-opacity': 0.8,
            'text-background-padding': 2,
            'text-background-shape': 'round-rectangle',
            'opacity': 0.8,
            'z-index': 1
          }
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#FF9900',
            'target-arrow-color': '#FF9900',
            'width': 3,
            'z-index': 999
          }
        }
      ],
      minZoom: 0.1,
      maxZoom: 5,
      wheelSensitivity: 0.2,
      motionBlur: false, // Disable motion blur to prevent disappearing nodes
      boxSelectionEnabled: true,
      selectionType: 'single',
      userPanningEnabled: true,
      userZoomingEnabled: true,
      autoungrabify: false,
      autounselectify: false,
      autolock: false,
      panningEnabled: true,
      zoomingEnabled: true,
      grabbable: true
    });

    cyRef.current = cy;

    // Essential event handlers - using refs to prevent re-initialization
    cy.on('tap', 'node', (evt) => {
      evt.stopPropagation();
      const nodeId = evt.target.id();
      if (callbacksRef.current.onNodeSelection) {
        callbacksRef.current.onNodeSelection(nodeId);
      }
    });

    cy.on('dblclick', 'node', (evt) => {
      evt.stopPropagation();
      const nodeId = evt.target.id();
      if (callbacksRef.current.onNodeDoubleClick) {
        callbacksRef.current.onNodeDoubleClick(nodeId);
      }
    });

    // Edge click handler
    cy.on('tap', 'edge', (evt) => {
      evt.stopPropagation();
      const edge = evt.target;
      const edgeData = {
        id: edge.id(),
        source: edge.source().id(),
        target: edge.target().id(),
        label: edge.data('label'),
        properties: edge.data('properties') || {},
        sourceNode: {
          id: edge.source().id(),
          name: edge.source().data('name'),
          label: edge.source().data('label')
        },
        targetNode: {
          id: edge.target().id(),
          name: edge.target().data('name'),
          label: edge.target().data('label')
        }
      };
      if (callbacksRef.current.onEdgeSelection) {
        callbacksRef.current.onEdgeSelection(edgeData);
      }
    });

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        if (callbacksRef.current.onClearSelection) {
          callbacksRef.current.onClearSelection();
        }
      }
    });

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      if (cy && !cy.destroyed()) {
        cy.resize();
        cy.fit(undefined, 50);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Store cleanup functions
    const cleanup = () => {
      // Disconnect resize observer
      if (resizeObserver) {
        resizeObserver.disconnect();
      }

      // Remove all event listeners and destroy cytoscape instance
      if (cyRef.current && !cyRef.current.destroyed()) {
        // Remove all event listeners to prevent memory leaks
        cyRef.current.removeAllListeners();
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };

    return cleanup;
  }, [getNodeColor, getEdgeColor]); // Depend on both color functions, use refs for callbacks

  // Update styles when display options change
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    // Batch style updates to prevent flicker
    cy.startBatch();

    try {
      // Update node label visibility
      cy.style()
        .selector('node')
        .style('label', displayOptions.showLabels ? 'data(name)' : '')
        .update();

      // Update edge label visibility
      cy.style()
        .selector('edge')
        .style('label', displayOptions.showEdgeLabels ? 'data(label)' : '')
        .update();
    } finally {
      cy.endBatch();
    }

  }, [displayOptions]);

  // Track previous graph structure for incremental updates
  const prevGraphStructure = useRef({ nodeIds: [], edgeIds: [] });

  // Update graph data - truly incremental version with flicker prevention
  useEffect(() => {
    if (!cyRef.current) return;

    const cy = cyRef.current;
    const currentNodeIds = graphData.nodes?.map(n => String(n.id)) || [];
    const currentEdgeIds = graphData.edges?.map(e => String(e.id)) || [];
    const prevNodeIds = prevGraphStructure.current.nodeIds;
    const prevEdgeIds = prevGraphStructure.current.edgeIds;

    // Find what's new, removed, or changed
    const newNodeIds = currentNodeIds.filter(id => !prevNodeIds.includes(id));
    const removedNodeIds = prevNodeIds.filter(id => !currentNodeIds.includes(id));
    const newEdgeIds = currentEdgeIds.filter(id => !prevEdgeIds.includes(id));
    const removedEdgeIds = prevEdgeIds.filter(id => !currentEdgeIds.includes(id));

    // Batch all operations to prevent multiple redraws
    cy.startBatch();

    try {
      // Remove deleted elements
      if (removedNodeIds.length > 0) {
        cy.remove(cy.nodes().filter(node => removedNodeIds.includes(node.id())));
      }
      if (removedEdgeIds.length > 0) {
        cy.remove(cy.edges().filter(edge => removedEdgeIds.includes(edge.id())));
      }

      // Add new nodes
      if (newNodeIds.length > 0) {
        const newNodeElements = graphData.nodes
          .filter(node => newNodeIds.includes(String(node.id)))
          .map(node => ({
            group: 'nodes',
            data: {
              id: String(node.id),
              name: node.name,
              label: node.label,
              relationshipCount: node.relationshipCount || 0,
              isExpanded: node.isExpanded || false,
              properties: node.properties || {}
            },
            classes: node.isExpanded ? 'expanded' : ''
          }));
        cy.add(newNodeElements);
      }

      // Add new edges
      if (newEdgeIds.length > 0) {
        const newEdgeElements = graphData.edges
          .filter(edge => newEdgeIds.includes(String(edge.id)))
          .map(edge => ({
            group: 'edges',
            data: {
              id: String(edge.id),
              source: String(edge.source),
              target: String(edge.target),
              label: edge.label || '',
              properties: edge.properties || {}
            }
          }));
        cy.add(newEdgeElements);
      }

      // Update existing nodes' data only if actually changed
      graphData.nodes?.forEach(node => {
        if (!newNodeIds.includes(String(node.id))) {
          const cyNode = cy.getElementById(String(node.id));
          if (cyNode.length > 0) {
            const currentData = cyNode.data();
            const hasDataChanged =
              currentData.name !== node.name ||
              currentData.label !== node.label ||
              currentData.isExpanded !== (node.isExpanded || false) ||
              currentData.relationshipCount !== (node.relationshipCount || 0);

            if (hasDataChanged) {
              cyNode.data({
                ...currentData,
                name: node.name,
                label: node.label,
                relationshipCount: node.relationshipCount || 0,
                isExpanded: node.isExpanded || false,
                properties: node.properties || {}
              });

              // Update classes only if expansion state changed
              if (currentData.isExpanded !== (node.isExpanded || false)) {
                cyNode.removeClass('expanded');
                if (node.isExpanded) {
                  cyNode.addClass('expanded');
                }
              }
            }
          }
        }
      });

    } finally {
      cy.endBatch();
    }

    // Only run layout if we added new elements or it's the first load
    if (newNodeIds.length > 0 || newEdgeIds.length > 0 || prevNodeIds.length === 0) {
      const isFirstLoad = prevNodeIds.length === 0;
      // Use requestAnimationFrame to prevent layout conflicts
      requestAnimationFrame(() => {
        runLayout(currentLayout, !isFirstLoad && newNodeIds.length > 0);
      });
    }

    // Update the previous structure reference
    prevGraphStructure.current = {
      nodeIds: currentNodeIds,
      edgeIds: currentEdgeIds
    };

  }, [graphData.nodes, graphData.edges, currentLayout, runLayout]);

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Clear any pending animation frames
      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        // Cancel any pending requestAnimationFrame calls
        const highestId = setTimeout(() => { }, 0);
        for (let i = 0; i < highestId; i++) {
          clearTimeout(i);
        }
      }

      // Clear any intervals or timeouts that might be running
      prevGraphStructure.current = { nodeIds: [], edgeIds: [] };
    };
  }, []);

  // Update selection - optimized to prevent flickering
  useEffect(() => {
    if (!cyRef.current) return;

    const cy = cyRef.current;
    const currentlySelected = cy.elements(':selected');

    // Use batch operations for selection changes to prevent flicker
    cy.startBatch();

    try {
      if (selectedEntity) {
        const targetNode = cy.getElementById(selectedEntity.id);

        // Only update selection if it's actually different
        if (targetNode.length > 0 && !targetNode.selected()) {
          cy.elements().unselect();
          targetNode.select();
        }
      } else if (currentlySelected.length > 0) {
        // Only unselect if something is currently selected
        currentlySelected.unselect();
      }
    } finally {
      cy.endBatch();
    }
  }, [selectedEntity]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    cytoscape: cyRef.current,
    runLayout: () => runLayout(currentLayout, true),
    zoomToFit: zoomToFit,
    setLayout: (layoutName) => {
      setCurrentLayout(layoutName);
      runLayout(layoutName, true);
    },
    getCurrentLayout: () => currentLayout,
    currentLayout: currentLayout,
    layoutConfigs: Object.keys(layoutConfigs),
    forceRender: () => {
      if (cyRef.current) {
        cyRef.current.forceRender();
      }
    },
    resize: () => {
      if (cyRef.current && !cyRef.current.destroyed()) {
        try {
          cyRef.current.resize();
          // Add a small delay before fitting to ensure resize is complete
          setTimeout(() => {
            if (cyRef.current && !cyRef.current.destroyed()) {
              cyRef.current.fit(undefined, 50);
            }
          }, 10);
        } catch (error) {
          console.error('Error during graph resize:', error);
        }
      }
    }
  }), [runLayout, zoomToFit, currentLayout, layoutConfigs]);

  // Memoize unique labels for legend
  const uniqueNodeLabels = useMemo(() =>
    Array.from(new Set(graphData.nodes?.map(n => n.label) || [])),
    [graphData.nodes]
  );

  const uniqueEdgeLabels = useMemo(() =>
    Array.from(new Set(graphData.edges?.map(e => e.label) || [])).filter(label => label && label.trim()),
    [graphData.edges]
  );

  return (
    <Box sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Graph Container */}
      <Box
        ref={containerRef}
        sx={{
          width: '100%',
          height: '100%',
          backgroundColor: '#FAFAFA',
          position: 'relative',
          overflow: 'hidden',
          '& canvas': {
            outline: 'none',
            display: 'block'
          },
          '& > div': {
            width: '100% !important',
            height: '100% !important'
          }
        }}
      />

      {/* Legend */}
      {showLegend && (uniqueNodeLabels.length > 0 || uniqueEdgeLabels.length > 0) && (
        <Fade in={showLegend}>
          <Paper sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            p: 2,
            minWidth: 200,
            maxWidth: 280,
            maxHeight: '70vh',
            overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderRadius: 2,
            zIndex: 1000
          }}>
            {/* Node Types */}
            {uniqueNodeLabels.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                  Node Types
                </Typography>
                {uniqueNodeLabels.map(label => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box sx={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      backgroundColor: getNodeColor(label),
                      border: '2px solid #34495E',
                      flexShrink: 0
                    }} />
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                      {label}
                    </Typography>
                  </Box>
                ))}
              </>
            )}

            {/* Relationship Types */}
            {uniqueEdgeLabels.length > 0 && (
              <>
                {uniqueNodeLabels.length > 0 && <Box sx={{ my: 2, borderBottom: '1px solid #E0E0E0' }} />}
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                  Relationship Types
                </Typography>
                {uniqueEdgeLabels.map(label => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box sx={{
                      width: 20,
                      height: 3,
                      backgroundColor: getEdgeColor(label),
                      borderRadius: 1,
                      flexShrink: 0,
                      position: 'relative',
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        right: -2,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 0,
                        height: 0,
                        borderLeft: `4px solid ${getEdgeColor(label)}`,
                        borderTop: '3px solid transparent',
                        borderBottom: '3px solid transparent'
                      }
                    }} />
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                      {label.replace(/_/g, ' ')}
                    </Typography>
                  </Box>
                ))}
              </>
            )}
          </Paper>
        </Fade>
      )}

      {/* Empty State */}
      {!graphData.nodes.length && (
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'text.secondary'
        }}>
          <Settings size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography variant="h6" sx={{ mb: 1, opacity: 0.7 }}>
            No Graph Data
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.6 }}>
            Search for entities to start building your knowledge graph
          </Typography>
        </Box>
      )}

      {/* Legend Toggle Button */}
      {(uniqueNodeLabels.length > 0 || uniqueEdgeLabels.length > 0) && (
        <Box sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 1000
        }}>
          <Paper
            sx={{
              p: 1,
              cursor: 'pointer',
              backgroundColor: showLegend ? 'primary.main' : 'background.paper',
              color: showLegend ? 'primary.contrastText' : 'text.primary',
              '&:hover': {
                backgroundColor: showLegend ? 'primary.dark' : 'grey.100'
              }
            }}
            onClick={() => setShowLegend(!showLegend)}
          >
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Legend
            </Typography>
          </Paper>
        </Box>
      )}
    </Box>
  );
});

GraphCanvas.displayName = 'GraphCanvas';

export default GraphCanvas;