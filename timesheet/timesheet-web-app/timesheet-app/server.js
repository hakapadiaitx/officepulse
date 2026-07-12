const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL Connection Pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'timesheet_db'
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('✓ Connected to PostgreSQL');
  }
});

// ============ GROUP HOMES ENDPOINTS ============

// Get all group homes
app.get('/api/group-homes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM group_homes ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get single group home with stats
app.get('/api/group-homes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const groupHome = await pool.query('SELECT * FROM group_homes WHERE id = $1', [id]);
    const employees = await pool.query('SELECT * FROM employees WHERE group_home_id = $1 ORDER BY first_name', [id]);
    
    if (groupHome.rows.length === 0) {
      return res.status(404).json({ error: 'Group home not found' });
    }

    res.json({
      ...groupHome.rows[0],
      employees: employees.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Create group home
app.post('/api/group-homes', async (req, res) => {
  try {
    const { name, address, phone } = req.body;
    const result = await pool.query(
      'INSERT INTO group_homes (name, address, phone) VALUES ($1, $2, $3) RETURNING *',
      [name, address, phone]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Update group home
app.put('/api/group-homes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone } = req.body;
    const result = await pool.query(
      'UPDATE group_homes SET name = $1, address = $2, phone = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name, address, phone, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ EMPLOYEES ENDPOINTS ============

// Get employees for a group home
app.get('/api/group-homes/:groupHomeId/employees', async (req, res) => {
  try {
    const { groupHomeId } = req.params;
    const result = await pool.query(
      'SELECT * FROM employees WHERE group_home_id = $1 ORDER BY first_name',
      [groupHomeId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Create employee
app.post('/api/employees', async (req, res) => {
  try {
    const { group_home_id, first_name, last_name, email, phone, position } = req.body;
    const result = await pool.query(
      'INSERT INTO employees (group_home_id, first_name, last_name, email, phone, position) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [group_home_id, first_name, last_name, email, phone, position]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ TIMESHEETS ENDPOINTS ============

// Get all timesheets
app.get('/api/timesheets', async (req, res) => {
  try {
    const { groupHomeId, status } = req.query;
    let query = 'SELECT t.*, gh.name as group_home_name FROM timesheets t JOIN group_homes gh ON t.group_home_id = gh.id WHERE 1=1';
    const params = [];

    if (groupHomeId) {
      query += ' AND t.group_home_id = $' + (params.length + 1);
      params.push(groupHomeId);
    }
    if (status) {
      query += ' AND t.status = $' + (params.length + 1);
      params.push(status);
    }

    query += ' ORDER BY t.period_start_date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get single timesheet with all time entries
app.get('/api/timesheets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const timesheet = await pool.query('SELECT * FROM timesheets WHERE id = $1', [id]);
    const entries = await pool.query(
      `SELECT te.*, e.first_name, e.last_name FROM time_entries te 
       JOIN employees e ON te.employee_id = e.id 
       WHERE te.timesheet_id = $1 ORDER BY e.first_name, te.day_of_week`,
      [id]
    );

    if (timesheet.rows.length === 0) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    res.json({
      ...timesheet.rows[0],
      time_entries: entries.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Create timesheet
app.post('/api/timesheets', async (req, res) => {
  try {
    const { group_home_id, period_start_date, period_end_date } = req.body;
    
    const result = await pool.query(
      'INSERT INTO timesheets (group_home_id, period_start_date, period_end_date) VALUES ($1, $2, $3) RETURNING *',
      [group_home_id, period_start_date, period_end_date]
    );

    // Create blank time entries for all employees
    const employees = await pool.query(
      'SELECT id FROM employees WHERE group_home_id = $1',
      [group_home_id]
    );

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (const employee of employees.rows) {
      for (const day of days) {
        await pool.query(
          'INSERT INTO time_entries (timesheet_id, employee_id, day_of_week) VALUES ($1, $2, $3)',
          [result.rows[0].id, employee.id, day]
        );
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Update timesheet status
app.put('/api/timesheets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await pool.query(
      'UPDATE timesheets SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ TIME ENTRIES ENDPOINTS ============

// Update time entry
app.put('/api/time-entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_time, end_time } = req.body;

    let hoursWorked = null;
    if (start_time && end_time) {
      // Calculate hours worked (handles overnight shifts)
      const query = `
        SELECT 
          CASE 
            WHEN $2::TIME < $1::TIME 
            THEN (EXTRACT(EPOCH FROM ($2::TIME - $1::TIME + INTERVAL '1 day')) / 3600)::DECIMAL(5,2)
            ELSE (EXTRACT(EPOCH FROM ($2::TIME - $1::TIME)) / 3600)::DECIMAL(5,2)
          END as hours
      `;
      const result = await pool.query(query, [start_time, end_time]);
      hoursWorked = result.rows[0].hours;
    }

    const updateResult = await pool.query(
      'UPDATE time_entries SET start_time = $1, end_time = $2, hours_worked = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [start_time, end_time, hoursWorked, id]
    );

    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// ============ DASHBOARD ANALYTICS ENDPOINTS ============

// Get time allocation by employee for a timesheet
app.get('/api/analytics/employee-hours/:timesheetId', async (req, res) => {
  try {
    const { timesheetId } = req.params;
    const result = await pool.query(
      `SELECT 
        e.id, 
        CONCAT(e.first_name, ' ', e.last_name) as employee_name,
        COALESCE(SUM(te.hours_worked), 0) as total_hours
      FROM employees e
      LEFT JOIN time_entries te ON e.id = te.employee_id AND te.timesheet_id = $1
      GROUP BY e.id, e.first_name, e.last_name
      ORDER BY total_hours DESC`,
      [timesheetId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get time allocation by day for a timesheet
app.get('/api/analytics/daily-hours/:timesheetId', async (req, res) => {
  try {
    const { timesheetId } = req.params;
    const result = await pool.query(
      `SELECT 
        day_of_week,
        COALESCE(SUM(hours_worked), 0) as total_hours,
        COUNT(*) as employee_count
      FROM time_entries
      WHERE timesheet_id = $1
      GROUP BY day_of_week
      ORDER BY 
        CASE day_of_week
          WHEN 'Sunday' THEN 0
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
        END`,
      [timesheetId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get group home summary
app.get('/api/analytics/group-home-summary/:groupHomeId', async (req, res) => {
  try {
    const { groupHomeId } = req.params;
    const result = await pool.query(
      `SELECT 
        t.id as timesheet_id,
        t.period_start_date,
        t.period_end_date,
        COALESCE(SUM(te.hours_worked), 0) as total_hours,
        COUNT(DISTINCT te.employee_id) as employee_count
      FROM timesheets t
      LEFT JOIN time_entries te ON t.id = te.timesheet_id
      WHERE t.group_home_id = $1
      GROUP BY t.id, t.period_start_date, t.period_end_date
      ORDER BY t.period_start_date DESC
      LIMIT 12`,
      [groupHomeId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get all group homes with statistics
app.get('/api/analytics/all-group-homes-stats', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        gh.id,
        gh.name,
        COUNT(DISTINCT e.id) as employee_count,
        COUNT(DISTINCT t.id) as timesheet_count,
        COALESCE(SUM(te.hours_worked), 0) as total_hours
      FROM group_homes gh
      LEFT JOIN employees e ON gh.id = e.group_home_id
      LEFT JOIN timesheets t ON gh.id = t.group_home_id
      LEFT JOIN time_entries te ON t.id = te.timesheet_id
      GROUP BY gh.id, gh.name
      ORDER BY total_hours DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
});
