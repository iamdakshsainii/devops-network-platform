import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

/**
 * USAGE:
 * npx tsx scripts/sync-all.ts
 * 
 * This script iterates through all .md files in the content/ folder and
 * synchronizes them with the RoadmapStep (Module) in the database.
 * 
 * It will:
 * - Match the file to a module title (from filename or first # heading)
 * - Wipe and replace all Topics (##) and Subtopics (### or ####)
 * - Isolate topics correctly with code block awareness (```)
 */

async function main() {
  const contentDir = path.join(process.cwd(), "content");
  const files = fs.readdirSync(contentDir).filter(f => f.endsWith(".md") && f !== "HOW_TO_ADD_CONTENT.md" && f !== "MODULE_SYNTAX_GUIDE.md");

  console.log(`🚀 Found ${files.length} modules to sync in ${contentDir}...`);

  for (const file of files) {
    const filePath = path.join(contentDir, file);
    const rawContent = fs.readFileSync(filePath, "utf-8");
    const lines = rawContent.split("\n");

    // 1. Determine Title and clean it
    let fileTitle = "";
    for (const line of lines) {
      if (line.trim().startsWith("# ")) {
        fileTitle = line.trim().replace(/^#\s*/, "").replace(/[\u{1F300}-\u{1F9FF}]/gu, "").trim(); // Remove emojis
        break;
      }
    }

    if (!fileTitle) {
      fileTitle = file.replace(".md", "").replace(/-/g, " ").trim();
    }

    // 2. Find/Upsert Step
    // Better match: contains (case insensitive)
    let step = await prisma.roadmapStep.findFirst({
      where: { 
        title: { contains: fileTitle.split('---')[0].trim(), mode: 'insensitive' },
        status: { not: "DELETED" }
      },
    });

    if (!step) {
      // Try by filename fallback
      const fileNameRaw = file.replace(".md", "").replace(/-/g, " ");
      step = await prisma.roadmapStep.findFirst({
        where: { 
          title: { contains: fileNameRaw, mode: 'insensitive' },
          status: { not: "DELETED" }
        },
      });
    }

    if (!step) {
      console.log(`⚠️  Module matcher failed for ${file} ("${fileTitle}"). Skipping.`);
      continue;
    }

    console.log(`📡 Syncing "${step.title}" (ID: ${step.id}) from ${file}...`);

    // 3. Parse Topics - FLAT STRUCTURE (No Subtopics)
    const topics: any[] = [];
    let currentTopic: any = null;
    let inCodeBlock = false;
    let foundHeader1 = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Code block toggle (we still track this to be smart, but it doesn't matter much for flat structure)
      if (trimmed.startsWith("```")) {
        inCodeBlock = !inCodeBlock;
      }

      const isH1 = trimmed.startsWith("# ") && !trimmed.startsWith("## ") && !inCodeBlock;
      const isH2 = trimmed.startsWith("## ") && !inCodeBlock;

      if (isH1 && !foundHeader1) {
        foundHeader1 = true; // Use it as title found
      } else if (isH2) {
        currentTopic = { title: trimmed.replace(/^##\s*/, "").trim(), content: "" };
        topics.push(currentTopic);
      } else if (currentTopic) {
        currentTopic.content += line + "\n";
      } else if (trimmed.length > 0 && !inCodeBlock) {
        // Fallback for content before headers
        currentTopic = { title: "Introduction", content: line + "\n" };
        topics.push(currentTopic);
      }
    }

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Wipe existing topics/subtopics for this step (Wipes ALL nested data)
        await tx.roadmapTopic.deleteMany({ where: { stepId: step.id } });

        // 2. Create new structure individually (safer for massive modules)
        for (let i = 0; i < topics.length; i++) {
          const t = topics[i];
          await tx.roadmapTopic.create({
            data: {
              stepId: step.id,
              title: t.title,
              content: t.content.trim() || null,
              order: i,
            },
          });
        }
      }, { timeout: 120000 });
      console.log(`✅ Success (FLAT): ${topics.length} topics updated for "${step.title}"`);
    } catch (e: any) {
      console.error(`❌ Transaction failed for "${step.title}":`, e.message);
    }
  }

  console.log("\n✨ All modules synchronized in FLAT structure correctly!");
}

main()
  .catch((e) => {
    console.error("❌ Fatal sync error:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
