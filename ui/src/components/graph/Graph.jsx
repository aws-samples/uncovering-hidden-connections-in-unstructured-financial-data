import React, { forwardRef, memo, useCallback, useImperativeHandle, useState } from 'react';
import cytoscape from 'cytoscape';
import d3Force from 'cytoscape-d3-force';
import dagre from 'cytoscape-dagre';
import fcose from 'cytoscape-fcose';
import klay from 'cytoscape-klay';
import cyCanvas from 'cytoscape-canvas';

// Register cytoscape extensions
cytoscape.use(klay);
cytoscape.use(dagre);
cytoscape.use(d3Force);
cytoscape.use(fcose);
cyCanvas(cytoscape);

const EMPTY_SET = new Set();

const Graph = forwardRef(({
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
  emptyComponent: EmptyComponent,
  useAnimation = true,
  additionalLayoutsConfig = {}
}, ref) => {
  // Capture wrapper via callbackRef so it triggers a re-render
  const [wrapper, setWrapper] = useState();
  const wrapperRefCb = useCallback((domElement) => setWrapper(domElement), []);

  // Initialize cytoscape instance
  const cy = useInitCytoscape({
    wrapper,
    onLayoutRunningChanged,
    onPanChanged,
    onZoomChanged,
    zoom,
    minZoom,
    maxZoom,
    motionBlur,
    hideEdgesOnViewport,
    boxSelectionEnabled,
    autounselectify,
    autolock,
    autoungrabify,
    selectionType,
    userPanningEnabled,
    userZoomingEnabled,
  });

  const mounted = !!cy;

  // Manage config changes
  useManageConfigChanges({
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
  }, cy);

  // Update graph elements
  const graphStructureVersion = useUpdateGraphElements({
    cy,
    nodes,
    edges,
    lockedNodesIds,
  });

  // Manage element selection
  useManageElementsSelection({
    cy,
    selectedEdgesIds,
    selectedNodesIds,
    onSelectedElementIdsChange,
    graphStructureVersion,
  }, {
    autounselectify,
  });

  // Manage element visibility
  useManageElementsVisibility({
    cy,
    hiddenEdgesIds,
    hiddenNodesIds,
    outOfFocusNodesIds,
    outOfFocusEdgesIds,
    graphStructureVersion,
  });

  // Manage element locking
  useManageElementsLock({
    cy,
    autolock,
    lockedNodesIds,
    graphStructureVersion,
  });

  // Manage styles
  useManageStyles({
    cy,
    styles,
    layout,
  });

  // Add click events
  useAddClickEvents({
    cy,
    onEdgeClick,
    onGraphClick,
    onNodeClick,
    onNodeDoubleClick,
  });

  // Update layout
  useUpdateLayout({
    cy,
    layout,
    useAnimation,
    additionalLayoutsConfig,
    graphStructureVersion,
    mounted,
  });

  useImperativeHandle(ref, () => ({
    cytoscape: cy,
    runLayout: () => {
      if (!cy) return;
      runLayout(cy, layout, additionalLayoutsConfig, true);
    },
  }), [additionalLayoutsConfig, cy, layout]);

  const isEmpty = !nodes.length && !edges.length;

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <div className="absolute h-full w-full first:z-10" ref={wrapperRefCb} />
      {isEmpty && EmptyComponent ? <EmptyComponent /> : null}
    </div>
  );
});

Graph.displayName = 'Graph';

// Simplified hooks implementations
function useInitCytoscape({
  wrapper,
  onLayoutRunningChanged,
  onPanChanged,
  onZoomChanged,
  ...config
}) {
  const [cy, setCy] = useState();

  React.useEffect(() => {
    if (wrapper) {
      const cy = cytoscape({
        container: wrapper,
        style: [],
        ...config,
      });

      cy.on('layoutstart', () => {
        cy.userPanningEnabled(false);
        cy.userZoomingEnabled(false);
        onLayoutRunningChanged?.(true);
      });

      cy.on('layoutstop', () => {
        cy.userPanningEnabled(config.userPanningEnabled);
        cy.userZoomingEnabled(config.userZoomingEnabled);
        if (config.autolock) {
          cy.nodes().lock();
        }
        onLayoutRunningChanged?.(false);
      });

      const debouncedZoom = debounce(() => {
        onZoomChanged?.(cy.zoom());
      }, 100);
      cy.on('zoom', debouncedZoom);

      const debouncedPan = debounce(() => {
        onPanChanged?.(cy.pan());
      }, 100);
      cy.on('pan', debouncedPan);

      setCy(cy);

      return () => {
        cy.removeAllListeners();
        cy.destroy();
        cy.unmount();
        setCy(undefined);
      };
    }
  }, [wrapper, config, onLayoutRunningChanged, onPanChanged, onZoomChanged]);

  return cy;
}

