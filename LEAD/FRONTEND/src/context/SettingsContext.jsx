import { createContext, useContext, useEffect, useState } from "react"

const SettingsContext = createContext()

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem("authToken")

    fetch("/api/settings", {
      headers: {
        Authorization: "Bearer " + token
      }
    })
      .then(res => res.json())
      .then(data => {
        console.log("🌍 GLOBAL SETTINGS:", data.data)
        setSettings(data.data)
      })
      .catch(console.error)
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)