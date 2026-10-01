import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import path from 'node:path';

const password = 'Anato360!Browser-Study-2026';
const accountEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.test`;

async function createSession(page: Page, request: APIRequestContext) {
  const response = await request.post('/api/auth/registro/', { data: {
    nome: 'Estudante E2E', email: accountEmail(), instituicao: 'Teste automatizado', password,
  } });
  expect(response.status()).toBe(201);
  const session = await response.json();
  await page.goto('/');
  await page.evaluate(value => localStorage.setItem('anato360-auth-session', JSON.stringify(value)), session);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Escolha um sistema anatômico para praticar' })).toBeVisible();
  return { Authorization: `Token ${session.token}` };
}

test('cadastro, login, sessão, temas e navegação móvel usam a API real', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Bem-vindo ao Anato360' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('login.png'), fullPage: true });
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  const email = accountEmail();
  await page.getByPlaceholder('Ana García').fill('Estudante E2E');
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').nth(0).fill(password);
  await page.locator('input[type=password]').nth(1).fill(password);
  await page.locator('#institution').fill('UFSM');
  await page.getByRole('button', { name: 'Cadastrar e entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Escolha um sistema anatômico para praticar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Admin', exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true });
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator('html')).toHaveClass('dark');
  await page.getByRole('button', { name: 'ES', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await page.reload();
  await expect(page.locator('html')).toHaveClass('dark');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await page.getByRole('button', { name: 'PT', exact: true }).click();
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Imagens', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Biblioteca de imagens' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bem-vindo ao Anato360' })).toBeVisible();
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Entrar na plataforma' }).click();
  await expect(page.getByRole('heading', { name: 'Escolha um sistema anatômico para praticar' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('upload, OCR, rótulos, quiz, permissões e progresso persistem no MySQL', async ({ page, request }, testInfo) => {
  test.skip(process.env.E2E_PROCESS_IMAGES !== '1', 'Requer os modelos OCR/CLIP e o worker em execução.');
  test.setTimeout(1200000);
  const headers = await createSession(page, request);
  let imageId: number | undefined;
  try {
    await page.getByRole('button', { name: 'Imagens', exact: true }).click();
    await page.getByRole('button', { name: '+ Enviar imagem' }).click();
    await page.locator('input[type=file]').setInputFiles(path.resolve('../imageService/figures/dog_heart.png'));
    await page.getByPlaceholder('Ex: Cão - Vista lateral').fill('Coração canino E2E');
    const uploaded = page.waitForResponse(response => response.url().endsWith('/api/imagens/') && response.request().method() === 'POST');
    await page.getByRole('button', { name: /Processar imagem|Analisar com IA/ }).click();
    const uploadResponse = await uploaded;
    expect(uploadResponse.status()).toBe(201);
    imageId = (await uploadResponse.json()).id;
    await expect.poll(async () => {
      const response = await request.get(`/api/imagens/${imageId}/`, { headers });
      const image = await response.json();
      if (image.status === 'failed') throw new Error(image.error_message);
      return image.status;
    }, { timeout: 1080000, intervals: [5000] }).toBe('ready');
    await expect(page.getByPlaceholder('Ex: Fêmur')).toBeVisible({ timeout: 30000 });
    const label = await page.getByPlaceholder('Ex: Fêmur').inputValue();
    expect(label.trim().length).toBeGreaterThan(0);
    await page.getByRole('button', { name: '✓ Confirmar' }).click();
    await page.screenshot({ path: testInfo.outputPath('editor.png'), fullPage: true });
    await page.getByRole('button', { name: /1 questões prontas para salvar/ }).click();
    await expect(page.getByText('Questões salvas com sucesso!', { exact: true })).toBeVisible();
    expect((await request.get(`/api/imagens/${imageId}/arquivo/original/`)).status()).toBe(401);
    expect((await request.get('/media/user_uploads/originals/dog_heart.png')).status()).toBe(404);
    await page.getByRole('button', { name: 'Praticar', exact: true }).click();
    await expect(page.getByTestId('structure-marker')).toBeVisible();
    await page.getByPlaceholder('Digite o nome da estrutura...').fill(label);
    await page.getByRole('button', { name: 'Verificar', exact: true }).click();
    await expect(page.getByText('Correto!', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Progresso', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Meu Progresso' })).toBeVisible();
    await page.reload();
    const progress = await request.get('/api/progresso/', { headers });
    expect((await progress.json()).totalPoints).toBe(20);
    const notices = await request.get('/api/notificacoes/', { headers });
    expect((await notices.json()).some((notice: { image_id: number }) => notice.image_id === imageId)).toBeTruthy();
  } finally {
    if (imageId) await request.delete(`/api/imagens/${imageId}/`, { headers });
  }
});

test('chat responde via IA_module e Ollama e recupera o histórico', async ({ page, request }, testInfo) => {
  test.skip(process.env.E2E_CHAT !== '1', 'Requer o modelo de conversa instalado no Ollama.');
  test.setTimeout(420000);
  const headers = await createSession(page, request);
  await page.getByRole('button', { name: 'Abrir chat', exact: true }).click();
  await expect(page.getByText('Online para ajudar', { exact: true })).toBeVisible();
  const question = 'Responda em uma frase curta: qual a função do coração?';
  await page.getByPlaceholder('Digite sua mensagem...').fill(question);
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/ia/perguntar/'), { timeout: 360000 });
  await page.getByRole('button', { name: 'Enviar mensagem', exact: true }).click();
  const response = await responsePromise;
  expect(response.status(), await response.text()).toBe(200);
  const { resposta } = await response.json();
  expect(resposta.length).toBeGreaterThan(10);
  await expect(page.getByText(resposta, { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('chat.png'), fullPage: true });
  await page.reload();
  await page.getByRole('button', { name: 'Abrir chat', exact: true }).click();
  await expect(page.getByText(resposta, { exact: true })).toBeVisible();
  const history = await request.get('/api/ia/historico/', { headers });
  expect((await history.json()).length).toBe(2);
  await page.getByRole('button', { name: 'Limpar', exact: true }).click();
  await expect(page.getByText(resposta, { exact: true })).toHaveCount(0);
});
