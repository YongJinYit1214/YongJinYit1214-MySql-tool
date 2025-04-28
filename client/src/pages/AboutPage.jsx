import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Avatar,
  Button,
  Link
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GitHubIcon from '@mui/icons-material/GitHub';
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
            </Grid>

            <Grid item xs={12} md={8}>
              <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
                Yong Jin
              </Typography>

              <Typography variant="body1" paragraph sx={{ mb: 3 }}>
                I'm a passionate developer who created this MySQL Visualization Tool to make database management easier and more intuitive.
                This tool allows users to interact with MySQL databases without writing SQL queries, making database operations more accessible to everyone.
              </Typography>

              <Button
                variant="contained"
                color="primary"
                component={Link}
                href="https://github.com/YongJinYit1214"
                target="_blank"
                startIcon={<GitHubIcon />}
              >
                Visit My GitHub
              </Button>
            </Grid>
          </Grid>
        </Paper>

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
