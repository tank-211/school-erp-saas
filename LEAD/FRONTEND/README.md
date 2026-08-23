# Sacred Tree International School – CRM

A modern, responsive School Admission CRM built with **Vite + React + CSS**.

## 📁 Folder Structure

```
school-crm/
├── index.html                    ← Vite root HTML (with Google Fonts)
├── vite.config.js                ← Vite + React plugin config
├── package.json
├── public/                       ← Static assets
└── src/
    ├── main.jsx                  ← Vite entry point
    ├── App.jsx                   ← Router + layout shell
    ├── App.css
    ├── components/
    │   ├── Sidebar.jsx           ← Collapsible left navigation
    │   ├── Sidebar.css
    │   ├── Header.jsx            ← Top bar: search, campus, notifications, user
    │   └── Header.css
    ├── pages/
    │   ├── Dashboard.jsx / .css  ← KPI cards, charts, activity feed
    │   ├── Leads.jsx / .css      ← Searchable leads table
    │   ├── Pipeline.jsx / .css   ← Kanban board (5 stages)
    │   ├── Tasks.jsx / .css      ← Task list with checkboxes
    │   └── PlaceholderPages.jsx  ← Communication, Applications, Reports, Settings
    └── styles/
        └── global.css            ← CSS variables, reset, badge utilities
```

## 🚀 Getting Started

```bash
cd school-crm
npm install
npm run dev        # http://localhost:5173
npm run build      # production build
```

## 📦 Tech Stack

- **Vite 5** – dev server & bundler
- **React 18** – UI framework
- **react-router-dom 6** – routing
- **recharts** – charts (Line, Bar, Pie)
