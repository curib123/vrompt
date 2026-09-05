'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
export default function Checkout() {
  const { accessToken } = useAuth(); const [status, setStatus] = useState('Checking payment…');
  useEffect(() => { if (!accessToken) return; const id = new URLSearchParams(location.search).get('payment'); if (!id) { setStatus('No payment selected.'); return; } let active = true; const poll = () => void apiRequest<{ status: string }>(`/billing/payments/${id}`, { accessToken }).then(p => { if (active) setStatus(p.status); }).catch(e => { if (active) setStatus(e.message); }); poll(); const timer = setInterval(poll, 5000); return () => { active = false; clearInterval(timer); }; }, [accessToken]);
  return <main className="center-page"><h1>Payment status</h1><p role="status">{status}</p><p className="muted">Access updates only after payment confirmation.</p><Link href="/billing">Back to billing</Link></main>;
}
