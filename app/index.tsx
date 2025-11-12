import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../src/supabaseClient';
import { useAuth } from '../src/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { VideoView } from 'expo-video';

const { width } = Dimensions.get('window');

export default function Index() {
  const [posts, setPosts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();

  const fetchPosts = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles(name, avatar_url),
          likes(user_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = data.map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        content: p.content,
        image_url: p.image_url,
        video_url: p.video_url,
        created_at: p.created_at,
        author_name: p.profiles?.name,
        avatar_url: p.profiles?.avatar_url,
        likes: p.likes?.map((l: any) => l.user_id) || [],
      }));

      setPosts(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();

    const subscription = supabase
      .channel('posts_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
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
              author_name: newPost.profiles?.name || 'User',
              avatar_url: newPost.profiles?.avatar_url,
              likes: [],
            },
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);


  const toggleLike = async (postId: string, liked: boolean) => {
    if (!user) return;

    try {
      if (liked) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        setPosts(prev =>
          prev.map(p =>
            p.id === postId
              ? { ...p, likes: p.likes.filter((id: string) => id !== user.id) }
              : p
          )
        );
      } else {
        await supabase.from('likes').insert([{ post_id: postId, user_id: user.id }]);
        setPosts(prev =>
          prev.map(p =>
            p.id === postId ? { ...p, likes: [...p.likes, user.id] } : p
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderItem = ({ item }: any) => {
    const liked = item.likes.includes(user?.id);
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
          <Text style={styles.author}>{item.author_name || 'User'}</Text>
        </View>

        <Text style={styles.content}>{item.content}</Text>

        {item.image_url && (
          <Image source={{ uri: item.image_url }} style={styles.postMedia} resizeMode="cover" />
        )}
        {item.video_url && (
          <VideoView
            source={{ uri: item.video_url }}
            style={styles.postMedia}
            contentFit="contain"
          />
        )}

        <View style={styles.actions}>
          <TouchableOpacity onPress={() => toggleLike(item.id, liked)}>
            <Text style={{ fontSize: 18 }}>{liked ? '❤️' : '🤍'} {item.likes.length}</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={{ fontSize: 18 }}>💬</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.timestamp}>{new Date(item.created_at).toLocaleString()}</Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fafafa' }}>
      <View style={styles.topBar}>
        <Text style={styles.appName}>Framez</Text>
        {user && (
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={() => router.push('/Profile')}>
              <Text style={styles.topButton}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={signOut}>
              <Text style={styles.topButton}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {posts.length ? (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchPosts} />}
          contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No posts yet</Text>
        </View>
      )}

      {user && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => router.push('/CreatePost')}
        >
          <Text style={{ color: '#fff', fontSize: 28 }}>＋</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },

  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  appName: { fontSize: 22, fontWeight: '700' },
  topButtonsContainer: { flexDirection: 'row', alignItems: 'center' },
  topButtonWrapper: { marginLeft: 12 },
  topButton: { fontWeight: '600', color: '#2b6cdf', fontSize: 16 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ddd', marginRight: 12 },
  author: { fontWeight: '700', fontSize: 16 },
  content: { fontSize: 14, marginBottom: 8 },
  
  // Responsive post media
  postMedia: { 
    width: width - 24,       // full width minus padding
    height: (width - 24) * 0.6,  // maintain aspect ratio
    borderRadius: 16, 
    marginBottom: 8,
  },

  actions: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  likeButton: { marginRight: 16 },
  timestamp: { fontSize: 12, color: '#888', textAlign: 'right' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 12 },
  emptyText: { fontSize: 20, color: '#555' },

  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2b6cdf',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
});
