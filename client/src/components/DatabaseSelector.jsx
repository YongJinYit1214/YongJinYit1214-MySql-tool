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
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Select MySQL Database
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl fullWidth>
          <InputLabel>Database</InputLabel>
          <Select
            value={selectedDatabase}
            label="Database"
            onChange={handleDatabaseChange}
            disabled={loading}
          >
            {databases.map((db) => (
              <MenuItem key={db} value={db}>
                {db}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Button
          variant="contained"
          onClick={handleConnect}
          disabled={!selectedDatabase || loading}
          sx={{ minWidth: 120 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Connect'}
        </Button>
        
        <Button
          variant="outlined"
          onClick={fetchDatabases}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>
    </Box>
  );
};

export default DatabaseSelector;
