# Timesheet Management System - Setup Guide

A modern web-based timesheet application with PostgreSQL backend, React frontend, and analytics dashboard.

## Features

✅ **Multiple Group Homes** - Create and manage timesheets for different locations
✅ **Time Entry** - 15-minute interval dropdowns (12-hour AM/PM format)
✅ **Overnight Shifts** - Automatically calculates hours crossing midnight
✅ **Dashboard Analytics** - View time allocation by employee and day
✅ **Summary Reports** - Daily totals, weekly totals, employee statistics
✅ **Responsive Design** - Works on desktop and mobile devices

---

## Architecture

```
Frontend (React)
    ↓
Backend API (Express/Node.js)
    ↓
PostgreSQL Database
```

---

## Prerequisites

Before starting, install:

1. **Node.js** (v14+) - https://nodejs.org/
2. **PostgreSQL** (v12+) - https://www.postgresql.org/download/
3. **npm** (comes with Node.js)

---

## Backend Setup

### Step 1: Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE timesheet_db;

# Exit PostgreSQL
\q
```

### Step 2: Initialize Database Schema

```bash
# Navigate to project directory
cd timesheet-app

# Run the SQL schema
psql -U postgres -d timesheet_db -f database-schema.sql
```

You should see tables created for:
- `group_homes`
- `employees`
- `timesheets`
- `time_entries`

### Step 3: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your PostgreSQL credentials
# Update DB_USER, DB_PASSWORD, etc.
```

### Step 4: Install Backend Dependencies

```bash
npm install
```

This installs:
- express
- pg (PostgreSQL client)
- cors
- dotenv

### Step 5: Start Backend Server

```bash
npm start
```

You should see:
```
✓ Connected to PostgreSQL
✓ Server running on http://localhost:5000
```

The API is now ready at `http://localhost:5000/api`

**Available Endpoints:**
- `GET /api/group-homes` - List all group homes
- `GET /api/timesheets` - List timesheets
- `GET /api/analytics/employee-hours/:id` - Employee hours analytics
- `GET /api/analytics/daily-hours/:id` - Daily hours analytics
- See `server.js` for complete API documentation

---

## Frontend Setup

### Step 1: Create React App

From a different terminal (keep backend running):

```bash
# Create React app
npx create-react-app timesheet-web

# Navigate to project
cd timesheet-web
```

### Step 2: Install Frontend Dependencies

```bash
npm install recharts
```

This installs the charting library for dashboards.

### Step 3: Copy React Files

Copy these files to your React app:

```
src/
  ├── App.jsx (replace src/App.js)
  ├── components/
  │   ├── Dashboard.jsx
  │   ├── TimesheetForm.jsx
  │   ├── TimesheetEditor.jsx
  │   ├── GroupHomeManager.jsx
  │   └── Navigation.jsx
  └── styles/
      ├── App.css
      ├── Navigation.css
      ├── Dashboard.css
      ├── TimesheetEditor.css
      ├── TimesheetForm.css
      └── GroupHomeManager.css
```

### Step 4: Create .env File

```bash
# In React app root
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
```

### Step 5: Start Frontend

```bash
npm start
```

Frontend will open at `http://localhost:3000`

---

## Testing the Application

### 1. Access the App

Open browser: `http://localhost:3000`

### 2. Create a Timesheet

1. Click **"New Timesheet"** in navigation
2. Select date range (e.g., 01/15/2024 to 01/21/2024)
3. Click **"Create Timesheet"**

### 3. Edit Times

1. In Dashboard, click **"Edit"** on a timesheet
2. Click time dropdowns to select start/end times
3. Hours calculate automatically
4. Try overnight shifts:
   - Start: 11:00 PM
   - End: 6:00 AM
   - Should show 7.00 hours ✓

### 4. View Analytics

1. Go to **Dashboard**
2. See:
   - Summary cards (Total Hours, Staff Count, etc.)
   - Charts by employee and day
   - All timesheet history
   - Group home overview

### 5. Manage Group Homes

1. Click **"Manage Homes"** in navigation
2. Create new group homes (e.g., Elm Street Program)
3. Employees auto-populate from database
4. Switch between homes using dropdown

