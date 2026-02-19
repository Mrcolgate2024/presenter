/**
 * Supabase Client + Realtime Channel
 * Replaces Socket.IO for all real-time communication
 */

const SUPABASE_URL = 'https://zfgnjvsnoymsljrznipu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmZ25qdnNub3ltc2xqcnpuaXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0OTQwNTksImV4cCI6MjA4NzA3MDA1OX0.C6YMXKI-4foFKbiw4w2p2OayYcQTzJE4q7-fkEvtS6I';

let _supabase = null;
let channel = null;
let isConnected = false;

function getSupabaseClient() {
  if (!_supabase) {
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
      throw new Error('Supabase JS library not loaded. Check your internet connection.');
    }
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return _supabase;
}

function initRealtime() {
  if (channel) return channel;
  const client = getSupabaseClient();
  channel = client.channel('presenter', {
    config: { broadcast: { self: false } }
  });
  channel.subscribe((status) => {
    isConnected = status === 'SUBSCRIBED';
    document.querySelectorAll('.connection-status').forEach(el => {
      el.className = `connection-status ${isConnected ? 'connected' : 'disconnected'}`;
    });
  });
  return channel;
}

// Auto-init realtime when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { try { initRealtime(); } catch(e) { console.warn('Realtime init deferred:', e.message); } });
} else {
  try { initRealtime(); } catch(e) { console.warn('Realtime init deferred:', e.message); }
}

// Broadcast helpers
function broadcast(event, payload) {
  if (!channel) initRealtime();
  channel.send({ type: 'broadcast', event, payload });
}

function onBroadcast(event, callback) {
  if (!channel) initRealtime();
  channel.on('broadcast', { event }, ({ payload }) => callback(payload));
}

// ==================== Presentations DB API ====================

const PresentationsDB = {
  async list() {
    const db = getSupabaseClient();
    const { data, error } = await db
      .from('presentations')
      .select('id, name, filename, type, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async get(filename) {
    const db = getSupabaseClient();
    const { data, error } = await db
      .from('presentations')
      .select('*')
      .eq('filename', filename)
      .single();
    if (error) throw error;
    return data;
  },

  async save(name, filename, type, content) {
    const db = getSupabaseClient();
    const { data: existing } = await db
      .from('presentations')
      .select('id')
      .eq('filename', filename)
      .single();

    if (existing) {
      const { data, error } = await db
        .from('presentations')
        .update({ name, content, updated_at: new Date().toISOString() })
        .eq('filename', filename)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await db
        .from('presentations')
        .insert({ name, filename, type, content })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  async delete(filename) {
    const db = getSupabaseClient();
    const { error } = await db
      .from('presentations')
      .delete()
      .eq('filename', filename);
    if (error) throw error;
  }
};
