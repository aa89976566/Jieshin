import Link from "next/link";

type SocialBarProps = {
  email: string;
  instagram: string;
};

export function SocialBar({ email, instagram }: SocialBarProps) {
  return (
    <aside className="fixed bottom-6 right-6 z-30 flex flex-col items-center gap-3 rounded-full bg-black/80 px-3 py-4 backdrop-blur-sm">
      <Link
        href={`mailto:${email}`}
        className="text-[10px] font-mono uppercase tracking-widest text-white/80 transition-colors hover:text-white"
        aria-label="Email"
      >
        @
      </Link>
      <Link
        href={`https://instagram.com/${instagram.replace("@", "")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10px] font-mono uppercase tracking-widest text-white/80 transition-colors hover:text-white"
        aria-label="Instagram"
      >
        ig
      </Link>
      <Link
        href="/about"
        className="text-[10px] font-mono uppercase tracking-widest text-white/80 transition-colors hover:text-white"
        aria-label="About"
      >
        cv
      </Link>
    </aside>
  );
}
