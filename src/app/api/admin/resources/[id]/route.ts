import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const resource = await prisma.resource.findUnique({ where: { id } });
    if (!resource) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    return NextResponse.json(resource);
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { linkedStepId } = body;

    // Use spread with conditional fields to prevent overwriting with undefined/null
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.url !== undefined) updateData.url = body.url;
    if (body.tags !== undefined) updateData.tags = body.tags || "General";
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl || null;
    if (body.status !== undefined) updateData.status = body.status || "PUBLISHED";

    // Update the global Resource row
    const resource = await prisma.resource.update({
      where: { id },
      data: updateData,
    });

    if (linkedStepId) {
      const existing = await prisma.roadmapResource.findFirst({
        where: { globalResourceId: id, stepId: linkedStepId }
      });
      if (!existing) {
        await prisma.roadmapResource.create({
          data: {
            stepId: linkedStepId,
            globalResourceId: id,
            title: updateData.title || resource.title,
            url: updateData.url || resource.url,
            type: updateData.type || resource.type,
            description: updateData.description !== undefined ? updateData.description : resource.description,
            imageUrl: updateData.imageUrl !== undefined ? updateData.imageUrl : resource.imageUrl,
          }
        });
      }
    }

    // Sync the edit back to the linked RoadmapResource row (if any).
    // Only update fields that were actually changed in the global row.
    const syncData: any = {};
    if (body.title !== undefined) syncData.title = body.title;
    if (body.url !== undefined) syncData.url = body.url;
    if (body.type !== undefined) syncData.type = body.type;
    if (body.description !== undefined) syncData.description = body.description || null;
    if (body.imageUrl !== undefined) syncData.imageUrl = body.imageUrl || null;

    if (Object.keys(syncData).length > 0) {
      await prisma.roadmapResource.updateMany({
        where: { globalResourceId: id },
        data: syncData,
      });
    }

    return NextResponse.json({ message: "Updated", resource });
  } catch {
    return NextResponse.json({ message: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // Soft delete — sets status to DELETED so it disappears from public view
    // and appears in the recycle bin. The RoadmapResource mirror row is left
    // intact so the module editor still shows it (admins can restore later).
    await prisma.resource.update({
      where: { id },
      data: { status: "DELETED" },
    });

    return NextResponse.json({ message: "Moved to recycle bin" });
  } catch {
    return NextResponse.json({ message: "Failed to delete" }, { status: 500 });
  }
}
