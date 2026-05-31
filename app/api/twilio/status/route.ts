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

    // Update sms_messages table
    const { error: smsMessageError } = await supabase
      .from("sms_messages")
      .update({
        status: messageStatus,
        error_code: errorCode,
      })
      .eq("twilio_sid", messageSid);

    if (smsMessageError) {
      console.error("Failed to update sms_messages status:", smsMessageError);
    }

    // Also keep your quote customer SMS status updated
    const { error: quoteCustomerError } = await supabase
      .from("quotes")
      .update({
        customer_sms_status: messageStatus,
        customer_sms_error_code: errorCode,
        customer_sms_updated_at: new Date().toISOString(),
      })
      .eq("customer_sms_sid", messageSid);

    if (quoteCustomerError) {
      console.error("Failed to update quote customer SMS status:", quoteCustomerError);
    }

    // Also keep your internal owner SMS status updated
    const { error: quoteInternalError } = await supabase
      .from("quotes")
      .update({
        internal_sms_status: messageStatus,
        internal_sms_updated_at: new Date().toISOString(),
      })
      .eq("internal_sms_sid", messageSid);

    if (quoteInternalError) {
      console.error("Failed to update quote internal SMS status:", quoteInternalError);
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
