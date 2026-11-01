const { createClient } = require("@supabase/supabase-js");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_FIELDS = new Set(["name", "slug", "category", "description", "price_pkr", "compare_at_price_pkr", "stock", "status"]);

function send(res, status, payload) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(status).json(payload);
}
function slugify(value) {
  return String(value || "").toLowerCase().trim().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}
function validateProduct(input, partial = false) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return "Request body must be a JSON object.";
  const keys = Object.keys(input);
  if (!keys.length) return "At least one field is required.";
  if (keys.some(key => !ALLOWED_FIELDS.has(key))) return "One or more fields are not allowed.";
  const out = { ...input };
  if (!partial || "name" in out) {
    if (typeof out.name !== "string" || !out.name.trim() || out.name.trim().length > 120) return "Name must be 1–120 characters.";
    out.name = out.name.trim();
  }
  if (!partial || "slug" in out) {
    out.slug = slugify(out.slug || out.name);
    if (!out.slug) return "A valid product slug is required.";
  }
  if (!partial || "category" in out) {
    if (typeof out.category !== "string" || !out.category.trim() || out.category.trim().length > 60) return "Category must be 1–60 characters.";
    out.category = out.category.trim();
  }
  if ("description" in out && (typeof out.description !== "string" || out.description.length > 5000)) return "Description must be 5,000 characters or fewer.";
  if (!partial || "price_pkr" in out) {
    if (!Number.isSafeInteger(out.price_pkr) || out.price_pkr < 1 || out.price_pkr > 100000000) return "Price must be a positive whole number in PKR.";
  }
  if ("compare_at_price_pkr" in out && out.compare_at_price_pkr !== null &&
      (!Number.isSafeInteger(out.compare_at_price_pkr) || out.compare_at_price_pkr < 1 || out.compare_at_price_pkr > 100000000)) return "Compare-at price must be null or a positive whole number.";
  if (!partial || "stock" in out) {
    if (!Number.isSafeInteger(out.stock) || out.stock < 0 || out.stock > 10000000) return "Stock must be a whole number from 0 to 10,000,000.";
  }
  if ("status" in out && !["active", "draft"].includes(out.status)) return "Status must be active or draft.";
  return out;
}

module.exports = async function handler(req, res) {
  if (!["GET", "POST", "PATCH", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return send(res, 405, { error: "Method not allowed." });
  }
  const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return send(res, 503, { error: "Admin API is not configured. Set the required Supabase environment variables in the hosting project." });
  }

  const authorization = req.headers.authorization || "";
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) return send(res, 401, { error: "Sign in with an authorized admin account." });

  try {
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: "Bearer " + tokenMatch[1] } }
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(tokenMatch[1]);
    if (authError || !authData?.user) return send(res, 401, { error: "Your session is invalid or expired." });
    // Only trusted app_metadata is accepted; user-editable user_metadata is intentionally ignored.
    if (authData.user.app_metadata?.role !== "admin") return send(res, 403, { error: "Admin permission is required." });

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    if (req.method === "GET") {
      const { data, error } = await db.from("products").select("id,slug,name,category,description,price_pkr,compare_at_price_pkr,stock,status,created_at,updated_at").order("created_at", { ascending: false }).limit(200);
      if (error) { console.error("Admin products list failed:", error.code); return send(res, 500, { error: "Could not load products." }); }
      return send(res, 200, { products: data });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (req.method === "POST") {
      const clean = validateProduct(body);
      if (typeof clean === "string") return send(res, 400, { error: clean });
      const { data, error } = await db.from("products").insert(clean).select("id,slug,name,category,description,price_pkr,compare_at_price_pkr,stock,status,created_at,updated_at").single();
      if (error) { console.error("Admin product create failed:", error.code); return send(res, error.code === "23505" ? 409 : 500, { error: error.code === "23505" ? "That product slug already exists." : "Could not create product." }); }
      return send(res, 201, { product: data });
    }

    if (!UUID_RE.test(String(body.id || ""))) return send(res, 400, { error: "A valid product id is required." });
    if (req.method === "PATCH") {
      const changes = { ...body }; delete changes.id;
      const clean = validateProduct(changes, true);
      if (typeof clean === "string") return send(res, 400, { error: clean });
      const { data, error } = await db.from("products").update(clean).eq("id", body.id).select("id,slug,name,category,description,price_pkr,compare_at_price_pkr,stock,status,created_at,updated_at").maybeSingle();
      if (error) { console.error("Admin product update failed:", error.code); return send(res, error.code === "23505" ? 409 : 500, { error: error.code === "23505" ? "That product slug already exists." : "Could not update product." }); }
      if (!data) return send(res, 404, { error: "Product not found." });
      return send(res, 200, { product: data });
    }

    const { data, error } = await db.from("products").delete().eq("id", body.id).select("id").maybeSingle();
    if (error) { console.error("Admin product delete failed:", error.code); return send(res, 500, { error: "Could not delete product." }); }
    if (!data) return send(res, 404, { error: "Product not found." });
    return send(res, 200, { deleted: true, id: data.id });
  } catch (error) {
    console.error("Admin products API unexpected error:", error?.name || "Error");
    return send(res, 500, { error: "Unexpected server error." });
  }
};
