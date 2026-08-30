import * as XLSXModule from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const XLSX = XLSXModule.default || XLSXModule;

export const exportarPresupuestoExcel = (presupuesto, rubrosItems, esVenta = false, coeficiente = 1, notas = {}) => {
  try {
    if (!rubrosItems || rubrosItems.length === 0) {
      alert("No hay ítems disponibles para exportar.");
      return;
    }

    const datosExcel = [];

    datosExcel.push([presupuesto?.nombre || 'COTIZACIÓN DE OBRA', '', '', '', '']);
    datosExcel.push([`Código: ${presupuesto?.codigo || 'N/A'}`, '', '', `Fecha: ${presupuesto?.fecha || new Date().toLocaleDateString('es-AR')}`, '']);
    datosExcel.push([]);

    let granTotal = 0;

    rubrosItems.forEach((rubroObj, index) => {
      const tareas = rubroObj.tareas || [];
      if (tareas.length === 0) return;

      datosExcel.push([`N° ${index + 1} - ${rubroObj.rubro || 'RUBRO'}`, '', '', '', '']);
      datosExcel.push(["Tareas", "Unidades", "Cantidad", "Precio Unitario", "Precio Total"]);

      let subtotalRubro = 0;

      tareas.forEach(t => {
        const cant = Number(t.cantidad || 0);
        const cUnit = Number(t.costo_unitario || 0);
        const pUnit = esVenta ? cUnit * coeficiente : cUnit;
        const subtotal = cant * pUnit;
        subtotalRubro += subtotal;

        datosExcel.push([
          t.tarea || '---',
          (t.unidad || 'GL').toUpperCase(),
          cant,
          pUnit,
          subtotal
        ]);
      });

      granTotal += subtotalRubro;

      const labelSubtotal = esVenta ? "Subtotal Venta Rubro:" : "Subtotal Costo Rubro:";
      datosExcel.push(['', '', '', labelSubtotal, subtotalRubro]);
      datosExcel.push([]);
    });

    datosExcel.push([]);
    datosExcel.push(['', '', '', 'TOTAL GENERAL:', granTotal]);
    datosExcel.push([]);

    if (notas) {
      if (notas.impuestos) datosExcel.push(['IMPUESTOS:', notas.impuestos]);
      if (notas.plazo) datosExcel.push(['PLAZO DE EJECUCIÓN DE OBRA:', notas.plazo]);
      if (notas.condiciones) datosExcel.push(['CONDICIONES COMERCIALES:', notas.condiciones]);
      if (notas.consideraciones) datosExcel.push(['CONSIDERACIONES GENERALES:', notas.consideraciones]);
      if (notas.exclusiones) datosExcel.push(['EXCLUSIONES:', notas.exclusiones]);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(datosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, esVenta ? "Presupuesto Venta" : "Presupuesto Costos");
    
    const tipoSufijo = esVenta ? 'VENTA' : 'COSTOS';
    XLSX.writeFile(workbook, `Presupuesto_${presupuesto?.codigo || 'Detalle'}_${tipoSufijo}.xlsx`);
  } catch (error) {
    console.error("Error al exportar Excel:", error);
    alert("No se pudo generar el archivo Excel.");
  }
};

export const exportarPresupuestoPDF = async (presupuesto, cliente, rubrosItems, esVenta = false, coeficiente = 1, notas = {}) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 14;

    // 1) Logo SICE S.A. (Cargado primero para calcular proporciones originales reales)
    let logoWidth = 45;
    let logoHeight = 16;
    let logoDataUrl = null;

    try {
      const response = await fetch('/logo-07.png');
      if (response.ok) {
        const blob = await response.blob();
        logoDataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });

        // Obtener dimensiones originales respetando aspecto
        await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const aspect = img.width / img.height;
            logoHeight = 15; // Altura fija de referencia
            logoWidth = logoHeight * aspect; // Ancho proporcional automático
            resolve();
          };
          img.onerror = () => resolve();
          img.src = logoDataUrl;
        });
      }
    } catch (e) {
      console.error("No se pudo cargar el logo de forma dinámica:", e);
    }

    // Coordenada X derecha para alinear perfectamente el logo al margen (respetando los 14mm de margen derecho)
    const logoX = pageWidth - 14 - logoWidth;

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', logoX, currentY - 1, logoWidth, logoHeight);
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59);
      doc.text("SICE S.A.", pageWidth - 14, currentY + 10, { align: 'right' });
    }

    // 2) Encabezado izquierdo (Badge de Código y Título con Flexbox emulado / limites de ancho para evitar choque con el logo)
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(14, currentY, 42, 7, 1, 1, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9);
    doc.text(presupuesto?.codigo || 'CL004-OB002', 17, currentY + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    
    // Ancho máximo disponible para el título para que nunca colisione con el logo de la derecha
    const maxTituloWidth = logoX - 20; 
    const tituloTexto = presupuesto?.nombre || 'Cotización Obra';
    
    // Dividir o truncar inteligentemente si es muy largo, o usar splitTextToSize limitado a 1 línea
    const tituloLineas = doc.splitTextToSize(tituloTexto, maxTituloWidth);
    doc.text(tituloLineas[0], 60, currentY + 5);

    // 3) Obra y Cliente
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const infoObraCliente = `Obra: ${presupuesto?.obra_nombre || 'Ampliacion Sala de Cargas Baterias'}   •   Cliente: ${cliente?.razon_social || cliente?.nombre || 'LDC ARGENTINA S.A.'}`;
    const infoObraClienteLineas = doc.splitTextToSize(infoObraCliente, pageWidth - 28);
    doc.text(infoObraClienteLineas, 14, currentY + 12);

    // 4) Fecha
    const fechaTexto = presupuesto?.fecha || new Date().toLocaleDateString('es-AR');
    doc.text(`Fecha: ${fechaTexto}`, 14, currentY + 19);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, currentY + 24, pageWidth - 14, currentY + 24);

    currentY += 30;

    let granTotal = 0;

    // 5) Rubro por Rubro (Evitando que se corten entre páginas con rowPageBreak: 'avoid')
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

      if (currentY + 20 + (tareas.length * 8) > 270) {
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

      autoTable(doc, {
        startY: currentY,
        head: [["Tareas", "Unidades", "Cantidad", "Precio Unitario", "Precio Total"]],
        body: tableRows,
        theme: 'grid',
        rowPageBreak: 'avoid',
        headStyles: { fillColor: [203, 213, 225], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
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

    if (currentY > 245) {
      doc.addPage();
      currentY = 20;
    }

    // 6) Cuadro negro para el Total General
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(14, currentY, pageWidth - 28, 14, 2, 2, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL GENERAL:", 20, currentY + 9);

    doc.setFontSize(11);
    doc.setTextColor(250, 204, 21);
    doc.text(
      `$ ${granTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      pageWidth - 20, 
      currentY + 9, 
      { align: 'right' }
    );

    currentY += 20;

    // 7) Sección de Condiciones y Consideraciones Finales en PDF
    if (currentY > 210) {
      doc.addPage();
      currentY = 20;
    }

    const notasList = [
      { label: "IMPUESTOS:", text: notas.impuestos },
      { label: "PLAZO DE EJECUCIÓN DE OBRA:", text: notas.plazo },
      { label: "CONDICIONES COMERCIALES:", text: notas.condiciones },
      { label: "CONSIDERACIONES GENERALES:", text: notas.consideraciones },
      { label: "EXCLUSIONES:", text: notas.exclusiones }
    ];

    notasList.forEach(n => {
      if (!n.text) return; // Si no hay texto en la nota, la omitimos para ahorrar espacio
      if (currentY > 275) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(n.label, 14, currentY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const splitText = doc.splitTextToSize(n.text, pageWidth - 70);
      doc.text(splitText, 65, currentY);

      currentY += Math.max(6, splitText.length * 4) + 3;
    });

    // 8) Numeración de páginas automática al pie
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 20, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
    }

    const tipoSufijo = esVenta ? 'VENTA' : 'COSTOS';
    doc.save(`Presupuesto_${presupuesto?.codigo || 'Detalle'}_${tipoSufijo}.pdf`);
  } catch (error) {
    console.error("Error al exportar PDF:", error);
    alert("No se pudo generar el archivo PDF.");
  }
};