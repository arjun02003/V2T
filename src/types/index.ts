// ============================================
// V2T Groups - Type Definitions
// ============================================

// --- Database Types ---

export interface Service {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  icon: string;
  hero_image: string;
  features: ServiceFeature[];
  gallery: GalleryImage[];
  faqs: FAQ[];
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceFeature {
  title: string;
  description: string;
  icon: string;
}

export interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  category: string;
  images: string[];
  date: string;
  client?: string;
  location?: string;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  title: string;
  category: string;
  album_id?: string;
  width: number;
  height: number;
  size: number;
  format: string;
  created_at: string;
}

export interface Album {
  id: string;
  name: string;
  slug: string;
  cover_image: string;
  image_count: number;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  type: 'gallery' | 'portfolio' | 'blog';
  created_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featured_image: string;
  meta_title: string;
  meta_description: string;
  is_published: boolean;
  author: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Testimonial {
  id: string;
  name: string;
  company: string;
  role: string;
  content: string;
  avatar: string;
  rating: number;
  is_active: boolean;
  created_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string;
  social_links: SocialLinks;
  order: number;
  created_at: string;
}

export interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  email?: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  service_id?: string;
  order: number;
  created_at: string;
}

export interface SiteSetting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Statistic {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  icon: string;
  order: number;
}

// --- UI Types ---

export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

export interface HeroSlide {
  title: string;
  subtitle: string;
  image: string;
  cta_text: string;
  cta_link: string;
}

export interface CompanyInfo {
  name: string;
  tagline: string;
  description: string;
  mission: string;
  vision: string;
  founded_year: number;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  map_embed_url: string;
  social_links: SocialLinks & {
    youtube?: string;
    whatsapp?: string;
  };
}

// --- Admin Types ---

export interface AdminStats {
  total_portfolio: number;
  total_blog_posts: number;
  total_images: number;
  total_contacts: number;
  recent_contacts: ContactSubmission[];
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  url?: string;
  error?: string;
}
