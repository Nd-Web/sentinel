import { http } from '@/lib/http'
import type { MessageType, ThreatLevel } from './scan.service'

export interface DashboardStats {
  total_scanned: number
  threats_detected: number
  deepfakes_found: number
  avg_risk_score: number
  blocked_today: number
  active_campaigns: number
  breakdown: {
    HIGH: number
    MEDIUM: number
    LOW: number
    CLEAN: number
  }
}

export interface ThreatFeedItem {
  id: string
  content_preview: string
  risk_score: number
  threat_level: ThreatLevel
  message_type: MessageType
  sender: string | null
  created_at: string
}

export interface TrendItem {
  date: string
  total_scanned: number
  threats_detected: number
}

export interface AuditLogItem {
  id: string
  user_id: string
  action: string
  resource: string
  details: string
  ip_address: string
  created_at: string
}

export interface AuditLogResponse {
  items: AuditLogItem[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface HealthCheck {
  name: string
  status: 'ok' | 'warning' | 'critical' | 'info'
  value: number | string
  message: string
  severity: string
}

export interface HealthReport {
  overall_status: 'healthy' | 'warning' | 'critical'
  checks: HealthCheck[]
  generated_at: string
}

export interface OrgMemoryStats {
  total_patterns: number
  top_senders: Array<{ value: string; hit_count: number }>
  top_keywords: Array<{ value: string; hit_count: number }>
  patterns_added_this_week: number
}

export interface OrgMemoryPattern {
  id: string
  pattern_type: string
  pattern_value: string
  hit_count: number
  confidence: number
  last_seen_at: string
  created_at: string
}

export interface OrgMemoryResponse {
  org_id: string | null
  stats: OrgMemoryStats
  patterns: OrgMemoryPattern[]
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const { data } = await http.get<DashboardStats>('/api/dashboard/stats')
    return data
  },

  async getThreatFeed(limit = 20): Promise<ThreatFeedItem[]> {
    const { data } = await http.get<{ items: ThreatFeedItem[] }>('/api/dashboard/threat-feed', {
      params: { limit },
    })
    return data.items
  },

  async getTrends(days = 30): Promise<TrendItem[]> {
    const { data } = await http.get<{ trends: TrendItem[] }>('/api/dashboard/trends', {
      params: { days },
    })
    return data.trends
  },

  async getAuditLog(params?: {
    page?: number
    page_size?: number
    action_filter?: string
  }): Promise<AuditLogResponse> {
    const { data } = await http.get<AuditLogResponse>('/api/dashboard/audit-log', {
      params: {
        page: params?.page ?? 1,
        page_size: params?.page_size ?? 20,
        action_filter: params?.action_filter ?? undefined,
      },
    })
    return data
  },

  async getHealth(): Promise<HealthReport> {
    const { data } = await http.get<HealthReport>('/api/dashboard/health')
    return data
  },

  async getOrgMemory(): Promise<OrgMemoryResponse> {
    const { data } = await http.get<OrgMemoryResponse>('/api/org/memory')
    return data
  },
}
