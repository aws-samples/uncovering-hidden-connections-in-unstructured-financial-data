import axios from 'axios';
import { checkSync } from 'recheck';
import React, { useState, useEffect, useRef } from 'react';
import DirectedGraph from './DirectedGraph';
import { Col, Row, Input, List, Tag, Space, Card, Divider, notification, Drawer, Switch, Empty, Button, Collapse } from 'antd';
import { SettingOutlined, ArrowUpOutlined, ArrowDownOutlined, LoadingOutlined, ExclamationCircleOutlined} from '@ant-design/icons';
import './index.css';

function App() {

  const tagColors = ["magenta", "volcano", "gold", "green", "cyan", "blue", "purple"]

  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [newsApiKey, setNewsApiKey] = useState('');
  const [news, setNews] = useState([]);
  const [selectedNews, setSelectedNews] = useState("");
  const [selectedPaths, setSelectedPaths] = useState([]);
  const [settingClicked, setSettingClicked] = useState(false); 
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [nHops, setNHops] = useState(0); 
  const [entityList, setEntityList] = useState([]);
  const [filteredEntityList, setFilteredEntityList] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [isClickedGeneratingNews, setIsClickedGeneratingNews] = useState(false);
  const [isClickedDownloadingNews, setIsClickedDownloadingNews] = useState(false);
  const [isClickedReprocessNews, setIsClickedReprocessNews] = useState(false);
  const [isLoadingSettingsData, setIsLoadingSettingsData] = useState(false);
  const [showInterestedOnly, setShowInterestedOnly] = useState(false);
  const graphRef = useRef();

  useEffect(() => { // set API endpoint & API key from environment
    setApiEndpoint(window.env.API_GATEWAY_ENDPOINT.replace(/^https:\/\//, ''))
    setApiKey(window.env.API_GATEWAY_APIKEY)
  }, []);

  useEffect(() => { // refresh settings
    loadSettingsData();
  }, [apiEndpoint, apiKey]);

  // refresh news data every 1 second
  useEffect(() => {
    getData();
    const intervalId = setInterval(() => {
      getData();
    }, 1000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line
  }, [apiEndpoint, apiKey]);

  const headers = { headers: { 'x-api-key': apiKey } }

  // Re-process news
  const reprocessNews = async () => {
    if (!apiEndpoint || !apiKey) {      
      notification.error({
        placement: 'bottomRight',
        message: 'API Endpoint or API Key is missing or empty.',
        duration: 5,
        icon: <ExclamationCircleOutlined style={{ color: 'red' }}/>
      });
    } else {
      try {
        axios.get(`https://${apiEndpoint}/reprocessnews`, headers);
        notification.success({
          placement: 'bottomRight',
          message: 'Reprocessing enriched news',
          description: 'News reprocessing in progress.. Enriched news will be displayed as it gets updated.',
          duration: 10,
        });
        setIsClickedReprocessNews(true);
        setTimeout(() => {
          setIsClickedReprocessNews(false)
        }, 10000) //10 seconds
      } catch (error) {
        notification.error({
          placement: 'bottomRight',
          message: 'Error reprocessing news',
          description: 'Error reprocessing news',
          duration: 5,
        });
      }
    }    
  }

  // Load news data 
  const getData = async () => {
    try {
      if (apiEndpoint.trim() !== "" && apiKey.trim() !== "") {
        try{
          const newsData = await axios.get(`https://${apiEndpoint}/news`, headers);
          const sortedNews = newsData.data.sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
          });
          setNews (sortedNews);      
  
        } catch (error) {
          console.error('Error fetching data:', error);
        } finally {
        }
      }   
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  // Handle INTERESTED switch toggling - YES/NO
  const handleEntitySwitchChange = (ID, INTERESTED) => {
    const updatedEntityList = entityList.map((entity) =>
      entity.ID === ID ? { ...entity, INTERESTED: entity.INTERESTED === 'YES' ? 'NO' : 'YES' } : entity
    );
    setEntityList(updatedEntityList);

    const updatedFilteredEntityList = filteredEntityList.map((entity) =>
      entity.ID === ID ? { ...entity, INTERESTED: entity.INTERESTED === 'YES' ? 'NO' : 'YES' } : entity
    );
    setFilteredEntityList(updatedFilteredEntityList);

    axios.post(`https://${apiEndpoint}/entity`,
      {"ID": ID, "INTERESTED": INTERESTED ? "YES" : "NO"}, 
      headers
    )
  };

  // Handle search / filtering of entity list
  const handleSearch = (value) => {
    setSearchInput(value);
    const filteredEntityList = entityList.filter((entity) =>
      entity.NAME.toLowerCase().includes(value.toLowerCase())
    );
    filteredEntityList.sort((a, b) => a.NAME.localeCompare(b.NAME));
    setFilteredEntityList(filteredEntityList);
  };

  // Handle selecting of news 
  const handleNewsClick = (item) => {
    setSelectedNews(item);
    const paths = [];
    for (let i = 0; i < item.paths.length; i++) { // for each news entity
      for (let x =0; x < item.paths[i].paths.length; x++) { // for each path within the news entity
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

  // Refreshing of settings data
  const loadSettingsData = async () => {
    setIsLoadingSettingsData(true)

    try {
      if (apiEndpoint.trim() !== "" && apiKey.trim() !== "") {
        // Fetch N data
        const nData = await axios.get(`https://${apiEndpoint}/n`, headers);
        setNHops (nData.data["N"]);
  
        // Fetch entity data
        const entityData = await axios.get(`https://${apiEndpoint}/entity`, headers);
        setEntityList (entityData.data);
        setFilteredEntityList(() => {
          const sortedFilteredEntityList = [...entityData.data]; 
          sortedFilteredEntityList.sort((a, b) => a.NAME.localeCompare(b.NAME)); 
          return sortedFilteredEntityList; 
        });
        setShowInterestedOnly(false);
        setSearchInput("");
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }    
    setIsLoadingSettingsData(false)
  }

  // To show the drawer
  const handleSettingClick = async () => {
    try{
      // To change the style of the gear settings icon
      setSettingClicked(true);
      setTimeout(() => {
        setSettingClicked(false);
      }, 100); // in milliseconds
      
      setDrawerVisible(true);

    } catch (error) {
      console.error('Error fetching data:', error);
    }    
  };

  // To hide the drawer
  const handleDrawerClose = () => {
    setDrawerVisible(false);
  };

  // To handle changing the N value
  const handleNHopsChange = async (value) => {
    // Validate and set the N Hops value
    const intValue = parseInt(value, 10);
    if (!isNaN(intValue)) {
      setNHops(intValue);
      await axios.post(
        `https://${apiEndpoint}/n`, 
        {"N": intValue},
        headers
      );
    }
  };

  // To find the index of path to determine tag color to use when displaying news
  function findIndexByName(paths, nameToFind) {
    return paths.findIndex(path => path.name.toLowerCase() === nameToFind.toLowerCase());
  }  

  const handleGenerateNews = async () => {
    
    if (!apiEndpoint || !apiKey) {      
      notification.error({
        placement: 'bottomRight',
        message: 'API Endpoint or API Key is missing or empty.',
        duration: 5,
        icon: <ExclamationCircleOutlined style={{ color: 'red' }}/>
      });
      return;
    }

    // Show reloading notification
    notification.open({
      placement: 'bottomRight',
      message: 'Give me a minute, I\'m about to unleash my inner fiction novelist on financial news. Get ready for headlines so wild, even Wall Street will ask for a reality check!',
      duration: 30,
      icon: <LoadingOutlined spin style={{ color: 'orange' }}/>
    });

    setIsClickedGeneratingNews(true);
    await axios.get(`https://${apiEndpoint}/generateNews`, headers);
    setTimeout(() => {
      setIsClickedGeneratingNews(false)
    }, 10000) //10 seconds
  };

  const handleDownloadNews = async () => {
    
    if (!apiEndpoint || !apiKey || !newsApiKey) {
      notification.error({
        placement: 'bottomRight',
        message: 'API Endpoint, API Key, or NewsAPI Key is missing or empty.',
        duration: 5,
        icon: <ExclamationCircleOutlined style={{ color: 'red' }}/>
      });
      return;
    }

    // Show reloading notification
    notification.open({
      placement: 'bottomRight',
      message: 'I\'ll be with you in a minute, just downloading some news. Hopefully, it\'s not old by the time it\'s done!',
      duration: 30,
      icon: <LoadingOutlined spin style={{ color: 'orange' }}/>
    });

    setIsClickedDownloadingNews(true);
    await axios.get(`https://${apiEndpoint}/downloadNews?newsapikey=${newsApiKey}`, headers);
    setTimeout(() => {
      setIsClickedDownloadingNews(false)
    }, 10000) //10 seconds
  };

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  
  const handleShowInterestedOnly = (INTERESTED) => {
    setShowInterestedOnly(INTERESTED);
    if (INTERESTED) {
      const filteredEntityList = entityList.filter((entity) =>
        entity.INTERESTED === 'YES'
      );
      filteredEntityList.sort((a, b) => a.NAME.localeCompare(b.NAME));
      setFilteredEntityList(filteredEntityList);
    } else {
      const filteredEntityList = entityList;
      filteredEntityList.sort((a, b) => a.NAME.localeCompare(b.NAME));
      setFilteredEntityList(entityList)
    }
  }
  
  return (
    <>
      <Row style={{ backgroundColor: 'orange', padding: '10px' }}>
        <Col span={12} style={{ color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', fontSize: '18px' }}>
          ConnectionsInsights - Demo
        </Col>
        <Col span={12} style={{ textAlign: 'right'  }}>   
          <Space>
            <Button type="primary" style={{ backgroundColor: '#FF9900', borderColor: 'white' }} onClick={handleDownloadNews} disabled={isClickedDownloadingNews}>
              {
                isClickedDownloadingNews ? <Space>Request Sent <LoadingOutlined spin/></Space> : 
                <div style={{ fontWeight: 'bold', color: 'white' }}>Download Latest News</div>
              }
            </Button>
            <Button type="primary" style={{ backgroundColor: 'white', borderColor: 'white' }} onClick={handleGenerateNews} disabled={isClickedGeneratingNews}>
              {
                isClickedGeneratingNews ? <Space>Request Sent <LoadingOutlined spin/></Space> : 
                <div style={{ fontWeight: 'bold', color: 'orange' }}>Generate Sample News</div>
              }
            </Button>
            <SettingOutlined style={{ 
              fontSize: '30px',
              color: settingClicked ? 'orange' : 'black', 
              }} 
              onClick={handleSettingClick} />
            </Space>
        </Col>
      </Row>
      <Row>
        <Col span={8} style={{ padding: '10px', borderRight: '1px solid #ccc' }}>
          <List
            header={
              <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 'bold', fontSize: 18 }}>List of News</div>
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
      <Drawer
        title={
          <Row>
            <Col span={12} >
              Settings
            </Col>
            <Col span={12} style={{ textAlign: 'right' }}>
              <Space>
                <Button type="primary" style={{ backgroundColor: 'orange', borderColor: 'orange' }} onClick={reprocessNews} disabled={isClickedReprocessNews}>
                  {
                    isClickedReprocessNews ? <Space>Reprocessing <LoadingOutlined spin/></Space> : 
                    <div style={{ fontWeight: 'bold', color: 'white' }}>Re-process News</div>
                  }
                </Button>
                <Button type="primary" style={{ backgroundColor: 'orange', borderColor: 'orange' }} onClick={loadSettingsData} disabled={isLoadingSettingsData}>
                  {
                    isLoadingSettingsData ? <Space>Refreshing <LoadingOutlined spin/></Space> : 
                    <div style={{ fontWeight: 'bold', color: 'white' }}>Refresh Settings</div>
                  }
                </Button>
              </Space>
            </Col>
          </Row>
        }
        placement="right"
        closable={true}
        onClose={handleDrawerClose}
        open={drawerVisible}
        width={1000}
      >
        <>
          
          <Row style={{ padding: 10 }}>
            <Col span={4} style={{display: 'flex', alignItems: 'center'}} >
              <Space>API Endpoint: <a href="https://console.aws.amazon.com/cloudformation/home" rel="noreferrer" target="_blank">(link)</a></Space>
            </Col>  
            <Col >
              <Input 
                size="large" 
                placeholder="xxxxxxx.execute-api.<region>.amazonaws.com/<stage>" 
                addonBefore="https://" 
                style={{ width: 600 }} 
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value.startsWith("https://") ? e.target.value.slice(8) : e.target.value )}
              />
            </Col>           
          </Row>
          <Row style={{ padding: 10 }}>
            <Col span={4} style={{display: 'flex', alignItems: 'center'}}>
              <Space>API Key: <a href="https://console.aws.amazon.com/apigateway/main/api-keys" rel="noreferrer" target="_blank">(link)</a></Space>
            </Col>  
            <Col style={{display: 'flex', alignItems: 'center'}} >
              <Input 
                size="large" 
                placeholder="api key" 
                style={{ width: 600 }} 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </Col>
          </Row>
          <Row style={{ padding: 10 }}>
            <Col span={4} style={{display: 'flex', alignItems: 'center'}}>
              <Space>News API Key: <a href="https://newsapi.org/" rel="noreferrer" target="_blank">(link)</a></Space>
            </Col>  
            <Col style={{display: 'flex', alignItems: 'center'}} >
              <Input 
                size="large" 
                placeholder="api key from https://newsapi.org/" 
                style={{ width: 600 }} 
                value={newsApiKey}
                onChange={(e) => setNewsApiKey(e.target.value)}
              />
            </Col>
          </Row>
          <Row style={{ padding: 10 }}>
            <Col span={4} style={{display: 'flex', alignItems: 'center'}}>
              N Hops:
            </Col>  
            <Col style={{display: 'flex', alignItems: 'center'}} >
              <Input
                type="number"
                value={nHops}
                onChange={(e) => handleNHopsChange(e.target.value)}
                style={{ width: 100 }} 
              />  
            </Col>           
          </Row>
          <Row style={{ padding: 10 }}>
            <Col span={4} style={{display: 'flex', alignItems: 'center'}}>
              Search Entities:
            </Col>  
            <Col style={{display: 'flex', alignItems: 'center'}} >
                <Input.Search
                  value={searchInput}
                  onChange={(e) => handleSearch(e.target.value)}
                  style={{ width: 600 }}
                />
            </Col>           
          </Row>
          <Row style={{ padding: 10 }}>
            <Col span={4} style={{display: 'flex', alignItems: 'center'}}>
              Show Interested Only:
            </Col>  
            <Col style={{display: 'flex', alignItems: 'center'}} >
              <Switch
                checked={showInterestedOnly}
                onChange={(INTERESTED) => handleShowInterestedOnly(INTERESTED)}
              />
            </Col>           
          </Row>
          <Row style={{ padding: 10 }}>
            <Col span={24} style={{display: 'flex', alignItems: 'center'}}>
            <List
              header={<div style={{ fontWeight: 'bold', fontSize: 20 }}>List of Entities (COMPANY/PERSON)</div>}
              itemLayout="vertical"
              pagination={{
                pageSize: 10,
                position: 'both'
              }}
              dataSource={filteredEntityList}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.NAME + " :" + item.LABEL}
                    description={
                      <Space>
                        Interested:
                        <Switch
                          checked={item.INTERESTED === 'YES'}
                          onChange={(INTERESTED) => handleEntitySwitchChange(item.ID, INTERESTED)}
                        />
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
            </Col>            
          </Row>          
        </>
      </Drawer>
    </>
  );
}

export default App;
