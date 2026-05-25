/**
 * EditModal.jsx
 *
 * Modal for editing an existing plant's watering interval, care instructions, and image.
 * Props:
 *   plant       – the plant object to edit
 *   onSave(id, payload) – called with updated fields
 *   onClose()   – closes the modal
 */

import { useState } from 'react'

export default function EditModal({ plant, onSave, onClose }) {
  const [form, setForm] = useState({
    name:                plant.name,
    wateringIntervalDays: String(plant.wateringIntervalDays),
    careInstructions:    plant.careInstructions || '',
    image:               plant.image || '',
  })
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState(plant.image || null)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (name === 'image') setImagePreview(value || null)
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUri = ev.target.result
      setForm((prev) => ({ ...prev, image: dataUri }))
      setImagePreview(dataUri)
    }
    reader.readAsDataURL(file)
  }

  function validate() {
    const errs = []
    if (!form.name.trim()) errs.push('Plant name is required.')
    const interval = Number(form.wateringIntervalDays)
    if (!form.wateringIntervalDays || !Number.isInteger(interval) || interval < 1) {
      errs.push('Watering interval must be a positive whole number.')
    }
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (errs.length) { setErrors(errs); return }

    setLoading(true)
    setErrors([])
    try {
      await onSave(plant.id, {
        name:                form.name.trim(),
        wateringIntervalDays: Number(form.wateringIntervalDays),
        careInstructions:    form.careInstructions,
        image:               form.image,
      })
      onClose()
    } catch (err) {
      const apiErrors = err.response?.data?.errors
      setErrors(apiErrors || [err.message])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between bg-green-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white">✏️ Edit Plant</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none" aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errors.length > 0 && (
            <ul className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 space-y-1">
              {errors.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plant Name <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {/* Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Watering Interval (days) <span className="text-red-500">*</span>
            </label>
            <input
              name="wateringIntervalDays"
              type="number"
              min="1"
              value={form.wateringIntervalDays}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {/* Care Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Care Instructions</label>
            <textarea
              name="careInstructions"
              value={form.careInstructions}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
            />
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plant Image</label>
            <div className="space-y-2">
              <input
                name="image"
                value={form.image.startsWith('data:') ? '' : form.image}
                onChange={handleChange}
                placeholder="Paste image URL"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-green-100 file:text-green-700 file:text-sm file:font-medium hover:file:bg-green-200 cursor-pointer"
              />
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-24 w-24 object-cover rounded-lg border border-gray-200"
                  onError={() => setImagePreview(null)}
                />
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700 transition disabled:opacity-60"
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
