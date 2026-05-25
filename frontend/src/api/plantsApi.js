/**
 * api/plantsApi.js
 *
 * Thin axios wrapper around the GreenThumb backend REST API.
 * All functions return the `data` field from the response
 * (i.e., the parsed JSON body).
 *
 * Base URL resolution:
 *   - Development: Vite proxy handles "/api" → http://localhost:5001
 *   - Production:  Set VITE_API_URL=https://your-backend.onrender.com in Vercel env vars
 *                  → requests go to https://your-backend.onrender.com/api/...
 */

import axios from 'axios'

// In production VITE_API_URL is set; in dev the Vite proxy intercepts "/api"
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({ baseURL: BASE_URL })

/** Fetch all plants (each includes nextWateringDate + isOverdue). */
export const getPlants = () =>
  api.get('/plants').then((r) => r.data)

/** Fetch a single plant by ID. */
export const getPlant = (id) =>
  api.get(`/plants/${id}`).then((r) => r.data)

/**
 * Create a new plant.
 * @param {{ name, wateringIntervalDays, careInstructions?, image?, startDate? }} payload
 */
export const createPlant = (payload) =>
  api.post('/plants', payload).then((r) => r.data)

/**
 * Update editable fields of a plant.
 * @param {string} id
 * @param {{ name?, wateringIntervalDays?, careInstructions?, image?, lastWateredDate? }} payload
 */
export const updatePlant = (id, payload) =>
  api.put(`/plants/${id}`, payload).then((r) => r.data)

/** Set lastWateredDate to today (the "Mark as Watered" action). */
export const waterPlant = (id) =>
  api.put(`/plants/${id}/water`).then((r) => r.data)

/** Delete a plant by ID. */
export const deletePlant = (id) =>
  api.delete(`/plants/${id}`).then((r) => r.data)
