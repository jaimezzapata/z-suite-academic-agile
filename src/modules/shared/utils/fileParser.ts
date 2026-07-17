import * as XLSX from "xlsx";

/**
 * Parsea un archivo Excel (.xlsx, .xls) o JSON (.json) y retorna un array de filas genéricas.
 */
export const parseExcelOrJsonFile = (file: File): Promise<any[]> => {
  return new Promise<any[]>((resolve, reject) => {
    const reader = new FileReader();
    const extension = file.name.split(".").pop()?.toLowerCase();
    
    if (extension === "json") {
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          resolve(Array.isArray(json) ? json : [json]);
        } catch (err: any) {
          reject(new Error("Error al analizar archivo JSON: " + err.message));
        }
      };
      reader.onerror = () => reject(new Error("Error al leer el archivo JSON"));
      reader.readAsText(file);
    } else if (extension === "xlsx" || extension === "xls") {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet);
          resolve(rawRows);
        } catch (err: any) {
          reject(new Error("Error al analizar archivo Excel: " + err.message));
        }
      };
      reader.onerror = () => reject(new Error("Error al leer el archivo Excel"));
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error("Formato de archivo no soportado. Suba un archivo .json o .xlsx"));
    }
  });
};
