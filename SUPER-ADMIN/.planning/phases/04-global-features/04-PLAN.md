# Phase 4: Global Features — Plan A (Cross-Tenant Communications)

---

wave: 1
depends_on: [03-subscription-analytics-engine]
files_modified:

- backend/database/schema.sql
- backend/controllers/superAdminGlobalController.js
- backend/routes/superAdminRoutes.js
- frontend/src/pages/sp/AnnouncementManager.jsx
- frontend/src/pages/sp/SupportManager.jsx
- frontend/src/services/superAdminService.js
- frontend/src/components/school/AnnouncementBanner.jsx
- frontend/src/App.jsx
  autonomous: true
  requirements: [GLB-01, GLB-02]

---

## Overview

Implement cross-tenant communication features: system announcements that appear as banners on all school dashboards, and support messaging to view tickets submitted by school admins.

## Plans

### Plan 1: Database Schema for Global Features

<task>
<title>Add tables for system announcements and support tickets</title>
<read_first>
- backend/database/schema.sql
</read_first>
<action>
1. Add `system_announcements` table to `backend/database/schema.sql`:
   ```sql
   CREATE TABLE IF NOT EXISTS system_announcements (
     id SERIAL PRIMARY KEY,
     title VARCHAR(255) NOT NULL,
     message TEXT NOT NULL,
     is_active BOOLEAN DEFAULT true,
     created_by INTEGER REFERENCES service_provider_staff(id),
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. Add `support_tickets` table to `backend/database/schema.sql`:

   ```sql
   CREATE TABLE IF NOT EXISTS support_tickets (
     id SERIAL PRIMARY KEY,
     school_id INTEGER REFERENCES school(id),
     submitted_by INTEGER REFERENCES app_user(id),
     subject VARCHAR(255) NOT NULL,
     description TEXT NOT NULL,
     status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
     priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     resolved_at TIMESTAMP,
     assigned_to INTEGER REFERENCES service_provider_staff(id)
   );
   ```

3. Run the migration:
   ```bash
   cd backend && node migrate-init.js
   ```
   </action>
   <acceptance_criteria>

- `backend/database/schema.sql` contains `CREATE TABLE system_announcements`
- `backend/database/schema.sql` contains `CREATE TABLE support_tickets`
- Migration runs without errors
  </acceptance_criteria>
  </task>

### Plan 2: Backend APIs for Global Features

<task>
<title>Create controller and routes for announcements and support tickets</title>
<read_first>
- backend/controllers/superAdminGlobalController.js
- backend/routes/superAdminRoutes.js
</read_first>
<action>
1. Create `backend/controllers/superAdminGlobalController.js` with announcement management:
   ```js
   const pool = require('../config/db');

// Announcements
exports.getAnnouncements = async (req, res) => {
try {
const result = await pool.query('SELECT \* FROM system_announcements ORDER BY created_at DESC');
res.json(result.rows);
} catch (error) {
console.error('Error fetching announcements:', error);
res.status(500).json({ error: 'Failed to fetch announcements' });
}
};

exports.createAnnouncement = async (req, res) => {
const { title, message } = req.body;
const created_by = req.user.id;

     try {
       const result = await pool.query(
         'INSERT INTO system_announcements (title, message, created_by) VALUES ($1, $2, $3) RETURNING *',
         [title, message, created_by]
       );
       res.status(201).json(result.rows[0]);
     } catch (error) {
       console.error('Error creating announcement:', error);
       res.status(500).json({ error: 'Failed to create announcement' });
     }

};

exports.updateAnnouncement = async (req, res) => {
const { id } = req.params;
const { title, message, is_active } = req.body;

     try {
       const result = await pool.query(
         'UPDATE system_announcements SET title = $1, message = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
         [title, message, is_active, id]
       );
       if (result.rows.length === 0) {
         return res.status(404).json({ error: 'Announcement not found' });
       }
       res.json(result.rows[0]);
     } catch (error) {
       console.error('Error updating announcement:', error);
       res.status(500).json({ error: 'Failed to update announcement' });
     }

};

// Support Tickets
exports.getSupportTickets = async (req, res) => {
try {
const result = await pool.query(`          SELECT st.*, s.name as school_name, au.username as submitted_by_name
         FROM support_tickets st
         JOIN school s ON st.school_id = s.id
         JOIN app_user au ON st.submitted_by = au.id
         ORDER BY st.created_at DESC
       `);
res.json(result.rows);
} catch (error) {
console.error('Error fetching support tickets:', error);
res.status(500).json({ error: 'Failed to fetch support tickets' });
}
};

