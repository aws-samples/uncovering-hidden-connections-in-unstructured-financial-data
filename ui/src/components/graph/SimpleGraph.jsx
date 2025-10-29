import React, { forwardRef, memo, useCallback, useImperativeHandle, useState, useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import d3Force from 'cytoscape-d3-force';
import dagre from 'cytoscape-dagre';
import fcose from 'cytoscape-fcose';
import klay from 'cytoscape-klay';

// Register cytoscape extensions
cytoscape.use(klay);
cytoscape.use(dagre);
cytoscape.use(d3Force);
cytoscape.use(fcose);

const EMPTY_SET = new Set();

const SimpleGraph = forwardRef(({
  nodes = [],
  edges = [],
  selectedNodesIds = EMPTY_SET,
  selectedEdgesIds = EMPTY_SET,
  onSelectedElementIdsChange,
  onNodeClick,
  onNodeDoubleClick,
  onEdgeClick,
  onGraphClick,
  className = '',
  styles = {},
  layout = 'fcose',
  minZoom = 0.01,
  maxZoom = 5,
  motionBlur = true,
  hideEdgesOnViewport = false,
  boxSelectionEnabled = true,
  zoom = 1,
  autounselectify = false,
  autolock = false,
  autoungrabify = false,
  selectionType = 'single',
  userPanningEnabled = true,
  userZoomingEnabled = true,
  onZoomChanged,
  onPanChanged,
  onLayoutRunningChanged,
  hiddenNodesIds = EMPTY_SET,
  hiddenEdgesIds = EMPTY_SET,
  lockedNodesIds = EMPTY_SET,
  outOfFocusNodesIds = EMPTY_SET,
  outOfFocusEdgesIds = EMPTY_SET,
  useAnimation = true,
  additionalLayoutsConfig = {}
}, ref) => {
  const containerRef = useRef();
  const cyRef = useRef();
  const [mounted, setMounted] = useState(false);

  // Initialize cytoscape
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      style: Object.entries(styles).map(([selector, style]) => ({
        selector,
        style
      })),
      minZoom,
      maxZoom,
      motionBlur,
      hideEdgesOnViewport,
      boxSelectionEnabled,
      zoom,
      autounselectify,
      autolock,
      autoungrabify,
      selectionType,
      userPanningEnabled,
      userZoomingEnabled,
      wheelSensitivity: 0.2
    });

    cyRef.current = cy;
    setMounted(true);

    // Layout events
    cy.on('layoutstart', () => {
      cy.userPanningEnabled(false);
      cy.userZoomingEnabled(false);
      onLayoutRunningChanged?.(true);
    });

    cy.on('layoutstop', () => {
      cy.userPanningEnabled(userPanningEnabled);
      cy.userZoomingEnabled(userZoomingEnabled);
      if (autolock) {
        cy.nodes().lock();
      }
      onLayoutRunningChanged?.(false);
    });

    // Zoom and pan events
    const debouncedZoom = debounce(() => {
      onZoomChanged?.(cy.zoom());
    }, 100);
    cy.on('zoom', debouncedZoom);

    const debouncedPan = debounce(() => {
      onPanChanged?.(cy.pan());
    }, 100);
    cy.on('pan', debouncedPan);

    // Click events
    let tappedBefore = null;
    let tappedTimeout = null;
    const DOUBLE_CLICK_DELAY_MS = 300;

    const handleDoubleTap = (event) => {
      const tappedNow = event.target;

      if (tappedTimeout && tappedBefore) {
        clearTimeout(tappedTimeout);
      }

      if (tappedBefore === tappedNow) {
        tappedNow.trigger('doubleTap', event);
        tappedBefore = null;
      } else {
        tappedTimeout = setTimeout(() => {
          tappedBefore = null;
        }, DOUBLE_CLICK_DELAY_MS);
        tappedBefore = tappedNow;
      }
    };

    const handleNodeClick = (e) => {
      const { x1, y1, x2, y2 } = e.target.renderedBoundingBox();
      onNodeClick?.(e, e.target.data(), {
        top: y1,
        left: x1,
        width: x2 - x1,
        height: y2 - y1,
      });
    };

    const handleNodeDoubleClick = (e) => {
      const { x1, y1, x2, y2 } = e.target.renderedBoundingBox();
      onNodeDoubleClick?.(e, e.target.data(), {
        top: y1,
        left: x1,
        width: x2 - x1,
        height: y2 - y1,
      });
    };

    const handleEdgeClick = (e) => {
      const { x1, y1, x2, y2 } = e.target.renderedBoundingBox();
      onEdgeClick?.(e, e.target.data(), {
        top: y1,
        left: x1,
        width: x2 - x1,
        height: y2 - y1,
      });
    };

    const handleGraphClick = (e) => {
      const { clientY, clientX } = e.originalEvent;
      onGraphClick?.(e, { top: clientY, left: clientX });
    };

    // Selection change handler
    const handleSelectionChange = () => {
      const selectedNodes = new Set(cy.nodes(':selected').map(n => n.id()));
      const selectedEdges = new Set(cy.edges(':selected').map(e => e.id()));
      
      onSelectedElementIdsChange?.({
        nodeIds: selectedNodes,
        edgeIds: selectedEdges,
      });
    };

    cy.on('tap', handleDoubleTap);
    cy.on('tap', handleGraphClick);
    cy.on('tap', 'node', handleNodeClick);
    cy.on('doubleTap', 'node', handleNodeDoubleClick);
    cy.on('tap', 'edge', handleEdgeClick);
    cy.on('select unselect', handleSelectionChange);

    return () => {
      if (tappedTimeout) clearTimeout(tappedTimeout);
      cy.removeAllListeners();
      cy.destroy();
      cyRef.current = null;
      setMounted(false);
    };
  }, [
    styles, minZoom, maxZoom, motionBlur, hideEdgesOnViewport, boxSelectionEnabled,
    zoom, autounselectify, autolock, autoungrabify, selectionType,
    userPanningEnabled, userZoomingEnabled, onZoomChanged, onPanChanged,
    onLayoutRunningChanged, onNodeClick, onNodeDoubleClick, onEdgeClick,
    onGraphClick, onSelectedElementIdsChange
  ]);

  // Update elements
  useEffect(() => {
    if (!cyRef.current) return;

    const cy = cyRef.current;
    
    // Clear existing elements
    cy.elements().remove();

    if (nodes.length > 0 || edges.length > 0) {
      // Add elements
      cy.add([...nodes, ...edges]);
      
      // Run layout
      const layoutConfig = {
        name: layout,
        animate: useAnimation,
        fit: true,
        padding: 50,
        ...additionalLayoutsConfig[layout],
      };

      const layoutInstance = cy.layout(layoutConfig);
      layoutInstance.run();
    }
  }, [nodes, edges, layout, useAnimation, additionalLayoutsConfig]);

  // Update selection
  useEffect(() => {
    if (!cyRef.current || autounselectify) return;

    const cy = cyRef.current;
    
    // Update selection
    cy.elements().unselect();
    
    selectedNodesIds.forEach(id => {
      const node = cy.getElementById(id);
      if (node.length) node.select();
    });
    
    selectedEdgesIds.forEach(id => {
      const edge = cy.getElementById(id);
      if (edge.length) edge.select();
    });
  }, [selectedNodesIds, selectedEdgesIds, autounselectify]);

  // Update visibility
  useEffect(() => {
    if (!cyRef.current) return;

    const cy = cyRef.current;

    // Reset classes
    cy.elements().removeClass('hidden out-of-focus');

    // Apply hidden classes
    hiddenNodesIds.forEach(id => {
      const node = cy.getElementById(id);
      if (node.length) node.addClass('hidden');
    });

    hiddenEdgesIds.forEach(id => {
      const edge = cy.getElementById(id);
      if (edge.length) edge.addClass('hidden');
    });

    // Apply out-of-focus classes
    outOfFocusNodesIds.forEach(id => {
      const node = cy.getElementById(id);
      if (node.length) node.addClass('out-of-focus');
    });

    outOfFocusEdgesIds.forEach(id => {
      const edge = cy.getElementById(id);
      if (edge.length) edge.addClass('out-of-focus');
    });
  }, [hiddenEdgesIds, hiddenNodesIds, outOfFocusNodesIds, outOfFocusEdgesIds]);

  // Update locking
  useEffect(() => {
    if (!cyRef.current) return;

    const cy = cyRef.current;

    // Unlock all nodes first
    cy.nodes().unlock();

    // Lock specific nodes
    lockedNodesIds.forEach(id => {
      const node = cy.getElementById(id);
      if (node.length) node.lock();
    });

    // Auto-lock all nodes if enabled
    if (autolock) {
      cy.nodes().lock();
    }
  }, [autolock, lockedNodesIds]);

  useImperativeHandle(ref, () => ({
    cytoscape: cyRef.current,
    runLayout: () => {
      if (!cyRef.current) return;
      
      const layoutConfig = {
        name: layout,
        animate: true,
        fit: true,
        padding: 50,
        ...additionalLayoutsConfig[layout],
      };

      const layoutInstance = cyRef.current.layout(layoutConfig);
      layoutInstance.run();
    },
  }), [layout, additionalLayoutsConfig]);

  const isEmpty = !nodes.length && !edges.length;

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <div 
        className="absolute h-full w-full" 
        ref={containerRef}
        style={{ zIndex: 1 }}
      />
      {isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-4 opacity-30">📊</div>
            <div className="text-lg font-medium mb-2">No Graph Data</div>
            <div className="text-sm">Add some nodes to get started</div>
          </div>
        </div>
      )}
    </div>
  );
});

SimpleGraph.displayName = 'SimpleGraph';

// Utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default memo(SimpleGraph);