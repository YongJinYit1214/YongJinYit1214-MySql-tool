import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Avatar,
  Divider,
  Link,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import EmailIcon from '@mui/icons-material/Email';
import CodeIcon from '@mui/icons-material/Code';
import SchoolIcon from '@mui/icons-material/School';
import WorkIcon from '@mui/icons-material/Work';
import { useNavigate } from 'react-router-dom';

const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundColor: '#121212',
      color: '#ffffff',
      py: 4
    }}>
      <Container maxWidth="md">
        <Button
          variant="outlined"
          color="primary"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ mb: 4 }}
        >
          Back to Application
        </Button>

        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            borderRadius: 2,
            backgroundColor: '#1a1a1a',
            color: '#ffffff',
            mb: 4
          }}
        >
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
              <Avatar
                alt="Yong Jin"
                src="/profile-image.jpg"
                sx={{ 
                  width: 200, 
                  height: 200, 
                  mx: 'auto',
                  border: '4px solid #3b82f6'
                }}
              />
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
                <IconButton 
                  component={Link} 
                  href="https://github.com/YongJinYit1214" 
                  target="_blank"
                  sx={{ color: '#ffffff' }}
                >
                  <GitHubIcon fontSize="large" />
                </IconButton>
                <IconButton 
                  component={Link} 
                  href="https://linkedin.com/in/yongjin" 
                  target="_blank"
                  sx={{ color: '#0a66c2' }}
                >
                  <LinkedInIcon fontSize="large" />
                </IconButton>
                <IconButton 
                  component={Link} 
                  href="mailto:yongjin@example.com"
                  sx={{ color: '#ea4335' }}
                >
                  <EmailIcon fontSize="large" />
                </IconButton>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={8}>
              <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
                Yong Jin
              </Typography>
              
              <Typography variant="h5" color="primary" gutterBottom>
                Full Stack Developer
              </Typography>
              
              <Typography variant="body1" paragraph sx={{ mb: 3 }}>
                I'm a passionate full-stack developer with expertise in building modern web applications.
                I specialize in JavaScript/TypeScript, React, Node.js, and database technologies like MySQL and MongoDB.
                I enjoy creating intuitive user interfaces and robust backend systems.
              </Typography>
              
              <Button 
                variant="contained" 
                color="primary"
                component={Link}
                href="/resume.pdf"
                target="_blank"
                sx={{ mr: 2 }}
              >
                Download Resume
              </Button>
              
              <Button 
                variant="outlined" 
                color="primary"
                component={Link}
                href="mailto:yongjin@example.com"
              >
                Contact Me
              </Button>
            </Grid>
          </Grid>
        </Paper>
        
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                height: '100%',
                borderRadius: 2,
                backgroundColor: '#1a1a1a',
                color: '#ffffff'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CodeIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
                <Typography variant="h5" component="h2">
                  Skills
                </Typography>
              </Box>
              
              <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" fontWeight={600} color="primary" gutterBottom>
                    Frontend
                  </Typography>
                  <List dense>
                    <ListItem disableGutters>
                      <ListItemText primary="React / React Native" />
                    </ListItem>
                    <ListItem disableGutters>
                      <ListItemText primary="JavaScript / TypeScript" />
                    </ListItem>
                    <ListItem disableGutters>
                      <ListItemText primary="HTML5 / CSS3" />
                    </ListItem>
                    <ListItem disableGutters>
                      <ListItemText primary="Material UI / Tailwind CSS" />
                    </ListItem>
                  </List>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="subtitle1" fontWeight={600} color="primary" gutterBottom>
                    Backend
                  </Typography>
                  <List dense>
                    <ListItem disableGutters>
                      <ListItemText primary="Node.js / Express" />
                    </ListItem>
                    <ListItem disableGutters>
                      <ListItemText primary="MySQL / MongoDB" />
                    </ListItem>
                    <ListItem disableGutters>
                      <ListItemText primary="RESTful APIs" />
                    </ListItem>
                    <ListItem disableGutters>
                      <ListItemText primary="Firebase / AWS" />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                height: '100%',
                borderRadius: 2,
                backgroundColor: '#1a1a1a',
                color: '#ffffff'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WorkIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
                <Typography variant="h5" component="h2">
                  Projects
                </Typography>
              </Box>
              
              <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
              
              <List>
                <ListItem disableGutters>
                  <ListItemText 
                    primary="MySQL Visualization Tool" 
                    secondary={
                      <Typography variant="body2" color="text.secondary" sx={{ color: '#cbd5e1' }}>
                        A modern, user-friendly MySQL database visualization and management tool.
                      </Typography>
                    }
                  />
                </ListItem>
                
                <ListItem disableGutters>
                  <ListItemText 
                    primary="E-commerce Platform" 
                    secondary={
                      <Typography variant="body2" color="text.secondary" sx={{ color: '#cbd5e1' }}>
                        Full-stack e-commerce application with payment integration.
                      </Typography>
                    }
                  />
                </ListItem>
                
                <ListItem disableGutters>
                  <ListItemText 
                    primary="Task Management System" 
                    secondary={
                      <Typography variant="body2" color="text.secondary" sx={{ color: '#cbd5e1' }}>
                        Collaborative task management application with real-time updates.
                      </Typography>
                    }
                  />
                </ListItem>
              </List>
              
              <Button 
                variant="outlined" 
                color="primary"
                component={Link}
                href="https://github.com/YongJinYit1214"
                target="_blank"
                startIcon={<GitHubIcon />}
                sx={{ mt: 2 }}
              >
                More Projects on GitHub
              </Button>
            </Paper>
          </Grid>
          
          <Grid item xs={12}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3,
                borderRadius: 2,
                backgroundColor: '#1a1a1a',
                color: '#ffffff'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SchoolIcon color="primary" sx={{ mr: 1, fontSize: 28 }} />
                <Typography variant="h5" component="h2">
                  Education & Experience
                </Typography>
              </Box>
              
              <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
              
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight={600} color="primary" gutterBottom>
                    Education
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body1" fontWeight={500}>
                      Bachelor of Computer Science
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ color: '#cbd5e1' }}>
                      University of Technology, 2018-2022
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body1" fontWeight={500}>
                      Web Development Bootcamp
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ color: '#cbd5e1' }}>
                      Code Academy, 2022
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" fontWeight={600} color="primary" gutterBottom>
                    Experience
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body1" fontWeight={500}>
                      Full Stack Developer
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ color: '#cbd5e1' }}>
                      Tech Solutions Inc., 2022-Present
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body1" fontWeight={500}>
                      Frontend Developer Intern
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ color: '#cbd5e1' }}>
                      Web Innovations, 2021-2022
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ color: '#cbd5e1' }}>
            © {new Date().getFullYear()} Yong Jin. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default AboutPage;
