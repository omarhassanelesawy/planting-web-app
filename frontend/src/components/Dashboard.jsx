/**
 * Dashboard.jsx
 *
 * Main dashboard showing all plants in a responsive grid.
 * Handles loading state, empty state, and overdue summary banner.
 *
 * Props:
 *   plants      – array of enriched plant objects
 *   loading     – boolean
 *   onWater(id)
 *   onEdit(plant)
 *   onDelete(id)
 *   onAddNew()  – opens the AddPlant form
 */

import PlantCard from './PlantCard'

export default function Dashboard({ plants, loading, onWater, onEdit, onDelete, onAddNew }) {
  const overduePlants = plants.filter((p) => p.isOverdue)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
        <div className="text-5xl animate-spin">🌀</div>
        <p className="text-lg">Loading your plants…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overdue summary banner */}
      {overduePlants.length > 0 && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 flex items-start gap-3">
          <span className="text-2xl">🚨</span>
          <div>
            <p className="font-semibold text-red-700">
              {overduePlants.length} plant{overduePlants.length !== 1 ? 's' : ''} need{overduePlants.length === 1 ? 's' : ''} watering now!
            </p>
            <p className="text-sm text-red-600 mt-0.5">
              {overduePlants.map((p) => p.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {plants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
          <div className="text-7xl">🌿</div>
          <h2 className="text-2xl font-bold text-gray-700">No plants yet!</h2>
          <p className="text-gray-500 max-w-xs">
            Add your first plant to start tracking watering schedules and get daily reminders.
          </p>
          <button
            onClick={onAddNew}
            className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 transition shadow"
          >
            + Add Your First Plant
          </button>
        </div>
      ) : (
        /* Plant grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {plants.map((plant) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              onWater={onWater}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
