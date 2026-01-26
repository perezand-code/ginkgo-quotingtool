import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type ServiceType = "Driveway" | "House Wash" | "Deck/Patio" | "Fence";
type SizeType = "Small" | "Medium" | "Large";
type ConditionType = "Light" | "Medium" | "Heavy";

type QuoteRequest = {
  address: string;
  name: string;
  phone: string;
  service: ServiceType;
  size: SizeType;
  condition: ConditionType;
};

function estimateRange(params: {
  service: ServiceType;
  size: SizeType;
  condition: ConditionType;
}) {
  const { service, size, condition } = params;

  const baseByService: Record<ServiceType, number> = {
    Driveway: 140,
    "House Wash": 260,
    "Deck/Patio": 160,
    Fence: 180,
  };

  const sizeMultiplier: Record<SizeType, number> = {
    Small: 0.85,
    Medium: 1.0,
    Large: 1.35,
  };

  const conditionMultiplier: Record<ConditionType, number> = {
    Light: 1.0,
    Medium: 1.15,
    Heavy: 1.35,
  };

  const base = baseByService[service];
  const price = base * sizeMultiplier[size] * conditionMultiplier[condition];

  return {
    low: Math.round(price * 0.92),
    high: Math.round(price * 1.12),
  };
}

function isValidPhone(s: string) {
  const digits = s.replace(/\D/g, "");
  return digits.length >= 10;
}

export async function POST(req: Request) {
  let body: QuoteRequest;

  try {
    body = (await req.json()) as QuoteRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.address?.trim()) return NextResponse.json({ error: "Missing address." }, { status: 400 });
  if (!body.name?.trim()) return NextResponse.json({ error: "Missing name." }, { status: 400 });
  if (!body.phone?.trim() || !isValidPhone(body.phone)) {
    return NextResponse.json({ error: "Invalid phone number." }, { status: 400 });
  }
  if (!body.service) return NextResponse.json({ error: "Missing service." }, { status: 400 });

  const { low, high } = estimateRange({
    service: body.service,
    size: body.size,
    condition: body.condition,
  });

  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("quotes")
    .insert({
      address: body.address,
      name: body.name,
      phone: body.phone,
      service: body.service,
      size: body.size,
      condition: body.condition,
      estimate_low: low,
      estimate_high: high,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Database insert failed." }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, estimateLow: low, estimateHigh: high });
}
