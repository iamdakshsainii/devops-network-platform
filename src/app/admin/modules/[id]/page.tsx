"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Save, Plus, Code2, Type, FileText,
  Loader2, X, Trash2, ChevronDown, ChevronRight, Image as ImageIcon,
  Eye, Edit, Maximize2, GripVertical, ArrowUp, ArrowDown, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

import { parseMarkdown } from "@/lib/markdown";


interface TopicForm { title: string; content: string; expanded: boolean; }
interface ResourceForm { title: string; url: string; type: string; description: string; imageUrl?: string; }

interface ModuleForm {
  title: string;
  description: string;
  icon: string;
  status?: string;
  difficulty?: string;
  tags?: string;
  topics: TopicForm[];
  resources: ResourceForm[];
}


const emptyTopic = (): TopicForm => ({ title: "", content: "", expanded: true });
const emptyResource = (): ResourceForm => ({ title: "", url: "", type: "ARTICLE", description: "", imageUrl: "" });

const TopicTextarea = ({ id, value, onChange, className, placeholder, onImageUpload, wrapText = true }: { id: string, value: string, onChange: (v: string) => void, className?: string, placeholder?: string, onImageUpload?: (f: File) => void, wrapText?: boolean }) => {
  const [val, setVal] = useState(value);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    if (typeof document !== "undefined" && document.activeElement?.id === id) return;
    setVal(value);
  }, [value, id]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value;
    setVal(nextVal);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onChange(nextVal);
    }, 500); 
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file && onImageUpload) {
          e.preventDefault();
          onImageUpload(file);
          return; 
        }
      }
    }
  };

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  return (
    <textarea
      id={id}
      value={val}
      onChange={handleChange}
      onPaste={handlePaste}
      wrap={wrapText ? "soft" : "off"}
      className={`${className} ${wrapText ? "" : "overflow-x-auto whitespace-pre"}`}
      placeholder={placeholder}
    />
  );
};

