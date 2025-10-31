import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { checkSync } from 'recheck';
import DirectedGraph from '../DirectedGraph';

import { Col, Row, List, Tag, Space, Card, Divider, Empty, Collapse, Spin, Button, Switch } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, LoadingOutlined, ReloadOutlined } from '@ant-design/icons';
import { Box, Typography, Snackbar, Alert } from '@mui/material';
import { RefreshCw } from 'lucide-react';

const NewsPage = ({ 
  apiEndpoint, 
  apiKey, 
  news, 
  setNews, 
  selectedNews, 
  setSelectedNews, 
  selectedPaths, 
  setSelectedPaths 
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showInterestedOnly, setShowInterestedOnly] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  const tagColors = ["magenta", "volcano", "gold", "green", "cyan", "blue", "purple"];

  useEffect(() => {
    // Only fetch data if we don't have any news yet and have valid credentials
    if (news.length === 0 && apiEndpoint.trim() && apiKey.trim()) {
      getData();
    }
  }, [apiEndpoint, apiKey, news.length]);

  const headers = { headers: { 'x-api-key': apiKey } };

  const getData = async (retryCount = 0) => {
    try {
      if (apiEndpoint.trim() !== "" && apiKey.trim() !== "") {
        setIsRefreshing(true);

        
        const newsData = await axios.get(`https://${apiEndpoint}/news`, {
          ...headers,
          timeout: 30000 // Increased to 30 seconds
        });
        

        
        const sortedNews = newsData.data.sort((a, b) => {
          return new Date(b.date) - new Date(a.date);
        });
        setNews(sortedNews);
      } else {

      }
    } catch (error) {

      
      if (error.code === 'ECONNABORTED') {

        
        // Retry once if it's the first attempt
        if (retryCount === 0) {

          setTimeout(() => getData(1), 2000); // Retry after 2 seconds
          return; // Don't set isRefreshing to false yet
        }
      } else if (error.response) {

      } else if (error.request) {

      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    getData();
  };

  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  const handleReprocessNews = async (newsId) => {
    try {
      setIsReprocessing(true);
      
      // Clear the selected news content immediately
      setSelectedNews("");
      setSelectedPaths([]);
      
      await axios.get(`https://${apiEndpoint}/reprocessnews?id=${newsId}`, {
        ...headers,
        timeout: 30000
      });
      
      showNotification('News article submitted for reprocessing successfully!', 'success');
      
      // Refresh the news list after a delay
      setTimeout(() => {
        getData();
      }, 2000);
    } catch (error) {
      console.error('Error reprocessing news:', error);
      showNotification('Error submitting news for reprocessing', 'error');
    } finally {
      setIsReprocessing(false);
    }
  };

  // Filter news based on toggle
  const filteredNews = showInterestedOnly 
    ? news.filter(item => item.interested === "YES")
    : news;

  const handleNewsClick = (item) => {
    setSelectedNews(item);
    const paths = [];
    for (let i = 0; i < item.paths.length; i++) {
      for (let x = 0; x < item.paths[i].paths.length; x++) {
        paths.push({
          label: <>
            <Tag color={tagColors[i % tagColors.length]}>{item.paths[i].name}{item.paths[i].sentiment === "POSITIVE" ? <ArrowUpOutlined />: item.paths[i].sentiment === "NEGATIVE" ? <ArrowDownOutlined /> : <></>}</Tag>&nbsp;&nbsp;-&nbsp;&nbsp; 
            Impacted Entity: <strong>{item.paths[i].paths[x].interested_entity}</strong>&nbsp;&nbsp;-&nbsp;&nbsp; 
            <font color={item.paths[i].paths[x].impact === "POSITIVE" ? "GREEN" : item.paths[i].paths[x].impact === "NEGATIVE" ? "RED" : "BLACK" }><strong>{item.paths[i].paths[x].impact}</strong></font>
          </>,
          children: <>
          <div dangerouslySetInnerHTML={{__html: item.paths[i].paths[x].assessment}}></div><br/><br/>
          <strong>Connection Path:</strong> <i>{item.paths[i].paths[x].path}</i>
          <p/>
          <DirectedGraph data={{
            nodes: item.paths[i].paths[x].nodes,
            links: item.paths[i].paths[x].edges
          }} />
          </>
        }); 
      }
    }
    setSelectedPaths(paths);
  };

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function findIndexByName(paths, nameToFind) {
    return paths.findIndex(path => path.name.toLowerCase() === nameToFind.toLowerCase());
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 2 }}>
        News Analysis
      </Typography>
      <Row>
        <Col span={8} style={{ padding: '10px', borderRight: '1px solid #ccc' }}>
          <List
            header={
              <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: 18 }}>
                    List of News
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Switch
                      checked={showInterestedOnly}
                      onChange={setShowInterestedOnly}
                      size="small"
                    />
                    <span style={{ 
                      fontSize: '14px', 
                      color: '#666',
                      fontWeight: 500
                    }}>
                      {showInterestedOnly ? 'Show interested only' : 'Show all news'}
                    </span>
                  </div>
                </div>
                <Button
                  type="primary"
                  size="large"
                  icon={isRefreshing ? <LoadingOutlined spin /> : <ReloadOutlined />}
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  style={{ 
                    backgroundColor: '#FF9900', 
                    borderColor: '#FF9900',
                    color: 'white',
                    fontWeight: 500,
                    borderRadius: '4px',
                    boxShadow: '0px 3px 1px -2px rgba(0,0,0,0.2), 0px 2px 2px 0px rgba(0,0,0,0.14), 0px 1px 5px 0px rgba(0,0,0,0.12)',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    paddingLeft: '20px',
                    paddingRight: '20px',
                    height: '40px'
                  }}
                >
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            }
            itemLayout="vertical"
            pagination={{
              pageSize: 6
            }}      
            dataSource={filteredNews}
            renderItem={(item, index) => (
              <List.Item onClick={() => handleNewsClick(item)} style={{ cursor: 'pointer' }}>
                <List.Item.Meta
                  title={<><Space>{item.title.length > 30 ? item.title.slice(0, 30) + '...' : item.title}{item.interested === "YES" ? <Tag color="orange" style= {{ fontWeight: 'bold' }}>INTERESTED</Tag> : ''}</Space></>}
                />
                  <b>{item.date} - </b>{item.text.length > 100 ? item.text.slice(0, 100) + '...' : item.text}
              </List.Item>
            )}
          />
        </Col>
        <Col span={16} style={{ padding: '10px' }}>
         { selectedNews === "" ? <div style={{ textAlign: 'center', padding: '20px' }}>Select a news item from the left list to view the details.<br/><br/><Empty/></div> : 
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  {selectedNews.title}
                  {selectedNews.interested === "YES" ? <Tag color="orange" style={{ fontWeight: 'bold' }}>INTERESTED</Tag> : ''}
                </Space>
                <Button
                  type="primary"
                  size="large"
                  icon={isReprocessing ? <LoadingOutlined spin /> : <RefreshCw size={16} />}
                  onClick={() => handleReprocessNews(selectedNews.id)}
                  disabled={isReprocessing}
                  style={{ 
                    backgroundColor: '#FF9900', 
                    borderColor: '#FF9900',
                    color: 'white',
                    fontWeight: 500,
                    borderRadius: '4px',
                    boxShadow: '0px 3px 1px -2px rgba(0,0,0,0.2), 0px 2px 2px 0px rgba(0,0,0,0.14), 0px 1px 5px 0px rgba(0,0,0,0.12)',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    paddingLeft: '20px',
                    paddingRight: '20px',
                    height: '40px'
                  }}
                >
                  {isReprocessing ? 'Re-processing...' : 'Re-process'}
                </Button>
              </div>
            } 
            style={{ height: '100%' }}>
            <b>{selectedNews.date} - </b>
            {
              checkSync(`(${selectedNews.paths.map(path => escapeRegExp(path.name)).join('|')})`, 'ig').status === 'safe' ?
              selectedNews.text.split(new RegExp(`(${selectedNews.paths.map(path => escapeRegExp(path.name)).join('|')})`, 'ig')).map(
                (part, index) => {
                  const matchingPath = selectedNews.paths.find(path => part.toLowerCase() === path.name.toLowerCase());
                  return matchingPath ? <Tag key={index} color={tagColors[findIndexByName(selectedNews.paths, matchingPath.name) % tagColors.length]}>{matchingPath.name}{matchingPath.sentiment === "POSITIVE" ? <ArrowUpOutlined />: matchingPath.sentiment === "NEGATIVE" ? <ArrowDownOutlined /> : <></>}</Tag> : part;
                }
              )
              : ''            
            }
            <Divider />
            <Collapse items={selectedPaths} /><br/>
            <i>
              <Space>* <ArrowUpOutlined /> indicates positive sentiment.<ArrowDownOutlined /> indicates negative sentiment.</Space>
            </i>
          </Card>
          }
        </Col>
      </Row>

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

export default NewsPage;