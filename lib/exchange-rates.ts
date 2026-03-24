/**
 * Utility function to fetch exchange rates from external API and update the database
 * This should be called daily by a cron job
 */

export async function updateExchangeRatesFromExternalAPI() {
  try {
    console.log('Starting exchange rate update...');

    // Fetch rates from exchangerate-api.com
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/RWF');
    const data = await response.json();

    if (!data.rates) {
      throw new Error('Invalid response from exchange rate API');
    }

    const rates = data.rates;

    // Prepare rate data for our API
    const rateUpdates = [
      {
        currency: 'USD',
        rate: Math.round((1 / rates.USD) * 100) / 100,
      },
      {
        currency: 'EUR',
        rate: Math.round((1 / rates.EUR) * 100) / 100,
      },
      {
        currency: 'GBP',
        rate: Math.round((1 / rates.GBP) * 100) / 100,
      },
    ];

    // Update via our internal API
    const updateResponse = await fetch('http://localhost:3000/api/admin/exchange-rates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EXCHANGE_RATE_API_KEY}`,
      },
      body: JSON.stringify({ rates: rateUpdates }),
    });

    if (!updateResponse.ok) {
      throw new Error(`Failed to update exchange rates: ${updateResponse.statusText}`);
    }

    const result = await updateResponse.json();
    console.log('Exchange rates updated successfully:', result);
    return result;
  } catch (error) {
    console.error('Error updating exchange rates:', error);
    throw error;
  }
}
