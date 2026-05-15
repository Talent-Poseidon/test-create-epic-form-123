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
        {
          error: "Validation failed",
          rowErrors: parsed.errors,
        },
        { status: 400 }
      );
    }

    if (parsed.rows.length === 0) {
      return NextResponse.json(
        { error: "No data rows found in template" },
        { status: 400 }
      );
    }

    const codes = parsed.rows.map((r) => r.code);
    const existing = await prisma.kamusItem.findMany({
      where: { code: { in: codes } },
      select: { code: true },
    });
    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: "Duplicate codes already exist in database",
          rowErrors: existing.map((e) => ({
            row: 0,
            errors: [`code '${e.code}' already exists`],
          })),
        },
        { status: 400 }
      );
    }

    const created = await prisma.$transaction(
      parsed.rows.map((r) =>
        prisma.kamusItem.create({
          data: {
            code: r.code,
            name: r.name,
            type: r.type,
            description: r.description,
            behavioralIndicators: r.behavioralIndicators,
          },
        })
      )
    );

    await prisma.kamusEvent.create({
      data: {
        eventType: "Kamus Submitted",
        payload: JSON.stringify({
          count: created.length,
          codes: created.map((c) => c.code),
        }),
      },
    });

    return NextResponse.json(
      {
        message: "Kamus uploaded successfully",
        count: created.length,
        items: created,
        event: "Kamus Submitted",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] POST /api/kamus/upload failed:", error);
    return NextResponse.json(
      { error: "Failed to upload kamus" },
      { status: 500 }
    );
  }
}
