/**
 * PlantCard.jsx
 *
 * Displays a single plant in the dashboard grid.
 * Shows:
 *   - Image (or a green placeholder emoji)
 *   - Name
 *   - Care instructions
 *   - Next watering date with overdue badge
 *   - "Mark as Watered" button
 *   - Edit / Delete actions
 *
 * Props:
 *   plant       – enriched plant object (includes nextWateringDate, isOverdue)
 *   onWater(id) – marks plant as watered
 *   onEdit(plant) – opens edit modal
 *   onDelete(id)  – deletes the plant
 */

export default function PlantCard({ plant, onWater, onEdit, onDelete }) {
  const today   = new Date().toISOString().split('T')[0]
  const daysUntil = Math.ceil(
    (new Date(plant.nextWateringDate) - new Date(today)) / (1000 * 60 * 60 * 24)
  )

  const statusLabel = plant.isOverdue
    ? daysUntil === 0
      ? 'Due Today'
      : `${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} overdue`
    : daysUntil === 0
    ? 'Due Today'
    : `In ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`

  const statusColor = plant.isOverdue
    ? 'bg-red-100 text-red-700 border-red-200'
    : daysUntil <= 1
    ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
    : 'bg-green-100 text-green-700 border-green-200'

  const cardBorder = plant.isOverdue
    ? 'border-red-300 ring-1 ring-red-200'
    : 'border-gray-200'

  return (
    <div className={`rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden ${cardBorder}`}>
      {/* Plant image */}
      <div className="relative h-44 bg-green-50 flex items-center justify-center overflow-hidden">
        {plant.image ? (
          <img
            src={plant.image}
            alt={plant.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
          />
        ) : null}
        <div
          className="absolute inset-0 flex items-center justify-center text-6xl"
          style={{ display: plant.image ? 'none' : 'flex' }}
        >
          🌱
        </div>

        {/* Overdue badge */}
        {plant.isOverdue && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
            Overdue!
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Name */}
        <h3 className="text-lg font-bold text-gray-900 leading-tight">{plant.name}</h3>

        {/* Care instructions */}
        {plant.careInstructions && (
          <p className="text-sm text-gray-500 line-clamp-2">{plant.careInstructions}</p>
        )}

        {/* Watering info */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Interval</span>
            <span className="font-medium text-gray-700">
              Every {plant.wateringIntervalDays} day{plant.wateringIntervalDays !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Last watered</span>
            <span className="font-medium text-gray-700">{plant.lastWateredDate}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Next watering</span>
            <span className="font-medium text-gray-700">{plant.nextWateringDate}</span>
          </div>
        </div>

        {/* Status badge */}
        <div className={`inline-flex self-start items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusColor}`}>
          <span>{plant.isOverdue ? '🚨' : daysUntil <= 1 ? '💧' : '✅'}</span>
          {statusLabel}
        </div>

        {/* Actions */}
        <div className="mt-auto flex gap-2 pt-2">
          {/* Mark as Watered */}
          <button
            onClick={() => onWater(plant.id)}
            className="flex-1 rounded-lg bg-blue-500 py-2 text-xs font-semibold text-white hover:bg-blue-600 transition flex items-center justify-center gap-1.5"
          >
            <span>💧</span> Mark Watered
          </button>

          {/* Edit */}
          <button
            onClick={() => onEdit(plant)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
            aria-label="Edit plant"
          >
            ✏️
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(plant.id)}
            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 transition"
            aria-label="Delete plant"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  )
}
