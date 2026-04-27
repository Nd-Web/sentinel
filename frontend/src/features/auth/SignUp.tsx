import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Shield, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/PasswordInput'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { useSignUp } from './hooks/useSignUp'
import { AUTH_ROUTES } from './constants'
import { signUpSchema, type SignUpFormData } from './schemas'
import { getApiErrorMessage } from '@/lib/errors'

const perks = [
  'Real-time fraud detection across SMS, WhatsApp & voice',
  'AI-powered deepfake voice identification',
  'Centralised threat dashboard and analytics',
  'Simple REST API — integrate in under 5 minutes',
]

const strengthConfig = {
  weak:   { label: 'Weak',   bar: 'bg-red-500 w-1/3',     text: 'text-red-400' },
  fair:   { label: 'Fair',   bar: 'bg-amber-500 w-2/3',   text: 'text-amber-400' },
  strong: { label: 'Strong', bar: 'bg-emerald-500 w-full', text: 'text-emerald-400' },
}

function getStrength(pw: string): keyof typeof strengthConfig | null {
  if (!pw) return null
  if (pw.length < 8) return 'weak'
  if (pw.length < 12) return 'fair'
  return 'strong'
}

export default function SignUp() {
  const navigate = useNavigate()
  const { mutate, isPending, error } = useSignUp()

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      organizationName: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  })

  const password = form.watch('password')
  const strength = getStrength(password)

  function onSubmit(data: SignUpFormData) {
    mutate(
      {
        organizationName: data.organizationName,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      },
      { onSuccess: () => navigate(AUTH_ROUTES.DASHBOARD) },
    )
  }

  const serverError = error ? getApiErrorMessage(error) : null

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10 bg-slate-900 border-r border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_0%_100%,rgba(139,92,246,0.07),transparent)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(30,41,59,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(30,41,59,0.15)_1px,transparent_1px)] bg-size-[3rem_3rem] pointer-events-none" />

        <div className="relative flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/15 border border-blue-500/25">
            <Shield className="size-4 text-blue-400" />
          </div>
          <span className="font-bold text-white tracking-widest text-sm">SENTINEL</span>
        </div>

        <div className="relative space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white leading-tight mb-3">
              Start protecting your{' '}
              <span className="bg-linear-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                network today
              </span>
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Join telecom operators and financial institutions using Sentinel to stop fraud
              before it reaches their customers.
            </p>
          </div>

          <ul className="space-y-3.5">
            {perks.map((perk) => (
              <li key={perk} className="flex items-start gap-3 text-sm text-slate-400">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                {perk}
              </li>
            ))}
          </ul>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
            <p className="text-sm text-slate-400 italic leading-relaxed mb-3">
              "Sentinel blocked over 12,000 fraudulent messages in the first week of deployment.
              The integration was seamless."
            </p>
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                AK
              </div>
              <div>
                <div className="text-xs font-medium text-slate-300">Adebayo Kemi</div>
                <div className="text-xs text-slate-600">Head of Fraud, National Telecom Ltd</div>
              </div>
            </div>
          </div>
        </div>

        <p className="relative text-xs text-slate-600">
          © {new Date().getFullYear()} Sentinel AI. Enterprise fraud intelligence.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="p-1.5 rounded-lg bg-blue-500/15 border border-blue-500/25">
              <Shield className="size-4 text-blue-400" />
            </div>
            <span className="font-bold text-white tracking-widest text-sm">SENTINEL</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1.5">Create your account</h1>
            <p className="text-slate-500 text-sm">Set up your organisation and start detecting fraud.</p>
          </div>

          {serverError && (
            <div className="mb-5 flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-red-500/8 border border-red-500/20 text-sm text-red-400">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              {serverError}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
              {/* Organisation */}
              <FormField
                control={form.control}
                name="organizationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300 text-sm">Organisation name</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        autoComplete="organization"
                        placeholder="Acme Telecom Ltd"
                        className="bg-slate-900 border-slate-700 text-white placeholder-slate-600 focus-visible:border-blue-500/60 focus-visible:ring-blue-500/20 h-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* First + Last name */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300 text-sm">First name</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          autoComplete="given-name"
                          placeholder="Ada"
                          className="bg-slate-900 border-slate-700 text-white placeholder-slate-600 focus-visible:border-blue-500/60 focus-visible:ring-blue-500/20 h-10"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300 text-sm">Last name</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          autoComplete="family-name"
                          placeholder="Okafor"
                          className="bg-slate-900 border-slate-700 text-white placeholder-slate-600 focus-visible:border-blue-500/60 focus-visible:ring-blue-500/20 h-10"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300 text-sm">Work email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="ada@acme.com"
                        className="bg-slate-900 border-slate-700 text-white placeholder-slate-600 focus-visible:border-blue-500/60 focus-visible:ring-blue-500/20 h-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300 text-sm">Password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        autoComplete="new-password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    {strength && !form.formState.errors.password && (
                      <div className="space-y-1 pt-0.5">
                        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${strengthConfig[strength].bar}`} />
                        </div>
                        <p className={`text-xs ${strengthConfig[strength].text}`}>
                          {strengthConfig[strength].label} password
                        </p>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Confirm password */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300 text-sm">Confirm password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        autoComplete="new-password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white border-0 h-10 text-sm font-medium shadow-lg shadow-blue-500/20 disabled:opacity-60 mt-2"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Creating account…
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    Create account <ArrowRight className="size-4" />
                  </span>
                )}
              </Button>

              <p className="text-[11px] text-slate-600 text-center leading-relaxed">
                By creating an account you agree to our{' '}
                <a href="#" className="text-slate-500 hover:text-slate-400 underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-slate-500 hover:text-slate-400 underline">Privacy Policy</a>
              </p>
            </form>
          </Form>

          <p className="mt-5 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link
              to={AUTH_ROUTES.SIGN_IN}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
