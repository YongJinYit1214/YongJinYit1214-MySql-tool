import { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Tabs,
  Tab,
  Typography,
  AppBar,
  Toolbar,
  Button,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import DatabaseSelector from '../components/DatabaseSelector';
import TableList from '../components/TableList';
import DataGrid from '../components/DataGrid';
import QueryEditor from '../components/QueryEditor';

const MainPage = ({ toggleColorMode, mode }) => {
  const [database, setDatabase] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const theme = useTheme();

  const handleDatabaseSelected = (db) => {
    setDatabase(db);
    setSelectedTable(null);
  };

  const handleTableSelect = (table) => {
    setSelectedTable(table);
    setActiveTab(0); // Switch to data tab when selecting a table
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <StorageIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            MySQL Visualization Tool
          </Typography>

          {/* Theme toggle button */}
          <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
            <IconButton
              onClick={toggleColorMode}
              color="inherit"
              sx={{ mr: 2 }}
            >
              {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
            </IconButton>
          </Tooltip>

          {database && (
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<ArrowBackIcon />}
              onClick={() => setDatabase(null)}
              sx={{
                borderColor: 'rgba(255,255,255,0.5)',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.8)',
                  backgroundColor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              Back to Database Selection
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ flexGrow: 1, py: 1, display: 'flex', flexDirection: 'column' }}>
        {!database ? (
          <DatabaseSelector onDatabaseSelected={handleDatabaseSelected} />
        ) : (
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Grid container spacing={1} sx={{ flexGrow: 1, height: 'calc(100% - 10px)', overflowX: 'auto', display: 'flex', flexWrap: 'nowrap' }}>
              {/* Sidebar with table list */}
              <Grid item xs={12} md={3} lg={2} sx={{ height: '100%', position: 'sticky', left: 0 }}>
                <TableList
                  database={database}
                  onTableSelect={handleTableSelect}
                />
              </Grid>

              {/* Main content area */}
              <Grid item xs={12} md={9} lg={10} sx={{ height: '100%', overflowX: 'auto' }}>
                <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                      value={activeTab}
                      onChange={handleTabChange}
                      sx={{ minHeight: '40px' }}
                    >
                      <Tab label="Data" sx={{ py: 0.5, minHeight: '40px' }} />
                      <Tab label="SQL Query" sx={{ py: 0.5, minHeight: '40px' }} />
                    </Tabs>
                  </Box>

                  <Box sx={{ flexGrow: 1, p: 0, height: 'calc(100% - 40px)' }}>
                    {activeTab === 0 && (
                      <DataGrid
                        database={database}
                        tableName={selectedTable}
                        onBackToTables={() => setSelectedTable(null)}
                      />
                    )}

                    {activeTab === 1 && (
                      <QueryEditor database={database} />
                    )}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default MainPage;
