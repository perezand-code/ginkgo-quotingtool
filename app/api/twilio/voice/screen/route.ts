export async function POST(req: NextRequest) {
  const supabase = supabaseServer();

  const formData = await req.formData();

  const from = formData.get("From")?.toString() || "";
  const callSid = formData.get("CallSid")?.toString() || "";
  const speech = formData.get("SpeechResult")?.toString() || "";

  const { score, reasons } = scoreSpeech(speech);

  await supabase.from("call_logs").insert({
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
      <Say>Please request a quote online at Ginkgo Pressure Washing dot com, then give us a call right back.</Say>
      <Hangup/>
    </Response>
  `);
}
