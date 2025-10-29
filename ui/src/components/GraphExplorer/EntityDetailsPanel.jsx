import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress
} from '@mui/material';
import {
  User,
  Building,
  MapPin,
  Calendar,
  Package,
  Cpu,
  Expand,
  X,
  Info,
  TrendingUp
} from 'lucide-react';

const EntityDetailsPanel = ({
  selectedEntity,
  selectedRelationship,
  onClearSelection,
  onExpandEntity,
  expandingNodeIds = new Set()
}) => {
  const getEntityIcon = (label) => {
    const iconProps = { size: 20 };
    switch (label) {
      case 'PERSON':
        return <User {...iconProps} />;
      case 'ORGANIZATION':
      case 'COMPANY':
        return <Building {...iconProps} />;
      case 'LOCATION':
        return <MapPin {...iconProps} />;
      case 'EVENT':
        return <Calendar {...iconProps} />;
      case 'PRODUCT':
        return <Package {...iconProps} />;
      case 'TECHNOLOGY':
        return <Cpu {...iconProps} />;
      default:
        return <Package {...iconProps} />;
    }
  };

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



  // Show relationship details if a relationship is selected
  if (selectedRelationship) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Relationship Details
          </Typography>
          <IconButton size="small" onClick={onClearSelection}>
            <X size={18} />
          </IconButton>
        </Box>

        {/* Relationship Card */}
        <Paper
          elevation={2}
          sx={{
            p: 2,
            mb: 2,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          {/* Relationship Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <TrendingUp size={20} />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {selectedRelationship.label || 'Relationship'}
            </Typography>
          </Box>

          {/* Connection Info */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>{selectedRelationship.sourceNode.name}</strong>
              {' → '}
              <strong>{selectedRelationship.targetNode.name}</strong>
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label={selectedRelationship.sourceNode.label}
                size="small"
                variant="outlined"
              />
              <Chip
                label={selectedRelationship.targetNode.label}
                size="small"
                variant="outlined"
              />
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Relationship Information */}
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Relationship Information
          </Typography>

          <List dense sx={{ p: 0, mb: 2 }}>
            <ListItem sx={{ px: 0, py: 0.5 }}>
              <ListItemText
                primary={
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    ID
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', wordBreak: 'break-word' }}>
                    {selectedRelationship.id}
                  </Typography>
                }
              />
            </ListItem>
            <ListItem sx={{ px: 0, py: 0.5 }}>
              <ListItemText
                primary={
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Type
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    {selectedRelationship.label || 'Unknown'}
                  </Typography>
                }
              />
            </ListItem>
            <ListItem sx={{ px: 0, py: 0.5 }}>
              <ListItemText
                primary={
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Source
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    {selectedRelationship.sourceNode.name} ({selectedRelationship.sourceNode.label})
                  </Typography>
                }
              />
            </ListItem>
            <ListItem sx={{ px: 0, py: 0.5 }}>
              <ListItemText
                primary={
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Target
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    {selectedRelationship.targetNode.name} ({selectedRelationship.targetNode.label})
                  </Typography>
                }
              />
            </ListItem>
          </List>

          {/* Additional Properties */}
          {selectedRelationship.properties && Object.keys(selectedRelationship.properties).length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Additional Properties
              </Typography>
              <List dense sx={{ p: 0 }}>
                {Object.entries(selectedRelationship.properties).map(([key, value]) => (
                  <ListItem key={key} sx={{ px: 0, py: 0.5 }}>
                    <ListItemText
                      primary={
                        <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                          {key.replace(/_/g, ' ')}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', wordBreak: 'break-word' }}>
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Paper>
      </Box>
    );
  }

  if (!selectedEntity) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Entity/Relationship Details
        </Typography>

        <Box sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: 'text.secondary'
        }}>
          <Box>
            <Info size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              No entity/relationship selected
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.5 }}>
              Click on a node or edge to view details
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Entity Details
        </Typography>
        <IconButton size="small" onClick={onClearSelection}>
          <X size={18} />
        </IconButton>
      </Box>

      {/* Entity Card */}
      <Paper
        elevation={2}
        sx={{
          p: 2,
          mb: 2,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        {/* Entity Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          {getEntityIcon(selectedEntity.label)}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {selectedEntity.name}
          </Typography>
        </Box>

        {/* Entity Type */}
        <Box sx={{ mb: 2 }}>
          <Chip
            label={selectedEntity.label}
            color={getEntityColor(selectedEntity.label)}
            variant="outlined"
            size="small"
          />

        </Box>

        {/* Relationship Count */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TrendingUp size={16} />
          <Typography variant="body2" color="text.secondary">
            {selectedEntity.relationship_count || 0} relationships
          </Typography>
        </Box>

        {/* Expand Button */}
        {!selectedEntity.isExpanded && (
          <Button
            fullWidth
            variant="contained"
            startIcon={expandingNodeIds.has(selectedEntity.id) ? <CircularProgress size={16} /> : <Expand size={16} />}
            onClick={() => onExpandEntity(selectedEntity.id)}
            disabled={expandingNodeIds.has(selectedEntity.id)}
            sx={{ mb: 2, color: 'white' }}
          >
            {expandingNodeIds.has(selectedEntity.id) ? 'Expanding...' : 'Expand Relationships'}
          </Button>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Entity Information */}
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          Entity Information
        </Typography>

        <List dense sx={{ p: 0, mb: 2 }}>
          <ListItem sx={{ px: 0, py: 0.5 }}>
            <ListItemText
              primary={
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  ID
                </Typography>
              }
              secondary={
                <Typography variant="body2" sx={{ fontSize: '0.8rem', wordBreak: 'break-word' }}>
                  {selectedEntity.id}
                </Typography>
              }
            />
          </ListItem>
          <ListItem sx={{ px: 0, py: 0.5 }}>
            <ListItemText
              primary={
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  Type
                </Typography>
              }
              secondary={
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                  {selectedEntity.label}
                </Typography>
              }
            />
          </ListItem>

        </List>

        {/* Additional Properties */}
        {selectedEntity.properties && Object.keys(selectedEntity.properties).length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Additional Properties
            </Typography>
            <List dense sx={{ p: 0 }}>
              {Object.entries(selectedEntity.properties).map(([key, value]) => (
                <ListItem key={key} sx={{ px: 0, py: 0.5 }}>
                  <ListItemText
                    primary={
                      <Typography variant="caption" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                        {key.replace(/_/g, ' ')}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" sx={{ fontSize: '0.8rem', wordBreak: 'break-word' }}>
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Paper>


    </Box>
  );
};

export default EntityDetailsPanel;