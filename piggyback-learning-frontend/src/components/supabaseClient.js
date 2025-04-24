import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL.endsWith('/')
    ? process.env.REACT_APP_SUPABASE_URL
    : process.env.REACT_APP_SUPABASE_URL + '/';

const supabaseAnonKey= process.env.REACT_APP_SUPABASE_ANON_KEY

console.log(process.env.REACT_APP_SUPABASE_URL)

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key must be defined in environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);