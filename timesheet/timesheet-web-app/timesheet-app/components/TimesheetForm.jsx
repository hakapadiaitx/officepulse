import React, { useState } from 'react';
import '../styles/TimesheetForm.css';

const TimesheetForm = ({ onSubmit, selectedGroupHome, apiUrl }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!startDate || !endDate) {
      setError('Both dates are required');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date must be before end date');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        period_start_date: startDate,
        period_end_date: endDate
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get today's date
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="timesheet-form-container">
      <div className="form-card">
        <h2>Create New Timesheet</h2>
        
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="startDate">Period Start Date *</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={today}
              required
            />
            <small>Select the first day of the pay period</small>
          </div>

          <div className="form-group">
            <label htmlFor="endDate">Period End Date *</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || today}
              required
            />
            <small>Select the last day of the pay period</small>
          </div>

          <div className="form-info">
            <p>📋 This timesheet will be created for:</p>
            <p className="group-home-name">{selectedGroupHome}</p>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Timesheet'}
            </button>
          </div>
        </form>

        <div className="info-box">
          <h4>ℹ️ About Timesheets</h4>
          <ul>
            <li>Each timesheet covers a specific pay period</li>
            <li>You can create timesheets for different group homes</li>
            <li>All employees will be added automatically</li>
            <li>You can edit times and hours after creation</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TimesheetForm;
