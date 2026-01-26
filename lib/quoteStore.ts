import { promises as fs } from "fs";
import path from "path";

export type StoredQuote = {
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

const DATA_PATH = path.join(process.cwd(), "data", "quotes.json");

async function readAll(): Promise<StoredQuote[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredQuote[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(quotes: StoredQuote[]) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(quotes, null, 2), "utf-8");
}

export async function addQuote(q: StoredQuote) {
  const quotes = await readAll();
  quotes.unshift(q);
  await writeAll(quotes);
}

export async function getQuoteById(id: string) {
  const quotes = await readAll();
  return quotes.find((q) => q.id === id) ?? null;
}

export async function listQuotes() {
  return readAll();
}
