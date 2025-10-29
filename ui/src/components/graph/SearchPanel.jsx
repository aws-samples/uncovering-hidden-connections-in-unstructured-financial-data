import React, { useState, useCallback } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  InputAdornment,
  IconButton,
  Alert,
  Box,
  Fade,
  CircularProgress
} from '@mui/material';
import {
  Search,
  X,
  Database,
  TrendingUp,
  Plus,
  Check,
  ChevronRight
} from 'lucide-react';

const SearchPanel = ({
  searchTerm,
  setSearchTerm,
  onSearch,
  searchResults,
  onAddEntity, // New prop for adding entities to graph
  isSearching,
  addedEntityIds = [], // New prop to track which entities have been added
  className = ''
}) => {

  const [hasSearched, setHasSearched] = useState(false);
  const [expandedResults, setExpandedResults] = useState(new Set());

  const handleSearch = useCallback(() => {
    if (searchTerm.trim()) {
      onSearch(searchTerm.trim());
      setHasSearched(true);
    }
  }, [searchTerm, onSearch]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);



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

  const toggleResultExpansion = useCallback((entityId) => {
    setExpandedResults(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entityId)) {
        newSet.delete(entityId);
      } else {
        newSet.add(entityId);
      }
      return newSet;
    });
  }, []);

  const handleAddEntity = useCallback((entity, event) => {
    event.stopPropagation();
    if (onAddEntity) {
      onAddEntity(entity);
    }
  }, [onAddEntity]);



  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        borderRadius: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
      className={className}
    >
      <Typography variant="h6" sx={{
        fontWeight: 600,
        mb: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <Search size={20} color="#FF9900" />
        Entity Search & Discovery
      </Typography>

      {/* Search Input */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search for entities in the knowledge graph..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          // Reset hasSearched when user starts typing a new search
          if (hasSearched && e.target.value !== searchTerm) {
            setHasSearched(false);
          }
        }}
        onKeyDown={handleKeyPress}

        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} color="#666" />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => {
                  setSearchTerm('');
                  setHasSearched(false);
                }}>
                  <X size={16} />
                </IconButton>
              </InputAdornment>
            )
          }
        }}
        sx={{
          mb: 1,
          '& .MuiOutlinedInput-root': {
            '&.Mui-focused fieldset': {
              borderColor: 'primary.main',
            },
          },
        }}
      />

      {/* Search Button */}
      <Button
        fullWidth
        variant="contained"
        onClick={handleSearch}
        disabled={isSearching || !searchTerm.trim()}
        startIcon={isSearching ? <CircularProgress size={16} /> : <Database size={16} />}
        sx={{
          mb: 0.5,
          textTransform: 'none',
          py: 1.2,
          fontWeight: 600
        }}
      >
        {isSearching ? 'Searching...' : 'Search Knowledge Graph'}
      </Button>



      {/* Search Results */}
      {searchResults.length > 0 && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Typography variant="subtitle2" sx={{
            fontWeight: 600,
            mb: 0.25,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: 'text.secondary'
          }}>
            <TrendingUp size={14} />
            Search Results ({searchResults.length})
          </Typography>

          <Box sx={{
            flex: 1,
            overflow: 'auto',
            minHeight: 0,
            '& > *:not(:last-child)': {
              mb: 1
            }
          }}>
            {searchResults.map((entity) => {
              const isAdded = addedEntityIds.includes(entity.ID);
              const isExpanded = expandedResults.has(entity.ID);

              return (
                <Paper
                  key={entity.ID}
                  elevation={1}
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: isAdded ? '2px solid #4ECDC4' : '1px solid #E9ECEF',
                    backgroundColor: isAdded ? '#F0FDFC' : 'white',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      elevation: 2,
                      borderColor: isAdded ? '#4ECDC4' : '#D1D5DB'
                    }
                  }}
                >
                  {/* Main Result Row */}
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1.5,
                    gap: 1.5
                  }}>
                    {/* Expand/Collapse Button */}
                    <IconButton
                      size="small"
                      onClick={() => toggleResultExpansion(entity.ID)}
                      sx={{
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease-in-out',
                        color: 'text.secondary'
                      }}
                    >
                      <ChevronRight size={16} />
                    </IconButton>

                    {/* Entity Icon/Symbol */}
                    <Box sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: getNodeColor(entity.LABEL),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      flexShrink: 0
                    }}>
                      {entity.LABEL ? entity.LABEL.charAt(0) : '?'}
                    </Box>

                    {/* Entity Details */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        mb: 0.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {entity.NAME}
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Chip
                          label={entity.LABEL}
                          size="small"
                          sx={{
                            backgroundColor: getNodeColor(entity.LABEL),
                            color: 'white',
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            height: 18
                          }}
                        />
                        {isAdded && (
                          <Chip
                            label="Added to Graph"
                            size="small"
                            icon={<Check size={12} />}
                            sx={{
                              backgroundColor: '#10B981',
                              color: 'white',
                              fontSize: '0.7rem',
                              fontWeight: 500,
                              height: 18,
                              '& .MuiChip-icon': {
                                color: 'white'
                              }
                            }}
                          />
                        )}
                      </Box>

                      {entity.DESCRIPTION && (
                        <Typography variant="caption" sx={{
                          color: 'text.secondary',
                          fontSize: '0.75rem',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {entity.DESCRIPTION}
                        </Typography>
                      )}
                    </Box>

                    {/* Add to Graph Button */}
                    <IconButton
                      size="small"
                      onClick={(e) => handleAddEntity(entity, e)}
                      disabled={isAdded}
                      sx={{
                        color: isAdded ? 'success.main' : 'primary.main',
                        backgroundColor: isAdded ? 'success.light' : 'transparent',
                        '&:hover': {
                          backgroundColor: isAdded ? 'success.light' : 'primary.light',
                          color: 'white'
                        },
                        '&:disabled': {
                          color: 'success.main',
                          backgroundColor: 'success.light'
                        }
                      }}
                      title={isAdded ? "Already added to graph" : "Add to graph"}
                    >
                      {isAdded ? <Check size={16} /> : <Plus size={16} />}
                    </IconButton>
                  </Box>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <Fade in={isExpanded}>
                      <Box sx={{
                        borderTop: '1px solid #E9ECEF',
                        backgroundColor: '#F8F9FA',
                        p: 2
                      }}>
                        <Typography variant="subtitle2" sx={{
                          fontWeight: 600,
                          mb: 1,
                          color: 'text.secondary'
                        }}>
                          Entity Properties
                        </Typography>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                              ID:
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.primary', fontFamily: 'monospace' }}>
                              {entity.ID}
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                              Type:
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.primary' }}>
                              {entity.LABEL}
                            </Typography>
                          </Box>

                          {entity.DESCRIPTION && (
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', mb: 0.5 }}>
                                Description:
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'text.primary' }}>
                                {entity.DESCRIPTION}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Fade>
                  )}
                </Paper>
              );
            })}
          </Box>
        </Box>
      )}

      {/* No Results Message - Only show after a search has been completed */}
      {searchResults.length === 0 && searchTerm && !isSearching && hasSearched && (
        <Alert
          severity="info"
          sx={{
            mt: 0.5,
            borderRadius: 1,
            '& .MuiAlert-message': {
              fontSize: '0.875rem'
            }
          }}
        >
          No entities found matching "{searchTerm}". Try different keywords or check spelling.
        </Alert>
      )}


    </Paper>
  );
};

export default SearchPanel;