import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { sendSms } from "@/lib/twilio";
import { sendDiscordSmsAlert } from "@/lib/discord";

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  return phone;
}

function isOwnerNumber(phone: string) {
  const normalized = normalizePhone(phone);

  return (
    normalized === normalizePhone(process.env.OWNER_PHONE_1 || "") ||
    normalized === normalizePhone(process.env.OWNER_PHONE_2 || "")
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

    console.log("TWILIO INBOUND HIT:", {
      from,
      to,
      body,
      incomingSid,
    });

    if (!from || !to || !body) {
      console.error("Missing inbound SMS data:", { from, to, body });
      return NextResponse.json(
        { error: "Missing inbound SMS data" },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();

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

      const { data: outboundData, error: outboundInsertError } = await supabase
        .from("sms_messages")
        .insert({
          quote_id: null,
          direction: "outbound",
          from_number: to,
          to_number: parsed.customerPhone,
          customer_phone: parsed.customerPhone,
          body: parsed.message,
          twilio_sid: outbound.sid,
          status: outbound.status,
        })
        .select();

      console.log("OUTBOUND SMS INSERT DATA:", outboundData);

      if (outboundInsertError) {
        console.error("OUTBOUND SMS INSERT ERROR:", outboundInsertError);
      }

      await sendDiscordSmsAlert({
        from: to,
        to: parsed.customerPhone,
        body: `📤 Sent by owner ${from}:\n${parsed.message}`,
      });

      await sendSms({
        to: from,
        body: `Sent to ${parsed.customerPhone}: "${parsed.message}"`,
      });

      return NextResponse.json({ received: true });
    }

    const { data: inboundData, error: inboundInsertError } = await supabase
      .from("sms_messages")
      .insert({
        quote_id: null,
        direction: "inbound",
        from_number: from,
        to_number: to,
        customer_phone: from,
        body,
        twilio_sid: incomingSid,
        status: "received",
      })
      .select();

    console.log("INBOUND SMS INSERT DATA:", inboundData);

    if (inboundInsertError) {
      console.error("INBOUND SMS INSERT ERROR:", inboundInsertError);
    }

    await sendDiscordSmsAlert({
      from,
      to,
      body,
    });

    const ownerPhones = [
      process.env.OWNER_PHONE_1,
      process.env.OWNER_PHONE_2,
    ].filter(Boolean) as string[];

    for (const ownerPhone of ownerPhones) {
      await sendSms({
        to: normalizePhone(ownerPhone),
        body: `New Ginkgo text from ${from}:\n\n"${body}"\n\nReply:\n@${from} your message`,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Inbound SMS relay error:", error);
    return NextResponse.json({ error: "Inbound SMS failed" }, { status: 500 });
  }
}
