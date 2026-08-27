import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "manuscrito-real.docx");

test("cria um manuscrito DOCX real e exibe o diff no histórico", async ({ page }) => {
  test.skip(!process.env.BOOKREVISE_E2E_STORAGE_STATE, "Defina BOOKREVISE_E2E_STORAGE_STATE com uma sessão autenticada para executar o E2E.");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Meus manuscritos" })).toBeVisible();
  await page.getByRole("button", { name: /Novo manuscrito/i }).click();
  await page.getByPlaceholder("Título do livro").fill(`E2E ${Date.now()}`);
  await page.locator('input[type="file"][accept=".docx"]').setInputFiles(fixture);
  await expect(page.getByText(/Manuscrito colocado na fila|Manuscrito analisado/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Análise na fila editorial|Processando|Pronto/i)).toBeVisible({ timeout: 30_000 });
  const generateVersions = page.getByRole("button", { name: /Gerar versões/i });
  await expect(generateVersions).toBeVisible({ timeout: 90_000 });
  await generateVersions.click();
  await expect(page.getByText("DOCX, PDF, EPUB e relatório gerados.")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("Versões geradas")).toBeVisible({ timeout: 30_000 });
  const pdfButton = page.getByRole("button", { name: /Gerar pré-visualização do diff como PDF/i });
  await expect(pdfButton).toBeVisible();
  await pdfButton.click();
  await expect(page.getByRole("dialog", { name: "PDF do diff" })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("Anotações")).toBeVisible();
});
