import fs from 'fs';

const batches = JSON.parse(fs.readFileSync('sql_categorized_batches.json', 'utf8'));

batches.forEach((sql, idx) => {
  fs.writeFileSync(`cat_batch_${idx}.sql`, sql);
});

console.log(`Saved ${batches.length} batch files.`);
