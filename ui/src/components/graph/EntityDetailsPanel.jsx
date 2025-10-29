import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
  Button,
  IconButton,
  Tooltip,
  Fade
} from '@mui/material';
import {
  Info,
  User,
  Building,
  MapPin,
  Calendar,
  Package,
  Cpu,
  ExternalLink,
  Copy,
  Share2
} from 'lucide-react';

const EntityDetailsPanel = ({
  selectedEntity,
  onExpandEntity,
  onClearSelection,
  className = ''
}) => {
  const getNodeColor = (label) => {
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
  };

  const getEntityIcon = (label) => {
    const icons = {
      'PERSON': User,
      'ORGANIZATION': Building,
      'COMPANY': Building,
      'LOCATION': MapPin,
      'EVENT': Calendar,
      'PRODUCT': Package,
      'TECHNOLOGY': Cpu
    };
    const IconComponent = icons[label] || Info;
    return <IconComponent size={18} />;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const shareEntity = () => {
    if (navigator.share && selectedEntity) {
      navigator.share({
        title: selectedEntity.name,
        text: `Check out this entity: ${selectedEntity.name}`,
        url: window.location.href
      });
    }
  };

  if (!selectedEntity) {
    return (
      <Paper 
        elevation={2} 
        sx={{ 
          p: 3, 
          borderRadius: 2, 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto'
        }}
        className={className}
      >
        <Typography variant="h6" sx={{ 
          fontWeight: 600, 
          mb: 2, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1 
        }}>
          <Info size={20} color="#FF9900" />
          How to Use
        </Typography>

        <Box>
          <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
            Welcome to the Knowledge Graph Explorer!
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ 
              mb: 1, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5,
              fontSize: '0.9rem'
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#FF9900',
                display: 'inline-block'
              }}></span>
              <strong>Search:</strong> Use the search panel to find entities
            </Typography>
            <Typography variant="body2" sx={{ 
              mb: 1, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5,
              fontSize: '0.9rem'
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#FF9900',
                display: 'inline-block'
              }}></span>
              <strong>Click:</strong> Select entities from search results
            </Typography>
            <Typography variant="body2" sx={{ 
              mb: 1, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5,
              fontSize: '0.9rem'
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#FF9900',
                display: 'inline-block'
              }}></span>
              <strong>Double-click:</strong> Expand node relationships
            </Typography>
            <Typography variant="body2" sx={{ 
              mb: 1, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5,
              fontSize: '0.9rem'
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#FF9900',
                display: 'inline-block'
              }}></span>
              <strong>Drag:</strong> Move nodes around for better visualization
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mt: 2, borderRadius: 1 }}>
            Red badges on nodes indicate unexplored relationships. Double-click to expand!
          </Alert>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        borderRadius: 2, 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto'
      }}
      className={className}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Typography variant="h6" sx={{ 
          fontWeight: 600, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1 
        }}>
          {getEntityIcon(selectedEntity.label)}
          Entity Details
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Copy entity name">
            <IconButton 
              size="small" 
              onClick={() => copyToClipboard(selectedEntity.name)}
            >
              <Copy size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Share entity">
            <IconButton 
              size="small" 
              onClick={shareEntity}
            >
              <Share2 size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Fade in={true}>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Entity Name */}
          <Typography variant="h5" sx={{ 
            mb: 2, 
            color: 'primary.main',
            fontWeight: 600,
            lineHeight: 1.3
          }}>
            {selectedEntity.name}
          </Typography>

          {/* Entity Type */}
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <Chip
              icon={getEntityIcon(selectedEntity.label)}
              label={selectedEntity.label}
              sx={{
                backgroundColor: getNodeColor(selectedEntity.label),
                color: 'white',
                fontWeight: 600,
                fontSize: '0.8rem',
                '& .MuiChip-icon': {
                  color: 'white'
                }
              }}
            />
            {selectedEntity.isMainEntity && (
              <Chip
                label="Primary Entity"
                size="small"
                variant="outlined"
                sx={{
                  borderColor: '#FF9900',
                  color: '#FF9900',
                  fontWeight: 500
                }}
              />
            )}
          </Box>

          {/* Properties */}
          {selectedEntity.properties && Object.keys(selectedEntity.properties).length > 0 && (
            <Box sx={{ mb: 3, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <Typography variant="subtitle2" sx={{ 
                mb: 1.5, 
                fontWeight: 600,
                color: 'text.secondary'
              }}>
                Properties
              </Typography>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  backgroundColor: '#F8F9FA',
                  borderRadius: 1,
                  flex: 1,
                  overflow: 'auto',
                  minHeight: 0
                }}
              >
                <List dense sx={{ p: 0 }}>
                  {Object.entries(selectedEntity.properties).map(([key, value], index, array) => (
                    <React.Fragment key={key}>
                      <ListItem sx={{ px: 0, py: 0.5 }}>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="body2" sx={{ 
                              color: 'text.primary',
                              mt: 0.5,
                              wordBreak: 'break-word'
                            }}>
                              {typeof value === 'string' && value.length > 100 
                                ? `${value.substring(0, 100)}...`
                                : String(value)
                              }
                            </Typography>
                          }
                        />
                        <Tooltip title="Copy value">
                          <IconButton 
                            size="small" 
                            onClick={() => copyToClipboard(String(value))}
                            sx={{ ml: 1 }}
                          >
                            <Copy size={14} />
                          </IconButton>
                        </Tooltip>
                      </ListItem>
                      {index < array.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            </Box>
          )}

          {/* Relationship Info */}
          {selectedEntity.relationshipCount > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ 
                mb: 1.5, 
                fontWeight: 600,
                color: 'text.secondary'
              }}>
                Relationships
              </Typography>
              <Alert 
                severity={selectedEntity.isExpanded ? "success" : "warning"}
                sx={{ borderRadius: 1 }}
                action={
                  !selectedEntity.isExpanded && (
                    <Button 
                      color="inherit" 
                      size="small"
                      onClick={() => onExpandEntity?.(selectedEntity.id)}
                      startIcon={<ExternalLink size={14} />}
                      sx={{ textTransform: 'none' }}
                    >
                      Expand
                    </Button>
                  )
                }
              >
                {selectedEntity.isExpanded 
                  ? "All relationships are currently displayed in the graph."
                  : `This entity has ${selectedEntity.relationshipCount} unexplored relationships.`
                }
              </Alert>
            </Box>
          )}

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {!selectedEntity.isExpanded && selectedEntity.relationshipCount > 0 && (
              <Button
                variant="contained"
                onClick={() => onExpandEntity?.(selectedEntity.id)}
                startIcon={<ExternalLink size={16} />}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Explore Relationships
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={onClearSelection}
              sx={{ textTransform: 'none' }}
            >
              Clear Selection
            </Button>
          </Box>

          {/* Entity Stats */}
          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #E9ECEF' }}>
            <Typography variant="caption" sx={{ 
              color: 'text.secondary',
              fontSize: '0.75rem',
              display: 'block',
              mb: 0.5
            }}>
              Entity ID: {selectedEntity.id}
            </Typography>
            {selectedEntity.relationshipCount !== undefined && (
              <Typography variant="caption" sx={{ 
                color: 'text.secondary',
                fontSize: '0.75rem',
                display: 'block'
              }}>
                Total Relationships: {selectedEntity.relationshipCount}
              </Typography>
            )}
          </Box>
        </Box>
      </Fade>
    </Paper>
  );
};

export default EntityDetailsPanel;