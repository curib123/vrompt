'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
export default function Login() {
  const { beginGoogleLogin, beginGitHubLogin, user } = useAuth(); const router = useRouter();
  useEffect(() => { if (user) router.replace(user.role === 'USER' ? '/chat' : '/admin'); }, [user, router]);
  return <main className="center-page"><Link className="workspace-brand" href="/">vrompt<span className="brand-dot">✳</span></Link><h1>One sign-in.<br />More possibilities.</h1><p className="muted">Your conversations, your models, your workspace.</p><button className="primary-button" onClick={beginGoogleLogin}>Continue with Google</button><button className="secondary-button" onClick={beginGitHubLogin}>Continue with GitHub</button><p className="muted">Start with Auto. Switch models whenever you want.</p></main>;
}
