import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/Dashboard.css';

const Dashboard = ({ selectedGroupHome, timesheets, onEditTimesheet, apiUrl }) => {
  const [employeeHours, setEmployeeHours] = useState([]);
  const [dailyHours, setDailyHours] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [allGroupHomesStats, setAllGroupHomesStats] = useState([]);

  useEffect(() => {
    if (timesheets.length > 0) {
      fetchAnalytics(timesheets[0].id);
    }
  }, [timesheets]);

  useEffect(() => {
    fetchAllGroupHomesStats();
  }, []);

  const fetchAnalytics = async (timesheetId) => {
    try {
      setLoading(true);
      const [empResponse, dailyResponse] = await Promise.all([
        fetch(`${apiUrl}/analytics/employee-hours/${timesheetId}`),
        fetch(`${apiUrl}/analytics/daily-hours/${timesheetId}`)
      ]);

      const employeeData = await empResponse.json();
      const dailyData = await dailyResponse.json();

      setEmployeeHours(employeeData);
      setDailyHours(dailyData);

      // Calculate summary
      const totalHours = employeeData.reduce((sum, emp) => sum + emp.total_hours, 0);
      setSummary({
        totalHours: totalHours.toFixed(2),
        totalEmployees: employeeData.length,
        averageHours: (totalHours / employeeData.length).toFixed(2)
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllGroupHomesStats = async () => {
    try {
      const response = await fetch(`${apiUrl}/analytics/all-group-homes-stats`);
      const data = await response.json();
      setAllGroupHomesStats(data);
    } catch (error) {
      console.error('Failed to fetch group homes stats:', error);
    }
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Time Allocation Analytics & Reports</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="summary-cards">
          <div className="card">
            <div className="card-icon">📊</div>
            <div className="card-content">
              <div className="card-label">Total Hours</div>
              <div className="card-value">{summary.totalHours}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-icon">👥</div>
            <div className="card-content">
              <div className="card-label">Staff Count</div>
              <div className="card-value">{summary.totalEmployees}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-icon">⏱️</div>
            <div className="card-content">
              <div className="card-label">Avg Hours/Staff</div>
              <div className="card-value">{summary.averageHours}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-icon">📋</div>
            <div className="card-content">
              <div className="card-label">Timesheets</div>
              <div className="card-value">{timesheets.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Employee Hours Chart */}
        {employeeHours.length > 0 && (
          <div className="chart-card">
            <h3>Hours by Employee</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={employeeHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="employee_name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_hours" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Daily Hours Chart */}
        {dailyHours.length > 0 && (
          <div className="chart-card">
            <h3>Hours by Day of Week</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day_of_week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total_hours" stroke="#82ca9d" name="Total Hours" />
                <Line type="monotone" dataKey="employee_count" stroke="#ffc658" name="Employees" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Timesheets List */}
      <div className="timesheets-section">
        <h2>Recent Timesheets</h2>
        {timesheets.length === 0 ? (
          <div className="empty-state">
            <p>No timesheets created yet</p>
            <p className="text-muted">Create your first timesheet to get started</p>
          </div>
        ) : (
          <div className="timesheets-table">
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {timesheets.map(ts => (
                  <tr key={ts.id}>
                    <td>
                      {new Date(ts.period_start_date).toLocaleDateString()} - {' '}
                      {new Date(ts.period_end_date).toLocaleDateString()}
                    </td>
                    <td>{new Date(ts.period_start_date).toLocaleDateString()}</td>
                    <td>{new Date(ts.period_end_date).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-badge status-${ts.status}`}>
                        {ts.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => onEditTimesheet(ts)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Group Homes Overview */}
      {allGroupHomesStats.length > 1 && (
        <div className="group-homes-overview">
          <h2>All Group Homes Overview</h2>
          <div className="overview-cards">
            {allGroupHomesStats.map(gh => (
              <div key={gh.id} className="overview-card">
                <h4>{gh.name}</h4>
                <div className="stat-row">
                  <span>Employees:</span>
                  <strong>{gh.employee_count}</strong>
                </div>
                <div className="stat-row">
                  <span>Timesheets:</span>
                  <strong>{gh.timesheet_count}</strong>
                </div>
                <div className="stat-row">
                  <span>Total Hours:</span>
                  <strong>{parseFloat(gh.total_hours).toFixed(2)}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
