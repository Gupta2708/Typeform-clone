import Link from "next/link";
import { ArrowLeft } from "lucide-react";
export default function NotFound() {
  return (
    <main className="query-state full-height" id="main-content">
      <h1>This page wandered off.</h1>
      <p>Check the link, or head back to your forms.</p>
      <Link href="/workspace" className="button button-primary">
        <ArrowLeft size={16} />
        Go to workspace
      </Link>
    </main>
  );
}
