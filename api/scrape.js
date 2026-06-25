/**
 * PUREscapes Daily Procurement Scraper
 * Vercel Cron: runs every day at 10:00 UTC (6am ET)
 * Manual trigger: GET /api/scrape?secret=CRON_SECRET
 */

const SUPA_URL = process.env.SUPABASE_URL || "https://vrdcpahwapmuyulsfvst.supabase.co";
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; PUREscapes-Procurement-Bot/1.0; +https://werepure.ca)" };

// ── Supabase client ───────────────────────────────────────────────────────────
async function supa(path, opts = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1${path}`, {
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "return=representation",
      ...(opts.headers || {}),
    },
    ...opts,
  });
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

// ── Keywords that make a tender relevant for PUREscapes ──────────────────────
const KEYWORDS = [
  "excavat", "grad", "ditch", "culvert", "landscap", "mowing", "grass cut",
  "vegetation", "road maintenance", "shoulder", "armour stone", "site prep",
  "drainage", "erosion", "shoreline", "brushing", "grounds maintenance",
  "park restoration", "cemetery", "boulevard", "topsoil", "grading",
  "retaining wall", "interlock", "hardscap", "snow removal", "sod"
];

function isRelevant(text) {
  const lower = (text || "").toLowerCase();
  return KEYWORDS.some(k => lower.includes(k));
}

// ── Claude AI scorer ──────────────────────────────────────────────────────────
async function scoreTender(tender) {
  if (!ANTHROPIC_KEY) return { fit_score: 50, reasoning: "No API key", recommended_bid: null, strategy_notes: "", category: "other" };

  const prompt = `Score this municipal tender for PUREscapes Ltd. (landscaping/excavation contractor, Meaford ON, 2 crews, 100km radius).

Tender: ${tender.title}
Municipality: ${tender.municipality}
Description: ${tender.description?.slice(0, 400) || ""}
Estimated Value: $${tender.estimated_value_low || "?"} – $${tender.estimated_value_high || "?"}
Distance: ~${tender.distance_km || "?"}km
Bonding Required: ${tender.requires_bonding ? "Yes" : "No"}

Respond ONLY in JSON (no markdown):
{"fit_score":<0-100>,"reasoning":"<2 sentences>","recommended_bid":<number or null>,"strategy_notes":"<1-2 sentences>","category":"<excavation|landscaping|maintenance|construction|hardscaping|other>"}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 300, messages: [{ role: "user", content: prompt }] }),
    });
    const d = await res.json();
    const text = d.content?.find(c => c.type === "text")?.text || "{}";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return { fit_score: 50, reasoning: "Scoring failed", recommended_bid: null, strategy_notes: "", category: "other" };
  }
}

// ── Mark expired tenders closed ───────────────────────────────────────────────
async function expireOldTenders() {
  const now = new Date().toISOString();
  await supa(`/tenders?status=eq.open&closing_date=lt.${now}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "closed" }),
    prefer: "return=minimal",
  });
  console.log("[scraper] Expired old tenders");
}

// ── Get existing tender titles to dedup ───────────────────────────────────────
async function getExistingTitles() {
  const rows = await supa("/tenders?select=title&status=eq.open&limit=500");
  return new Set((Array.isArray(rows) ? rows : []).map(r => r.title.toLowerCase().trim()));
}

// ── Scraper: Grey County ──────────────────────────────────────────────────────
async function scrapeGreyCounty() {
  const found = [];
  try {
    const res = await fetch("https://www.grey.ca/government/budget-finances-purchasing/bids-tenders-contracts", { headers: HEADERS });
    const html = await res.text();

    // Grey County lists tenders with Reference #, Name, Description, Project closes pattern
    const blocks = html.split("Reference #:");
    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      const refMatch = block.match(/^([\w-]+)/);
      const nameMatch = block.match(/Name:\s*([^\n]+)/);
      const descMatch = block.match(/Description:\s*([\s\S]+?)(?=Project closes|Reference #|$)/);
      const closeMatch = block.match(/Project closes\s+([\w]+ \d+, \d{4})/);

      const title = nameMatch ? nameMatch[1].trim() : null;
      const desc = descMatch ? descMatch[1].replace(/\s+/g, " ").trim().slice(0, 500) : "";

      if (!title || !isRelevant(title + " " + desc)) continue;

      found.push({
        title: title.slice(0, 200),
        municipality: "Grey County",
        category: "construction",
        description: desc,
        scope_of_work: desc,
        closing_date: closeMatch ? new Date(closeMatch[1]).toISOString() : null,
        tender_number: refMatch ? refMatch[1] : null,
        source_url: "https://www.grey.ca/government/budget-finances-purchasing/bids-tenders-contracts",
        status: "open",
        distance_km: 15,
        requires_bonding: false,
      });
    }
    console.log(`[scraper] Grey County: ${found.length} relevant`);
  } catch (e) { console.error("[scraper] Grey County error:", e.message); }
  return found;
}

// ── Scraper: Meaford Bids & Tenders ──────────────────────────────────────────
async function scrapeMeaford() {
  const found = [];
  try {
    const res = await fetch("https://meaford.bidsandtenders.ca/Module/Tenders/en", { headers: HEADERS });
    const html = await res.text();

    // Extract tender rows from bids&tenders table format
    const rowMatches = html.matchAll(/<tr[^>]*class="[^"]*BidRow[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi);
    for (const row of rowMatches) {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
        .map(m => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());

      const title = cells[0] || cells[1] || "";
      if (!title || !isRelevant(title)) continue;

      const linkMatch = row[1].match(/href="([^"]+Tender\/Detail[^"]+)"/i);
      const dateCell = cells.find(c => /\d{4}/.test(c) && /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(c));

      found.push({
        title: title.slice(0, 200),
        municipality: "Municipality of Meaford",
        category: "maintenance",
        description: cells[1] || title,
        closing_date: dateCell ? new Date(dateCell).toISOString() : null,
        source_url: linkMatch ? `https://meaford.bidsandtenders.ca${linkMatch[1]}` : "https://meaford.bidsandtenders.ca/Module/Tenders/en",
        status: "open",
        distance_km: 2,
        requires_bonding: false,
      });
    }
    console.log(`[scraper] Meaford: ${found.length} relevant`);
  } catch (e) { console.error("[scraper] Meaford error:", e.message); }
  return found;
}

