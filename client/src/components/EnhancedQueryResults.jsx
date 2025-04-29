import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  TextField,
  IconButton,
  Tooltip,
  Button,
  Menu,
  MenuItem,
  Chip,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  FilterAlt as FilterIcon,
  Download as DownloadIcon,
  BarChart as ChartIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { formatValue } from '../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from 'recharts';

const EnhancedQueryResults = ({ result, loading, error }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('');
  const [order, setOrder] = useState('asc');
  const [filters, setFilters] = useState({});
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
  const [filterColumn, setFilterColumn] = useState('');
  const [showChart, setShowChart] = useState(false);
  const [chartType, setChartType] = useState('bar');
  const [chartMenuAnchor, setChartMenuAnchor] = useState(null);
  const [chartConfig, setChartConfig] = useState({
    xAxis: '',
    yAxis: ''
  });
  const [searchText, setSearchText] = useState('');
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);

  // Determine if the result contains aggregate data (e.g., COUNT, SUM, AVG)
  const hasAggregateData = useMemo(() => {
    if (!result || !Array.isArray(result) || result.length === 0) return false;
    
    const columns = Object.keys(result[0]);
    const aggregateFunctions = ['count', 'sum', 'avg', 'min', 'max'];
    
    return columns.some(col => 
      aggregateFunctions.some(fn => 
        col.toLowerCase().includes(fn) || 
        col.includes('(') || 
        col.includes(')')
      )
    );
  }, [result]);

  // Get columns from the result
  const columns = useMemo(() => {
    if (!result || !Array.isArray(result) || result.length === 0) return [];
    return Object.keys(result[0]);
  }, [result]);

  // Apply sorting and filtering to the result
  const processedData = useMemo(() => {
    if (!result || !Array.isArray(result) || result.length === 0) return [];
    
    // Apply filters
    let filteredData = result;
    if (Object.keys(filters).length > 0) {
      filteredData = result.filter(row => {
        return Object.entries(filters).every(([column, value]) => {
          if (!value) return true;
          const cellValue = row[column];
          if (cellValue === null || cellValue === undefined) return false;
          return String(cellValue).toLowerCase().includes(value.toLowerCase());
        });
      });
    }
    
    // Apply global search
    if (searchText) {
      filteredData = filteredData.filter(row => {
        return Object.values(row).some(value => {
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(searchText.toLowerCase());
        });
      });
    }
    
    // Apply sorting
    if (orderBy) {
      filteredData = [...filteredData].sort((a, b) => {
        const aValue = a[orderBy];
        const bValue = b[orderBy];
        
        // Handle null/undefined values
        if (aValue === null || aValue === undefined) return order === 'asc' ? -1 : 1;
        if (bValue === null || bValue === undefined) return order === 'asc' ? 1 : -1;
        
        // Compare based on data type
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return order === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        // Default string comparison
        const aString = String(aValue).toLowerCase();
        const bString = String(bValue).toLowerCase();
        return order === 'asc' 
          ? aString.localeCompare(bString)
          : bString.localeCompare(aString);
      });
    }
    
    return filteredData;
  }, [result, filters, orderBy, order, searchText]);

  // Paginated data
  const paginatedData = useMemo(() => {
    return processedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [processedData, page, rowsPerPage]);

  // Chart data preparation
  const chartData = useMemo(() => {
    if (!showChart || !chartConfig.xAxis || !chartConfig.yAxis) return [];
    
    // Group data by xAxis and calculate yAxis values
    const groupedData = {};
    processedData.forEach(row => {
      const xValue = row[chartConfig.xAxis];
      const yValue = parseFloat(row[chartConfig.yAxis]);
      
      if (xValue !== null && xValue !== undefined && !isNaN(yValue)) {
        const key = String(xValue);
        if (!groupedData[key]) {
          groupedData[key] = { name: key, value: 0 };
        }
        groupedData[key].value += yValue;
      }
    });
    
    return Object.values(groupedData);
  }, [showChart, chartConfig, processedData]);

  // Handle sort request
  const handleRequestSort = (column) => {
    const isAsc = orderBy === column && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(column);
  };

  // Handle filter change
  const handleFilterChange = (column, value) => {
    setFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  // Handle filter menu open
  const handleFilterMenuOpen = (event, column) => {
    setFilterMenuAnchor(event.currentTarget);
    setFilterColumn(column);
  };

  // Handle filter menu close
  const handleFilterMenuClose = () => {
    setFilterMenuAnchor(null);
  };

  // Handle chart menu open
  const handleChartMenuOpen = (event) => {
    setChartMenuAnchor(event.currentTarget);
  };

  // Handle chart menu close
  const handleChartMenuClose = () => {
    setChartMenuAnchor(null);
  };

  // Handle export menu open
  const handleExportMenuOpen = (event) => {
    setExportMenuAnchor(event.currentTarget);
  };

  // Handle export menu close
  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  // Export data as CSV
  const exportAsCSV = () => {
    if (!processedData.length) return;
    
    const headers = columns.join(',');
    const rows = processedData.map(row => 
      columns.map(col => {
        const value = row[col];
        // Handle values that need quotes (strings with commas, etc.)
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value === null || value === undefined ? '' : value;
      }).join(',')
    ).join('\n');
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'query_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setExportMenuAnchor(null);
  };

  // Export data as JSON
  const exportAsJSON = () => {
    if (!processedData.length) return;
    
    const json = JSON.stringify(processedData, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'query_results.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setExportMenuAnchor(null);
  };

  // Reset all filters and sorting
  const resetFilters = () => {
    setFilters({});
    setOrderBy('');
    setOrder('asc');
    setSearchText('');
    setPage(0);
  };

  // Detect numeric columns for chart options
  const numericColumns = useMemo(() => {
    if (!result || !Array.isArray(result) || result.length === 0) return [];
    
    return columns.filter(col => {
      // Check if at least one non-null value is a number
      return result.some(row => {
        const value = row[col];
        return value !== null && value !== undefined && !isNaN(parseFloat(value));
      });
    });
  }, [result, columns]);

  // Configure chart
  const configureChart = (xAxis, yAxis) => {
    setChartConfig({ xAxis, yAxis });
    setShowChart(true);
    setChartMenuAnchor(null);
  };

  // Render the table header
  const renderTableHeader = () => {
    return (
      <TableHead>
        <TableRow>
          {columns.map((column) => (
            <TableCell
              key={column}
              sortDirection={orderBy === column ? order : false}
              sx={{ 
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                backgroundColor: 'background.paper',
                position: 'sticky',
                top: 0,
                zIndex: 1
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TableSortLabel
                  active={orderBy === column}
                  direction={orderBy === column ? order : 'asc'}
                  onClick={() => handleRequestSort(column)}
                >
                  {column}
                </TableSortLabel>
                
                {filters[column] && (
                  <Chip
                    size="small"
                    label={filters[column]}
                    onDelete={() => handleFilterChange(column, '')}
                    sx={{ ml: 1 }}
                  />
                )}
                
                <IconButton
                  size="small"
                  onClick={(e) => handleFilterMenuOpen(e, column)}
                  sx={{ ml: 0.5 }}
                >
                  <FilterIcon fontSize="small" />
                </IconButton>
              </Box>
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
    );
  };

  // Render the table body
  const renderTableBody = () => {
    if (paginatedData.length === 0) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={columns.length} align="center">
              <Typography variant="body2" color="text.secondary">
                No results found
              </Typography>
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }

    return (
      <TableBody>
        {paginatedData.map((row, rowIndex) => (
          <TableRow key={rowIndex} hover>
            {columns.map((column) => (
              <TableCell 
                key={`${rowIndex}-${column}`}
                sx={{ 
                  maxWidth: '300px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={formatValue(row[column])}
              >
                {row[column] === null || row[column] === undefined ? (
                  <span style={{ color: '#888', fontStyle: 'italic' }}>(null)</span>
                ) : (
                  formatValue(row[column])
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    );
  };

  // Render the chart
  const renderChart = () => {
    if (!showChart || chartData.length === 0) return null;

    return (
      <Box sx={{ height: 400, mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Chart: {chartConfig.yAxis} by {chartConfig.xAxis}
          </Typography>
          <IconButton onClick={() => setShowChart(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <ChartTooltip />
            <Legend />
            <Bar dataKey="value" fill="#8884d8" name={chartConfig.yAxis} />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    );
  };

  // If there's an error, show error message
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  // If loading, show loading indicator
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

  // If no results, show message
  if (!result || !Array.isArray(result) || result.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        {result ? 'Query executed successfully. No results to display.' : 'No results'}
      </Typography>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Query Results ({processedData.length} rows)
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* Search field */}
            <TextField
              size="small"
              placeholder="Search results..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
                endAdornment: searchText && (
                  <IconButton size="small" onClick={() => setSearchText('')}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )
              }}
              sx={{ width: 200 }}
            />
            
            {/* Chart button */}
            {numericColumns.length > 0 && (
              <>
                <Tooltip title="Visualize Data">
                  <Button
                    variant="outlined"
                    startIcon={<ChartIcon />}
                    onClick={handleChartMenuOpen}
                    size="small"
                  >
                    Chart
                  </Button>
                </Tooltip>
                
                <Menu
                  anchorEl={chartMenuAnchor}
                  open={Boolean(chartMenuAnchor)}
                  onClose={handleChartMenuClose}
                >
                  <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
                    Configure Chart
                  </Typography>
                  <Divider />
                  <Box sx={{ p: 2, width: 300 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      X-Axis (Category):
                    </Typography>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={chartConfig.xAxis}
                      onChange={(e) => setChartConfig(prev => ({ ...prev, xAxis: e.target.value }))}
                      sx={{ mb: 2 }}
                    >
                      {columns.map(col => (
                        <MenuItem key={col} value={col}>{col}</MenuItem>
                      ))}
                    </TextField>
                    
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Y-Axis (Value):
                    </Typography>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={chartConfig.yAxis}
                      onChange={(e) => setChartConfig(prev => ({ ...prev, yAxis: e.target.value }))}
                      sx={{ mb: 2 }}
                    >
                      {numericColumns.map(col => (
                        <MenuItem key={col} value={col}>{col}</MenuItem>
                      ))}
                    </TextField>
                    
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => configureChart(chartConfig.xAxis, chartConfig.yAxis)}
                      disabled={!chartConfig.xAxis || !chartConfig.yAxis}
                    >
                      Generate Chart
                    </Button>
                  </Box>
                </Menu>
              </>
            )}
            
            {/* Export button */}
            <Tooltip title="Export Data">
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportMenuOpen}
                size="small"
              >
                Export
              </Button>
            </Tooltip>
            
            <Menu
              anchorEl={exportMenuAnchor}
              open={Boolean(exportMenuAnchor)}
              onClose={handleExportMenuClose}
            >
              <MenuItem onClick={exportAsCSV}>Export as CSV</MenuItem>
              <MenuItem onClick={exportAsJSON}>Export as JSON</MenuItem>
            </Menu>
            
            {/* Reset filters button */}
            {(Object.keys(filters).length > 0 || orderBy || searchText) && (
              <Tooltip title="Reset Filters">
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={resetFilters}
                  size="small"
                >
                  Reset
                </Button>
              </Tooltip>
            )}
          </Box>
        </Box>
        
        {/* Filter menu */}
        <Menu
          anchorEl={filterMenuAnchor}
          open={Boolean(filterMenuAnchor)}
          onClose={handleFilterMenuClose}
        >
          <Box sx={{ p: 2, width: 250 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Filter: {filterColumn}
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Filter value..."
              value={filters[filterColumn] || ''}
              onChange={(e) => handleFilterChange(filterColumn, e.target.value)}
              autoFocus
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                size="small"
                onClick={() => {
                  handleFilterChange(filterColumn, '');
                  handleFilterMenuClose();
                }}
                sx={{ mr: 1 }}
              >
                Clear
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleFilterMenuClose}
              >
                Apply
              </Button>
            </Box>
          </Box>
        </Menu>
        
        {/* Show chart if enabled */}
        {renderChart()}
        
        {/* Results table */}
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            {renderTableHeader()}
            {renderTableBody()}
          </Table>
        </TableContainer>
        
        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={processedData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>
      
      {/* Show hint for aggregate data */}
      {hasAggregateData && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            This query contains aggregate functions (COUNT, SUM, AVG, etc.). You can visualize this data using the Chart button.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default EnhancedQueryResults;
