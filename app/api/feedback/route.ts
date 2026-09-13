import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedback } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

async function getSession(request: NextRequest) {
  return auth.api.getSession({
    headers: request.headers,
  });
}

// GET — public list of all user feedback (newest first)
export async function GET(request: NextRequest) {
  const rows = await db
    .select({
      id: feedback.id,
      userId: feedback.userId,
      name: feedback.name,
      image: feedback.image,
      stars: feedback.stars,
      comment: feedback.comment,
      createdAt: feedback.createdAt,
    })
    .from(feedback)
    .orderBy(desc(feedback.createdAt))
    .limit(200);

  const session = await getSession(request).catch(() => null);

  return NextResponse.json({
    items: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
    viewerId: session?.user.id ?? null,
  });
}

// POST — submit feedback (signed in only so we know who it came from)
export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const stars = body?.stars;
  const comment = typeof body?.comment === "string" ? body.comment.trim() : "";

  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json(
      { error: "Stars must be an integer from 1 to 5" },
      { status: 400 }
    );
  }
  if (!comment) {
    return NextResponse.json({ error: "Comment is required" }, { status: 400 });
  }
  if (comment.length > 2000) {
    return NextResponse.json(
      { error: "Comment must be 2000 characters or fewer" },
      { status: 400 }
    );
  }

  const name = session.user.name || null;
  const image = session.user.image || null;

  const inserted = await db
    .insert(feedback)
    .values({
      id: randomUUID(),
      userId: session.user.id,
      name,
      image,
      stars,
      comment,
    })
    .returning();

  return NextResponse.json({ success: true, item: inserted[0] });
}