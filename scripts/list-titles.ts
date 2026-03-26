import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const steps = await prisma.roadmapStep.findMany({ where: { status: { not: "DELETED" } }, select: { title: true } });
  console.log(steps.map(s => s.title));
}
main().finally(() => prisma.$disconnect());
