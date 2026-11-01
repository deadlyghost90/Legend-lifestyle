window.LEGEND_ADMIN_READY = (async function () {
  const config = window.LEGEND_FIREBASE_CONFIG || {};
  if (!config.apiKey || !config.databaseURL || !config.projectId) return { mode: "demo" };
  try {
    const sdk = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js").then(async app => ({
      ...app,
      ...await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js"),
      ...await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js")
    }));
    const app = sdk.getApps().length ? sdk.getApp() : sdk.initializeApp(config);
    const auth = sdk.getAuth(app);
    const db = sdk.getDatabase(app);
    const user = auth.currentUser || await new Promise(resolve => {
      const stop = sdk.onAuthStateChanged(auth, current => { stop(); resolve(current); });
    });
    if (!user) { window.location.replace("login.html"); return { mode: "blocked" }; }
    const token = await user.getIdTokenResult(true);
    if (token.claims.admin !== true) {
      await sdk.signOut(auth);
      alert("This account does not have the trusted Firebase admin claim.");
      window.location.replace("login.html");
      return { mode: "blocked" };
    }
    const snapshot = await sdk.get(sdk.ref(db, "products"));
    const products = snapshot.exists() ? Object.entries(snapshot.val()).map(([id, p]) => ({ id, ...p })) : [];
    async function apiFetch(path, options = {}) {
      const method = String(options.method || "GET").toUpperCase();
      const body = typeof options.body === "string" ? JSON.parse(options.body || "{}") : (options.body || {});
      let status = 200, result = {};
      try {
        if (!path.endsWith("/api/admin/products")) throw new Error("Unsupported admin API path.");
        if (method === "GET") {
          const snap = await sdk.get(sdk.ref(db, "products"));
          result = { products: snap.exists() ? Object.entries(snap.val()).map(([id, p]) => ({ id, ...p })) : [] };
        } else if (method === "POST") {
          if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 120 || typeof body.category !== "string" || !body.category.trim() || body.category.trim().length > 60 || !Number.isSafeInteger(body.price_pkr) || body.price_pkr < 1 || body.price_pkr > 100000000 || !Number.isSafeInteger(body.stock) || body.stock < 0 || body.stock > 10000000) throw new Error("Check product name, category, price and stock.");
          const idRef = sdk.push(sdk.ref(db, "products"));
          const slug = String(body.slug || body.name).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
          const description = String(body.description || "").trim();
          if (!slug || description.length > 5000 || (body.compare_at_price_pkr != null && (!Number.isSafeInteger(body.compare_at_price_pkr) || body.compare_at_price_pkr < 1 || body.compare_at_price_pkr > 100000000)) || (body.status !== undefined && !["active", "draft"].includes(body.status))) throw new Error("Check the product slug, description, compare-at price and status.");
          const product = { name: body.name.trim(), slug, category: body.category.trim(), description, price_pkr: body.price_pkr, compare_at_price_pkr: body.compare_at_price_pkr || null, stock: body.stock, status: body.status === "draft" ? "draft" : "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
          const updates = {}; updates["products/" + idRef.key] = product;
          if (product.status === "active") updates["storefrontProducts/" + idRef.key] = product;
          await sdk.update(sdk.ref(db), updates);
          result = { product: { id: idRef.key, ...product } }; status = 201;
        } else if (method === "PATCH") {
          if (!body.id || !/^[A-Za-z0-9_-]{1,128}$/.test(String(body.id))) throw new Error("A valid product ID is required.");
          const snap = await sdk.get(sdk.ref(db, "products/" + body.id));
          if (!snap.exists()) { status = 404; throw new Error("Product not found."); }
          const previous = snap.val();
          const name = typeof body.name === "string" ? body.name.trim() : previous.name;
          const category = typeof body.category === "string" ? body.category.trim() : previous.category;
          const description = body.description === undefined ? String(previous.description || "") : String(body.description).trim();
          const price = body.price_pkr === undefined ? previous.price_pkr : body.price_pkr;
          const stock = body.stock === undefined ? previous.stock : body.stock;
          const statusValue = body.status === undefined ? previous.status : body.status;
          const compareAt = body.compare_at_price_pkr === undefined ? (previous.compare_at_price_pkr || null) : body.compare_at_price_pkr;
          const slug = String(body.slug || (body.name ? name : previous.slug) || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
          if (!name || name.length > 120 || !category || category.length > 60 || !slug || description.length > 5000 || !Number.isSafeInteger(price) || price < 1 || price > 100000000 || !Number.isSafeInteger(stock) || stock < 0 || stock > 10000000 || !["active", "draft"].includes(statusValue) || (compareAt != null && (!Number.isSafeInteger(compareAt) || compareAt < 1 || compareAt > 100000000))) throw new Error("Check product name, category, description, slug, price, stock, status and compare-at price.");
          const next = { name, slug, category, description, price_pkr: price, compare_at_price_pkr: compareAt, stock, status: statusValue, created_at: previous.created_at || new Date().toISOString(), updated_at: new Date().toISOString() };
          const updates = {}; updates["products/" + body.id] = next;
          updates["storefrontProducts/" + body.id] = next.status === "active" ? next : null;
          await sdk.update(sdk.ref(db), updates); result = { product: { id: body.id, ...next } };
        } else if (method === "DELETE") {
          if (!body.id || !/^[A-Za-z0-9_-]{1,128}$/.test(String(body.id))) throw new Error("A valid product ID is required.");
          const updates = {}; updates["products/" + body.id] = null; updates["storefrontProducts/" + body.id] = null;
          await sdk.update(sdk.ref(db), updates); result = { deleted: true, id: body.id };
        } else { status = 405; throw new Error("Method not allowed."); }
      } catch (error) { if (status === 200) status = 400; result = { error: error.message || "Firebase operation failed." }; }
      return { ok: status >= 200 && status < 300, status, json: async () => result };
    }
    return { mode: "remote", products, apiFetch, db, sdk, client: { auth: { signOut: () => sdk.signOut(auth) } } };
  } catch (error) {
    console.error("Firebase admin initialization failed:", error && error.name || "Error");
    alert("Could not connect to Firebase. Check the browser config, Auth setup, database URL and security rules.");
    return { mode: "blocked" };
  }
})();