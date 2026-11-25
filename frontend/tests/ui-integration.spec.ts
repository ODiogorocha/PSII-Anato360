import { test, expect, type Page } from '@playwright/test';
import type { UploadedImage } from '../src/services/api';

// Contract tests for the frontend. site.spec.ts exercises the deployed, real API.
const user = { id: 7, nome: 'Estudante', email: 'prof.estudante@example.test', is_admin: false, instituicao: 'UFSM' };
const session = { token: 'frontend-contract-test', user };
const annotation = { id: 101, text: 'Fêmur', text_es: 'Fémur', confirmed: true, x: 50, y: 100, posicao_normalizada: { x: 0.25, y: 0.25 } };
const images: UploadedImage[] = [
  { id: 1, title: 'Osso para estudo', title_es: 'Hueso de estudio', description: 'Peça anatômica', category: 'skeletal', owner_id: 7, owner_name: 'Estudante', allow_sharing: false, use_ollama: false, processing_mode: 'manual', status: 'ready', processed_path: '', annotations: [annotation, { ...annotation, id: 102, text: 'Tíbia', text_es: 'Tibia', posicao_normalizada: { x: 0.75, y: 0.75 } }, { ...annotation, id: 103, text: 'Pendente', confirmed: false }], error_message: '', processing_metadata: { width: 200, height: 400 }, created_at: '' },
  { id: 2, title: 'Coração compartilhado', description: '', category: 'circulatory', owner_id: 9, owner_name: 'Professor', allow_sharing: true, use_ollama: false, processing_mode: 'automatic', status: 'ready', processed_path: 'processed.png', annotations: [{ ...annotation, id: 201, text: 'Ventrículo' }], error_message: '', processing_metadata: { width: 200, height: 400 }, created_at: '' },
  { id: 3, title: 'Falha de processamento', description: '', category: 'muscular', owner_id: 7, owner_name: 'Estudante', allow_sharing: false, use_ollama: false, processing_mode: 'automatic', status: 'failed', processed_path: '', annotations: [annotation], error_message: 'Falha de teste', processing_metadata: {}, created_at: '' },
];

