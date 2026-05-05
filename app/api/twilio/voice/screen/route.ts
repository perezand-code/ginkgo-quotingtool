import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function twiml(xml: string) {
  return new NextResponse(xml, {
    headers: { "Content-Type": "text/xml" },
  });
}

function scoreSpeech(speech: string) {
  let score = 0;
  const reasons: string[] = [];

  const clean = speech.toLowerCase().trim();

  const keywords = [
    "driveway",
    "house wash",
    "pressure washing",
    "power washing",
    "quote",
    "estimate",
    "apartment",
    "commercial",
    "sidewalk",
    "patio",
    "deck",
    "fence",
    "mildew",
    "cleaning",
  ];

  const matched = keywords.filter((word) => clean.includes(word));

  if (matched.length > 0) {
    score += 2;
    reasons.push(`service_keywords:${matched.join(",")}`);
  }

  if (clean.length < 5) {
    score -= 5;
    reasons.push("silent_or_too_short");
  }

  if (clean.length >= 5 && matched.length === 0) {
    score -= 4;
    reasons.push("unrelated_speech");
  }

  return { score, reasons };
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const from = formData.get("From")?.toString() || "";
  const callSid = formData.get("CallSid")?.toString() || "";
  const speech = formData.get("SpeechResult")?.toString() || "";

  const { score, reasons } = scoreSpeech(speech);

  await supabaseServer.from("call_logs").insert({
    phone: from,
    call_sid: callSid,
    speech_result: speech,
    score,
    status: score >= 2 ? "connected_after_screening" : "blocked_after_screening",
    reasons,
  });

  if (score >= 2) {
    return twiml(`
      <Response>
        <Say>Thanks. Connecting you now.</Say>
        <Dial timeout="20">
          <Number>+12603105233</Number>
          <Number>+12602674413</Number>
        </Dial>
      </Response>
    `);
  }

  return twiml(`
    <Response>
      <Say>Please request a quote online at Ginkgo Pressure Washing dot com. After give us a call right back.</Say>
      <Hangup/>
    </Response>
  `);
}
