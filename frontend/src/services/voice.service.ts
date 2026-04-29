import { http } from '@/lib/http'
import type { ThreatLevel } from './scan.service'

export interface VoiceAnalysis {
  id: string
  transcript: string
  deepfake_probability: number
  risk_score: number
  threat_level: ThreatLevel
  flags: string[]
  reasoning: string
  is_scam: boolean
  created_at: string
}

export interface VoiceHistoryItem {
  id: string
  transcript_preview: string
  deepfake_probability: number
  risk_score: number
  threat_level: ThreatLevel
  is_scam: boolean
  created_at: string
}

export interface VoiceHistoryResponse {
  items: VoiceHistoryItem[]
  total: number
  page: number
  page_size: number
  pages: number
}

export const voiceService = {
  async analyse(file: File): Promise<VoiceAnalysis> {
    const form = new FormData()
    form.append('file', file)
    const { data } = await http.post<VoiceAnalysis>('/api/voice/analyse', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 90_000,
    })
    return data
  },

  // Supports both (params) object and (page, pageSize) positional args
  async getHistory(
    paramsOrPage?: { page?: number; page_size?: number } | number,
    pageSize = 20,
  ): Promise<VoiceHistoryResponse> {
    let page = 1
    let size = pageSize
    if (typeof paramsOrPage === 'object' && paramsOrPage !== null) {
      page = paramsOrPage.page ?? 1
      size = paramsOrPage.page_size ?? 20
    } else if (typeof paramsOrPage === 'number') {
      page = paramsOrPage
    }
    const { data } = await http.get<VoiceHistoryResponse>('/api/voice/history', {
      params: { page, page_size: size },
    })
    return data
  },

  async getAnalysis(analysisId: string): Promise<VoiceAnalysis> {
    const { data } = await http.get<VoiceAnalysis>(`/api/voice/${analysisId}`)
    return data
  },
}
