import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eydfzdklpfxxzhtrensi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZGZ6ZGtscGZ4eHpodHJlbnNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NDQ4MDUsImV4cCI6MjA4NzMyMDgwNX0.pxrQMnXO8tEHd9RpFiYY_RPmYpi3BCaj_QaMN8b1cPY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth helpers
export async function signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
    });
    if (error) throw error;
    return data;
}

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

export async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
    });
    if (error) throw error;
    return data;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

export async function getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export function onAuthChange(callback) {
    return supabase.auth.onAuthStateChange((_event, session) => {
        callback(session?.user || null);
    });
}

// Database helpers
export async function saveScan(userId, scanData, result) {
    const { data, error } = await supabase.from('scans').insert({
        user_id: userId,
        company_name: scanData.company.name,
        company_industry: scanData.company.industry,
        company_size: scanData.company.size,
        company_country: scanData.company.country,
        regulation: scanData.regulation,
        overall_risk: result.overall_risk,
        summary: result.summary,
        findings: result.findings,
        data_practices: scanData.dataPractices
    }).select().single();
    if (error) throw error;
    return data;
}

export async function getScans(userId) {
    const { data, error } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
    if (error) throw error;
    return data || [];
}

export async function getScanById(id) {
    const { data, error } = await supabase
        .from('scans')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

export async function saveDocument(userId, docData) {
    const { data, error } = await supabase.from('documents').insert({
        user_id: userId,
        doc_type: docData.type,
        title: docData.title,
        company_name: docData.company_name,
        regulation: docData.regulation,
        content: docData.content
    }).select().single();
    if (error) throw error;
    return data;
}

export async function getDocuments(userId) {
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}
