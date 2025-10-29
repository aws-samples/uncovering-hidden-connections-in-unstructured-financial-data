
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Paper,
  Button,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Expand,
  TrendingUp,
  User,
  Building,
  MapPin,
  Calendar,
  Package,
  Cpu,
  CheckCircle
} from 'lucide-react';

const ConnectionsPanel = ({
  graphData,
  onExpandEntity,
  expandingNodeIds = new Set()
}) => {
  const getEntityIcon = (label) => {
    const iconProps = { size: 16 };
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

  const nodes = graphData.nodes || [];
  const unexpandedNodes = nodes.filter(node => !node.isExpanded);
  const expandedNodes = nodes.filter(node => node.isExpanded);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* Header */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Connections
      </Typography>

      {/* Summary */}
      <Paper elevation={1} sx={{ p: 2, mb: 2, backgroundColor: 'grey.50' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {nodes.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Entities
            </Typography>
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
              {expandedNodes.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Expanded
            </Typography>
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
              {graphData.edges?.length || 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Relationships
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Nodes List */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {nodes.length === 0 ? (
          <Box sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: 'text.secondary'
          }}>
            <Box>
              <TrendingUp size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                No entities in graph
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.5 }}>
                Add entities to see connections
              </Typography>
            </Box>
          </Box>
        ) : (
          <>
            {/* Unexpanded Nodes */}
            {unexpandedNodes.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'warning.main' }}>
                  Unexplored ({unexpandedNodes.length})
                </Typography>
                <Box sx={{ 
                  maxHeight: expandedNodes.length > 0 ? '40%' : '70%', 
                  overflow: 'auto', 
                  mb: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  backgroundColor: 'grey.50'
                }}>
                  <List sx={{ p: 1 }}>
                    {unexpandedNodes.map((node) => (
                      <Paper
                        key={node.id}
                        elevation={1}
                        sx={{
                          mb: 1,
                          border: '1px solid',
                          borderColor: 'warning.light',
                          '&:hover': {
                            borderColor: 'warning.main',
                            boxShadow: 2
                          }
                        }}
                      >
                        <ListItem sx={{ p: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
                            {getEntityIcon(node.label)}
                          </Box>
                          <ListItemText
                            primary={
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {node.name}
                              </Typography>
                            }
                            secondary={
                              <Chip
                                label={node.label}
                                size="small"
                                color={getEntityColor(node.label)}
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: 20, mt: 0.5 }}
                              />
                            }
                            secondaryTypographyProps={{ component: 'div' }}
                          />
                          <ListItemSecondaryAction>
                            <Tooltip title="Expand relationships">
                              <IconButton
                                size="small"
                                onClick={() => onExpandEntity(node.id)}
                                disabled={expandingNodeIds.has(node.id)}
                                color="warning"
                              >
                                {expandingNodeIds.has(node.id) ? <CircularProgress size={16} /> : <Expand size={16} />}
                              </IconButton>
                            </Tooltip>
                          </ListItemSecondaryAction>
                        </ListItem>
                      </Paper>
                    ))}
                  </List>
                </Box>
              </>
            )}

            {/* Expanded Nodes */}
            {expandedNodes.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'success.main' }}>
                  Explored ({expandedNodes.length})
                </Typography>
                <Box sx={{ 
                  flex: 1, 
                  overflow: 'auto', 
                  maxHeight: unexpandedNodes.length > 0 ? '50%' : '70%',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  backgroundColor: 'grey.50'
                }}>
                  <List sx={{ p: 1 }}>
                    {expandedNodes.map((node) => (
                      <Paper
                        key={node.id}
                        elevation={1}
                        sx={{
                          mb: 1,
                          border: '1px solid',
                          borderColor: 'success.light',
                          backgroundColor: 'success.50'
                        }}
                      >
                        <ListItem sx={{ p: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
                            {getEntityIcon(node.label)}
                          </Box>
                          <ListItemText
                            primary={
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {node.name}
                              </Typography>
                            }
                            secondary={
                              <>
                                <Chip
                                  label={node.label}
                                  size="small"
                                  color={getEntityColor(node.label)}
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem', height: 20, mr: 1 }}
                                />
                                <Typography variant="caption" color="text.secondary" component="span">
                                  {node.relationshipCount || 0} connections
                                </Typography>
                              </>
                            }
                            secondaryTypographyProps={{ component: 'div', sx: { display: 'flex', alignItems: 'center', mt: 0.5 } }}
                          />
                          <ListItemSecondaryAction>
                            <CheckCircle size={16} color="green" />
                          </ListItemSecondaryAction>
                        </ListItem>
                      </Paper>
                    ))}
                  </List>
                </Box>
              </>
            )}
          </>
        )}
      </Box>

      {/* Actions */}
      {unexpandedNodes.length > 0 && (
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<Expand size={16} />}
            disabled={expandingNodeIds.size > 0}
            onClick={() => {
              // Expand all unexpanded nodes
              unexpandedNodes.forEach(node => onExpandEntity(node.id));
            }}
            sx={{ color: 'white' }}
          >
            Expand All Unexplored
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ConnectionsPanel;