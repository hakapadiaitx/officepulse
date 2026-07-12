import React from 'react';
import '../styles/Navigation.css';

const Navigation = ({ 
  currentPage, 
  onPageChange, 
  groupHomes, 
  selectedGroupHome, 
  onGroupHomeChange 
}) => {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <h1>⏱️ Timesheet Manager</h1>
        </div>

        <div className="nav-content">
          <div className="nav-selector">
            <label htmlFor="groupHome">Group Home:</label>
            <select 
              id="groupHome"
              value={selectedGroupHome || ''}
              onChange={(e) => onGroupHomeChange(e.target.value)}
              className="group-home-select"
            >
              {groupHomes.map(home => (
                <option key={home.id} value={home.id}>
                  {home.name}
                </option>
              ))}
            </select>
          </div>

          <div className="nav-menu">
            <button 
              className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
              onClick={() => onPageChange('dashboard')}
            >
              📊 Dashboard
            </button>
            <button 
              className={`nav-item ${currentPage === 'create-timesheet' ? 'active' : ''}`}
              onClick={() => onPageChange('create-timesheet')}
            >
              📝 New Timesheet
            </button>
            <button 
              className={`nav-item ${currentPage === 'manage-homes' ? 'active' : ''}`}
              onClick={() => onPageChange('manage-homes')}
            >
              🏢 Manage Homes
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
