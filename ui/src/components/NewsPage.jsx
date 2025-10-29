import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { checkSync } from 'recheck';
import DirectedGraph from '../DirectedGraph';
import { Col, Row, List, Tag, Space, Card, Divider, Empty, Collapse, Spin, Button } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, LoadingOutlined, ReloadOutlined } from '@ant-design/icons';

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
        console.log(`Fetching news from: https://${apiEndpoint}/news`);
        console.log('API Key present:', apiKey ? 'Yes' : 'No');
        console.log('API Key length:', apiKey?.length || 0);
        
        const newsData = await axios.get(`https://${apiEndpoint}/news`, {
          ...headers,
          timeout: 30000 // Increased to 30 seconds
        });
        
        console.log('News data received:', newsData.data?.length || 0, 'items');
        
        const sortedNews = newsData.data.sort((a, b) => {
          return new Date(b.date) - new Date(a.date);
        });
        setNews(sortedNews);
      } else {
        console.warn('API Endpoint or API Key is missing');
        console.log('API Endpoint:', apiEndpoint);
        console.log('API Key present:', apiKey ? 'Yes' : 'No');
      }
    } catch (error) {
      console.error('Error fetching news:', error);
      
      if (error.code === 'ECONNABORTED') {
        console.error('Request timed out after 30 seconds');
        
        // Retry once if it's the first attempt
        if (retryCount === 0) {
          console.log('Retrying request...');
          setTimeout(() => getData(1), 2000); // Retry after 2 seconds
          return; // Don't set isRefreshing to false yet
        }
      } else if (error.response) {
        console.error('API Error:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('Network Error: No response received');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    getData();
  };

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
    <>
      <Row>
        <Col span={8} style={{ padding: '10px', borderRight: '1px solid #ccc' }}>
          <List
            header={
              <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 'bold', fontSize: 18 }}>
                  List of News
                </div>
                <Button
                  type="primary"
                  size="small"
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
                    paddingTop: '8px',
                    paddingBottom: '8px',
                    paddingLeft: '16px',
                    paddingRight: '16px'
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
            dataSource={news}
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
          <Card title={<><Space>{selectedNews.title}{selectedNews.interested === "YES" ? <Tag color="orange" style= {{ fontWeight: 'bold' }}>INTERESTED</Tag> : ''}</Space></>} style={{ height: '100%' }}>
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
    </>
  );
};

export default NewsPage;