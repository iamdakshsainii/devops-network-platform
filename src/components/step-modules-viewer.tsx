"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronRight, Play,
  Search, Zap, Clock, Trophy, Flame, LayoutGrid, List, Info, Lightbulb,
  Sparkles, Target, Star, ShieldCheck, ZapIcon, Pencil, Settings,
  Github, Youtube, ExternalLink, Paperclip, FileText, Globe, Box, Layers
} from "lucide-react";
import { BrandIcon } from "@/components/brand-icons";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const getIcon = (iconName: string, title?: string): React.ReactNode => {
   return <BrandIcon name={title || iconName} />;
};

export interface AttachedModule {
  id: string;
  order: number;
  isOptional?: boolean;
  optionalDescription?: string | null;
  module: {
    id: string;
    title: string;
    description: string;
    icon: string | null;
    tags: string;
    _count: { topics: number; resources: number };
    completedCount: number;
    readTime: number;
  };
}

export interface StepData {
  id: string;
  title: string;
  description: string;
  icon: string;
  attachedModules: AttachedModule[];
  resources?: any[]; // For Projects / Capstones
}

export interface RoadmapData {
  id: string;
  title: string;
  color: string;
  icon: string;
}

export interface SummaryStats {
  totalModules: number;
  totalTopics: number;
  completedTopics: number;
  percentComplete: number;
  completedResourceIds?: string[];
}

function useCountUp(target: number, duration = 1000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

function ProgressRing({ percent, color, size = 120, stroke = 7 }: {
  percent: number; color: string; size?: number; stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ 
          transition: "stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
          filter: `drop-shadow(0 0 8px ${color}66)`
        }}
      />
    </svg>
  );
}

