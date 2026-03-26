const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  const contentDir = path.join(__dirname, '../content');
  if (!fs.existsSync(contentDir)) {
      console.log('No content folder found. Created empty one.');
      fs.mkdirSync(contentDir);
      return;
  }

  const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'));
  if (files.length === 0) {
      console.log('No .md files found in /content folder to import.');
      return;
  }

  // Find or create a roadmap to attach it to
  const roadmap = await prisma.roadmap.upsert({
    where: { id: "devops-arch-001" },
    update: {},
    create: {
      id: "devops-arch-001",
      title: "The Ultimate DevOps Architect Roadmap",
      description: "A highly deep, illustrative guide from basic Linux nodes up to Distributed Microservices architectures.",
      icon: "🗺️",
      color: "#3B82F6",
      status: "PUBLISHED"
    }
  });

  console.log(`Using Roadmap: ${roadmap.title}`);

  for (const file of files) {
      console.log(`Processing file: ${file}`);
      const filePath = path.join(contentDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      const lines = content.split('\n');
      let currentStep = null;
      let currentTopic = null;
      const steps = [];

      let inCodeBlock = false;
      for (let line of lines) {
           const trimmed = line.trim();
           
           // Toggle code block state - trim to handle potential trailing spaces
           if (trimmed.startsWith('```')) {
               inCodeBlock = !inCodeBlock;
           }

           if (trimmed.startsWith('# ') && !inCodeBlock) {
               // A new Step! 
               currentStep = {
                   title: trimmed.replace('# ', '').trim(),
                   description: "",
                   icon: "📦",
                   topics: []
               };
               steps.push(currentStep);
               currentTopic = null; // reset topic
           } 
           else if (trimmed.startsWith('## ') && currentStep && !inCodeBlock) {
               // A new Topic under the current step
               currentTopic = {
                   title: trimmed.replace('## ', '').trim(),
                   content: "",
                   subtopics: [] // Initialize subtopics array
               };
               currentStep.topics.push(currentTopic);
           }            else if ((trimmed.startsWith('### ') || trimmed.startsWith('#### ')) && currentTopic && !inCodeBlock) {
                // A new Subtopic under the current topic
                const title = trimmed.replace(/^###+ /, '').trim();
                currentTopic.subtopics.push({
                    title,
                    content: ""
                });
            }
            else if (currentTopic && currentTopic.subtopics.length > 0) {
                // Add content to the last subtopic
                currentTopic.subtopics[currentTopic.subtopics.length - 1].content += line + "\n";
            }
            else if (currentTopic) {
                // Add content to the topic itself (before any subtopics)
                currentTopic.content += line + "\n";
            }
           else if (currentStep && !currentTopic) {
               // Add line to step description
               currentStep.description += line + '\n';
           }
      }

      console.log(`Found ${steps.length} steps in ${file}`);

      // Insert loaded steps to DB
      for (let sIdx = 0; sIdx < steps.length; sIdx++) {
           const sData = steps[sIdx];
           const step = await prisma.roadmapStep.create({
               data: {
                   roadmapId: roadmap.id,
                   title: sData.title,
                   description: sData.description.trim() || `Deep dive into ${sData.title}`,
                   icon: sData.icon,
                   order: sIdx + 1,
                   status: "PUBLISHED"
               }
           });

           for (let tIdx = 0; tIdx < sData.topics.length; tIdx++) {
               const tData = sData.topics[tIdx];
               await prisma.roadmapTopic.create({
                   data: {
                       stepId: step.id,
                       title: tData.title,
                       content: tData.content.trim(),
                       order: tIdx + 1
                   }
               });
           }
      }
      
      // Move processed file into a "processed" subfolder so it doesn't duplicate next run
      const processedDir = path.join(contentDir, 'processed');
      if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir);
      fs.renameSync(filePath, path.join(processedDir, file));
      console.log(`Successfully imported ${file} steps to database!`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
