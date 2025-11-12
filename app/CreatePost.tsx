import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';
import { supabase } from '../src/supabaseClient';
import { VideoView } from 'expo-video';

const { width } = Dimensions.get('window');

const DEFAULT_IMAGE = 'https://picsum.photos/400/200'; // ← previous test image

export default function CreatePost({ onPostCreated }: { onPostCreated: () => void }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [loading, setLoading] = useState(false);

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const asset = result.assets[0];
      const type = asset.type && asset.type.startsWith('video') ? 'video' : 'image';
      setMedia({ uri: asset.uri, type });
    }
  };

  const uploadMedia = async () => {
    if (!media || !user) return null;

    try {
      const ext = media.type === 'video' ? '.mp4' : '.jpg';
      const filename = `${user.id}/${Date.now()}${ext}`;
      const response = await fetch(media.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('post_media')
        .upload(filename, blob, {
          contentType: media.type === 'video' ? 'video/mp4' : 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('post_media').getPublicUrl(filename);
      return data.publicUrl;
    } catch (err: any) {
      console.error('Upload failed:', err);
      Alert.alert('Error', 'Media upload failed');
      return null;
    }
  };

  const handleUpload = async () => {
    if (!user) return Alert.alert('Error', 'You must be signed in');
    if (!content.trim() && !media) return Alert.alert('Error', 'Write something or attach media');

    setLoading(true);
    try {
      let media_url = media ? await uploadMedia() : DEFAULT_IMAGE; // use default image if none selected

      const { error } = await supabase.from('posts').insert([
        {
          user_id: user.id,
          content: content.trim(),
          image_url: media?.type === 'image' || !media ? media_url : null,
          video_url: media?.type === 'video' ? media_url : null,
        },
      ]);

      if (error) throw error;

      setContent('');
      setMedia(null);
      onPostCreated();
      Alert.alert('Success', 'Post created!');
    } catch (err: any) {
      console.error('Post insert failed:', err);
      Alert.alert('Error', err.message || 'Post creation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <TextInput
        placeholder="Write a caption..."
        value={content}
        onChangeText={setContent}
        style={styles.input}
        multiline
      />

      {media?.type === 'image' && <Image source={{ uri: media.uri }} style={styles.media} />}
      {media?.type === 'video' && (
        <VideoView
          style={styles.media}
          source={{ uri: media.uri }}
          contentFit="contain"
          nativeControls
        />
      )}
      {!media && (
        <Image source={{ uri: DEFAULT_IMAGE }} style={[styles.media, { opacity: 0.4 }]} />
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={pickMedia} style={styles.pickButton}>
          <Text style={{ fontWeight: '600' }}>Add Photo/Video</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleUpload}
          style={[styles.postButton, loading && { opacity: 0.7 }]}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Post</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: '#fafafa',
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    fontSize: 16,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  media: {
    width: width - 24,
    height: 250,
    borderRadius: 12,
    marginVertical: 12,
    backgroundColor: '#000',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  pickButton: {
    backgroundColor: '#eee',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  postButton: {
    backgroundColor: '#2b6cdf',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
