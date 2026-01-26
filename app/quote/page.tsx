"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type ServiceType = "Driveway" | "House Wash" | "Deck/Patio" | "Fence";
type SizeType = "Small" | "Medium" | "Large";
type ConditionType = "Light" | "Medium" | "Heavy";

function formatUSD(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function estimateRange(params: {
  service: ServiceType | null;
  size: SizeType;
  condition: ConditionType;
}) {
  const { service, size, condition } = params;
  if (!service) return null;

  const baseByService: Record<ServiceType, number> = {
    Driveway: 140,
    "House Wash": 260,
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

  const base = baseByService[service];
  const price = base * sizeMultiplier[size] * conditionMultiplier[condition];

  const low = Math.round(price * 0.92);
  const high = Math.round(price * 1.12);

  return { low, high };
}

export default function QuotePage() {
  const router = useRouter();
  const [service, setService] = useState<ServiceType | null>(null);
  const [size, setSize] = useState<SizeType>("Medium");
  const [condition, setCondition] = useState<ConditionType>("Light");

  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const estimate = useMemo(() => {
    return estimateRange({ service, size, condition });
  }, [service, size, condition]);

  function validate() {
    if (!address.trim()) return "Please enter a service address.";
    if (!service) return "Please select a service.";
    if (!name.trim()) return "Please enter your name.";
    if (!phone.trim()) return "Please enter your phone number.";
    return null;
  }

  async function onSubmit() {
    setSubmitted(false);
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    if (!service) {
    setError("Please select a service.");
    return;
  }

  setError(null);

  try {
    const res = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address,
        name,
        phone,
        service,
        size,
        condition,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data?.error ?? "Something went wrong.");
      return;
    }
    router.push(`/q/${data.id}`);

    // data.id is your saved quote id
    setSubmitted(true);

    // Next phase: redirect to /q/[id]
    // router.push(`/q/${data.id}`);
  } catch {
    setError("Network error. Please try again.");
  }
}

  const services: ServiceType[] = ["Driveway", "House Wash", "Deck/Patio", "Fence"];

  return (
    <div className="min-h-screen bg-white">
      {/* Top Nav (homepage-style) */}
      <header className="w-full">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <a href="/" className="flex items-center gap-2">
            <img
              src="/ginkgo-logo.png"
              alt="Ginkgo"
              className="h-10 w-auto"
            />
          </a>

          <nav className="hidden items-center gap-8 text-sm font-medium text-gray-700 md:flex">
            <a className="hover:text-gray-900" href="/">Home</a>
            <a className="hover:text-gray-900" href="/">About Us</a>

            <a
              href="tel:+12602674413"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white shadow-sm hover:bg-blue-700"
            >
              {/* simple user icon */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M20 21a8 8 0 1 0-16 0"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Call Us
            </a>
          </nav>

          {/* Mobile: just show the CTA */}
          <a
            href="/quote"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 md:hidden"
          >
            Quote Now
          </a>
        </div>

        <div className="h-px w-full bg-gray-100" />
      </header>

      {/* Main content */}
      <main>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-12 lg:grid-cols-2">
          {/* Left: headline + trust */}
          <section>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900">
              Get a quote in under a minute.
            </h1>

            <p className="mt-4 max-w-xl text-gray-600">
              Get a quick estimate range. Final price confirmed after photos or a quick walkthrough.
            </p>

            <div className="mt-6 flex flex-wrap gap-2 text-xs text-gray-700">
              <span className="rounded-full border border-gray-200 px-3 py-1">
                Local
              </span>
              <span className="rounded-full border border-gray-200 px-3 py-1">
                Insured
              </span>
              <span className="rounded-full border border-gray-200 px-3 py-1">
                Satisfaction-focused
              </span>
            </div>

            {/* Live estimate preview */}
            <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <div className="text-sm text-gray-600">Estimated total</div>
              <div className="mt-1 text-3xl font-semibold text-gray-900">
                {estimate ? (
                  <>
                    {formatUSD(estimate.low)} – {formatUSD(estimate.high)}
                  </>
                ) : (
                  "Select a service to begin"
                )}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Includes prep, wash, and final rinse. Exact price confirmed after photos/walkthrough.
              </div>
            </div>
          </section>

          {/* Right: form card */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Service Address
                </label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  placeholder="123 Main St, Fort Wayne, IN"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  What do you need cleaned?
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {services.map((s) => {
                    const selected = service === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setService(s)}
                        className={[
                          "rounded-xl border px-4 py-3 text-left transition",
                          selected
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-300 bg-white hover:border-gray-900",
                        ].join(" ")}
                      >
                        <div className="font-medium text-gray-900">{s}</div>
                        <div className="text-sm text-gray-500">
                          {selected ? "Selected" : "Tap to select"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Size</label>
                  <select
                    value={size}
                    onChange={(e) => setSize(e.target.value as SizeType)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-slate-500 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  >
                    <option>Small</option>
                    <option>Medium</option>
                    <option>Large</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Condition
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as ConditionType)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-slate-500 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  >
                    <option>Light</option>
                    <option>Medium</option>
                    <option>Heavy</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-slate-500 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-slate-500 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    placeholder="(260) 555-1234"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={onSubmit}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Receive Quote
              </button>

              {submitted && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  Quote received! Next we’ll save it to the backend and text you a confirmation.
                </div>
              )}

              <p className="text-xs text-gray-500">
                By continuing, you agree to receive texts about your quote. Msg & data rates may apply.
                Reply STOP to opt out.
              </p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer strip like your homepage */}
      <footer className="mt-10 bg-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2">
            <img
              src="/ginkgo-logo-bl.png"
              alt="Ginkgo"
              className="h-9 w-auto"
            />
          </div>
          <div className="text-xs text-gray-300">
            © {new Date().getFullYear()} Ginkgo Pressure Washing
          </div>
        </div>
      </footer>
    </div>
  );
}
