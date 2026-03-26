import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

/**
 * USAGE:
 * npx tsx scripts/sync-module.ts --file content/networking.md --title "Networking Module"
 * 
 * This script reads a markdown file and updates an existing RoadmapStep (Module) in the database.
 * It detects Topics (##) and Subtopics (### or ####).
 * It is robust against code blocks (```).
 */

async function main() {
  const args = process.argv.slice(2);
  const getArg = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : null;
  };

  const filePath = getArg("--file");
  let moduleTitle = getArg("--title");

  if (!filePath) {
    console.error("❌ Please provide a file path: --file <path>");
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const rawContent = fs.readFileSync(filePath, "utf-8");
  const lines = rawContent.split("\n");

  // If title not provided, try to find the first H1
  if (!moduleTitle) {
    for (const line of lines) {
      if (line.trim().startsWith("# ")) {
        moduleTitle = line.trim().replace("# ", "").trim();
        break;
      }
    }
  }

  if (!moduleTitle) {
    console.error("❌ Could not determine module title. Provide --title \"Name\"");
    process.exit(1);
  }

  // Find the step in DB
  const step = await prisma.roadmapStep.findFirst({
    where: { 
      title: { contains: moduleTitle, mode: 'insensitive' },
      status: { not: "DELETED" }
    },
  });

  if (!step) {
    console.error(`❌ Module "${moduleTitle}" not found in database.`);
    process.exit(1);
  }

  console.log(`📡 Syncing "${step.title}" (ID: ${step.id}) from ${path.basename(filePath)}...`);

  // Parse Topics and Subtopics
  const topics: any[] = [];
  let currentTopic: any = null;
  let currentSubtopic: any = null;
  let inCodeBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Toggle code block state
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
    }

    const isH2 = trimmed.startsWith("## ") && !inCodeBlock;
    const isSub = (trimmed.startsWith("### ") || trimmed.startsWith("#### ")) && !inCodeBlock;

    if (isH2) {
      currentTopic = {
        title: trimmed.replace(/^##\s*/, "").trim(),
        content: "",
        subtopics: [],
      };
      topics.push(currentTopic);
      currentSubtopic = null;
    } else if (isSub) {
      if (!currentTopic) {
        currentTopic = { title: "Introduction", content: "", subtopics: [] };
        topics.push(currentTopic);
      }
      currentSubtopic = {
        title: trimmed.replace(/^###+\s*/, "").trim(),
        content: "",
      };
      currentTopic.subtopics.push(currentSubtopic);
    } else if (currentSubtopic) {
      currentSubtopic.content += line + "\n";
    } else if (currentTopic) {
      currentTopic.content += line + "\n";
    }
  }

  console.log(`✅ Parsed ${topics.length} topics and ${topics.reduce((a, t) => a + t.subtopics.length, 0)} subtopics.`);

  // Perform atomic update
  await prisma.$transaction(async (tx) => {
    // 1. Wipe existing topics/subtopics for this step
    await tx.roadmapTopic.deleteMany({ where: { stepId: step.id } });

    // 2. Create new structure
    for (let i = 0; i < topics.length; i++) {
      const t = topics[i];
      await tx.roadmapTopic.create({
        data: {
          stepId: step.id,
          title: t.title,
          content: t.content.trim() || null,
          order: i,
          subtopics: {
            create: t.subtopics.map((s: any, si: number) => ({
              title: s.title,
              content: s.content.trim(),
              order: si,
            })),
          },
        },
      });
    }
  }, { timeout: 60000 });

  console.log("🎉 Module synced successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error syncing module:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
