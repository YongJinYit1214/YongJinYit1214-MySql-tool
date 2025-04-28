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

// Create a new database
app.post('/api/databases', async (req, res) => {
  const { databaseName } = req.body;

  if (!databaseName) {
    return res.status(400).json({ error: 'Database name is required' });
  }

  // Validate database name (only allow alphanumeric characters and underscores)
  if (!/^[a-zA-Z0-9_]+$/.test(databaseName)) {
    return res.status(400).json({
      error: 'Invalid database name. Only letters, numbers, and underscores are allowed.'
    });
  }

  try {
    console.log(`Attempting to create database: ${databaseName}`);
    const connection = await pool.getConnection();

    // Check if database already exists
    const [existingDbs] = await connection.query('SHOW DATABASES LIKE ?', [databaseName]);
    if (existingDbs.length > 0) {
      connection.release();
      return res.status(409).json({ error: 'Database already exists' });
    }

    // Create the database
    await connection.query(`CREATE DATABASE \`${databaseName}\``);
    console.log(`Database ${databaseName} created successfully`);

    connection.release();
    res.status(201).json({ message: `Database ${databaseName} created successfully` });
  } catch (error) {
    console.error('Error creating database:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ error: `Failed to create database: ${error.message}` });
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

  console.log(`Attempting to get structure for table: ${tableName}`);

  try {
    const connection = await pool.getConnection();
    console.log(`Connection obtained for table structure`);

    // Get basic table structure
    console.log(`Executing DESCRIBE query for ${tableName}`);
    const [rows] = await connection.query(`DESCRIBE \`${tableName}\``);
    console.log(`Retrieved ${rows.length} columns for table ${tableName}`);

    // Get foreign key information (outgoing references)
    console.log(`Getting foreign key information for ${tableName}`);
    const [foreignKeys] = await connection.query(`
      SELECT
        COLUMN_NAME as \`column\`,
        REFERENCED_TABLE_NAME as referencedTable,
        REFERENCED_COLUMN_NAME as referencedColumn
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [tableName]);

    console.log(`Found ${foreignKeys.length} foreign keys for table ${tableName}`);

    // Get tables that reference this table (incoming references)
    console.log(`Getting tables that reference ${tableName}`);
    const [referencingTables] = await connection.query(`
      SELECT
        TABLE_NAME as referencingTable,
        COLUMN_NAME as referencingColumn,
        REFERENCED_COLUMN_NAME as referencedColumn
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND REFERENCED_TABLE_NAME = ?
    `, [tableName]);

    console.log(`Found ${referencingTables.length} tables that reference ${tableName}`);

    // Find primary key
    const primaryKey = rows.find(row => row.Key === 'PRI');
    const primaryKeyName = primaryKey ? primaryKey.Field : null;

    // Group referencing tables by the table name
    const groupedReferencingTables = {};
    referencingTables.forEach(ref => {
      if (!groupedReferencingTables[ref.referencingTable]) {
        groupedReferencingTables[ref.referencingTable] = [];
      }
      groupedReferencingTables[ref.referencingTable].push({
        column: ref.referencingColumn,
        referencedColumn: ref.referencedColumn
      });
    });

    // Enhance the structure with foreign key information
    const enhancedStructure = rows.map(row => {
      const fk = foreignKeys.find(fk => fk.column === row.Field);
      if (fk) {
        console.log(`Column ${row.Field} is a foreign key referencing ${fk.referencedTable}.${fk.referencedColumn}`);
        return {
          ...row,
          isForeignKey: true,
          referencedTable: fk.referencedTable,
          referencedColumn: fk.referencedColumn
        };
      }
      return row;
    });

    connection.release();
    console.log(`Connection released for table structure`);
    console.log(`Sending structure response with ${enhancedStructure.length} columns`);

    res.json({
      columns: enhancedStructure,
      primaryKey: primaryKeyName,
      referencingTables: groupedReferencingTables
    });
  } catch (error) {
    console.error(`Error fetching structure for table ${tableName}:`, error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ error: `Failed to fetch structure for table ${tableName}: ${error.message}` });
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
  const { force } = req.query; // Add a force parameter to bypass foreign key checks if needed

  if (!updateData || Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'Update data is required' });
  }

  try {
    const connection = await pool.getConnection();

    // Get table structure to validate fields
    console.log(`Getting structure for table ${tableName} before update`);
    const [tableStructure] = await connection.query(`DESCRIBE \`${tableName}\``);

    // Get valid column names from the table structure
    const validColumns = tableStructure.map(col => col.Field);
    console.log('Valid columns:', validColumns);

    // Filter the input data to only include valid columns
    const filteredData = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (validColumns.includes(key)) {
        filteredData[key] = value;
      } else {
        console.log(`Skipping invalid column: ${key}`);
      }
    }

    if (Object.keys(filteredData).length === 0) {
      connection.release();
      return res.status(400).json({ error: 'No valid columns provided for update' });
    }

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

    // Check if we're updating a primary key that's referenced by other tables
    if (filteredData[primaryKeyColumn] !== undefined) {
      // Check for foreign key constraints
      const [fkConstraints] = await connection.query(`
        SELECT
          TABLE_NAME as referencingTable,
          COLUMN_NAME as referencingColumn,
          REFERENCED_TABLE_NAME as referencedTable,
          REFERENCED_COLUMN_NAME as referencedColumn
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
          AND REFERENCED_TABLE_NAME = ?
          AND REFERENCED_COLUMN_NAME = ?
      `, [tableName, primaryKeyColumn]);

      // If there are foreign key constraints and force is not true, return an error with details
      if (fkConstraints.length > 0 && force !== 'true') {
        connection.release();
        return res.status(409).json({
          error: 'Cannot update primary key due to foreign key constraints',
          details: {
            message: 'This primary key is referenced by other tables. Updating it may cause data inconsistency.',
            constraints: fkConstraints,
            solution: 'You can either update the referencing records first, or use force=true parameter to bypass checks (not recommended)'
          }
        });
      }
    }

    // Build update query
    const setClause = Object.entries(filteredData)
      .map(([column, value]) => `\`${column}\` = ?`)
      .join(', ');

    const values = [...Object.values(filteredData), id];

    let query = `UPDATE \`${tableName}\` SET ${setClause} WHERE \`${primaryKeyColumn}\` = ?`;
    console.log('Executing update query:', query);
    console.log('With values:', values);

    try {
      if (force === 'true') {
        // Temporarily disable foreign key checks if force is true
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      }

      const [result] = await connection.query(query, values);

      if (force === 'true') {
        // Re-enable foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      }

      connection.release();

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Record not found' });
      }

      res.json({ message: 'Record updated successfully' });
    } catch (updateError) {
      if (force === 'true') {
        // Make sure to re-enable foreign key checks even if there's an error
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      }

      connection.release();

      // Check if it's a foreign key constraint error
      if (updateError.code === 'ER_ROW_IS_REFERENCED_2' || updateError.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(409).json({
          error: 'Cannot update record due to foreign key constraints',
          details: {
            message: 'This update violates foreign key constraints. You need to update the referencing records first.',
            solution: 'You can use force=true parameter to bypass checks (not recommended)'
          }
        });
      }

      throw updateError;
    }
  } catch (error) {
    console.error(`Error updating data in table ${tableName}:`, error);
    res.status(500).json({
      error: `Failed to update data in table ${tableName}: ${error.message}`,
      code: error.code
    });
  }
});

// Insert new record
app.post('/api/tables/:tableName/data', async (req, res) => {
  const { tableName } = req.params;
  const { data: newData, relatedRecords } = req.body;
  const actualData = newData || req.body; // For backward compatibility

  if (!actualData || Object.keys(actualData).length === 0) {
    return res.status(400).json({ error: 'Data is required' });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Start a transaction if we have related records
    if (relatedRecords && relatedRecords.length > 0) {
      await connection.beginTransaction();
    }

    // Get table structure to validate fields
    console.log(`Getting structure for table ${tableName} before insert`);
    const [tableStructure] = await connection.query(`DESCRIBE \`${tableName}\``);

    // Get valid column names from the table structure
    const validColumns = tableStructure.map(col => col.Field);
    console.log('Valid columns:', validColumns);

    // Filter the input data to only include valid columns
    const filteredData = {};
    for (const [key, value] of Object.entries(actualData)) {
      if (validColumns.includes(key)) {
        filteredData[key] = value;
      } else {
        console.log(`Skipping invalid column: ${key}`);
      }
    }

    if (Object.keys(filteredData).length === 0) {
      if (connection) connection.release();
      return res.status(400).json({ error: 'No valid columns provided for insert' });
    }

    const columns = Object.keys(filteredData).map(col => `\`${col}\``).join(', ');
    const placeholders = Object.keys(filteredData).map(() => '?').join(', ');
    const values = Object.values(filteredData);

    const query = `INSERT INTO \`${tableName}\` (${columns}) VALUES (${placeholders})`;
    console.log('Executing insert query:', query);
    console.log('With values:', values);

    const [result] = await connection.query(query, values);
    const insertedId = result.insertId;

    // Process related records if any
    const relatedResults = [];
    if (relatedRecords && relatedRecords.length > 0) {
      for (const related of relatedRecords) {
        const { table, data, linkField, linkToField } = related;

        if (!table || !data || Object.keys(data).length === 0) {
          continue;
        }

        // Get structure of related table
        const [relatedTableStructure] = await connection.query(`DESCRIBE \`${table}\``);
        const relatedValidColumns = relatedTableStructure.map(col => col.Field);

        // Filter the related data
        const relatedFilteredData = {};
        for (const [key, value] of Object.entries(data)) {
          if (relatedValidColumns.includes(key)) {
            relatedFilteredData[key] = value;
          }
        }

        // Add the link field if specified
        if (linkField && linkToField && relatedValidColumns.includes(linkField)) {
          // Link to the main record's ID or a specific field
          const linkValue = linkToField === 'id' ? insertedId : filteredData[linkToField];
          relatedFilteredData[linkField] = linkValue;
        }

        if (Object.keys(relatedFilteredData).length === 0) {
          continue;
        }

        const relatedColumns = Object.keys(relatedFilteredData).map(col => `\`${col}\``).join(', ');
        const relatedPlaceholders = Object.keys(relatedFilteredData).map(() => '?').join(', ');
        const relatedValues = Object.values(relatedFilteredData);

        const relatedQuery = `INSERT INTO \`${table}\` (${relatedColumns}) VALUES (${relatedPlaceholders})`;
        console.log(`Executing related insert query for ${table}:`, relatedQuery);
        console.log('With values:', relatedValues);

        const [relatedResult] = await connection.query(relatedQuery, relatedValues);
        relatedResults.push({
          table,
          id: relatedResult.insertId,
          success: true
        });
      }
    }

    // Commit the transaction if we started one
    if (relatedRecords && relatedRecords.length > 0) {
      await connection.commit();
    }

    if (connection) connection.release();

    res.status(201).json({
      message: 'Record created successfully',
      id: insertedId,
      relatedRecords: relatedResults.length > 0 ? relatedResults : undefined
    });
  } catch (error) {
    console.error(`Error inserting data into table ${tableName}:`, error);

    // Rollback the transaction if we started one
    if (connection && relatedRecords && relatedRecords.length > 0) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }

    if (connection) connection.release();

    res.status(500).json({
      error: `Failed to insert data into table ${tableName}: ${error.message}`,
      code: error.code
    });
  }
});