exports.updateTicketStatus = async (req, res) => {
const { id } = req.params;
const { status, assigned_to } = req.body;

     try {
       const result = await pool.query(
         'UPDATE support_tickets SET status = $1, assigned_to = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
         [status, assigned_to, id]
       );
       if (result.rows.length === 0) {
         return res.status(404).json({ error: 'Ticket not found' });
       }
       res.json(result.rows[0]);
     } catch (error) {
       console.error('Error updating ticket:', error);
       res.status(500).json({ error: 'Failed to update ticket' });
     }

};

````

2. Add routes to `backend/routes/superAdminRoutes.js`:
```js
const globalController = require('../controllers/superAdminGlobalController');

// Announcement routes
router.get('/announcements', verifyInternalStaff, globalController.getAnnouncements);
router.post('/announcements', verifyInternalStaff, globalController.createAnnouncement);
router.patch('/announcements/:id', verifyInternalStaff, globalController.updateAnnouncement);

// Support ticket routes
router.get('/support-tickets', verifyInternalStaff, globalController.getSupportTickets);
router.patch('/support-tickets/:id/status', verifyInternalStaff, globalController.updateTicketStatus);
````

</action>
<acceptance_criteria>
- `backend/controllers/superAdminGlobalController.js` exists with all CRUD functions
- `backend/routes/superAdminRoutes.js` contains announcement and support ticket routes
- Backend loads without errors
</acceptance_criteria>
</task>

### Plan 3: Frontend Announcement Manager

<task>
<title>Create UI for managing system announcements</title>
<read_first>
- frontend/src/pages/sp/AnnouncementManager.jsx
- frontend/src/services/superAdminService.js
- frontend/src/App.jsx
</read_first>
<action>
1. Create `frontend/src/pages/sp/AnnouncementManager.jsx`:
   ```jsx
   import { useState, useEffect } from 'react';
   import superAdminService from '../../services/superAdminService';

