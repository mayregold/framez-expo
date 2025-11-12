import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ulznlwzfzjlndkblxaur.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsem5sd3pmempsbmRrYmx4YXVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTk0MjAsImV4cCI6MjA3ODM3NTQyMH0.MY3rezQrPeTn477A-B04kzr296bGQASDRLzoaqqAtxk'


export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
