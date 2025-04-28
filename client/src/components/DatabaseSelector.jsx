import { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { getDatabases, useDatabase } from '../services/api';

const DatabaseSelector = ({ onDatabaseSelected }) => {
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDatabases();
  }, []);

  const fetchDatabases = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDatabases();
      setDatabases(data);
    } catch (err) {
      console.error('Error fetching databases:', err);
      setError('Failed to fetch databases. Please check your MySQL connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleDatabaseChange = (event) => {
    setSelectedDatabase(event.target.value);
  };

  const handleConnect = async () => {
    if (!selectedDatabase) return;

    setLoading(true);
    setError(null);
    try {
      await useDatabase(selectedDatabase);
      onDatabaseSelected(selectedDatabase);
    } catch (err) {
      console.error('Error connecting to database:', err);
      setError(`Failed to connect to database: ${selectedDatabase}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 4 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Select MySQL Database
      </Typography>

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)'
          }}
          variant="filled"
        >
          {error}
        </Alert>
      )}

      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: 'center',
        gap: 2
      }}>
        <FormControl
          fullWidth
          sx={{
            minWidth: { xs: '100%', md: 400 },
            '& .MuiOutlinedInput-root': {
              borderRadius: 2
            }
          }}
        >
          <InputLabel>Database</InputLabel>
          <Select
            value={selectedDatabase}
            label="Database"
            onChange={handleDatabaseChange}
            disabled={loading}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 300,
                  width: 'auto',
                  minWidth: 400
                }
              }
            }}
          >
            {databases.map((db) => (
              <MenuItem key={db} value={db}>
                {db}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{
          display: 'flex',
          gap: 2,
          width: { xs: '100%', md: 'auto' }
        }}>
          <Button
            variant="contained"
            onClick={handleConnect}
            disabled={!selectedDatabase || loading}
            sx={{
              minWidth: 120,
              borderRadius: 2,
              py: 1,
              fontWeight: 600,
              boxShadow: 'none',
              flex: { xs: 1, md: 'none' },
              '&:hover': {
                boxShadow: '0 4px 8px rgba(37, 99, 235, 0.2)'
              }
            }}
            disableElevation
          >
            {loading ? <CircularProgress size={24} /> : 'Connect'}
          </Button>

          <Button
            variant="outlined"
            onClick={fetchDatabases}
            disabled={loading}
            sx={{
              borderRadius: 2,
              py: 1,
              fontWeight: 500,
              flex: { xs: 1, md: 'none' }
            }}
          >
            Refresh
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default DatabaseSelector;