const AnnouncementManager = () => {
const [announcements, setAnnouncements] = useState([]);
const [form, setForm] = useState({ title: '', message: '' });
const [loading, setLoading] = useState(false);

     useEffect(() => {
       loadAnnouncements();
     }, []);

     const loadAnnouncements = async () => {
       try {
         const data = await superAdminService.getAnnouncements();
         setAnnouncements(data);
       } catch (error) {
         console.error('Error loading announcements:', error);
       }
     };

     const handleSubmit = async (e) => {
       e.preventDefault();
       setLoading(true);
       try {
         await superAdminService.createAnnouncement(form);
         setForm({ title: '', message: '' });
         loadAnnouncements();
       } catch (error) {
         console.error('Error creating announcement:', error);
       } finally {
         setLoading(false);
       }
     };

     const toggleActive = async (id, is_active) => {
       try {
         await superAdminService.updateAnnouncement(id, { is_active: !is_active });
         loadAnnouncements();
       } catch (error) {
         console.error('Error updating announcement:', error);
       }
     };

     return (
       <div className="sp-container">
         <h2>System Announcements</h2>

         <form onSubmit={handleSubmit} className="sp-form">
           <div className="sp-form-group">
             <label>Title</label>
             <input
               type="text"
               value={form.title}
               onChange={(e) => setForm({...form, title: e.target.value})}
               required
             />
           </div>
           <div className="sp-form-group">
             <label>Message</label>
             <textarea
               value={form.message}
               onChange={(e) => setForm({...form, message: e.target.value})}
               required
             />
           </div>
           <button type="submit" disabled={loading} className="sp-btn">
             {loading ? 'Creating...' : 'Create Announcement'}
           </button>
         </form>

         <div className="sp-table-container">
           <table className="sp-table">
             <thead>
               <tr>
                 <th>Title</th>
                 <th>Message</th>
                 <th>Status</th>
                 <th>Created</th>
                 <th>Actions</th>
               </tr>
             </thead>
             <tbody>
               {announcements.map(announcement => (
                 <tr key={announcement.id}>
                   <td>{announcement.title}</td>
                   <td>{announcement.message}</td>
                   <td>{announcement.is_active ? 'Active' : 'Inactive'}</td>
                   <td>{new Date(announcement.created_at).toLocaleDateString()}</td>
                   <td>
                     <button
                       onClick={() => toggleActive(announcement.id, announcement.is_active)}
                       className="sp-btn-small"
                     >
                       {announcement.is_active ? 'Deactivate' : 'Activate'}
                     </button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       </div>
     );

};

export default AnnouncementManager;

````

2. Add methods to `frontend/src/services/superAdminService.js`:
```js
// Announcements
export const getAnnouncements = () => api.get('/announcements').then(res => res.data);
export const createAnnouncement = (data) => api.post('/announcements', data).then(res => res.data);
export const updateAnnouncement = (id, data) => api.patch(`/announcements/${id}`, data).then(res => res.data);

// Support Tickets
export const getSupportTickets = () => api.get('/support-tickets').then(res => res.data);
export const updateTicketStatus = (id, data) => api.patch(`/support-tickets/${id}/status`, data).then(res => res.data);
````

3. Add route to `frontend/src/App.jsx`:
   ```jsx
   import AnnouncementManager from "./pages/sp/AnnouncementManager";
   // ... in the protected routes section
   <Route
     path="/sp-control-portal/announcements"
     element={<AnnouncementManager />}
   />;
   ```
   </action>
   <acceptance_criteria>

- `frontend/src/pages/sp/AnnouncementManager.jsx` exists with form and table
- `frontend/src/services/superAdminService.js` contains announcement methods
- `frontend/src/App.jsx` contains announcement route
- Frontend builds without errors
  </acceptance_criteria>
  </task>

### Plan 4: Frontend Support Manager

<task>
<title>Create UI for managing support tickets</title>
<read_first>
- frontend/src/pages/sp/SupportManager.jsx
- frontend/src/App.jsx
</read_first>
<action>
1. Create `frontend/src/pages/sp/SupportManager.jsx`:
   ```jsx
   import { useState, useEffect } from 'react';
   import superAdminService from '../../services/superAdminService';

const SupportManager = () => {
const [tickets, setTickets] = useState([]);
const [loading, setLoading] = useState(false);

     useEffect(() => {
       loadTickets();
     }, []);

     const loadTickets = async () => {
       try {
         const data = await superAdminService.getSupportTickets();
         setTickets(data);
       } catch (error) {
         console.error('Error loading tickets:', error);
       }
     };

     const updateStatus = async (id, status) => {
       setLoading(true);
       try {
         await superAdminService.updateTicketStatus(id, { status });
         loadTickets();
       } catch (error) {
         console.error('Error updating ticket:', error);
       } finally {
         setLoading(false);
       }
     };

     const getStatusColor = (status) => {
       switch (status) {
         case 'open': return 'status-open';
         case 'in_progress': return 'status-progress';
         case 'resolved': return 'status-resolved';
         case 'closed': return 'status-closed';
         default: return '';
       }
     };

     return (
       <div className="sp-container">
         <h2>Support Tickets</h2>

         <div className="sp-table-container">
           <table className="sp-table">
             <thead>
               <tr>
                 <th>School</th>
                 <th>Submitted By</th>
                 <th>Subject</th>
                 <th>Priority</th>
                 <th>Status</th>
                 <th>Created</th>
                 <th>Actions</th>
               </tr>
             </thead>
             <tbody>
               {tickets.map(ticket => (
                 <tr key={ticket.id}>
                   <td>{ticket.school_name}</td>
                   <td>{ticket.submitted_by_name}</td>
                   <td>{ticket.subject}</td>
                   <td className={`priority-${ticket.priority}`}>{ticket.priority}</td>
                   <td className={getStatusColor(ticket.status)}>{ticket.status.replace('_', ' ')}</td>
                   <td>{new Date(ticket.created_at).toLocaleDateString()}</td>
                   <td>
                     <select
                       value={ticket.status}
                       onChange={(e) => updateStatus(ticket.id, e.target.value)}
                       disabled={loading}
                       className="sp-select"
                     >
                       <option value="open">Open</option>
                       <option value="in_progress">In Progress</option>
                       <option value="resolved">Resolved</option>
                       <option value="closed">Closed</option>
                     </select>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       </div>
     );

};

export default SupportManager;

````

2. Add route to `frontend/src/App.jsx`:
```jsx
import SupportManager from './pages/sp/SupportManager';
// ... in the protected routes section
<Route path="/sp-control-portal/support" element={<SupportManager />} />
````

</action>
<acceptance_criteria>
- `frontend/src/pages/sp/SupportManager.jsx` exists with ticket table
- `frontend/src/App.jsx` contains support route
- Frontend builds without errors
</acceptance_criteria>
</task>

### Plan 5: School Dashboard Announcement Banner

<task>
<title>Add announcement banner to school dashboards</title>
<read_first>
- frontend/src/components/school/AnnouncementBanner.jsx
- frontend/src/App.jsx
</read_first>
<action>
1. Create `frontend/src/components/school/AnnouncementBanner.jsx`:
   ```jsx
   import { useState, useEffect } from 'react';
   import axios from 'axios';

const AnnouncementBanner = () => {
const [announcements, setAnnouncements] = useState([]);
const [currentIndex, setCurrentIndex] = useState(0);

     useEffect(() => {
       loadAnnouncements();
     }, []);

     const loadAnnouncements = async () => {
       try {
         // This would need a public endpoint for schools to fetch active announcements
         const response = await axios.get('/api/public/announcements');
         setAnnouncements(response.data.filter(ann => ann.is_active));
       } catch (error) {
         console.error('Error loading announcements:', error);
       }
     };

     useEffect(() => {
       if (announcements.length > 1) {
         const interval = setInterval(() => {
           setCurrentIndex(prev => (prev + 1) % announcements.length);
         }, 10000); // Rotate every 10 seconds
         return () => clearInterval(interval);
       }
     }, [announcements]);

     if (announcements.length === 0) return null;

     const currentAnnouncement = announcements[currentIndex];

     return (
       <div className="announcement-banner">
         <div className="announcement-content">
           <strong>{currentAnnouncement.title}</strong>: {currentAnnouncement.message}
         </div>
         {announcements.length > 1 && (
           <div className="announcement-indicators">
             {announcements.map((_, index) => (
               <span
                 key={index}
                 className={`indicator ${index === currentIndex ? 'active' : ''}`}
                 onClick={() => setCurrentIndex(index)}
               />
             ))}
           </div>
         )}
       </div>
     );

};

export default AnnouncementBanner;

````

2. Add public announcement endpoint to backend (in a new public routes file or existing):
```js
// In backend/routes/publicRoutes.js or similar
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/announcements', async (req, res) => {
  try {
    const result = await pool.query('SELECT title, message FROM system_announcements WHERE is_active = true ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

module.exports = router;
````

3. Mount public routes in `backend/app.js`:

   ```js
   const publicRoutes = require("./routes/publicRoutes");
   app.use("/api/public", publicRoutes);
   ```

4. Add banner to school dashboard in `frontend/src/App.jsx`:
   ```jsx
   import AnnouncementBanner from "./components/school/AnnouncementBanner";
   // ... in the school routes section
   <AnnouncementBanner />;
   ```
   </action>
   <acceptance_criteria>

- `frontend/src/components/school/AnnouncementBanner.jsx` exists with rotation logic
- Backend has public announcement endpoint
- `frontend/src/App.jsx` includes announcement banner in school views
- Announcements display on school dashboards
  </acceptance_criteria>
  </task>

### Plan 6: Update Navigation and Styling

<task>
<title>Add navigation links and styles for global features</title>
<read_first>
- frontend/src/components/sp/SPSidebar.jsx
- frontend/src/styles/sp-theme.css
</read_first>
<action>
1. Add navigation links to `frontend/src/components/sp/SPSidebar.jsx`:
   ```jsx
   // In the navigation items array
   { path: '/sp-control-portal/announcements', label: 'Announcements' },
   { path: '/sp-control-portal/support', label: 'Support Tickets' },
   ```

2. Add styles to `frontend/src/styles/sp-theme.css`:

   ```css
   /* Announcement Banner */
   .announcement-banner {
     background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
     color: white;
     padding: 12px 20px;
     text-align: center;
     position: relative;
     overflow: hidden;
   }

   .announcement-content {
     font-size: 14px;
     line-height: 1.4;
   }

   .announcement-indicators {
     position: absolute;
     bottom: 8px;
     right: 20px;
   }

   .indicator {
     display: inline-block;
     width: 8px;
     height: 8px;
     border-radius: 50%;
     background: rgba(255, 255, 255, 0.5);
     margin: 0 2px;
     cursor: pointer;
   }

   .indicator.active {
     background: white;
   }

   /* Support ticket status colors */
   .status-open {
     color: #dc3545;
   }
   .status-progress {
     color: #ffc107;
   }
   .status-resolved {
     color: #28a745;
   }
   .status-closed {
     color: #6c757d;
   }

   /* Priority colors */
   .priority-low {
     color: #6c757d;
   }
   .priority-medium {
     color: #ffc107;
   }
   .priority-high {
     color: #fd7e14;
   }
   .priority-urgent {
     color: #dc3545;
     font-weight: bold;
   }
   ```

   </action>
   <acceptance_criteria>

- `frontend/src/components/sp/SPSidebar.jsx` contains announcement and support links
- `frontend/src/styles/sp-theme.css` contains banner and status styles
- Navigation works correctly
  </acceptance_criteria>
  </task></content>
  <parameter name="filePath">c:\Users\TANMAY GUNDRE\Desktop\erp_1\Super_admin\.planning\phases\04-global-features\04-PLAN.md
