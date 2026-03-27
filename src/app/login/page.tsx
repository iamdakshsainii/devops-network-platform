"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Mail, Lock, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import ParticleBackground from "@/components/marketing/ParticleBackground"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard"
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ email: "", password: "" })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
        callbackUrl,
      })

      if (result?.error) {
        toast.error(result.error || "Invalid credentials")
      } else {
        toast.success("Welcome back!")
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-background">
      <ParticleBackground />
      
      <div className="absolute top-[10%] left-[15%] w-[300px] h-[300px] bg-primary/20 rounded-full blur-[100px] animate-float-slow opacity-60" />
      <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] animate-float-slow delay-500 opacity-40" />
      
      <div className="w-full max-w-[420px] relative z-10 animate-slide-up">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-all group mb-8"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to home
        </Link>

        <div className="glass-strong border border-white/20 dark:border-white/5 p-8 rounded-3xl shadow-2xl space-y-8">
           <div className="space-y-2">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                 <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-black tracking-tight gradient-text">Welcome Back</h1>
              <p className="text-muted-foreground font-medium">Log in to continue your learning journey.</p>
           </div>

           <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <input 
                       type="email"
                       required
                       autoFocus
                       placeholder="you@example.com"
                       className="w-full h-12 bg-white/5 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl pl-12 pr-4 outline-none focus:border-primary/50 transition-all font-medium"
                       value={formData.email}
                       onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
              </div>

              <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Password</label>
                    <Link href="/forgot-password" title="Forgot Password" className="text-[10px] uppercase font-black text-primary/60 hover:text-primary transition-colors">Forgot?</Link>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <input 
                       type="password"
                       required
                       placeholder="••••••••"
                       className="w-full h-12 bg-white/5 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl pl-12 pr-4 outline-none focus:border-primary/50 transition-all font-medium"
                       value={formData.password}
                       onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-13 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 rounded-2xl font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 pt-0.5"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Authenticate"}
              </Button>
           </form>

           <div className="pt-4 border-t border-white/10 flex items-center justify-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">New to DevOps Network?</span>
              <Link href="/signup" className="text-xs font-black text-primary uppercase tracking-wider hover:underline underline-offset-4">Join Free</Link>
           </div>
        </div>
      </div>
    </div>
  )
}
