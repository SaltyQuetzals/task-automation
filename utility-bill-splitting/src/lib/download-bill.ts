import { chromium } from 'playwright';

export async function downloadBill(email: string, password: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto('https://coautilities.com/wps/wcm/connect/occ/coa/home');
    await page.getByRole('textbox', { name: 'Username' }).click();
    await page.getByRole('textbox', { name: 'Username' }).fill(email);
    await page.getByText('Username Password Log in').click();
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.goto('https://dss-coa.opower.com/dss/overview');
    await page.getByRole('link', { name: 'View bill' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'View bill (pdf)', exact: true }).click();
    const download = await downloadPromise;

    // Save download to example.pdf
    const path = await download.path();
    const buffer = await Bun.file(path).bytes();
    return buffer;
  } finally {
    await browser.close();
  }
}