// Delete record
app.delete('/api/tables/:tableName/data/:id', async (req, res) => {
  const { tableName, id } = req.params;
  const { force } = req.query; // Add a force parameter to bypass foreign key checks if needed

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

    // Check for foreign key constraints
    const [fkConstraints] = await connection.query(`
      SELECT
        TABLE_NAME as referencingTable,
        COLUMN_NAME as referencingColumn,
        REFERENCED_TABLE_NAME as referencedTable,
        REFERENCED_COLUMN_NAME as referencedColumn
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
        AND REFERENCED_TABLE_NAME = ?
        AND REFERENCED_COLUMN_NAME = ?
    `, [tableName, primaryKeyColumn]);

    // If there are foreign key constraints and force is not true, return an error with details
    if (fkConstraints.length > 0 && force !== 'true') {
      connection.release();
      return res.status(409).json({
        error: 'Cannot delete record due to foreign key constraints',
        details: {
          message: 'This record is referenced by other tables. Deleting it may cause data inconsistency.',
          constraints: fkConstraints,
          solution: 'You can either delete the referencing records first, or use force=true parameter to bypass checks (not recommended)'
        }
      });
    }

    let query;

    if (force === 'true') {
      // Temporarily disable foreign key checks if force is true
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      query = `DELETE FROM \`${tableName}\` WHERE \`${primaryKeyColumn}\` = ?`;
    } else {
      query = `DELETE FROM \`${tableName}\` WHERE \`${primaryKeyColumn}\` = ?`;
    }

    try {
      const [result] = await connection.query(query, [id]);

      if (force === 'true') {
        // Re-enable foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      }

      if (result.affectedRows === 0) {
        connection.release();
        return res.status(404).json({ error: 'Record not found' });
      }

      connection.release();
      res.json({ message: 'Record deleted successfully' });
    } catch (deleteError) {
      if (force === 'true') {
        // Make sure to re-enable foreign key checks even if there's an error
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      }

      connection.release();

      // Check if it's a foreign key constraint error
      if (deleteError.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(409).json({
          error: 'Cannot delete record due to foreign key constraints',
          details: {
            message: 'This record is referenced by other tables. You need to delete the referencing records first.',
            solution: 'You can use force=true parameter to bypass checks (not recommended)'
          }
        });
      }

      throw deleteError;
    }
  } catch (error) {
    console.error(`Error deleting data from table ${tableName}:`, error);
    res.status(500).json({
      error: `Failed to delete data from table ${tableName}: ${error.message}`,
      code: error.code
    });
  }
});

