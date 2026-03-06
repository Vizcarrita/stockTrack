import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryService } from '../../core/services/inventory.service';
import { ProcessedItem } from '../../core/models/inventory.model';

@Component({
    selector: 'app-inventory-table',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './inventory-table.component.html',
    styleUrl: './inventory-table.component.css'
})
export class InventoryTableComponent {
    inventoryService = inject(InventoryService);

    onManualDateChange(item: ProcessedItem, event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.value) {
            this.inventoryService.updateManualDate(item, input.value);
        }
    }
}
