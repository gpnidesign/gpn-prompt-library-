import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { PromptEntry, PromptParameter } from '../types';

// Convert base64 to blob
const base64ToBlob = (base64: string): Blob => {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
};

// Get file extension from base64 data
const getImageExtension = (base64: string): string => {
  const match = base64.match(/^data:image\/(\w+);base64,/);
  return match ? match[1] : 'png';
};

// Convert base64 to ArrayBuffer
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const base64Data = base64.split(',')[1];
  const binaryString = window.atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// Export prompts to Excel + Images in DATA folder (as ZIP)
export const exportToExcelWithImages = async (prompts: PromptEntry[]) => {
  const zip = new JSZip();
  const dataFolder = zip.folder('DATA');

  if (!dataFolder) {
    throw new Error('Failed to create DATA folder');
  }

  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Prompts');

  // Define columns with specific widths
  worksheet.columns = [
    { header: 'No', key: 'no', width: 8 },
    { header: 'Before Image', key: 'beforeImage', width: 30 },
    { header: 'After Image', key: 'afterImage', width: 30 },
    { header: 'Prompt', key: 'prompt', width: 50 },
    { header: 'Model', key: 'model', width: 20 },
    { header: 'Tags', key: 'tags', width: 30 },
    { header: 'Parameters', key: 'parameters', width: 40 },
    { header: 'Created At', key: 'createdAt', width: 20 },
    { header: 'Favorite', key: 'favorite', width: 10 },
    { header: 'ID', key: 'id', width: 36 }
  ];

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 30;

  // Apply borders to header
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Process each prompt
  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    const promptNumber = i + 1;
    const excelRow = i + 2; // Excel row (1-indexed, row 1 is header)

    // Save images to DATA folder
    let beforeImageExt = '';
    let afterImageExt = '';

    if (prompt.beforeImage) {
      beforeImageExt = getImageExtension(prompt.beforeImage);
      const beforeBlob = base64ToBlob(prompt.beforeImage);
      dataFolder.file(`${promptNumber}_Before.${beforeImageExt}`, beforeBlob);
    }

    if (prompt.afterImage) {
      afterImageExt = getImageExtension(prompt.afterImage);
      const afterBlob = base64ToBlob(prompt.afterImage);
      dataFolder.file(`${promptNumber}_After.${afterImageExt}`, afterBlob);
    }

    // Add row data (without images first)
    const row = worksheet.addRow({
      no: promptNumber,
      beforeImage: '',
      afterImage: '',
      prompt: prompt.prompt,
      model: prompt.model || '',
      tags: prompt.tags.join(', '),
      parameters: prompt.parameters.map(p => `${p.key}: ${p.value}`).join('; '),
      createdAt: new Date(prompt.createdAt).toLocaleString(),
      favorite: prompt.isFavorite ? 'Yes' : 'No',
      id: prompt.id
    });

    // Set row height to accommodate images (200 points ≈ 2.8 inches)
    row.height = 200;

    // Apply styling to data cells
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Image columns should be centered
      if (colNumber === 2 || colNumber === 3) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      }
    });

    // Add images with proper positioning
    // For "Before Image" column (column B, index 1)
    if (prompt.beforeImage) {
      const beforeImageId = workbook.addImage({
        buffer: base64ToArrayBuffer(prompt.beforeImage),
        extension: beforeImageExt === 'jpg' ? 'jpeg' : beforeImageExt
      });

      // Position: tl = top-left, br = bottom-right (in pixels from cell corners)
      // Using exact cell boundaries with small margins
      worksheet.addImage(beforeImageId, {
        tl: { col: 1, row: excelRow - 1 },  // Column B (index 1), current row
        ext: { width: 220, height: 180 },    // Fixed size in pixels
        editAs: 'oneCell'
      });
    }

    // For "After Image" column (column C, index 2)
    if (prompt.afterImage) {
      const afterImageId = workbook.addImage({
        buffer: base64ToArrayBuffer(prompt.afterImage),
        extension: afterImageExt === 'jpg' ? 'jpeg' : afterImageExt
      });

      worksheet.addImage(afterImageId, {
        tl: { col: 2, row: excelRow - 1 },   // Column C (index 2), current row
        ext: { width: 220, height: 180 },    // Fixed size in pixels
        editAs: 'oneCell'
      });
    }
  }

  // Write Excel file to buffer
  const excelBuffer = await workbook.xlsx.writeBuffer();
  zip.file('PromptLibrary.xlsx', excelBuffer);

  // Generate and download ZIP file
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `GPN_Prompt_Library_${new Date().toISOString().split('T')[0]}.zip`);
};

// Import prompts from Excel file
export const importFromExcel = (file: File): Promise<PromptEntry[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.getWorksheet('Prompts');
      if (!worksheet) {
        reject(new Error('Prompts worksheet not found'));
        return;
      }

      const prompts: PromptEntry[] = [];

      // Skip header row (row 1)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const rowData = row.values as any[];

        // Parse parameters
        const parametersStr = rowData[7] as string;
        const parameters: PromptParameter[] = parametersStr
          ? parametersStr.split(';').map((p: string) => {
              const [key, value] = p.split(':').map((s: string) => s.trim());
              return {
                id: crypto.randomUUID(),
                key: key || '',
                value: value || ''
              };
            }).filter((p: PromptParameter) => p.key && p.value)
          : [];

        // Parse tags
        const tagsStr = rowData[6] as string;
        const tags: string[] = tagsStr
          ? tagsStr.split(',').map((t: string) => t.trim()).filter((t: string) => t)
          : [];

        prompts.push({
          id: rowData[10] as string || crypto.randomUUID(),
          prompt: rowData[4] as string || '',
          model: rowData[5] as string || undefined,
          tags,
          parameters,
          createdAt: rowData[8] ? new Date(rowData[8] as string).toISOString() : new Date().toISOString(),
          isFavorite: rowData[9] === 'Yes',
          // Images will be loaded separately from DATA folder
          beforeImage: undefined,
          afterImage: undefined
        });
      });

      resolve(prompts);
    } catch (error) {
      reject(error);
    }
  });
};

// Load images from DATA folder (for import functionality)
export const loadImagesFromFolder = async (files: FileList): Promise<Map<string, string>> => {
  const imageMap = new Map<string, string>();

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.type.startsWith('image/')) {
      const base64 = await readFileAsBase64(file);
      imageMap.set(file.name, base64);
    }
  }

  return imageMap;
};

// Match images to prompts based on naming convention (1_Before.jpeg, 1_After.jpeg)
export const matchImagesToPrompts = (prompts: PromptEntry[], imageMap: Map<string, string>): PromptEntry[] => {
  return prompts.map((prompt, index) => {
    const promptNumber = index + 1;
    let beforeImage = prompt.beforeImage;
    let afterImage = prompt.afterImage;

    // Try to find matching images
    imageMap.forEach((base64, filename) => {
      const match = filename.match(/^(\d+)_(Before|After)\./i);
      if (match) {
        const fileNumber = parseInt(match[1]);
        const type = match[2].toLowerCase();

        if (fileNumber === promptNumber) {
          if (type === 'before') {
            beforeImage = base64;
          } else if (type === 'after') {
            afterImage = base64;
          }
        }
      }
    });

    return {
      ...prompt,
      beforeImage,
      afterImage
    };
  });
};
