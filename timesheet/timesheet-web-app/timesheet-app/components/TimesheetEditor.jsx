import React, { useState, useEffect } from 'react';
import '../styles/TimesheetEditor.css';

const TimesheetEditor = ({ timesheet, onBack, apiUrl }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [groupHomeName, setGroupHomeName] = useState('');

  useEffect(() => {
    fetchTimesheetDetails();
  }, []);

  const fetchTimesheetDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/timesheets/${timesheet.id}`);
      const data = await response.json();
      
      // Group entries by employee for easier editing
      const groupedEntries = {};
      data.time_entries.forEach(entry => {
        const employeeKey = `${entry.first_name} ${entry.last_name}`;
        if (!groupedEntries[employeeKey]) {
          groupedEntries[employeeKey] = {};
        }
        groupedEntries[employeeKey][entry.day_of_week] = entry;
      });

      setEntries(groupedEntries);
      setGroupHomeName(data.group_home_name);
    } catch (error) {
      setMessage('Failed to load timesheet details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = generateTimeSlots();

  function generateTimeSlots() {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const h = String(hour).padStart(2, '0');
        const m = String(minute).padStart(2, '0');
        const time = `${h}:${m}`;
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        slots.push({
          value: time,
          display: `${displayHour}:${m} ${ampm}`
        });
      }
    }
    return slots;
  }

  const handleTimeChange = async (employee, day, field, value) => {
    const updatedEntry = {
      ...entries[employee][day],
      [field]: value
    };

    // Update local state
    setEntries(prev => ({
      ...prev,
      [employee]: {
        ...prev[employee],
        [day]: updatedEntry
      }
    }));

    // Call API to update
    if (updatedEntry.id) {
      try {
        await fetch(`${apiUrl}/time-entries/${updatedEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_time: updatedEntry.start_time,
            end_time: updatedEntry.end_time
          })
        });
        setMessage('Time updated successfully');
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        setMessage('Failed to update time: ' + error.message);
        console.error(error);
      }
    }
  };

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const employees = Object.keys(entries).sort();

  const calculateDayTotal = (day) => {
    let total = 0;
    Object.values(entries).forEach(employeeDays => {
      const entry = employeeDays[day];
      if (entry && entry.hours_worked) {
        total += parseFloat(entry.hours_worked);
      }
    });
    return total.toFixed(2);
  };

  const calculateEmployeeTotal = (employee) => {
    let total = 0;
    Object.values(entries[employee]).forEach(entry => {
      if (entry && entry.hours_worked) {
        total += parseFloat(entry.hours_worked);
      }
    });
    return total.toFixed(2);
  };

  return (
    <div className="timesheet-editor">
      <div className="editor-header">
        <button className="btn btn-back" onClick={onBack}>← Back</button>
        <div className="header-info">
          <h2>Timesheet Editor</h2>
          <p>{groupHomeName}</p>
          <p className="period-info">
            {new Date(timesheet.period_start_date).toLocaleDateString()} to {' '}
            {new Date(timesheet.period_end_date).toLocaleDateString()}
          </p>
        </div>
      </div>

      {message && (
        <div className="message-banner success">
          {message}
        </div>
      )}

      {loading ? (
        <div className="loading">Loading timesheet...</div>
      ) : (
        <div className="timesheet-table-wrapper">
          <table className="timesheet-table">
            <thead>
              <tr>
                <th className="sticky-col">Staff Name</th>
                {days.map(day => (
                  <th key={day} className="day-header">
                    <div className="day-name">{day}</div>
                    <div className="day-subheader">Start / End</div>
                  </th>
                ))}
                <th className="total-col">Weekly<br/>Total</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(employee => (
                <tr key={employee} className="employee-row">
                  <td className="sticky-col employee-name">{employee}</td>
                  {days.map(day => {
                    const entry = entries[employee][day];
                    return (
                      <td key={`${employee}-${day}`} className="time-cell">
                        <div className="time-input-group">
                          <select
                            value={entry?.start_time || ''}
                            onChange={(e) => handleTimeChange(employee, day, 'start_time', e.target.value)}
                            className="time-select"
                          >
                            <option value="">Start</option>
                            {timeSlots.map(slot => (
                              <option key={slot.value} value={slot.value}>
                                {slot.display}
                              </option>
                            ))}
                          </select>
                          <span className="time-separator">to</span>
                          <select
                            value={entry?.end_time || ''}
                            onChange={(e) => handleTimeChange(employee, day, 'end_time', e.target.value)}
                            className="time-select"
                          >
                            <option value="">End</option>
                            {timeSlots.map(slot => (
                              <option key={slot.value} value={slot.value}>
                                {slot.display}
                              </option>
                            ))}
                          </select>
                        </div>
                        {entry?.hours_worked && (
                          <div className="hours-display">
                            {parseFloat(entry.hours_worked).toFixed(2)}h
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="total-col employee-total">
                    {calculateEmployeeTotal(employee)}
                  </td>
                </tr>
              ))}
              <tr className="totals-row">
                <td className="sticky-col">DAILY TOTALS</td>
                {days.map(day => (
                  <td key={`total-${day}`} className="day-total">
                    {calculateDayTotal(day)}
                  </td>
                ))}
                <td className="total-col grand-total">
                  {employees
                    .reduce((sum, emp) => sum + parseFloat(calculateEmployeeTotal(emp)), 0)
                    .toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="editor-actions">
        <button className="btn btn-secondary" onClick={onBack}>Done Editing</button>
      </div>
    </div>
  );
};

export default TimesheetEditor;
