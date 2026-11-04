import type { ThemeMode } from "@/lib/types";

export function ThemeScript({ initial }: { initial: ThemeMode }) {
  const script = `(function(){try{var stored=localStorage.getItem('fm-theme');var theme=stored||'${initial}';var dark=theme==='dark'||(theme==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var root=document.documentElement;root.classList.toggle('dark',dark);root.dataset.theme=theme;}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
