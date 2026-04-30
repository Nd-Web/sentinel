import { http } from '@/lib/http'

export type ThreatLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAN'
export type MessageType = 'sms' | 'whatsapp' | 'transcript'
export type ScanAction = 'BLOCK' | 'REVIEW' | 'ALLOW'
export type ThreatStatus = 'new' | 'reviewing' | 'escalated' | 'resolved' | 'closed'

export interface ScanResult {
  id: string
  content: string
  sender: string | null
  message_type: MessageType
  risk_score: number
  threat_level: ThreatLevel
  flags: string[]
  action: ScanAction
  reasoning: string
  is_scam: boolean
  source: string
  calibration_log: string[]
  suggested_actions: string[]
  threat_status: ThreatStatus
  confirmed?: boolean
  created_at: string
}

export interface ScanRequestPayload {
  content: string
  message_type: MessageType
  sender?: string | null
}

export type ScanMessage = ScanRequestPayload

export interface ScanHistoryResponse {
  items: ScanResult[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface ScanHistoryParams {
  threat_level?: ThreatLevel | null
  message_type?: MessageType | null
  threat_status?: ThreatStatus | null
  page?: number
  page_size?: number
  start_date?: string
  end_date?: string
}

export interface CorrectionPayload {
  corrected_verdict: 'SAFE' | 'SCAM'
  corrected_action: ScanAction
  correction_reason?: string
}

export interface CorrectionResult {
  id: string
  scan_id: string
  user_id: string
  original_risk_score: number
  original_threat_level: string
  original_action: string
  original_flags: string[]
  corrected_verdict: string
  corrected_action: string
  correction_reason: string | null
  message_content: string | null
  created_at: string
}

export interface CorrectionStats {
  total_corrections_this_week: number
  most_corrected_category: string | null
  false_positive_rate: number
  false_negative_rate: number
  total_scans_this_week: number
}

export interface EscalationPayload {
  reason: string
  escalate_to_user_id?: string | null
}

export interface EscalationResult {
  id: string
  scan_id: string
  escalated_by: string
  escalated_to: string | null
  reason: string
  original_threat_level: string
  created_at: string
}

export interface StatusUpdatePayload {
  status: ThreatStatus
  note?: string
}

export interface BatchJudgeParams {
  limit?: number
  threat_level?: ThreatLevel | null
}

export interface BatchJudgeResult {
  processed: number
  updated: number
  skipped: number
  results: ScanResult[]
}

export interface BatchScanPayload {
  messages: ScanMessage[]
}

export interface BatchScanResult {
  total_scanned: number
  threats_found: number
  breakdown: Record<ThreatLevel, number>
  results: ScanResult[]
}

export interface PipelineData {
  [status: string]: { [level: string]: number }
}

export interface EvalResult {
  id: string
  preview: string
  expected: string
  predicted: string
  risk_score: number
  correct: boolean
}

export interface ModelEvalResponse {
  status: string
  accuracy_percent: number
  correct: number
  total: number
  results: EvalResult[]
}

export const scanService = {
  async scanMessage(payload: ScanRequestPayload): Promise<ScanResult> {
    const { data } = await http.post<ScanResult>('/api/scan/message', payload)
    return data
  },

  async getHistory(params: ScanHistoryParams = {}): Promise<ScanHistoryResponse> {
    const { data } = await http.get<ScanHistoryResponse>('/api/scan/history', {
      params: {
        threat_level: params.threat_level ?? undefined,
        message_type: params.message_type ?? undefined,
        threat_status: params.threat_status ?? undefined,
        start_date: params.start_date ?? undefined,
        end_date: params.end_date ?? undefined,
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
      },
    })
    return data
  },

  async getResult(scanId: string): Promise<ScanResult> {
    const { data } = await http.get<ScanResult>(`/api/scan/${scanId}`)
    return data
  },

  async confirmScan(scanId: string): Promise<ScanResult> {
    const { data } = await http.post<ScanResult>(`/api/scan/${scanId}/confirm`)
    return data
  },

  // Alias for hooks using old name
  async confirmThreat(scanId: string): Promise<ScanResult> {
    return scanService.confirmScan(scanId)
  },

  async correctScan(scanId: string, payload: CorrectionPayload): Promise<CorrectionResult> {
    const { data } = await http.post<CorrectionResult>(`/api/scan/${scanId}/correct`, payload)
    return data
  },

  async getCorrectionStats(): Promise<CorrectionStats> {
    const { data } = await http.get<CorrectionStats>('/api/scan/corrections/stats')
    return data
  },

  async updateStatus(scanId: string, payload: StatusUpdatePayload): Promise<ScanResult> {
    const { data } = await http.patch<ScanResult>(`/api/scan/${scanId}/status`, payload)
    return data
  },

  async escalateScan(scanId: string, payload: EscalationPayload): Promise<EscalationResult> {
    const { data } = await http.post<EscalationResult>(`/api/scan/${scanId}/escalate`, payload)
    return data
  },

  async getEscalations(): Promise<{ escalations: object[]; total: number }> {
    const { data } = await http.get<{ escalations: object[]; total: number }>('/api/scan/escalations')
    return data
  },

  async getPipeline(): Promise<PipelineData> {
    const { data } = await http.get<PipelineData>('/api/scan/pipeline')
    return data
  },

  async batchScan(payload: BatchScanPayload): Promise<BatchScanResult> {
    const { data } = await http.post<BatchScanResult>('/api/scan/batch', payload)
    return data
  },

  async batchJudge(params: BatchJudgeParams = {}): Promise<BatchJudgeResult> {
    const { data } = await http.post<BatchJudgeResult>('/api/scan/batch-judge', {
      limit: params.limit ?? 20,
      threat_level: params.threat_level ?? undefined,
    })
    return data
  },

  async evaluate(): Promise<ModelEvalResponse> {
    const { data } = await http.get<ModelEvalResponse>('/api/scan/evaluate')
    return data
  },
}
