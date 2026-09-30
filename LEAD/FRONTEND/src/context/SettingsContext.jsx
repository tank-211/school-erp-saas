import { createContext, useCallback, useContext, useEffect, useState } from "react"

const SettingsContext = createContext()
const API_URL = import.meta.env.VITE_API_URL;

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null)

  // Loads the signed-in user's school settings. Called at start-up and again
  // by the sidebar once a user is signed in (the first call can happen on the
  // login page, before there is a token, or for a previous user).
  const refresh = useCallback(() => {
    const token = localStorage.getItem("authToken")
    if (!token) {
      setSettings(null)
      return Promise.resolve(null)
    }
    return fetch(`${API_URL}/settings`, {
      headers: {
        Authorization: "Bearer " + token
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data?.success) setSettings(data.data)
        return data?.data || null
      })
      .catch(() => null)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <SettingsContext.Provider value={{ settings, setSettings, refresh }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)