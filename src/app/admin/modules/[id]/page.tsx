"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Save, Plus, Code2, Type, FileText,
  Loader2, X, Trash2, ChevronDown, ChevronRight, Image as ImageIcon,
  Eye, Edit, Maximize2, GripVertical, ArrowUp, ArrowDown
} from "lucide-react";
import { toast } from "sonner";

import { marked } from "marked";
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
          return; // only upload one image per paste
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
  const [mode, setMode] = useState<"FORM" | "JSON" | "MARKDOWN">("FORM");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [markdownInput, setMarkdownInput] = useState("");

  const [replaceExisting, setReplaceExisting] = useState(true);
  const [parseTopicsOnly, setParseTopicsOnly] = useState(false);

  const [form, setForm] = useState<ModuleForm>({
    title: "", description: "", icon: "📦", tags: "", topics: [], resources: []
  });

  const [openTopicPaste, setOpenTopicPaste] = useState<number | null>(null);
  const [topicMarkdownInput, setTopicMarkdownInput] = useState("");
  const [topicParseMode, setTopicParseMode] = useState<Record<number, "CONTINUOUS" | "STEPWISE">>({});
  const [collapsedIntro, setCollapsedIntro] = useState<Record<number, boolean>>({});
  const [globalResources, setGlobalResources] = useState<any[]>([]);
  const [previewModes, setPreviewModes] = useState<Record<string, boolean>>({});
  const [resSearchQuery, setResSearchQuery] = useState("");
  const [activeFullscreen, setActiveFullscreen] = useState<{ id: string, title: string, value: string, onChange: (v: string) => void } | null>(null);
  const [showResSearch, setShowResSearch] = useState(false);
  const [wordWrap, setWordWrap] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetch('/api/admin/resources')
      .then(res => res.json())
      .then(data => setGlobalResources(Array.isArray(data) ? data : []))
      .catch(() => setGlobalResources([]));
  }, []);


  const handleTopicMarkdownParse = (ti: number) => {
    try {
      const mode = topicParseMode[ti] || "STEPWISE";
      const lines = topicMarkdownInput.split("\n");
      let introContent = "";

      for (const line of lines) {
        introContent += line + "\n";
      }

      const nt = [...form.topics];
      nt[ti] = {
        ...nt[ti],
        content: introContent.trim(),
        expanded: true
      };

      setForm({ ...form, topics: nt });
      setOpenTopicPaste(null);
      setTopicMarkdownInput("");
    } catch {
      alert("Failed to parse topic markdown");
    }
  };

  useEffect(() => {
    params.then(p => {
      setModuleId(p.id);
      if (p.id === "new") {
        setLoading(false);
        return;
      }
      fetch(`/api/modules/${p.id}`)
        .then(res => res.json())
        .then(data => {
          setForm({
            title: data.title,
            description: data.description || "",
            icon: data.icon || "📦",
            status: data.status || "PENDING",
            difficulty: data.difficulty || "BEGINNER",
            tags: data.tags || "",
            topics: (data.topics || []).map((t: any) => {
              return {
                title: t.title,
                content: t.content || "",
                expanded: false,
              };
            }),
            resources: (data.resources || []).map((r: any) => ({
              title: r.title, url: r.url, type: r.type || "ARTICLE", description: r.description || "", imageUrl: r.imageUrl || ""
            })),
          });
          setLoading(false);
        })
        .catch(() => { setError("Failed to load module"); setLoading(false); });
    });
  }, [params]);

  const handleImageUpload = async (ri: number, file: File | undefined) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        const nr = [...form.resources];
        nr[ri].imageUrl = data.url;
        setForm({ ...form, resources: nr });
      }
    } catch (err) {
      setError("Image upload failed");
    }
  };

  const handleContentImageUpload = async (ti: number, si: number | null, file: File | undefined) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Image upload failed");
        setError(data.message || "Image upload failed");
        return;
      }
      if (data.url) {
        // Since Subtopics were removed, we do flat topic updates only
        const textarea = document.getElementById(`textarea-intro-${ti}`) as HTMLTextAreaElement;
        const current = form.topics[ti].content || "";
        let updated = current;

        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          updated = current.substring(0, start) + `\n![Image](${data.url})\n` + current.substring(end);
        } else {
          updated = current + `\n\n![Image](${data.url})\n`;
        }

        updateTopic(ti, { content: updated });
        alert("Image uploaded and inserted into content cursor offset!");
      }
    } catch (err: any) {
        alert("Upload error: " + (err.message || err));
        setError("Image upload failed");
    }
  };

  // ── JSON parse ──────────────────────────────────────────────────────────
  const handleJsonParse = () => {
    try {
      const p = JSON.parse(jsonInput);
      setForm({
        title: p.title || form.title,
        description: p.description || form.description,
        icon: p.icon || form.icon,
        topics: (p.topics || []).map((t: any) => ({
          title: t.title || "",
          content: t.content || "",
          expanded: false,
        })),
        resources: (p.resources || []).map((r: any) => ({
          title: r.title || "", url: r.url || "", type: r.type || "ARTICLE", description: r.description || ""
        }))
      });
      setMode("FORM"); setError("");
    } catch { setError("Invalid JSON format"); }
  };

  // ── Markdown / AI Paste parse ────────────────────────────────────────────
  const handleMarkdownParse = () => {
    try {
      const lines = markdownInput.split("\n");
      let currentTopic: TopicForm | null = null;
      const topics: TopicForm[] = [];
      
      let mTitle = form.title;
      let mDesc = "";
      let foundHeader1 = false;
      let inCodeBlock = false;

      for (const line of lines) {
        const trimmed = line.trim();

        // Code block toggle (we still track this to be smart, but it doesn't matter much for flat structure)
        if (trimmed.startsWith("```")) {
          inCodeBlock = !inCodeBlock;
        }

        const isH1 = trimmed.startsWith("# ") && !trimmed.startsWith("## ") && !inCodeBlock;
        const isH2 = trimmed.startsWith("## ") && !inCodeBlock;

        if (isH1) {
          mTitle = trimmed.replace(/^# /, "").trim();
          foundHeader1 = true;
          
          if (parseTopicsOnly) {
            currentTopic = { title: mTitle, content: "", expanded: false };
            topics.push(currentTopic);
          }
        } else if (isH2) {
          currentTopic = {
            title: trimmed.replace(/^##\s*/, "").trim(),
            content: "",
            expanded: false,
          };
          topics.push(currentTopic);
        } else if (currentTopic) {
          // ANY line that is not a Topic header goes into the Topic content box!
          currentTopic.content += line + "\n";
        } else if (trimmed.length > 0 && !inCodeBlock && !foundHeader1) {
          // Intro text before any H1 or H2
          mDesc += line + "\n";
        } else if (trimmed.length > 0) {
          // Default fallback
          currentTopic = { title: "Introduction", content: line + "\n", expanded: false };
          topics.push(currentTopic);
        }
      }

      setForm({ 
        ...form, 
        ...(!parseTopicsOnly && {
          title: mTitle || form.title,
          description: mDesc.trim() || form.description,
        }),
        topics: replaceExisting ? topics : [...form.topics, ...topics] 
      });
      setMode("FORM");
      setMarkdownInput("");
      setError("");
    } catch {
      setError("Failed to parse markdown content");
    }
  };

  const [fullMarkdownOutput, setFullMarkdownOutput] = useState("");

  const exportMarkdown = () => {
    let md = `# ${form.title || "Untitled"}\n\n`;
    if (form.description) md += `${form.description}\n\n`;
    md += `---\n\n`;
    
    form.topics.forEach((topic) => {
      md += `## ${topic.title || "Untitled Topic"}\n\n`;
      if (topic.content) md += `${topic.content}\n\n`;
    });
    
    setFullMarkdownOutput(md);
    setMode("PREVIEW" as any);
  };

  const exportJson = () => {
    setJsonInput(JSON.stringify(form, null, 2));
    setMode("JSON");
  };

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = async (forceStatus?: "PENDING" | "PUBLISHED") => {
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
      toast.success("Module saved successfully!");
      router.push("/admin/modules"); router.refresh();

    } catch (err: any) { setError(err.message); setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this module?")) return;
    try {
      await fetch(`/api/modules/${moduleId}`, { method: "DELETE" });
      router.push("/admin/modules"); router.refresh();
    } catch { }
  };

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const moveTopic = (from: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= form.topics.length) return;
    const newTopics = [...form.topics];
    const [moved] = newTopics.splice(from, 1);
    newTopics.splice(toIndex, 0, moved);
    setForm({ ...form, topics: newTopics });
  };

  // ── Topic helpers ───────────────────────────────────────────────────────
  const addTopicAtIndex = (index: number) => {
    const newTopics = [...form.topics];
    newTopics.splice(index, 0, emptyTopic());
    setForm({ ...form, topics: newTopics });
  };

  const updateTopic = (i: number, data: Partial<TopicForm>) => {
    const topics = [...form.topics];
    topics[i] = { ...topics[i], ...data };
    setForm({ ...form, topics });
  };

  if (loading) return (
    <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm">Loading module...</p>
    </div>
  );

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{moduleId === "new" ? "Create Module" : "Edit Module"}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            <span className="text-xl mr-2">{form.icon}</span>
            {form.title || "Untitled Module"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/modules")} className="text-muted-foreground hover:bg-muted/50">
            Discard
          </Button>
          <Button variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleSave("PENDING")} disabled={saving || !form.title}>
            Save as Draft
          </Button>
          <Button size="sm" onClick={() => handleSave("PUBLISHED")} disabled={saving || !form.title} className="bg-primary">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Publish Live"}
          </Button>
        </div>
      </div>

      {error && <div className="p-3 bg-destructive/15 text-destructive border border-destructive/20 rounded-md text-sm">{error}</div>}

      {/* Mode toggle */}
      <div className="flex bg-muted p-1 rounded-lg w-fit gap-0.5">
        <Button variant={mode === "FORM" ? "secondary" : "ghost"} size="sm" onClick={() => setMode("FORM")}>
          <Type className="h-4 w-4 mr-2" /> Form Builder
        </Button>
        <Button variant={mode === "JSON" ? "secondary" : "ghost"} size="sm" onClick={exportJson}>
          <Code2 className="h-4 w-4 mr-2" /> JSON Mode
        </Button>
        <Button variant={mode === "MARKDOWN" ? "secondary" : "ghost"} size="sm" onClick={() => setMode("MARKDOWN")}>
          <FileText className="h-4 w-4 mr-2" /> AI/Markdown Paste
        </Button>
        <Button variant={mode === ("PREVIEW" as any) ? "secondary" : "ghost"} size="sm" onClick={exportMarkdown}>
          <Eye className="h-4 w-4 mr-2" /> Full Preview & Export
        </Button>
      </div>

      {mode === ("PREVIEW" as any) && (
        <Card className="border-primary/20 bg-primary/5 mb-6">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Full Continuous Markdown Export
            </CardTitle>
            <Button size="sm" variant="outline" className="gap-1.5 h-8 border-primary/20 hover:bg-primary/10" onClick={() => {
              navigator.clipboard.writeText(fullMarkdownOutput);
              toast.success("Markdown copied to clipboard!");
            }}>
              📋 Copy Markdown
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border">
              💡 Below is your entire Module stitched back together. You can copy it directly or use it as backup.
            </p>
            <textarea
              value={fullMarkdownOutput}
              onChange={(e) => setFullMarkdownOutput(e.target.value)}
              className="w-full h-[500px] rounded-md border border-input bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono leading-relaxed"
            />
          </CardContent>
        </Card>
      )}

      {/* JSON Mode */}
Stream backwards downwards flawlessly downwards flawlessly downstairs downwards onwards onwards flawlessly downstream.
      {mode === "JSON" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-xs text-muted-foreground">Paste or edit the complete module JSON. Click "Apply" to load into the form.</p>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full h-96 rounded-md border border-input bg-background px-3 py-2 text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button onClick={handleJsonParse}>Apply JSON to Form</Button>
          </CardContent>
        </Card>
      )}

      {/* Markdown / AI Paste Mode */}
      {mode === "MARKDOWN" && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              AI / Markdown Paste Importer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-1 bg-muted/50 rounded-lg p-3 border">
              <p className="font-medium text-foreground mb-2">📋 Paste format:</p>
              <p><span className="font-mono text-xs bg-muted px-1 rounded">## Topic Title</span> → creates a Topic</p>
              <p><span className="font-mono text-xs bg-muted px-1 rounded">### Subtopic Title</span> → creates a Subtopic inside the topic above</p>
              <p>Everything below a heading becomes its content (markdown, tables, code blocks, images all work)</p>
              <p className="text-xs mt-2 text-muted-foreground/70">💡 Images: use <span className="font-mono">![alt](https://url.to/image.jpg)</span> inline in content</p>
            </div>
            <textarea
              value={markdownInput}
              onChange={(e) => setMarkdownInput(e.target.value)}
              className="w-full h-[400px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
              placeholder={`## What is Docker?\nDocker is a containerization platform...\n\n### The Shipping Analogy\n![Container](https://images.unsplash.com/photo-xxx)\nBefore containers, shipping software was chaos...\n\n### Containers vs VMs\n| Feature | Containers | VMs |\n| :--- | :--- | :--- |\n| Size | 5-500MB | 3-20GB |\n\n## Core Docker Commands\nAll essential commands you need...\n\n### docker run\nRuns a container from an image...`}
            />
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer border px-3 py-1.5 rounded-lg bg-background hover:bg-muted/50 transition-colors">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-1 focus:ring-ring h-4 w-4"
                />
                <span className="text-sm font-medium">Replace existing topics</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer border px-3 py-1.5 rounded-lg bg-background hover:bg-muted/50 transition-colors">
                <input
                  type="checkbox"
                  checked={parseTopicsOnly}
                  onChange={(e) => setParseTopicsOnly(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-1 focus:ring-ring h-4 w-4"
                />
                <span className="text-sm font-medium">Ignore Title/Description (Topics Only)</span>
              </label>

              <Button onClick={handleMarkdownParse} className="gap-2">
                <FileText className="h-4 w-4" />
                {replaceExisting ? "Parse & Replace All" : "Parse & Append"}
              </Button>
              <p className="text-xs text-muted-foreground">
                {replaceExisting
                  ? "Existing topics will be wiped and replaced with these."
                  : "Topics will be added to the bottom."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Mode */}
      {mode === "FORM" && (
        <div className="space-y-6">
          {/* Basic Details */}
          <Card>
            <CardHeader className="pb-4"><CardTitle className="text-base">Module Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-[1fr_80px] gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Docker & Containers" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Icon</label>
                  <Input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="📦" className="text-center text-lg" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Difficulty</label>
                  <select 
                    value={(form as any).difficulty || "BEGINNER"} 
                    onChange={e => setForm({ ...form, difficulty: e.target.value } as any)} 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="BEGINNER">🟢 Beginner</option>
                    <option value="INTERMEDIATE">🟡 Intermediate</option>
                    <option value="ADVANCED">🔴 Advanced</option>
                  </select>
                </div>

              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="What will learners gain from this module?"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tags</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(form.tags || "").split(",").filter(Boolean).map((t, i) => (
                    <span key={i} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-bold border border-primary/20">
                      #{t.trim()}
                      <button type="button" onClick={() => {
                        const tagsList = form.tags?.split(",").filter(Boolean).map(x => x.trim()) || [];
                        tagsList.splice(i, 1);
                        setForm({ ...form, tags: tagsList.join(", ") });
                      }}>
                        <X className="h-3 w-3 hover:text-destructive cursor-pointer" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    id="new-tag"
                    placeholder="Type tag and press enter"
                    className="h-9 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = e.currentTarget.value.trim();
                        if (val) {
                          const tagsList = form.tags?.split(",").filter(Boolean).map(x => x.trim()) || [];
                          if (!tagsList.includes(val)) {
                            tagsList.push(val);
                            setForm({ ...form, tags: tagsList.join(", ") });
                          }
                          e.currentTarget.value = "";
                        }
                      }
                    }}
                  />
                  <Button type="button" size="sm" className="h-9" onClick={() => {
                    const input = document.getElementById("new-tag") as HTMLInputElement;
                    const val = input?.value.trim();
                    if (val) {
                      const tagsList = form.tags?.split(",").filter(Boolean).map(x => x.trim()) || [];
                      if (!tagsList.includes(val)) {
                        tagsList.push(val);
                        setForm({ ...form, tags: tagsList.join(", ") });
                      }
                      if (input) input.value = "";
                    }
                  }}>Add</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Topics */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">📄 Topics ({form.topics.length})</h2>
              <Button size="sm" variant="outline" onClick={() => setForm({ ...form, topics: [...form.topics, emptyTopic()] })}>
                <Plus className="h-3 w-3 mr-1" /> Add Topic
              </Button>
            </div>

            {form.topics.length === 0 && (
              <div className="border border-dashed rounded-xl p-10 text-center bg-muted/10 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No topics yet. Add manually or use the <strong>AI/Markdown Paste</strong> tab to import from ChatGPT.</p>
              </div>
            )}

            {form.topics.map((topic, ti) => (
              <div key={ti}>
                {/* Plus Divider (above each topic) */}
                <div className="group relative h-4 flex items-center justify-center -my-2 opacity-0 hover:opacity-100 transition-opacity z-10 transition-all duration-300">
                  <div className="absolute inset-x-0 h-px bg-primary/20 scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 rounded-full p-0 bg-background border border-primary/20 text-primary shadow-sm hover:scale-110 active:scale-95 transition-all"
                    onClick={() => addTopicAtIndex(ti)}
                    title="Insert Topic Here"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                <Card 
                  className={`overflow-hidden transition-all duration-300 border-border/40 ${topic.expanded ? "shadow-md ring-1 ring-primary/5" : "hover:shadow-sm"} ${draggedIdx === ti ? "opacity-30 border-dashed border-primary" : ""}`}
                  draggable="true"
                  onDragStart={() => setDraggedIdx(ti)}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("ring-2", "ring-primary/20"); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove("ring-2", "ring-primary/20"); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("ring-2", "ring-primary/20");
                    if (draggedIdx !== null && draggedIdx !== ti) {
                      moveTopic(draggedIdx, ti);
                    }
                    setDraggedIdx(null);
                  }}
                  onDragEnd={() => setDraggedIdx(null)}
                >
                  <div
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors ${topic.expanded ? "bg-primary/5" : "hover:bg-muted/30"}`}
                    onClick={() => {
                      const nt = [...form.topics];
                      nt[ti].expanded = !nt[ti].expanded;
                      setForm({ ...form, topics: nt });
                    }}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground/30 cursor-grab active:cursor-grabbing hover:text-primary transition-colors shrink-0" />
                    
                    <span className="text-xs font-mono font-bold text-muted-foreground/60 shrink-0">{String(ti + 1).padStart(2, "0")}</span>
                    <span className="text-sm font-semibold flex-1 truncate">{topic.title || `Topic ${ti + 1}`}</span>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); moveTopic(ti, ti-1); }} disabled={ti===0} title="Move Up"><ArrowUp className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); moveTopic(ti, ti+1); }} disabled={ti===form.topics.length-1} title="Move Down"><ArrowDown className="h-3 w-3" /></Button>
                    </div>

                    <div className="w-px h-4 bg-border/40 mx-1" />

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px] text-primary gap-1 py-0 px-2 hover:bg-primary/10 transition-all font-bold"
                      onClick={(e) => { e.stopPropagation(); setOpenTopicPaste(openTopicPaste === ti ? null : ti); setTopicMarkdownInput(""); }}
                    >
                      <FileText className="h-3.5 w-3.5" /> Import
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600 shadow-none border-none ring-0 focus-visible:ring-0"
                      onClick={(e) => { e.stopPropagation(); addTopicAtIndex(ti + 1); }}
                      title="Insert Topic After"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>

                    <button
                      onClick={(e) => { e.stopPropagation(); setForm({ ...form, topics: form.topics.filter((_, j) => j !== ti) }); }}
                      className="p-1 hover:bg-destructive/10 rounded ml-1 group/del transition-all"
                      title="Delete Topic"
                    >
                      <X className="h-4 w-4 text-muted-foreground group-hover/del:text-destructive" />
                    </button>
                    {topic.expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  </div>

                {topic.expanded && (
                  <CardContent className="pt-4 space-y-5">
                    {/* Topic Paste Area */}
                    {openTopicPaste === ti && (
                      <div className="border border-primary/20 bg-primary/5 rounded-lg p-3 space-y-2 mb-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-primary flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> AI / Markdown Paste for this Topic</label>
                          <div className="flex bg-muted p-0.5 rounded-md w-fit gap-1 text-[10px] font-bold border">
                            <button
                              onClick={(e) => { e.stopPropagation(); setTopicParseMode({ ...topicParseMode, [ti]: "STEPWISE" }); }}
                              className={`px-2 py-1 rounded-sm ${(!topicParseMode[ti] || topicParseMode[ti] === "STEPWISE") ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                            >
                              Stepwise
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setTopicParseMode({ ...topicParseMode, [ti]: "CONTINUOUS" }); }}
                              className={`px-2 py-1 rounded-sm ${(topicParseMode[ti] === "CONTINUOUS") ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                            >
                              Continuous
                            </button>
                          </div>
                        </div>
                        <textarea
                          value={topicMarkdownInput}
                          onChange={(e) => setTopicMarkdownInput(e.target.value)}
                          className="w-full h-32 rounded-md border text-xs p-2 font-mono"
                          placeholder={(!topicParseMode[ti] || topicParseMode[ti] === "STEPWISE") ? "Extracts ### into separate cards" : "Keeps ### as continuous texts stacked offset."}
                        />
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpenTopicPaste(null)}>Cancel</Button>
                          <Button size="sm" className="h-7 text-xs" onClick={() => handleTopicMarkdownParse(ti)}>Parse & Overwrite</Button>
                        </div>
                      </div>
                    )}
                    {/* Topic title */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Topic Title</label>
                      <Input
                        value={topic.title}
                        onChange={e => updateTopic(ti, { title: e.target.value })}
                        placeholder="Topic title"
                      />
                    </div>

                    {/* Topic content (intro text before subtopics) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div
                          className="flex items-center gap-1 cursor-pointer hover:bg-muted/30 p-1 rounded-md transition-colors"
                          onClick={() => setCollapsedIntro({ ...collapsedIntro, [ti]: !collapsedIntro[ti] })}
                        >
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer flex items-center gap-1">
                            {collapsedIntro[ti] ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            Intro Content (optional)
                          </label>
                        </div>
                        {topic.content && topic.content !== "<p></p>" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[10px] h-5 px-1.5 text-destructive hover:bg-destructive/10 gap-1"
                            onClick={() => { if (confirm("Clear intro content?")) updateTopic(ti, { content: "" }); }}
                          >
                            <Trash2 className="h-3 w-3" /> Clear
                          </Button>
                        )}
                      </div>
                      {!collapsedIntro[ti] && (
                        <div className="space-y-1">
                          <div className="flex justify-end gap-1">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-[10px] gap-1 px-1.5 text-muted-foreground hover:text-foreground"
                              onClick={() => setPreviewModes(prev => ({ ...prev, [`intro-${ti}`]: !prev[`intro-${ti}`] }))}
                            >
                              {previewModes[`intro-${ti}`] ? <Edit className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              {previewModes[`intro-${ti}`] ? "Edit" : "Preview"}
                            </Button>

                            {!previewModes[`intro-${ti}`] && (
                              <>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  id={`upload-intro-${ti}`} 
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleContentImageUpload(ti, null, file);
                                  }} 
                                />
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 text-[10px] gap-1 px-1.5 text-muted-foreground hover:text-foreground"
                                  onClick={() => document.getElementById(`upload-intro-${ti}`)?.click()}
                                >
                                  <ImageIcon className="h-3 w-3" /> Upload Image
                                </Button>

                                <div className="w-px h-3.5 bg-border mx-0.5" />
                                
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 text-[10px] items-center gap-1.5 px-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                                  onClick={() => {
                                    const textarea = document.getElementById(`textarea-intro-${ti}`) as HTMLTextAreaElement;
                                    if (!textarea) return;
                                    textarea.select();
                                    document.execCommand('copy');
                                  }}
                                  title="Select All & Copy"
                                >
                                  Select All
                                </Button>

                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 text-[10px] items-center gap-1.5 px-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                                  onClick={() => {
                                    const textarea = document.getElementById(`textarea-intro-${ti}`) as HTMLTextAreaElement;
                                    if (textarea) { textarea.focus(); document.execCommand('cut'); }
                                  }}
                                >
                                  Cut
                                </Button>

                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 text-[10px] items-center gap-1.5 px-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                                  onClick={() => {
                                    const textarea = document.getElementById(`textarea-intro-${ti}`) as HTMLTextAreaElement;
                                    if (textarea) { textarea.focus(); document.execCommand('copy'); }
                                  }}
                                >
                                  Copy
                                </Button>

                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  className={`h-6 text-[10px] font-semibold items-center gap-1 px-1.5 transition-all ${(wordWrap[ti] ?? true) ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted/50"}`}
                                  onClick={() => setWordWrap(prev => ({ ...prev, [ti]: !(prev[ti] ?? true) }))}
                                  title="Toggle Word Wrap"
                                >
                                  Wrap
                                </Button>
                              </>
                            )}
                          </div>

                          {previewModes[`intro-${ti}`] ? (
                            <div 
                              className="p-3 border rounded-md bg-muted/20 prose prose-sm dark:prose-invert max-w-none prose-table:border prose-th:bg-muted prose-pre:bg-black/40 prose-code:bg-black/20 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none" 
                              dangerouslySetInnerHTML={{ __html: parseMarkdown(topic.content || "") }} 
                            />
                          ) : (
                            <TopicTextarea
                              id={`textarea-intro-${ti}`}
                              value={topic.content || ""}
                              onChange={(v) => updateTopic(ti, { content: v })}
                              onImageUpload={(file) => handleContentImageUpload(ti, null, file)}
                              wrapText={wordWrap[ti] ?? true}
                              className="w-full h-32 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
                              placeholder="Intro content (Markdown supported)..."
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
                </Card>
              </div>
            ))}
          </div>

          {/* Resources */}
          <Card>
            <CardHeader className="pb-4 flex flex-row items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-base">📚 Resources ({form.resources.length})</CardTitle>
              <div className="flex items-center gap-2">
                  <div className="relative">
                    {!showResSearch ? (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setShowResSearch(true)} 
                        className="h-8 text-xs text-muted-foreground border border-dashed border-muted-foreground/30 hover:border-primary/50 transition-all duration-200"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Attach Existing
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1.5 animate-in fade-in-50 duration-150">
                        <Input 
                          value={resSearchQuery}
                          onChange={(e) => setResSearchQuery(e.target.value)}
                          placeholder="Search title..."
                          className="h-8 text-xs w-48 shadow-sm focus-visible:ring-1"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Escape') { setShowResSearch(false); setResSearchQuery(""); } }}
                        />
                        <Button size="sm" variant="ghost" onClick={() => { setShowResSearch(false); setResSearchQuery(""); }} className="h-7 w-7 p-0 rounded-full hover:bg-muted"><X className="h-3 w-3" /></Button>
                      </div>
                    )}

                    {showResSearch && resSearchQuery.trim().length > 0 && (
                      <Card className="absolute top-9 right-0 bg-background/95 backdrop-blur-md border border-border shadow-xl z-50 w-72 max-h-56 overflow-y-auto p-1.5 text-xs animate-in slide-in-from-top-2 duration-150 rounded-lg">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold p-1">Search Results</div>
                        <div className="space-y-0.5 mt-1">
                          {globalResources
                            .filter(g => !form.resources.some(fr => fr.url === g.url))
                            .filter(g => g.title.toLowerCase().includes(resSearchQuery.toLowerCase()))
                            .slice(0, 10) 
                            .map(g => (
                              <div 
                                key={g.id} 
                                className="p-2 hover:bg-primary/10 hover:text-primary cursor-pointer rounded-md transition-colors flex flex-col gap-0.5 border border-transparent hover:border-primary/20"
                                onClick={() => {
                                  setForm({ ...form, resources: [...form.resources, { title: g.title, url: g.url, type: g.type, description: g.description || "", imageUrl: g.imageUrl || "" }] });
                                  setResSearchQuery("");
                                  setShowResSearch(false);
                                  toast.success("Resource attached!");
                                }}
                              >
                                <span className="font-medium text-foreground">{g.title}</span>
                                <span className="text-[9px] text-muted-foreground truncate">{g.url}</span>
                              </div>
                            ))}
                          {globalResources
                            .filter(g => !form.resources.some(fr => fr.url === g.url))
                            .filter(g => g.title.toLowerCase().includes(resSearchQuery.toLowerCase())).length === 0 && (
                            <div className="text-center py-3 text-muted-foreground">No matches found</div>
                          )}
                        </div>
                      </Card>
                    )}
                  </div>
                <Button size="sm" variant="outline" onClick={() => setForm({ ...form, resources: [...form.resources, emptyResource()] })} className="h-8 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Add New
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {form.resources.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4 bg-muted/20 border border-dashed rounded-lg">No resources items yet.</p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {form.resources.map((r, ri) => {
                  const youtubeId = r.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
                  const finalImageUrl = r.imageUrl || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg` : null);

                  return (
                    <Card key={ri} className="overflow-hidden group relative border-muted/60 hover:border-primary/30 transition-all duration-200 shadow-sm">
                      <CardContent className="p-0">
                        <div className="aspect-video relative bg-muted flex items-center justify-center overflow-hidden border-b">
                          {finalImageUrl ? (
                            <img src={finalImageUrl} alt={r.title} className="object-cover w-full h-full group-hover:scale-105 transition-all duration-300" />
                          ) : (
                            <div className="text-muted-foreground/40 flex flex-col items-center gap-1.5">
                              <ImageIcon className="h-10 w-10 stroke-[1.2]" />
                              <span className="text-xs">No preview image</span>
                            </div>
                          )}
                          {/* Overlay to upload file */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all duration-200 flex-col px-4 text-center">
                            <label className="text-xs bg-white text-black font-semibold rounded-md px-2.5 py-1.5 cursor-pointer shadow-sm hover:bg-white/90 transition-colors">
                              Upload Cover
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(ri, e.target.files?.[0])} />
                            </label>
                          </div>

                          <button
                            onClick={() => setForm({ ...form, resources: form.resources.filter((_, j) => j !== ri) })}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-white text-destructive hover:bg-destructive hover:text-white transition-all duration-150 shadow-sm border border-border"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="p-3 space-y-2.5">
                          <Input
                            value={r.title}
                            onChange={e => { const nr = [...form.resources]; nr[ri].title = e.target.value; setForm({ ...form, resources: nr }); }}
                            placeholder="Resource title"
                            className="h-8 font-medium text-sm"
                          />
                          <Input
                            value={r.url}
                            onChange={e => { const nr = [...form.resources]; nr[ri].url = e.target.value; setForm({ ...form, resources: nr }); }}
                            placeholder="URL (https://...)"
                            className="h-7 text-xs font-mono"
                          />
                          <div className="grid grid-cols-[100px_1fr] gap-2">
                            <select
                              value={r.type}
                              onChange={e => { const nr = [...form.resources]; nr[ri].type = e.target.value; setForm({ ...form, resources: nr }); }}
                              className="h-7 rounded-md border border-input bg-background px-1 text-xs focus:ring-1 focus:ring-ring"
                            >
                              <option value="ARTICLE">Article</option>
                              <option value="VIDEO">Video</option>
                              <option value="PLAYLIST">Playlist</option>

                              <option value="TOOL">Tool</option>
                              <option value="NOTES">Notes</option>
                            </select>
                            <Input
                              value={r.description || ""}
                              onChange={e => { const nr = [...form.resources]; nr[ri].description = e.target.value; setForm({ ...form, resources: nr }); }}
                              placeholder="Short description"
                              className="h-7 text-xs"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
