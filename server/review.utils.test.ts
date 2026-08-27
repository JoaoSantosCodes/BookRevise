import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { applyDecisions, validateDocx } from "./routers";

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

  it("only applies accepted and edited suggestions", () => {
    const result = applyDecisions("A casa azul. O carro azul.", [
      { status: "accepted", originalText: "casa azul", suggestedText: "casa clara", editedText: null },
      { status: "edited", originalText: "carro azul", suggestedText: "carro novo", editedText: "carro vermelho" },
      { status: "ignored", originalText: "A", suggestedText: "O", editedText: null },
    ]);
    expect(result).toBe("A casa clara. O carro vermelho.");
  });
});
