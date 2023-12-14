const { Pool } = require('pg');

const pool = new Pool({
  user: 'Zion',
  host: 'localhost',
  database: 'fineAhBan2',
  password: '1357924680Zh#',
  port: 5432, // default port for PostgreSQL
});

const testDBConnection = async () => {
    try {
      await pool.query('SELECT NOW()'); // Simple query to test the connection
      console.log('Database connection successful.');
    } catch (err) {
      console.error('Database connection failed.', err.message);
    }
  };
  
  // Export the pool and the test function
  module.exports = { pool, testDBConnection };