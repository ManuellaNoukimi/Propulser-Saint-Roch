import { actorTypeOf, isEstablishment } from "@/lib/constants";
import { avatarGradient, initials } from "@/lib/ui";
import type { PublicUser } from "@/lib/types";
import { InterfaceIcon } from "@/components/InterfaceIcon";

// Avatar rond à initiales ; anneau dégradé optionnel (comme une story). Les établissements ont un petit pictogramme.
export function Avatar({ user, size = 32, ring = false }: { user: Pick<PublicUser, "id" | "displayName" | "accountType">; size?: number; ring?: boolean }) {
  const inner = (
    <span
      className="grid place-items-center rounded-full text-white font-semibold select-none"
      style={{ width: size, height: size, background: avatarGradient(user.id), fontSize: Math.max(10, size * 0.36) }}
    >
      {initials(user.displayName)}
    </span>
  );
  const badge = isEstablishment(user.accountType) && size >= 28 && (
    <span
      className="absolute -bottom-0.5 -right-0.5 grid place-items-center rounded-full bg-bg leading-none"
      style={{ width: size * 0.42, height: size * 0.42, fontSize: size * 0.24 }}
      title={actorTypeOf(user.accountType)?.label}
    >
      <InterfaceIcon symbol={actorTypeOf(user.accountType)?.emoji} size={Math.max(10, Math.round(size * 0.24))} />
    </span>
  );
  if (!ring) {
    return (
      <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
        {inner}
        {badge}
      </span>
    );
  }
  return (
    <span className="relative inline-grid shrink-0 place-items-center rounded-full story-ring" style={{ width: size + 8, height: size + 8 }}>
      <span className="grid place-items-center rounded-full bg-bg" style={{ width: size + 4, height: size + 4 }}>
        {inner}
      </span>
      {badge}
    </span>
  );
}
