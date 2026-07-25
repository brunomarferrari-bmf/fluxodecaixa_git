import fs from 'fs';

const rawLines = fs.readFileSync('new_pdf_text.txt', 'utf8').split('\n');

const validCategories = [
  'Aluguel de Equipamento',
  'Aluguel de Imóvel',
  'Benefícios',
  'Compra de Equipamentos',
  'Compra de Insumos',
  'Contas Fixas',
  'Estorno ou Cashback de Cartão',
  'Freelancer',
  'Pagamento de Cartão de Crédito',
  'Prólabore',
  'Salários',
  'Serviços Prestados',
  'Taxa de Reserva',
  'Transferência entre Contas',
  'Transferência entre Sócios',
  'Vendas da Operação'
];

// Combine wrapped lines
const combinedLines = [];
let buffer = '';

for (let l of rawLines) {
  l = l.trim();
  if (!l) continue;
  if (l.startsWith('Página ') || l.startsWith('Fluxo de Caixa') || l.startsWith('-- ') || l.includes('DATA \tDESCRIÇÃO')) continue;
  if (l.includes('TOTAL DE') || l.includes('Relatório de') || l.includes('Mapeamento e') || l.includes('Resumo Consolidado') || l.includes('Detalhamento dos') || l.includes('RESULTADO LÍQUIDO')) continue;
  if (validCategories.some(cat => l.startsWith(cat) && l.includes('R$'))) continue; // Header summary table

  if (/^\d{2}\/\d{2}\/\d{4}/.test(l)) {
    if (buffer) {
      combinedLines.push(buffer);
    }
    buffer = l;
  } else {
    if (buffer) {
      buffer += ' ' + l;
    }
  }
}
if (buffer) {
  combinedLines.push(buffer);
}

const transactions = [];
const dateCounters = {};

for (const line of combinedLines) {
  const match = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.+)/);
  if (!match) continue;

  const dateStr = match[1];
  const rest = match[2];

  let foundCategory = null;
  let categoryIdx = -1;

  for (const cat of validCategories) {
    const idx = rest.lastIndexOf(cat);
    if (idx !== -1 && idx > categoryIdx) {
      categoryIdx = idx;
      foundCategory = cat;
    }
  }

  if (!foundCategory || categoryIdx === -1) {
    console.warn('Could not find category in line:', line);
    continue;
  }

  const descPart = rest.substring(0, categoryIdx).trim();
  const afterCat = rest.substring(categoryIdx + foundCategory.length).trim();

  const valMatch = afterCat.match(/(-?)\s*R\$\s*([\d\.,]+)/);
  if (!valMatch) {
    console.warn('Could not parse value in line:', line);
    continue;
  }

  const isNegative = valMatch[1] === '-';
  const rawNum = valMatch[2].replace(/\./g, '').replace(',', '.');
  const amount = parseFloat(rawNum);

  const [day, month, year] = dateStr.split('/');
  const dateIso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

  const type = isNegative ? 'saida' : 'entrada';

  const idx = dateCounters[dateIso] || 0;
  dateCounters[dateIso] = idx + 1;
  const id = `tx_${dateIso}_${idx}`;

  transactions.push({
    id,
    date: dateIso,
    title: descPart || (type === 'saida' ? 'Saída' : 'Entrada'),
    amount,
    type,
    category: foundCategory,
    tag_code: '',
    payment_method: 'Outros',
    description: descPart,
    created_at: `${dateIso}T12:00:00.000Z`
  });
}

console.log(`Parsed ${transactions.length} transactions.`);
fs.writeFileSync('parsed_categorized_transactions.json', JSON.stringify(transactions, null, 2));

let totalEntradas = 0;
let totalSaidas = 0;

for (const tx of transactions) {
  if (tx.type === 'entrada') {
    totalEntradas += tx.amount;
  } else {
    totalSaidas += tx.amount;
  }
}

console.log('Total Entradas:', totalEntradas.toFixed(2), '(Expected in PDF: 621045.44)');
console.log('Total Saídas:', totalSaidas.toFixed(2), '(Expected in PDF: 399864.01)');
console.log('Resultado Líquido:', (totalEntradas - totalSaidas).toFixed(2), '(Expected in PDF: 221181.43)');
