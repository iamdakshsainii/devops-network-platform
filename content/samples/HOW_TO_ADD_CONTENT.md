# 📚 DevOps Network: Master Content Guideline (Flat Structure)

This guide explains exactly how our content system is structured. To ensure a premium, professional experience, we use a **Flat Topic Structure**. Everything is organized around high-level sidebar steps.

---

## 🏗️ The System Architecture

Our platform follows a clean **2-level flat hierarchy** to keep the sidebar focused and the content deep:

| Level | Syntax | Purpose |
| :--- | :--- | :--- |
| **1. Module** | `# Title` | The main course/chapter (e.g., "Docker Mastering"). |
| **2. Topic** | `## Title` | **Sidebar Step.** These are the ONLY primary items listed. |
| **3. Content** | `### Title` | **Sidebar Subtopic.** These appear as sub-links under each topic. |
| **4. Internal** | `####` or `#####` | **Formatting Only.** These do NOT appear in the sidebar. Use for Problem/Solution. |

---

## 🎯 User Experience Requirements

To maintain a **State-of-the-Art** educational experience, follow these rules:

### 1. **Sidebar is for Major Milestones**
Use `##` ONLY for the major steps in the journey. The sidebar should feel like a clear roadmap. If you have 10-12 topics, you provide a very comprehensive guide without cluttering the screen.

### 2. **One Box, Detailed Notes**
Everything you write after a `## Topic Title` goes into **one single content area**. Use `###` and `####` to break up that text into readable sections (Problem, Solution, Implementation, etc.).

### 3. **Problem & Solution Approach**
Always explain the **"Why"** before the **"How"**. 
- Identify a common production problem.
- Explain the solution using the DevOps tool/concept.
- Provide simple, easy-to-follow technical notes.

### 4. **Rich Media & Clean Layout**
- Use **Code Blocks** (with language tags like `bash` or `yaml`) for all commands.
- Use **Tables** for comparing tools or versions.
- Use **ASCII Diagrams** or clear bullet-flow charts for architecture.

---

## 🤖 AI Prompt (Optimized for Flat Structure)

If you are using ChatGPT or Claude, **copy and paste this prompt EXACTLY**:

```text
"Act as a Senior DevOps Curriculum Designer. I need a comprehensive learning guide for [TOPIC NAME]. 

Please follow this exact structural blueprint:

1. Use # [Title] for the very top of the guide.
2. Use ## [Chapter Name] for the main sidebar steps. (Generate exactly 10-12 of these).
3. Under each ## Chapter, write detailed content in standard Markdown. Use ### [Section Title] and #### [Sub-Detail] for internal organization.
4. Use a 'Problem and Solution' approach: Explain a real-world scenario, the challenge it creates, and how to solve it.
5. Provide professional text, code blocks (bash/js/yaml), and comparisons using tables.
6. Use ASCII diagrams for architectural flows.

IMPORTANT: Everything between two ## headlines should be a continuous, high-quality article for that step."
```

---

## 💡 Quick Syntax Ref:

```markdown
# Docker Mastering

## 1. Intro to Networking      <-- SHOWN IN SIDEBAR
Networking in Docker allows...

### The Problem                <-- NOT in sidebar (just text)
Container A can't talk to B...

### The Solution               <-- NOT in sidebar (just text)
We use Docker Bridges...

```bash
docker network create my-net
```

## 2. Docker Volumes           <-- NEXT SIDEBAR STEP
Data persistence is...
```

By following this guide, you ensure the platform remains professional, clean, and extremely detailed! 🚀🔥