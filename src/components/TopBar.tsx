import Link from "next/link";
import { MapPin } from "lucide-react";
import { ActivityBell } from "./ActivityBell";
import { TopBarDiscover } from "./TopBarDiscover";

export function TopBar() {
  return (
    <header className="glass-header sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-line px-4 md:hidden">
      <Link href="/" aria-label="Complices, accueil" className="font-logo text-[26px] leading-none">Complices<span className="text-ig-blue">.</span></Link>
      <span className="hidden items-center gap-1 text-[10px] font-medium text-muted min-[380px]:flex"><MapPin size={11} /> Saint-Roch</span>
      <div className="flex items-center gap-1">
        <TopBarDiscover />
        <ActivityBell />
      </div>
    </header>
  );
}
