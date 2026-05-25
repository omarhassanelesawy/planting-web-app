/**
 * App.jsx
 *
 * Root component. Owns:
 *  - Plant list state
 *  - API call orchestration (load, create, update, water, delete)
 *  - Modal visibility state (add form, edit modal)
 *  - Global toast notifications
 */

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

import Dashboard from './components/Dashboard'
import PlantForm from './components/PlantForm'
import EditModal from './components/EditModal'

import {
  getPlants,
  createPlant,
  updatePlant,
  waterPlant,
  deletePlant,
} from './api/plantsApi'

export default function App() {
  const [plants,      setPlants]      = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editTarget,  setEditTarget]  = useState(null)   // plant object or null

  // ── Load plants ────────────────────────────────────────────────────────────
  const loadPlants = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getPlants()
      setPlants(data)
    } catch (err) {
      toast.error('Failed to load plants. Is the server running?')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPlants() }, [loadPlants])

  // ── Add plant ──────────────────────────────────────────────────────────────
  async function handleAdd(payload) {
    const newPlant = await createPlant(payload)
    setPlants((prev) => [newPlant, ...prev])
    toast.success(`${newPlant.name} added! 🌱`)
  }

  // ── Edit plant ─────────────────────────────────────────────────────────────
  async function handleSaveEdit(id, payload) {
    const updated = await updatePlant(id, payload)
    setPlants((prev) => prev.map((p) => (p.id === id ? updated : p)))
    toast.success('Plant updated!')
  }

  // ── Water plant ────────────────────────────────────────────────────────────
  async function handleWater(id) {
    try {
      const updated = await waterPlant(id)
      setPlants((prev) => prev.map((p) => (p.id === id ? updated : p)))
      toast.success(`${updated.name} watered! 💧 Next: ${updated.nextWateringDate}`)
    } catch (err) {
      toast.error('Failed to update watering status.')
      console.error(err)
    }
  }

  // ── Delete plant ───────────────────────────────────────────────────────────
  async function handleDelete(id) {
    const plant = plants.find((p) => p.id === id)
    if (!window.confirm(`Delete "${plant?.name}"? This cannot be undone.`)) return
    try {
      await deletePlant(id)
      setPlants((prev) => prev.filter((p) => p.id !== id))
      toast.success('Plant removed.')
    } catch (err) {
      toast.error('Failed to delete plant.')
      console.error(err)
    }
  }

  // ── Counts for header ──────────────────────────────────────────────────────
  const overdueCount = plants.filter((p) => p.isOverdue).length

  return (
    <div className="min-h-screen bg-green-50">
      {/* ── Header ── */}
      <header className="bg-white border-b border-green-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌿</span>
            <div>
              <h1 className="text-xl font-bold text-green-800 leading-tight">GreenThumb Reminder</h1>
              <p className="text-xs text-green-600">
                {plants.length} plant{plants.length !== 1 ? 's' : ''} tracked
                {overdueCount > 0 && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                    {overdueCount} overdue
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition shadow-sm"
          >
            <span className="text-base">＋</span>
            <span className="hidden sm:inline">Add Plant</span>
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard
          plants={plants}
          loading={loading}
          onWater={handleWater}
          onEdit={setEditTarget}
          onDelete={handleDelete}
          onAddNew={() => setShowAddForm(true)}
        />
      </main>

      {/* ── Add Plant Modal ── */}
      {showAddForm && (
        <PlantForm
          onSubmit={handleAdd}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {/* ── Edit Plant Modal ── */}
      {editTarget && (
        <EditModal
          plant={editTarget}
          onSave={handleSaveEdit}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  )
}
