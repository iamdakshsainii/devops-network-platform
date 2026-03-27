"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Mail, Lock, User, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import ParticleBackground from "@/components/marketing/ParticleBackground"
import { toast } from "sonner"

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "" })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success("Welcome! Your account has been created.")
        router.push("/login?callbackUrl=/dashboard")
      } else {
        toast.error(data.message || "Registration failed")
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
           <div className="space-y-2 text-center">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                 <Terminal className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-black tracking-tight gradient-text leading-tight">Join the Network</h1>
              <p className="text-muted-foreground font-medium text-sm">Become part of the global DevOps community.</p>
           </div>

           <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <input 
                       type="text"
                       required
                       autoFocus
                       placeholder="Daksh Saini"
                       className="w-full h-11 bg-white/5 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl pl-12 pr-4 outline-none focus:border-primary/50 transition-all font-medium text-sm"
                       value={formData.fullName}
                       onChange={e => setFormData({...formData, fullName: e.target.value})}
                    />
                  </div>
              </div>

              <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <input 
                       type="email"
                       required
                       placeholder="you@example.com"
                       className="w-full h-11 bg-white/5 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl pl-12 pr-4 outline-none focus:border-primary/50 transition-all font-medium text-sm"
                       value={formData.email}
                       onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
              </div>

              <div className="space-y-1.5 pb-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Secure Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <input 
                       type="password"
                       required
                       placeholder="••••••••"
                       className="w-full h-11 bg-white/5 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl pl-12 pr-4 outline-none focus:border-primary/50 transition-all font-medium text-sm"
                       value={formData.password}
                       onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 rounded-xl font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Initiate Account"}
              </Button>
           </form>

           <div className="pt-4 border-t border-white/10 flex items-center justify-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">Already have an account?</span>
              <Link href="/login" className="text-xs font-black text-primary uppercase tracking-wider hover:underline underline-offset-4">Log In</Link>
           </div>
        </div>
      </div>
    </div>
  )
}
