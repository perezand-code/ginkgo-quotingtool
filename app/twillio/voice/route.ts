import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function twiml(xml: string) {
  return new NextResponse(xml, {
    headers: { "Content-Type": "text/xml" },
  });
}

const trustedAreaCodes = ["260", "317", "463", "574", "765", "812", "930"];

async function scoreInitialCall(from: string | null) {
  let score = 0;
  const reasons: string[] = [];

  if (!from || from === "anonymous" || from === "unknown") {
    score -= 10;
    reasons.push("anonymous_or_unknown");
    return { score, reasons };
  }

  if (from.startsWith("+1")) {
    score += 2;
    reasons.push("us_number");
  } else {
    score -= 8;
    reasons.push("non_us_number");
  }

  const areaCode = from.startsWith("+1") ? from.slice(2, 5) : "";
  if (trustedAreaCodes.includes(areaCode)) {
    score += 1;
    reasons.push("indiana_or_nearby_area_code");
  }

  const { data: quoteLead } = await supabaseServer
    .from("quotes")
    .select("id")
    .eq("phone", from)
    .limit(1)
    .maybeSingle();

  if (quoteLead) {
    score += 5;
    reasons.push("existing_quote_lead");
  }

  const { data: spamNumber } = await supabaseServer
    .from("spam_numbers")
    .select("id")
    .eq("phone", from)
    .limit(1)
    .maybeSingle();

  if (spamNumber) {
    score -= 3;
    reasons.push("marked_spam");
  }

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { count } = await supabaseServer
    .from("call_logs")
    .select("*", { count: "exact", head: true })
    .eq("phone", from)
    .gte("created_at", fiveMinutesAgo);

  if ((count ?? 0) >= 3) {
    score -= 6;
    reasons.push("called_3_plus_times_in_5_minutes");
  }

  return { score, reasons };
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const from = formData.get("From")?.toString() || null;
  const callSid = formData.get("CallSid")?.toString() || "";

  const { score, reasons } = await scoreInitialCall(from);

  await supabaseServer.from("call_logs").insert({
    phone: from,
    call_sid: callSid,
    score,
    status: score <= -5 ? "blocked_initial" : "screening",
    reasons,
  });

  if (score <= -5) {
    return twiml(`<Response><Reject reason="rejected"/></Response>`);
  }

  if (score >= 7) {
    return twiml(`
      <Response>
        <Say>Thanks for calling Ginkgo Pressure Washing. Connecting you now.</Say>
        <Dial timeout="20">
          <Number>+12603105233</Number>
          <Number>+12602674413</Number>
        </Dial>
      </Response>
    `);
  }

  return twiml(`
    <Response>
      <Gather
        input="speech"
        action="/api/twilio/voice/screen"
        method="POST"
        speechTimeout="auto"
        timeout="6">
        <Say>
          Thanks for calling Ginkgo Pressure Washing.
          Briefly say what service you need, like driveway cleaning, house wash, window cleaning, or commercial pressure washing.
        </Say>
      </Gather>
      <Say>Sorry, we did not catch that. Please request a quote online using our form on our website. Once complete give us a call back.</Say>
      <Hangup/>
    </Response>
  `);
}