// Get referenced table data for foreign keys
app.get('/api/tables/:tableName/referenced-data/:columnName', async (req, res) => {
  const { tableName, columnName } = req.params;

  console.log(`Attempting to get referenced data for ${tableName}.${columnName}`);

  try {
    const connection = await pool.getConnection();
    console.log(`Connection obtained for referenced data`);

    // Get foreign key information
    console.log(`Getting foreign key information for ${tableName}.${columnName}`);
    const [foreignKeys] = await connection.query(`
      SELECT
        COLUMN_NAME as \`column\`,
        REFERENCED_TABLE_NAME as referencedTable,
        REFERENCED_COLUMN_NAME as referencedColumn
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [tableName, columnName]);

    console.log(`Found ${foreignKeys.length} foreign key relationships for ${tableName}.${columnName}`);

    if (foreignKeys.length === 0) {
      connection.release();
      console.log(`No foreign key relationship found for ${tableName}.${columnName}`);
      return res.status(404).json({ error: 'No foreign key relationship found for this column' });
    }

    const fk = foreignKeys[0];
    console.log(`Foreign key references ${fk.referencedTable}.${fk.referencedColumn}`);

    // Get data from the referenced table
    console.log(`Getting data from referenced table ${fk.referencedTable}`);
    const [referencedData] = await connection.query(`
      SELECT * FROM \`${fk.referencedTable}\`
      ORDER BY \`${fk.referencedColumn}\`
      LIMIT 1000
    `);

    console.log(`Retrieved ${referencedData.length} rows from ${fk.referencedTable}`);

    connection.release();
    console.log(`Connection released for referenced data`);

    res.json({
      referencedTable: fk.referencedTable,
      referencedColumn: fk.referencedColumn,
      data: referencedData
    });
  } catch (error) {
    console.error(`Error fetching referenced data for ${tableName}.${columnName}:`, error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ error: `Failed to fetch referenced data: ${error.message}` });
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
