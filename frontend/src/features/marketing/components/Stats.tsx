const stats = [
  {
    value: '99.2%',
    label: 'Detection Accuracy',
    sub: 'Across SMS, WhatsApp & voice',
    color: 'text-emerald-400',
  },
  {
    value: '<50ms',
    label: 'Average Response Time',
    sub: 'Real-time scoring per communication',
    color: 'text-blue-400',
  },
  {
    value: '10M+',
    label: 'Messages Analysed',
    sub: 'Processed across all channels',
    color: 'text-cyan-400',
  },
  {
    value: '500K+',
    label: 'Threats Blocked',
    sub: 'Fraud attempts stopped in real time',
    color: 'text-purple-400',
  },
]

export default function Stats() {
  return (
    <section className="py-20 bg-slate-950 border-y border-slate-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 lg:divide-x lg:divide-slate-800">
          {stats.map((s) => (
            <div key={s.label} className="text-center px-8">
              <div className={`text-5xl font-bold mb-2 tracking-tight ${s.color}`}>{s.value}</div>
              <div className="text-white font-semibold text-sm mb-1">{s.label}</div>
              <div className="text-slate-500 text-xs">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
