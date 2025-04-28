import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { executeQuery } from '../services/api';
import { formatValue } from '../utils/helpers';

const QueryEditor = ({ database }) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleExecuteQuery = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const data = await executeQuery(query);
      setResult(data.result);
    } catch (err) {
      console.error('Error executing query:', err);
      setError(err.response?.data?.error || 'Failed to execute query');
    } finally {
      setLoading(false);
    }
  };

  const renderResultTable = () => {
    if (!result || !Array.isArray(result) || result.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {result ? 'Query executed successfully. No results to display.' : 'No results'}
        </Typography>
      );
    }

    const columns = Object.keys(result[0]);

    return (
      <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 400 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column}>{column}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {result.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column) => (
                  <TableCell key={`${rowIndex}-${column}`}>
                    {formatValue(row[column])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
        <Typography variant="h6">
          SQL Query Editor
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {database ? `Connected to: ${database}` : 'No database selected'}
        </Typography>
      </Box>
      
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="SQL Query"
          multiline
          rows={5}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          variant="outlined"
          fullWidth
          placeholder="Enter your SQL query here..."
        />
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
            onClick={handleExecuteQuery}
            disabled={loading || !query.trim() || !database}
          >
            Execute
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}
        
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress />
            </Box>
          ) : (
            renderResultTable()
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default QueryEditor;
