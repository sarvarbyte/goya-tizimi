import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import Inbox from './pages/Inbox.jsx'
import IdeaPage from './pages/IdeaPage.jsx'
import './styles.css'

function App() {
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-dot" /> G'oya tizimi
        </Link>
        <span className="topbar-hint">G'oya → sinov → ishladi / ishlamadi</span>
        <a className="credits" href="https://github.com/wanglin2/mind-map" target="_blank" rel="noreferrer">
          Mind map: simple-mind-map
        </a>
      </header>
      <Routes>
        <Route path="/" element={<Inbox />} />
        <Route path="/idea/:id" element={<IdeaPage />} />
      </Routes>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
