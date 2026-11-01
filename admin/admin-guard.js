window.LEGEND_ADMIN_READY = (async function () {
  const config = window.LEGEND_SUPABASE_CONFIG || {};
  if (!config.url || !config.anonKey) return { mode: "demo" };

  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const client = createClient(config.url, config.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError || !sessionData.session) {
      window.location.replace("login.html");
      return { mode: "blocked" };
    }

    const apiFetch = async (path, options = {}) => {
      const { data } = await client.auth.getSession();
      const session = data.session;
      if (!session) throw new Error("Your session has expired. Please sign in again.");
      const headers = { ...(options.headers || {}), Authorization: "Bearer " + session.access_token };
      if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
      return fetch(path, { ...options, headers, cache: "no-store" });
    };

    const response = await apiFetch("/api/admin/products");
    const result = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) {
      await client.auth.signOut();
      alert(response.status === 403 ? "This account does not have the trusted admin role." : "Please sign in again.");
      window.location.replace("login.html");
      return { mode: "blocked" };
    }
    if (!response.ok) {
      alert(result.error || "Admin API is not ready. Check the Supabase environment variables and database setup.");
      return { mode: "blocked" };
    }
    return { mode: "remote", client, apiFetch, products: result.products || [] };
  } catch (error) {
    console.error("Admin initialization failed:", error?.name || "Error");
    alert("Could not connect to the admin service. Check the Supabase browser configuration and network connection.");
    return { mode: "blocked" };
  }
})();
