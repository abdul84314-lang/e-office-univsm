export const GAS_URL = 'https://script.google.com/macros/s/AKfycbzZf1kLYJ-q5vC98ODuHMToQ_-zx0NUUqU8o8ceYyZb6ROhROvBHtdvqZQrWwD7UJjqjw/exec';

/**
 * Memanggil endpoint POST di Google Apps Script
 * (Menggunakan text/plain untuk menghindari preflight CORS error di GAS)
 */
export async function gasPost(action, payload) {
  try {
    const response = await fetch(`${GAS_URL}?action=${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload)
    });
    
    // Server GAS sering membalas dengan redirect HTTP 302,
    // fetch API browser otomatis menanganinya secara transparan jika CORS valid.
    return await response.json();
  } catch (error) {
    console.error(`Error GAS POST [${action}]:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Memanggil endpoint GET di Google Apps Script
 */
export async function gasGet(action) {
  try {
    const response = await fetch(`${GAS_URL}?action=${action}`);
    return await response.json();
  } catch (error) {
    console.error(`Error GAS GET [${action}]:`, error);
    return { success: false, error: error.message };
  }
}
