import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { applyDecisions, diffText, diffWords, makeEpub, makePdf, validateDocx } from "./routers";
import { retryDelayMs } from "./db";

describe("review document utilities", () => {
  it("rejects a corrupt or non-DOCX file with a clear result", async () => {
    await expect(validateDocx(Buffer.from("not a docx"))).resolves.toMatchObject({ valid: false });
  });

  it("accepts a DOCX package with the required entries", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", "<Types />");
    zip.file("word/document.xml", "<document />");
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    await expect(validateDocx(buffer)).resolves.toEqual({ valid: true });
  });

  it("generates PDF and EPUB artifacts", async () => {
    const pdf = await makePdf("Livro", "Um parágrafo.");
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    const epub = await makeEpub({ title: "Livro", text: "Um parágrafo.", author: "Autor", description: "Descrição editorial", language: "pt-BR", chapters: [{ title: "Capítulo 1", text: "Um parágrafo." }] });
    const zip = await JSZip.loadAsync(epub);
    expect(zip.file("mimetype")).toBeTruthy();
    expect(zip.file("OEBPS/content.opf")).toBeTruthy();
  });

  it("marks additions and removals word by word", () => {
    expect(diffWords("A casa azul.", "A casa clara.")).toEqual([{ type: "same", text: "A casa " }, { type: "removed", text: "azul." }, { type: "added", text: "clara." }]);
  });

  it("uses bounded exponential retry delays", () => {
    expect(retryDelayMs(1)).toBe(60_000);
    expect(retryDelayMs(2)).toBe(300_000);
    expect(retryDelayMs(3)).toBe(900_000);
  });

  it("marks additions and removals in a version diff", () => {
    expect(diffText("Um\ntexto antigo", "Um\ntexto novo")).toEqual([{ type: "same", text: "Um" }, { type: "removed", text: "texto antigo" }, { type: "added", text: "texto novo" }]);
  });

  it("only applies accepted and edited suggestions", () => {
    const result = applyDecisions("A casa azul. O carro azul.", [
      { status: "accepted", originalText: "casa azul", suggestedText: "casa clara", editedText: null },
      { status: "edited", originalText: "carro azul", suggestedText: "carro novo", editedText: "carro vermelho" },
      { status: "ignored", originalText: "A", suggestedText: "O", editedText: null },
    ]);
    expect(result).toBe("A casa clara. O carro vermelho.");
  });
});
