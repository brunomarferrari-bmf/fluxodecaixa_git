import fs from 'fs';

const transactions = JSON.parse(fs.readFileSync('parsed_categorized_transactions.json', 'utf8'));

const batchSize = 100;
const sqlBatches = [];

// First batch includes TRUNCATE
for (let i = 0; i < transactions.length; i += batchSize) {
  const chunk = transactions.slice(i, i + batchSize);
  const values = chunk.map(tx => {
    const title = tx.title.replace(/'/g, "''");
    const desc = tx.description.replace(/'/g, "''");
    const cat = tx.category.replace(/'/g, "''");
    return `('${tx.id}', '${tx.date}', '${title}', ${tx.amount}, '${tx.type}', '${cat}', '', 'Outros', '${desc}', '${tx.created_at}')`;
  }).join(',\n');

  let sql = '';
  if (i === 0) {
    sql += `DELETE FROM public.transactions;\n\n`;
  }
  sql += `INSERT INTO public.transactions (id, date, title, amount, type, category, tag_code, payment_method, description, created_at)
VALUES
${values};`;

  sqlBatches.push(sql);
}

fs.writeFileSync('sql_categorized_batches.json', JSON.stringify(sqlBatches, null, 2));
console.log(`Generated ${sqlBatches.length} SQL batches for 653 transactions.`);
