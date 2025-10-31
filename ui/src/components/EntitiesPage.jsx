import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  Pagination,
  Alert,
  Snackbar,
  InputAdornment,
  Paper,
  Chip,
  Button,
  Grid,
  Divider
} from '@mui/material';
import { 
  Database, 
  Search, 
  RefreshCw, 
  Users,
  LoaderCircle,
  Filter,
  Settings as SettingsIcon
} from 'lucide-react';

const EntitiesPage = ({ 
  apiEndpoint, 
  apiKey, 
  entityList,
  setEntityList,
  filteredEntityList,
  setFilteredEntityList,
  searchInput,
  setSearchInput,
  showInterestedOnly,
  setShowInterestedOnly,
  settingsLoaded,
  setSettingsLoaded,
  nHops,
  setNHops
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingEntities, setIsLoadingEntities] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const itemsPerPage = 15;
  const headers = { headers: { 'x-api-key': apiKey } };

  useEffect(() => {
    // Load entities if not already loaded and API credentials are available
    if (!settingsLoaded && apiEndpoint.trim() && apiKey.trim()) {
      loadEntities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  const loadEntities = async () => {
    if (!apiEndpoint.trim() || !apiKey.trim()) {
      showNotification('API Endpoint or API Key is missing', 'error');
      return;
    }
    
    setIsLoadingEntities(true);
    try {
      const [entityData, nData] = await Promise.all([
        axios.get(`https://${apiEndpoint}/entity`, headers),
        axios.get(`https://${apiEndpoint}/n`, headers)
      ]);
      
      setEntityList(entityData.data);
      setFilteredEntityList([...entityData.data].sort((a, b) => a.NAME.localeCompare(b.NAME)));
      setNHops(nData.data["N"]);
      setShowInterestedOnly(false);
      setSearchInput("");
      setSettingsLoaded(true);
      showNotification('Data loaded successfully', 'success');
    } catch (error) {

      showNotification('Error loading data', 'error');
    }
    setIsLoadingEntities(false);
  };

  const handleNHopsChange = async (value) => {
    const intValue = parseInt(value, 10);
    if (!isNaN(intValue) && intValue >= 0) {
      setNHops(intValue);
      try {
        await axios.post(`https://${apiEndpoint}/n`, { "N": intValue }, headers);
        showNotification('N Hops updated successfully', 'success');
      } catch (error) {
        showNotification('Error updating N Hops', 'error');
      }
    }
  };

  const handleEntitySwitchChange = async (ID, INTERESTED) => {
    const newInterested = INTERESTED ? "NO" : "YES";
    
    const updateEntityList = (list) =>
      list.map((entity) =>
        entity.ID === ID ? { ...entity, INTERESTED: newInterested } : entity
      );

    setEntityList(updateEntityList);
    setFilteredEntityList(updateEntityList);

    try {
      await axios.post(`https://${apiEndpoint}/entity`, 
        { "ID": ID, "INTERESTED": newInterested }, 
        headers
      );
      showNotification(`Entity ${newInterested === "YES" ? 'marked as interested' : 'unmarked'}`, 'success');
    } catch (error) {
      showNotification('Error updating entity', 'error');
    }
  };

  const handleSearch = (value) => {
    setSearchInput(value);
    let filtered = entityList.filter((entity) =>
      entity.NAME.toLowerCase().includes(value.toLowerCase())
    );
    
    if (showInterestedOnly) {
      filtered = filtered.filter(entity => entity.INTERESTED === 'YES');
    }
    
    filtered.sort((a, b) => a.NAME.localeCompare(b.NAME));
    setFilteredEntityList(filtered);
    setCurrentPage(1);
  };

  const handleShowInterestedOnly = (interested) => {
    setShowInterestedOnly(interested);
    let filtered = entityList;
    
    if (interested) {
      filtered = entityList.filter(entity => entity.INTERESTED === 'YES');
    }
    
    if (searchInput) {
      filtered = filtered.filter(entity =>
        entity.NAME.toLowerCase().includes(searchInput.toLowerCase())
      );
    }
    
    filtered.sort((a, b) => a.NAME.localeCompare(b.NAME));
    setFilteredEntityList(filtered);
    setCurrentPage(1);
  };

  const paginatedEntities = filteredEntityList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredEntityList.length / itemsPerPage);

  const interestedCount = entityList.filter(entity => entity.INTERESTED === 'YES').length;
  const totalCount = entityList.length;

  return (
    <Box sx={{ width: '100%', maxWidth: 'none' }}>
      {/* Header Section */}
      <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 4 }}>
        Entity Management
      </Typography>

      <Alert
        severity="info"
        sx={{
          mb: 4,
          backgroundColor: '#E3F2FD',
          border: '1px solid #90CAF9',
          color: '#1565C0',
          '& .MuiAlert-icon': { color: '#1976D2' }
        }}
      >
        <Typography variant="body2" sx={{ color: '#1565C0' }}>
          Manage entities extracted from your documents. Mark entities as "interested" to focus analysis on specific companies, people, or organizations that matter to your business.
        </Typography>
      </Alert>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            backgroundColor: '#F8F9FA', 
            border: '1px solid #E9ECEF',
            '&:hover': { boxShadow: '0 4px 8px rgba(0,0,0,0.15)' }
          }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                <Users size={24} color="#FF9900" />
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {totalCount}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Total Entities
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            backgroundColor: '#E8F5E8', 
            border: '1px solid #C8E6C9',
            '&:hover': { boxShadow: '0 4px 8px rgba(0,0,0,0.15)' }
          }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                <Database size={24} color="#4CAF50" />
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#2E7D32' }}>
                  {interestedCount}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Interested Entities
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            backgroundColor: '#FFF3E0', 
            border: '1px solid #FFD54F',
            '&:hover': { boxShadow: '0 4px 8px rgba(0,0,0,0.15)' }
          }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                <Filter size={24} color="#FF9900" />
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {filteredEntityList.length}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Filtered Results
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Controls Section */}
      <Card sx={{
        mb: 4,
        width: '100%',
        border: '1px solid #E9ECEF',
        borderRadius: 3,
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        backgroundColor: 'white'
      }}>
        <CardContent sx={{ p: 4, width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mb: 4, width: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Search size={18} color="#FF9900" />
              Search, Filter & Configuration
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 4, mb: 3 }}>
            {/* Search Input with Switch below */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Search Entities"
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} color="#666" />
                    </InputAdornment>
                  )
                }}
                placeholder="Search by entity name..."
                sx={{ 
                  width: '400px',
                  '& .MuiOutlinedInput-root': {
                    height: '56px',
                    '&.Mui-focused fieldset': {
                      borderColor: 'primary.main',
                    },
                  },
                }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={showInterestedOnly}
                    onChange={(e) => handleShowInterestedOnly(e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: 'primary.main',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: 'primary.main',
                      },
                    }}
                  />
                }
                label="Show Interested Only"
                sx={{ '& .MuiFormControlLabel-label': { fontWeight: 500, fontSize: '0.95rem' } }}
              />
            </Box>
            
            {/* N Hops Input */}
            <TextField
              label="N Hops"
              type="number"
              value={nHops}
              onChange={(e) => handleNHopsChange(e.target.value)}
              inputProps={{ min: 0, max: 10 }}
              helperText="Connection hops (0-10)"
              sx={{ 
                width: '120px',
                '& .MuiOutlinedInput-root': {
                  height: '56px',
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main',
                  },
                },
              }}
            />
            
            {/* Refresh Button aligned with inputs */}
            <Button
              variant="contained"
              size="large"
              startIcon={isLoadingEntities ? <LoaderCircle className="animate-spin" size={20} /> : <RefreshCw size={20} />}
              onClick={loadEntities}
              disabled={isLoadingEntities || !apiEndpoint || !apiKey}
              sx={{ 
                color: 'white', 
                px: 3, 
                height: '56px',
                alignSelf: 'flex-start'
              }}
            >
              {isLoadingEntities ? 'Refreshing...' : 'Refresh All Data'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Entity List */}
      <Card sx={{
        border: '1px solid #E9ECEF',
        borderRadius: 3,
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        backgroundColor: 'white'
      }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Database size={18} color="#FF9900" />
              Entities ({filteredEntityList.length})
            </Typography>
            {searchInput && (
              <Chip 
                label={`Searching: "${searchInput}"`} 
                size="small" 
                onDelete={() => handleSearch('')}
                sx={{ 
                  backgroundColor: 'primary.light', 
                  color: 'white',
                  '& .MuiChip-deleteIcon': { color: 'white' }
                }}
              />
            )}
          </Box>
          
          {filteredEntityList.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Database size={48} color="#E0E0E0" style={{ marginBottom: 16 }} />
              <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
                {entityList.length === 0 ? 'No entities found' : 'No entities match your criteria'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {entityList.length === 0 
                  ? 'Click "Refresh Entities" to load data from your knowledge graph.' 
                  : 'Try adjusting your search terms or filters.'}
              </Typography>
            </Box>
          ) : (
            <>
              <Paper sx={{ border: '1px solid #F1F3F4' }}>
                <List sx={{ p: 0 }}>
                  {paginatedEntities.map((entity, index) => (
                    <ListItem
                      key={entity.ID}
                      sx={{
                        borderBottom: index < paginatedEntities.length - 1 ? '1px solid #F1F3F4' : 'none',
                        py: 2,
                        '&:hover': { backgroundColor: '#F8F9FA' },
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography component="span" variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <span style={{ flexGrow: 1 }}>{entity.NAME}</span>
                            <Chip 
                              label={entity.LABEL} 
                              size="small" 
                              variant="outlined"
                              sx={{ 
                                borderColor: 'primary.main', 
                                color: 'primary.main',
                                fontSize: '0.75rem',
                                fontWeight: 500
                              }}
                            />
                          </Typography>
                        }
                        secondary={
                          <Typography component="span" variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>ID: {entity.ID}</span>
                            <FormControlLabel
                              control={
                                <Switch
                                  size="small"
                                  checked={entity.INTERESTED === 'YES'}
                                  onChange={() => handleEntitySwitchChange(entity.ID, entity.INTERESTED === 'YES')}
                                  sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': {
                                      color: 'primary.main',
                                    },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                      backgroundColor: 'primary.main',
                                    },
                                  }}
                                />
                              }
                              label={
                                <Typography variant="body2" sx={{ 
                                  fontWeight: 500,
                                  color: entity.INTERESTED === 'YES' ? 'primary.main' : 'text.secondary'
                                }}>
                                  {entity.INTERESTED === 'YES' ? 'Interested' : 'Not Interested'}
                                </Typography>
                              }
                              sx={{ ml: 'auto' }}
                            />
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
              
              {totalPages > 1 && (
                <Box sx={{ pt: 3, display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={(event, value) => setCurrentPage(value)}
                    size="medium"
                    sx={{
                      '& .MuiPaginationItem-root.Mui-selected': {
                        backgroundColor: 'primary.main',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'primary.dark',
                        },
                      },
                    }}
                  />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert 
          onClose={() => setNotification({ ...notification, open: false })} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EntitiesPage;