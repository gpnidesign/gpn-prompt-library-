import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PromptEntry } from '../types';

// Helper to get image dimensions
const getImageDimensions = (imageData: string): Promise<{ width: number; height: number; fileSize: string }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const base64Length = imageData.replace(/^data:image\/\w+;base64,/, '').length;
      const sizeInBytes = (base64Length * 3) / 4;

      let fileSize: string;
      if (sizeInBytes < 1024) {
        fileSize = `${sizeInBytes.toFixed(0)} B`;
      } else if (sizeInBytes < 1024 * 1024) {
        fileSize = `${(sizeInBytes / 1024).toFixed(2)} KB`;
      } else {
        fileSize = `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
      }

      resolve({
        width: img.width,
        height: img.height,
        fileSize
      });
    };
    img.src = imageData;
  });
};

export const generatePDF = async (entry: PromptEntry) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // ========== HEADER ==========
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235); // Blue
  doc.text('PROMPT ENTRY REPORT', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 12;

  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const date = new Date(entry.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Created: ${date}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;
  doc.setTextColor(0, 0, 0);

  // ========== INFO SECTION ==========
  // Model
  if (entry.model) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Model:', margin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(entry.model, margin + 25, yPosition);
    yPosition += 8;
  }

  // Tags
  if (entry.tags.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Tags:', margin, yPosition);
    doc.setFont('helvetica', 'normal');

    const tagsText = entry.tags.join(', ');
    const tagsLines = doc.splitTextToSize(tagsText, pageWidth - margin - 30);
    doc.text(tagsLines, margin + 25, yPosition);
    yPosition += (tagsLines.length * 5) + 5;
  }

  yPosition += 5;

  // ========== PARAMETERS TABLE ==========
  if (entry.parameters.length > 0) {
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('PARAMETERS', margin, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 5;

    const tableData = entry.parameters.map(p => [p.key, p.value]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Parameter', 'Value']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235],
        fontSize: 10,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      margin: { left: margin, right: margin },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 12;
  }

  // ========== PROMPT SECTION ==========
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('PROMPT', margin, yPosition);
  doc.setTextColor(0, 0, 0);
  yPosition += 7;

  doc.setFontSize(9);
  doc.setFont('courier', 'normal');
  const promptLines = doc.splitTextToSize(entry.prompt, pageWidth - (margin * 2) - 6);
  const promptBoxHeight = (promptLines.length * 4) + 8;

  // Check if we need a new page for the prompt
  if (yPosition + promptBoxHeight > pageHeight - 40) {
    doc.addPage();
    yPosition = margin;
  }

  // Draw prompt box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(margin, yPosition - 3, pageWidth - (margin * 2), promptBoxHeight, 2, 2, 'FD');

  doc.setTextColor(55, 65, 81);
  doc.text(promptLines, margin + 3, yPosition + 2);
  doc.setTextColor(0, 0, 0);
  yPosition += promptBoxHeight + 12;

  // ========== IMAGES SECTION ==========
  const hasImages = entry.beforeImage || entry.afterImage;

  if (hasImages) {
    // Check if we need a new page for images
    if (yPosition + 120 > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('IMAGES', margin, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 10;

    const imgWidth = 75;
    const imgHeight = 75;
    const spacing = 10;
    let xPosition = margin;

    // Before Image
    if (entry.beforeImage) {
      try {
        const imgInfo = await getImageDimensions(entry.beforeImage);

        // Title
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235);
        doc.text('BEFORE', xPosition + (imgWidth / 2), yPosition, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        // Border
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(xPosition, yPosition + 3, imgWidth, imgHeight, 2, 2, 'FD');

        // Image
        doc.addImage(entry.beforeImage, 'JPEG', xPosition + 2, yPosition + 5, imgWidth - 4, imgHeight - 4);

        // Info box
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setFillColor(0, 0, 0, 0.7);
        doc.rect(xPosition, yPosition + imgHeight - 12, imgWidth, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(`${imgInfo.width} × ${imgInfo.height} px`, xPosition + (imgWidth / 2), yPosition + imgHeight - 7, { align: 'center' });
        doc.text(imgInfo.fileSize, xPosition + (imgWidth / 2), yPosition + imgHeight - 3, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        xPosition += imgWidth + spacing;
      } catch (error) {
        console.error('Error adding before image:', error);
      }
    }

    // After Image
    if (entry.afterImage) {
      try {
        const imgInfo = await getImageDimensions(entry.afterImage);

        // Title
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(34, 197, 94); // Green
        doc.text('AFTER', xPosition + (imgWidth / 2), yPosition, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        // Border
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(xPosition, yPosition + 3, imgWidth, imgHeight, 2, 2, 'FD');

        // Image
        doc.addImage(entry.afterImage, 'JPEG', xPosition + 2, yPosition + 5, imgWidth - 4, imgHeight - 4);

        // Info box
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setFillColor(0, 0, 0, 0.7);
        doc.rect(xPosition, yPosition + imgHeight - 12, imgWidth, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(`${imgInfo.width} × ${imgInfo.height} px`, xPosition + (imgWidth / 2), yPosition + imgHeight - 7, { align: 'center' });
        doc.text(imgInfo.fileSize, xPosition + (imgWidth / 2), yPosition + imgHeight - 3, { align: 'center' });
        doc.setTextColor(0, 0, 0);
      } catch (error) {
        console.error('Error adding after image:', error);
      }
    }
  }

  // ========== FOOTER ==========
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);

    // Page number
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    // Generated by
    doc.text(
      'Generated by GPN Prompt Library',
      pageWidth - margin,
      pageHeight - 10,
      { align: 'right' }
    );
  }

  // Generate filename
  const fileName = `prompt-${new Date(entry.createdAt).toISOString().split('T')[0]}-${entry.id.substring(0, 8)}.pdf`;

  // Save the PDF
  doc.save(fileName);
};

export const generateBulkPDF = async (entries: PromptEntry[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // ========== COVER PAGE ==========
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('PROMPT LIBRARY', pageWidth / 2, 60, { align: 'center' });
  doc.text('REPORT', pageWidth / 2, 75, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Total Entries: ${entries.length}`, pageWidth / 2, 100, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 110, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  doc.addPage();

  // ========== SUMMARY TABLE ==========
  let yPosition = margin;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('SUMMARY', margin, yPosition);
  doc.setTextColor(0, 0, 0);
  yPosition += 10;

  const tableData = entries.map((entry, index) => [
    index + 1,
    entry.model || 'N/A',
    entry.tags.slice(0, 3).join(', ') || 'None',
    new Date(entry.createdAt).toLocaleDateString(),
    entry.isFavorite ? '★' : '-'
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['#', 'Model', 'Tags', 'Created', 'Fav']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      fontSize: 10,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 2
    },
    margin: { left: margin, right: margin },
  });

  // ========== DETAIL PAGES ==========
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    doc.addPage();
    yPosition = margin;

    // Entry header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(`ENTRY ${index + 1} OF ${entries.length}`, margin, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 12;

    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const date = new Date(entry.createdAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`Created: ${date}`, margin, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 10;

    // Model
    if (entry.model) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Model:', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(entry.model, margin + 22, yPosition);
      yPosition += 7;
    }

    // Tags
    if (entry.tags.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Tags:', margin, yPosition);
      doc.setFont('helvetica', 'normal');
      const tagsText = entry.tags.join(', ');
      const tagsLines = doc.splitTextToSize(tagsText, pageWidth - margin - 25);
      doc.text(tagsLines, margin + 22, yPosition);
      yPosition += (tagsLines.length * 5) + 3;
    }

    yPosition += 3;

    // Prompt
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('PROMPT', margin, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 5;

    doc.setFontSize(8);
    doc.setFont('courier', 'normal');
    const promptLines = doc.splitTextToSize(entry.prompt, pageWidth - (margin * 2) - 4);
    const maxLines = 20; // Limit lines for bulk export
    const displayLines = promptLines.slice(0, maxLines);
    const promptBoxHeight = (displayLines.length * 3.5) + 6;

    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(margin, yPosition - 2, pageWidth - (margin * 2), promptBoxHeight, 1, 1, 'FD');
    doc.setTextColor(55, 65, 81);
    doc.text(displayLines, margin + 2, yPosition + 1);

    if (promptLines.length > maxLines) {
      doc.setFont('helvetica', 'italic');
      doc.text('... (truncated)', margin + 2, yPosition + promptBoxHeight - 3);
    }

    doc.setTextColor(0, 0, 0);
    yPosition += promptBoxHeight + 8;

    // Images (if space allows)
    const hasImages = entry.beforeImage || entry.afterImage;
    if (hasImages && yPosition + 65 <= pageHeight - 30) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text('IMAGES', margin, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 7;

      const imgWidth = 55;
      const imgHeight = 55;
      let xPosition = margin;

      if (entry.beforeImage) {
        try {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Before', xPosition + (imgWidth / 2), yPosition, { align: 'center' });
          doc.setDrawColor(200, 200, 200);
          doc.roundedRect(xPosition, yPosition + 2, imgWidth, imgHeight, 1, 1, 'D');
          doc.addImage(entry.beforeImage, 'JPEG', xPosition + 1, yPosition + 3, imgWidth - 2, imgHeight - 2);
          xPosition += imgWidth + 8;
        } catch (error) {
          console.error('Error adding before image to bulk PDF:', error);
        }
      }

      if (entry.afterImage) {
        try {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('After', xPosition + (imgWidth / 2), yPosition, { align: 'center' });
          doc.setDrawColor(200, 200, 200);
          doc.roundedRect(xPosition, yPosition + 2, imgWidth, imgHeight, 1, 1, 'D');
          doc.addImage(entry.afterImage, 'JPEG', xPosition + 1, yPosition + 3, imgWidth - 2, imgHeight - 2);
        } catch (error) {
          console.error('Error adding after image to bulk PDF:', error);
        }
      }
    }
  }

  // ========== FOOTER ==========
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      'GPN Prompt Library',
      pageWidth - margin,
      pageHeight - 10,
      { align: 'right' }
    );
  }

  const fileName = `prompt-library-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
