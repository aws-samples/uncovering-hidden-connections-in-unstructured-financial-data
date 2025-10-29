import React, { useRef, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Divider,
  Fade
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Download,
  Trash2,
  RefreshCw,
  Info,
  Settings
} from 'lucide-react';
import Graph from './Graph';

const GraphViewer = ({
  graphData,
  onNodeClick,
  onNodeDoubleClick,
  selectedNodeId,
  onClearGraph,
  className = ''
}) => {
  const graphRef = useRef();
  const [showLegend, setShowLegend] = useState(false);
  const [selectedNodesIds, setSelectedNodesIds] = useState(new Set());
  const [selectedEdgesIds, setSelectedEdgesIds] = useState(new Set());

  // Node color mapping
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

  // Convert our data format to Graph component format
  const nodes = (graphData.nodes || []).map(node => ({
    data: {
      id: node.id,
      name: node.name,
      label: node.label,
      isMainEntity: node.isMainEntity,
      relationshipCount: node.relationshipCount || 0,
      isExpanded: node.isExpanded || false,
      properties: node.properties || {}
    }
  }));

  const edges = (graphData.links || []).map(link => ({
    data: {
      id: link.id || `${link.source}-${link.target}`,
      source: link.source,
      target: link.target,
      label: link.label || '',
      properties: link.properties || {}
    }
  }));

  // Graph styles based on reference implementation
  const styles = {
    node: {
      'background-color': (ele) => getNodeColor(ele.data('label')),
      'border-width': 2,
      'border-color': '#34495E',
      'width': (ele) => ele.data('isMainEntity') ? 40 : 30,
      'height': (ele) => ele.data('isMainEntity') ? 40 : 30,
      'label': 'data(name)',
      'text-valign': 'bottom',
      'text-halign': 'center',
      'text-margin-y': 8,
      'font-size': (ele) => ele.data('isMainEntity') ? 12 : 10,
      'font-weight': (ele) => ele.data('isMainEntity') ? 'bold' : 'normal',
      'font-family': 'Inter, Arial, sans-serif',
      'color': '#2C3E50',
      'text-wrap': 'ellipsis',
      'text-max-width': 120,
      'overlay-opacity': 0,
      'transition-property': 'background-color, border-color, width, height',
      'transition-duration': '0.2s',
      // Make nodes grabbable for dragging
      'cursor': 'grab'
    },
    'node:selected': {
      'border-color': '#FF9900',
      'border-width': 4,
      'overlay-opacity': 0.1,
      'overlay-color': '#FF9900'
    },
    'node:active': {
      'cursor': 'grabbing'
    },
    'node.hidden': {
      'display': 'none'
    },
    'node.out-of-focus': {
      'opacity': 0.3
    },
    edge: {
      'width': 2,
      'line-color': '#BDC3C7',
      'target-arrow-color': '#7F8C8D',
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
      'overlay-opacity': 0
    },
    'edge:selected': {
      'line-color': '#FF9900',
      'target-arrow-color': '#FF9900',
      'width': 3,
      'overlay-opacity': 0.1,
      'overlay-color': '#FF9900'
    },
    'edge.hidden': {
      'display': 'none'
    },
    'edge.out-of-focus': {
      'opacity': 0.1
    }
  };

  // Handle selection changes
  const handleSelectedElementIdsChange = useCallback(({ nodeIds, edgeIds }) => {
    setSelectedNodesIds(nodeIds);
    setSelectedEdgesIds(edgeIds);
    
    // Call parent callback for single node selection
    if (nodeIds.size === 1 && edgeIds.size === 0) {
      const nodeId = Array.from(nodeIds)[0];
      const node = nodes.find(n => n.data.id === nodeId);
      if (node) {
        onNodeClick?.(null, node.data);
      }
    }
  }, [nodes, onNodeClick]);

  // Handle node click
  const handleNodeClick = useCallback((event, element, bounds) => {
    // Don't trigger additional selection - let the Graph component handle it
    // The selection change will be handled by handleSelectedElementIdsChange
  }, []);

  // Handle node double click for expansion
  const handleNodeDoubleClick = useCallback((event, element, bounds) => {
    onNodeDoubleClick?.(element);
  }, [onNodeDoubleClick]);

  // Graph controls
  const zoomIn = useCallback(() => {
    if (graphRef.current?.cytoscape) {
      const cy = graphRef.current.cytoscape;
      cy.zoom(cy.zoom() * 1.5);
      cy.center();
    }
  }, []);

  const zoomOut = useCallback(() => {
    if (graphRef.current?.cytoscape) {
      const cy = graphRef.current.cytoscape;
      cy.zoom(cy.zoom() * 0.75);
      cy.center();
    }
  }, []);

  const fitToView = useCallback(() => {
    if (graphRef.current?.cytoscape) {
      graphRef.current.cytoscape.fit(undefined, 50);
    }
  }, []);

  const resetView = useCallback(() => {
    if (graphRef.current?.cytoscape) {
      const cy = graphRef.current.cytoscape;
      cy.zoom(1);
      cy.center();
    }
  }, []);

  const restartLayout = useCallback(() => {
    if (graphRef.current?.runLayout) {
      graphRef.current.runLayout();
    }
  }, []);

  const downloadGraph = useCallback(() => {
    if (graphRef.current?.cytoscape) {
      const cy = graphRef.current.cytoscape;
      const png64 = cy.png({
        output: 'blob',
        bg: '#ffffff',
        full: true,
        scale: 2
      });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(png64);
      link.download = 'knowledge-graph.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, []);

  // Update selected nodes when selectedNodeId prop changes
  React.useEffect(() => {
    if (selectedNodeId) {
      setSelectedNodesIds(new Set([selectedNodeId]));
    } else {
      setSelectedNodesIds(new Set());
    }
  }, [selectedNodeId]);

  const uniqueLabels = Array.from(new Set(graphData.nodes?.map(n => n.label) || []));

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        height: '100%', 
        position: 'relative', 
        overflow: 'hidden',
        borderRadius: 2
      }}
      className={className}
    >
      {/* Header */}
      <Box sx={{
        p: 2,
        borderBottom: '1px solid #E9ECEF',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F8F9FA'
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Graph View
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Zoom In">
            <IconButton size="small" onClick={zoomIn} disabled={!nodes.length}>
              <ZoomIn size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out">
            <IconButton size="small" onClick={zoomOut} disabled={!nodes.length}>
              <ZoomOut size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Fit to View">
            <IconButton size="small" onClick={fitToView} disabled={!nodes.length}>
              <Maximize2 size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset View">
            <IconButton size="small" onClick={resetView} disabled={!nodes.length}>
              <RotateCcw size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Restart Layout">
            <IconButton size="small" onClick={restartLayout} disabled={!nodes.length}>
              <RefreshCw size={18} />
            </IconButton>
          </Tooltip>
          
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          
          <Tooltip title="Download Graph">
            <IconButton size="small" onClick={downloadGraph} disabled={!nodes.length}>
              <Download size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Toggle Legend">
            <IconButton 
              size="small" 
              onClick={() => setShowLegend(!showLegend)}
              disabled={!nodes.length}
              color={showLegend ? "primary" : "default"}
            >
              <Info size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear Graph">
            <IconButton 
              size="small" 
              onClick={onClearGraph} 
              disabled={!nodes.length}
              color="error"
            >
              <Trash2 size={18} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Graph Canvas */}
      <Box sx={{ height: 'calc(100% - 73px)', position: 'relative' }}>
        <Graph
          ref={graphRef}
          nodes={nodes}
          edges={edges}
          styles={styles}
          selectedNodesIds={selectedNodesIds}
          selectedEdgesIds={selectedEdgesIds}
          onSelectedElementIdsChange={handleSelectedElementIdsChange}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          layout="fcose"
          useAnimation={true}
          minZoom={0.1}
          maxZoom={5}
          motionBlur={true}
          boxSelectionEnabled={true}
          selectionType="additive"
          userPanningEnabled={true}
          userZoomingEnabled={true}
          autoungrabify={false}
          className="w-full h-full"
        />

        {/* Legend */}
        <Fade in={showLegend && nodes.length > 0}>
          <Paper sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            p: 2,
            minWidth: 180,
            maxWidth: 250,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderRadius: 2,
            zIndex: 1000
          }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
              Node Types
            </Typography>
            {uniqueLabels.map(label => (
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
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary', lineHeight: 1.4 }}>
              • Click to select<br/>
              • Double-click to expand<br/>
              • Drag to reposition<br/>
              • Mouse wheel to zoom
            </Typography>
          </Paper>
        </Fade>

        {/* Empty State */}
        {!nodes.length && (
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
      </Box>
    </Paper>
  );
};

export default GraphViewer;