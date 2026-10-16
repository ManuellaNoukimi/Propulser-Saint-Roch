import { Accessibility, Apple, Armchair, Baby, Banknote, Beer, Bike, BookOpen, BriefcaseBusiness, Building2, BusFront, CalendarDays, Camera, Car, Check, Circle, CircleHelp, Coffee, Compass, CreditCard, DoorOpen, Droplets, Dumbbell, Flame, Gamepad2, GraduationCap, Hand, HandCoins, HandHeart, Handshake, Heart, House, Inbox, Landmark, Lightbulb, LockKeyhole, MapPin, Megaphone, Moon, Palette, PartyPopper, Pill, Scissors, ShieldAlert, ShoppingBag, ShoppingBasket, ShoppingCart, Sparkles, Sprout, Star, Store, Stethoscope, Sun, Target, TrafficCone, Trash2, Trees, Users, Utensils, Volleyball, Volume2, Wrench, Zap, type LucideIcon } from "lucide-react";

import { Award, Footprints, Tag } from "lucide-react";

// Les donnees existantes gardent leur symbole ; seul le rendu devient une icone.
const ICONS: Record<string, LucideIcon> = Object.fromEntries(Object.entries({
  "🎭": Palette, "🤝": Handshake, "💛": Heart, "📣": Megaphone, "⚽": Volleyball,
  "🛍️": ShoppingBag, "🌱": Sprout, "🏠": House, "🏡": House, "💼": BriefcaseBusiness,
  "🎓": GraduationCap, "🍽️": Utensils, "🏢": Building2, "🏛️": Landmark, "👋": Hand,
  "🏪": Store, "🏬": Store, "☕": Coffee, "🍺": Beer, "🥖": ShoppingBasket,
  "✂️": Scissors, "🛏️": DoorOpen, "🗂️": BriefcaseBusiness, "🎮": Gamepad2,
  "✨": Sparkles, "🙌": Users, "💪": HandHeart, "🧰": Wrench, "📍": MapPin,
  "💸": HandCoins, "🧠": Lightbulb, "🙋": Hand, "⚠️": ShieldAlert, "🛒": ShoppingCart,
  "🪑": Armchair, "🚻": DoorOpen, "🚰": Droplets, "🌳": Trees, "🛝": Baby,
  "🚲": Bike, "♿": Accessibility, "💡": Lightbulb, "🗑️": Trash2, "🔓": LockKeyhole,
  "😟": ShieldAlert, "🕳️": Circle, "🚧": TrafficCone, "🔊": Volume2, "🖍️": Palette,
  "❓": CircleHelp, "☀️": Sun, "🌆": Moon, "🌙": Moon, "🌅": Sun, "🔥": Flame,
  "⭐": Star, "🍎": Apple, "🥩": Utensils, "💊": Pill, "🩺": Stethoscope,
  "🏋️": Dumbbell, "📚": BookOpen, "🔧": Wrench, "🧸": Baby, "🚗": Car,
  "🚌": BusFront, "🚶": Footprints, "🎉": PartyPopper, "🔴": Circle,
  "🟣": Circle, "🆓": Banknote, "👨‍👩‍👧": Users, "🤗": Users, "🎯": Target,
  "💳": CreditCard, "🏷️": Tag, "📅": CalendarDays, "🖼️": Palette,
  "🧶": Wrench, "📭": Inbox, "📩": Inbox, "📷": Camera, "🧭": Compass,
  "🔒": LockKeyhole, "✅": Check, "⚡": Zap, "🏅": Award, "🟠": Store,
}).map(([symbol, icon]) => [symbol.replace(/\uFE0F/g, ""), icon]));

export function InterfaceIcon({ symbol, size = 16 }: { symbol?: string | null; size?: number }) {
  if (!symbol) return null;
  const Icon = ICONS[symbol.replace(/\uFE0F/g, "")] ?? Circle;
  return <Icon size={size} strokeWidth={1.6} aria-hidden="true" className="inline-block shrink-0 align-middle" />;
}
