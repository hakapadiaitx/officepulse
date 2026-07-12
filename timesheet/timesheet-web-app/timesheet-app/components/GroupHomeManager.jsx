import React, { useState } from 'react';
import '../styles/GroupHomeManager.css';

const GroupHomeManager = ({ groupHomes, onGroupHomeCreated, apiUrl }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', address: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Group home name is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/group-homes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to create group home');

      setFormData({ name: '', address: '', phone: '' });
      setShowForm(false);
      setMessage('Group home created successfully!');
      setTimeout(() => setMessage(''), 3000);
      onGroupHomeCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group-home-manager">
      <div className="manager-header">
        <h1>Manage Group Homes</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ New Group Home'}
        </button>
      </div>

      {message && <div className="success-message">{message}</div>}

      {showForm && (
        <div className="form-card">
          <h2>Create New Group Home</h2>
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Group Home Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Gerald Street Program"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="address">Address</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="123 Main Street, City, State ZIP"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="(401) 555-0123"
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Group Home'}
            </button>
          </form>
        </div>
      )}

      <div className="group-homes-list">
        <h2>Existing Group Homes ({groupHomes.length})</h2>
        {groupHomes.length === 0 ? (
          <div className="empty-state">
            <p>No group homes created yet</p>
          </div>
        ) : (
          <div className="homes-grid">
            {groupHomes.map(home => (
              <div key={home.id} className="home-card">
                <h3>{home.name}</h3>
                {home.address && <p className="address">📍 {home.address}</p>}
                {home.phone && <p className="phone">📞 {home.phone}</p>}
                <p className="created">Created: {new Date(home.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupHomeManager;