// ── Scraper: Collingwood Bids & Tenders ──────────────────────────────────────
async function scrapeCollingwood() {
  const found = [];
  try {
    const res = await fetch("https://collingwood.bidsandtenders.ca/Module/Tenders/en", { headers: HEADERS });
    const html = await res.text();
    const rowMatches = html.matchAll(/<tr[^>]*class="[^"]*BidRow[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi);
    for (const row of rowMatches) {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
        .map(m => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
      const title = cells[0] || cells[1] || "";
      if (!title || !isRelevant(title)) continue;
      const dateCell = cells.find(c => /\d{4}/.test(c) && /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(c));
      found.push({
        title: title.slice(0, 200),
        municipality: "Town of Collingwood",
        category: "landscaping",
        description: title,
        closing_date: dateCell ? new Date(dateCell).toISOString() : null,
        source_url: "https://collingwood.bidsandtenders.ca/Module/Tenders/en",
        status: "open",
        distance_km: 29,
        requires_bonding: false,
      });
    }
    console.log(`[scraper] Collingwood: ${found.length} relevant`);
  } catch (e) { console.error("[scraper] Collingwood error:", e.message); }
  return found;
}

// ── Scraper: Owen Sound Bids & Tenders ───────────────────────────────────────
async function scrapeOwenSound() {
  const found = [];
  try {
    const res = await fetch("https://owensound.bidsandtenders.ca/Module/Tenders/en", { headers: HEADERS });
    const html = await res.text();
    const rowMatches = html.matchAll(/<tr[^>]*class="[^"]*BidRow[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi);
    for (const row of rowMatches) {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
        .map(m => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
      const title = cells[0] || cells[1] || "";
      if (!title || !isRelevant(title)) continue;
      const dateCell = cells.find(c => /\d{4}/.test(c) && /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(c));
      found.push({
        title: title.slice(0, 200),
        municipality: "City of Owen Sound",
        category: "landscaping",
        description: title,
        closing_date: dateCell ? new Date(dateCell).toISOString() : null,
        source_url: "https://owensound.bidsandtenders.ca/Module/Tenders/en",
        status: "open",
        distance_km: 42,
        requires_bonding: false,
      });
    }
    console.log(`[scraper] Owen Sound: ${found.length} relevant`);
  } catch (e) { console.error("[scraper] Owen Sound error:", e.message); }
  return found;
}

// ── Scraper: Blue Mountains ───────────────────────────────────────────────────
async function scrapeBlueMountains() {
  const found = [];
  try {
    const res = await fetch("https://thebluemountains.bidsandtenders.ca/Module/Tenders/en", { headers: HEADERS });
    const html = await res.text();
    const rowMatches = html.matchAll(/<tr[^>]*class="[^"]*BidRow[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi);
    for (const row of rowMatches) {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
        .map(m => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
      const title = cells[0] || cells[1] || "";
      if (!title || !isRelevant(title)) continue;
      const dateCell = cells.find(c => /\d{4}/.test(c) && /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(c));
      found.push({
        title: title.slice(0, 200),
        municipality: "Town of the Blue Mountains",
        category: "excavation",
        description: title,
        closing_date: dateCell ? new Date(dateCell).toISOString() : null,
        source_url: "https://thebluemountains.bidsandtenders.ca/Module/Tenders/en",
        status: "open",
        distance_km: 35,
        requires_bonding: false,
      });
    }
    console.log(`[scraper] Blue Mountains: ${found.length} relevant`);
  } catch (e) { console.error("[scraper] Blue Mountains error:", e.message); }
  return found;
}

// ── Scraper: Wasaga Beach ─────────────────────────────────────────────────────
async function scrapeWasagaBeach() {
  const found = [];
  try {
    const res = await fetch("https://wasagabeach.bidsandtenders.ca/Module/Tenders/en", { headers: HEADERS });
    const html = await res.text();
    const rowMatches = html.matchAll(/<tr[^>]*class="[^"]*BidRow[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi);
    for (const row of rowMatches) {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
        .map(m => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
      const title = cells[0] || cells[1] || "";
      if (!title || !isRelevant(title)) continue;
      const dateCell = cells.find(c => /\d{4}/.test(c) && /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(c));
      found.push({
        title: title.slice(0, 200),
        municipality: "Town of Wasaga Beach",
        category: "landscaping",
        description: title,
        closing_date: dateCell ? new Date(dateCell).toISOString() : null,
        source_url: "https://wasagabeach.bidsandtenders.ca/Module/Tenders/en",
        status: "open",
        distance_km: 55,
        requires_bonding: false,
      });
    }
    console.log(`[scraper] Wasaga Beach: ${found.length} relevant`);
  } catch (e) { console.error("[scraper] Wasaga Beach error:", e.message); }
  return found;
}

// ── Scraper: Simcoe County ────────────────────────────────────────────────────
async function scrapeSimcoeCounty() {
  const found = [];
  try {
    const res = await fetch("https://simcoecounty.bidsandtenders.ca/Module/Tenders/en", { headers: HEADERS });
    const html = await res.text();
    const rowMatches = html.matchAll(/<tr[^>]*class="[^"]*BidRow[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi);
    for (const row of rowMatches) {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
        .map(m => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
      const title = cells[0] || cells[1] || "";
      if (!title || !isRelevant(title)) continue;
      const dateCell = cells.find(c => /\d{4}/.test(c) && /jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(c));
      found.push({
        title: title.slice(0, 200),
        municipality: "County of Simcoe",
        category: "construction",
        description: title,
        closing_date: dateCell ? new Date(dateCell).toISOString() : null,
        source_url: "https://simcoecounty.bidsandtenders.ca/Module/Tenders/en",
        status: "open",
        distance_km: 60,
        requires_bonding: false,
      });
    }
    console.log(`[scraper] Simcoe County: ${found.length} relevant`);
  } catch (e) { console.error("[scraper] Simcoe County error:", e.message); }
  return found;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Auth: cron calls come with no secret; manual calls need the secret
  const isVercelCron = req.headers["x-vercel-cron"] === "1";
  const hasSecret = req.query?.secret === CRON_SECRET && CRON_SECRET;
  if (!isVercelCron && !hasSecret) {
    return res.status(401).json({ error: "Unauthorized. Pass ?secret=CRON_SECRET for manual runs." });
  }

  console.log(`[PUREscapes Scraper] Run started ${new Date().toISOString()}`);

  // Log start
  const logRows = await supa("/scrape_log", {
    method: "POST",
    body: JSON.stringify({ status: "running", started_at: new Date().toISOString() }),
  }).catch(() => []);
  const logId = Array.isArray(logRows) && logRows[0] ? logRows[0].id : null;

  let totalFound = 0, totalNew = 0;

  try {
    await expireOldTenders();
    const existing = await getExistingTitles();

    // Run all scrapers in parallel
    const results = await Promise.allSettled([
      scrapeGreyCounty(),
      scrapeMeaford(),
      scrapeCollingwood(),
      scrapeOwenSound(),
      scrapeBlueMountains(),
      scrapeWasagaBeach(),
      scrapeSimcoeCounty(),
    ]);

    const allTenders = results.flatMap(r => r.status === "fulfilled" ? r.value : []);
    totalFound = allTenders.length;

    // Dedup by title
    const fresh = allTenders.filter(t =>
      t.title && !existing.has(t.title.toLowerCase().trim())
    );
    console.log(`[scraper] ${totalFound} found, ${fresh.length} new after dedup`);

    // Score and insert
    for (const tender of fresh) {
      try {
        const score = await scoreTender(tender);
        await supa("/tenders", {
          method: "POST",
          body: JSON.stringify({
            ...tender,
            category: score.category || tender.category || "other",
            ai_fit_score: score.fit_score ?? 50,
            ai_fit_reasoning: score.reasoning ?? "",
            ai_recommended_bid: score.recommended_bid ?? null,
            ai_strategy_notes: score.strategy_notes ?? "",
            ai_scored_at: new Date().toISOString(),
          }),
          prefer: "return=minimal",
        });
        totalNew++;
        // Gentle rate limit on Claude calls
        await new Promise(r => setTimeout(r, 600));
      } catch (e) {
        console.error(`[scraper] Insert failed for "${tender.title}":`, e.message);
      }
    }

    // Update log
    if (logId) {
      await supa(`/scrape_log?id=eq.${logId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "success", completed_at: new Date().toISOString(), tenders_found: totalFound, tenders_new: totalNew }),
        prefer: "return=minimal",
      });
    }

    return res.status(200).json({ success: true, found: totalFound, new: totalNew, ts: new Date().toISOString() });

  } catch (err) {
    console.error("[scraper] Fatal:", err);
    if (logId) {
      await supa(`/scrape_log?id=eq.${logId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "failed", error_message: err.message, completed_at: new Date().toISOString() }),
        prefer: "return=minimal",
      });
    }
    return res.status(500).json({ error: err.message });
  }
}
