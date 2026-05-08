export function customerConfirmationText(firstName: string, service: string) {
  const custName = firstName?.trim() || "there";
  const cleanService = service?.trim() || "quote";

  return `Hey ${custName}, thanks for reaching out to Ginkgo Pressure Washing. We got your ${cleanService} request and will give you a follow up the second we look check time slots. - Andrew & Elvin

Reply STOP to opt out.`;
}

export function internalLeadAlertText(quote: {
  id?: string;
  name: string;
  phone: string;
  service: string;
  size?: string;
  condition?: string;
  address: string;
}) {
  return `New Ginkgo quote!:
${quote.name}
${quote.phone}
${quote.service}${quote.size ? ` - ${quote.size}` : ""}${quote.condition ? ` - ${quote.condition}` : ""}
${quote.address}
Quote ID: ${quote.id ?? "N/A"}`;
}
