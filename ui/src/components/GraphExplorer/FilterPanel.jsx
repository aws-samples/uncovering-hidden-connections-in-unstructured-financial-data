import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  Paper,
  Divider,
  Chip,
  Switch,
  TextField,
  Button
} from '@mui/material';
import {
  Filter,
  Eye,
  EyeOff,
  RotateCcw
} from 'lucide-react';

const FilterPanel = ({
  graphData,
  onFilterChange
}) => {
  const [filters, setFilters] = useState({
    nodeTypes: {},
    edgeTypes: {},
    showLabels: true,
    showEdgeLabels: true,
    minConnections: 0,
    maxConnections: 100,
    searchFilter: ''
  });

  // Get unique node and edge types
  const nodeTypes = Array.from(new Set(graphData.nodes?.map(n => n.label) || []));
  const edgeTypes = Array.from(new Set(graphData.edges?.map(e => e.label) || []));

  // Initialize filter state for new types (default to showing all types)
  useEffect(() => {
    setFilters(prev => {
      const newNodeTypes = { ...prev.nodeTypes };
      const newEdgeTypes = { ...prev.edgeTypes };
      let hasChanges = false;
      
      // Initialize new node types as visible (true)
      nodeTypes.forEach(type => {
        if (!(type in newNodeTypes)) {
          newNodeTypes[type] = true;
          hasChanges = true;
        }
      });
      
      // Initialize new edge types as visible (true)
      edgeTypes.forEach(type => {
        if (!(type in newEdgeTypes)) {
          newEdgeTypes[type] = true;
          hasChanges = true;
        }
      });
      
      // Update max connections based on current data
      const maxConnections = Math.max(
        100, // minimum range
        ...(graphData.nodes?.map(n => n.relationshipCount || 0) || [0])
      );
      
      if (hasChanges || maxConnections > prev.maxConnections) {
        return {
          ...prev,
          nodeTypes: newNodeTypes,
          edgeTypes: newEdgeTypes,
          maxConnections: Math.max(prev.maxConnections, maxConnections)
        };
      }
      
      return prev;
    });
  }, [nodeTypes.join(','), edgeTypes.join(','), graphData.nodes?.length]);

  const handleNodeTypeToggle = useCallback((nodeType) => {
    setFilters(prev => {
      const newValue = !(prev.nodeTypes[nodeType] !== false);
      return {
        ...prev,
        nodeTypes: {
          ...prev.nodeTypes,
          [nodeType]: newValue
        }
      };
    });
  }, []);

  const handleEdgeTypeToggle = useCallback((edgeType) => {
    setFilters(prev => {
      const newValue = !(prev.edgeTypes[edgeType] !== false);
      return {
        ...prev,
        edgeTypes: {
          ...prev.edgeTypes,
          [edgeType]: newValue
        }
      };
    });
  }, []);

  const handleConnectionRangeChange = useCallback((event, newValue) => {
    setFilters(prev => ({
      ...prev,
      minConnections: newValue[0],
      maxConnections: newValue[1]
    }));
  }, []);

  const resetFilters = useCallback(() => {
    // Reset all types to visible (true)
    const resetNodeTypes = {};
    const resetEdgeTypes = {};
    
    nodeTypes.forEach(type => {
      resetNodeTypes[type] = true;
    });
    
    edgeTypes.forEach(type => {
      resetEdgeTypes[type] = true;
    });
    
    // Calculate max connections from current data
    const maxConnections = Math.max(
      100, // minimum range
      ...(graphData.nodes?.map(n => n.relationshipCount || 0) || [0])
    );
    
    setFilters({
      nodeTypes: resetNodeTypes,
      edgeTypes: resetEdgeTypes,
      showLabels: true,
      showEdgeLabels: true,
      minConnections: 0,
      maxConnections: maxConnections,
      searchFilter: ''
    });
  }, [nodeTypes, edgeTypes, graphData.nodes]);

  // Call onFilterChange when filters change
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(filters);
    }
  }, [filters, onFilterChange]);

  const getEntityColor = useCallback((label) => {
    const colors = {
      'PERSON': 'error',
      'ORGANIZATION': 'info',
      'COMPANY': 'primary',
      'LOCATION': 'success',
      'EVENT': 'warning',
      'PRODUCT': 'secondary',
      'TECHNOLOGY': 'info'
    };
    return colors[label] || 'default';
  }, []);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Filters
        </Typography>
        <Button
          size="small"
          startIcon={<RotateCcw size={16} />}
          onClick={resetFilters}
        >
          Reset
        </Button>
      </Box>

      {/* Filter Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* Search Filter */}
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Search Filter
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Filter by name..."
            value={filters.searchFilter}
            onChange={(e) => setFilters(prev => ({ ...prev, searchFilter: e.target.value }))}
          />
        </Paper>

        {/* Node Types */}
        {nodeTypes.length > 0 && (
          <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Node Types
            </Typography>
            <FormGroup>
              {nodeTypes.map(nodeType => (
                <FormControlLabel
                  key={nodeType}
                  control={
                    <Checkbox
                      checked={filters.nodeTypes[nodeType] !== false}
                      onChange={() => handleNodeTypeToggle(nodeType)}
                      size="small"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={nodeType}
                        size="small"
                        color={getEntityColor(nodeType)}
                        variant="outlined"
                      />
                      <Typography variant="caption" color="text.secondary">
                        ({graphData.nodes?.filter(n => n.label === nodeType).length || 0})
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          </Paper>
        )}

        {/* Edge Types */}
        {edgeTypes.length > 0 && (
          <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Relationship Types
            </Typography>
            <FormGroup>
              {edgeTypes.map(edgeType => (
                <FormControlLabel
                  key={edgeType}
                  control={
                    <Checkbox
                      checked={filters.edgeTypes[edgeType] !== false}
                      onChange={() => handleEdgeTypeToggle(edgeType)}
                      size="small"
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">
                        {edgeType || 'Unlabeled'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({graphData.edges?.filter(e => e.label === edgeType).length || 0})
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          </Paper>
        )}

        {/* Connection Range */}
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
            Connection Count Range
          </Typography>
          {(() => {
            // Calculate max connections from current data
            const maxConnections = Math.max(
              100, // minimum range
              ...(graphData.nodes?.map(n => n.relationshipCount || 0) || [0])
            );
            const marks = [
              { value: 0, label: '0' },
              { value: Math.floor(maxConnections / 2), label: Math.floor(maxConnections / 2).toString() },
              { value: maxConnections, label: `${maxConnections}+` }
            ];
            
            return (
              <Slider
                value={[filters.minConnections, Math.min(filters.maxConnections, maxConnections)]}
                onChange={handleConnectionRangeChange}
                valueLabelDisplay="auto"
                min={0}
                max={maxConnections}
                marks={marks}
              />
            );
          })()}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Min: {filters.minConnections}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Max: {filters.maxConnections}
            </Typography>
          </Box>
        </Paper>

        {/* Display Options */}
        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Display Options
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={filters.showLabels}
                onChange={(e) => setFilters(prev => ({ ...prev, showLabels: e.target.checked }))}
                size="small"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {filters.showLabels ? <Eye size={16} /> : <EyeOff size={16} />}
                <Typography variant="body2">Show Node Labels</Typography>
              </Box>
            }
          />

          <FormControlLabel
            control={
              <Switch
                checked={filters.showEdgeLabels}
                onChange={(e) => setFilters(prev => ({ ...prev, showEdgeLabels: e.target.checked }))}
                size="small"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {filters.showEdgeLabels ? <Eye size={16} /> : <EyeOff size={16} />}
                <Typography variant="body2">Show Edge Labels</Typography>
              </Box>
            }
          />
        </Paper>

        {/* Filter Summary */}
        <Paper elevation={1} sx={{ p: 2, backgroundColor: 'grey.50' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Filter Summary
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Total Nodes: {graphData.nodes?.length || 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Edges: {graphData.edges?.length || 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Hidden Node Types: {Object.values(filters.nodeTypes).filter(val => val === false).length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Hidden Edge Types: {Object.values(filters.edgeTypes).filter(val => val === false).length}
            </Typography>
            {filters.searchFilter && (
              <Typography variant="caption" color="text.secondary">
                Search: "{filters.searchFilter}"
              </Typography>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default FilterPanel;