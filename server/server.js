require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection pool
let pool;

// Initialize database connection
const initializeDbConnection = async () => {
  try {
    console.log('Initializing MySQL connection pool with:');
    console.log('Host:', process.env.DB_HOST || 'localhost');
    console.log('User:', process.env.DB_USER || 'root');
    console.log('Database:', process.env.DB_NAME || 'none');

    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      port: process.env.DB_PORT || 3306 // Use DB_PORT from .env or default to 3306
    });

    // Test the connection
    const connection = await pool.getConnection();
    console.log('Test connection successful');
    connection.release();

    console.log('MySQL connection pool initialized');
  } catch (error) {
    console.error('Error initializing database connection:', error);
    console.error('Error details:', error.message, error.stack);
    process.exit(1);
  }
};

// API Routes

// Get all databases
app.get('/api/databases', async (req, res) => {
  try {
    console.log('Attempting to get databases...');
    const connection = await pool.getConnection();
    console.log('Connection obtained');
    const [rows] = await connection.query('SHOW DATABASES');
    console.log('Query executed, releasing connection');
    connection.release();
    console.log('Connection released');

    const databases = rows.map(row => Object.values(row)[0])
      .filter(db => !['information_schema', 'mysql', 'performance_schema', 'sys'].includes(db));

    console.log('Filtered databases:', databases);
    res.json(databases);
  } catch (error) {
    console.error('Error fetching databases:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to fetch databases' });
  }
});

// Set active database
app.post('/api/use-database', async (req, res) => {
  const { database } = req.body;

  console.log(`Attempting to switch to database: ${database}`);

  if (!database) {
    console.log('No database name provided');
    return res.status(400).json({ error: 'Database name is required' });
  }

  try {
    // Update the pool configuration
    console.log(`Creating new connection pool for database: ${database}`);
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      port: process.env.DB_PORT || 3306
    });

    // Test the connection to the selected database
    console.log('Testing connection to the selected database');
    const connection = await pool.getConnection();
    console.log('Connection to selected database successful');
    connection.release();
    console.log('Connection released');

    console.log(`Successfully switched to database: ${database}`);
    res.json({ message: `Using database: ${database}` });
  } catch (error) {
    console.error('Error switching database:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to switch database' });
  }
});

// Get all tables in the current database
app.get('/api/tables', async (req, res) => {
  try {
    console.log('Attempting to get tables...');
    const connection = await pool.getConnection();
    console.log('Connection obtained for tables');
    const [rows] = await connection.query('SHOW TABLES');
    console.log('Query executed for tables, releasing connection');
    connection.release();
    console.log('Connection released for tables');

    const tables = rows.map(row => Object.values(row)[0]);
    console.log('Tables found:', tables);
    res.json(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// Get table structure
app.get('/api/tables/:tableName/structure', async (req, res) => {
  const { tableName } = req.params;

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(`DESCRIBE \`${tableName}\``);
    connection.release();

    res.json(rows);
  } catch (error) {
    console.error(`Error fetching structure for table ${tableName}:`, error);
    res.status(500).json({ error: `Failed to fetch structure for table ${tableName}` });
  }
});

// Get table data
app.get('/api/tables/:tableName/data', async (req, res) => {
  const { tableName } = req.params;
  const { page = 1, limit = 100, sort, order, filter } = req.query;

  console.log(`Attempting to get data for table: ${tableName}`);
  console.log(`Query params: page=${page}, limit=${limit}, sort=${sort}, order=${order}`);

  const offset = (page - 1) * limit;
  let query = `SELECT * FROM \`${tableName}\``;

  // Add filtering if provided
  if (filter) {
    try {
      const filterObj = JSON.parse(filter);
      const filterClauses = [];

      for (const [column, value] of Object.entries(filterObj)) {
        if (value !== undefined && value !== null && value !== '') {
          filterClauses.push(`\`${column}\` LIKE '%${value}%'`);
        }
      }

      if (filterClauses.length > 0) {
        query += ` WHERE ${filterClauses.join(' AND ')}`;
      }
    } catch (error) {
      console.error('Error parsing filter:', error);
    }
  }

  // Add sorting if provided
  if (sort && order) {
    query += ` ORDER BY \`${sort}\` ${order === 'desc' ? 'DESC' : 'ASC'}`;
  }

  // Add pagination
  query += ` LIMIT ${limit} OFFSET ${offset}`;

  console.log('Executing SQL query:', query);

  try {
    const connection = await pool.getConnection();
    console.log('Connection obtained for table data');

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM \`${tableName}\``;
    console.log('Executing count query:', countQuery);
    const [countResult] = await connection.query(countQuery);
    const total = countResult[0].total;
    console.log(`Total records: ${total}`);

    // Get data with pagination
    console.log('Executing data query with pagination');
    const [rows] = await connection.query(query);
    console.log(`Retrieved ${rows.length} rows`);
    connection.release();
    console.log('Connection released');

    const response = {
      data: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    };

    console.log('Sending response with data');
    res.json(response);
  } catch (error) {
    console.error(`Error fetching data for table ${tableName}:`, error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ error: `Failed to fetch data for table ${tableName}` });
  }
});

// Execute custom SQL query
app.post('/api/query', async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'SQL query is required' });
  }

  try {
    const connection = await pool.getConnection();
    const [result] = await connection.query(query);
    connection.release();

    res.json({ result });
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update table data
app.put('/api/tables/:tableName/data/:id', async (req, res) => {
  const { tableName, id } = req.params;
  const updateData = req.body;

  if (!updateData || Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'Update data is required' });
  }

  try {
    const connection = await pool.getConnection();

    // Get primary key column
    const [pkResult] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = 'PRIMARY'
    `, [tableName]);

    if (pkResult.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'Table has no primary key' });
    }

    const primaryKeyColumn = pkResult[0].COLUMN_NAME;

    // Build update query
    const setClause = Object.entries(updateData)
      .map(([column, value]) => `\`${column}\` = ?`)
      .join(', ');

    const values = [...Object.values(updateData), id];

    const query = `UPDATE \`${tableName}\` SET ${setClause} WHERE \`${primaryKeyColumn}\` = ?`;

    const [result] = await connection.query(query, values);
    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ message: 'Record updated successfully' });
  } catch (error) {
    console.error(`Error updating data in table ${tableName}:`, error);
    res.status(500).json({ error: `Failed to update data in table ${tableName}` });
  }
});

