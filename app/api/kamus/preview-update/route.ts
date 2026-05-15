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

    const existing = await prisma.kamusItem.findMany();
    const existingByCode = new Map(existing.map((e) => [e.code, e]));
    const incomingCodes = new Set(parsed.rows.map((r) => r.code));

    const added: typeof parsed.rows = [];
    const changed: Array<{
      code: string;
      before: { name: string; type: string };
      after: { name: string; type: string };
    }> = [];
    const removed: Array<{ code: string; name: string }> = [];

    for (const row of parsed.rows) {
      const existingItem = existingByCode.get(row.code);
      if (!existingItem) {
        added.push(row);
      } else if (
        existingItem.name !== row.name ||
        existingItem.type !== row.type ||
        existingItem.description !== row.description ||
        existingItem.behavioralIndicators !== row.behavioralIndicators
      ) {
        changed.push({
          code: row.code,
          before: { name: existingItem.name, type: existingItem.type },
          after: { name: row.name, type: row.type },
        });
      }
    }

    for (const e of existing) {
      if (!incomingCodes.has(e.code)) {
        removed.push({ code: e.code, name: e.name });
      }
    }

    return NextResponse.json({
      added,
      changed,
      removed,
      summary: {
        addedCount: added.length,
        changedCount: changed.length,
        removedCount: removed.length,
      },
    });
  } catch (error) {
    console.error("[API] POST /api/kamus/preview-update failed:", error);
    return NextResponse.json(
      { error: "Failed to preview update" },
      { status: 500 }
    );
  }
}
