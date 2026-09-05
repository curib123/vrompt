import Link from 'next/link';
export default function Page() { return <PublicPage title="A calmer way to use AI" text="Ask once, let Auto choose an appropriate model, and keep your work in one private workspace." />; }
function PublicPage({ title, text }: { title: string; text: string }) { return <><header className="public-nav"><Link className="workspace-brand" href="/">vrompt<span className="brand-dot">✳</span></Link><Link href="/pricing">Pricing</Link></header><main className="hero"><h1>{title}</h1><p>{text}</p><Link className="primary-button" href="/login">Get started</Link></main></>; }
