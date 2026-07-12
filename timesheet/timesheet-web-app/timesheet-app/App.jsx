import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import TimesheetForm from './components/TimesheetForm';
import TimesheetEditor from './components/TimesheetEditor';
import GroupHomeManager from './components/GroupHomeManager';
import Navigation from './components/Navigation';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [groupHomes, setGroupHomes] = useState([]);
  const [selectedGroupHome, setSelectedGroupHome] = useState(null);
  const [timesheets, setTimesheets] = useState([]);
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch group homes on mount
  useEffect(() => {
    fetchGroupHomes();
  }, []);

  const fetchGroupHomes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/group-homes`);
      const data = await response.json();
      setGroupHomes(data);
      if (data.length > 0 && !selectedGroupHome) {
        setSelectedGroupHome(data[0].id);
      }
    } catch (err) {
      setError('Failed to fetch group homes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimesheets = async (groupHomeId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/timesheets?groupHomeId=${groupHomeId}`);
      const data = await response.json();
      setTimesheets(data);
    } catch (err) {
      setError('Failed to fetch timesheets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGroupHome) {
      fetchTimesheets(selectedGroupHome);
    }
  }, [selectedGroupHome]);

  const handleCreateTimesheet = async (timesheetData) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/timesheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_home_id: selectedGroupHome,
          ...timesheetData
        })
      });

      if (!response.ok) throw new Error('Failed to create timesheet');
      
      const newTimesheet = await response.json();
      setTimesheets([newTimesheet, ...timesheets]);
      setCurrentPage('dashboard');
      setError(null);
    } catch (err) {
      setError('Failed to create timesheet: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupHomeCreated = () => {
    fetchGroupHomes();
  };

  return (
    <div className="app">
      <Navigation 
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        groupHomes={groupHomes}
        selectedGroupHome={selectedGroupHome}
        onGroupHomeChange={setSelectedGroupHome}
      />

      <main className="app-content">
        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {loading && <div className="loading">Loading...</div>}

        {!loading && (
          <>
            {currentPage === 'dashboard' && (
              <Dashboard 
                selectedGroupHome={selectedGroupHome}
                timesheets={timesheets}
                onEditTimesheet={(ts) => {
                  setSelectedTimesheet(ts);
                  setCurrentPage('editor');
                }}
                apiUrl={API_URL}
              />
            )}

            {currentPage === 'create-timesheet' && (
              <TimesheetForm 
                onSubmit={handleCreateTimesheet}
                selectedGroupHome={selectedGroupHome}
                apiUrl={API_URL}
              />
            )}

            {currentPage === 'editor' && selectedTimesheet && (
              <TimesheetEditor 
                timesheet={selectedTimesheet}
                onBack={() => {
                  setCurrentPage('dashboard');
                  fetchTimesheets(selectedGroupHome);
                }}
                apiUrl={API_URL}
              />
            )}

            {currentPage === 'manage-homes' && (
              <GroupHomeManager 
                groupHomes={groupHomes}
                onGroupHomeCreated={handleGroupHomeCreated}
                apiUrl={API_URL}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
