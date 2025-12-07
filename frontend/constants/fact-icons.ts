import {
  Briefcase,
  Building2,
  MapPin,
  Heart,
  Cake,
  Star,
  Phone,
  Mail,
  Tag,
} from 'lucide-react-native';
import { FactType } from '@/types';

export const factIcons: Record<FactType, typeof Briefcase> = {
  job: Briefcase,
  company: Building2,
  city: MapPin,
  relationship: Heart,
  birthday: Cake,
  interest: Star,
  phone: Phone,
  email: Mail,
  custom: Tag,
};
