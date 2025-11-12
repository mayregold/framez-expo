export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string | null;
  created_at: string;
  author_name?: string; 
  avatar_url?: string;
  
}
