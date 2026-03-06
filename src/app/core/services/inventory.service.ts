import { Injectable, signal, computed } from '@angular/core';
import { ExcelRow, ProcessedItem } from '../models/inventory.model';
import { addMonths, isBefore, startOfDay } from 'date-fns';

@Injectable({
    providedIn: 'root'
})
export class InventoryService {
    // state
    items = signal<ProcessedItem[]>([]);
    lastUpdate = signal<Date | null>(null);

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

    kpiVencidos = computed(() => this.filteredItems().filter(i => i.estado === 'VENCIDO').length);
    kpiProximos = computed(() => this.filteredItems().filter(i => i.estado === 'Próximo a Vencer').length);
    kpiTotal = computed(() => this.filteredItems().reduce((acc, curr) => acc + curr.cantidad, 0));

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

    processData(rows: ExcelRow[]) {
        // Dynamic date based on user's timezone / local system
        const today = startOfDay(new Date());
        const next6Months = addMonths(today, 6);

        const processed = rows.map((row, index) => {
            const qty = this.parseNumber(row['Libre utilización']) +
                this.parseNumber(row['Inspección calidad']) +
                this.parseNumber(row['Stock bloqueado']);

            let match = null;
            if (typeof row.Lote === 'string') {
                const regex = /(?:^|\D)(\d{6})(?:\D|$)/;
                const execRes = regex.exec(row.Lote);
                if (execRes && execRes[1]) {
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
                const day = parseInt(match[1], 10);
                const month = parseInt(match[2], 10);
                const year = parseInt(`20${match[3]}`, 10);
                prodDate = new Date(year, month - 1, day);

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
        this.lastUpdate.set(new Date());
    }

    private parseNumber(val: any): number {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            const parsed = parseFloat(val.replace(/,/g, ''));
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    }

    updateManualDate(item: ProcessedItem, dateString: string) {
        if (!dateString) return;

        // YYYY-MM-DD
        const newDate = new Date(dateString + 'T00:00:00');
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
