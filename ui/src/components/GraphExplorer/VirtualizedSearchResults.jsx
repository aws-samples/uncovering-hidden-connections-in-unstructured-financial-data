import React, { memo, useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  ListItem,
  Typography,
  Chip,
  Button
} from '@mui/material';
import {
  User,
  Building2,
  MapPin,
  Calendar,
  Package,
  Cpu,
  Circle,
  Check,
  Plus
} from 'lucide-react';

// Entity color mapping
const getEntityColor = (label) => {
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
};

// Entity icon mapping
const getEntityIcon = (label) => {
  const iconProps = { size: 16, style: { opacity: 0.7 } };
  
  switch (label?.toUpperCase()) {
    case 'PERSON':
      return <User {...iconProps} />;
    case 'ORGANIZATION':
    case 'COMPANY':
      return <Building2 {...iconProps} />;
    case 'LOCATION':
      return <MapPin {...iconProps} />;
    case 'EVENT':
      return <Calendar {...iconProps} />;
    case 'PRODUCT':
      return <Package {...iconProps} />;
    case 'TECHNOLOGY':
      return <Cpu {...iconProps} />;
    default:
      return <Circle {...iconProps} />;
  }
};

// Individual search result item component
const SearchResultItem = memo(({ index, style, data }) => {
  const { searchResults, onAddEntity, addedEntityIds } = data;
  const entity = searchResults[index];

  if (!entity) return null;

  return (
    <Paper
      elevation={1}
      sx={{
        mb: 1,
        border: '1px solid',
        borderColor: 'divider',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: 2
        }
      }}
    >
        <ListItem sx={{ p: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Entity Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {getEntityIcon(entity.LABEL)}
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {entity.NAME}
              </Typography>
            </Box>

            {/* Entity Label */}
            <Box sx={{ mb: 1 }}>
              <Chip
                label={entity.LABEL}
                size="small"
                color={getEntityColor(entity.LABEL)}
                variant="outlined"
              />
            </Box>



            {/* Entity Properties/Edges Info */}
            {(entity.PROPERTIES || entity.EDGES) && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: '0.75rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: 1.3
                }}
              >
                {entity.EDGES ? `${entity.EDGES.length} relationships` : 
                 Object.keys(entity.PROPERTIES || {}).length > 0 ? 
                 `Properties: ${Object.keys(entity.PROPERTIES).join(', ')}` : 
                 'No additional info'}
              </Typography>
            )}

            {/* Add Button */}
            <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
              {addedEntityIds && addedEntityIds.includes(entity.ID) ? (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Check size={14} />}
                  disabled
                  sx={{ 
                    fontSize: '0.75rem',
                    color: 'success.main',
                    borderColor: 'success.main',
                    '&.Mui-disabled': {
                      color: 'success.main',
                      borderColor: 'success.main',
                      opacity: 0.7
                    }
                  }}
                >
                  Added to Graph
                </Button>
              ) : (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Plus size={14} />}
                  onClick={() => onAddEntity(entity)}
                  sx={{ fontSize: '0.75rem', color: 'white' }}
                >
                  Add to Graph
                </Button>
              )}
            </Box>
          </Box>
        </ListItem>
    </Paper>
  );
});

SearchResultItem.displayName = 'SearchResultItem';

// Simple custom virtualization component - render all items for now to match SearchPanel exactly
const VirtualizedSearchResults = ({ searchResults, onAddEntity, addedEntityIds, height = 400 }) => {
  return (
    <Box 
      sx={{ 
        height: typeof height === 'number' ? `${height}px` : height,
        width: '100%', 
        overflow: 'auto',
        position: 'relative',
        flex: 1,
        p: 0
      }}
    >
      {/* Render all items - same as SearchPanel List */}
      {searchResults.map((entity, index) => (
        <SearchResultItem
          key={entity.ID || index}
          index={index}
          style={{}}
          data={{ searchResults, onAddEntity, addedEntityIds }}
        />
      ))}
    </Box>
  );
};

export default memo(VirtualizedSearchResults);