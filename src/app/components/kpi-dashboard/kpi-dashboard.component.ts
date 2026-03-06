import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryService } from '../../core/services/inventory.service';

@Component({
    selector: 'app-kpi-dashboard',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './kpi-dashboard.component.html',
    styleUrl: './kpi-dashboard.component.css'
})
export class KpiDashboardComponent {
    inventoryService = inject(InventoryService);
}
