import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/global.css'
import App from './App'
import { SettingsProvider } from "./context/SettingsContext"

ReactDOM.createRoot(document.getElementById('root')).render(
    <SettingsProvider>
      <App />
    </SettingsProvider>
)
