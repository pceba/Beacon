import { BookOpen, Dumbbell, Droplets, Heart, Leaf, Moon, PenLine, Sun, type LucideIcon } from 'lucide-react-native';

export const HABIT_COLORS = ['#1C4ED8', '#0F7A45', '#C2410C', '#3A4D8F', '#C23127', '#3E4652'] as const;

export const HABIT_ICON_OPTIONS: Array<{ id: string; Icon: LucideIcon }> = [
  { id: 'sun', Icon: Sun },
  { id: 'droplets', Icon: Droplets },
  { id: 'book', Icon: BookOpen },
  { id: 'dumbbell', Icon: Dumbbell },
  { id: 'moon', Icon: Moon },
  { id: 'heart', Icon: Heart },
  { id: 'leaf', Icon: Leaf },
  { id: 'pen', Icon: PenLine },
];
