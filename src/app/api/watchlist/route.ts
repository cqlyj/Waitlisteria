import { NextResponse } from "next/server";
import { getAuthSupabase } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await getAuthSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data });
}

export async function POST(request: Request) {
  const supabase = await getAuthSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { items } = body as {
    items: {
      school: string;
      program: string;
      degree: string;
      season: string;
      last_known_data?: Record<string, unknown>;
    }[];
  };

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items required" }, { status: 400 });
  }

  const rows = items.map((item) => ({
    user_id: user.id,
    school: item.school,
    program: item.program,
    degree: item.degree,
    season: item.season,
    last_known_data: item.last_known_data ?? null,
  }));

  const { error } = await supabase
    .from("watchlist")
    .upsert(rows, { onConflict: "user_id,school,program,degree,season" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await getAuthSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const school = searchParams.get("school");
  const program = searchParams.get("program");
  const degree = searchParams.get("degree");
  const season = searchParams.get("season");

  if (!school || !degree || !season) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("user_id", user.id)
    .eq("school", school)
    .eq("program", program || "")
    .eq("degree", degree)
    .eq("season", season);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
