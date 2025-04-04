import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { rating, comment } = await request.json();
    
    // Here you would typically save the feedback to a database
    // For now, we'll just log it to the console
    console.log('Received feedback:', { rating, comment });

    // You can implement your database logic here
    // For example, saving to a database or sending to an API

    return json({ success: true });
  } catch (error) {
    console.error('Error processing feedback:', error);
    return json({ error: 'Failed to process feedback' }, { status: 500 });
  }
}; 