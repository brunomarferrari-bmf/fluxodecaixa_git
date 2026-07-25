import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yojuvhaaunbhphmzpqih.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvanV2aGFhdW5iaHBobXpwcWloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MDA5MzYsImV4cCI6MjEwMDQ3NjkzNn0.vUTFaD_I9Dz-XagLw3ZoFfg94c1pS9iRfib3G1w_CGg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const fileContent = fs.readFileSync('Fluxo_de_Caixa_Revisado.json', 'utf8');
  const cleanContent = fileContent.replace(/:\s*NaN/g, ': null');
  const data = JSON.parse(cleanContent);
  let values = [];
  let idCounter = {};
  let totalInserted = 0;
  
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    
    // Parse date DD/MM/YYYY
    const dateParts = item.Data.split('/');
    if (dateParts.length !== 3) continue;
    const dateStr = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
    
    const value = typeof item.Valor === 'string' ? parseFloat(item.Valor.replace(',', '.')) : item.Valor;
    const type = value >= 0 ? 'entrada' : 'saida';
    const amount = Math.abs(value);
    
    const title = item.Tipo || (value >= 0 ? 'Entrada' : 'Saída');
    const category = item.Categoria || '';
    const description = item.Descrição || item["Nome do Lançamento"] || '';
    const paymentMethod = item["Forma de Pagamento"] || '';
    
    if (!idCounter[dateStr]) idCounter[dateStr] = 0;
    const idx = idCounter[dateStr]++;
    const txId = `tx_${dateStr}_${idx}`;
    const createdAt = `${dateStr}T12:00:00.000Z`;
    
    values.push({
      id: txId,
      date: dateStr,
      title: title,
      amount: amount,
      type: type,
      category: category,
      description: description,
      payment_method: paymentMethod,
      created_at: createdAt
    });
    
    if (values.length === 100 || i === data.length - 1) {
      const { error } = await supabase
        .from('transactions')
        .upsert(values, { onConflict: 'id' });
        
      if (error) {
        console.error('Error inserting:', error);
      } else {
        totalInserted += values.length;
        console.log(`Inserted batch. Total so far: ${totalInserted}`);
      }
      values = [];
    }
  }
}

run();
