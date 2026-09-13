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

const FEATURE_EMAIL = "subhraneeljobs@gmail.com";
const FORM_SUBMIT_ENDPOINT = `https://formsubmit.co/ajax/${FEATURE_EMAIL}`;

// POST — submit a feature request; stored in DB and emailed to the owner's
// inbox via FormSubmit (an AJAX submit, so the browser never leaves the app).
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

  const form = new FormData();
  form.set("_captcha", "false");
  form.set("_template", "table");
  form.set("_subject", `Feature Request: ${title}`);
  if (userEmail) form.set("_replyto", userEmail);
  form.set("Name", userName ?? "Signed out user");
  form.set("Email", userEmail ?? "Not provided (signed out)");
  form.set("Title", title);
  form.set("Description", description);

  const headers = new Headers({ Accept: "application/json" });
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  if (origin) headers.set("Origin", origin);
  if (referer) headers.set("Referer", referer);

  const res = await fetch(FORM_SUBMIT_ENDPOINT, {
    method: "POST",
    body: form,
    headers,
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || json?.success !== "true") {
    const message =
      json?.message ??
      "Couldn't send the request. Try again.";
    if (json?.message?.includes("Activation")) {
      return NextResponse.json(
        {
          error:
            "This form hasn't been activated yet. Check subhraneeljobs@gmail.com for the 'Activate Form' email from FormSubmit and click the link, then try again.",
        },
        { status: 502 }
      );
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}