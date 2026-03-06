import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService } from '../../core/services/inventory.service';

@Component({
    selector: 'app-filters',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './filters.component.html',
    styleUrl: './filters.component.css'
})
export class FiltersComponent {
    inventoryService = inject(InventoryService);
}
