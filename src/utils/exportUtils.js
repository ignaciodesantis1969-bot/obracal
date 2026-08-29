import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportarPresupuestoExcel = (presupuesto, items) => {
  const datosFormateados = items.map(item => ({
    Descripción: item.descripcion,
    Cantidad: item.cantidad,
    'Precio Unitario': Number(item.precio_unitario || 0),
    Subtotal: Number(item.subtotal || 0)
  }));

  const worksheet = XLSX.utils.json_to_sheet(datosFormateados);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Presupuesto");
  
  XLSX.writeFile(workbook, `Presupuesto_${presupuesto.codigo || 'Detalle'}.xlsx`);
};

export const exportarPresupuestoPDF = (presupuesto, cliente, items) => {
  const doc = new jsPDF();

  // Encabezado corporativo
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text("PRESUPUESTO DE OBRA", 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Comprobante N°: ${presupuesto.codigo || 'N/A'}`, 14, 28);
  doc.text(`Cliente: ${cliente?.razon_social || cliente?.nombre || '---'}`, 14, 34);
  doc.text(`Fecha: ${presupuesto.fecha || new Date().toLocaleDateString()}`, 14, 40);

  // Tabla de conceptos
  const tableColumn = ["Descripción", "Cant.", "P. Unitario", "Subtotal"];
  const tableRows = items.map(item => [
    item.descripcion,
    item.cantidad,
    `$ ${Number(item.precio_unitario || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
    `$ ${Number(item.subtotal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
  ]);

  doc.autoTable({
    startY: 48,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11] }, // Tono ámbar acorde al sistema
    styles: { fontSize: 9, cellPadding: 4 }
  });

  // Total final al pie de la tabla
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Total General: $ ${Number(presupuesto.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, 
    14, 
    finalY
  );

  doc.save(`Presupuesto_${presupuesto.codigo || 'Detalle'}.pdf`);
};