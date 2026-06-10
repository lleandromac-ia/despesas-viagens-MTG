const SUPABASE_URL = 'https://guhctlrzaowxbtjbpybk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1aGN0bHJ6YW93eGJ0amJweWJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MDE3MzksImV4cCI6MjA5NjQ3NzczOX0.oeh0cjLqBdmyX89X0K-9A46QCmkLhp16R5RW9fdLuMI';
const SUPABASE_TABLE = 'despesas_viagem';

function getSupabaseHeaders(isJson = false) {
    const headers = {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: 'application/json'
    };
    if (isJson) {
        headers['Content-Type'] = 'application/json';
        headers['Prefer'] = 'return=minimal';
    }
    return headers;
}
