import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { applySecurityHeaders } from "@/lib/security/security-headers";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return applySecurityHeaders(
      NextResponse.json({ error: "Invalid request" }, { status: 400 })
    );
  }

  const parsed = signInSchema.safeParse(body);
  if (!parsed.success) {
    return applySecurityHeaders(
      NextResponse.json({ error: "Invalid email or password" }, { status: 400 })
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return applySecurityHeaders(
      NextResponse.json({ error: error.message }, { status: 401 })
    );
  }

  return applySecurityHeaders(NextResponse.json({ success: true }));
}
