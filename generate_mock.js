const XLSX = require('xlsx');

const data = [
    {
        "Material": "EMULTEX-500",
        "Descripción material": "Emultex Básico",
        "Almacén": "A001",
        "Libre utilización": 100,
        "Inspección calidad": 0,
        "Stock bloqueado": 50,
        "Lote": "J120923A2" // 12-09-2023 -> Vencido (9 meses = 12-06-2024)
    },
    {
        "Material": "ENALINE-300",
        "Descripción material": "Enaline Premium",
        "Almacén": "A001",
        "Libre utilización": 200,
        "Inspección calidad": 50,
        "Stock bloqueado": 0,
        "Lote": "111030B1" // 11-10-2030 -> Activo (10 meses = 11-08-2031)
    },
    {
        "Material": "PROTACOR",
        "Descripción material": "Protacor Plus",
        "Almacén": "A002",
        "Libre utilización": 300,
        "Inspección calidad": 0,
        "Stock bloqueado": 0,
        "Lote": "130225" // 13-02-2025 -> 12 months = 13-02-2026 -> VENCIDO (we are in March 2026)
    },
    {
        "Material": "MIXTO",
        "Descripción material": "Producto Mixto",
        "Almacén": "A002",
        "Libre utilización": 500,
        "Inspección calidad": 10,
        "Stock bloqueado": 0,
        "Lote": "010925" // 01-09-2025 -> 12 months = 01-09-2026 -> 6 months from March 5 2026 is Sep 5 2026. This expires Sep 1, 2026, so it's "Próximo a Vencer"
    },
    {
        "Material": "VITAMINOL",
        "Descripción material": "Vitaminol C",
        "Almacén": "A003",
        "Libre utilización": "1,000",
        "Inspección calidad": 0,
        "Stock bloqueado": 0,
        "Lote": "INVALIDO123" // Error Fecha
    }
];

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
XLSX.writeFile(wb, "mock_data.xlsx");
console.log("Mock data generated.");
