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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  getTableData,
  getTableStructure,
  updateRecord,
  createRecord,
  deleteRecord
} from '../services/api';
import { formatValue, getEditorType, convertValueForColumn } from '../utils/helpers';

const DataGrid = ({ database, tableName, onBackToTables = () => {} }) => {
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
      console.log(`Fetching data for table: ${tableName}, page: ${page}`);
      const result = await getTableData(tableName, { page, limit: pagination.limit });
      console.log('Received data:', result);
      console.log('Data array:', result.data);
      setRowData(result.data);
      console.log('rowData after setting:', result.data);
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
      // Filter out empty values and ensure only valid columns are included
      const filteredRecord = {};

      // Get the valid column names from the table structure
      const validColumns = tableStructure.map(col => col.Field);

      for (const [key, value] of Object.entries(newRecord)) {
        // Only include fields that exist in the table and have a value
        if (validColumns.includes(key) && value !== undefined && value !== null && value !== '') {
          filteredRecord[key] = value;
        }
      }

      if (Object.keys(filteredRecord).length === 0) {
        setError('Please fill in at least one field');
        return;
      }

      console.log('Submitting record with valid columns only:', filteredRecord);
      await createRecord(tableName, filteredRecord);
      setIsAddDialogOpen(false);
      setNewRecord({});
      setError(null);
      fetchTableData(pagination.page);
    } catch (err) {
      console.error('Error creating record:', err);
      setError(`Failed to create record: ${err.response?.data?.error || err.message}`);
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
      <Box sx={{ p: 1, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => onBackToTables()}
            sx={{ mr: 2, py: 0.5 }}
            size="small"
          >
            Back
          </Button>
          <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
            {tableName}
          </Typography>
        </Box>

        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => fetchTableData(pagination.page)}
            sx={{ mr: 1, py: 0.5 }}
            size="small"
          >
            Refresh
          </Button>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsAddDialogOpen(true)}
            sx={{ py: 0.5 }}
            size="small"
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

      <Box sx={{ width: '100%', overflow: 'auto', mt: 0, pt: 0 }}>

        {/* Data table display */}
        {rowData.length > 0 && columnDefs.length > 0 ? (
          <Box sx={{ overflowX: 'auto', mt: 0, maxWidth: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  {columnDefs.filter(col => col.field !== 'actions').map(col => (
                    <th
                      key={col.field}
                      style={{
                        padding: '8px',
                        borderBottom: '1px solid #ddd',
                        textAlign: 'left',
                        backgroundColor: '#f5f5f5',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        position: 'relative'
                      }}
                      title={col.headerName} // Add tooltip to header
                      onClick={(e) => {
                        // Show popup with full header name on click
                        if (col.headerName) { // Show popup for all headers
                          const popup = document.createElement('div');
                          popup.className = 'cell-content-popup';
                          popup.style.left = `${e.clientX}px`;
                          popup.style.top = `${e.clientY}px`;

                          // Add the content
                          const titleElement = document.createElement('strong');
                          titleElement.innerText = 'Column Information';
                          titleElement.style.fontSize = '16px';
                          popup.appendChild(titleElement);

                          popup.appendChild(document.createElement('br'));
                          popup.appendChild(document.createElement('br'));

                          // Add column name
                          const nameLabel = document.createElement('strong');
                          nameLabel.innerText = 'Name: ';
                          popup.appendChild(nameLabel);

                          const nameValue = document.createElement('span');
                          nameValue.innerText = col.headerName;
                          popup.appendChild(nameValue);

                          popup.appendChild(document.createElement('br'));

                          // Add column type if available
                          const column = tableStructure.find(c => c.Field === col.field);
                          if (column) {
                            const typeLabel = document.createElement('strong');
                            typeLabel.innerText = 'Type: ';
                            popup.appendChild(typeLabel);

                            const typeValue = document.createElement('span');
                            typeValue.innerText = column.Type;
                            popup.appendChild(typeValue);

                            popup.appendChild(document.createElement('br'));

                            // Add key information if it's a primary key
                            if (column.Key === 'PRI') {
                              const keyLabel = document.createElement('strong');
                              keyLabel.innerText = 'Key: ';
                              popup.appendChild(keyLabel);

                              const keyValue = document.createElement('span');
                              keyValue.innerText = 'Primary Key';
                              keyValue.style.color = '#2196f3';
                              keyValue.style.fontWeight = 'bold';
                              popup.appendChild(keyValue);

                              popup.appendChild(document.createElement('br'));
                            }

                            // Add nullable information
                            const nullableLabel = document.createElement('strong');
                            nullableLabel.innerText = 'Nullable: ';
                            popup.appendChild(nullableLabel);

                            const nullableValue = document.createElement('span');
                            nullableValue.innerText = column.Null === 'YES' ? 'Yes' : 'No';
                            popup.appendChild(nullableValue);
                          }

                          // Add close button
                          const closeBtn = document.createElement('button');
                          closeBtn.innerText = 'Close';
                          closeBtn.onclick = () => document.body.removeChild(popup);

                          popup.appendChild(document.createElement('br'));
                          popup.appendChild(closeBtn);

                          // Remove popup when clicking outside
                          document.addEventListener('click', function removePopup(event) {
                            if (!popup.contains(event.target) && event.target !== e.target) {
                              if (document.body.contains(popup)) {
                                document.body.removeChild(popup);
                              }
                              document.removeEventListener('click', removePopup);
                            }
                          });

                          document.body.appendChild(popup);
                        }
                      }}
                    >
                      {col.headerName}
                    </th>
                  ))}
                  <th
                    style={{
                      padding: '8px',
                      borderBottom: '1px solid #ddd',
                      textAlign: 'left',
                      backgroundColor: '#f5f5f5',
                      width: '100px',
                      minWidth: '100px',
                      cursor: 'pointer'
                    }}
                    title="Actions"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rowData.map((row, rowIndex) => (
                  <tr key={rowIndex} style={{ backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#f9f9f9' }}>
                    {columnDefs.filter(col => col.field !== 'actions').map(col => (
                      <td
                        key={`${rowIndex}-${col.field}`}
                        style={{
                          padding: '8px',
                          borderBottom: '1px solid #ddd',
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          position: 'relative',
                          cursor: 'pointer'
                        }}
                        title={formatValue(row[col.field], '')} // Add tooltip with full content
                        onClick={(e) => {
                          // Show popup with full content on click
                          const content = formatValue(row[col.field], '');
                          // Always show popup when clicked, regardless of length
                          const popup = document.createElement('div');
                          popup.className = 'cell-content-popup';
                          popup.style.left = `${e.clientX}px`;
                          popup.style.top = `${e.clientY}px`;

                          // Create a header with the column name
                          const header = document.createElement('strong');
                          header.innerText = col.headerName + ':';
                          popup.appendChild(header);

                          // Add a line break
                          popup.appendChild(document.createElement('br'));
                          popup.appendChild(document.createElement('br'));

                          // Add the content
                          const contentElement = document.createElement('span');
                          contentElement.innerText = content;
                          popup.appendChild(contentElement);

                          // Add close button
                          const closeBtn = document.createElement('button');
                          closeBtn.innerText = 'Close';
                          closeBtn.onclick = () => document.body.removeChild(popup);

                          popup.appendChild(document.createElement('br'));
                          popup.appendChild(closeBtn);

                          // Remove popup when clicking outside
                          document.addEventListener('click', function removePopup(event) {
                            if (!popup.contains(event.target) && event.target !== e.target) {
                              if (document.body.contains(popup)) {
                                document.body.removeChild(popup);
                              }
                              document.removeEventListener('click', removePopup);
                            }
                          });

                          document.body.appendChild(popup);
                        }}
                      >
                        {formatValue(row[col.field], '')}
                      </td>
                    ))}
                    <td style={{
                      padding: '8px',
                      borderBottom: '1px solid #ddd',
                      width: '100px',
                      minWidth: '100px'
                    }}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleDeleteRecord(row)}
                        sx={{ minWidth: 'auto', p: '4px 8px' }}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        ) : (
          <Typography variant="body1" sx={{ p: 2 }}>
            {loading ? 'Loading data...' : 'No data available'}
          </Typography>
        )}
      </Box>

      <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {rowData.length} of {pagination.total} records
        </Typography>

        <Pagination
          count={pagination.totalPages}
          page={pagination.page}
          onChange={handlePageChange}
          color="primary"
          size="small"
        />
      </Box>

      {/* Add Record Dialog */}
      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Record to {tableName}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
              {error}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            Fields marked with * are required. Auto-increment fields are disabled.
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
            {tableStructure.map(column => {
              const isRequired = column.Null === 'NO' && column.Default === null && !column.Extra.includes('auto_increment');
              const isAutoIncrement = column.Extra.includes('auto_increment');
              const inputType = getEditorType(column.Type);

              // Skip fields that don't exist in the actual table
              // This is determined by checking if the field is in the first row of data
              const fieldExists = rowData.length === 0 || Object.prototype.hasOwnProperty.call(rowData[0], column.Field);

              if (!fieldExists) {
                console.log(`Skipping non-existent field: ${column.Field}`);
                return null;
              }

              return (
                <TextField
                  key={column.Field}
                  label={`${column.Field}${isRequired ? ' *' : ''}`}
                  variant="outlined"
                  fullWidth
                  value={newRecord[column.Field] || ''}
                  onChange={(e) => handleNewRecordChange(column.Field, e.target.value)}
                  type={typeof inputType === 'string' ? inputType : 'text'}
                  required={isRequired}
                  helperText={`${column.Type}${isRequired ? ' (Required)' : ''}${isAutoIncrement ? ' (Auto-increment)' : ''}`}
                  disabled={isAutoIncrement}
                  error={isRequired && (!newRecord[column.Field] || newRecord[column.Field] === '')}
                  sx={{ mb: 1 }}
                />
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setIsAddDialogOpen(false);
            setError(null);
            setNewRecord({});
          }}>
            Cancel
          </Button>
          <Button
            onClick={handleAddRecord}
            variant="contained"
            color="primary"
          >
            Add Record
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default DataGrid;
