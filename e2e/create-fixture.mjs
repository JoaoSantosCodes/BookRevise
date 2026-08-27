import { Document, Packer, Paragraph, TextRun } from "docx";
import { mkdir, writeFile } from "node:fs/promises";

const document = new Document({ sections: [{ children: [
  new Paragraph({ children: [new TextRun({ text: "Capítulo 1", bold: true })] }),
  new Paragraph("Uma casa silenciosa guardava histórias que ainda pediam revisão."),
  new Paragraph("A narradora caminhou até a janela e observou a manhã."),
  new Paragraph({ children: [new TextRun({ text: "Capítulo 2", bold: true })] }),
  new Paragraph("O segundo capítulo amplia o contexto e preserva a voz do manuscrito."),
] }] });

await mkdir(new URL("./fixtures/", import.meta.url), { recursive: true });
await writeFile(new URL("./fixtures/manuscrito-real.docx", import.meta.url), await Packer.toBuffer(document));
