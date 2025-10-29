import React from 'react';
import { Box, Typography, Grid, Button, Container, Card, CardContent, Avatar, Chip, Stepper, Step, StepLabel, StepContent, Paper } from '@mui/material';
import { TrendingUp, Database, Brain, Network, FileText, Settings as SettingsIcon, ArrowRight, CheckCircle, Zap, Shield, Globe, Target, Users, BarChart3, GitBranch } from 'lucide-react';

const HomePage = () => {
  const features = [
    {
      title: 'AI-Powered Analysis',
      description: 'Advanced machine learning algorithms extract entities and relationships from unstructured financial documents.',
      icon: <Brain size={24} />,
      color: '#FF6B6B'
    },
    {
      title: 'Knowledge Graph',
      description: 'Build comprehensive relationship networks to uncover hidden connections across your portfolio.',
      icon: <Network size={24} />,
      color: '#4ECDC4'
    },
    {
      title: 'Real-time Insights',
      description: 'Automatically process news and identify potential impacts on your investment portfolio.',
      icon: <TrendingUp size={24} />,
      color: '#45B7D1'
    }
  ];

  const benefits = [
    'Identify second and third-order market impacts',
    'Automated news processing and analysis',
    'Comprehensive entity relationship mapping',
    'Real-time portfolio risk assessment',
    'Advanced sentiment analysis',
    'Scalable cloud infrastructure'
  ];

  const steps = [
    {
      number: '01',
      title: 'Upload Documents',
      description: 'Upload official reports to build your knowledge graph',
      icon: <FileText size={20} />
    },
    {
      number: '02',
      title: 'Configure Settings',
      description: 'Set up API endpoints and configure entities of interest',
      icon: <SettingsIcon size={20} />
    },
    {
      number: '03',
      title: 'Process News',
      description: 'Download and analyze latest financial news',
      icon: <Database size={20} />
    },
    {
      number: '04',
      title: 'Get Insights',
      description: 'View AI-powered connection analysis and insights',
      icon: <Brain size={20} />
    }
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Chip
            label="Powered by Amazon Bedrock & Neptune"
            sx={{
              mb: 3,
              backgroundColor: '#FFF3E0',
              color: 'primary.main',
              fontWeight: 500
            }}
          />
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              mb: 3,
              background: 'linear-gradient(135deg, #FF9900 0%, #FF6B35 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: { xs: '2.5rem', md: '3.5rem' }
            }}
          >
            Uncover Hidden Financial Connections
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: 'text.secondary',
              mb: 4,
              maxWidth: 600,
              mx: 'auto',
              fontWeight: 400,
              lineHeight: 1.4
            }}
          >
            Advanced AI solution that identifies second and third-order market impacts
            traditional alerts miss
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowRight size={20} />}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1.1rem',
                fontWeight: 600,
                color: 'white'
              }}
              onClick={() => window.open('https://aws.amazon.com/blogs/machine-learning/uncover-hidden-connections-in-unstructured-financial-data-with-amazon-bedrock-and-amazon-neptune/', '_blank')}
            >
              Read Blog
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<GitBranch size={20} />}
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1.1rem',
                fontWeight: 500
              }}
              onClick={() => window.open('https://github.com/aws-samples/uncovering-hidden-connections-in-unstructured-financial-data', '_blank')}
            >
              Git Clone
            </Button>
          </Box>
        </Box>

      </Container>

      {/* Process Flow Section */}
      <Box sx={{ backgroundColor: '#FAFBFC', py: 5 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
              How It Works
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 600, mx: 'auto' }}>
              Follow this simple process to start uncovering hidden connections in your financial data
            </Typography>
          </Box>

          <Card sx={{
            maxWidth: 800,
            mx: 'auto',
            border: '1px solid #E9ECEF',
            borderRadius: 3,
            overflow: 'hidden'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Stepper
                orientation="vertical"
                sx={{
                  '& .MuiStepConnector-line': {
                    borderColor: '#E9ECEF',
                    borderLeftWidth: 2,
                    minHeight: 30
                  },
                  '& .MuiStepLabel-root': {
                    pb: 2
                  }
                }}
              >
                {steps.map((step, index) => (
                  <Step key={index} active={true} completed={false}>
                    <StepLabel
                      StepIconComponent={() => (
                        <Avatar sx={{
                          width: 48,
                          height: 48,
                          backgroundColor: 'primary.main',
                          color: 'white',
                          fontSize: '0.9rem',
                          fontWeight: 600
                        }}>
                          {step.number}
                        </Avatar>
                      )}
                    >
                      <Box sx={{ ml: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {step.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
                          {step.description}
                        </Typography>
                      </Box>
                    </StepLabel>
                    <StepContent>
                      <Box sx={{ ml: 8, pb: 2 }}>
                        <Paper sx={{
                          p: 2,
                          backgroundColor: '#F8F9FA',
                          border: '1px solid #E9ECEF',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2
                        }}>
                          <Box sx={{
                            p: 1,
                            borderRadius: 1,
                            backgroundColor: 'primary.main',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {step.icon}
                          </Box>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                            {index === 0 && "Upload PDF reports to Amazon S3 to build your knowledge graph foundation"}
                            {index === 1 && "Configure API endpoints, keys, and mark entities of interest for tracking"}
                            {index === 2 && "Download real news or generate sample data for analysis and processing"}
                            {index === 3 && "View enriched news with AI-powered insights and connection analysis"}
                          </Typography>
                        </Paper>
                      </Box>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </CardContent>
          </Card>
        </Container>
      </Box>

      {/* Business Use Case Section */}
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
            Business Use Case
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 600, mx: 'auto' }}>
            Designed specifically for asset managers and financial professionals
          </Typography>
        </Box>

        <Card sx={{
          maxWidth: 900,
          mx: 'auto',
          border: '1px solid #E9ECEF',
          borderRadius: 3,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F8F9FA 100%)'
        }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="body1" sx={{
              color: 'text.primary',
              lineHeight: 1.6,
              fontSize: '1rem',
              mb: 3
            }}>
              Asset managers invest in large numbers of companies and need to track news related to those companies
              to stay ahead of market movements and identify investment opportunities.
            </Typography>

            <Typography variant="body1" sx={{
              color: 'text.primary',
              lineHeight: 1.6,
              fontSize: '1rem',
              mb: 3
            }}>
              Traditional keyword-based alerts miss critical connections. News events often don't impact investee
              companies directly, but affect suppliers, customers, or partners in the supply chain.
            </Typography>

            <Typography variant="body1" sx={{
              color: 'text.primary',
              lineHeight: 1.6,
              fontSize: '1rem',
              mb: 4
            }}>
              Our AI-powered solution goes beyond simple keyword-based alerts by identifying second and
              third-order impacts that could have significant financial implications for your investment portfolio.
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Chip
                icon={<Users size={16} />}
                label="Supply Chain Analysis"
                sx={{ backgroundColor: '#E3F2FD', color: '#1976D2' }}
              />
              <Chip
                icon={<Network size={16} />}
                label="Relationship Mapping"
                sx={{ backgroundColor: '#E8F5E8', color: '#388E3C' }}
              />
              <Chip
                icon={<BarChart3 size={16} />}
                label="Impact Assessment"
                sx={{ backgroundColor: '#FFF3E0', color: '#F57C00' }}
              />
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default HomePage;