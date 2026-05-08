import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const messageSid = String(formData.get("MessageSid") || "");
    const messageStatus = String(formData.get("MessageStatus") || "");
    const errorCode = formData.get("ErrorCode")
      ? String(formData.get("ErrorCode"))
      : null;

    if (!messageSid || !messageStatus) {
      return NextResponse.json(
        { error: "Missing Twilio status data" },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();

    const { error } = await supabase
      .from("quotes")
      .update({
        customer_sms_status: messageStatus,
        customer_sms_error_code: errorCode,
        customer_sms_updated_at: new Date().toISOString(),
      })
      .eq("customer_sms_sid", messageSid);

    if (error) {
      console.error("Failed to update SMS status:", error);
      return NextResponse.json(
        { error: "Database update failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Twilio status callback error:", error);
    return NextResponse.json(
      { error: "Status callback failed" },
      { status: 500 }
    );
  }
}
