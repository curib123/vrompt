import { expect, test } from '@playwright/test';

test('keeps primary, muted, panel, and placeholder text in sync with the theme', async ({
  page,
}) => {
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/landing');

    await expect(page.getByRole('heading', { level: 1 })).toHaveCSS(
      'color',
      'rgb(255, 255, 255)',
    );
    await expect(
      page.getByText('The prompt community', { exact: true }),
    ).toHaveCSS('color', 'oklch(0.871 0.006 286.286)');
    await expect(page.getByText('Why Vrompt', { exact: true })).toHaveCSS(
      'color',
      theme === 'light'
        ? 'oklch(0.442 0.017 285.786)'
        : 'oklch(0.705 0.015 286.067)',
    );

    await page.goto('/search');
    const searchInput = page.getByRole('searchbox', { name: 'Search query' });
    await expect(searchInput).toHaveCSS(
      'color',
      theme === 'light' ? 'rgb(13, 13, 13)' : 'rgb(255, 255, 255)',
    );
    const placeholderColor = await searchInput.evaluate(
      (element) => getComputedStyle(element, '::placeholder').color,
    );
    expect(placeholderColor).toBe(
      theme === 'light' ? 'rgb(77, 77, 77)' : 'rgb(189, 189, 189)',
    );
  }
});
