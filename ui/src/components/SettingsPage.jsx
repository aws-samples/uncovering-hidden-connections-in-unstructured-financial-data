import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  Pagination,
  Alert,
  Snackbar,
  Divider,
  InputAdornment,
  Paper,
  Chip
} from '@mui/material';
import { 
  Settings as SettingsIcon, 
  Key, 
  Database, 
  Search, 
  Download, 
  FileText, 
  RefreshCw, 
  ExternalLink,
  LoaderCircle
} from 'lucide-react';

const SettingsPage = ({ 
  apiEndpoint, 
  setApiEndpoint, 
  apiKey, 
  setApiKey, 
  newsApiKey, 
  setNewsApiKey,
  settingsLoaded,
  setSettingsLoaded,
  nHops,
  setNHops,
  entityList,
  setEntityList,
  filteredEntityList,
  setFilteredEntityList,
  searchInput,
  setSearchInput,
  showInterestedOnly,
  setShowInterestedOnly
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isGeneratingNews, setIsGeneratingNews] = useState(false);
  const [isDownloadingNews, setIsDownloadingNews] = useState(false);
  const [isReprocessingNews, setIsReprocessingNews] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const itemsPerPage = 10;
  const headers = { headers: { 'x-api-key': apiKey } };

  useEffect(() => {
    // Only load if settings haven't been loaded before and API credentials are available
    if (!settingsLoaded && apiEndpoint.trim() && apiKey.trim()) {
      loadSettingsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only runs once on mount

  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  const loadSettingsData = async () => {
    if (!apiEndpoint.trim() || !apiKey.trim()) return;
    
    setIsLoadingSettings(true);
    try {
      const [nData, entityData] = await Promise.all([
        axios.get(`https://${apiEndpoint}/n`, headers),
        axios.get(`https://${apiEndpoint}/entity`, headers)
      ]);
      
      setNHops(nData.data["N"]);
      setEntityList(entityData.data);
      setFilteredEntityList([...entityData.data].sort((a, b) => a.NAME.localeCompare(b.NAME)));
      setShowInterestedOnly(false);
      setSearchInput("");
      setSettingsLoaded(true); // Mark settings as loaded globally
      showNotification('Settings loaded successfully', 'success');
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('Error loading settings', 'error');
    }
    setIsLoadingSettings(false);
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

  const handleGenerateNews = async () => {
    if (!apiEndpoint || !apiKey) {
      showNotification('API Endpoint or API Key is missing', 'error');
      return;
    }

    setIsGeneratingNews(true);
    showNotification('Generating sample news... This may take a moment.', 'info');
    
    try {
      await axios.get(`https://${apiEndpoint}/generateNews`, headers);
      showNotification('Sample news generated successfully!', 'success');
    } catch (error) {
      showNotification('Error generating news', 'error');
    }
    
    setTimeout(() => setIsGeneratingNews(false), 10000);
  };

  const handleDownloadNews = async () => {
    if (!apiEndpoint || !apiKey || !newsApiKey) {
      showNotification('API Endpoint, API Key, or NewsAPI Key is missing', 'error');
      return;
    }

    setIsDownloadingNews(true);
    showNotification('Downloading latest news... Please wait.', 'info');
    
    try {
      await axios.get(`https://${apiEndpoint}/downloadNews?newsapikey=${newsApiKey}`, headers);
      showNotification('Latest news downloaded successfully!', 'success');
    } catch (error) {
      showNotification('Error downloading news', 'error');
    }
    
    setTimeout(() => setIsDownloadingNews(false), 10000);
  };

  const handleReprocessNews = async () => {
    if (!apiEndpoint || !apiKey) {
      showNotification('API Endpoint or API Key is missing', 'error');
      return;
    }

    setIsReprocessingNews(true);
    showNotification('Reprocessing news... This will take some time.', 'info');
    
    try {
      await axios.get(`https://${apiEndpoint}/reprocessnews`, headers);
      showNotification('News reprocessing started successfully!', 'success');
    } catch (error) {
      showNotification('Error reprocessing news', 'error');
    }
    
    setTimeout(() => setIsReprocessingNews(false), 10000);
  };

  const paginatedEntities = filteredEntityList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredEntityList.length / itemsPerPage);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 4 }}>
        Settings & Configuration
      </Typography>

      {/* API Configuration Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Key size={18} color="#FF9900" />
          API Configuration
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              size="small"
              label="API Endpoint"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value.startsWith("https://") ? e.target.value.slice(8) : e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">https://</InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      startIcon={<ExternalLink size={14} />}
                      href="https://console.aws.amazon.com/cloudformation/home"
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ fontSize: '0.75rem' }}
                    >
                      CloudFormation
                    </Button>
                  </InputAdornment>
                )
              }}
              placeholder="xxxxxxx.execute-api.<region>.amazonaws.com/<stage>"
              helperText="Your API Gateway endpoint from CloudFormation output"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              label="API Key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      startIcon={<ExternalLink size={14} />}
                      href="https://console.aws.amazon.com/apigateway/main/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ fontSize: '0.75rem' }}
                    >
                      API Keys
                    </Button>
                  </InputAdornment>
                )
              }}
              helperText="Your API Gateway API key"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: '#E0E0E0',
                  },
                  '&:focus-visible': {
                    outline: 'none',
                  },
                },
                '& .MuiInputBase-input': {
                  '&:focus-visible': {
                    outline: 'none',
                  },
                },
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              label="News API Key"
              type="password"
              value={newsApiKey}
              onChange={(e) => setNewsApiKey(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      startIcon={<ExternalLink size={14} />}
                      href="https://newsapi.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ fontSize: '0.75rem' }}
                    >
                      NewsAPI
                    </Button>
                  </InputAdornment>
                )
              }}
              helperText="Your NewsAPI.org API key for downloading news"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: '#E0E0E0',
                  },
                  '&:focus-visible': {
                    outline: 'none',
                  },
                },
                '& .MuiInputBase-input': {
                  '&:focus-visible': {
                    outline: 'none',
                  },
                },
              }}
            />
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* News Processing Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <FileText size={18} color="#FF9900" />
          News Processing
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="contained"
              startIcon={isDownloadingNews ? <LoaderCircle className="animate-spin" size={18} /> : <Download size={18} />}
              onClick={handleDownloadNews}
              disabled={isDownloadingNews || !apiEndpoint || !apiKey || !newsApiKey}
              sx={{ py: 1 }}
            >
              {isDownloadingNews ? 'Downloading...' : 'Download Latest News'}
            </Button>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={isGeneratingNews ? <LoaderCircle className="animate-spin" size={18} /> : <FileText size={18} />}
              onClick={handleGenerateNews}
              disabled={isGeneratingNews || !apiEndpoint || !apiKey}
              sx={{ py: 1 }}
            >
              {isGeneratingNews ? 'Generating...' : 'Generate Sample News'}
            </Button>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={isReprocessingNews ? <LoaderCircle className="animate-spin" size={18} /> : <RefreshCw size={18} />}
              onClick={handleReprocessNews}
              disabled={isReprocessingNews || !apiEndpoint || !apiKey}
              sx={{ py: 1 }}
            >
              {isReprocessingNews ? 'Reprocessing...' : 'Re-process News'}
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 4 }} />

      {/* Analysis & Entity Management */}
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon size={18} color="#FF9900" />
            Analysis Configuration
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <TextField
              size="small"
              label="N Hops"
              type="number"
              value={nHops}
              onChange={(e) => handleNHopsChange(e.target.value)}
              inputProps={{ min: 0, max: 10 }}
              helperText="Number of connection hops to analyze (0-10)"
              sx={{ 
                mb: 2, 
                width: 200,
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: '#E0E0E0',
                  },
                  '&:focus-visible': {
                    outline: 'none',
                  },
                },
                '& .MuiInputBase-input': {
                  '&:focus-visible': {
                    outline: 'none',
                  },
                },
              }}
            />
          </Box>
          
          <Button
            variant="contained"
            startIcon={isLoadingSettings ? <LoaderCircle className="animate-spin" size={18} /> : <RefreshCw size={18} />}
            onClick={loadSettingsData}
            disabled={isLoadingSettings || !apiEndpoint || !apiKey}
            sx={{ color: 'white' }}
          >
            {isLoadingSettings ? 'Refreshing...' : 'Refresh Settings'}
          </Button>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Database size={18} color="#FF9900" />
            Entity Filters
          </Typography>
          
          <TextField
            fullWidth
            size="small"
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
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused fieldset': {
                  borderColor: '#E0E0E0',
                },
                '&:focus-visible': {
                  outline: 'none',
                },
              },
              '& .MuiInputBase-input': {
                '&:focus-visible': {
                  outline: 'none',
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
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* Entity List */}
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Database size={18} color="#FF9900" />
          Entities ({filteredEntityList.length})
        </Typography>
        
        {filteredEntityList.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              {entityList.length === 0 ? 'No entities found. Please refresh settings.' : 'No entities match your search criteria.'}
            </Typography>
          </Box>
        ) : (
          <Paper sx={{ border: '1px solid #E9ECEF' }}>
            <List sx={{ p: 0 }}>
              {paginatedEntities.map((entity, index) => (
                <ListItem
                  key={entity.ID}
                  sx={{
                    borderBottom: index < paginatedEntities.length - 1 ? '1px solid #F1F3F4' : 'none',
                    py: 1.5
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 500, flexGrow: 1 }}>
                          {entity.NAME}
                        </Typography>
                        <Chip 
                          label={entity.LABEL} 
                          size="small" 
                          variant="outlined"
                          sx={{ 
                            borderColor: 'primary.main', 
                            color: 'primary.main',
                            fontSize: '0.7rem'
                          }}
                        />
                      </Box>
                    }
                    secondary={
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
                        label="Interested"
                        sx={{ mt: 0.5 }}
                      />
                    }
                  />
                </ListItem>
              ))}
            </List>
            
            {totalPages > 1 && (
              <Box sx={{ p: 2, borderTop: '1px solid #F1F3F4', display: 'flex', justifyContent: 'center' }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(event, value) => setCurrentPage(value)}
                  size="small"
                />
              </Box>
            )}
          </Paper>
        )}
      </Box>

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

export default SettingsPage;