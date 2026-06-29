import axios from 'axios'

// No auth — used for public customer-facing endpoints (/r/:slug, review submission)
const publicClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
})

export default publicClient
