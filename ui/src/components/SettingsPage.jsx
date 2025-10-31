import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Grid,
  Typography,
  TextField,
  Button,
  Alert,
  Snackbar,
  Divider,
  InputAdornment
} from '@mui/material';
import { 
  Settings as SettingsIcon, 
  Key, 
  Download, 
  FileText, 
  RefreshCw, 
  ExternalLink,
  LoaderCircle
} from 'lucide-react';
import ConfirmationDialog from './ConfirmationDialog';

const SettingsPage = ({ 
  apiEndpoint, 
  setApiEndpoint, 
  apiKey, 
  setApiKey, 
  newsApiKey, 
  setNewsApiKey
}) => {

  const [isGeneratingNews, setIsGeneratingNews] = useState(false);
  const [isDownloadingNews, setIsDownloadingNews] = useState(false);
  const [isReprocessingNews, setIsReprocessingNews] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [confirmDialog, setConfirmDialog] = useState({ 
    open: false, 
    title: '', 
    message: '', 
    onConfirm: null 
  });

  const headers = { headers: { 'x-api-key': apiKey } };



  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
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

  const handlePurgeNews = async () => {
    if (!apiEndpoint || !apiKey) {
      showNotification('API Endpoint or API Key is missing', 'error');
      return;
    }

    // Show custom confirmation dialog
    setConfirmDialog({
      open: true,
      title: 'Purge All News Data',
      message: 'This will permanently delete ALL processed news data from the database.\n\nThis action CANNOT be undone.\n\nAre you absolutely sure you want to continue?',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, open: false });
        
        try {
          showNotification('Purging all news data... Please wait.', 'info');
          const response = await axios.delete(`https://${apiEndpoint}/purge-news`, headers);
          
          if (response.data.success) {
            const warningText = response.data.warning ? ` ${response.data.warning}` : '';
            showNotification(
              `Successfully purged ${response.data.deleted_count} news records.${warningText}`, 
              'success'
            );
          } else {
            showNotification(`Error: ${response.data.error}`, 'error');
          }
        } catch (error) {
          showNotification('Error purging news data', 'error');
          console.error('Purge news error:', error);
        }
      }
    });
  };

  const handlePurgeEntities = async () => {
    if (!apiEndpoint || !apiKey) {
      showNotification('API Endpoint or API Key is missing', 'error');
      return;
    }

    // Show custom confirmation dialog
    setConfirmDialog({
      open: true,
      title: 'Purge All Entities & Relationships',
      message: 'This will permanently delete ALL entities and relationships from the knowledge graph.\n\nThis includes all extracted entities, their relationships, and connection data.\n\nThis action CANNOT be undone.\n\nAre you absolutely sure you want to continue?',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, open: false });
        
        try {
          showNotification('Purging all entities and relationships... Please wait.', 'info');
          const response = await axios.delete(`https://${apiEndpoint}/purge-entities`, headers);
          
          if (response.data.success) {
            const warningText = response.data.warning ? ` ${response.data.warning}` : '';
            showNotification(
              `Successfully purged ${response.data.deleted_vertices} entities and ${response.data.deleted_edges} relationships.${warningText}`, 
              'success'
            );
          } else {
            showNotification(`Error: ${response.data.error}`, 'error');
          }
        } catch (error) {
          showNotification('Error purging entities and relationships', 'error');
          console.error('Purge entities error:', error);
        }
      }
    });
  };



  return (
    <Box>
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

      {/* Administration Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon size={18} color="#FF9900" />
          Administration
        </Typography>
        
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            ⚠️ Destructive Operations Warning
          </Typography>
          <Typography variant="body2">
            The operations below will permanently delete data and cannot be undone. Use with extreme caution.
          </Typography>
        </Alert>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Button
              fullWidth
              variant="outlined"
              color="error"
              startIcon={<FileText size={18} />}
              onClick={handlePurgeNews}
              disabled={!apiEndpoint || !apiKey}
              sx={{ 
                py: 1.5,
                borderColor: 'error.main',
                color: 'error.main',
                '&:hover': {
                  borderColor: 'error.dark',
                  backgroundColor: 'error.light',
                  color: 'error.dark'
                }
              }}
            >
              Purge All News Data
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Permanently deletes all processed news from DynamoDB
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Button
              fullWidth
              variant="outlined"
              color="error"
              startIcon={<RefreshCw size={18} />}
              onClick={handlePurgeEntities}
              disabled={!apiEndpoint || !apiKey}
              sx={{ 
                py: 1.5,
                borderColor: 'error.main',
                color: 'error.main',
                '&:hover': {
                  borderColor: 'error.dark',
                  backgroundColor: 'error.light',
                  color: 'error.dark'
                }
              }}
            >
              Purge All Entities & Relationships
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Permanently deletes all entities and relationships from Neptune
            </Typography>
          </Grid>
        </Grid>
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

      <ConfirmationDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Yes, Delete All"
        cancelText="Cancel"
        severity="error"
      />
    </Box>
  );
};

export default SettingsPage;