async function mockApi(page: Page, loggedIn = true) {
  const calls: { path: string; method: string; body: Record<string, unknown> | null }[] = [];
  const failures: string[] = [];
  page.on('pageerror', error => failures.push(error.message));
  const library = structuredClone(images);
  if (loggedIn) await page.addInitScript(value => localStorage.setItem('anato360-auth-session', JSON.stringify(value)), session);
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/', '');
    const method = request.method();
    calls.push({ path, method, body: request.postData() ? request.postDataJSON() : null });
    if (path !== 'auth/login/' && request.headers().authorization !== `Token ${session.token}`) failures.push(`Missing token: ${path}`);
    const json = (body: unknown) => route.fulfill({ json: body });
    if (path === 'auth/login/') return json(session);
    if (path === 'auth/me/') return json(user);
    if (path === 'auth/logout/') return json({});
    if (path === 'dashboard/') return json({ questions: 3 });
    if (path === 'progresso/') return json({ totalPoints: 20, results: [] });
    if (path === 'notificacoes/') return json([]);
    if (path === 'imagens/') return json(url.searchParams.get('mine') ? library.filter(image => image.owner_id === user.id) : library);
    if (path === 'imagens/1/' && method === 'PATCH') {
      library[0].allow_sharing = request.postDataJSON().allow_sharing;
      return json(library[0]);
    }
    if (/imagens\/\d+\/arquivo\//.test(path)) return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="400"><rect width="200" height="400" fill="#e8e5dd"/><path d="M80 40h40v320H80z" fill="#d9b990"/><circle cx="50" cy="100" r="12" fill="#1a6b6b"/><circle cx="150" cy="300" r="12" fill="#1a6b6b"/></svg>' });
    if (path === 'quiz/perguntas/') return json([{ id: '101', image_id: 1, system: 'skeletal', imageUrl: '/api/imagens/1/arquivo/original/', imageAlt_pt: 'Osso', imageAlt_es: 'Hueso', marker: { x: 25, y: 25 }, correct_pt: 'Fêmur', correct_es: 'Fémur', options_pt: ['Fêmur', 'Tíbia'], options_es: ['Fémur', 'Tibia'] }]);
    if (path === 'quiz/responder/') return json({ correct: true, points: 20, requires_choice: false, result: { questionId: '101', system: 'skeletal', correct_pt: 'Fêmur', correct_es: 'Fémur', usedOpenAnswer: true, correct: true, points: 20, timestamp: Date.now() } });
    failures.push(`Unexpected endpoint: ${method} ${path}`);
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto('/');
  return { calls, failures };
}

test('gallery filters authenticated images and studies labels with aligned zoom', async ({ page }, testInfo) => {
  const { calls, failures } = await mockApi(page);
  await expect(page.getByRole('button', { name: /Sistema Esquelético/ })).toContainText('2 questões disponíveis');
  await expect(page.getByRole('button', { name: /Sistema Muscular/ })).toContainText('0 questões disponíveis');
  await expect(page.getByRole('button', { name: 'Admin', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Imagens', exact: true }).click();
  await expect(page.locator('article')).toHaveCount(3);
  await page.getByLabel('Filtrar por sistema').selectOption('skeletal');
  await expect(page.locator('article')).toHaveCount(1);
  await page.getByRole('button', { name: 'Compartilhar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tornar privada' })).toBeVisible();
  await page.getByRole('button', { name: 'Osso para estudo', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('img')).toHaveJSProperty('naturalWidth', 200);
  const marker = dialog.getByTestId('structure-marker');
  const imageBounds = await dialog.getByRole('img').boundingBox();
  const markerBounds = await marker.boundingBox();
  expect(markerBounds!.x).toBeCloseTo(imageBounds!.x + imageBounds!.width * 0.25, 0);
  expect(markerBounds!.y).toBeCloseTo(imageBounds!.y + imageBounds!.height * 0.25, 0);
  await page.getByLabel('Selecionar estrutura').selectOption('102');
  await expect(marker).toHaveAttribute('style', /left: 75%; top: 75%/);
  await dialog.getByRole('button', { name: 'Aumentar zoom' }).click();
  await expect(dialog.getByText('Zoom 125%', { exact: true })).toBeVisible();
  await expect(marker.locator('..')).toHaveAttribute('style', /scale\(1.25\)/);
  for (let index = 0; index < 5; index++) await dialog.getByRole('button', { name: 'Aumentar zoom' }).click();
  await expect(dialog.getByText('Zoom 250%', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Aumentar zoom' })).toBeDisabled();
  const viewer = dialog.getByRole('group');
  await viewer.focus();
  await page.keyboard.press('ArrowRight');
  await expect(marker.locator('..')).toHaveAttribute('style', /rotateY\(10deg\)/);
  await dialog.getByRole('button', { name: 'Restaurar visualização' }).click();
  await expect(dialog.getByText('Zoom 100%', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Diminuir zoom' })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Ver original' })).toBeDisabled();
  const bounds = (await viewer.boundingBox())!;
  await page.mouse.move(bounds.x + 40, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 90, bounds.y + bounds.height / 2, { steps: 4 });
  await page.mouse.up();
  await expect(marker.locator('..')).toHaveAttribute('style', /rotateY\(30deg\)/);
  await dialog.getByRole('button', { name: 'Restaurar visualização' }).click();
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Baixar imagem' }).click();
  expect((await download).suggestedFilename()).toBe('anato360-1-original.png');
  await page.screenshot({ path: testInfo.outputPath('study-desktop.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Osso para estudo', exact: true })).toBeFocused();
  await page.getByLabel('Filtrar por sistema').selectOption('respiratory');
  await expect(page.getByText('Nenhuma imagem para este sistema.')).toBeVisible();
  await page.getByLabel('Filtrar por sistema').selectOption('all');
  await page.getByRole('button', { name: 'Minhas imagens' }).click();
  await expect(page.locator('article')).toHaveCount(2);
  expect(calls.some(call => call.path === 'imagens/1/arquivo/original/')).toBeTruthy();
  expect(failures).toEqual([]);
});

test('mobile menu, language, theme and quiz preserve API authentication and scoring', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { calls, failures } = await mockApi(page, false);
  await page.locator('input[type=email]').fill(user.email);
  await page.locator('input[type=password]').fill('test-password');
  await page.getByRole('button', { name: 'Entrar na plataforma' }).click();
  await expect(page.getByRole('heading', { name: 'Escolha um sistema anatômico para praticar' })).toBeVisible();
  const menu = page.getByRole('button', { name: 'Menu de navegação' });
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await menu.click();
  await page.getByRole('button', { name: 'Imagens', exact: true }).click();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: 'Osso para estudo', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Aumentar zoom' }).click();
  await expect(page.getByText('Zoom 125%', { exact: true })).toBeVisible();
  expect(await page.getByRole('dialog').evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('study-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await page.getByRole('button', { name: 'ES', exact: true }).click();
  await expect(page.locator('html')).toHaveClass('dark');
  await expect(page.getByRole('heading', { name: 'Biblioteca de imágenes' })).toBeVisible();
  await page.getByRole('button', { name: 'PT', exact: true }).click();
  await menu.click();
  await page.getByRole('button', { name: 'Praticar', exact: true }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await page.getByPlaceholder('Digite o nome da estrutura...').fill('Fêmur');
  await page.getByRole('button', { name: 'Verificar', exact: true }).click();
  await expect(page.getByText('Correto!', { exact: true })).toBeVisible();
  expect(calls.find(call => call.path === 'quiz/responder/')?.body).toEqual({ question_id: '101', answer: 'Fêmur', used_open_answer: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await menu.click();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bem-vindo ao Anato360' })).toBeVisible();
  expect(failures).toEqual([]);
});

test('processed and original images keep permissions and coordinate context', async ({ page }) => {
  const { failures } = await mockApi(page);
  await page.getByRole('button', { name: 'Imagens', exact: true }).click();
  const shared = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Coração compartilhado' }) });
  await expect(shared.getByRole('button', { name: 'Editar rótulos' })).toHaveCount(0);
  await expect(shared.getByRole('button', { name: 'Excluir' })).toHaveCount(0);
  await shared.getByRole('button', { name: 'Coração compartilhado' }).click();
  await expect(page.getByTestId('structure-marker')).toBeVisible();
  await page.getByRole('button', { name: 'Ver original' }).click();
  await expect(page.getByRole('dialog').getByRole('img')).toBeVisible();
  await expect(page.getByTestId('structure-marker')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ver processada' }).click();
  await expect(page.getByTestId('structure-marker')).toBeVisible();
  expect(failures).toEqual([]);
});

test('image download failures are visible and do not expose a broken viewer', async ({ page }) => {
  await mockApi(page);
  await page.route('**/api/imagens/1/arquivo/**', route => route.fulfill({ status: 403, json: { detail: 'Sem acesso à imagem.' } }));
  await page.getByRole('button', { name: 'Imagens', exact: true }).click();
  await page.getByRole('button', { name: 'Osso para estudo', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toHaveText('Não foi possível concluir a solicitação.');
  await expect(page.getByRole('button', { name: 'Baixar imagem' })).toBeDisabled();
  await expect(page.getByRole('dialog').getByRole('group')).toHaveCount(0);
});
