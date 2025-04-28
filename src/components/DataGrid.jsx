import { useState, useEffect, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Pagination,
  Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { 
  getTableData, 
  getTableStructure, 
  updateRecord, 
  createRecord, 
  deleteRecord 
} from '../services/api';
import { formatValue, getEditorType, convertValueForColumn } from '../utils/helpers';

const DataGrid = ({ database, tableName }) => {
  const gridRef = useRef();
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tableStructure, setTableStructure] = useState([]);
  const [primaryKey, setPrimaryKey] = useState(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRecord, setNewRecord] = useState({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0
  });

  // Fetch table structure and data when table changes
  useEffect(() => {
    if (tableName) {
      fetchTableStructure();
      fetchTableData();
    }
  }, [tableName]);

  const fetchTableStructure = async () => {
    setLoading(true);
    setError(null);
    try {
      const structure = await getTableStructure(tableName);
      setTableStructure(structure);
      
      // Find primary key
      const pk = structure.find(col => col.Key === 'PRI');
      setPrimaryKey(pk ? pk.Field : null);
      
      // Create column definitions for AG Grid
      const cols = structure.map(col => ({
        field: col.Field,
        headerName: col.Field,
        editable: true,
        sortable: true,
        filter: true,
        resizable: true,
        valueFormatter: (params) => formatValue(params.value, col.Type),
        cellEditor: getEditorType(col.Type),
        cellEditorParams: {
          type: getEditorType(col.Type)
        }
      }));
      
      // Add action column
      cols.push({
        headerName: 'Actions',
        field: 'actions',
        sortable: false,
        filter: false,
        editable: false,
        width: 120,
        cellRenderer: (params) => {
          const deleteBtn = document.createElement('button');
          deleteBtn.innerHTML = 'Delete';
          deleteBtn.className = 'btn-delete';
          deleteBtn.addEventListener('click', () => handleDeleteRecord(params.data));
          return deleteBtn;
        }
      });
      
      setColumnDefs(cols);
    } catch (err) {
      console.error('Error fetching table structure:', err);
      setError('Failed to fetch table structure');
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getTableData(tableName, { page, limit: pagination.limit });
      setRowData(result.data);
      setPagination({
        ...pagination,
        page: result.pagination.page,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages
      });
    } catch (err) {
      console.error('Error fetching table data:', err);
      setError('Failed to fetch table data');
    } finally {
      setLoading(false);
    }
  };

  const handleCellValueChanged = async (params) => {
    if (!primaryKey || !params.data[primaryKey]) {
      console.error('Cannot update record: No primary key found');
      return;
    }
    
    const { field, newValue, data } = params;
    if (field === 'actions') return;
    
    try {
      // Find the column type
      const column = tableStructure.find(col => col.Field === field);
      if (!column) return;
      
      // Convert the value to the appropriate type
      const convertedValue = convertValueForColumn(newValue, column.Type);
      
      // Update the record
      await updateRecord(
        tableName,
        data[primaryKey],
        { [field]: convertedValue }
      );
      
      // Refresh the data
      fetchTableData(pagination.page);
    } catch (err) {
      console.error('Error updating record:', err);
      setError(`Failed to update record: ${err.message}`);
    }
  };

  const handleDeleteRecord = async (data) => {
    if (!primaryKey || !data[primaryKey]) {
      console.error('Cannot delete record: No primary key found');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this record?')) {
      return;
    }
    
    try {
      await deleteRecord(tableName, data[primaryKey]);
      fetchTableData(pagination.page);
    } catch (err) {
      console.error('Error deleting record:', err);
      setError(`Failed to delete record: ${err.message}`);
    }
  };

  const handleAddRecord = async () => {
    try {
      await createRecord(tableName, newRecord);
      setIsAddDialogOpen(false);
      setNewRecord({});
      fetchTableData(pagination.page);
    } catch (err) {
      console.error('Error creating record:', err);
      setError(`Failed to create record: ${err.message}`);
    }
  };

  const handlePageChange = (event, value) => {
    fetchTableData(value);
  };

  const handleNewRecordChange = (field, value) => {
    setNewRecord(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!tableName) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body1">
          Select a table to view and edit data
        </Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {tableName}
        </Typography>
        
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={() => fetchTableData(pagination.page)}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => setIsAddDialogOpen(true)}
          >
            Add Record
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      )}
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress />
        </Box>
      )}
      
      <Box sx={{ flexGrow: 1, width: '100%', height: 'calc(100% - 120px)' }}>
        <div className="ag-theme-alpine" style={{ height: '100%', width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={{
              flex: 1,
              minWidth: 100,
              editable: true
            }}
            onCellValueChanged={handleCellValueChanged}
            pagination={false}
            rowSelection="multiple"
            suppressRowClickSelection={true}
          />
        </div>
      </Box>
      
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
        <Stack spacing={2}>
          <Pagination 
            count={pagination.totalPages} 
            page={pagination.page} 
            onChange={handlePageChange} 
            color="primary" 
          />
          <Typography variant="body2" color="text.secondary" align="center">
            Showing {rowData.length} of {pagination.total} records
          </Typography>
        </Stack>
      </Box>
      
      {/* Add Record Dialog */}
      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Record</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mt: 2 }}>
            {tableStructure.map(column => (
              <TextField
                key={column.Field}
                label={column.Field}
                variant="outlined"
                fullWidth
                value={newRecord[column.Field] || ''}
                onChange={(e) => handleNewRecordChange(column.Field, e.target.value)}
                type={getEditorType(column.Type)}
                required={column.Null === 'NO' && column.Default === null && !column.Extra.includes('auto_increment')}
                helperText={`${column.Type}${column.Null === 'NO' ? ' (Required)' : ''}`}
                disabled={column.Extra.includes('auto_increment')}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddRecord} variant="contained">Add Record</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default DataGrid;
