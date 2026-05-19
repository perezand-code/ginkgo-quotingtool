import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { checkRateLimit } from "@/lib/rateLimiter";
import { customerConfirmationText, internalLeadAlertText } from "@/lib/smsTemplates";
import { sendSms } from "@/lib/twilio";
import { sendDiscordNotification } from "@/lib/discord";

type ServiceType = "Driveway" | "House Wash" | "Deck/Patio" | "Fence";
type SizeType = "Small" | "Medium" | "Large";
type ConditionType = "Light" | "Medium" | "Heavy";

const allowedServices: ServiceType[] = ["Driveway", "House Wash", "Deck/Patio", "Fence"];
const allowedSizes: SizeType[] = ["Small", "Medium", "Large"];
const allowedConditions: ConditionType[] = ["Light", "Medium", "Heavy"];

type QuoteRequest = {
  address: string;
  name: string;
  phone: string;
  services: ServiceType[];
  size: SizeType;
  condition: ConditionType;
  consent: boolean;
};

function estimateRange(params: {
  service: ServiceType;
  size: SizeType;
  condition: ConditionType;
}) {
  const { service, size, condition } = params;

  const baseByService: Record<ServiceType, number> = {
    Driveway: 170,
    "House Wash": 290,
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

  const price =
    baseByService[service] *
    sizeMultiplier[size] *
    conditionMultiplier[condition];

  return {
    low: Math.round(price * 0.92),
    high: Math.round(price * 1.12),
  };
}

function isValidPhone(s: string) {
  const digits = s.replace(/\D/g, "");
  return digits.length >= 10;
}

function toE164US(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return phone;
}

async function validateQuoteRequest(reqBody: QuoteRequest): Promise<string | null> {
  if (!reqBody.address?.trim()) return "Missing address.";
  if (!reqBody.name?.trim()) return "Missing name.";

  if (!reqBody.phone?.trim() || !isValidPhone(reqBody.phone)) {
    return "Invalid phone number.";
  }

  if (
    !Array.isArray(reqBody.services) ||
    reqBody.services.length === 0 ||
    !reqBody.services.every((s) => allowedServices.includes(s))
  ) {
    return "Invalid services.";
  }

  if (!allowedSizes.includes(reqBody.size)) {
    return "Invalid size.";
  }

  if (!allowedConditions.includes(reqBody.condition)) {
    return "Invalid condition.";
  }


  return null;
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const rateLimit = checkRateLimit(ip);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many quote requests. Please try again later." },
      { status: 429 }
    );
  }

  let body: QuoteRequest;

  try {
    body = (await req.json()) as QuoteRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validationError = await validateQuoteRequest(body);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const ranges = body.services.map((service) =>
      estimateRange({
        service,
        size: body.size,
        condition: body.condition,
      })
    );

    const low = ranges.reduce((sum, r) => sum + r.low, 0);
    const high = ranges.reduce((sum, r) => sum + r.high, 0);
    

    const supabase = supabaseServer();

    const { data, error } = await supabase
      .from("quotes")
      .insert({
        address: body.address,
        name: body.name,
        phone: body.phone,
        service: body.services,
        size: body.size,
        condition: body.condition,
        estimate_low: low,
        estimate_high: high,
        sms_consent: body.consent,
        sms_consent_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Database insert failed." },
        { status: 500 }
      );
    }

    await sendDiscordNotification({
      name: body.name,
      phone: body.phone,
      address: body.address,
      services: body.services,
      estimatedPrice,
    });

    if (process.env.TWILIO_ENABLED === "true" && body.consent === true) {
  try {
    const quoteId = data.id;
    const customerPhone = toE164US(body.phone);
    const firstName = body.name.trim().split(" ")[0] || "there";
    const serviceText = body.services.join(", ");
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    const customerMessage = await sendSms({
      to: customerPhone,
      body: customerConfirmationText(firstName, serviceText),
      statusCallback: siteUrl
        ? `${siteUrl}/api/twilio/status`
        : undefined,
    });

    await supabase
      .from("quotes")
      .update({
        customer_sms_sid: customerMessage.sid,
        customer_sms_status: customerMessage.status,
        customer_sms_updated_at: new Date().toISOString(),
      })
      .eq("id", quoteId);

    const internalText = internalLeadAlertText({
      id: quoteId,
      name: body.name,
      phone: customerPhone,
      service: serviceText,
      size: body.size,
      condition: body.condition,
      address: body.address,
    });

    const ownerPhones = [
      process.env.OWNER_PHONE_1,
      process.env.OWNER_PHONE_2,
    ].filter(Boolean) as string[];

    for (const ownerPhone of ownerPhones) {
      const internalMessage = await sendSms({
        to: ownerPhone,
        body: internalText,
      });

      await supabase
        .from("quotes")
        .update({
          internal_sms_sid: internalMessage.sid,
          internal_sms_status: internalMessage.status,
          internal_sms_updated_at: new Date().toISOString(),
        })
        .eq("id", quoteId);
    }
  } catch (smsError) {
    console.error("SMS sending failed:", smsError);
  }
}

    return NextResponse.json({
      id: data.id,
      estimateLow: low,
      estimateHigh: high,
    });
  } catch (error) {
    console.error("Error creating quote:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
