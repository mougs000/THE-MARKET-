import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "PASTE_YOUR_PROJECT_URL_HERE";
const SUPABASE_ANON_KEY = "PASTE_YOUR_ANON_KEY_HERE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabase;

window.storage = {
  async get(key, shared = false) {
    const { data, error } = await supabase
      .from("kv_store")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return null;
    return { key, value: data.value, shared };
  },

  async set(key, value, shared = false) {
    const { error } = await supabase
      .from("kv_store")
      .upsert({ key, value, shared });
    if (error) throw error;
    return { key, value, shared };
  },

  async delete(key, shared = false) {
    const { error } = await supabase.from("kv_store").delete().eq("key", key);
    return { key, deleted: !error, shared };
  },

  async list(prefix = "", shared = false) {
    const { data, error } = await supabase
      .from("kv_store")
      .select("key")
      .like("key", `${prefix}%`);
    if (error) return { keys: [], prefix, shared };
    return { keys: data.map((d) => d.key), prefix, shared };
  },
};