---

## Production Deployment

### Option 1: Deploy on Free Tier Services

#### Backend (Render.com)
```
1. Push code to GitHub
2. Sign up at https://render.com
3. Create new "Web Service"
4. Connect GitHub repository
5. Set environment variables (DATABASE_URL, etc.)
6. Deploy
```

#### Frontend (Vercel)
```
1. Sign up at https://vercel.com
2. Import GitHub repository
3. Set REACT_APP_API_URL to your Render backend
4. Deploy
```

#### Database (ElephantSQL)
```
1. Sign up at https://www.elephantsql.com
2. Create free PostgreSQL instance
3. Get connection string
4. Use in backend environment variables
```

### Option 2: Deploy Locally on VPS

```bash
# On VPS (Ubuntu 20.04+)

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Clone and setup
git clone [your-repo]
cd timesheet-app
npm install

# Start with PM2 (process manager)
sudo npm install -g pm2
pm2 start server.js --name timesheet-api
pm2 startup
pm2 save

# Setup Nginx reverse proxy
sudo apt-get install -y nginx
# Configure nginx.conf to proxy to localhost:5000
```

---

## API Documentation

### Group Homes

```
GET    /api/group-homes                    # List all
GET    /api/group-homes/:id                # Get single home
POST   /api/group-homes                    # Create home
PUT    /api/group-homes/:id                # Update home
```

### Employees

```
GET    /api/group-homes/:id/employees      # List employees
POST   /api/employees                       # Create employee
```

### Timesheets

```
GET    /api/timesheets                      # List all
GET    /api/timesheets/:id                  # Get single
POST   /api/timesheets                      # Create
PUT    /api/timesheets/:id                  # Update status
```

### Time Entries

```
PUT    /api/time-entries/:id                # Update times
```

### Analytics

```
GET    /api/analytics/employee-hours/:id   # Hours by employee
GET    /api/analytics/daily-hours/:id      # Hours by day
GET    /api/analytics/group-home-summary   # Group home stats
GET    /api/analytics/all-group-homes-stats # All homes overview
```

---

## Customization

### Change Color Scheme

Edit `styles/App.css` CSS variables:

```css
:root {
  --primary-color: #4472C4;      /* Change this */
  --secondary-color: #70AD47;    /* And this */
  --danger-color: #FFC7CE;
  /* etc... */
}
```

### Add More Fields

Edit `database-schema.sql` to add columns:

```sql
ALTER TABLE employees ADD COLUMN salary DECIMAL(10,2);
```

### Customize Company Name

Edit all components to replace "Community Living of Rhode Island" with your company name.

### Add Email Notifications

Install nodemailer:
```bash
npm install nodemailer
```

Send emails when timesheets are submitted.

---

## Troubleshooting

### "Cannot connect to PostgreSQL"
- Check PostgreSQL is running: `sudo service postgresql status`
- Verify credentials in `.env`
- Ensure database exists: `psql -l`

### "API returns 404"
- Check backend is running: `http://localhost:5000/api/group-homes`
- Verify REACT_APP_API_URL in React .env
- Check CORS is enabled in server.js

### "Dropdown times not appearing"
- Clear browser cache
- Restart backend server
- Check console for errors (F12)

### "Hours not calculating"
- Ensure both start_time and end_time are set
- Check database has time_entries records
- Test with manual SQL query

---

## Database Backup & Restore

### Backup

```bash
pg_dump -U postgres timesheet_db > backup.sql
```

### Restore

```bash
psql -U postgres timesheet_db < backup.sql
```

---

## Support & Documentation

- **React Docs**: https://react.dev
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Express Docs**: https://expressjs.com/
- **Recharts Docs**: https://recharts.org/

---

## License

This timesheet application is provided as-is for use by Community Living Rhode Island.

---

## Next Steps

1. ✅ Follow this guide to set up locally
2. ✅ Test with sample data
3. ✅ Customize with your company branding
4. ✅ Add additional employees and group homes
5. ✅ Deploy to production
6. ✅ Train staff on usage
7. ✅ Monitor analytics dashboard

---

**Questions?** Review the code comments in each component file for detailed explanations.
