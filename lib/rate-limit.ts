import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/server-audit";

export type RateLimitResult = { allowed: boolean; remaining: number };

/**
 * Fixed-window rate limit backed by the rate_limit_counters table.
 * Fails open (allowed: true) if Supabase isn't configured, so local dev
 * without env vars still works.
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const client = serviceClient();
  if (!client) return { allowed: true, remaining: limit };

  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);

  const { data: existing } = await client
    .from("rate_limit_counters")
    .select("count, window_start")
    .eq("key", key)
    .maybeSingle();

  if (!existing || new Date(existing.window_start) < windowStart) {
    await client.from("rate_limit_counters").upsert({ key, count: 1, window_start: now.toISOString() });
    return { allowed: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  await client.from("rate_limit_counters").update({ count: existing.count + 1 }).eq("key", key);
  return { allowed: true, remaining: Math.max(0, limit - existing.count - 1) };
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitResponse() {
  return NextResponse.json(
    { message: "Too many requests. Please wait a few minutes and try again." },
    { status: 429 }
  );
}