function useManageConfigChanges(config, cy) {
  React.useEffect(() => {
    if (!cy) return;
    
    Object.entries(config).forEach(([key, value]) => {
      if (typeof cy[key] === 'function') {
        cy[key](value);
      }
    });
  }, [config, cy]);
}

function useUpdateGraphElements({ cy, nodes, edges, lockedNodesIds }) {
  const [graphStructureVersion, setGraphStructureVersion] = useState(0);

  React.useEffect(() => {
    if (!cy) return;

    const structureChanged = 
      cy.nodes().length !== nodes.length ||
      cy.edges().length !== edges.length;

    if (structureChanged) {
      setGraphStructureVersion(v => v + 1);
    }

    // Deep clone to prevent cytoscape from mutating our data
    cy.json({ elements: JSON.parse(JSON.stringify({ nodes, edges })) });
  }, [cy, nodes, edges, lockedNodesIds]);

  return graphStructureVersion;
}

function useManageElementsSelection({
  cy,
  selectedEdgesIds,
  selectedNodesIds,
  onSelectedElementIdsChange,
  graphStructureVersion,
}, { autounselectify }) {
  React.useEffect(() => {
    if (!cy || autounselectify) return;

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

    // Listen for selection changes
    const handleSelectionChange = () => {
      const selectedNodes = new Set(cy.nodes(':selected').map(n => n.id()));
      const selectedEdges = new Set(cy.edges(':selected').map(e => e.id()));
      
      onSelectedElementIdsChange?.({
        nodeIds: selectedNodes,
        edgeIds: selectedEdges,
      });
    };

    cy.on('select unselect', handleSelectionChange);

    return () => {
      cy.off('select unselect', handleSelectionChange);
    };
  }, [cy, selectedEdgesIds, selectedNodesIds, onSelectedElementIdsChange, graphStructureVersion, autounselectify]);
}

function useManageElementsVisibility({
  cy,
  hiddenEdgesIds,
  hiddenNodesIds,
  outOfFocusNodesIds,
  outOfFocusEdgesIds,
  graphStructureVersion,
}) {
  React.useEffect(() => {
    if (!cy) return;

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
  }, [cy, hiddenEdgesIds, hiddenNodesIds, outOfFocusNodesIds, outOfFocusEdgesIds, graphStructureVersion]);
}

function useManageElementsLock({ cy, autolock, lockedNodesIds, graphStructureVersion }) {
  React.useEffect(() => {
    if (!cy) return;

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
  }, [cy, autolock, lockedNodesIds, graphStructureVersion]);
}

function useManageStyles({ cy, styles, layout }) {
  React.useEffect(() => {
    if (!cy) return;

    const styleArray = Object.entries(styles).map(([selector, style]) => ({
      selector,
      style
    }));

    cy.style(styleArray);
  }, [cy, styles, layout]);
}

function useAddClickEvents({
  cy,
  onEdgeClick,
  onGraphClick,
  onNodeClick,
  onNodeDoubleClick,
}) {
  React.useEffect(() => {
    if (!cy) return;

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

    cy.on('tap', handleDoubleTap);
    cy.on('tap', handleGraphClick);
    cy.on('tap', 'node', handleNodeClick);
    cy.on('doubleTap', 'node', handleNodeDoubleClick);
    cy.on('tap', 'edge', handleEdgeClick);

    return () => {
      if (tappedTimeout) clearTimeout(tappedTimeout);
      cy.off('tap', handleDoubleTap);
      cy.off('tap', handleGraphClick);
      cy.off('tap', 'node', handleNodeClick);
      cy.off('doubleTap', 'node', handleNodeDoubleClick);
      cy.off('tap', 'edge', handleEdgeClick);
    };
  }, [cy, onNodeClick, onNodeDoubleClick, onEdgeClick, onGraphClick]);
}

function useUpdateLayout({
  cy,
  layout,
  useAnimation,
  additionalLayoutsConfig,
  graphStructureVersion,
  mounted,
}) {
  React.useEffect(() => {
    if (!cy || !mounted) return;

    const layoutConfig = {
      name: layout,
      animate: useAnimation,
      fit: true,
      padding: 50,
      ...additionalLayoutsConfig[layout],
    };

    const layoutInstance = cy.layout(layoutConfig);
    layoutInstance.run();
  }, [cy, layout, useAnimation, additionalLayoutsConfig, graphStructureVersion, mounted]);
}

// Layout runner
function runLayout(cy, layoutName, additionalLayoutsConfig = {}, useAnimation = false) {
  const layoutConfig = {
    name: layoutName,
    animate: useAnimation,
    fit: true,
    padding: 50,
    ...additionalLayoutsConfig[layoutName],
  };

  const layout = cy.layout(layoutConfig);
  layout.run();
}

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

export default memo(Graph);