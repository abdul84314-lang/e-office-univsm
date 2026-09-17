export const GAS_URL = 'https://script.google.com/macros/s/AKfycby-bmPUvshbHtt0ve3WnozbSwydoRFYzmVORoqQEADuFOW2yEAJfKagndHRgP65nXOb1Q/exec';

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
export async function gasGet(action, params = {}) {
  try {
    const url = new URL(GAS_URL);
    url.searchParams.append('action', action);
    url.searchParams.append('t', Date.now()); // Prevent caching
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, value);
    }
    const response = await fetch(url.toString(), {
      method: 'GET',
      cache: 'no-store'
    });
    return await response.json();
  } catch (error) {
    console.error(`Error GAS GET [${action}]:`, error);
    return { success: false, error: error.message };
  }
}
