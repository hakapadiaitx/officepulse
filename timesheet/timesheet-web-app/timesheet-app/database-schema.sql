-- Timesheet Application Database Schema

-- Group Homes Table
CREATE TABLE group_homes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  address VARCHAR(255),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees Table
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  group_home_id INTEGER NOT NULL REFERENCES group_homes(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  position VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Timesheets Table
CREATE TABLE timesheets (
  id SERIAL PRIMARY KEY,
  group_home_id INTEGER NOT NULL REFERENCES group_homes(id) ON DELETE CASCADE,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'draft', -- draft, submitted, approved
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_home_id, period_start_date, period_end_date)
);

-- Time Entries Table
CREATE TABLE time_entries (
  id SERIAL PRIMARY KEY,
  timesheet_id INTEGER NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week VARCHAR(20), -- Sunday, Monday, Tuesday, etc.
  start_time TIME,
  end_time TIME,
  hours_worked DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_employees_group_home ON employees(group_home_id);
CREATE INDEX idx_timesheets_group_home ON timesheets(group_home_id);
CREATE INDEX idx_time_entries_timesheet ON time_entries(timesheet_id);
CREATE INDEX idx_time_entries_employee ON time_entries(employee_id);
CREATE INDEX idx_timesheets_status ON timesheets(status);
CREATE INDEX idx_time_entries_date ON timesheets(period_start_date, period_end_date);

-- Sample data
INSERT INTO group_homes (name, address, phone) VALUES
('Gerald Street Program', '123 Gerald Street, Providence, RI', '(401) 555-0123'),
('Elm Street Program', '456 Elm Street, Warwick, RI', '(401) 555-0456'),
('Oak Avenue Program', '789 Oak Avenue, Cranston, RI', '(401) 555-0789');

INSERT INTO employees (group_home_id, first_name, last_name, email, position) VALUES
(1, 'John', 'Smith', 'john@example.com', 'Program Manager'),
(1, 'Sarah', 'Johnson', 'sarah@example.com', 'Staff'),
(1, 'Michael', 'Brown', 'michael@example.com', 'Staff'),
(2, 'Emily', 'Davis', 'emily@example.com', 'Program Manager'),
(2, 'Robert', 'Wilson', 'robert@example.com', 'Staff'),
(3, 'Jessica', 'Martinez', 'jessica@example.com', 'Program Manager');
