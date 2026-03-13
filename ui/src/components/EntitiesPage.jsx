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
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  ListItemIcon
} from '@mui/material';
import { 
  Database, 
  Search, 
  RefreshCw, 
  Users,
  LoaderCircle,
  Filter,
  Plus
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
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [dialogSearch, setDialogSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const itemsPerPage = 15;
  const headers = { headers: { 'x-api-key': apiKey } };

  useEffect(() => {
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
      await axios.post(`https://${apiEndpoint}/entity`, { "ID": ID, "INTERESTED": newInterested }, headers);
      showNotification(`Entity ${newInterested === "YES" ? 'marked as interested' : 'unmarked'}`, 'success');
    } catch (error) {
      showNotification('Error updating entity', 'error');
    }
  };

  const applyFilters = (list, search, interestedOnly) => {
    let filtered = list;
    if (interestedOnly) {
      filtered = filtered.filter(entity => entity.INTERESTED === 'YES');
    }
    if (search) {
      filtered = filtered.filter(entity => entity.NAME.toLowerCase().includes(search.toLowerCase()));
    }
    return [...filtered].sort((a, b) => a.NAME.localeCompare(b.NAME));
  };

  const handleSearch = (value) => {
    setSearchInput(value);
    setFilteredEntityList(applyFilters(entityList, value, showInterestedOnly));
    setCurrentPage(1);
  };

  const handleShowInterestedOnly = (interested) => {
    setShowInterestedOnly(interested);
    setFilteredEntityList(applyFilters(entityList, searchInput, interested));
    setCurrentPage(1);
  };

  // Add Entity dialog
  const openAddDialog = () => {
    const notInterested = entityList.filter(e => e.INTERESTED !== 'YES');
    setSelectedIds(new Set());
    setDialogSearch('');
    setAddDialogOpen(true);
  };

  const toggleSelection = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddToGraph = async () => {
    if (selectedIds.size === 0) return;
    setIsSaving(true);
    try {
      await Promise.all(
        [...selectedIds].map(id =>
          axios.post(`https://${apiEndpoint}/entity`, { "ID": id, "INTERESTED": "YES" }, headers)
        )
      );
      const updateEntityList = (list) =>
        list.map(entity =>
          selectedIds.has(entity.ID) ? { ...entity, INTERESTED: "YES" } : entity
        );
      setEntityList(updateEntityList);
      setFilteredEntityList(prev => applyFilters(updateEntityList(entityList), searchInput, showInterestedOnly));
      showNotification(`${selectedIds.size} entit${selectedIds.size === 1 ? 'y' : 'ies'} added to graph`, 'success');
      setAddDialogOpen(false);
    } catch (error) {
      showNotification('Error adding entities', 'error');
    }
    setIsSaving(false);
  };

  const notInterestedEntities = entityList
    .filter(e => e.INTERESTED !== 'YES')
    .filter(e => e.NAME.toLowerCase().includes(dialogSearch.toLowerCase()))
    .sort((a, b) => a.NAME.localeCompare(b.NAME));

  const paginatedEntities = filteredEntityList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredEntityList.length / itemsPerPage);
  const interestedCount = entityList.filter(entity => entity.INTERESTED === 'YES').length;
  const totalCount = entityList.length;

  return (
    <Box sx={{ width: '100%', maxWidth: 'none' }}>
      <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 4 }}>
        Entity Management
      </Typography>

      <Alert severity="info" sx={{ mb: 4, backgroundColor: '#E3F2FD', border: '1px solid #90CAF9', color: '#1565C0', '& .MuiAlert-icon': { color: '#1976D2' } }}>
        <Typography variant="body2" sx={{ color: '#1565C0' }}>
          Manage entities extracted from your documents. Mark entities as "interested" to focus analysis on specific companies, people, or organizations that matter to your business.
        </Typography>
      </Alert>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF', '&:hover': { boxShadow: '0 4px 8px rgba(0,0,0,0.15)' } }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                <Users size={24} color="#FF9900" />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>{totalCount}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">Total Entities</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ backgroundColor: '#E8F5E8', border: '1px solid #C8E6C9', '&:hover': { boxShadow: '0 4px 8px rgba(0,0,0,0.15)' } }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                <Database size={24} color="#4CAF50" />
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#2E7D32' }}>{interestedCount}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">Interested Entities</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ backgroundColor: '#FFF3E0', border: '1px solid #FFD54F', '&:hover': { boxShadow: '0 4px 8px rgba(0,0,0,0.15)' } }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                <Filter size={24} color="#FF9900" />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>{filteredEntityList.length}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">Filtered Results</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Controls Section */}
      <Card sx={{ mb: 4, border: '1px solid #E9ECEF', borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)', backgroundColor: 'white' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 4, mb: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Search Entities"
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search size={18} color="#666" /></InputAdornment> }}
                placeholder="Search by entity name..."
                sx={{ width: '400px', '& .MuiOutlinedInput-root': { height: '56px' } }}
              />
              <FormControlLabel
                control={<Switch checked={showInterestedOnly} onChange={(e) => handleShowInterestedOnly(e.target.checked)} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: 'primary.main' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'primary.main' } }} />}
                label="Show Interested Only"
                sx={{ '& .MuiFormControlLabel-label': { fontWeight: 500, fontSize: '0.95rem' } }}
              />
            </Box>
            <TextField
              label="N Hops"
              type="number"
              value={nHops}
              onChange={(e) => handleNHopsChange(e.target.value)}
              inputProps={{ min: 0, max: 10 }}
              helperText="Connection hops (0-10)"
              sx={{ width: '120px', '& .MuiOutlinedInput-root': { height: '56px' } }}
            />
            <Button
              variant="contained"
              size="large"
              startIcon={<Plus size={20} />}
              onClick={openAddDialog}
              disabled={!apiEndpoint || !apiKey || entityList.length === 0}
              sx={{ color: 'white', px: 3, height: '56px', alignSelf: 'flex-start' }}
            >
              Add Entity
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={isLoadingEntities ? <LoaderCircle className="animate-spin" size={20} /> : <RefreshCw size={20} />}
              onClick={loadEntities}
              disabled={isLoadingEntities || !apiEndpoint || !apiKey}
              sx={{ px: 3, height: '56px', alignSelf: 'flex-start' }}
            >
              {isLoadingEntities ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Entity List */}
      <Card sx={{ border: '1px solid #E9ECEF', borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)', backgroundColor: 'white' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Database size={18} color="#FF9900" />
              Entities ({filteredEntityList.length})
            </Typography>
            {searchInput && (
              <Chip label={`Searching: "${searchInput}"`} size="small" onDelete={() => handleSearch('')} sx={{ backgroundColor: 'primary.light', color: 'white', '& .MuiChip-deleteIcon': { color: 'white' } }} />
            )}
          </Box>
          
          {filteredEntityList.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Database size={48} color="#E0E0E0" style={{ marginBottom: 16 }} />
              <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
                {entityList.length === 0 ? 'No entities found' : 'No entities match your criteria'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {entityList.length === 0 ? 'Click "Refresh" to load data from your knowledge graph.' : 'Try adjusting your search terms or filters.'}
              </Typography>
            </Box>
          ) : (
            <>
              <Paper sx={{ border: '1px solid #F1F3F4' }}>
                <List sx={{ p: 0 }}>
                  {paginatedEntities.map((entity, index) => (
                    <ListItem key={entity.ID} sx={{ borderBottom: index < paginatedEntities.length - 1 ? '1px solid #F1F3F4' : 'none', py: 2, '&:hover': { backgroundColor: '#F8F9FA' } }}>
                      <ListItemText
                        primary={
                          <Typography component="span" variant="subtitle1" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            <span style={{ flexGrow: 1 }}>{entity.NAME}</span>
                            <Chip label={entity.LABEL} size="small" variant="outlined" sx={{ borderColor: 'primary.main', color: 'primary.main', fontSize: '0.75rem', fontWeight: 500 }} />
                          </Typography>
                        }
                        secondary={
                          <Typography component="span" variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>ID: {entity.ID}</span>
                            <FormControlLabel
                              control={<Switch size="small" checked={entity.INTERESTED === 'YES'} onChange={() => handleEntitySwitchChange(entity.ID, entity.INTERESTED === 'YES')} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: 'primary.main' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'primary.main' } }} />}
                              label={<Typography variant="body2" sx={{ fontWeight: 500, color: entity.INTERESTED === 'YES' ? 'primary.main' : 'text.secondary' }}>{entity.INTERESTED === 'YES' ? 'Interested' : 'Not Interested'}</Typography>}
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
                  <Pagination count={totalPages} page={currentPage} onChange={(e, value) => setCurrentPage(value)} size="medium" sx={{ '& .MuiPaginationItem-root.Mui-selected': { backgroundColor: 'primary.main', color: 'white' } }} />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Entity Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Plus size={20} color="#FF9900" /> Add Entities to Track
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Filter entities..."
            value={dialogSearch}
            onChange={(e) => setDialogSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> }}
            sx={{ my: 1 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            {selectedIds.size} selected · {notInterestedEntities.length} available
          </Typography>
          <Paper variant="outlined" sx={{ maxHeight: 400, overflow: 'auto' }}>
            <List dense sx={{ p: 0 }}>
              {notInterestedEntities.map(entity => (
                <ListItem key={entity.ID} button onClick={() => toggleSelection(entity.ID)} sx={{ '&:hover': { backgroundColor: '#F8F9FA' } }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Checkbox edge="start" checked={selectedIds.has(entity.ID)} size="small" sx={{ '&.Mui-checked': { color: 'primary.main' } }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={entity.NAME}
                    secondary={entity.LABEL}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              ))}
              {notInterestedEntities.length === 0 && (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {entityList.filter(e => e.INTERESTED !== 'YES').length === 0 ? 'All entities are already tracked' : 'No matching entities'}
                  </Typography>
                </Box>
              )}
            </List>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddToGraph}
            disabled={selectedIds.size === 0 || isSaving}
            startIcon={isSaving ? <LoaderCircle className="animate-spin" size={16} /> : <Plus size={16} />}
            sx={{ color: 'white' }}
          >
            {isSaving ? 'Adding...' : `Add to Graph (${selectedIds.size})`}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={notification.open} autoHideDuration={6000} onClose={() => setNotification({ ...notification, open: false })}>
        <Alert onClose={() => setNotification({ ...notification, open: false })} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EntitiesPage;
