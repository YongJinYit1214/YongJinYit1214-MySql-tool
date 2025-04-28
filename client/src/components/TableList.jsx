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
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Divider,
  Switch,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { getTables, executeQuery, getTableStructure } from '../services/api';

const TableList = ({ database, onTableSelect }) => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [tableToDelete, setTableToDelete] = useState('');
  const [columns, setColumns] = useState([
    { name: 'id', type: 'INT', primaryKey: true, autoIncrement: true, notNull: true, foreignKey: false }
  ]);
  const [availableTables, setAvailableTables] = useState([]);
  const [tableStructures, setTableStructures] = useState({});
  // Add a key to force re-render when needed
  const [forceUpdateKey, setForceUpdateKey] = useState(0);
  const [createTableError, setCreateTableError] = useState(null);

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

  const handleOpenCreateDialog = async () => {
    setNewTableName('');
    setColumns([
      { name: 'id', type: 'INT', primaryKey: true, autoIncrement: true, notNull: true, foreignKey: false }
    ]);
    setCreateTableError(null);

    try {
      // Show the dialog first to improve perceived performance
      setIsCreateDialogOpen(true);

      // Fetch available tables for foreign key references
      const tablesList = await getTables();
      console.log("Available tables:", tablesList);
      setAvailableTables(tablesList);

      // Fetch structure for each table
      const structures = {};
      for (const table of tablesList) {
        try {
          const structureResponse = await getTableStructure(table);
          console.log(`Structure for ${table}:`, structureResponse);

          // Handle the response format which might be different
          if (structureResponse.columns) {
            structures[table] = structureResponse.columns;
          } else {
            structures[table] = structureResponse;
          }

          console.log(`Processed structure for ${table}:`, structures[table]);
        } catch (err) {
          console.error(`Error fetching structure for table ${table}:`, err);
        }
      }

      console.log("All table structures:", structures);
      setTableStructures(structures);
    } catch (err) {
      console.error('Error fetching tables for foreign key references:', err);
    }
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
  };

  const handleOpenDeleteDialog = (table) => {
    setTableToDelete(table);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
  };

  const handleAddColumn = () => {
    setColumns([...columns, {
      name: '',
      type: 'VARCHAR(255)',
      primaryKey: false,
      autoIncrement: false,
      notNull: false,
      foreignKey: false,
      referencedTable: '',
      referencedColumn: ''
    }]);
  };

  const handleRemoveColumn = (index) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const handleColumnChange = (index, field, value) => {
    console.log(`Changing column ${index}, field: ${field}, value:`, value);
    console.log("Current columns state:", JSON.stringify(columns));
    console.log("Current column being updated:", JSON.stringify(columns[index]));

    try {
      // Create a new array with the updated column
      const newColumns = [...columns];

      // Create a new object for the updated column to ensure immutability
      const updatedColumn = { ...newColumns[index] };

      // Update the specific field
      updatedColumn[field] = value;

      // Replace the column in the array
      newColumns[index] = updatedColumn;

      console.log("Updated column object:", JSON.stringify(updatedColumn));
      console.log("New columns array:", JSON.stringify(newColumns));

      // Update the state
      setColumns(newColumns);

      // Log a confirmation
      console.log(`Column ${index} ${field} updated to:`, value);

      // Force a re-render by updating a dummy state if needed
      // This is a hack but might help diagnose the issue
      setCreateTableError(null);
    } catch (error) {
      console.error("Error in handleColumnChange:", error);
      alert(`Error updating column: ${error.message}`);
    }
  };

  const handleCreateTable = async () => {
    console.log("Starting table creation process");
    console.log("Current columns state:", columns);

    setCreateTableError(null);

    if (!newTableName.trim()) {
      setCreateTableError('Table name is required');
      return;
    }

    if (tables.includes(newTableName)) {
      setCreateTableError('Table already exists');
      return;
    }

    if (columns.length === 0) {
      setCreateTableError('At least one column is required');
      return;
    }

    // Validate column names
    for (const column of columns) {
      if (!column.name.trim()) {
        setCreateTableError('All columns must have a name');
        return;
      }
    }

    // Check if there's at least one primary key
    if (!columns.some(col => col.primaryKey)) {
      // Add a primary key if none exists
      const newColumns = [...columns];

      // If there's an 'id' column, make it the primary key
      const idColumnIndex = newColumns.findIndex(col =>
        col.name.toLowerCase() === 'id' &&
        col.type.toUpperCase().includes('INT')
      );

      if (idColumnIndex >= 0) {
        console.log(`Making column ${newColumns[idColumnIndex].name} a primary key`);
        newColumns[idColumnIndex] = {
          ...newColumns[idColumnIndex],
          primaryKey: true
        };
        setColumns(newColumns);
      } else {
        setCreateTableError('At least one column must be a primary key');
        return;
      }
    }

    // Validate foreign key configurations
    console.log("Validating foreign key configurations");
    for (const column of columns) {
      console.log(`Checking column ${column.name}, foreignKey=${column.foreignKey}`);

      if (column.foreignKey) {
        console.log(`Column ${column.name} is a foreign key`);
        console.log(`Referenced table: ${column.referencedTable}`);
        console.log(`Referenced column: ${column.referencedColumn}`);

        if (!column.referencedTable) {
          setCreateTableError(`Column "${column.name}" is marked as a foreign key but has no referenced table selected`);
          return;
        }

        if (!column.referencedColumn) {
          setCreateTableError(`Column "${column.name}" is marked as a foreign key but has no referenced column selected`);
          return;
        }

        // Ensure the column type matches the referenced column type
        if (tableStructures[column.referencedTable]) {
          console.log(`Found table structure for ${column.referencedTable}`);
          console.log(`Table structure:`, tableStructures[column.referencedTable]);

          let referencedColType = null;

          // Handle array format
          if (Array.isArray(tableStructures[column.referencedTable])) {
            console.log(`Table structure is an array`);
            const referencedCol = tableStructures[column.referencedTable].find(col => col.Field === column.referencedColumn);
            if (referencedCol) {
              referencedColType = referencedCol.Type;
              console.log(`Found referenced column type: ${referencedColType}`);
            } else {
              console.log(`Could not find column ${column.referencedColumn} in table ${column.referencedTable}`);
            }
          }
          // Handle object format
          else if (typeof tableStructures[column.referencedTable] === 'object') {
            console.log(`Table structure is an object`);
            // Try to find the column in the object
            const referencedCol = tableStructures[column.referencedTable][column.referencedColumn];
            if (referencedCol && referencedCol.Type) {
              referencedColType = referencedCol.Type;
              console.log(`Found referenced column type: ${referencedColType}`);
            } else {
              console.log(`Could not find column ${column.referencedColumn} in table ${column.referencedTable}`);
            }
          }

          // If we found the type, check compatibility instead of exact match
          if (referencedColType) {
            // For INT types, allow any INT variation
            const isIntType = (type) =>
              type.toUpperCase().includes('INT') ||
              type.toUpperCase().includes('INTEGER');

            // For VARCHAR/CHAR types, allow any string type
            const isStringType = (type) =>
              type.toUpperCase().includes('VARCHAR') ||
              type.toUpperCase().includes('CHAR') ||
              type.toUpperCase().includes('TEXT');

            // For DECIMAL/NUMERIC types
            const isNumericType = (type) =>
              type.toUpperCase().includes('DECIMAL') ||
              type.toUpperCase().includes('NUMERIC') ||
              type.toUpperCase().includes('FLOAT') ||
              type.toUpperCase().includes('DOUBLE');

            // Check if types are compatible
            const isCompatible =
              (isIntType(column.type) && isIntType(referencedColType)) ||
              (isStringType(column.type) && isStringType(referencedColType)) ||
              (isNumericType(column.type) && isNumericType(referencedColType)) ||
              column.type.toUpperCase() === referencedColType.toUpperCase();

            if (!isCompatible) {
              setCreateTableError(`Column "${column.name}" type (${column.type}) is not compatible with referenced column type (${referencedColType})`);
              return;
            }

            // Log the compatibility check
            console.log(`Type compatibility check for ${column.name}: ${column.type} is compatible with ${referencedColType}`);
          }
        }
      }
    }

    try {
      console.log("Starting SQL generation");
      setLoading(true);

      // Build CREATE TABLE SQL
      let sql = `CREATE TABLE \`${newTableName}\` (\n`;

      // Add columns
      const columnDefinitions = columns.map(col => {
        let def = `\`${col.name}\` ${col.type}`;

        if (col.notNull) {
          def += ' NOT NULL';
        }

        if (col.autoIncrement) {
          def += ' AUTO_INCREMENT';
        }

        return def;
      });

      sql += columnDefinitions.join(',\n');

      // Add primary key
      const primaryKeys = columns.filter(col => col.primaryKey).map(col => `\`${col.name}\``);
      if (primaryKeys.length > 0) {
        console.log("Adding primary key:", primaryKeys);
        sql += `,\nPRIMARY KEY (${primaryKeys.join(', ')})`;
      }

      // Add foreign key constraints
      const foreignKeys = columns.filter(col => col.foreignKey && col.referencedTable && col.referencedColumn);
      console.log("Foreign key columns:", foreignKeys);

      if (foreignKeys.length > 0) {
        console.log("Adding foreign key constraints");

        for (let i = 0; i < foreignKeys.length; i++) {
          const fk = foreignKeys[i];
          console.log(`Processing foreign key for column ${fk.name}`);

          // Generate a unique constraint name to avoid conflicts
          const constraintName = `fk_${newTableName}_${fk.name}_${i}`;

          const constraint = `,\nCONSTRAINT \`${constraintName}\` FOREIGN KEY (\`${fk.name}\`) REFERENCES \`${fk.referencedTable}\`(\`${fk.referencedColumn}\`)`;
          console.log("Adding constraint:", constraint);
          sql += constraint;
        }
      }

      sql += '\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci';

      // Log the final SQL
      console.log("Final SQL:", sql);

      try {
        // Execute the query
        const result = await executeQuery(sql);
        console.log("Query execution result:", result);

        // Refresh the table list
        await fetchTables();
      } catch (queryError) {
        console.error("SQL execution error:", queryError);
        throw queryError;
      }

      // Close the dialog
      setIsCreateDialogOpen(false);
    } catch (err) {
      console.error('Error creating table:', err);

      // Extract the most useful error message
      let errorMessage = 'Failed to create table';

      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      // If it's a MySQL error, it often contains useful information after a colon
      if (typeof errorMessage === 'string' && errorMessage.includes('Error:')) {
        const parts = errorMessage.split('Error:');
        if (parts.length > 1) {
          errorMessage = parts[1].trim();
        }
      }

      setCreateTableError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTable = async () => {
    try {
      setLoading(true);

      // Execute DROP TABLE query
      await executeQuery(`DROP TABLE \`${tableToDelete}\``);

      // Refresh the table list
      await fetchTables();

      // If the deleted table was selected, clear the selection
      if (selectedTable === tableToDelete) {
        setSelectedTable(null);
        onTableSelect(null);
      }

      // Close the dialog
      setIsDeleteDialogOpen(false);
    } catch (err) {
      console.error('Error deleting table:', err);
      setError(`Failed to delete table: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
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
    <Paper sx={{ height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{
        p: 2,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Tables in {database}
        </Typography>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateDialog}
          sx={{
            borderRadius: 2,
            fontWeight: 500,
            boxShadow: 'none',
            px: 2,
            py: 1,
            width: '100%',
            '&:hover': {
              boxShadow: '0 4px 8px rgba(37, 99, 235, 0.2)'
            }
          }}
          disableElevation
        >
          Create Table
        </Button>
      </Box>

      {tables.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No tables found in this database
          </Typography>
        </Box>
      ) : (
        <List sx={{ flexGrow: 1, overflow: 'auto' }}>
          {tables.map((table) => (
            <ListItem
              key={table}
              disablePadding
              secondaryAction={
                <Tooltip title="Delete Table">
                  <IconButton
                    edge="end"
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDeleteDialog(table);
                    }}
                    sx={{ mr: 1 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              }
            >
              <ListItemButton
                selected={selectedTable === table}
                onClick={() => handleTableClick(table)}
                sx={{
                  borderRadius: 1,
                  mx: 1,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.lighter',
                    '&:hover': {
                      backgroundColor: 'primary.lighter'
                    }
                  }
                }}
              >
                <ListItemText
                  primary={
                    <Typography
                      sx={{
                        fontWeight: selectedTable === table ? 600 : 400,
                        color: selectedTable === table ? 'primary.main' : 'inherit'
                      }}
                    >
                      {table}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}

      {/* Create Table Dialog */}
      <Dialog
        open={isCreateDialogOpen}
        onClose={handleCloseCreateDialog}
        maxWidth="md"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            py: 2,
            px: 3
          }}
          // Use component prop to avoid nesting h5 inside h2
          component="div"
        >
          <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
            Create New Table
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ py: 3, px: 3 }}>
          {createTableError && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)'
              }}
              variant="filled"
            >
              {createTableError}
            </Alert>
          )}

          <TextField
            label="Table Name"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            fullWidth
            margin="normal"
            required
            sx={{ mb: 3 }}
          />

          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Columns
          </Typography>

          <Box sx={{ mb: 2 }}>
            {columns.map((column, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  mb: 3,
                  p: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  bgcolor: 'background.paper'
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Column #{index + 1}
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
                  <TextField
                    label="Name"
                    value={column.name}
                    onChange={(e) => handleColumnChange(index, 'name', e.target.value)}
                    required
                    sx={{ flex: 2, minWidth: { xs: '100%', md: 'auto' } }}
                  />

                  <Box sx={{ flex: 2, minWidth: { xs: '100%', md: 'auto' } }}>
                    <TextField
                      label="Type"
                      value={column.type}
                      onChange={(e) => handleColumnChange(index, 'type', e.target.value)}
                      fullWidth
                      helperText={
                        <Box component="span" sx={{ display: 'flex', flexDirection: 'column', fontSize: '0.75rem' }}>
                          <span>Examples: INT, VARCHAR(255), TEXT, DECIMAL(10,2)</span>
                          <Box component="span" sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleColumnChange(index, 'type', 'INT')}
                              sx={{ minWidth: 'auto', py: 0, px: 1, fontSize: '0.7rem' }}
                            >
                              INT
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleColumnChange(index, 'type', 'VARCHAR(255)')}
                              sx={{ minWidth: 'auto', py: 0, px: 1, fontSize: '0.7rem' }}
                            >
                              VARCHAR
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleColumnChange(index, 'type', 'TEXT')}
                              sx={{ minWidth: 'auto', py: 0, px: 1, fontSize: '0.7rem' }}
                            >
                              TEXT
                            </Button>
                          </Box>
                        </Box>
                      }
                    />
                  </Box>
                </Box>

                <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Column Properties
                  </Typography>

                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 2
                  }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        borderColor: column.primaryKey ? 'primary.main' : 'divider',
                        bgcolor: column.primaryKey ? 'primary.lighter' : 'background.paper'
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={column.primaryKey}
                            onChange={(e) => {
                              // If setting as primary key, disable foreign key
                              if (e.target.checked) {
                                handleColumnChange(index, 'foreignKey', false);
                              }
                              handleColumnChange(index, 'primaryKey', e.target.checked);
                            }}
                            disabled={column.foreignKey} // Can't be both PK and FK
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>Primary Key</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Uniquely identifies each record
                            </Typography>
                          </Box>
                        }
                        sx={{ m: 0 }}
                      />

                      {column.primaryKey && (
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={column.autoIncrement}
                              onChange={(e) => handleColumnChange(index, 'autoIncrement', e.target.checked)}
                              disabled={!column.primaryKey || !column.type.toUpperCase().includes('INT')}
                            />
                          }
                          label="Auto Increment"
                          sx={{ mt: 1, ml: 3 }}
                        />
                      )}
                    </Paper>

                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        borderColor: column.foreignKey ? 'primary.main' : 'divider',
                        bgcolor: column.foreignKey ? 'primary.lighter' : 'background.paper'
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={column.foreignKey}
                            onChange={(e) => {
                              // If setting as foreign key, disable primary key and auto increment
                              if (e.target.checked) {
                                handleColumnChange(index, 'primaryKey', false);
                                handleColumnChange(index, 'autoIncrement', false);
                              }
                              handleColumnChange(index, 'foreignKey', e.target.checked);
                            }}
                            disabled={column.primaryKey} // Can't be both PK and FK
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>Foreign Key</Typography>
                            <Typography variant="body2" color="text.secondary">
                              References another table
                            </Typography>
                          </Box>
                        }
                        sx={{ m: 0 }}
                      />
                    </Paper>

                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        borderColor: column.notNull ? 'primary.main' : 'divider',
                        bgcolor: column.notNull ? 'primary.lighter' : 'background.paper'
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={column.notNull}
                            onChange={(e) => handleColumnChange(index, 'notNull', e.target.checked)}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>NOT NULL</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Requires a value
                            </Typography>
                          </Box>
                        }
                        sx={{ m: 0 }}
                      />
                    </Paper>
                  </Box>
                </Box>

                {/* Foreign Key Options */}
                {column.foreignKey && (
                  <Box
                    key={`fk-config-${index}-${forceUpdateKey}`}
                    sx={{
                      mt: 3,
                      p: 3,
                      bgcolor: 'background.paper',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'primary.light',
                      width: '100%',
                      gridColumn: '1 / -1' // Make it span all columns
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                      Foreign Key Configuration for {column.name}
                    </Typography>

                    {/* Current selection display */}
                    <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.lighter', borderRadius: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        Current Selection:
                      </Typography>
                      <Typography variant="body2">
                        Table: <strong>{column.referencedTable || 'None'}</strong>
                      </Typography>
                      <Typography variant="body2">
                        Column: <strong>{column.referencedColumn || 'None'}</strong>
                      </Typography>
                    </Box>

                    <Box sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3
                    }}>
                      {/* Table Selection */}
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Referenced Table
                        </Typography>

                        <Box sx={{ border: '1px solid #ccc', borderRadius: 2, p: 1, bgcolor: '#f9f9f9' }}>
                          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                            Current selection: {column.referencedTable || 'None'}
                          </Typography>

                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {availableTables && availableTables.length > 0 ? (
                              availableTables.map(table => (
                                <Button
                                  key={table}
                                  variant={column.referencedTable === table ? "contained" : "outlined"}
                                  size="small"
                                  onClick={() => {
                                    console.log("Table button clicked:", table);

                                    try {
                                      // DIRECT STATE UPDATE - bypassing handleColumnChange
                                      const newColumns = [...columns];

                                      // Create a completely new object for the column
                                      newColumns[index] = {
                                        ...newColumns[index],
                                        referencedTable: table,
                                        referencedColumn: ''
                                      };

                                      // Update state directly
                                      setColumns(newColumns);

                                      // Force a re-render
                                      setForceUpdateKey(prev => prev + 1);

                                      // Show a notification
                                      setCreateTableError(`Selected table: ${table}`);
                                      setTimeout(() => setCreateTableError(null), 2000);
                                    } catch (error) {
                                      console.error("Error updating table selection:", error);
                                      setCreateTableError(`Error: ${error.message}`);
                                    }
                                  }}
                                  sx={{
                                    borderRadius: 1,
                                    textTransform: 'none',
                                    minWidth: 'auto',
                                    border: column.referencedTable === table ? '2px solid #1976d2' : '1px solid rgba(25, 118, 210, 0.5)',
                                    fontWeight: column.referencedTable === table ? 'bold' : 'normal',
                                    bgcolor: column.referencedTable === table ? 'primary.light' : 'background.paper',
                                    color: column.referencedTable === table ? 'white' : 'inherit',
                                    '&:hover': {
                                      bgcolor: column.referencedTable === table ? 'primary.main' : 'background.paper',
                                    }
                                  }}
                                >
                                  {table}
                                </Button>
                              ))
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No tables available
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Box>

                      {/* Column Selection - Only show if a table is selected */}
                      {column.referencedTable && (
                        <Box>
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Referenced Column
                          </Typography>

                          <Box sx={{ border: '1px solid #ccc', borderRadius: 2, p: 1, bgcolor: '#f9f9f9' }}>
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                              Current selection: {column.referencedColumn || 'None'}
                            </Typography>

                            {/* Show message if table structure is not available */}
                            {!tableStructures[column.referencedTable] && (
                              <Typography variant="body2" color="text.secondary">
                                Loading columns...
                              </Typography>
                            )}

                            {/* Handle array format */}
                            {tableStructures[column.referencedTable] && Array.isArray(tableStructures[column.referencedTable]) && (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {tableStructures[column.referencedTable].map(col => (
                                  <Button
                                    key={col.Field}
                                    variant={column.referencedColumn === col.Field ? "contained" : "outlined"}
                                    size="small"
                                    onClick={() => {
                                      console.log("Column button clicked:", col.Field);

                                      try {
                                        // DIRECT STATE UPDATE - bypassing handleColumnChange
                                        const newColumns = [...columns];

                                        // Create a completely new object for the column
                                        newColumns[index] = {
                                          ...newColumns[index],
                                          referencedColumn: col.Field
                                        };

                                        // Update state directly
                                        setColumns(newColumns);

                                        // Force a re-render
                                        setForceUpdateKey(prev => prev + 1);

                                        // Show a notification
                                        setCreateTableError(`Selected column: ${col.Field}`);
                                        setTimeout(() => setCreateTableError(null), 2000);
                                      } catch (error) {
                                        console.error("Error selecting column:", error);
                                        setCreateTableError(`Error: ${error.message}`);
                                      }
                                    }}
                                    sx={{
                                      borderRadius: 1,
                                      textTransform: 'none',
                                      minWidth: 'auto',
                                      border: column.referencedColumn === col.Field ? '2px solid #1976d2' : '1px solid rgba(25, 118, 210, 0.5)',
                                      fontWeight: column.referencedColumn === col.Field ? 'bold' : 'normal',
                                      bgcolor: column.referencedColumn === col.Field ? 'primary.light' : 'background.paper',
                                      color: column.referencedColumn === col.Field ? 'white' : 'inherit',
                                      '&:hover': {
                                        bgcolor: column.referencedColumn === col.Field ? 'primary.main' : 'background.paper',
                                      }
                                    }}
                                  >
                                    {col.Field} ({col.Type})
                                  </Button>
                                ))}
                              </Box>
                            )}

                            {/* Fallback if structure is not in expected format */}
                            {tableStructures[column.referencedTable] && !Array.isArray(tableStructures[column.referencedTable]) && (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {Object.entries(tableStructures[column.referencedTable]).map(([field, details]) => (
                                  <Button
                                    key={field}
                                    variant={column.referencedColumn === field ? "contained" : "outlined"}
                                    size="small"
                                    onClick={() => {
                                      console.log("Column button clicked (object format):", field);

                                      try {
                                        // DIRECT STATE UPDATE - bypassing handleColumnChange
                                        const newColumns = [...columns];

                                        // Create a completely new object for the column
                                        newColumns[index] = {
                                          ...newColumns[index],
                                          referencedColumn: field
                                        };

                                        // Update state directly
                                        setColumns(newColumns);

                                        // Force a re-render
                                        setForceUpdateKey(prev => prev + 1);

                                        // Show a notification
                                        setCreateTableError(`Selected column: ${field}`);
                                        setTimeout(() => setCreateTableError(null), 2000);
                                      } catch (error) {
                                        console.error("Error selecting column:", error);
                                        setCreateTableError(`Error: ${error.message}`);
                                      }
                                    }}
                                    sx={{
                                      borderRadius: 1,
                                      textTransform: 'none',
                                      minWidth: 'auto',
                                      border: column.referencedColumn === field ? '2px solid #1976d2' : '1px solid rgba(25, 118, 210, 0.5)',
                                      fontWeight: column.referencedColumn === field ? 'bold' : 'normal',
                                      bgcolor: column.referencedColumn === field ? 'primary.light' : 'background.paper',
                                      color: column.referencedColumn === field ? 'white' : 'inherit',
                                      '&:hover': {
                                        bgcolor: column.referencedColumn === field ? 'primary.main' : 'background.paper',
                                      }
                                    }}
                                  >
                                    {field} ({typeof details === 'object' && details.Type ? details.Type : 'unknown'})
                                  </Button>
                                ))}
                              </Box>
                            )}

                            {/* Show message if no columns are available */}
                            {tableStructures[column.referencedTable] &&
                             ((Array.isArray(tableStructures[column.referencedTable]) && tableStructures[column.referencedTable].length === 0) ||
                              (!Array.isArray(tableStructures[column.referencedTable]) && Object.keys(tableStructures[column.referencedTable]).length === 0)) && (
                              <Typography variant="body2" color="text.secondary">
                                No columns available in this table
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      )}
                    </Box>

                    <Box sx={{ mt: 2, color: 'text.secondary', fontSize: '0.875rem' }}>
                      <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                        This will create a foreign key relationship from this column to the selected table and column.
                        Make sure the data types match between the columns.
                      </Typography>
                    </Box>
                  </Box>
                )}

                {columns.length > 1 && (
                  <IconButton
                    color="error"
                    onClick={() => handleRemoveColumn(index)}
                    sx={{ alignSelf: 'center' }}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
            ))}
          </Box>

          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddColumn}
            sx={{ mb: 2 }}
          >
            Add Column
          </Button>
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
            sx={{
              borderRadius: 2,
              px: 3,
              fontWeight: 500
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateTable}
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
            Create Table
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Table Dialog */}
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
        <DialogTitle sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          py: 2,
          px: 3
        }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'error.main' }}>
            Delete Table
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ py: 3, px: 3 }}>
          <Alert
            severity="warning"
            sx={{
              mb: 3,
              borderRadius: 2
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              Are you sure you want to delete the table <strong>{tableToDelete}</strong>?
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              This action cannot be undone. All data in this table will be permanently lost.
            </Typography>
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
            sx={{
              borderRadius: 2,
              px: 3,
              fontWeight: 500
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteTable}
            variant="contained"
            color="error"
            sx={{
              borderRadius: 2,
              px: 3,
              fontWeight: 600,
              boxShadow: 'none'
            }}
            disableElevation
          >
            Delete Table
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default TableList;
