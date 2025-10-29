import React, { useState } from 'react';
import { Box, Drawer, AppBar, Toolbar, Typography, IconButton, List, ListItem, ListItemIcon, ListItemText, useTheme, useMediaQuery, Tooltip } from '@mui/material';
import { Menu as MenuIcon, Home, Newspaper, Settings, Network } from 'lucide-react';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';

const drawerWidthExpanded = 240;
const drawerWidthCollapsed = 64;

const Layout = ({ children, currentPage, onPageChange }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [desktopExpanded, setDesktopExpanded] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setDesktopOpen(!desktopOpen);
    }
  };

  const handleDrawerExpand = () => {
    setDesktopExpanded(!desktopExpanded);
  };

  const menuItems = [
    { id: 'home', label: 'Home', icon: <Home size={20} /> },
    { id: 'relationships', label: 'Relationships', icon: <Network size={20} /> },
    { id: 'news', label: 'News', icon: <Newspaper size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  const drawerWidth = desktopExpanded ? drawerWidthExpanded : drawerWidthCollapsed;

  const drawer = (isCollapsed = false) => (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'primary.main'
    }}>
      {/* Collapse/Expand button for desktop */}
      {!isMobile && (
        <Box sx={{ 
          p: 1, 
          display: 'flex', 
          justifyContent: isCollapsed ? 'center' : 'flex-end',
          borderBottom: '1px solid rgba(255,255,255,0.2)'
        }}>
          <IconButton 
            onClick={handleDrawerExpand} 
            size="small"
            sx={{ 
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            {desktopExpanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </IconButton>
        </Box>
      )}
      
      <List sx={{ flexGrow: 1, pt: 1, px: isCollapsed ? 0.5 : 1 }}>
        {menuItems.map((item) => (
          <Tooltip 
            key={item.id}
            title={isCollapsed ? item.label : ''}
            placement="right"
            arrow
          >
            <ListItem
              onClick={() => onPageChange(item.id)}
              sx={{
                cursor: 'pointer',
                borderRadius: 1,
                mb: 0.5,
                py: 1.5,
                px: isCollapsed ? 1 : 1.5,
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                backgroundColor: currentPage === item.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                color: 'white',
                '&:hover': {
                  backgroundColor: currentPage === item.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                },
              }}
            >
              <ListItemIcon sx={{ 
                color: 'white',
                minWidth: isCollapsed ? 'auto' : 36,
                justifyContent: 'center'
              }}>
                {item.icon}
              </ListItemIcon>
              {!isCollapsed && (
                <ListItemText 
                  primary={item.label} 
                  sx={{ 
                    '& .MuiListItemText-primary': { 
                      fontWeight: currentPage === item.id ? 600 : 400,
                      fontSize: '0.9rem',
                      color: 'white'
                    } 
                  }} 
                />
              )}
            </ListItem>
          </Tooltip>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: desktopOpen ? `calc(100% - ${drawerWidth}px)` : '100%' },
          ml: { md: desktopOpen ? `${drawerWidth}px` : 0 },
          backgroundColor: 'primary.main',
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Toolbar sx={{ minHeight: '56px !important' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: desktopOpen ? 'none' : 'block' } }}
          >
            <MenuIcon size={20} />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ 
            fontWeight: 600, 
            fontSize: '1.1rem',
            color: 'white'
          }}>
            ConnectionsInsights - Demo
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: desktopOpen ? drawerWidth : 0 }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidthExpanded,
              backgroundColor: 'primary.main'
            },
          }}
        >
          {drawer(false)}
        </Drawer>
        <Drawer
          variant="persistent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              border: 'none',
              boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
              backgroundColor: 'primary.main',
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            },
          }}
          open={desktopOpen}
        >
          {drawer(!desktopExpanded)}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: desktopOpen ? `calc(100% - ${drawerWidth}px)` : '100%' },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Toolbar />
        <Box sx={{ p: 2.5, height: 'calc(100vh - 56px)', overflow: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;