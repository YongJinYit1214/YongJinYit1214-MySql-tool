import { useState, useEffect, useRef } from 'react';
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  useTheme
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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
  const theme = useTheme();
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false); // Control edit dialog visibility
  const [editingRow, setEditingRow] = useState(null); // Store the row being edited
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
  const handleStartEditing = (rowIndex, field, value, row) => {
    setEditingCell({ rowIndex, field });
    setEditValue(value !== null && value !== undefined ? String(value) : '');
    setEditingRow(row);
    setIsEditDialogOpen(true);
  };

  // Cancel editing
  const handleCancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
    setEditingRow(null);
    setIsEditDialogOpen(false);
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
      setEditingRow(null);
      setIsEditDialogOpen(false);

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
            setEditingRow(null);
            setIsEditDialogOpen(false);

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
    <Paper sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 2,
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
    }} className="fade-in">
      <Box sx={{
        p: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        bgcolor: 'background.paper'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => onBackToTables()}
            sx={{
              mr: 2,
              borderRadius: 2,
              fontWeight: 500,
              px: 2
            }}
            size="small"
          >
            Back
          </Button>
          <Typography variant="h6" sx={{
            fontSize: '1.1rem',
            fontWeight: 600,
            color: 'text.primary',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Box component="span" sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              display: 'inline-block',
              mr: 1.5
            }} />
            {tableName}
          </Typography>
        </Box>

        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => fetchTableData(pagination.page)}
            sx={{
              mr: 2,
              borderRadius: 2,
              fontWeight: 500
            }}
            size="small"
          >
            Refresh
          </Button>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsAddDialogOpen(true)}
            sx={{
              borderRadius: 2,
              fontWeight: 500,
              boxShadow: 'none'
            }}
            size="small"
            disableElevation
          >
            Add Record
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{
            m: 2,
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)'
          }}
          variant="filled"
        >
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          p: 4,
          height: '100px'
        }}>
          <CircularProgress size={40} thickness={4} />
        </Box>
      )}

      <Box sx={{
        width: '100%',
        overflow: 'auto',
        mt: 0,
        pt: 0,
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>

        {/* Data table display */}
        {rowData.length > 0 && columnDefs.length > 0 ? (
          <Box sx={{
            overflowX: 'auto',
            mt: 0,
            maxWidth: '100%',
            flexGrow: 1,
            px: 2
          }} className="slide-up">
            <table style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              tableLayout: 'fixed',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)'
            }}>
              <thead>
                <tr>
                  {columnDefs.filter(col => col.field !== 'actions').map(col => (
                    <th
                      key={col.field}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #e2e8f0',
                        textAlign: 'left',
                        backgroundColor: '#f8fafc',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        position: 'relative',
                        fontWeight: 600,
                        color: '#1e293b',
                        fontSize: '14px'
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
                      padding: '12px 16px',
                      borderBottom: '1px solid #e2e8f0',
                      textAlign: 'left',
                      backgroundColor: '#f8fafc',
                      width: '120px',
                      minWidth: '120px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      color: '#1e293b',
                      fontSize: '14px'
                    }}
                    title="Actions"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rowData.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    style={{
                      backgroundColor: rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                      transition: 'background-color 0.2s ease'
                    }}
                  >
                    {columnDefs.filter(col => col.field !== 'actions').map(col => (
                      <td
                        key={`${rowIndex}-${col.field}`}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #f1f5f9',
                          maxWidth: '200px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          position: 'relative',
                          cursor: 'pointer',
                          color: '#1e293b',
                          fontSize: '14px',
                          transition: 'background-color 0.2s ease',
                          backgroundColor: editingCell && editingCell.rowIndex === rowIndex && editingCell.field === col.field
                            ? 'rgba(37, 99, 235, 0.05)'
                            : 'inherit'
                        }}
                        title={formatValue(row[col.field], '')} // Add tooltip with full content
                      >
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
                      </td>
                    ))}
                    <td style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      width: '120px',
                      minWidth: '120px'
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => handleDeleteRecord(row)}
                          sx={{
                            minWidth: 'auto',
                            p: '4px 8px',
                            borderRadius: 1.5,
                            fontWeight: 500,
                            fontSize: '0.75rem'
                          }}
                        >
                          Delete
                        </Button>
                      </Box>
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

      <Box sx={{
        p: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          {pagination.total > 0 ? (
            `Showing ${(pagination.page - 1) * pagination.limit + 1} to ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} records`
          ) : (
            'No records found'
          )}
        </Typography>

        <Pagination
          count={pagination.totalPages}
          page={pagination.page}
          onChange={handlePageChange}
          color="primary"
          size="medium"
          shape="rounded"
          showFirstButton
          showLastButton
          sx={{
            '& .MuiPaginationItem-root': {
              borderRadius: 1.5,
              fontWeight: 500
            }
          }}
        />
      </Box>

      {/* Add Record Dialog */}
      <Dialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }
        }}
      >
        <DialogTitle sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          py: 2,
          px: 3
        }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Add New Record to {tableName}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ py: 3, px: 3 }}>
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

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Box component="span" sx={{ fontWeight: 600, color: 'text.primary', display: 'block', mb: 1 }}>Instructions:</Box>
            Fields marked with <Box component="span" sx={{ color: 'error.main', fontWeight: 600 }}>*</Box> are required. Auto-increment fields are disabled.
          </Typography>

          {showRelatedTables && Object.keys(referencingTables).length > 0 && (
            <Alert
              severity="info"
              sx={{
                mb: 3,
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(14, 165, 233, 0.15)'
              }}
              icon={false}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5 }}>
                <Box
                  component="span"
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: 'info.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    mr: 1.5,
                    fontSize: '14px'
                  }}
                >
                  i
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'info.dark' }}>
                  This table is referenced by other tables
                </Typography>
              </Box>

              <Typography variant="body2" sx={{ ml: 5, mb: 1.5 }}>
                When you add a record to this table, you may need to add related records to the following tables (if applicable to your data model):
              </Typography>

              <Box sx={{
                ml: 5,
                mb: 1.5,
                p: 1.5,
                bgcolor: 'background.paper',
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'info.light'
              }}>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {Object.keys(referencingTables).map(refTable => (
                    <li key={refTable} style={{ marginBottom: '4px' }}>
                      <Typography component="span" sx={{ fontWeight: 600 }}>{refTable}</Typography> - References {referencingTables[refTable].map(col =>
                        <Typography component="span" key={col.column}>
                          <Typography component="span" sx={{ fontWeight: 500 }}>{col.column}</Typography> → {col.referencedColumn}
                        </Typography>
                      ).join(', ')}
                    </li>
                  ))}
                </ul>
              </Box>

              <Typography variant="body2" sx={{ ml: 5, fontStyle: 'italic', color: 'text.secondary' }}>
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
              const isDateTimeField = typeof inputType === 'string' && inputType === 'datetime-local';

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
                  sx={{
                    mb: 1,
                    // Fix for datetime-local fields to prevent label overlap
                    ...(isDateTimeField && {
                      '& .MuiInputLabel-root': {
                        transform: 'translate(14px, -9px) scale(0.75)',
                        background: theme.palette.background.paper,
                        padding: '0 8px',
                      },
                      '& .MuiInputLabel-shrink': {
                        transform: 'translate(14px, -9px) scale(0.75)',
                      }
                    })
                  }}
                  InputLabelProps={{
                    shrink: isDateTimeField ? true : undefined,
                  }}
                />
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          px: 3,
          py: 2
        }}>
          <Button
            onClick={() => {
              setIsAddDialogOpen(false);
              setError(null);
              setNewRecord({});
            }}
            variant="outlined"
            sx={{
              borderRadius: 2,
              px: 3,
              fontWeight: 500
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddRecord}
            variant="contained"
            color="primary"
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
            Add Record
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onClose={handleCancelEditing}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }
        }}
      >
        <DialogTitle sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          py: 2,
          px: 3
        }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Edit Field
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ py: 3, px: 3 }}>
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

          {editingCell && editingRow && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                Editing {editingCell.field} for record with {primaryKey} = {editingRow[primaryKey]}
              </Typography>

              <Box sx={{
                p: 2,
                bgcolor: 'background.paper',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                mb: 3
              }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Current Value:</strong> {
                    editingRow[editingCell.field] === null || editingRow[editingCell.field] === undefined
                      ? <span style={{ fontStyle: 'italic', color: '#999' }}>(null)</span>
                      : formatValue(editingRow[editingCell.field], '')
                  }
                </Typography>
              </Box>

              {(() => {
                // Get the column definition
                const column = tableStructure.find(c => c.Field === editingCell.field);

                // Check if this is a foreign key field
                if (column && column.isForeignKey && foreignKeyData && foreignKeyData[column.Field]) {
                  const fkData = foreignKeyData[column.Field];
                  return (
                    <FormControl
                      fullWidth
                      sx={{ mt: 1 }}
                    >
                      <InputLabel id={`edit-${column.Field}-label`}>
                        New Value
                      </InputLabel>
                      <Select
                        labelId={`edit-${column.Field}-label`}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        label="New Value"
                      >
                        <MenuItem value="">
                          <em>None</em>
                        </MenuItem>
                        {fkData.data && fkData.data.map(item => (
                          <MenuItem
                            key={item[fkData.referencedColumn]}
                            value={String(item[fkData.referencedColumn])}
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
                        Foreign key to {fkData.referencedTable}.{fkData.referencedColumn}
                      </FormHelperText>
                    </FormControl>
                  );
                }

                // For regular fields, determine the input type
                const inputType = column ? getEditorType(column.Type) : 'text';
                const isDateTimeField = typeof inputType === 'string' && inputType === 'datetime-local';

                return (
                  <TextField
                    label="New Value"
                    variant="outlined"
                    fullWidth
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    autoFocus
                    type={typeof inputType === 'string' ? inputType : 'text'}
                    multiline={column && (column.Type.includes('text') || column.Type.includes('json'))}
                    rows={column && (column.Type.includes('text') || column.Type.includes('json')) ? 4 : 1}
                    sx={{
                      mt: 1,
                      // Fix for datetime-local fields to prevent label overlap
                      ...(isDateTimeField && {
                        '& .MuiInputLabel-root': {
                          transform: 'translate(14px, -9px) scale(0.75)',
                          background: theme.palette.background.paper,
                          padding: '0 8px',
                        },
                        '& .MuiInputLabel-shrink': {
                          transform: 'translate(14px, -9px) scale(0.75)',
                        }
                      })
                    }}
                    InputLabelProps={{
                      shrink: isDateTimeField ? true : undefined,
                    }}
                    helperText={column ? `Field type: ${column.Type}` : ''}
                  />
                );
              })()}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          px: 3,
          py: 2
        }}>
          <Button
            onClick={handleCancelEditing}
            variant="outlined"
            sx={{
              borderRadius: 2,
              px: 3,
              fontWeight: 500
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleSaveEdit(editingRow)}
            variant="contained"
            color="primary"
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
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default DataGrid;
