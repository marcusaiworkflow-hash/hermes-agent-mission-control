import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSnapshotOld, sanitizeSkillsSnapshot, unavailableSkillsSnapshot } from "@/lib/hermes-skills";

export async function GET() {
  try {
    const row = await prisma.dataStore.findUnique({ where: { key: "hermes-skills" } });
    const snapshot = row ? sanitizeSkillsSnapshot(row.data) : unavailableSkillsSnapshot();
    return NextResponse.json({ ...snapshot, stale: snapshot.stale || isSnapshotOld(snapshot.syncedAt) }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch {
    return NextResponse.json({ error: "Hermes skill inventory is unavailable." }, { status: 500 });
  }
}
