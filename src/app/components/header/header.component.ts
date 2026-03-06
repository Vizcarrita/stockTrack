import { Component, inject } from '@angular/core';
import { InventoryService } from '../../core/services/inventory.service';
import * as XLSX from 'xlsx';
import { ExcelRow } from '../../core/models/inventory.model';

@Component({
    selector: 'app-header',
    standalone: true,
    templateUrl: './header.component.html',
    styleUrl: './header.component.css'
})
export class HeaderComponent {
    private inventoryService = inject(InventoryService);

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

            this.inventoryService.processData(json);
        };

        reader.readAsArrayBuffer(file);
        input.value = '';
    }
}
