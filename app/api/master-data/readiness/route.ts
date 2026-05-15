import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [kamusCount, standarCount, scenarioCount] = await Promise.all([
      prisma.kamusItem.count(),
      prisma.standarJabatan.count(),
      prisma.scenario.count(),
    ]);

    const kamusReady = kamusCount > 0;
    const standarReady = standarCount > 0;
    const scenarioReady = scenarioCount > 0;
    const ready = kamusReady && standarReady && scenarioReady;

    return NextResponse.json({
      ready,
      kamus: { ready: kamusReady, count: kamusCount },
      standarJabatan: { ready: standarReady, count: standarCount },
      scenario: { ready: scenarioReady, count: scenarioCount },
    });
  } catch (error) {
    console.error("[API] GET /api/master-data/readiness failed:", error);
    return NextResponse.json(
      { error: "Failed to check master data readiness" },
      { status: 500 }
    );
  }
}