export function StepModulesViewer({
  step, roadmap, prevStepId, nextStepId, stats, isAdmin
}: {
  step: StepData; roadmap: RoadmapData;
  prevStepId?: string; nextStepId?: string; stats: SummaryStats;
  isAdmin?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "az" | "topics">("default");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mounted, setMounted] = useState(false);
  const [localCompletedIds, setLocalCompletedIds] = useState<string[]>(stats.completedResourceIds || []);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setLocalCompletedIds(stats.completedResourceIds || []); }, [stats.completedResourceIds]);

  const animatedPercent = useCountUp(mounted ? stats.percentComplete : 0);
  const animatedCompleted = useCountUp(mounted ? stats.completedTopics : 0);

  const filteredModules = useMemo(() => {
    let r = [...step.attachedModules];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      r = r.filter((am) => am.module.title.toLowerCase().includes(q) || am.module.description.toLowerCase().includes(q));
    }
    if (sortBy === "az") r.sort((a, b) => a.module.title.localeCompare(b.module.title));
    else if (sortBy === "topics") r.sort((a, b) => b.module._count.topics - a.module._count.topics);
    else r.sort((a, b) => {
      if (a.isOptional !== b.isOptional) return a.isOptional ? 1 : -1;
      return a.order - b.order;
    });
    return r;
  }, [step.attachedModules, searchQuery, sortBy]);

  const isMastered = stats.percentComplete === 100 && stats.totalTopics > 0 && stats.totalModules > 0;
  const isOnFire = stats.percentComplete > 0 && stats.percentComplete < 100 && stats.totalModules > 0;

  const handleToggleResource = async (resourceId: string, completed: boolean) => {
    // OPTIMISTIC UPDATE: Immediate UI feedback
    setLocalCompletedIds(prev => 
       completed ? [...prev, resourceId] : prev.filter(id => id !== resourceId)
    );

    try {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: resourceId,
          itemType: "ROADMAP_RESOURCE",
          completed,
        }),
      });
    } catch {
      // Revert on failure
      setLocalCompletedIds(prev => 
        completed ? prev.filter(id => id !== resourceId) : [...prev, resourceId]
      );
      console.error("Resource toggle failed");
    }
  };

  const localProjectIsDone = (step.resources?.length ?? 0) > 0 && localCompletedIds.length > 0;
  const localPercent = localProjectIsDone ? 100 : stats.percentComplete;
  const localIsMastered = localPercent === 100 && (stats.totalTopics > 0 || (step.resources && step.resources.length > 0));
  const localIsOnFire = localPercent > 0 && localPercent < 100;

  return (
    <div className="min-h-screen bg-transparent relative selection:bg-primary selection:text-primary-foreground">
      {/* Dynamic Mesh Background */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(120,119,198,0.1),transparent_50%)]" />
        <div 
          className="absolute top-1/4 -left-1/4 w-[60%] h-[60%] rounded-full blur-[150px] opacity-[0.07] animate-pulse" 
          style={{ background: roadmap.color }}
        />
        <div 
          className="absolute bottom-1/4 -right-1/4 w-[50%] h-[50%] rounded-full blur-[150px] opacity-[0.05]" 
          style={{ background: roadmap.color }}
        />
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
          <div className="h-full w-full bg-[grid-size:40px_40px] bg-[grid-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)]" />
        </div>
      </div>

      {/* ── STICKY BREADCRUMB ── */}
      <div className="sticky top-0 z-[100] border-b bg-white/40 dark:bg-zinc-900/40 backdrop-blur-2xl">
        <div className="container mx-auto px-4 max-w-6xl flex items-center h-14 gap-3 text-xs">
          <Link href="/roadmap" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-all font-black">
            Roadmaps
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground/20" />
          <Link href={`/roadmap/${roadmap.id}`} className="text-muted-foreground/70 hover:text-foreground transition-all flex items-center gap-2 font-bold">
            <span className="hidden sm:inline">{roadmap.title}</span>
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground/20" />
          <span className="font-black text-foreground truncate flex items-center gap-2 tracking-tight">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: roadmap.color }} />
            {step.title}
          </span>
        </div>
      </div>

      {/* ── ELITE MASTERY HERO ── */}
      <div className="relative border-b overflow-hidden pt-6 pb-12 lg:pt-8 lg:pb-16 bg-gradient-to-b from-background to-muted/5">
        {/* Atmosphere */}
        <div className="absolute top-0 right-0 w-[40%] h-full bg-primary/5 blur-3xl rounded-full translate-x-1/2 -z-0 opacity-[0.05] dark:opacity-[0.1]" style={{ backgroundColor: `${roadmap.color}` }} />
        
        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-20">
            
            {/* Focus: Learning Data */}
            <div className="flex-1 space-y-6 animate-in fade-in slide-in-from-left-6 duration-700 w-full">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm"
                style={{ borderColor: `${roadmap.color}30`, color: roadmap.color, background: `${roadmap.color}05` }}
              >
                <Star className="h-3 w-3 fill-current" /> Roadmap Chapter
              </div>

              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                   <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl shrink-0 shadow-2xl border bg-card/40 backdrop-blur-xl group hover:rotate-6 transition-all duration-500" style={{ borderColor: `${roadmap.color}20` }}>
                      {getIcon(step.icon)}
                   </div>
                   <div>
                      <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground leading-tight">
                        {step.title}
                      </h1>
                      <p className="text-muted-foreground text-sm md:text-base mt-2 max-w-xl font-medium leading-relaxed opacity-80">
                        {step.description}
                      </p>
                   </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-muted/30 border border-border/40 backdrop-blur-md">
                   <BookOpen className="h-4 w-4" style={{ color: roadmap.color }} />
                   <span className="text-sm font-black text-foreground">
                      {stats.totalModules} Lessons
                   </span>
                </div>
                {isAdmin && (
                  <Link href={`/admin/roadmaps/${roadmap.id}`}>
                     <button className="h-10 px-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-amber-500/20 transition-all shadow-sm">
                        <Pencil className="h-3.5 w-3.5" /> Modify Roadmap
                     </button>
                  </Link>
                )}
              </div>
            </div>

            {/* ── ULTRA-PREMIUM MASTERY HUD (Roadmap Sync) ── */}
            <div className="shrink-0 animate-in fade-in slide-in-from-right-10 duration-1000 delay-300">
               <div className="flex items-center gap-6 p-5 md:p-6 rounded-[2rem] bg-background/50 dark:bg-zinc-900/40 border border-white/[0.1] shadow-2xl backdrop-blur-3xl transition-all duration-500 hover:scale-[1.03] group/hud cursor-default">
                  <div className="relative group/ring transition-transform duration-500 group-hover/hud:translate-x-1">
                      <ProgressRing
                        percent={localPercent}
                        color={localIsMastered ? "#10b981" : roadmap.color}
                        size={84}
                        stroke={7}
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center -space-y-0.5">
                          <span className="text-xl font-black tabular-nums tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/80">
                              {localPercent}
                          </span>
                          <span className="text-[9px] font-black uppercase text-foreground/40 tracking-tighter">%</span>
                      </div>
                      {localIsMastered && (
                         <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping-slow -z-10" />
                      )}
                  </div>

                  <div className="flex flex-col gap-2.5 min-w-[140px]">
                      <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                              {localIsMastered ? <Trophy className="h-3 w-3 text-emerald-500 shrink-0" /> : <Flame className="h-3 w-3 text-orange-500 shrink-0" />}
                              <span className={`text-[10px] font-black uppercase tracking-[0.12em] whitespace-nowrap ${localIsMastered ? "text-emerald-500" : "text-foreground/70"}`}>
                                  {localIsMastered ? "Chapter Perfected" : localPercent > 50 ? "Gain Momentum" : "Keep Forging"}
                              </span>
                          </div>
                          <div className="text-xl font-black tracking-tighter text-foreground uppercase group-hover/hud:text-primary transition-colors duration-500">
                              {localIsMastered ? "Mastery" : "Pathing"}
                          </div>
                      </div>

                      <div className="flex items-center gap-3 pt-2.5 border-t border-white/[0.08]">
                           <div className="flex flex-col">
                              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/80 leading-none mb-1">Status</span>
                              <div className="flex items-center gap-1.5">
                                  <div className={`w-1.5 h-1.5 rounded-full ${localIsMastered ? 'bg-emerald-500 animate-pulse' : 'bg-primary'}`} style={{ backgroundColor: localIsMastered ? undefined : roadmap.color }} />
                                  <span className="text-[11px] font-black text-foreground uppercase tracking-tight">{stats.completedTopics}/{stats.totalTopics || stats.totalModules} Units</span>
                              </div>
                           </div>
                      </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="container mx-auto px-4 max-w-6xl py-8 space-y-10">

        {/* Filters & Control Bar */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center w-full">
          <div className="relative group flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <Input
              placeholder="Search curriculum modules..."
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 w-full rounded-xl bg-white/40 dark:bg-zinc-900/40 backdrop-blur-2xl border-white/20 dark:border-white/5 focus:border-primary/50 text-sm font-bold shadow-sm transition-all placeholder:text-muted-foreground/20"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-muted/40 backdrop-blur-xl border border-border/50 rounded-xl p-1 shadow-sm h-12">
              <button 
                onClick={() => setViewMode("grid")} 
                className={`w-11 h-full flex items-center justify-center rounded-lg transition-all ${viewMode === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setViewMode("list")} 
                className={`w-11 h-full flex items-center justify-center rounded-lg transition-all ${viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <div className="relative h-12 group">
               <select
                 value={sortBy}
                 onChange={(e) => setSortBy(e.target.value as any)}
                 className="h-full px-5 rounded-xl bg-card/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-border/50 dark:border-white/5 text-[9px] font-black uppercase tracking-widest text-foreground appearance-none cursor-pointer focus:outline-none focus:border-primary/50 shadow-sm transition-all pr-10"
               >
                 <option value="default" className="bg-background">Structure</option>
                 <option value="az" className="bg-background">A → Z</option>
                 <option value="topics" className="bg-background">Topics</option>
               </select>
               <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 rotate-90 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ── INTERACTIVE CURRICULUM STRATEGY BANNER ── */}
        <div 
          className="p-6 rounded-[1.5rem] border bg-gradient-to-br from-white/60 to-white/40 dark:from-zinc-900/60 dark:to-zinc-900/40 backdrop-blur-xl shadow-md relative group/banner border-white/20 dark:border-white/5"
        >
          <div className="flex flex-col md:flex-row items-center gap-5 relative z-10">
            <div 
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border shadow-lg transition-transform group-hover:rotate-6 duration-500 bg-background/50"
              style={{ color: roadmap.color, borderColor: `${roadmap.color}33` }}
            >
              <Sparkles className="h-5 w-5 fill-current" />
            </div>
            <div className="space-y-1 text-center md:text-left">
              <h5 className="text-[11px] font-black text-foreground uppercase tracking-widest flex items-center justify-center md:justify-start gap-2">
                <Target className="h-3 w-3" style={{ color: roadmap.color }} /> Strategy
              </h5>
              <p className="text-[12px] md:text-[13px] text-muted-foreground leading-relaxed font-bold tracking-tight max-w-4xl opacity-80">
                Mandatory units build core competence. <span style={{ color: roadmap.color }} className="font-black border-b border-current px-0.5">Deep Dives</span> provide specialized expertise — complete them to distinguish your professional skills.
              </p>
            </div>
          </div>
        </div>

        {/* ── CONTENT GRID ── */}
        {(() => {
           const isProject = step.title.toLowerCase().includes("project") || step.title.toLowerCase().includes("capstone");
           const hasNoModules = filteredModules.length === 0;
           const showProjectView = isProject || (hasNoModules && (step.resources?.length ?? 0) > 0);

           if (showProjectView) {
             const resources = step.resources || [];
             return (
               <div className="space-y-12 pb-20 mt-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     {resources.map((res: any) => {
                        const isGithub = res.url.includes("github.com");
                        const isYoutube = res.url.includes("youtube.com") || res.url.includes("youtu.be");
                        const isDoc = res.type === "DOCUMENTATION" || res.url.includes("medium.com") || res.url.includes("dev.to");
                        
                        let Icon = ExternalLink;
                        let color = roadmap.color;
                        let label = "RESOURCE";
                        let branding = "text-primary bg-primary/10 border-primary/20";
                        
                        if (isGithub) { Icon = Github; label = "REPOSITORY"; branding = "dark:text-white text-zinc-900 bg-zinc-500/10 border-zinc-500/20"; color = "#333"; }
                        else if (isYoutube) { Icon = Youtube; label = "VIDEO"; branding = "text-red-500 bg-red-500/10 border-red-500/20"; color = "#ef4444"; }
                        else if (isDoc) { Icon = FileText; label = "ARTICLE"; branding = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"; color = "#10b981"; }

                        const isDone = localCompletedIds.includes(res.id);

                        return (
                          <Card key={res.id} className="group relative flex flex-col items-start border border-border/10 hover:border-primary/30 backdrop-blur-xl bg-card/60 shadow-lg hover:shadow-[0_20px_50px_rgba(0,0,0,0.15)] hover:-translate-y-1.5 transition-all duration-500 cursor-pointer h-full overflow-hidden">
                             <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-0 group-hover:opacity-30 transition-opacity duration-1000" style={{ backgroundColor: color }} />
                             
                             <CardHeader className="pl-6 w-full pb-3 border-b border-border/5 relative z-10 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                   <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${branding}`}>
                                      {label}
                                   </div>
                                   <button
                                      onClick={(e) => {
                                         e.stopPropagation();
                                         handleToggleResource(res.id, !isDone);
                                      }}
                                      className={`group/check flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all shadow-md active:scale-90 ${
                                         isDone 
                                         ? "bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20" 
                                         : "bg-background/80 border-border/40 text-muted-foreground/40 hover:border-emerald-500/50 hover:text-emerald-500"
                                      }`}
                                   >
                                      {isDone ? <CheckCircle2 className="h-4 w-4 fill-white/20" /> : <div className="h-4 w-4 rounded-full border-2 border-current opacity-20" />}
                                      <span className="text-[10px] font-black uppercase tracking-widest">
                                         {isDone ? "Ready" : "Complete"}
                                      </span>
                                   </button>
                                </div>

                                <div className="flex flex-col gap-4">
                                   <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border bg-background shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${isDone ? "border-emerald-500/30" : "border-border/10"}`}>
                                      <Icon className={`h-7 w-7 opacity-90 transition-transform duration-500 ${isDone ? "text-emerald-500" : ""}`} style={{ color: isDone ? undefined : color }} />
                                   </div>
                                   <CardTitle 
                                     className={`text-xl font-black tracking-tight group-hover:text-primary transition-colors leading-tight ${isDone ? "text-emerald-500/80" : ""}`}
                                     style={{ color: isDone ? undefined : color }}
                                   >
                                      {res.title}
                                   </CardTitle>
                                </div>
                             </CardHeader>

                             <CardContent className="pl-6 pt-3 flex-1 flex flex-col min-h-0 w-full mb-auto pb-6 relative z-10">
                                <p className="text-sm text-muted-foreground/90 line-clamp-3 mb-8 flex-1 leading-relaxed font-bold">
                                   {res.description}
                                </p>

                                <div className="mt-auto flex items-center justify-between gap-3 pt-4 border-t border-border/10">
                                   <a 
                                      href={res.url} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="flex-1"
                                      onClick={e => e.stopPropagation()}
                                   >
                                      <span className="text-primary text-[11px] font-bold transition-all hover:underline flex items-center gap-2">
                                         Explore Project <ExternalLink className="h-3.5 w-3.5" />
                                      </span>
                                   </a>
                                   {isDone && (
                                      <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-in zoom-in-75 duration-700">
                                         <Trophy className="h-5 w-5" />
                                      </div>
                                   )}
                                </div>
                             </CardContent>
                          </Card>
                        );
                     })}
                  </div>
                  
                  {hasNoModules && (
                    <div className="p-10 rounded-[4rem] border-4 border-dashed border-border/20 bg-muted/10 text-center space-y-4">
                       <Lightbulb className="h-12 w-12 text-primary/40 mx-auto" />
                       <h3 className="text-2xl font-black tracking-tighter text-foreground/80">Independent Capstone Project</h3>
                       <p className="text-muted-foreground text-sm font-bold max-w-lg mx-auto leading-relaxed">
                          This step is designed for self-directed practical application. Study the external repositories and videos above to implement your solution.
                       </p>
                    </div>
                  )}
               </div>
             );
           }

           return filteredModules.length > 0 ? (
            <div className={viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 pb-20 mt-8"
               : "flex flex-col gap-8 pb-20 mt-8"
             }>
              {filteredModules.map((am, index) => {
                const total = am.module._count.topics;
                const done = am.module.completedCount;
                const percent = total > 0 ? Math.round((done / total) * 100) : 0;
                const isCompleted = total > 0 && done >= total;
                const accentColor = roadmap.color;
  
                /* ── LIST VIEW (Premium Row) ── */
                if (viewMode === "list") {
                  return (
                    <Link
                      key={am.id}
                      href={`/modules/${am.module.id}?roadmapId=${roadmap.id}&stepId=${step.id}`}
                      className="group flex flex-col md:flex-row md:items-center gap-6 p-6 rounded-2xl border bg-card/40 backdrop-blur-xl hover:shadow-xl hover:border-primary/20 transition-all duration-300 relative overflow-hidden active:scale-[0.99]"
                    >
                       <div 
                          className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-700"
                          style={{ background: accentColor }}
                       />
                       <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 border bg-background/50 backdrop-blur-xl shadow-sm transition-all duration-500 group-hover:scale-105 group-hover:-rotate-2"
                        style={{ borderColor: `${accentColor}20` }}
                       >
                         {getIcon(am.module.icon || "", am.module.title)}
                       </div>
                       <div className="flex-1 space-y-1.5 min-w-0">
                         <div className="flex flex-wrap items-center gap-3">
                           <span className="font-black text-foreground text-lg tracking-tight group-hover:text-primary transition-colors truncate">{am.module.title}</span>
                           {am.isOptional && (
                             <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-muted border border-border/50 text-muted-foreground/60">Optional</span>
                           )}
                           {isCompleted && (
                             <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">Mastered</span>
                           )}
                         </div>
                         <p className="text-[13px] text-muted-foreground font-bold tracking-tight line-clamp-1 opacity-70">{am.module.description}</p>
                       </div>
                       <div className="flex items-center gap-6 shrink-0">
                          <div className="hidden sm:flex flex-col items-end gap-1.5">
                             <span className="text-[10px] font-black text-foreground/50 tracking-widest uppercase">{percent}% Completion</span>
                             <div className="w-32 h-1.5 rounded-full bg-muted/50 overflow-hidden border border-border/10">
                                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${percent}%`, background: accentColor }} />
                             </div>
                          </div>
                          <div className="h-10 w-10 rounded-full border border-border flex items-center justify-center group-hover:bg-primary group-hover:border-primary transform transition-all group-hover:scale-110">
                             <ArrowRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-white" />
                          </div>
                       </div>
                    </Link>
                  );
                }
  
                /* ── GRID VIEW (Elite Module Library Clone) ── */
                const cyclingColors = ["#3b82f6", "#f97316", "#8b5cf6", "#10b981", "#ec4899", "#14b8a6"];
                const cardColor = accentColor || cyclingColors[index % cyclingColors.length];

                return (
                  <div
                    key={am.id}
                    onClick={() => router.push(`/modules/${am.module.id}?roadmapId=${roadmap.id}&stepId=${step.id}`)}
                    className="group block h-full cursor-pointer"
                  >
                    <Card
                      className={`h-full transition-all duration-500 relative overflow-hidden flex flex-col items-start border border-border/10 hover:border-primary/30 backdrop-blur-xl bg-card/60 shadow-lg hover:shadow-[0_20px_50px_rgba(0,0,0,0.15)] hover:-translate-y-1.5 group select-none ${
                        isCompleted
                          ? "bg-emerald-500/[0.03] border-emerald-500/20 hover:border-emerald-500/40"
                          : ""
                      }`}
                    >
                      {/* Glowing Backlight Sphere */}
                      <div
                        className="absolute -top-16 -right-16 w-36 h-36 rounded-full opacity-0 group-hover:opacity-30 transition-all duration-500 blur-3xl pointer-events-none"
                        style={{ backgroundColor: cardColor }}
                      />
                      {/* Colored top accent bar */}
                      <div
                        className="absolute top-0 left-0 right-0 h-1.5 transition-opacity"
                        style={{
                          backgroundColor: isCompleted ? "#10b981" : cardColor,
                          opacity: 0.8,
                        }}
                      />
                      {isCompleted && (
                        <div className="absolute bottom-4 right-4 opacity-[0.07] pointer-events-none select-none z-0">
                          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                        </div>
                      )}

                      <CardHeader className="pl-6 w-full pb-3 border-b border-border/5 relative z-10 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center justify-center text-3xl bg-primary/5 w-14 h-14 rounded-2xl shadow-sm border border-border/10 group-hover:bg-primary/10 group-hover:scale-105 transition-all duration-300 overflow-hidden">
                            {getIcon(am.module.icon || "", am.module.title)}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 pt-0.5">
                            {isAdmin && (
                              <Link href={`/admin/modules/${am.module.id}`} target="_blank" onClick={(e) => e.stopPropagation()}>
                                <Button variant="outline" size="sm" className="rounded-full h-8 text-[11px] font-bold gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border-amber-500/20 shadow-sm px-3">
                                  <Pencil className="h-3 w-3" /> Edit
                                </Button>
                              </Link>
                            )}
                            <div className="flex items-center gap-2">
                               {am.isOptional && (
                                  <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-widest rounded-md border-border/30 text-muted-foreground/80 bg-background/40 backdrop-blur-sm px-2 py-0.5">
                                     Optional
                                  </Badge>
                               )}
                               <Badge
                                 variant="outline"
                                 className="text-[10px] font-black w-6 h-6 rounded-md flex items-center justify-center p-0"
                                 style={{ backgroundColor: `${cardColor}10`, color: cardColor, borderColor: `${cardColor}20` }}
                               >
                                 #{index + 1}
                               </Badge>
                            </div>
                          </div>
                        </div>
                        <CardTitle className="text-xl text-foreground group-hover:text-primary transition-colors font-black leading-snug tracking-tight mb-1 min-h-[3rem] flex items-center">
                          {am.module.title}
                        </CardTitle>
                      </CardHeader>

                      <CardContent className="pl-6 pt-3 flex-1 flex flex-col min-h-0 w-full mb-auto pb-6 relative z-10 w-full">
                        <p className="text-sm text-muted-foreground/90 line-clamp-3 mb-4 flex-1 leading-relaxed font-bold opacity-70">
                          {am.module.description || "Explore this module to view its curated topics and community resources."}
                        </p>

                        {am.module.tags && (
                          <div className="flex flex-wrap gap-1.5 mt-auto mb-5">
                            {am.module.tags
                              .split(",")
                              .filter(Boolean)
                              .map((t: string) => (
                                <div
                                  key={t}
                                  className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-colors"
                                  style={{ color: cardColor, borderColor: `${cardColor}20`, backgroundColor: `${cardColor}10`, border: "1px solid" }}
                                >
                                  {t.trim()}
                                </div>
                              ))}
                          </div>
                        )}

                        <div className="flex items-center gap-4 pt-4 border-t border-border/10">
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5 text-muted-foreground/50" />
                            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/70">
                              {am.module._count?.topics || 0} Lessons
                            </span>
                          </div>
                          {(am.module._count?.resources || 0) > 0 && (
                             <div className="flex items-center gap-1.5 border-l border-border/10 pl-4">
                               <Layers className="h-3.5 w-3.5 text-muted-foreground/50" />
                               <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/70">
                                 {am.module._count.resources} Resources
                               </span>
                             </div>
                          )}
                          <span className="ml-auto text-primary text-[11px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1">
                             Learn <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border-4 border-dashed border-border/20 rounded-[5rem] p-32 text-center bg-muted/10 backdrop-blur-md animate-in zoom-in-95 duration-700">
              <ZapIcon className="h-16 w-16 text-muted-foreground/20 mx-auto mb-6 animate-pulse" />
              <p className="text-muted-foreground text-2xl font-black tracking-tightest">No Matching Resources Found</p>
              <p className="text-muted-foreground/50 text-base mt-2 font-bold uppercase tracking-widest">Adjust filters or search parameters</p>
            </div>
          );
        })()}

        {/* ── PREV / NEXT NAVIGATION ── */}
        <div className="pt-10 border-t-2 border-border/10 flex flex-col sm:flex-row items-center justify-between gap-6 pb-20">
          {prevStepId ? (
            <Link href={`/roadmap/${roadmap.id}/${prevStepId}`} className="group w-full sm:w-auto">
              <button className="w-full flex items-center justify-center gap-4 px-8 py-4 rounded-3xl border-2 border-border bg-card/40 backdrop-blur-xl text-foreground hover:bg-muted transition-all">
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm font-black uppercase tracking-widest">Previous</span>
              </button>
            </Link>
          ) : <div />}

          {nextStepId ? (
            <Link href={`/roadmap/${roadmap.id}/${nextStepId}`} className="group w-full sm:w-auto">
              <button
                className="w-full flex items-center justify-center gap-4 px-10 py-4 rounded-3xl text-white shadow-xl transition-all"
                style={{ backgroundColor: roadmap.color, boxShadow: `0 10px 30px -5px ${roadmap.color}66` }}
              >
                <span className="text-sm font-black uppercase tracking-widest">Next Step</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          ) : <div />}
        </div>
      </div>

      <style jsx global>{`
        @keyframes shine {
          0% { transform: translateX(-100%) rotate(45deg); }
          100% { transform: translateX(400%) rotate(45deg); }
        }
        .animate-shine {
          animation: shine 4s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .ease-out-back {
          transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .tracking-tightest {
          letter-spacing: -0.05em;
        }
        h1, h2, h3, h5, button {
            font-family: var(--font-outfit), sans-serif;
        }
      `}</style>
    </div>
  );
}