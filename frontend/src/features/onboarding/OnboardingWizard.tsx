/**
 * SentinelAI Onboarding Wizard — 5-step setup flow.
 * Step 1: Org details   Step 2: Admin account   Step 3: Scan settings
 * Step 4: API key       Step 5: Live test
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, CheckCircle2, Loader2, Copy, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { http } from '@/lib/http'
import { getApiErrorMessage } from '@/lib/errors'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestResult {
  message: string
  risk_score: number
  threat_level: string
  action: string
  reasoning: string
  suggested_actions: string[]
}

const RISK_COLORS: Record<string, string> = {
  HIGH: 'text-red-400',
  MEDIUM: 'text-amber-400',
  LOW: 'text-yellow-400',
  CLEAN: 'text-emerald-400',
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => i + 1).map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={
              'size-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ' +
              (s < current
                ? 'bg-blue-500 text-white'
                : s === current
                ? 'bg-blue-500/20 border-2 border-blue-500 text-blue-400'
                : 'bg-slate-800 text-slate-600')
            }
          >
            {s < current ? <CheckCircle2 className="size-3.5" /> : s}
          </div>
          {s < total && (
            <div className={'h-px w-8 ' + (s < current ? 'bg-blue-500' : 'bg-slate-800')} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="text-slate-400 hover:text-white transition-colors"
      title="Copy"
    >
      {copied
        ? <Check className="size-3.5 text-emerald-400" />
        : <Copy className="size-3.5" />
      }
    </button>
  )
}

// ─── Loading Button Content ───────────────────────────────────────────────────

function BtnContent({ loading, loadingText, text }: { loading: boolean; loadingText: string; text: string }) {
  if (loading) {
    return (
      <span className="flex items-center justify-center gap-2">
        <Loader2 className="size-4 animate-spin" />
        <span>{loadingText}</span>
      </span>
    )
  }
  return <span>{text}</span>
}

// ─── Error Banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 mb-4">
      <AlertCircle className="size-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  )
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function OnboardingWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Step 1
  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState('bank')
  const [country, setCountry] = useState('Nigeria')

  // Step 2
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminName, setAdminName] = useState('')

  // Step 3
  const [monitorSms, setMonitorSms] = useState(true)
  const [monitorWhatsapp, setMonitorWhatsapp] = useState(true)
  const [monitorVoice, setMonitorVoice] = useState(false)
  const [blockThreshold, setBlockThreshold] = useState(80)
  const [alertEmail, setAlertEmail] = useState('')

  // Step 4
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [curlExample, setCurlExample] = useState<string | null>(null)

  // Step 5
  const [testMessages, setTestMessages] = useState(['', '', ''])
  const [testResults, setTestResults] = useState<TestResult[] | null>(null)

  // ─── API Calls ──────────────────────────────────────────────────────────────

  async function startSession() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await http.post('/api/onboard/start')
      setSessionId(data.session_id)
      setStep(1)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  async function submitStep1() {
    if (!sessionId) { await startSession(); return }
    setLoading(true)
    setError(null)
    try {
      await http.post('/api/onboard/step/1', {
        session_id: sessionId,
        org_name: orgName.trim(),
        org_type: orgType,
        country: country.trim(),
      })
      setStep(2)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  async function submitStep2() {
    setLoading(true)
    setError(null)
    try {
      await http.post('/api/onboard/step/2', {
        session_id: sessionId,
        admin_email: adminEmail.trim(),
        admin_password: adminPassword,
        admin_full_name: adminName.trim(),
      })
      setStep(3)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  async function submitStep3() {
    setLoading(true)
    setError(null)
    try {
      await http.post('/api/onboard/step/3', {
        session_id: sessionId,
        monitor_sms: monitorSms,
        monitor_whatsapp: monitorWhatsapp,
        monitor_voice: monitorVoice,
        auto_block_threshold: blockThreshold,
        alert_email: alertEmail.trim() || null,
      })
      setStep(4)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  async function submitStep4() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await http.post('/api/onboard/step/4', { session_id: sessionId })
      setApiKey(data.api_key)
      setCurlExample(data.curl_example)
      setStep(5)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  async function submitStep5() {
    setLoading(true)
    setError(null)
    try {
      const msgs = testMessages.filter((m) => m.trim().length > 0)
      if (msgs.length === 0) {
        setError('Enter at least one test message')
        setLoading(false)
        return
      }
      const { data } = await http.post('/api/onboard/step/5', {
        session_id: sessionId,
        test_messages: msgs,
      })
      setTestResults(data.test_results)
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  // ─── Start Screen ───────────────────────────────────────────────────────────

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-500/25">
              <Shield className="size-8 text-blue-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Get started with SentinelAI</h1>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Set up your organisation fraud detection in 5 minutes. No credit card required.
          </p>
          <Button
            onClick={startSession}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white border-0 h-11 font-semibold"
          >
            <BtnContent loading={loading} loadingText="Starting..." text="Start setup" />
          </Button>
          <p className="text-xs text-slate-600 mt-4">
            Already set up?{' '}
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-blue-400 hover:text-blue-300"
            >
              Go to dashboard
            </button>
          </p>
        </div>
      </div>
    )
  }

  // ─── Wizard Steps ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="p-1.5 rounded-lg bg-blue-500/15 border border-blue-500/25">
            <Shield className="size-4 text-blue-400" />
          </div>
          <span className="font-bold text-white tracking-widest text-sm">SENTINEL</span>
        </div>

        <StepIndicator current={step} total={5} />

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">

          {/* ── Step 1: Org Details ── */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Organisation details</h2>
              <p className="text-slate-500 text-sm mb-6">Tell us about your company.</p>
              {error && <ErrorBanner message={error} />}
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">Organisation name</label>
                  <Input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. GTBank Nigeria"
                    className="bg-slate-950 border-slate-700 text-white placeholder-slate-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">Organisation type</label>
                  <select
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value)}
                    className="w-full h-10 bg-slate-950 border border-slate-700 rounded-md px-3 text-sm text-white focus:outline-none focus:border-blue-500/60"
                  >
                    <option value="bank">Bank</option>
                    <option value="fintech">Fintech</option>
                    <option value="telco">Telco</option>
                    <option value="call_center">Call Centre</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">Country</label>
                  <Input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Nigeria"
                    className="bg-slate-950 border-slate-700 text-white placeholder-slate-600"
                  />
                </div>
              </div>
              <Button
                onClick={submitStep1}
                disabled={!orgName.trim() || !country.trim() || loading}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white border-0 h-10 font-medium disabled:opacity-50"
              >
                <BtnContent loading={loading} loadingText="Saving..." text="Continue" />
              </Button>
            </div>
          )}

          {/* ── Step 2: Admin Account ── */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Admin account</h2>
              <p className="text-slate-500 text-sm mb-6">Create your administrator login credentials.</p>
              {error && <ErrorBanner message={error} />}
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">Full name</label>
                  <Input
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Chidi Okonkwo"
                    className="bg-slate-950 border-slate-700 text-white placeholder-slate-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">Work email</label>
                  <Input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="chidi@gtbank.com"
                    className="bg-slate-950 border-slate-700 text-white placeholder-slate-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">Password</label>
                  <Input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Min 8 chars, 1 number, 1 uppercase"
                    className="bg-slate-950 border-slate-700 text-white placeholder-slate-600"
                  />
                </div>
              </div>
              <Button
                onClick={submitStep2}
                disabled={!adminEmail.trim() || !adminPassword || !adminName.trim() || loading}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white border-0 h-10 font-medium disabled:opacity-50"
              >
                <BtnContent loading={loading} loadingText="Saving..." text="Continue" />
              </Button>
            </div>
          )}

          {/* ── Step 3: Scan Settings ── */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Scan settings</h2>
              <p className="text-slate-500 text-sm mb-6">Configure what to monitor and when to block.</p>
              {error && <ErrorBanner message={error} />}
              <div className="space-y-4">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Channels to monitor</p>
                {[
                  { label: 'SMS', value: monitorSms, set: setMonitorSms },
                  { label: 'WhatsApp', value: monitorWhatsapp, set: setMonitorWhatsapp },
                  { label: 'Voice calls', value: monitorVoice, set: setMonitorVoice },
                ].map(({ label, value, set }) => (
                  <label key={label} className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => set(!value)}
                      className={'w-9 h-5 rounded-full transition-colors relative ' + (value ? 'bg-blue-500' : 'bg-slate-700')}
                    >
                      <div
                        className={'absolute top-0.5 size-4 bg-white rounded-full shadow transition-transform ' + (value ? 'translate-x-4' : 'translate-x-0.5')}
                      />
                    </div>
                    <span className="text-sm text-slate-300">{label}</span>
                  </label>
                ))}
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">
                    {'Auto-block threshold: '}
                    <span className="text-white font-mono">{blockThreshold}</span>
                  </label>
                  <input
                    type="range"
                    min={60}
                    max={95}
                    value={blockThreshold}
                    onChange={(e) => setBlockThreshold(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>60 (more blocks)</span>
                    <span>95 (fewer blocks)</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">Alert email (optional)</label>
                  <Input
                    type="email"
                    value={alertEmail}
                    onChange={(e) => setAlertEmail(e.target.value)}
                    placeholder="alerts@yourorg.com"
                    className="bg-slate-950 border-slate-700 text-white placeholder-slate-600"
                  />
                </div>
              </div>
              <Button
                onClick={submitStep3}
                disabled={loading}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white border-0 h-10 font-medium disabled:opacity-50"
              >
                <BtnContent loading={loading} loadingText="Saving..." text="Continue" />
              </Button>
            </div>
          )}

          {/* ── Step 4: API Key ── */}
          {step === 4 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Your API key</h2>
              <p className="text-slate-500 text-sm mb-6">Use this key to integrate SentinelAI into your systems.</p>
              {error && <ErrorBanner message={error} />}
              {!apiKey ? (
                <Button
                  onClick={submitStep4}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white border-0 h-10 font-medium"
                >
                  <BtnContent loading={loading} loadingText="Generating..." text="Generate API key" />
                </Button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5">API key</label>
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-md px-3 py-2">
                      <code className="flex-1 text-xs text-emerald-400 font-mono break-all">{apiKey}</code>
                      <CopyButton text={apiKey} />
                    </div>
                    <p className="text-xs text-slate-600 mt-1">Store this key securely. It will not be shown again.</p>
                  </div>
                  {curlExample && (
                    <div>
                      <label className="text-xs text-slate-400 block mb-1.5">Quick test</label>
                      <div className="flex items-start gap-2 bg-slate-950 border border-slate-700 rounded-md p-3">
                        <code className="flex-1 text-xs text-slate-400 font-mono break-all whitespace-pre-wrap">{curlExample}</code>
                        <CopyButton text={curlExample} />
                      </div>
                    </div>
                  )}
                  <Button
                    onClick={() => setStep(5)}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white border-0 h-10 font-medium"
                  >
                    <span>Continue to live test</span>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── Step 5: Test Messages ── */}
          {step === 5 && !testResults && (
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Live scan test</h2>
              <p className="text-slate-500 text-sm mb-6">
                Enter up to 3 messages to see SentinelAI in action.
              </p>
              {error && <ErrorBanner message={error} />}
              <div className="space-y-3 mb-6">
                {testMessages.map((msg, i) => (
                  <div key={i}>
                    <label className="text-xs text-slate-400 block mb-1.5">Test message {i + 1}</label>
                    <textarea
                      value={msg}
                      onChange={(e) => {
                        const next = [...testMessages]
                        next[i] = e.target.value
                        setTestMessages(next)
                      }}
                      rows={2}
                      placeholder={
                        i === 0
                          ? 'EFCC: Your account is linked to fraud. Pay N50,000 bond now.'
                          : i === 1
                          ? 'Your GTBank transfer of N45,000 is confirmed. Ref: GTB2026.'
                          : 'Your token is 847291. Give this to our agent to complete verification.'
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/60 resize-none"
                    />
                  </div>
                ))}
              </div>
              <Button
                onClick={submitStep5}
                disabled={loading || testMessages.every((m) => !m.trim())}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white border-0 h-10 font-medium disabled:opacity-50"
              >
                <BtnContent loading={loading} loadingText="Analysing..." text="Run analysis" />
              </Button>
            </div>
          )}

          {/* ── Step 5: Results ── */}
          {step === 5 && testResults && (
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Setup complete!</h2>
              <p className="text-slate-500 text-sm mb-6">Here are your live test results.</p>
              <div className="space-y-3 mb-6">
                {testResults.map((r, i) => (
                  <div key={i} className="bg-slate-800/40 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1 line-clamp-1">{r.message}</p>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={'text-xs font-bold ' + (RISK_COLORS[r.threat_level] ?? 'text-slate-400')}>
                        {r.threat_level}
                      </span>
                      <span className="text-xs text-slate-500">
                        {'score ' + r.risk_score.toFixed(0) + ' - ' + r.action}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{r.reasoning}</p>
                    {r.suggested_actions && r.suggested_actions.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {r.suggested_actions.slice(0, 2).map((a, j) => (
                          <li key={j} className="text-xs text-slate-500">
                            {'-> ' + a}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
              <Button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border-0 h-10 font-medium"
              >
                <span>Go to dashboard</span>
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}