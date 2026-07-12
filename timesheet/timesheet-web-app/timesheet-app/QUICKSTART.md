# Quick Start (5 Minutes)

## Prerequisites
- Node.js installed
- PostgreSQL installed and running

## Backend (Terminal 1)

```bash
# Navigate to project
cd timesheet-app

# 1. Create database
psql -U postgres -c "CREATE DATABASE timesheet_db;"

# 2. Initialize schema
psql -U postgres -d timesheet_db -f database-schema.sql

# 3. Setup environment
cp .env.example .env
# Edit .env with your PostgreSQL password

# 4. Install dependencies
npm install

# 5. Start server
npm start
# ✓ You should see: "Server running on http://localhost:5000"
```

## Frontend (Terminal 2)

```bash
# Create React app (first time only)
npx create-react-app timesheet-web
cd timesheet-web

# Install chart library
npm install recharts

# Copy files from timesheet-app/components and styles to src/

# Create .env
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env

# Start frontend
npm start
# ✓ Should open http://localhost:3000
```

## Using the App

1. **Create Group Home**: Click "Manage Homes" → "New Group Home"
2. **Create Timesheet**: Click "New Timesheet" → Select dates → Create
3. **Edit Times**: Click "Edit" on timesheet → Select start/end times
4. **View Analytics**: Dashboard shows all charts and summaries

## Sample Data Already Included

✅ 3 group homes (Gerald Street, Elm Street, Oak Avenue)
✅ 6 employees across homes
✅ Ready to create timesheets immediately

## Common Issues

| Issue | Solution |
|-------|----------|
| "Cannot connect to database" | Check PostgreSQL is running: `sudo service postgresql status` |
| "Port 5000 already in use" | Change PORT in .env to 5001 |
| "CORS error" | Backend API URL doesn't match. Edit React .env REACT_APP_API_URL |
| "Timesheet won't save" | Check browser console (F12) for errors |

## Next: Production

See `SETUP_GUIDE.md` for deployment to Vercel, Render, etc.
