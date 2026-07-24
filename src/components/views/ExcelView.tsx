import React, { useState, useRef } from 'react';
import { Transaction, Tag, ImportValidationResult } from '../../types';
import { exportTransactionsToExcel, parseAndValidateExcel } from '../../utils/excel';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowRight,
  Info,
} from 'lucide-react';

interface ExcelViewProps {
  transactions: Transaction[];
  tags: Tag[];
  onShowImportPreview: (result: ImportValidationResult) => void;
}

export const ExcelView: React.FC<ExcelViewProps> = ({
  transactions,
  tags,
  onShowImportPreview,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [excelError, setExcelError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const handleExportExcel = () => {
    exportTransactionsToExcel(
      transactions,
      `TheParlor_Fluxo_de_Caixa_${new Date().toISOString().substring(0, 10)}.xlsx`
    );
  };

  const processFile = async (file: File) => {
    if (!file) return;
    setIsParsingExcel(true);
    setExcelError('');

    try {
      const validationResult = await parseAndValidateExcel(file, tags);
      onShowImportPreview(validationResult);
    } catch (err: any) {
      setExcelError(err.message || 'Erro ao importar arquivo Excel.');
    } finally {
      setIsParsingExcel(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-gray-200 p-5 rounded-lg shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-[#E4D8BE]/20 border border-[#C19848]/20 text-[#C19848] flex items-center justify-center shrink-0">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Importar Lançamentos via Excel
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Carregue novos lançamentos in lote selecionando ou arrastando um arquivo Excel (.xlsx, .xls) ou CSV.
            </p>
          </div>
        </div>
      </div>

      {excelError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{excelError}</span>
        </div>
      )}

      {/* Main Grid: Import Box & Export Box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* IMPORT CONTAINER */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
              <Upload className="w-4 h-4" />
              <span>Importar Lançamentos de Planilha</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Arraste seu arquivo Excel (<strong>.xlsx</strong>, <strong>.xls</strong>) ou CSV para processar múltiplos lançamentos de uma só vez.
            </p>

            {/* Drag and Drop Zone */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                isDragOver
                  ? 'border-[#C19848] bg-[#E4D8BE]/15 scale-[0.99]'
                  : 'border-gray-300 hover:border-[#C19848] hover:bg-[#E4D8BE]/10 bg-gray-50/50'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-[#E4D8BE]/20 text-[#C19848] flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">
                  {isParsingExcel ? 'Lendo planilha...' : 'Clique para selecionar ou arraste o arquivo aqui'}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Formatos aceitos: .xlsx, .xls, .csv
                </p>
              </div>

              <button
                type="button"
                disabled={isParsingExcel}
                className="mt-2 bg-[#C19848] hover:bg-[#C19848]/90 text-[#203723] font-bold text-xs px-4 py-1.5 rounded-md shadow-2xs transition-all"
              >
                Selecionar Arquivo
              </button>
            </div>
          </div>

          <div className="p-3.5 bg-[#faf6ee] border border-[#C19848]/20 rounded-md text-[11px] text-gray-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Info className="w-3.5 h-3.5 text-[#C19848] shrink-0" />
              <span>Conferência antes da gravação</span>
            </div>
            <p className="text-gray-600">
              Após a leitura, uma tela de pré-visualização exibirá todas as linhas válidas e eventuais inconsistências para sua aprovação antes de salvar.
            </p>
          </div>
        </div>

        {/* EXPORT & MODEL INFORMATION CONTAINER */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#C19848] font-bold text-xs uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              <span>Estrutura e Modelo da Planilha</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Para garantir uma importação sem erros, sua planilha Excel deve conter as seguintes colunas na primeira linha (cabeçalho):
            </p>

            {/* Table of expected columns */}
            <div className="border border-gray-200 rounded-md overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-[9px] tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="p-2">Coluna</th>
                    <th className="p-2">Campo</th>
                    <th className="p-2">Formato / Exemplo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono text-[11px] text-gray-700">
                  <tr>
                    <td className="p-2 font-bold text-[#C19848]">A</td>
                    <td className="p-2">Data</td>
                    <td className="p-2">DD/MM/AAAA (ex: 20/07/2026)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-[#C19848]">B</td>
                    <td className="p-2">Tipo</td>
                    <td className="p-2">Entrada / Saída</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-[#C19848]">C</td>
                    <td className="p-2">Nome</td>
                    <td className="p-2">Vendas do Dia / Aluguel</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-[#C19848]">D</td>
                    <td className="p-2">Valor</td>
                    <td className="p-2">Numérico (ex: 1500.50)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-[#C19848]">E</td>
                    <td className="p-2">Categoria</td>
                    <td className="p-2">Vendas, Cozinha, Bar...</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-[#C19848]">F</td>
                    <td className="p-2">Pagamento</td>
                    <td className="p-2">PIX, Cartão, Dinheiro...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">
              Exportar dados existentes serve de modelo perfeito para futuras importações.
            </span>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 text-xs font-bold text-[#C19848] hover:text-[#C19848]/80 transition-colors cursor-pointer shrink-0"
            >
              <span>Baixar Modelo Atual</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
