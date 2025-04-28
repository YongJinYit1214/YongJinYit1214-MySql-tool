# MySQL Visualization Tool

A modern, user-friendly MySQL database visualization and management tool that allows you to easily view, edit, and manage your MySQL databases without writing SQL queries.

![MySQL Visualization Tool](https://github.com/YongJinYit1214/YongJinYit1214-MySql-tool/raw/master/screenshots/main-screen.png)

## Features

- **Database Management**: Connect to, create, and delete MySQL databases
- **Table Operations**: Create, view, and delete tables with easy-to-use interfaces
- **Data Visualization**: View and edit table data with a modern, intuitive interface
- **Foreign Key Support**: Define and manage relationships between tables
- **No SQL Required**: Perform all operations without writing SQL queries
- **Dark Theme**: Modern dark theme for comfortable viewing
- **Responsive Design**: Works on various screen sizes

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v14.0.0 or higher)
- [npm](https://www.npmjs.com/) (v6.0.0 or higher)
- [MySQL](https://www.mysql.com/) server (v5.7 or higher)

## Installation

Follow these steps to get the MySQL Visualization Tool up and running on your local machine:

1. **Clone the repository**

   ```bash
   git clone https://github.com/YongJinYit1214/YongJinYit1214-MySql-tool.git
   cd YongJinYit1214-MySql-tool
   ```

2. **Install dependencies**

   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Configure the database connection**

   Create a `.env` file in the `server` directory with the following content:

   ```
   DB_HOST=localhost
   DB_USER=your_mysql_username
   DB_PASSWORD=your_mysql_password
   PORT=4000
   ```

   Replace `your_mysql_username` and `your_mysql_password` with your MySQL credentials.

4. **Start the application**

   ```bash
   # From the root directory
   npm run dev
   ```

   This will start both the server and client applications concurrently.

5. **Access the application**

   Open your browser and navigate to [http://localhost:5173](http://localhost:5173)

## User Guide

### Connecting to a Database

1. When you first open the application, you'll see the database connection screen.
2. Enter your MySQL connection details (host, username, password).
3. Click "Connect" to view available databases.
4. Select a database from the dropdown or create a new one.

### Working with Tables

1. After selecting a database, you'll see a list of tables in the left sidebar.
2. Click on a table name to view its data.
3. Use the "Create Table" button to create a new table.
4. When creating a table, define columns with their data types and constraints.
5. You can set primary keys and foreign keys during table creation.

### Managing Data

1. View table data in the main panel when a table is selected.
2. Click on a cell to view or edit its content.
3. Use the "Add Record" button to add new records to the table.
4. Click the "Delete" button in the Actions column to delete a record.
5. Use the pagination controls at the bottom to navigate through large datasets.

### Running SQL Queries

1. Click on the "SQL Query" tab to open the query editor.
2. Write your SQL query in the editor.
3. Click "Run Query" to execute the query and view results.

## Troubleshooting

- **Connection Issues**: Ensure your MySQL server is running and the credentials in the `.env` file are correct.
- **Port Conflicts**: If port 4000 or 5173 is already in use, you can change them in the `.env` file and `vite.config.js` respectively.
- **Database Access**: Ensure your MySQL user has appropriate permissions to access and modify the databases.

## About the Developer

This tool was developed by Yong Jin. For more information about the developer and other projects, visit the [About Me](https://github.com/YongJinYit1214) page.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [React](https://reactjs.org/)
- [Material-UI](https://mui.com/)
- [Express](https://expressjs.com/)
- [MySQL](https://www.mysql.com/)
