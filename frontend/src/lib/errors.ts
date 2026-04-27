import axios from 'axios'

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.'

/**
 * Extracts a human-readable error message from any thrown value.
 *
 * Handles:
 *  - AxiosError  → response body shapes: { message }, { error }, { detail } (FastAPI),
 *                  and FastAPI validation arrays: { detail: [{ msg }] }
 *  - Error       → error.message
 *  - string      → returned as-is
 *  - anything else → fallback
 */
export function getApiErrorMessage(error: unknown, fallback = DEFAULT_MESSAGE): string {
  if (axios.isAxiosError(error)) {
    const data: unknown = error.response?.data

    if (typeof data === 'string' && data.trim()) return data

    if (data !== null && typeof data === 'object') {
      const d = data as Record<string, unknown>

      // FastAPI validation error: { detail: [{ msg: '...' }] }
      if (Array.isArray(d.detail)) {
        const first = d.detail[0]
        if (first && typeof first === 'object' && 'msg' in first && typeof (first as Record<string, unknown>).msg === 'string') {
          return (first as Record<string, unknown>).msg as string
        }
      }

      // FastAPI HTTP exception: { detail: '...' }
      if (typeof d.detail === 'string' && d.detail.trim()) return d.detail

      // Common REST shapes
      if (typeof d.message === 'string' && d.message.trim()) return d.message
      if (typeof d.error === 'string' && d.error.trim()) return d.error
    }

    // Network / timeout errors have no response
    if (error.message) return error.message
  }

  if (error instanceof Error && error.message) return error.message

  if (typeof error === 'string' && error.trim()) return error

  return fallback
}