export default function EditModulePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [moduleId, setModuleId] = useState("");
  const [mode, setMode] = useState<"FORM" | "JSON" | "MARKDOWN" | "PREVIEW">("FORM");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [markdownInput, setMarkdownInput] = useState("");
  const [fullMarkdownOutput, setFullMarkdownOutput] = useState("");

  const [replaceExisting, setReplaceExisting] = useState(true);
  const [parseTopicsOnly, setParseTopicsOnly] = useState(false);

  const [form, setForm] = useState<ModuleForm>({
    title: "", description: "", icon: "📦", tags: "", topics: [], resources: []
  });

  const [openTopicPaste, setOpenTopicPaste] = useState<number | null>(null);
  const [topicMarkdownInput, setTopicMarkdownInput] = useState("");
  const [topicParseMode, setTopicParseMode] = useState<Record<number, "CONTINUOUS" | "STEPWISE">>({});
  const [collapsedIntro, setCollapsedIntro] = useState<Record<number, boolean>>({});
  const [roadmaps, setRoadmaps] = useState<any[]>([]);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string>("");
  const [selectedStepId, setSelectedStepId] = useState<string>("");
  const [stepOptions, setStepOptions] = useState<any[]>([]);
  
  const [globalResources, setGlobalResources] = useState<any[]>([]);
  const [moduleAttachments, setModuleAttachments] = useState<any[]>([]);
  const [previewModes, setPreviewModes] = useState<Record<string, boolean>>({});
  const [resSearchQuery, setResSearchQuery] = useState("");
  const [showResSearch, setShowResSearch] = useState(false);
  const [wordWrap, setWordWrap] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetch('/api/admin/resources')
      .then(res => res.json())
      .then(data => setGlobalResources(Array.isArray(data) ? data : []))
      .catch(() => setGlobalResources([]));
    
    fetch('/api/roadmaps')
      .then(res => res.json())
      .then(data => setRoadmaps(Array.isArray(data) ? data : []))
      .catch(() => setRoadmaps([]));
  }, []);

  useEffect(() => {
    if (selectedRoadmapId) {
      const rm = roadmaps.find(r => r.id === selectedRoadmapId);
      setStepOptions(rm?.steps || []);
    } else {
      setStepOptions([]);
    }
  }, [selectedRoadmapId, roadmaps]);

  useEffect(() => {
    params.then(p => {
      setModuleId(p.id);
      if (p.id === "new") { setLoading(false); return; }
      fetch(`/api/modules/${p.id}`)
        .then(res => res.json())
        .then(data => {
          const loadedForm = {
            title: data.title,
            description: data.description || "",
            icon: data.icon || "📦",
            status: data.status || "PENDING",
            difficulty: data.difficulty || "BEGINNER",
            tags: data.tags || "",
            topics: (data.topics || []).map((t: any) => ({ title: t.title, content: t.content || "", expanded: false })),
            resources: (data.resources || []).map((r: any) => ({ title: r.title, url: r.url, type: r.type || "ARTICLE", description: r.description || "", imageUrl: r.imageUrl || "" })),
          };
          setForm(loadedForm);
          setJsonInput(JSON.stringify(loadedForm, null, 2));
          setModuleAttachments(data.moduleAttachments || []);
          setLoading(false);
        })
        .catch(() => { setError("Failed to load module"); setLoading(false); });
    });
  }, [params]);

  // Auto-sync for Bulk Editor / JSON
  useEffect(() => {
    if (mode === "JSON" && !jsonInput) setJsonInput(JSON.stringify(form, null, 2));
    if (mode === "PREVIEW") generateFullMarkdown();
  }, [mode]);

  const handleTopicMarkdownParse = (ti: number) => {
    try {
      const mode = topicParseMode[ti] || "STEPWISE";
      const nt = [...form.topics];
      nt[ti] = { ...nt[ti], content: topicMarkdownInput.trim(), expanded: true };
      setForm({ ...form, topics: nt });
      setOpenTopicPaste(null);
      setTopicMarkdownInput("");
      toast.success("Parsed!");
    } catch { toast.error("Parsing failed"); }
  };

  const handleMarkdownParse = () => {
    try {
      const lines = markdownInput.split("\n");
      let currentTopic: TopicForm | null = null;
      const topics: TopicForm[] = [];
      let mTitle = "";
      let mDesc = "";
      let foundHeader1 = false;
      let inCodeBlock = false;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("```")) inCodeBlock = !inCodeBlock;
        const isH1 = trimmed.startsWith("# ") && !trimmed.startsWith("## ") && !inCodeBlock;
        const isH2 = trimmed.startsWith("## ") && !inCodeBlock;

        if (isH1) {
          mTitle = trimmed.replace(/^# /, "").trim();
          foundHeader1 = true;
          if (parseTopicsOnly) { currentTopic = { title: mTitle, content: "", expanded: false }; topics.push(currentTopic); }
        } else if (isH2) {
          currentTopic = { title: trimmed.replace(/^##\s*/, "").trim(), content: "", expanded: false };
          topics.push(currentTopic);
        } else if (currentTopic) {
          currentTopic.content += line + "\n";
        } else if (trimmed.length > 0 && !inCodeBlock && !foundHeader1) {
          mDesc += line + "\n";
        } else if (trimmed.length > 0) {
          currentTopic = { title: "Introduction", content: line + "\n", expanded: false };
          topics.push(currentTopic);
        }
      }

      setForm({ 
        ...form, 
        ...(!parseTopicsOnly && { title: mTitle || form.title, description: mDesc.trim() || form.description }),
        topics: replaceExisting ? topics : [...form.topics, ...topics] 
      });
      setMode("FORM"); setMarkdownInput(""); toast.success(`Parsed ${topics.length} topics!`);
    } catch { setError("Failed to parse"); }
  };

  const handleSave = async (forceStatus?: "PENDING" | "PUBLISHED", noRedirect = false) => {
    setSaving(true); setError("");
    try {
      const payload = { ...form };
      if (forceStatus) payload.status = forceStatus;
      const isNew = moduleId === "new";
      const res = await fetch(isNew ? `/api/modules` : `/api/modules/${moduleId}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success(noRedirect ? "Changes saved!" : "Module saved!");
      if (!noRedirect) { router.push("/admin/modules"); router.refresh(); } else { setSaving(false); }
    } catch (err: any) { setError(err.message); setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure?")) return;
    try {
      await fetch(`/api/modules/${moduleId}`, { method: "DELETE" });
      router.push("/admin/modules"); router.refresh();
    } catch { }
  };

  const updateTopic = (i: number, data: Partial<TopicForm>) => {
    const topics = [...form.topics];
    topics[i] = { ...topics[i], ...data };
    setForm({ ...form, topics });
  };

   const moveTopic = (from: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= form.topics.length) return;
    const nt = [...form.topics];
    const [m] = nt.splice(from, 1);
    nt.splice(toIndex, 0, m);
    setForm({ ...form, topics: nt });
  };

  const addTopicAtIndex = (index: number) => {
    const nt = [...form.topics];
    nt.splice(index, 0, emptyTopic());
    setForm({ ...form, topics: nt });
  };

  const handleContentImageUpload = async (ti: number, file: File | undefined) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error();
      const current = form.topics[ti].content || "";
      updateTopic(ti, { content: current + `\n\n![Image](${data.url})\n` });
      toast.success("Image added!");
    } catch { toast.error("Upload failed"); }
  };

  const handleAttachToStep = async () => {
    if (!selectedStepId) return toast.error("Select a roadmap step first");
    try {
      const res = await fetch(`/api/roadmaps/${selectedRoadmapId}/steps/${selectedStepId}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId })
      });
      if (res.ok) {
        toast.success("Successfully linked to roadmap!");
        setSelectedRoadmapId("");
        setSelectedStepId("");
        // Re-fetch to sync
        fetch(`/api/modules/${moduleId}`)
           .then(r => r.json())
           .then(data => setModuleAttachments(data.moduleAttachments || []));
      } else {
        const d = await res.json();
        toast.error(d.message || "Failed to link");
      }
    } catch { toast.error("An error occurred"); }
  };

  const handleUpdateAttachment = async (rmId: string, stepId: string, isOptional: boolean) => {
    try {
      const res = await fetch(`/api/roadmaps/${rmId}/steps/${stepId}/modules`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId, isOptional })
      });
      if (res.ok) {
        setModuleAttachments(prev => prev.map(a => a.stepId === stepId ? { ...a, isOptional } : a));
        toast.success("Updated!");
      }
    } catch { toast.error("Update failed"); }
  };

  const handleDeleteAttachment = async (rmId: string, stepId: string) => {
    if (!confirm("Remove this module from this roadmap step?")) return;
    try {
      const res = await fetch(`/api/roadmaps/${rmId}/steps/${stepId}/modules`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId })
      });
      if (res.ok) {
        setModuleAttachments(prev => prev.filter(a => a.stepId !== stepId));
        toast.success("Detached from roadmap.");
      }
    } catch { toast.error("Failed to detach"); }
  };

  const generateFullMarkdown = () => {
    let md = `# ${form.title || "Untitled"}\n\n${form.description || ""}\n\n---\n\n`;
    form.topics.forEach((t, i) => {
      md += `## ${t.title || `Topic ${i+1}`}\n\n${t.content || ""}\n\n`;
    });
    setFullMarkdownOutput(md);
  };

  const applyFullMarkdown = () => {
    try {
      const lines = fullMarkdownOutput.split("\n");
      let currentTopic: TopicForm | null = null;
      const topics: TopicForm[] = [];
      let mTitle = "";
      let mDesc = "";
      let foundHeader1 = false;
      let inCodeBlock = false;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("```")) inCodeBlock = !inCodeBlock;
        const isH1 = trimmed.startsWith("# ") && !trimmed.startsWith("## ") && !inCodeBlock;
        const isH2 = trimmed.startsWith("## ") && !inCodeBlock;

        if (isH1) {
          mTitle = trimmed.replace(/^# /, "").trim();
          foundHeader1 = true;
        } else if (isH2) {
          currentTopic = { title: trimmed.replace(/^##\s*/, "").trim(), content: "", expanded: false };
          topics.push(currentTopic);
        } else if (currentTopic) {
          currentTopic.content += line + "\n";
        } else if (trimmed.length > 0 && !inCodeBlock && !foundHeader1) {
          mDesc += line + "\n";
        }
      }

      setForm({ ...form, title: mTitle || form.title, description: mDesc.trim() || form.description, topics });
      setMode("FORM");
      toast.success("Bulk content applied to editor!");
    } catch { toast.error("Failed to parse markdown"); }
  };

  if (loading) return <div className="p-20 text-center text-muted-foreground"><Loader2 className="h-10 w-10 animate-spin mx-auto mb-2" /> Loading...</div>;

  return (
    <div className="space-y-8 max-w-5xl pb-24 relative mx-auto">
      <div className="sticky top-0 z-50 -mx-6 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border/10 flex items-center justify-between gap-4 flex-wrap shadow-sm mb-4">
        <div><h1 className="text-xl font-black flex items-center gap-2"><span>{form.icon}</span>{form.title || "Untitled"}</h1></div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/modules")} className="text-muted-foreground font-bold text-xs uppercase hover:bg-muted/50">Discard</Button>
          <Button variant="outline" size="sm" onClick={() => handleSave("PENDING")} disabled={saving || !form.title} className="font-bold border-primary/20 hover:bg-primary/5 h-10 px-4">Save Draft</Button>
          <Button size="sm" onClick={() => handleSave("PUBLISHED")} disabled={saving || !form.title} className="bg-primary font-black uppercase text-xs tracking-widest h-10 px-6 tracking-widest shadow-xl shadow-primary/20">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish Live"}</Button>
        </div>
      </div>

      <div className="flex bg-muted p-1 rounded-xl w-fit gap-0.5 shadow-inner border border-border/40 mb-6">
        <Button variant={mode === "FORM" ? "secondary" : "ghost"} size="sm" onClick={() => setMode("FORM")} className="uppercase text-[10px] font-black tracking-widest px-4"><Type className="h-4 w-4 mr-2" /> Editor</Button>
        <Button variant={mode === "JSON" ? "secondary" : "ghost"} size="sm" onClick={() => { setJsonInput(JSON.stringify(form, null, 2)); setMode("JSON"); }} className="uppercase text-[10px] font-black tracking-widest px-4"><Code2 className="h-4 w-4 mr-2" /> JSON</Button>
        <Button variant={mode === "MARKDOWN" ? "secondary" : "ghost"} size="sm" onClick={() => setMode("MARKDOWN")} className="uppercase text-[10px] font-black tracking-widest px-4"><FileText className="h-4 w-4 mr-2" /> Markdown Paste</Button>
        <Button variant={mode === "PREVIEW" ? "secondary" : "ghost"} size="sm" onClick={() => { generateFullMarkdown(); setMode("PREVIEW"); }} className="uppercase text-[10px] font-black tracking-widest px-4"><Eye className="h-4 w-4 mr-2" /> Full Preview</Button>
      </div>

      {error && <div className="p-3 bg-destructive/15 text-destructive border border-destructive/20 rounded-md text-sm">{error}</div>}

      {mode === "JSON" && (
        <Card className="animate-in fade-in duration-300">
          <CardContent className="pt-6 space-y-4">
            <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)} className="w-full h-[600px] rounded-md border bg-background px-3 py-2 text-xs font-mono" />
            <Button onClick={() => { try { const p = JSON.parse(jsonInput); setForm(p); setMode("FORM"); toast.success("JSON Applied!"); } catch { toast.error("Invalid JSON"); } }}>Apply JSON</Button>
          </CardContent>
        </Card>
      )}

      {mode === "MARKDOWN" && (
        <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300 shadow-xl border-primary/10">
          <CardContent className="pt-6 space-y-6">
             <div className="flex items-center justify-between">
               <div className="space-y-1">
                 <p className="text-sm font-black uppercase tracking-widest text-primary">Bulk Markdown Importer</p>
                 <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Format: <span className="text-foreground"># Title</span> (Module), <span className="text-foreground">## Title</span> (Topic)</p>
               </div>
               <div className="flex bg-muted/50 p-1.5 rounded-xl border border-border/40 gap-4">
                 <label className="flex items-center gap-2 cursor-pointer group">
                   <input type="checkbox" checked={replaceExisting} onChange={e => setReplaceExisting(e.target.checked)} className="h-4 w-4 rounded border-primary/20 accent-primary" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">Replace Existing Topics</span>
                 </label>
                 <div className="w-px h-3 bg-border" />
                 <label className="flex items-center gap-2 cursor-pointer group">
                   <input type="checkbox" checked={parseTopicsOnly} onChange={e => setParseTopicsOnly(e.target.checked)} className="h-4 w-4 rounded border-primary/20 accent-primary" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">Ignore Module Metadata</span>
                 </label>
               </div>
             </div>
             <textarea 
               value={markdownInput} 
               onChange={e => setMarkdownInput(e.target.value)} 
               className="w-full h-[600px] rounded-2xl border border-border/40 bg-zinc-50/50 dark:bg-zinc-900/50 p-6 text-sm font-mono leading-relaxed focus:ring-2 focus:ring-primary/20 shadow-inner" 
               placeholder="Paste whole module markdown here (e.g. from ChatGPT or GitHub)..." 
             />
             <div className="flex justify-end">
               <Button onClick={handleMarkdownParse} className="bg-primary font-black uppercase text-xs tracking-widest px-8 shadow-lg shadow-primary/20 hover:scale-105 transition-all">Parse & Apply Curriculum</Button>
             </div>
          </CardContent>
        </Card>
      )}

      {mode === "PREVIEW" && (
        <div className="grid lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
          <Card className="border-primary/20 shadow-2xl overflow-hidden bg-background">
            <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between py-4">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-primary">Final Markdown Record</CardTitle>
              <Button size="sm" variant="outline" className="h-8 font-black uppercase text-[10px] border-primary/20 bg-background px-4 hover:bg-primary/5 transition-all" onClick={() => { navigator.clipboard.writeText(fullMarkdownOutput); toast.success("Module content ready!"); }}>📋 Copy Complete Notes</Button>
            </CardHeader>
            <CardContent className="p-0">
              <textarea 
                value={fullMarkdownOutput} 
                onChange={e => setFullMarkdownOutput(e.target.value)} 
                className="w-full h-[750px] bg-zinc-50/30 dark:bg-zinc-900/30 p-8 font-mono text-[13px] leading-relaxed resize-none focus:outline-none custom-scrollbar" 
                placeholder="Synchronized module content..."
              />
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-xl bg-muted/5 overflow-hidden">
             <CardHeader className="bg-primary/5 border-b py-4 flex flex-row items-center justify-between">
               <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">High-Fidelity Preview</CardTitle>
               <Button size="sm" onClick={applyFullMarkdown} className="bg-emerald-600 hover:bg-emerald-700 font-black uppercase text-[10px] tracking-widest px-4 shadow-lg shadow-emerald-500/20">Sync Back to Topics</Button>
             </CardHeader>
             <CardContent className="h-[750px] overflow-y-auto p-12 prose prose-zinc dark:prose-invert max-w-none prose-headings:font-black prose-headings:tracking-tighter prose-p:leading-relaxed prose-pre:bg-black/60 custom-scrollbar">
                <h1 className="text-5xl font-black mb-6 flex items-center gap-5 tracking-tighter"><span>{form.icon}</span>{form.title}</h1>
                <div dangerouslySetInnerHTML={{ __html: parseMarkdown(form.description || "") }} className="text-xl text-muted-foreground italic mb-20 leading-relaxed font-medium opacity-80" />
                {form.topics.map((t, i) => (
                  <div key={i} className="mb-20 border-t border-border/20 pt-16 group/prev">
                    <h2 className="text-3xl font-black uppercase tracking-widest text-primary/80 mb-8 flex items-center gap-5 group-hover/prev:text-primary transition-colors">
                      <span className="text-xs font-mono bg-primary/10 text-primary px-4 py-2 rounded-full ring-1 ring-primary/20">{String(i+1).padStart(2, '0')}</span>
                      {t.title}
                    </h2>
                    <div dangerouslySetInnerHTML={{ __html: parseMarkdown(t.content || "") }} />
                  </div>
                ))}
             </CardContent>
          </Card>
        </div>
      )}

      {mode === "FORM" && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-4 border-b bg-muted/20">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-primary/80">Module Metadata</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid md:grid-cols-[1fr_240px] gap-8">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Module Title</label>
                    <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="h-12 bg-muted/30 border-none font-bold text-lg rounded-xl focus:ring-primary/20" placeholder="e.g. Introduction to Kubernetes" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Contextual Description</label>
                    <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full min-h-[120px] bg-muted/30 border-none rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-primary/20" placeholder="What will they learn?" />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Difficulty Level</label>
                      <select value={form.difficulty} onChange={e => setForm({...form, difficulty: e.target.value})} className="w-full h-11 bg-muted/30 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 appearance-none">
                        <option value="BEGINNER">🟢 Beginner</option>
                        <option value="INTERMEDIATE">🟡 Intermediate</option>
                        <option value="ADVANCED">🔴 Advanced</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tags (Comma separated)</label>
                      <Input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} className="h-11 bg-muted/30 border-none font-medium text-sm rounded-xl focus:ring-primary/20" placeholder="e.g. AWS, Devops, Docker" />
                    </div>
                  </div>

                  <div className="w-full h-px bg-border/40 my-2" />

                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Quick Link to Roadmap</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end">
                      <div className="md:col-span-3 space-y-1.5">
                         <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Choose Roadmap</label>
                         <select value={selectedRoadmapId} onChange={e => setSelectedRoadmapId(e.target.value)} className="w-full h-11 bg-muted/30 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 appearance-none">
                           <option value="">Select Roadmap...</option>
                           {roadmaps.map(r => <option key={r.id} value={r.id}>{r.icon} {r.title}</option>)}
                         </select>
                      </div>
                      <div className="md:col-span-3 space-y-1.5">
                         <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Target Step</label>
                         <select value={selectedStepId} onChange={e => setSelectedStepId(e.target.value)} disabled={!selectedRoadmapId} className="w-full h-11 bg-muted/30 border-none rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 appearance-none disabled:opacity-50">
                           <option value="">Select Step...</option>
                           {stepOptions.map(s => <option key={s.id} value={s.id}>{s.icon} {s.title}</option>)}
                         </select>
                      </div>
                      <Button variant="ghost" className="h-11 w-11 p-0 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary transition-all shadow-sm flex items-center justify-center border border-primary/10" onClick={handleAttachToStep} disabled={!selectedStepId} title="Attach this module to the selected roadmap step">
                         <Save className="h-5 w-5" />
                      </Button>
                    </div>

                    {moduleAttachments.length > 0 && (
                      <div className="space-y-2 pt-4">
                        <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Currently Linked Steps</label>
                        <div className="space-y-1.5">
                           {moduleAttachments.map(a => (
                             <div key={a.id} className="flex items-center justify-between bg-background/50 border border-primary/10 p-2.5 rounded-xl group transition-all hover:border-primary/30 shadow-sm">
                                <div className="flex flex-col">
                                   <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-black text-primary/60 uppercase tracking-tighter truncate max-w-[120px]">{a.step.roadmap?.title}</span>
                                      <span className="text-muted-foreground/20 italic">/</span>
                                      <span className="text-xs font-bold text-foreground truncate">{a.step.title}</span>
                                   </div>
                                </div>
                                <div className="flex items-center gap-2">
                                   <div className="flex items-center gap-2 bg-muted/30 px-3 py-1 rounded-full border border-border/40">
                                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Optional</span>
                                      <input 
                                        type="checkbox" 
                                        checked={a.isOptional} 
                                        onChange={e => handleUpdateAttachment(a.step.roadmapId, a.stepId, e.target.checked)}
                                        className="h-3.5 w-3.5 rounded border-primary/20 accent-primary cursor-pointer"
                                      />
                                   </div>
                                   <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteAttachment(a.step.roadmapId, a.stepId)}>
                                      <Trash2 className="h-4 w-4" />
                                   </Button>
                                </div>
                             </div>
                           ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 bg-muted/10 p-5 rounded-3xl border border-border/40 h-fit">
                   <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 block mb-3">Icon Selection</label>
                   <div className="h-16 w-16 bg-background rounded-2xl flex items-center justify-center text-4xl shadow-sm border mx-auto mb-4">{form.icon}</div>
                   <div className="grid grid-cols-5 gap-1.5">{["🐳","☸️","🏗️","☁️","🐙","🐧","🔧","🔐","📊","🕸️","🐍","☕","🚂","📦","🚀"].map(e => <button key={e} onClick={() => setForm({...form, icon: e})} className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${form.icon === e ? "bg-primary text-white scale-110 shadow-md" : "bg-background border hover:border-primary/40"}`}>{e}</button>)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border border-border/50">
              <h2 className="text-sm font-black uppercase tracking-widest text-primary/80 flex items-center gap-2"><FileText className="h-4 w-4" /> Curriculum ({form.topics.length})</h2>
              <Button size="sm" onClick={() => setForm({...form, topics: [...form.topics, emptyTopic()]})} className="bg-primary font-bold"><Plus className="h-4 w-4 mr-1.5" /> Add Topic</Button>
            </div>

            {form.topics.map((topic, ti) => (
              <div key={ti} className="animate-in slide-in-from-left-2 duration-300">
                <Card className={`overflow-hidden border-border/40 transition-shadow ${topic.expanded ? "shadow-xl ring-1 ring-primary/5" : "hover:shadow-md"}`}>
                  <div className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer ${topic.expanded ? "bg-primary/5" : "hover:bg-muted/30"}`} onClick={() => { const nt = [...form.topics]; nt[ti].expanded = !nt[ti].expanded; setForm({...form, topics: nt}); }}>
                    <GripVertical className="h-4 w-4 text-muted-foreground/30" />
                    <span className="text-xs font-bold text-primary/40 font-mono w-5">{ti + 1}</span>
                    <span className="text-sm font-black flex-1 truncate uppercase tracking-tight">{topic.title || `Untitled Topic ${ti + 1}`}</span>

                    <div className="flex items-center gap-1.5 ml-auto">
                        <Button size="sm" variant="ghost" className="h-8 text-[11px] text-primary gap-1 py-0 px-3 hover:bg-primary/10 transition-all font-bold uppercase" onClick={e => { e.stopPropagation(); setOpenTopicPaste(openTopicPaste === ti ? null : ti); setTopicMarkdownInput(""); }}><FileText className="h-3.5 w-3.5" /> Import</Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-8 px-3 text-[11px] font-black uppercase transition-all flex items-center gap-2 border border-emerald-500/20 ${saving ? "text-muted-foreground bg-muted" : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"}`}
                          onClick={e => { e.stopPropagation(); handleSave(undefined, true); }}
                          disabled={saving}
                          title="Save Changes for this Topic Only"
                        >
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Instant Save
                        </Button>

                        <div className="w-px h-4 bg-border/40 mx-1" />

                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-amber-500 hover:bg-amber-50 hover:text-amber-600 transition-all" 
                          onClick={e => { e.stopPropagation(); addTopicAtIndex(ti + 1); }}
                          title="Insert Topic After"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>

                        <div className="w-px h-4 bg-border/40 mx-1" />
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={e => { e.stopPropagation(); moveTopic(ti, ti - 1); }} disabled={ti === 0}><ArrowUp className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={e => { e.stopPropagation(); moveTopic(ti, ti + 1); }} disabled={ti === form.topics.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={e => { e.stopPropagation(); if(confirm("Delete?")) setForm({...form, topics: form.topics.filter((_,j)=>j!==ti)}); }}><Trash2 className="h-4 w-4" /></Button>
                        {topic.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                  </div>

                  {topic.expanded && (
                    <CardContent className="pt-6 space-y-6 pb-8 animate-in fade-in zoom-in-95 duration-200">
                      {openTopicPaste === ti && (
                        <div className="border border-primary/20 bg-primary/5 p-4 rounded-2xl space-y-3 mb-4">
                          <textarea value={topicMarkdownInput} onChange={e => setTopicMarkdownInput(e.target.value)} className="w-full h-40 rounded-xl border bg-background p-4 text-sm font-mono focus:ring-1 focus:ring-primary" placeholder="Paste topic markdown..." />
                          <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => setOpenTopicPaste(null)}>Cancel</Button><Button size="sm" onClick={() => handleTopicMarkdownParse(ti)}>Parse Topic</Button></div>
                        </div>
                      )}
                      
                      <div className="space-y-2"><label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Topic Header</label><Input value={topic.title} onChange={e => updateTopic(ti, {title: e.target.value})} className="h-11 font-bold bg-muted/10 border-border/40" /></div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                           <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 font-mono tracking-tight">Markdown Content Editor</label>
                           <div className="flex items-center gap-1">
                              <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold text-primary gap-1.5" onClick={() => setPreviewModes(prev => ({...prev, [ti]: !prev[ti]}))}>{previewModes[ti] ? <Edit className="h-3 w-3" /> : <Eye className="h-3 w-3" />} {previewModes[ti] ? "Edit" : "Preview"}</Button>
                              <div className="w-px h-3 bg-border" />
                              <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold text-muted-foreground gap-1.5" onClick={() => { const i = document.createElement("input"); i.type="file"; i.accept="image/*"; i.onchange=(e:any) => handleContentImageUpload(ti, e.target.files[0]); i.click(); }}><ImageIcon className="h-3.5 w-3.5" /> Image</Button>
                              <div className="w-px h-3 bg-border" />
                              <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold text-muted-foreground" onClick={() => { navigator.clipboard.writeText(topic.content); toast.success("Copied!"); }}>Copy</Button>
                              <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold text-muted-foreground" onClick={async () => { const text = await navigator.clipboard.readText(); updateTopic(ti, { content: topic.content + text }); toast.success("Pasted!"); }}>Paste</Button>
                              <Button type="button" variant="ghost" size="sm" className={`h-7 text-[10px] uppercase font-bold ${wordWrap[ti] ?? true ? "text-primary" : "text-muted-foreground"}`} onClick={() => setWordWrap(p => ({...p, [ti]: !(p[ti] ?? true)}))}>Wrap</Button>
                           </div>
                        </div>
                        
                        {previewModes[ti] ? (
                          <div className="min-h-[500px] p-6 border rounded-2xl bg-muted/10 prose prose-zinc dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: parseMarkdown(topic.content || "") }} />
                        ) : (
                          <TopicTextarea id={`textarea-${ti}`} value={topic.content} onChange={v => updateTopic(ti, {content: v})} onImageUpload={f => handleContentImageUpload(ti, f)} wrapText={wordWrap[ti] ?? true} className="w-full min-h-[500px] rounded-2xl border border-border/40 bg-zinc-50/50 dark:bg-zinc-900/50 px-5 py-4 text-sm font-mono focus:ring-1 focus:ring-primary shadow-inner leading-relaxed" placeholder="Content (Markdown supported)..." />
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
