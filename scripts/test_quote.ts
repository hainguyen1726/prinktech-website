import { generateExcelQuote, generatePdfQuote } from '../src/lib/quoteGenerator';
import path from 'path';

async function test() {
  const data = {
    orderCode: "ORD-TEST-123",
    customerName: "Nguyễn Văn Test",
    customerPhone: "0901234567",
    customerAddress: "94 Phan Đình Phùng, Bình Định",
    productName: "In cuộn khổ 60cm",
    size: "Khổ 60cm",
    quantity: 200,
    meters: 1.5,
    rateExclVat: 134259,
    shippingFee: 30000,
  };

  const templatePath = path.join(__dirname, '../.agents/skills/antigravity-prinktech-quote/resources/template_bao_gia.xlsx');
  const excelOut = path.join(__dirname, '../temp_test.xlsx');
  const pdfOut = path.join(__dirname, '../temp_test.pdf');

  console.log("Generating Excel...");
  await generateExcelQuote(data, templatePath, excelOut);
  console.log("Excel generated at:", excelOut);

  console.log("Generating PDF...");
  await generatePdfQuote(data, pdfOut);
  console.log("PDF generated at:", pdfOut);
}

test().catch(console.error);
