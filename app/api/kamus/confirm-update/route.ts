import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseKamusCsv } from "@/lib/kamus/csv";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const content: string = body?.content ?? "";

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "File content is required" },
        { status: 400 }
      );
    }

    const parsed = parseKamusCsv(content);
    if (parsed.errors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", rowErrors: parsed.errors },
        { status: 400 }
      );
    }

    const existing = await prisma.kamusItem.findMany({
      include: { standarJabatanItems: true, scenarioItems: true },
    });
    const existingByCode = new Map(existing.map((e) => [e.code, e]));
    const incomingCodes = new Set(parsed.rows.map((r) => r.code));

    const toRemove = existing.filter((e) => !incomingCodes.has(e.code));
    const blockedRemovals = toRemove.filter(
      (e) => e.standarJabatanItems.length > 0 || e.scenarioItems.length > 0
    );

    if (blockedRemovals.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot remove kamus items that are in use",
          blocked: blockedRemovals.map((b) => ({
            code: b.code,
            name: b.name,
            usedInStandar: b.standarJabatanItems.length,
            usedInScenario: b.scenarioItems.length,
          })),
        },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const r of parsed.rows) {
        const existingItem = existingByCode.get(r.code);
        if (existingItem) {
          await tx.kamusItem.update({
            where: { id: existingItem.id },
            data: {
              name: r.name,
              type: r.type,
              description: r.description,
              behavioralIndicators: r.behavioralIndicators,
            },
          });
        } else {
          await tx.kamusItem.create({
            data: {
              code: r.code,
              name: r.name,
              type: r.type,
              description: r.description,
              behavioralIndicators: r.behavioralIndicators,
            },
          });
        }
      }

      for (const e of toRemove) {
        await tx.kamusItem.delete({ where: { id: e.id } });
      }

      await tx.kamusEvent.create({
        data: {
          eventType: "Kamus Updated",
          payload: JSON.stringify({
            removed: toRemove.map((t) => t.code),
            total: parsed.rows.length,
          }),
        },
      });
    });

    return NextResponse.json({
      message: "Kamus updated successfully",
      event: "Kamus Updated",
    });
  } catch (error) {
    console.error("[API] POST /api/kamus/confirm-update failed:", error);
    return NextResponse.json(
      { error: "Failed to update kamus" },
      { status: 500 }
    );
  }
}
