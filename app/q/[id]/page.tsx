import { supabaseServer } from "@/lib/supabaseServer";

type Quote = {
  id: string;
  createdAt: string;
  address: string;
  name: string;
  phone: string;
  service: "Driveway" | "House Wash" | "Deck/Patio" | "Fence";
  size: "Small" | "Medium" | "Large";
  condition: "Light" | "Medium" | "Heavy";
  estimateLow: number;
  estimateHigh: number;
};

function formatUSD(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function getQuoteFromDb(id: string): Promise<Quote | null> {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    createdAt: data.created_at,
    address: data.address,
    name: data.name,
    phone: data.phone,
    service: data.service,
    size: data.size,
    condition: data.condition,
    estimateLow: data.estimate_low,
    estimateHigh: data.estimate_high,
  } as Quote;
}

export default async function QuoteViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuoteFromDb(id);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <a href="/" className="flex items-center gap-2">
            <img src="/ginkgo-logo.png" alt="Ginkgo" className="h-10 w-auto" />
          </a>

          <div className="flex items-center gap-3">
            <a
              href="tel:+12602674413"
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              Call Us
            </a>
            <a
              href="/quote"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              New Quote
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {!quote ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            <div className="text-lg font-semibold">Couldn’t load quote</div>
            <div className="mt-2 text-sm">Quote not found.</div>
            <a
              href="/quote"
              className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Create a new quote
            </a>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm text-gray-500">Estimate</div>
                <div className="mt-1 text-3xl font-bold text-gray-900">
                  {formatUSD(quote.estimateLow)} – {formatUSD(quote.estimateHigh)}
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Final price confirmed after photos or walkthrough.
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-gray-200">
                <div className="text-xs text-gray-500">Quote ID</div>
                <div className="font-mono text-sm text-gray-900">{quote.id}</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Service
                </div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {quote.service}
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Size: <span className="font-medium">{quote.size}</span>
                  <br />
                  Condition: <span className="font-medium">{quote.condition}</span>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Location
                </div>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {quote.address}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Created: {formatDate(quote.createdAt)}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 sm:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Customer
                </div>
                <div className="mt-1 text-sm text-gray-800">
                  <span className="font-semibold">{quote.name}</span> •{" "}
                  <a className="underline" href={`tel:${quote.phone}`}>
                    {quote.phone}
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="tel:+12602674413"
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                Call to confirm
              </a>
              <a
                href="/quote"
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Request another quote
              </a>
            </div>

            <p className="mt-6 text-xs text-gray-500">
              This is an estimate range. Pricing may change for heavy staining,
              rust removal, multi-surface jobs, or special access needs.
            </p>
          </div>
        )}
      </main>

      <footer className="mt-40 bg-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <img
            src="/ginkgo-logo-bl.png"
            alt="Ginkgo"
            className="h-9 w-auto"
          />
          <div className="text-xs text-gray-300">
            © {new Date().getFullYear()} Ginkgo Pressure Washing
          </div>
        </div>
      </footer>
    </div>
  );
}
