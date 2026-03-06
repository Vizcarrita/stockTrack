export interface ExcelRow {
    Material: string;
    'Descripción material': string;
    Almacén: string;
    'Libre utilización': number | string;
    'Inspecc.de calidad': number | string;
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
