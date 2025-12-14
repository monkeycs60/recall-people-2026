import {
  Briefcase,
  Building2,
  MapPin,
  Heart,
  Cake,
  Gamepad2,
  Dumbbell,
  Users,
  GraduationCap,
  Phone,
  CircleDot,
} from 'lucide-react-native';
import { FactType } from '@/types';

export const factIcons: Record<FactType, typeof Briefcase> = {
  work: Briefcase,
  company: Building2,
  hobby: Gamepad2,
  sport: Dumbbell,
  relationship: Users,
  partner: Heart,
  location: MapPin,
  education: GraduationCap,
  birthday: Cake,
  contact: Phone,
  other: CircleDot,
};

export const factLabels: Record<FactType, string> = {
  work: 'Travail',
  company: 'Entreprise',
  hobby: 'Loisir',
  sport: 'Sport',
  relationship: 'Relation',
  partner: 'Conjoint',
  location: 'Lieu',
  education: 'Formation',
  birthday: 'Anniversaire',
  contact: 'Contact',
  other: 'Autre',
};
