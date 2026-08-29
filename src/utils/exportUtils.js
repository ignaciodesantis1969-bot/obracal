import * as XLSXModule from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const XLSX = XLSXModule.default || XLSXModule;

export const exportarPresupuestoExcel = (presupuesto, rubrosItems, esVenta = false, coeficiente = 1) => {
  try {
    if (!rubrosItems || rubrosItems.length === 0) {
      alert("No hay ítems disponibles para exportar.");
      return;
    }

    const datosFormateados = rubrosItems.flatMap(rubro => 
      (rubro.tareas || []).map(t => {
        const cant = Number(t.cantidad || 0);
        const cUnit = Number(t.costo_unitario || 0);
        const pUnit = esVenta ? cUnit * coeficiente : cUnit;
        return {
          Rubro: rubro.rubro,
          Tareas: t.tarea || '---',
          Unidades: (t.unidad || 'GL').toUpperCase(),
          Cantidad: cant,
          'Precio Unitario': pUnit,
          'Precio Total': cant * pUnit
        };
      })
    );

    const worksheet = XLSX.utils.json_to_sheet(datosFormateados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Presupuesto");
    
    XLSX.writeFile(workbook, `Presupuesto_${presupuesto?.codigo || 'Detalle'}.xlsx`);
  } catch (error) {
    console.error("Error al exportar Excel:", error);
    alert("No se pudo generar el archivo Excel.");
  }
};

export const exportarPresupuestoPDF = (presupuesto, cliente, rubrosItems, esVenta = false, coeficiente = 1) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 14;

    // Encabezado superior
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(14, currentY, 38, 7, 1, 1, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    doc.text(presupuesto?.codigo || 'CL004-OB002', 17, currentY + 5);

    doc.setFillColor(239, 246, 255);
    doc.roundedRect(55, currentY, 12, 7, 1, 1, 'F');
    doc.setTextColor(29, 78, 216);
    doc.text(presupuesto?.version || 'V1', 58, currentY + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(presupuesto?.nombre || 'Cotización Obra', 72, currentY + 5);

    const fechaTexto = presupuesto?.fecha || new Date().toLocaleDateString('es-AR');
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(pageWidth - 45, currentY - 1, 31, 8, 2, 2, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(fechaTexto, pageWidth - 40, currentY + 4.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text("SICE SA", pageWidth - 25, currentY + 14, { align: 'right' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Obra: ${presupuesto?.obra_nombre || 'Ampliacion Sala de Cargas Baterias'}   •   Cliente: ${cliente?.razon_social || cliente?.nombre || 'LDC ARGENTINA S.A.'}`, 14, currentY + 14);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, currentY + 20, pageWidth - 14, currentY + 20);

    currentY += 26;

    let granTotal = 0;

    // Iterar rubro por rubro
    (rubrosItems || []).forEach((rubroObj, index) => {
      const tareas = rubroObj.tareas || [];
      if (tareas.length === 0) return;

      let subtotalRubro = 0;
      const tableRows = tareas.map(t => {
        const cant = Number(t.cantidad || 0);
        const cUnit = Number(t.costo_unitario || 0);
        const pUnit = esVenta ? cUnit * coeficiente : cUnit;
        const subtotal = cant * pUnit;
        subtotalRubro += subtotal;

        return [
          t.tarea || '---',
          (t.unidad || 'GL').toUpperCase(),
          cant,
          `$ ${pUnit.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `$ ${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ];
      });

      granTotal += subtotalRubro;

      // Verificar espacio en página
      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }

      // Tarjeta oscura redondeada para el título del rubro
      doc.setFillColor(30, 41, 59);
      doc.roundedRect(14, currentY, pageWidth - 28, 9, 2, 2, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`N° ${index + 1}    ${rubroObj.rubro || 'RUBRO'}`, 18, currentY + 6);

      doc.setFontSize(8);
      doc.setTextColor(250, 204, 21);
      const labelTotal = esVenta ? "Venta: " : "Costo: ";
      doc.text(`${labelTotal}$ ${subtotalRubro.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 18, currentY + 6, { align: 'right' });

      currentY += 10;

      // Tabla con los encabezados solicitados: Tareas, Unidades, Cantidad, Precio Unitario, Precio Total
      autoTable(doc, {
        startY: currentY,
        head: [["Tareas", "Unidades", "Cantidad", "Precio Unitario", "Precio Total"]],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [248, 250, 252], textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 35, halign: 'right' },
          4: { cellWidth: 35, halign: 'right' }
        },
        styles: { cellPadding: 3 },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 8;
    });

    // Total general al pie
    if (currentY > 260) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `TOTAL GENERAL: $ ${granTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      pageWidth - 14, 
      currentY + 5, 
      { align: 'right' }
    );

    doc.save(`Presupuesto_${presupuesto?.codigo || 'Detalle'}.pdf`);
  } catch (error) {
    console.error("Error al exportar PDF:", error);
    alert("No se pudo generar el archivo PDF.");
  }
};