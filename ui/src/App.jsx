import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout';
import HomePage from './components/HomePage';
import UploadPage from './components/UploadPage';
import EntitiesPage from './components/EntitiesPage';
import NewsPage from './components/NewsPage';
import RelationshipsPage from './components/RelationshipsPage';
import SettingsPage from './components/SettingsPage';

const theme = createTheme({
  palette: {
    primary: {
      main: '#FF9900',
      light: '#FFB84D',
      dark: '#CC7700',
    },
    secondary: {
      main: '#2C3E50',
    },
    background: {
      default: '#F8F9FA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#2C3E50',
      secondary: '#6C757D',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1.1rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '0.95rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 6,
          fontWeight: 500,
          padding: '8px 16px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
          border: '1px solid #E9ECEF',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [newsApiKey, setNewsApiKey] = useState('');
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  
  // Global settings data that persists across page navigation
  const [nHops, setNHops] = useState(0);
  const [entityList, setEntityList] = useState([]);
  const [filteredEntityList, setFilteredEntityList] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [showInterestedOnly, setShowInterestedOnly] = useState(false);
  
  // Global news data that persists across page navigation
  const [news, setNews] = useState([]);
  const [selectedNews, setSelectedNews] = useState("");
  const [selectedPaths, setSelectedPaths] = useState([]);
  
  // Global processing status data that persists across page navigation
  const [processingStatus, setProcessingStatus] = useState([]);
  const [processingStatusLoaded, setProcessingStatusLoaded] = useState(false);
  
  // Global graph/relationships data that persists across page navigation
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [searchResults, setSearchResults] = useState([]);
  const [addedEntityIds, setAddedEntityIds] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [selectedRelationship, setSelectedRelationship] = useState(null);
  const [currentFilters, setCurrentFilters] = useState(null);
  const [graphLoaded, setGraphLoaded] = useState(false);
  
  // Graph UI state that persists across page navigation
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(true);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(true);
  const [activeLeftPanel, setActiveLeftPanel] = useState('search');
  const [activeRightPanel, setActiveRightPanel] = useState('details');
  const [currentLayout, setCurrentLayout] = useState('d3-force');

  useEffect(() => {
    // Set API endpoint & API key from environment if available
    if (window.env?.API_GATEWAY_ENDPOINT) {
      setApiEndpoint(window.env.API_GATEWAY_ENDPOINT.replace(/^https:\/\//, ''));
    }
    if (window.env?.API_GATEWAY_APIKEY) {
      setApiKey(window.env.API_GATEWAY_APIKEY);
    }
  }, []);

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'upload':
        return (
          <UploadPage
            apiEndpoint={apiEndpoint}
            apiKey={apiKey}
            processingStatus={processingStatus}
            setProcessingStatus={setProcessingStatus}
            processingStatusLoaded={processingStatusLoaded}
            setProcessingStatusLoaded={setProcessingStatusLoaded}
          />
        );
      case 'entities':
        return (
          <EntitiesPage
            apiEndpoint={apiEndpoint}
            apiKey={apiKey}
            entityList={entityList}
            setEntityList={setEntityList}
            filteredEntityList={filteredEntityList}
            setFilteredEntityList={setFilteredEntityList}
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            showInterestedOnly={showInterestedOnly}
            setShowInterestedOnly={setShowInterestedOnly}
            settingsLoaded={settingsLoaded}
            setSettingsLoaded={setSettingsLoaded}
            nHops={nHops}
            setNHops={setNHops}
          />
        );
      case 'news':
        return (
          <NewsPage 
            apiEndpoint={apiEndpoint} 
            apiKey={apiKey}
            news={news}
            setNews={setNews}
            selectedNews={selectedNews}
            setSelectedNews={setSelectedNews}
            selectedPaths={selectedPaths}
            setSelectedPaths={setSelectedPaths}
          />
        );
      case 'relationships':
        return (
          <RelationshipsPage
            apiEndpoint={apiEndpoint}
            apiKey={apiKey}
            graphData={graphData}
            setGraphData={setGraphData}
            searchResults={searchResults}
            setSearchResults={setSearchResults}
            addedEntityIds={addedEntityIds}
            setAddedEntityIds={setAddedEntityIds}
            selectedEntity={selectedEntity}
            setSelectedEntity={setSelectedEntity}
            selectedRelationship={selectedRelationship}
            setSelectedRelationship={setSelectedRelationship}
            currentFilters={currentFilters}
            setCurrentFilters={setCurrentFilters}
            graphLoaded={graphLoaded}
            setGraphLoaded={setGraphLoaded}
            leftDrawerOpen={leftDrawerOpen}
            setLeftDrawerOpen={setLeftDrawerOpen}
            rightDrawerOpen={rightDrawerOpen}
            setRightDrawerOpen={setRightDrawerOpen}
            activeLeftPanel={activeLeftPanel}
            setActiveLeftPanel={setActiveLeftPanel}
            activeRightPanel={activeRightPanel}
            setActiveRightPanel={setActiveRightPanel}
            currentLayout={currentLayout}
            setCurrentLayout={setCurrentLayout}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            apiEndpoint={apiEndpoint}
            setApiEndpoint={setApiEndpoint}
            apiKey={apiKey}
            setApiKey={setApiKey}
            newsApiKey={newsApiKey}
            setNewsApiKey={setNewsApiKey}
          />
        );
      default:
        return <HomePage />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
        {renderCurrentPage()}
      </Layout>
    </ThemeProvider>
  );
}

export default App;