// Insert new record
app.post('/api/tables/:tableName/data', async (req, res) => {
  const { tableName } = req.params;
  const newData = req.body;

  if (!newData || Object.keys(newData).length === 0) {
    return res.status(400).json({ error: 'Data is required' });
  }

  try {
    const connection = await pool.getConnection();

    // Get table structure to validate fields
    console.log(`Getting structure for table ${tableName} before insert`);
    const [tableStructure] = await connection.query(`DESCRIBE \`${tableName}\``);

    // Get valid column names from the table structure
    const validColumns = tableStructure.map(col => col.Field);
    console.log('Valid columns:', validColumns);

    // Filter the input data to only include valid columns
    const filteredData = {};
    for (const [key, value] of Object.entries(newData)) {
      if (validColumns.includes(key)) {
        filteredData[key] = value;
      } else {
        console.log(`Skipping invalid column: ${key}`);
      }
    }

    if (Object.keys(filteredData).length === 0) {
      connection.release();
      return res.status(400).json({ error: 'No valid columns provided for insert' });
    }

    const columns = Object.keys(filteredData).map(col => `\`${col}\``).join(', ');
    const placeholders = Object.keys(filteredData).map(() => '?').join(', ');
    const values = Object.values(filteredData);

    const query = `INSERT INTO \`${tableName}\` (${columns}) VALUES (${placeholders})`;
    console.log('Executing insert query:', query);
    console.log('With values:', values);

    const [result] = await connection.query(query, values);
    connection.release();

    res.status(201).json({
      message: 'Record created successfully',
      id: result.insertId
    });
  } catch (error) {
    console.error(`Error inserting data into table ${tableName}:`, error);
    res.status(500).json({ error: `Failed to insert data into table ${tableName}: ${error.message}` });
  }
});

// Delete record
app.delete('/api/tables/:tableName/data/:id', async (req, res) => {
  const { tableName, id } = req.params;

  try {
    const connection = await pool.getConnection();

    // Get primary key column
    const [pkResult] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = 'PRIMARY'
    `, [tableName]);

    if (pkResult.length === 0) {
      connection.release();
      return res.status(400).json({ error: 'Table has no primary key' });
    }

    const primaryKeyColumn = pkResult[0].COLUMN_NAME;

    const query = `DELETE FROM \`${tableName}\` WHERE \`${primaryKeyColumn}\` = ?`;

    const [result] = await connection.query(query, [id]);
    connection.release();

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error(`Error deleting data from table ${tableName}:`, error);
    res.status(500).json({ error: `Failed to delete data from table ${tableName}` });
  }
});

// Start server
const startServer = async () => {
  await initializeDbConnection();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
