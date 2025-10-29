import React, { useState, useCallback, useEffect } from 'react';
import { useDebounce } from '../../hooks';
import VirtualizedSearchResults from './VirtualizedSearchResults';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Paper,
  InputAdornment,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Search,
  Plus,
  User,
  Building,
  MapPin,
  Calendar,
  Package,
  Cpu,
  X,
  Check
} from 'lucide-react';

const SearchPanel = ({
  onSearch,
  searchResults,
  onAddEntity,
  isSearching,
  addedEntityIds = [],
  onClearSearch
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Auto-search when debounced term changes
  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      onSearch(debouncedSearchTerm.trim());
    }
  }, [debouncedSearchTerm, onSearch]);

  const handleSearch = useCallback(() => {
    if (searchTerm.trim()) {
      onSearch(searchTerm.trim());
    }
  }, [searchTerm, onSearch]);

  const handleKeyPress = useCallback((event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    onClearSearch?.();
  }, [onClearSearch]);

  const getEntityIcon = useCallback((label) => {
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
  }, []);

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
      {/* Search Header */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Search Entities
      </Typography>

      {/* Search Input */}
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search for entities..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyPress={handleKeyPress}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search size={20} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {isSearching && <CircularProgress size={20} />}
              {searchTerm && !isSearching && (
                <IconButton
                  size="small"
                  onClick={handleClearSearch}
                  sx={{ p: 0.5 }}
                >
                  <X size={16} />
                </IconButton>
              )}
            </InputAdornment>
          )
        }}
        sx={{ mb: 2 }}
      />

      {/* Search Actions */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <Button
          fullWidth
          variant="contained"
          onClick={handleSearch}
          disabled={!searchTerm.trim() || isSearching}
          startIcon={<Search size={18} />}
          sx={{ color: 'white' }}
        >
          {isSearching ? 'Searching...' : 'Search'}
        </Button>
        <Button
          variant="outlined"
          onClick={handleClearSearch}
          disabled={!searchTerm && searchResults.length === 0}
          sx={{ minWidth: 'auto', px: 2 }}
        >
          <X size={18} />
        </Button>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Search Results */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Search Results ({searchResults.length})
        </Typography>

        {searchResults.length === 0 ? (
          <Box sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: 'text.secondary'
          }}>
            <Box>
              <Search size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                {isSearching ? 'Searching...' : 'No results found'}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.5 }}>
                {!isSearching && 'Try searching for entity names'}
              </Typography>
            </Box>
          </Box>
        ) : searchResults.length > 20 ? (
          // Use virtualization for large result sets
          <VirtualizedSearchResults
            searchResults={searchResults}
            onAddEntity={onAddEntity}
            addedEntityIds={addedEntityIds}
            height={400}
          />
        ) : (
          // Use regular rendering for small result sets
          <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
            {searchResults.map((entity, index) => (
              <Paper
                key={entity.ID || index}
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
                      {addedEntityIds.includes(entity.ID) ? (
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
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default SearchPanel;