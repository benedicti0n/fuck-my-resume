import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { featureRequests } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

async function getSession(request: NextRequest) {
  return auth.api.getSession({
    headers: request.headers,
  });
}

// POST — validate + store a feature request. The FormSubmit email itself is
// fired from the browser (FormSubmit blocks server/datacenter IPs), using the
// signed-in user's email as Reply-To so replies reach them.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description =
    typeof body?.description === "string" ? body.description.trim() : "";

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!description) {
    return NextResponse.json(
      { error: "Description is required" },
      { status: 400 }
    );
  }
  if (title.length > 120) {
    return NextResponse.json(
      { error: "Title must be 120 characters or fewer" },
      { status: 400 }
    );
  }
  if (description.length > 4000) {
    return NextResponse.json(
      { error: "Description must be 4000 characters or fewer" },
      { status: 400 }
    );
  }

  const session = await getSession(request).catch(() => null);
  const userEmail = session?.user.email ?? null;
  const userName = session?.user.name ?? null;

  if (session) {
    await db.insert(featureRequests).values({
      id: randomUUID(),
      userId: session.user.id,
      name: userName,
      image: session.user.image || null,
      title,
      description,
    });
  }

  return NextResponse.json({ success: true, email: userEmail, name: userName });
}