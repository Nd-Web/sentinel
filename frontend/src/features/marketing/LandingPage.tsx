import Navbar from './components/Navbar'
import Hero from './components/Hero'
import TrustBar from './components/TrustBar'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import Stats from './components/Stats'
import UseCases from './components/UseCases'
import Integration from './components/Integration'
import CallToAction from './components/CallToAction'
import Footer from './components/Footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white antialiased">
      <Navbar />
      <Hero />
      <TrustBar />
      <Features />
      <HowItWorks />
      <Stats />
      <UseCases />
      <Integration />
      <CallToAction />
      <Footer />
    </div>
  )
}
