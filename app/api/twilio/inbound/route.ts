import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { sendSms } from "@/lib/twilio";

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  return phone;
}

function isOwnerNumber(phone: string) {
  const normalized = normalizePhone(phone);

  return (
    normalized === process.env.OWNER_PHONE_1 ||
    normalized === process.env.OWNER_PHONE_2
  );
}

function parseOwnerReply(body: string) {
  const match = body.match(/^@(\+?1?\d{10})\s+([\s\S]+)/);

  if (!match) return null;

  const customerPhone = normalizePhone(match[1]);
  const message = match[2].trim();

  if (!message) return null;

  return { customerPhone, message };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const from = normalizePhone(String(formData.get("From") || ""));
    const to = normalizePhone(String(formData.get("To") || ""));
    const body = String(formData.get("Body") || "").trim();
    const incomingSid = String(formData.get("MessageSid") || "");

    if (!from || !to || !body) {
      return NextResponse.json({ error: "Missing inbound SMS data" }, { status: 400 });
    }

    const supabase = supabaseServer();

    /**
     * CASE 1:
     * Andrew/Elvin texts the Twilio number:
     * @2605551234 We are on the way.
     */
    if (isOwnerNumber(from)) {
      const parsed = parseOwnerReply(body);

      if (!parsed) {
        await sendSms({
          to: from,
          body:
            "Ginkgo reply format: @CUSTOMERPHONE message\nExample: @2605551234 We are on the way.",
        });

        return NextResponse.json({ received: true });
      }

      const outbound = await sendSms({
        to: parsed.customerPhone,
        body: parsed.message,
      });

      await supabase.from("sms_messages").insert({
        direction: "outbound",
        from_number: to,
        to_number: parsed.customerPhone,
        customer_phone: parsed.customerPhone,
        body: parsed.message,
        twilio_sid: outbound.sid,
        status: outbound.status,
      });

      await sendSms({
        to: from,
        body: `Sent to ${parsed.customerPhone}: "${parsed.message}"`,
      });

      return NextResponse.json({ received: true });
    }

    /**
     * CASE 2:
     * Customer texts Ginkgo number.
     */
    await supabase.from("sms_messages").insert({
      direction: "inbound",
      from_number: from,
      to_number: to,
      customer_phone: from,
      body,
      twilio_sid: incomingSid,
      status: "received",
    });

    const ownerPhones = [
      process.env.OWNER_PHONE_1,
      process.env.OWNER_PHONE_2,
    ].filter(Boolean) as string[];

    for (const ownerPhone of ownerPhones) {
      await sendSms({
        to: ownerPhone,
        body: `New Ginkgo text from ${from}:\n\n"${body}"\n\nReply:\n@${from} your message`,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Inbound SMS relay error:", error);
    return NextResponse.json({ error: "Inbound SMS failed" }, { status: 500 });
  }
}
