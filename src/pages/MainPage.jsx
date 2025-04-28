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
  Toolbar
} from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import DatabaseSelector from '../components/DatabaseSelector';
import TableList from '../components/TableList';
import DataGrid from '../components/DataGrid';
import QueryEditor from '../components/QueryEditor';

const MainPage = () => {
  const [database, setDatabase] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

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
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="xl" sx={{ flexGrow: 1, py: 3, display: 'flex', flexDirection: 'column' }}>
        {!database ? (
          <DatabaseSelector onDatabaseSelected={handleDatabaseSelected} />
        ) : (
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Grid container spacing={2} sx={{ flexGrow: 1, height: 'calc(100% - 20px)' }}>
              {/* Sidebar with table list */}
              <Grid item xs={12} md={3} lg={2} sx={{ height: '100%' }}>
                <TableList 
                  database={database} 
                  onTableSelect={handleTableSelect} 
                />
              </Grid>
              
              {/* Main content area */}
              <Grid item xs={12} md={9} lg={10} sx={{ height: '100%' }}>
                <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={activeTab} onChange={handleTabChange}>
                      <Tab label="Data" />
                      <Tab label="SQL Query" />
                    </Tabs>
                  </Box>
                  
                  <Box sx={{ flexGrow: 1, p: 0, height: 'calc(100% - 48px)' }}>
                    {activeTab === 0 && (
                      <DataGrid 
                        database={database} 
                        tableName={selectedTable} 
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
