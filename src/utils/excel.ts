import * as XLSX from 'xlsx';
import { Transaction, Tag, CATEGORIAS_ENTRADA, CATEGORIAS_SAIDA, ImportValidationResult, TransactionType } from '../types';
import { formatDateBR } from './formatters';

const ALL_CATEGORIES = [...CATEGORIAS_ENTRADA, ...CATEGORIAS_SAIDA];

/**
 * Exporta uma lista de lançamentos para um arquivo Excel (.xlsx).
 * Respeita exatamente as colunas e formato definidos na Seção 6 do PRD.
 */
export function exportTransactionsToExcel(transactions: Transaction[], filename: string = 'TheParlor_Fluxo_de_Caixa.xlsx') {
  // Cabeçalho conforme Tabela do PRD (sem coluna Tag)
  const data = [
    [
      'Data',
      'Tipo',
      'Nome do Lançamento',
      'Valor',
      'Categoria',
      'Forma de Pagamento',
      'Descrição',
    ],
    ...transactions.map((tx) => [
      formatDateBR(tx.date), // DD/MM/AAAA
      tx.type === 'entrada' ? 'Entrada' : 'Saída',
      tx.title,
      tx.amount,
      tx.category,
      tx.paymentMethod || '',
      tx.description || '',
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Ajustar larguras das colunas
  worksheet['!cols'] = [
    { wch: 12 }, // Data
    { wch: 10 }, // Tipo
    { wch: 30 }, // Nome
    { wch: 14 }, // Valor
    { wch: 22 }, // Categoria
    { wch: 20 }, // Forma Pagamento
    { wch: 35 }, // Descrição
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Fluxo de Caixa');

  XLSX.writeFile(workbook, filename);
}

/**
 * Lê e valida um arquivo Excel ou CSV enviado pelo usuário para importação.
 */
export async function parseAndValidateExcel(
  file: File,
  existingTags: Tag[]
): Promise<ImportValidationResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) {
          reject(new Error('Erro ao ler o arquivo. Conteúdo vazio.'));
          return;
        }

        const workbook = XLSX.read(buffer, { type: 'binary', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Converter para matriz de strings/valores
        const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

        if (!rawData || rawData.length < 2) {
          resolve({
            validRows: [],
            errors: [
              {
                rowIndex: 1,
                reason: 'O arquivo não possui linhas de dados ou está sem cabeçalho.',
                data: null,
              },
            ],
          });
          return;
        }

        const validRows: ImportValidationResult['validRows'] = [];
        const errors: ImportValidationResult['errors'] = [];

        // Verificar se houver cabeçalho na linha 0
        const headerRow = rawData[0] ? rawData[0].map((h: any) => String(h).trim().toLowerCase()) : [];
        const hasTagHeader = headerRow.includes('tag');

        // Ignorar linha 0 (cabeçalho)
        for (let i = 1; i < rawData.length; i++) {
          const row = rawData[i];
          const rowNum = i + 1; // Número da linha no Excel (1-based)

          // Pular linhas completamente em branco
          if (!row || row.every((val) => val === undefined || val === null || String(val).trim() === '')) {
            continue;
          }

          const rawDate = row[0] ? String(row[0]).trim() : '';
          const rawType = row[1] ? String(row[1]).trim() : '';
          const rawTitle = row[2] ? String(row[2]).trim() : '';
          const rawAmount = row[3] !== undefined && row[3] !== null ? String(row[3]).trim() : '';
          const rawCategory = row[4] ? String(row[4]).trim() : '';
          
          let rawTag = '';
          let rawPayment = '';
          let rawDescription = '';

          if (hasTagHeader) {
            // Modelo legado onde a coluna F (index 5) era Tag
            rawTag = row[5] ? String(row[5]).trim() : '';
            rawPayment = row[6] ? String(row[6]).trim() : '';
            rawDescription = row[7] ? String(row[7]).trim() : '';
          } else {
            // Modelo atual: Coluna F (index 5) é Pagamento, Coluna G (index 6) é Descrição
            rawPayment = row[5] ? String(row[5]).trim() : '';
            rawDescription = row[6] ? String(row[6]).trim() : '';
          }

          // 1. Validações de campos obrigatórios
          if (!rawDate) {
            errors.push({ rowIndex: rowNum, reason: 'Campo "Data" está em branco.', data: row });
            continue;
          }
          if (!rawType) {
            errors.push({ rowIndex: rowNum, reason: 'Campo "Tipo" está em branco.', data: row });
            continue;
          }
          if (!rawTitle) {
            errors.push({ rowIndex: rowNum, reason: 'Campo "Nome do Lançamento" está em branco.', data: row });
            continue;
          }
          if (!rawAmount) {
            errors.push({ rowIndex: rowNum, reason: 'Campo "Valor" está em branco.', data: row });
            continue;
          }

          // 2. Validação do Tipo
          const normalizedType = rawType.toLowerCase();
          let type: TransactionType | null = null;
          if (normalizedType === 'entrada' || normalizedType === 'entradas') {
            type = 'entrada';
          } else if (normalizedType === 'saída' || normalizedType === 'saida' || normalizedType === 'saídas') {
            type = 'saida';
          } else {
            errors.push({
              rowIndex: rowNum,
              reason: `Tipo inválido "${rawType}". Deve ser "Entrada" ou "Saída".`,
              data: row,
            });
            continue;
          }

          // 3. Normalização e validação de Data (suporta DD/MM/AAAA, AAAA-MM-DD)
          let parsedDateIso = '';
          if (rawDate.includes('/')) {
            const parts = rawDate.split('/');
            if (parts.length === 3) {
              const day = parts[0].padStart(2, '0');
              const month = parts[1].padStart(2, '0');
              let year = parts[2];
              if (year.length === 2) year = '20' + year;
              parsedDateIso = `${year}-${month}-${day}`;
            }
          } else if (rawDate.includes('-')) {
            parsedDateIso = rawDate;
          }

          if (!parsedDateIso || isNaN(Date.parse(parsedDateIso))) {
            errors.push({
              rowIndex: rowNum,
              reason: `Formato de data inválido "${rawDate}". Use DD/MM/AAAA.`,
              data: row,
            });
            continue;
          }

          // 4. Validação do Valor
          // Tratar R$, vírgulas e pontos
          const cleanedAmountStr = rawAmount.replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
          const amount = parseFloat(cleanedAmountStr);
          if (isNaN(amount) || amount <= 0) {
            errors.push({
              rowIndex: rowNum,
              reason: `Valor numérico inválido "${rawAmount}".`,
              data: row,
            });
            continue;
          }

          // 5. Validação da Categoria
          if (!rawCategory) {
            errors.push({ rowIndex: rowNum, reason: 'Campo "Categoria" está em branco.', data: row });
            continue;
          }

          const categoryMatch = ALL_CATEGORIES.find(
            (c) => c.toLowerCase() === rawCategory.toLowerCase()
          );

          if (!categoryMatch) {
            errors.push({
              rowIndex: rowNum,
              reason: `Categoria "${rawCategory}" não bate com nenhuma categoria cadastrada no sistema.`,
              data: row,
            });
            continue;
          }

          // Se chegou até aqui, linha válida!
          validRows.push({
            date: parsedDateIso,
            type,
            title: rawTitle,
            amount,
            category: categoryMatch,
            tagCode: rawTag ? rawTag.toUpperCase() : '',
            paymentMethod: rawPayment || 'Outros',
            description: rawDescription,
          });
        }

        resolve({ validRows, errors });
      } catch (err: any) {
        reject(new Error('Falha ao processar o arquivo Excel: ' + (err.message || 'Formato desconhecido.')));
      }
    };

    reader.onerror = () => reject(new Error('Erro ao ler o arquivo selecionado.'));
    reader.readAsBinaryString(file);
  });
}
