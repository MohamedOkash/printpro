import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import AppProvider from './context/AppContext'
import App from './App'
import './index.css'

function Main() {
  const [lang, setLang] = useState('ar')
  return (
    <AppProvider lang={lang} setLang={setLang}>
      <App />
    </AppProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>
)

