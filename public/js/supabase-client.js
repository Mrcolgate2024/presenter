/**
 * Supabase Client + Realtime Channel
 * Replaces Socket.IO for all real-time communication
 */

const SUPABASE_URL = 'https://zfgnjvsnoymsljrznipu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmZ25qdnNub3ltc2xqcnpuaXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0OTQwNTksImV4cCI6MjA4NzA3MDA1OX0.C6YMXKI-4foFKbiw4w2p2OayYcQTzJE4q7-fkEvtS6I';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Realtime channel for presentation sync
const channel = supabase.channel('presenter', {
  config: { broadcast: { self: false } }
});

// Track connection status
let isConnected = false;

channel.subscribe((status) => {
  isConnected = status === 'SUBSCRIBED';
  document.querySelectorAll('.connection-status').forEach(el => {
    el.className = `connection-status ${isConnected ? 'connected' : 'disconnected'}`;
  });
});

// Broadcast helpers
function broadcast(event, payload) {
  channel.send({ type: 'broadcast', event, payload });
}

function onBroadcast(event, callback) {
  channel.on('broadcast', { event }, ({ payload }) => callback(payload));
}

// ==================== Presentations DB API ====================

const PresentationsDB = {
  async list() {
    const { data, error } = await supabase
      .from('presentations')
      .select('id, name, filename, type, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async get(filename) {
    const { data, error } = await supabase
      .from('presentations')
      .select('*')
      .eq('filename', filename)
      .single();
    if (error) throw error;
    return data;
  },

  async save(name, filename, type, content) {
    const { data: existing } = await supabase
      .from('presentations')
      .select('id')
      .eq('filename', filename)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from('presentations')
        .update({ name, content, updated_at: new Date().toISOString() })
        .eq('filename', filename)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('presentations')
        .insert({ name, filename, type, content })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  async delete(filename) {
    const { error } = await supabase
      .from('presentations')
      .delete()
      .eq('filename', filename);
    if (error) throw error;
  }
};
