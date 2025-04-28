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
  Stack,
  IconButton,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import {
  getTableData,
  getTableStructure,
  updateRecord,
  createRecord,
  deleteRecord,
  getReferencedData
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
  const [editingCell, setEditingCell] = useState(null); // Track which cell is being edited
  const [editValue, setEditValue] = useState(''); // Store the current edit value
  const [relatedRecords, setRelatedRecords] = useState([]); // Store related records for adding
  const [foreignKeyData, setForeignKeyData] = useState({}); // Store foreign key reference data
  const [referencingTables, setReferencingTables] = useState({}); // Store tables that reference this table
  const [relatedTableData, setRelatedTableData] = useState({}); // Store data for related tables
  const [showRelatedTables, setShowRelatedTables] = useState(false); // Whether to show related tables in add dialog
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
      const structureResponse = await getTableStructure(tableName);

      // Handle the new response format
      const { columns, primaryKey: pkName, referencingTables: refTables } = structureResponse;

      setTableStructure(columns || structureResponse);
      if (pkName) {
        setPrimaryKey(pkName);
      } else {
        // Backward compatibility for old response format
        const pk = (columns || structureResponse).find(col => col.Key === 'PRI');
        setPrimaryKey(pk ? pk.Field : null);
      }

      if (refTables) {
        setReferencingTables(refTables);
        console.log('Tables referencing this table:', refTables);
      }

      // Create column definitions for AG Grid
      const cols = (columns || structureResponse).map(col => ({
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

      // Load foreign key data for any foreign key columns
      const foreignKeyColumns = (columns || structureResponse).filter(col => col.isForeignKey);
      console.log('Foreign key columns:', foreignKeyColumns);
      const fkData = {};

      if (foreignKeyColumns && foreignKeyColumns.length > 0) {
        for (const fkColumn of foreignKeyColumns) {
          try {
            console.log(`Fetching referenced data for ${fkColumn.Field}`);
            const refData = await getReferencedData(tableName, fkColumn.Field);
            fkData[fkColumn.Field] = {
              referencedTable: refData.referencedTable,
              referencedColumn: refData.referencedColumn,
              data: refData.data
            };
          } catch (fkErr) {
            console.error(`Error loading foreign key data for ${fkColumn.Field}:`, fkErr);
          }
        }
      } else {
        console.log('No foreign key columns found in this table');
      }

      setForeignKeyData(fkData);

      // If there are tables referencing this one, we'll need to show the related tables section
      if (refTables && Object.keys(refTables).length > 0) {
        setShowRelatedTables(true);

        // Load structure for each referencing table
        const relatedData = {};
        for (const [refTableName, columns] of Object.entries(refTables)) {
          try {
            // Get the structure of the related table
            const relatedStructure = await getTableStructure(refTableName);

            // Store the structure and columns that reference this table
            relatedData[refTableName] = {
              structure: relatedStructure.columns || relatedStructure,
              referencingColumns: columns
            };
          } catch (relErr) {
            console.error(`Error loading structure for related table ${refTableName}:`, relErr);
          }
        }

        setRelatedTableData(relatedData);
      } else {
        setShowRelatedTables(false);
      }
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

      // Check if it's a foreign key constraint error
      if (err.response?.status === 409) {
        const details = err.response.data.details;

        // Show a more detailed error message with the option to force delete
        const forceDelete = window.confirm(
          `${err.response.data.error}\n\n` +
          `${details.message}\n\n` +
          `Referenced by tables: ${details.constraints?.map(c => c.referencingTable).join(', ') || 'unknown'}\n\n` +
          `Do you want to force delete this record? (NOT RECOMMENDED - may cause data inconsistency)`
        );

        if (forceDelete) {
          try {
            // Call delete with force=true
            await deleteRecord(tableName, data[primaryKey], true);
            fetchTableData(pagination.page);
          } catch (forceErr) {
            console.error('Error force deleting record:', forceErr);
            setError(`Failed to force delete record: ${forceErr.message}`);
          }
        }
      } else {
        setError(`Failed to delete record: ${err.response?.data?.error || err.message}`);
      }
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

      // Create the record without automatically adding related records
      // This ensures the user has explicitly provided values for all foreign keys
      await createRecord(tableName, filteredRecord);

      // Check if there are tables that reference this one
      if (showRelatedTables && Object.keys(referencingTables).length > 0) {
        // Show a reminder to add related records
        const relatedTablesList = Object.keys(referencingTables).join(', ');
        const message = `Record added successfully!\n\nIf needed for your application, remember to add related records to the following tables: ${relatedTablesList}`;
        alert(message);
      }

      setIsAddDialogOpen(false);
      setNewRecord({});
      setRelatedRecords([]);
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

  // Start editing a cell
  const handleStartEditing = (rowIndex, field, value) => {
    setEditingCell({ rowIndex, field });
    setEditValue(value !== null && value !== undefined ? String(value) : '');
  };

  // Cancel editing
  const handleCancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Save the edited cell value
  const handleSaveEdit = async (row) => {
    if (!editingCell || !primaryKey || !row[primaryKey]) return;

    try {
      const { field } = editingCell;

      // Find the column type
      const column = tableStructure.find(col => col.Field === field);
      if (!column) {
        handleCancelEditing();
        return;
      }

      // Convert the value to the appropriate type
      const convertedValue = convertValueForColumn(editValue, column.Type);

      // Update the record
      await updateRecord(
        tableName,
        row[primaryKey],
        { [field]: convertedValue }
      );

      // Reset editing state
      setEditingCell(null);
      setEditValue('');

      // Refresh the data
      fetchTableData(pagination.page);
    } catch (err) {
      console.error('Error updating record:', err);

      // Check if it's a foreign key constraint error
      if (err.response?.status === 409) {
        const details = err.response.data.details;

        // Show a more detailed error message with the option to force update
        const forceUpdate = window.confirm(
          `${err.response.data.error}\n\n` +
          `${details.message}\n\n` +
          `Do you want to force update this record? (NOT RECOMMENDED - may cause data inconsistency)`
        );

        if (forceUpdate) {
          try {
            // Call update with force=true
            const { field } = editingCell;
            const column = tableStructure.find(col => col.Field === field);
            const convertedValue = convertValueForColumn(editValue, column.Type);

            await updateRecord(
              tableName,
              row[primaryKey],
              { [field]: convertedValue },
              true
            );

            // Reset editing state
            setEditingCell(null);
            setEditValue('');

            // Refresh the data
            fetchTableData(pagination.page);
          } catch (forceErr) {
            console.error('Error force updating record:', forceErr);
            setError(`Failed to force update record: ${forceErr.message}`);
            handleCancelEditing();
          }
        } else {
          handleCancelEditing();
        }
      } else {
        setError(`Failed to update record: ${err.response?.data?.error || err.message}`);
        handleCancelEditing();
      }
    }
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
                          cursor: 'pointer',
                          backgroundColor: editingCell && editingCell.rowIndex === rowIndex && editingCell.field === col.field
                            ? 'rgba(33, 150, 243, 0.1)'
                            : 'inherit'
                        }}
                        title={formatValue(row[col.field], '')} // Add tooltip with full content
                      >
                        {editingCell && editingCell.rowIndex === rowIndex && editingCell.field === col.field ? (
                          // Editing mode
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <TextField
                              variant="standard"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              autoFocus
                              fullWidth
                              size="small"
                              sx={{ mr: 1 }}
                              type={(() => {
                                const column = tableStructure.find(c => c.Field === col.field);
                                if (!column) return 'text';
                                const inputType = getEditorType(column.Type);
                                return typeof inputType === 'string' ? inputType : 'text';
                              })()}
                            />
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleSaveEdit(row)}
                              sx={{ p: 0.5 }}
                            >
                              <SaveIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="default"
                              onClick={handleCancelEditing}
                              sx={{ p: 0.5 }}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ) : (
                          // Display mode
                          <Box
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              width: '100%',
                              cursor: 'pointer',
                              minHeight: '24px' // Ensure empty cells have height
                            }}
                            onClick={(e) => {
                              // Show popup with full content on click
                              const value = row[col.field];
                              const isNull = value === null || value === undefined;
                              const content = isNull ? '(null)' : formatValue(value, '');

                              // Always show popup when clicked
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
                              if (isNull) {
                                contentElement.innerText = '(null)';
                                contentElement.style.color = '#999';
                                contentElement.style.fontStyle = 'italic';
                              } else {
                                contentElement.innerText = content;
                              }
                              popup.appendChild(contentElement);

                              // Add edit button
                              const editBtn = document.createElement('button');
                              editBtn.innerText = 'Edit';
                              editBtn.className = 'edit-button';
                              editBtn.style.marginRight = '8px';
                              editBtn.style.backgroundColor = '#2196f3';
                              editBtn.style.color = 'white';
                              editBtn.style.fontWeight = 'bold';
                              editBtn.style.padding = '8px 16px';
                              editBtn.style.border = 'none';
                              editBtn.style.borderRadius = '4px';
                              editBtn.style.cursor = 'pointer';
                              editBtn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                              editBtn.onclick = () => {
                                document.body.removeChild(popup);
                                handleStartEditing(rowIndex, col.field, row[col.field]);
                              };

                              // Add close button
                              const closeBtn = document.createElement('button');
                              closeBtn.innerText = 'Close';
                              closeBtn.style.padding = '8px 16px';
                              closeBtn.style.border = '1px solid #ccc';
                              closeBtn.style.borderRadius = '4px';
                              closeBtn.style.cursor = 'pointer';
                              closeBtn.onclick = () => document.body.removeChild(popup);

                              // Add buttons container
                              const buttonsContainer = document.createElement('div');
                              buttonsContainer.style.display = 'flex';
                              buttonsContainer.style.justifyContent = 'center';
                              buttonsContainer.style.marginTop = '15px';

                              buttonsContainer.appendChild(editBtn);
                              buttonsContainer.appendChild(closeBtn);

                              popup.appendChild(document.createElement('br'));
                              popup.appendChild(buttonsContainer);

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
                            {row[col.field] === null || row[col.field] === undefined ?
                              <span style={{ color: '#999', fontStyle: 'italic' }}>(null)</span> :
                              formatValue(row[col.field], '')}
                          </Box>
                        )}
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

          {showRelatedTables && Object.keys(referencingTables).length > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                This table is referenced by other tables
              </Typography>
              <Typography variant="body2">
                When you add a record to this table, you may need to add related records to the following tables (if applicable to your data model):
              </Typography>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                {Object.keys(referencingTables).map(refTable => (
                  <li key={refTable}>
                    <strong>{refTable}</strong> - References {referencingTables[refTable].map(col =>
                      `${col.column} → ${col.referencedColumn}`
                    ).join(', ')}
                  </li>
                ))}
              </ul>
              <Typography variant="body2">
                After adding this record, you may need to add corresponding records to these tables if your application requires them.
              </Typography>
            </Alert>
          )}

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

              // Check if this is a foreign key field
              if (column.isForeignKey && foreignKeyData && foreignKeyData[column.Field]) {
                const fkData = foreignKeyData[column.Field];
                return (
                  <FormControl
                    key={column.Field}
                    fullWidth
                    required={isRequired}
                    error={isRequired && (!newRecord[column.Field] || newRecord[column.Field] === '')}
                    disabled={isAutoIncrement}
                    sx={{ mb: 1 }}
                  >
                    <InputLabel id={`${column.Field}-label`}>
                      {`${column.Field}${isRequired ? ' *' : ''}`}
                    </InputLabel>
                    <Select
                      labelId={`${column.Field}-label`}
                      value={newRecord[column.Field] || ''}
                      onChange={(e) => handleNewRecordChange(column.Field, e.target.value)}
                      label={`${column.Field}${isRequired ? ' *' : ''}`}
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {fkData.data && fkData.data.map(item => (
                        <MenuItem
                          key={item[fkData.referencedColumn]}
                          value={item[fkData.referencedColumn]}
                        >
                          {/* Display the referenced column value and any descriptive fields if available */}
                          {item[fkData.referencedColumn]}
                          {item.name ? ` - ${item.name}` : ''}
                          {item.title ? ` - ${item.title}` : ''}
                          {item.description ? ` - ${item.description}` : ''}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      {`Foreign key to ${fkData.referencedTable}.${fkData.referencedColumn}${isRequired ? ' (Required)' : ''}`}
                    </FormHelperText>
                  </FormControl>
                );
              }

              // Regular field (not a foreign key)
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
