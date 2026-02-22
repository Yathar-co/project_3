import { createClient } from '@supabase/supabase-js';

// Supabase anon key is designed to be public (browser-safe).
// RLS policies enforce per-user data isolation server-side.
// URL and key are sourced from env vars at build time for portability.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://eydfzdklpfxxzhtrensi.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZGZ6ZGtscGZ4eHpodHJlbnNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NDQ4MDUsImV4cCI6MjA4NzMyMDgwNX0.pxrQMnXO8tEHd9RpFiYY_RPmYpi3BCaj_QaMN8b1cPY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- Input Sanitization ----
function sanitizeString(str, maxLen = 200) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>"'&]/g, '').trim().slice(0, maxLen);
}

function sanitizeArray(arr, maxLen = 20, itemMaxLen = 100) {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, maxLen).map(v => sanitizeString(String(v), itemMaxLen)).filter(Boolean);
}

// ---- Auth ----
export async function signUp(email, password, fullName) {
    const cleanEmail = sanitizeString(email, 254);
    const cleanName = sanitizeString(fullName, 100);
    if (!cleanEmail || password.length < 6) throw new Error('Invalid credentials');

    const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { full_name: cleanName } }
    });
    if (error) throw new Error('Registration failed. Please try again.');
    return data;
}

export async function signIn(email, password) {
    const cleanEmail = sanitizeString(email, 254);
    if (!cleanEmail || !password) throw new Error('Invalid credentials');

    const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail, password
    });
    if (error) throw new Error('Invalid email or password');
    return data;
}

export async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
    });
    if (error) throw new Error('Google sign-in unavailable');
    return data;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error('Sign out failed');
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

// ---- Database (all queries use RLS — user_id enforced server-side) ----
export async function saveScan(userId, scanData, result) {
    const { data, error } = await supabase.from('scans').insert({
        user_id: userId,
        company_name: sanitizeString(scanData.company.name, 150),
        company_industry: sanitizeString(scanData.company.industry, 80),
        company_size: sanitizeString(scanData.company.size, 20),
        company_country: sanitizeString(scanData.company.country, 60),
        regulation: sanitizeString(scanData.regulation, 50),
        overall_risk: sanitizeString(result.overall_risk, 10),
        summary: sanitizeString(result.summary, 1000),
        findings: result.findings,
        data_practices: scanData.dataPractices
    }).select().single();
    if (error) throw new Error('Failed to save scan');
    return data;
}

export async function getScans(userId) {
    const { data, error } = await supabase
        .from('scans').select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
    if (error) throw new Error('Failed to load scans');
    return data || [];
}

export async function getScanById(id) {
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        throw new Error('Invalid scan ID');
    }
    const { data, error } = await supabase
        .from('scans').select('*')
        .eq('id', id).single();
    if (error) throw new Error('Scan not found');
    return data;
}

export async function saveDocument(userId, docData) {
    const { data, error } = await supabase.from('documents').insert({
        user_id: userId,
        doc_type: sanitizeString(docData.type, 50),
        title: sanitizeString(docData.title, 200),
        company_name: sanitizeString(docData.company_name, 150),
        regulation: sanitizeString(docData.regulation, 50),
        content: docData.content
    }).select().single();
    if (error) throw new Error('Failed to save document');
    return data;
}

export async function getDocuments(userId) {
    const { data, error } = await supabase
        .from('documents').select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw new Error('Failed to load documents');
    return data || [];
}
