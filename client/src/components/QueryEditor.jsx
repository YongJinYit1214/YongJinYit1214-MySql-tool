import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Tooltip
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HistoryIcon from '@mui/icons-material/History';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { executeQuery } from '../services/api';
import EnhancedQueryResults from './EnhancedQueryResults';

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

  // We're now using the EnhancedQueryResults component instead of this function
  const renderResultTable = () => {
    return (
      <EnhancedQueryResults
        result={result}
        loading={loading}
        error={error}
      />
    );
  };

  // Query history (would be persisted in a real app)
  const [queryHistory] = useState([
    'SELECT * FROM users',
    'SELECT COUNT(*) as total_users FROM users',
    'SELECT products.name, categories.name as category FROM products JOIN categories ON products.category_id = categories.id'
  ]);

  // Saved queries (would be persisted in a real app)
  const [savedQueries] = useState([
    { name: 'All Users', query: 'SELECT * FROM users' },
    { name: 'User Count', query: 'SELECT COUNT(*) as total_users FROM users' },
    { name: 'Products with Categories', query: 'SELECT products.name, categories.name as category FROM products JOIN categories ON products.category_id = categories.id' }
  ]);

  // Handle selecting a query from history or saved queries
  const selectQuery = (selectedQuery) => {
    setQuery(selectedQuery);
  };

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          SQL Query Editor
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {database ? `Connected to: ${database}` : 'No database selected'}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
        {/* Query editor area */}
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
            sx={{
              '& .MuiOutlinedInput-root': {
                fontFamily: 'monospace',
                fontSize: '0.9rem'
              }
            }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Query helpers */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Query History">
                <Button
                  variant="outlined"
                  startIcon={<HistoryIcon />}
                  size="small"
                  onClick={(e) => {
                    // This would open a history menu in a real app
                    // For now, just use the first history item
                    if (queryHistory.length > 0) {
                      selectQuery(queryHistory[0]);
                    }
                  }}
                >
                  History
                </Button>
              </Tooltip>

              <Tooltip title="Saved Queries">
                <Button
                  variant="outlined"
                  startIcon={<BookmarkIcon />}
                  size="small"
                  onClick={(e) => {
                    // This would open a saved queries menu in a real app
                    // For now, just use the first saved query
                    if (savedQueries.length > 0) {
                      selectQuery(savedQueries[0].query);
                    }
                  }}
                >
                  Saved
                </Button>
              </Tooltip>
            </Box>

            {/* Execute button */}
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
              onClick={handleExecuteQuery}
              disabled={loading || !query.trim() || !database}
              sx={{ minWidth: 120 }}
            >
              Execute
            </Button>
          </Box>
        </Box>

        <Divider />

        {/* Results area */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {renderResultTable()}
        </Box>
      </Box>
    </Paper>
  );
};

export default QueryEditor;
