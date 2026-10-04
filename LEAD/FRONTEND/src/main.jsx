import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/global.css'
import App from './App'
import { SettingsProvider } from "./context/SettingsContext"
import { installSessionGuard } from './services/api'

installSessionGuard()

ReactDOM.createRoot(document.getElementById('root')).render(
    <SettingsProvider>
      <App />
    </SettingsProvider>
)
