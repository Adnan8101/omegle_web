import { NextResponse } from 'next/server';

const API_KEY = process.env.NOWPAYMENTS_API_KEY || 'CBD5QR0-ZFD4RNX-JMHZ6CW-60GRKH3';

export async function GET() {
  try {
    
    const res = await fetch('https://api.nowpayments.io/v1/min-amount?currency_from=usd&currency_to=ltc', {
      headers: { 'x-api-key': API_KEY },
      next: { revalidate: 3600 } 
    });
    
    if (!res.ok) {
      return NextResponse.json({ min_amount: 3 });
    }

    const data = await res.json();
    
    const minAmount = (data.fiat_equivalent ? data.fiat_equivalent * 1.05 : 3).toFixed(2);
    
    return NextResponse.json({ min_amount: minAmount });
  } catch (e) {
    return NextResponse.json({ min_amount: 3 }); 
  }
}
