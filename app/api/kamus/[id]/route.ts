import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const item = await prisma.kamusItem.findUnique({
      where: { id },
      include: {
        standarJabatanItems: { include: { standarJabatan: true } },
        scenarioItems: { include: { scenario: true } },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Kamus item not found" },
        { status: 404 }
      );
    }

    if (
      item.standarJabatanItems.length > 0 ||
      item.scenarioItems.length > 0
    ) {
      const usedInStandar = item.standarJabatanItems.map(
        (s) => s.standarJabatan.name
      );
      const usedInScenario = item.scenarioItems.map((s) => s.scenario.name);
      return NextResponse.json(
        {
          error: `Cannot delete kamus '${item.name}': it is used in Standar Jabatan or Scenario`,
          usedInStandar,
          usedInScenario,
        },
        { status: 409 }
      );
    }

    await prisma.kamusItem.delete({ where: { id } });
    return NextResponse.json({ message: "Kamus item deleted" });
  } catch (error) {
    console.error("[API] DELETE /api/kamus/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to delete kamus item" },
      { status: 500 }
    );
  }
}
