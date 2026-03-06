import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { KpiDashboardComponent } from './components/kpi-dashboard/kpi-dashboard.component';
import { FiltersComponent } from './components/filters/filters.component';
import { InventoryTableComponent } from './components/inventory-table/inventory-table.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HeaderComponent, KpiDashboardComponent, FiltersComponent, InventoryTableComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App { }
