# ⏱️ Timesheet Management System

A modern, full-stack web application for managing employee timesheets across multiple group homes.

![Status](https://img.shields.io/badge/status-ready-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node Version](https://img.shields.io/badge/node-14+-green)

---

## 🎯 Features

### Core Functionality
- ✅ **Multiple Group Homes** - Manage separate timesheets for each location
- ✅ **Employee Management** - Add/manage staff across group homes
- ✅ **Time Entry** - Easy 15-minute interval dropdowns
- ✅ **12-Hour Format** - AM/PM time display (not 24-hour)
- ✅ **Overnight Shifts** - Correctly calculates hours crossing midnight
  - Example: 11:45 PM to 6:00 AM = 6.25 hours ✓

### Analytics & Reports
- 📊 **Dashboard** - Real-time visualization of time data
- 📈 **Employee Hours Chart** - Bar chart by employee
- 📅 **Daily Hours Chart** - Line chart by day of week
- 📋 **Summary Cards** - Total hours, staff count, averages
- 🏢 **Multi-Home Overview** - Compare statistics across all locations

### UI/UX
- 🎨 **Responsive Design** - Works perfectly on desktop and mobile
- ⚡ **Fast & Smooth** - Instant updates, no page reloads
- 🎯 **Intuitive Navigation** - One-click access to all features
- 🔄 **Real-time Sync** - Changes saved immediately to database

---

## 🏗️ Architecture

```
React Frontend              Express Backend            PostgreSQL
(Desktop/Mobile)          (REST API)                (Database)
     |                        |                         |
   UI Layer ←→         API Routes ←→          Tables:
  - Dashboard          - Group Homes          - group_homes
  - Timesheets         - Employees            - employees
  - Time Entry         - Timesheets           - timesheets
  - Analytics          - Time Entries         - time_entries
                        - Reports
```

---

## 📦 Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **PostgreSQL** - Relational database
- **pg** - PostgreSQL client

### Frontend
- **React** - UI library
- **Recharts** - Charting library
- **CSS3** - Styling

---

## 🚀 Quick Start

### 1️⃣ Prerequisites
```bash
# Check installations
node --version  # v14 or higher
npm --version
psql --version # PostgreSQL v12+
```

### 2️⃣ Database Setup
```bash
# Create database
psql -U postgres -c "CREATE DATABASE timesheet_db;"

# Initialize schema (loads sample data)
psql -U postgres -d timesheet_db -f database-schema.sql
```

### 3️⃣ Backend Setup
```bash
cd timesheet-app

# Copy environment template
cp .env.example .env
# Edit .env with your PostgreSQL password

# Install dependencies
npm install

# Start server
npm start
# Should show: ✓ Server running on http://localhost:5000
```

### 4️⃣ Frontend Setup
```bash
# In new terminal
npx create-react-app timesheet-web
cd timesheet-web

# Install charting library
npm install recharts

# Copy components folder from this project to src/
# Copy styles folder from this project to src/

# Create environment
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env

# Start frontend
npm start
# Should open http://localhost:3000
```

### 5️⃣ Start Using
- Create a group home (Manage Homes)
- Create a timesheet (New Timesheet)
- Edit times (click Edit on timesheet)
- View analytics (Dashboard)

---

## 📖 Documentation

### Setup & Deployment
- **[QUICKSTART.md](./QUICKSTART.md)** - Get running in 5 minutes
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Complete setup & production deployment
- **[DATABASE_SCHEMA](./database-schema.sql)** - Database structure

### Code Structure
```
timesheet-app/
├── server.js                    # Express API server
├── database-schema.sql          # PostgreSQL schema
├── package.json                 # Node.js dependencies
├── .env.example                 # Environment variables
├── components/
│   ├── App.jsx                  # Main app container
│   ├── Dashboard.jsx            # Analytics dashboard
│   ├── TimesheetForm.jsx        # New timesheet form
│   ├── TimesheetEditor.jsx      # Time entry editor
│   ├── GroupHomeManager.jsx     # Manage group homes
│   └── Navigation.jsx           # Header navigation
└── styles/
    ├── App.css                  # Global styles
    ├── Dashboard.css            # Dashboard styles
    ├── TimesheetEditor.css      # Editor table styles
    └── ...
```

---

## 📊 API Endpoints

### Group Homes
```
GET    /api/group-homes                    # List all group homes
GET    /api/group-homes/:id                # Get single group home
POST   /api/group-homes                    # Create group home
PUT    /api/group-homes/:id                # Update group home
```

### Employees
```
GET    /api/group-homes/:id/employees      # List employees
POST   /api/employees                       # Create employee
```

### Timesheets
```
GET    /api/timesheets                      # List all timesheets
GET    /api/timesheets/:id                  # Get single timesheet
POST   /api/timesheets                      # Create timesheet
PUT    /api/timesheets/:id                  # Update timesheet status
```

### Time Entries
```
PUT    /api/time-entries/:id                # Update time entry
```

### Analytics
```
GET    /api/analytics/employee-hours/:id   # Hours by employee
GET    /api/analytics/daily-hours/:id      # Hours by day
GET    /api/analytics/group-home-summary/:id  # Group home stats
GET    /api/analytics/all-group-homes-stats   # All homes overview
```

---

## 🧮 Calculations

### Time Difference (Same Day)
```
Start: 9:00 AM
End:   5:00 PM
Hours: 8.00
```

### Time Difference (Overnight)
```
Start: 11:45 PM
End:   6:00 AM (next day)
Hours: 6.25  ✓ Automatically handled
```

### Daily Total
```
Employee 1: 8.0 hours
Employee 2: 7.5 hours
Employee 3: 8.25 hours
─────────────────────
Daily Total: 23.75 hours
```

---

## 🎨 Customization

### Change Company Name
Edit all components, replace "Community Living of Rhode Island" with your company.

### Change Colors
Edit `styles/App.css`:
```css
:root {
  --primary-color: #4472C4;      /* Blue */
  --secondary-color: #70AD47;    /* Green */
  --danger-color: #FFC7CE;       /* Red */
  /* etc... */
}
```

### Add Additional Fields
1. Add columns to PostgreSQL:
```sql
ALTER TABLE employees ADD COLUMN salary DECIMAL(10,2);
```

2. Update API to return new field
3. Update React components to display it

---

## 🔒 Security

### Current Implementation
- ✅ CORS enabled for local development
- ✅ SQL injection protected (parameterized queries)
- ✅ Input validation on API endpoints

### For Production
- 🔐 Add authentication (JWT tokens)
- 🔐 Add HTTPS/SSL certificates
- 🔐 Add role-based access control (Admin/Staff)
- 🔐 Add password hashing
- 🔐 Add rate limiting

---

## 📱 Browser Support

| Browser | Status |
|---------|--------|
| Chrome  | ✅ Full Support |
| Firefox | ✅ Full Support |
| Safari  | ✅ Full Support |
| Edge    | ✅ Full Support |
| IE 11   | ❌ Not Supported |

---

## 🚨 Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Test connection
psql -U postgres -d timesheet_db
```

### Port Already in Use
```bash
# Change PORT in .env
PORT=5001
```

### CORS Errors
```bash
# Ensure REACT_APP_API_URL matches backend
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

### Hours Not Calculating
1. Check both start_time and end_time are set
2. Check database has time_entries records
3. Look at browser console (F12) for errors

---

## 📈 Performance

### Optimization Features
- ✅ Lazy loading components
- ✅ Memoized calculations
- ✅ Database indexes on common queries
- ✅ Efficient pagination (timesheets)

### Expected Performance
- Page load: < 2 seconds
- Time entry save: < 500ms
- Dashboard load: < 1 second (with charts)
- Analytics calculation: < 100ms

---

## 🔄 Deployment

### Local Development
```bash
# Terminal 1: Backend
cd timesheet-app && npm start

# Terminal 2: Frontend
cd timesheet-web && npm start
```

### Production (Simple)
See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for:
- ☁️ Vercel (Frontend)
- ☁️ Render.com (Backend)
- ☁️ ElephantSQL (Database)
- 🏢 VPS Deployment
- 🐳 Docker Containerization

---

## 📝 Sample Data

Database includes:
- **3 Group Homes**: Gerald Street, Elm Street, Oak Avenue
- **6 Employees**: Distributed across homes
- **Ready to Use**: Create timesheets immediately

---

## 🤝 Contributing

To add features:
1. Create a new branch
2. Make changes
3. Test locally
4. Create pull request

### Common Additions
- [ ] Email notifications
- [ ] PDF export
- [ ] Mobile app
- [ ] Payroll integration
- [ ] User authentication
- [ ] Multi-language support

---

## 📞 Support

### Resources
- **Documentation**: See SETUP_GUIDE.md
- **API Docs**: See server.js comments
- **Component Docs**: See JSX file comments
- **Issues**: Check Troubleshooting section

### Getting Help
1. Check documentation
2. Review console errors (F12)
3. Check database connection
4. Review API responses

---

## 📄 License

This project is provided as-is for Community Living Rhode Island.

---

## ✨ What's Next?

After setup:
1. ✅ Customize with your company branding
2. ✅ Add more employees and group homes
3. ✅ Create test timesheets
4. ✅ Explore analytics dashboard
5. ✅ Set up production deployment
6. ✅ Train staff members
7. ✅ Monitor and optimize

---

**Version**: 1.0.0  
**Last Updated**: 2026-07-02  
**Status**: Production Ready ✅

---

## 📞 Questions?

Review the setup guide or check the detailed comments in each code file.
