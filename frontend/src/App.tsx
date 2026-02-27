import { Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { RulesPage } from './pages/RulesPage'
import { InterfacesPage } from './pages/InterfacesPage'
import { CountersPage } from './pages/CountersPage'
import { Settings } from './pages/Settings'

export default function App() {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/rules" element={<RulesPage />} />
          <Route path="/interfaces" element={<InterfacesPage />} />
          <Route path="/counters" element={<CountersPage />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}