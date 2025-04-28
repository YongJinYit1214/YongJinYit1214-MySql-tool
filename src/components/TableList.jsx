import { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Paper,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { getTables } from '../services/api';

const TableList = ({ database, onTableSelect }) => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);

  useEffect(() => {
    if (database) {
      fetchTables();
    }
  }, [database]);

  const fetchTables = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTables();
      setTables(data);
    } catch (err) {
      console.error('Error fetching tables:', err);
      setError('Failed to fetch tables');
    } finally {
      setLoading(false);
    }
  };

  const handleTableClick = (table) => {
    setSelectedTable(table);
    onTableSelect(table);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Paper sx={{ height: '100%', overflow: 'auto' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
        <Typography variant="h6">
          Tables in {database}
        </Typography>
      </Box>
      
      {tables.length === 0 ? (
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No tables found in this database
          </Typography>
        </Box>
      ) : (
        <List>
          {tables.map((table) => (
            <ListItem key={table} disablePadding>
              <ListItemButton 
                selected={selectedTable === table}
                onClick={() => handleTableClick(table)}
              >
                <ListItemText primary={table} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default TableList;
