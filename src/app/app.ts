import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { addMonths, isBefore, startOfDay } from 'date-fns';

export interface ExcelRow {
  Material: string;
  'Descripción material': string;
  Almacén: string;
  'Libre utilización': number | string;
  'Inspección calidad': number | string;
  'Stock bloqueado': number | string;
  Lote: string;
}

export interface ProcessedItem {
  id: string; // generated
  lote: string;
  producto: string;
  fechaProduccion: Date | null;
  fechaVencimiento: Date | null;
  estado: 'VENCIDO' | 'Próximo a Vencer' | 'Activo' | 'Error Fecha';
  cantidad: number;
  rawProductionDateError?: boolean;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  // state
  items = signal<ProcessedItem[]>([]);

  // filters
  filterProduct = signal<string>('Todos');
  filterStatus = signal<string>('Todos');
  filterDateFrom = signal<string>('');
  filterDateTo = signal<string>('');

  // pagination
  currentPage = signal<number>(1);
  itemsPerPage = 25;

  // derived state
  uniqueProducts = computed(() => {
    const prods = new Set(this.items().map(i => i.producto));
    return ['Todos', ...Array.from(prods).sort()];
  });

  filteredItems = computed(() => {
    let result = this.items();
    if (this.filterProduct() !== 'Todos') {
      result = result.filter(i => i.producto === this.filterProduct());
    }
    if (this.filterStatus() !== 'Todos') {
      result = result.filter(i => i.estado === this.filterStatus());
    }
    const dFrom = this.filterDateFrom() ? new Date(this.filterDateFrom()) : null;
    const dTo = this.filterDateTo() ? new Date(this.filterDateTo()) : null;

    // adjust time logic for end-of-day on "dTo" filtering
    if (dFrom) {
      result = result.filter(i => i.fechaProduccion && i.fechaProduccion >= dFrom);
    }
    if (dTo) {
      // user wants up to date X, so add 1 day and check < 
      const nextDay = new Date(dTo);
      nextDay.setDate(nextDay.getDate() + 1);
      result = result.filter(i => i.fechaProduccion && i.fechaProduccion < nextDay);
    }

    return result;
  });

