# StockTrack

StockTrack es una aplicación web desarrollada en **Angular** diseñada para optimizar la gestión de inventario y el seguimiento de lotes próximos a vencer o caducados.

## ¿Qué hace el proyecto?

La aplicación permite a los usuarios **subir un archivo Excel** (`.xlsx`, `.xls`, `.csv`) con el listado actual del inventario (incluyendo información como lote, cantidades libres/bloqueadas/inspección y código de material). A partir de estos datos, el sistema:

1. **Analiza el código de lote** para extraer automáticamente la fecha de producción.
2. **Calcula la fecha de vencimiento** basándose en el tipo de producto (p. ej. ANFO, EMULTEX, APD).
3. **Clasifica el estado** de cada lote en: `Vencido`, `Próximo a Vencer` (< 6 meses) o `Activo`. Si el lote tiene un formato desconocido, permite ingresar la fecha manualmente (`Error Fecha`).
4. **Visualiza y resume** la información mediante tarjetas de KPI (indicadores) y una tabla interactiva que incluye **paginación y filtros cruzados** por producto, estado y rangos de fechas.

---

Este proyecto fue generado usando [Angular CLI](https://github.com/angular/angular-cli) versión 21.2.1.

## Servidor de desarrollo

Para iniciar un servidor de desarrollo local, ejecuta:

```bash
ng serve
```

Una vez que el servidor esté en funcionamiento, abre tu navegador y visita `http://localhost:4200/`. La aplicación se recargará automáticamente cada vez que modifiques alguno de los archivos fuente.

## Ejecución de pruebas unitarias

Para ejecutar las pruebas unitarias con el entorno de pruebas [Vitest](https://vitest.dev/), usa el siguiente comando:

```bash
ng test
```
