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
    .from("analysis_sessions")
    .select("id, title, lang, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: data });
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
  const { title, schools, results, lang } = body;

  if (!title || !schools) {
    return NextResponse.json(
      { error: "title and schools are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("analysis_sessions")
    .insert({
      user_id: user.id,
      title,
      schools,
      results: results ?? null,
      lang: lang || "en",
    })
    .select("id, title, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session: data }, { status: 201 });
}
