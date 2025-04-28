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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import { getDatabases, useDatabase, createDatabase, deleteDatabase } from '../services/api';

const DatabaseSelector = ({ onDatabaseSelected }) => {
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newDatabaseName, setNewDatabaseName] = useState('');
  const [databaseToDelete, setDatabaseToDelete] = useState('');
  const [createError, setCreateError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

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

  const handleOpenCreateDialog = () => {
    setIsCreateDialogOpen(true);
    setNewDatabaseName('');
    setCreateError(null);
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
  };

  const handleCreateDatabase = async () => {
    if (!newDatabaseName.trim()) {
      setCreateError('Database name is required');
      return;
    }

    // Validate database name (only allow alphanumeric characters and underscores)
    if (!/^[a-zA-Z0-9_]+$/.test(newDatabaseName)) {
      setCreateError('Invalid database name. Only letters, numbers, and underscores are allowed.');
      return;
    }

    setLoading(true);
    setCreateError(null);

    try {
      await createDatabase(newDatabaseName);
      await fetchDatabases();
      setSelectedDatabase(newDatabaseName);
      setIsCreateDialogOpen(false);
    } catch (err) {
      console.error('Error creating database:', err);
      setCreateError(err.response?.data?.error || 'Failed to create database');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDeleteDialog = (dbName) => {
    setDatabaseToDelete(dbName);
    setIsDeleteDialogOpen(true);
    setDeleteError(null);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
  };

  const handleDeleteDatabase = async () => {
    if (!databaseToDelete) {
      return;
    }

    setLoading(true);
    setDeleteError(null);

    try {
      await deleteDatabase(databaseToDelete);

      // If the deleted database was selected, clear the selection
      if (selectedDatabase === databaseToDelete) {
        setSelectedDatabase('');
      }

      await fetchDatabases();
      setIsDeleteDialogOpen(false);
    } catch (err) {
      console.error('Error deleting database:', err);
      setDeleteError(err.response?.data?.error || 'Failed to delete database');
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
              <MenuItem
                key={db}
                value={db}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  pr: 1
                }}
              >
                <span>{db}</span>
                <Tooltip title="Delete Database">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent the MenuItem from being selected
                      handleOpenDeleteDialog(db);
                    }}
                    sx={{
                      opacity: 0.7,
                      '&:hover': {
                        opacity: 1,
                        backgroundColor: 'rgba(211, 47, 47, 0.1)'
                      }
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
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
            startIcon={<RefreshIcon />}
            sx={{
              borderRadius: 2,
              py: 1,
              fontWeight: 500,
              flex: { xs: 1, md: 'none' }
            }}
          >
            Refresh
          </Button>

          <Button
            variant="outlined"
            onClick={handleOpenCreateDialog}
            disabled={loading}
            startIcon={<AddIcon />}
            color="success"
            sx={{
              borderRadius: 2,
              py: 1,
              fontWeight: 500,
              flex: { xs: 1, md: 'none' }
            }}
          >
            Create
          </Button>
        </Box>
      </Box>

      {/* Create Database Dialog */}
      <Dialog
        open={isCreateDialogOpen}
        onClose={handleCloseCreateDialog}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }
        }}
      >
        <DialogTitle
          component="div"
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            py: 2,
            px: 3
          }}
        >
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            Create New Database
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ py: 3, px: 3 }}>
          {createError && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)'
              }}
              variant="filled"
            >
              {createError}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter a name for your new database. Only letters, numbers, and underscores are allowed.
          </Typography>

          <TextField
            label="Database Name"
            value={newDatabaseName}
            onChange={(e) => setNewDatabaseName(e.target.value)}
            fullWidth
            margin="normal"
            required
            autoFocus
            error={!!createError}
            disabled={loading}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />
        </DialogContent>

        <DialogActions sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          px: 3,
          py: 2
        }}>
          <Button
            onClick={handleCloseCreateDialog}
            variant="outlined"
            disabled={loading}
            sx={{
              borderRadius: 2,
              px: 3,
              fontWeight: 500
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateDatabase}
            variant="contained"
            color="success"
            disabled={loading || !newDatabaseName.trim()}
            sx={{
              borderRadius: 2,
              px: 3,
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: '0 4px 8px rgba(37, 99, 235, 0.2)'
              }
            }}
            disableElevation
          >
            {loading ? <CircularProgress size={24} /> : 'Create Database'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Database Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }
        }}
      >
        <DialogTitle
          component="div"
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            py: 2,
            px: 3
          }}
        >
          <Typography variant="h5" component="div" sx={{ fontWeight: 600, color: 'error.main' }}>
            Delete Database
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ py: 3, px: 3 }}>
          {deleteError && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)'
              }}
              variant="filled"
            >
              {deleteError}
            </Alert>
          )}

          <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
            Are you sure you want to delete the database <strong>{databaseToDelete}</strong>?
          </Typography>

          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            This action cannot be undone. All tables and data in this database will be permanently deleted.
          </Alert>
        </DialogContent>

        <DialogActions sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          px: 3,
          py: 2
        }}>
          <Button
            onClick={handleCloseDeleteDialog}
            variant="outlined"
            disabled={loading}
            sx={{
              borderRadius: 2,
              px: 3,
              fontWeight: 500
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteDatabase}
            variant="contained"
            color="error"
            disabled={loading}
            sx={{
              borderRadius: 2,
              px: 3,
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: '0 4px 8px rgba(211, 47, 47, 0.2)'
              }
            }}
            disableElevation
          >
            {loading ? <CircularProgress size={24} /> : 'Delete Database'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DatabaseSelector;
