// app/Profile.tsx
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';
import { supabase } from '../src/supabaseClient';
import { VideoView } from 'expo-video';

const { width } = Dimensions.get('window');

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string | null;
  video_url?: string | null;
  created_at: string;
  likes: string[];
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<{ name: string; avatar_url: string | null }>({ name: '', avatar_url: null });

  // Fetch profile info
  const fetchProfile = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error) console.log(error);
    else setProfile({ name: data.name, avatar_url: data.avatar_url });
  };

  // Fetch user posts
  const fetchPosts = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, likes(user_id)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted: Post[] = data.map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        content: p.content,
        image_url: p.image_url,
        video_url: p.video_url,
        created_at: p.created_at,
        likes: p.likes?.map((l: any) => l.user_id) || [],
      }));

      setPosts(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscription for new posts by this user
  useEffect(() => {
    if (!user?.id) return;

    fetchProfile();
    fetchPosts();

    const channel = supabase
      .channel(`user-posts-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newPost = payload.new;
          setPosts(prev => [
            {
              id: newPost.id,
              user_id: newPost.user_id,
              content: newPost.content,
              image_url: newPost.image_url,
              video_url: newPost.video_url,
              created_at: newPost.created_at,
              likes: [],
            },
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Like/unlike post
  const toggleLike = async (postId: string, liked: boolean) => {
    if (!user?.id) return;
    try {
      if (liked) {
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
        setPosts(prev =>
          prev.map(p => (p.id === postId ? { ...p, likes: p.likes.filter(id => id !== user.id) } : p))
        );
      } else {
        await supabase.from('likes').insert([{ post_id: postId, user_id: user.id }]);
        setPosts(prev =>
          prev.map(p => (p.id === postId ? { ...p, likes: [...p.likes, user.id] } : p))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderPost = ({ item }: { item: Post }) => {
    const liked = user?.id ? item.likes.includes(user.id) : false;
    return (
      <View style={styles.postContainer}>
        <Text style={styles.postContent}>{item.content}</Text>

        {item.image_url && <Image source={{ uri: item.image_url }} style={styles.media} />}
        {item.video_url && <VideoView source={{ uri: item.video_url }} style={styles.media} contentFit="contain" />}

        <View style={styles.actions}>
          <TouchableOpacity onPress={() => toggleLike(item.id, liked)}>
            <Text style={{ fontSize: 16 }}>{liked ? '❤️' : '🤍'} {item.likes.length}</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={{ fontSize: 16 }}>💬</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.timestamp}>{new Date(item.created_at).toLocaleString()}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Profile header */}
      <View style={styles.header}>
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder} />
        )}
        <Text style={styles.name}>{profile.name || 'User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.postsTitle}>Your Posts</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#2b6cdf" />
      ) : posts.length === 0 ? (
        <Text style={styles.emptyText}>You haven’t posted anything yet.</Text>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          renderItem={renderPost}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 8 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#eee', marginBottom: 8 },
  name: { fontSize: 20, fontWeight: '700' },
  email: { fontSize: 14, color: '#666', marginBottom: 12 },
  logoutButton: { padding: 8, backgroundColor: '#f44336', borderRadius: 8 },
  logoutText: { color: '#fff', fontWeight: '600' },
  postsTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#555', textAlign: 'center', marginTop: 20 },
  postContainer: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
  postContent: { fontSize: 14, marginBottom: 8 },
  media: { width: width - 32, height: 250, borderRadius: 12, marginBottom: 8, backgroundColor: '#000' },
  actions: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  timestamp: { fontSize: 12, color: '#888' },
});