  paginatedItems = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredItems().slice(start, start + this.itemsPerPage);
  });

  totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredItems().length / this.itemsPerPage));
  });

  // actions
  updateFilter(type: 'product' | 'status' | 'dateFrom' | 'dateTo', value: string) {
    if (type === 'product') this.filterProduct.set(value);
    if (type === 'status') this.filterStatus.set(value);
    if (type === 'dateFrom') this.filterDateFrom.set(value);
    if (type === 'dateTo') this.filterDateTo.set(value);

    // reset pagination on any filter change
    this.currentPage.set(1);
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  kpiVencidos = computed(() => this.filteredItems().filter(i => i.estado === 'VENCIDO').length);
  kpiProximos = computed(() => this.filteredItems().filter(i => i.estado === 'Próximo a Vencer').length);
  kpiTotal = computed(() => this.filteredItems().reduce((acc, curr) => acc + curr.cantidad, 0));

  // logic
  onFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      this.processData(json);
    };

    reader.readAsArrayBuffer(file);
    // clear input
    input.value = '';
  }

  processData(rows: ExcelRow[]) {
    // Dynamic date based on user's timezone / local system
    const today = startOfDay(new Date());
    const next6Months = addMonths(today, 6);

    const processed = rows.map((row, index) => {
      const qty = this.parseNumber(row['Libre utilización']) +
        this.parseNumber(row['Inspección calidad']) +
        this.parseNumber(row['Stock bloqueado']);

      // Pattern: exactly 6 digits not preceded or followed by a digit. This handles "P250226B2" or "250226P25". (Regex (?<!\d)(\d{2})(\d{2})(\d{2})(?!\d))
      // Since Safari might not like negative lookbehinds in old versions, let's use a simpler approach:
      // Match all sequences of 6 digits.
      let match = null;
      if (typeof row.Lote === 'string') {
        const regex = /(?:^|\D)(\d{6})(?:\D|$)/;
        const execRes = regex.exec(row.Lote);
        if (execRes && execRes[1]) {
          // extract those 6 digits
          const d6 = execRes[1];
          match = ['', d6.slice(0, 2), d6.slice(2, 4), d6.slice(4, 6)];
        }
      }

      let prodDate: Date | null = null;
      let expDate: Date | null = null;
      let state: ProcessedItem['estado'] = 'Error Fecha';

      let matVal = row.Material;
      if (matVal === undefined || matVal === null) matVal = '';
      let prodPrefix = String(matVal).split('-')[0].trim().toUpperCase();

      const descVal = row['Descripción material'];
      const desc = typeof descVal === 'string' ? descVal.toUpperCase() : '';
      if (desc.includes('EMULTEX CN') || prodPrefix.includes('EMULTEX CN')) prodPrefix = 'EMULTEX CN';
      else if (desc.includes('EMULTEX PG') || prodPrefix.includes('EMULTEX PG')) prodPrefix = 'EMULTEX PG';
      else if (desc.includes('EMULTEX') || prodPrefix.includes('EMULTEX')) prodPrefix = 'EMULTEX';
      else if (desc.includes('ENALINE') || prodPrefix.includes('ENALINE')) prodPrefix = 'ENALINE';
      else if (desc.includes('ANFO') || prodPrefix.includes('ANFO')) prodPrefix = 'ANFO';
      else if (['APD', 'SISMOLITA', 'X-BOOSTER', 'PENTEX', 'PENTOLITA'].some(p => desc.includes(p) || prodPrefix.includes(p))) prodPrefix = 'APD';
      else if (desc) {
        prodPrefix = desc.split(' ')[0] || prodPrefix;
      }

      if (!prodPrefix) prodPrefix = 'Desconocido';

      if (match) {
        // match = [..., DD, MM, YY]
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = parseInt(`20${match[3]}`, 10);
        prodDate = new Date(year, month - 1, day);

        // invalid date catch (e.g. Month 13)
        if (isNaN(prodDate.getTime()) || month > 12 || month < 1 || day > 31) {
          prodDate = null;
        }
      }

      if (prodDate) {
        let months = 12; // default
        if (prodPrefix === 'ANFO') months = 6;
        else if (prodPrefix === 'EMULTEX CN') months = 9;
        else if (prodPrefix === 'EMULTEX PG') months = 12;
        else if (prodPrefix === 'EMULTEX') months = 9;
        else if (prodPrefix === 'ENALINE') months = 10;
        else if (prodPrefix === 'APD') months = 60;

        expDate = addMonths(prodDate, months);

        if (isBefore(expDate, today)) {
          state = 'VENCIDO';
        } else if (isBefore(expDate, next6Months)) {
          state = 'Próximo a Vencer';
        } else {
          state = 'Activo';
        }
      }

      return {
        id: `img-${index}`,
        lote: String(row.Lote || 'N/A'),
        producto: prodPrefix,
        fechaProduccion: prodDate,
        fechaVencimiento: expDate,
        estado: state,
        cantidad: qty,
        rawProductionDateError: !prodDate
      } as ProcessedItem;
    });

    this.items.set(processed);
  }

  parseNumber(val: any): number {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const parsed = parseFloat(val.replace(/,/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  updateManualDate(item: ProcessedItem, event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.value) return;

    // YYYY-MM-DD
    const newDate = new Date(input.value + 'T00:00:00');

    const today = startOfDay(new Date());
    const next6Months = addMonths(today, 6);

    // recalculate
    let months = 12;
    if (item.producto === 'ANFO') months = 6;
    else if (item.producto === 'EMULTEX CN') months = 9;
    else if (item.producto === 'EMULTEX PG') months = 12;
    else if (item.producto === 'EMULTEX') months = 9;
    else if (item.producto === 'ENALINE') months = 10;
    else if (item.producto === 'APD') months = 60;

    const expDate = addMonths(newDate, months);

    let state: ProcessedItem['estado'] = 'Activo';
    if (isBefore(expDate, today)) {
      state = 'VENCIDO';
    } else if (isBefore(expDate, next6Months)) {
      state = 'Próximo a Vencer';
    }

    // Update state
    this.items.update(current =>
      current.map(i => {
        if (i.id === item.id) {
          return {
            ...i,
            fechaProduccion: newDate,
            fechaVencimiento: expDate,
            estado: state,
            rawProductionDateError: false
          };
        }
        return i;
      })
    );
  }
}
