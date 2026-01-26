import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", ctx.params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Quote not found." }, { status: 404 });
  }

  return NextResponse.json({
    quote: {
      id: data.id,
      createdAt: data.created_at,
      address: data.address,
      name: data.name,
      phone: data.phone,
      service: data.service,
      size: data.size,
      condition: data.condition,
      estimateLow: data.estimate_low,
      estimateHigh: data.estimate_high,
    },
  });
}

