const brands = ['MTN', 'Airtel', 'GTBank', 'Zenith Bank', 'Access Bank', 'Glo', 'Stanbic IBTC']

export default function TrustBar() {
  return (
    <section className="bg-slate-900/50 border-y border-slate-800/60 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs text-slate-500 uppercase tracking-widest font-medium mb-8">
          Built for leading telecom operators and financial institutions
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          {brands.map((brand) => (
            <span
              key={brand}
              className="text-slate-600 font-bold text-sm sm:text-base tracking-wider hover:text-slate-400 transition-colors duration-300 cursor-default"
            >
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
