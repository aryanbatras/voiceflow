import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ImagePlus, X, Wand2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { getAgent } from '@/services/agent';
import { useAuthStore } from '@/store/auth-store';

const MAX_IMAGES = 4;

export default function ComposeScreen({ navigation, route }: any) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const session = useAuthStore((s) => s.session);

  const [caption, setCaption] = useState('');
  const [images, setImages] = useState<{ uri: string; width: number; height: number }[]>([]);
  const [posting, setPosting] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [inputHeight, setInputHeight] = useState(100);

  // Reply context from route params
  const replyUri = route?.params?.replyUri;
  const replyCid = route?.params?.replyCid;
  const replyAuthor = route?.params?.replyAuthor;
  const replyText = route?.params?.replyText;

  const pickImages = useCallback(async () => {
    if (isPicking) return;
    setIsPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: MAX_IMAGES - images.length,
      });
      if (!result.canceled && result.assets.length > 0) {
        const newImages = result.assets.map((a) => ({
          uri: a.uri,
          width: a.width || 1200,
          height: a.height || 1200,
        }));
        setImages((prev) => [...prev, ...newImages].slice(0, MAX_IMAGES));
      }
    } finally {
      setIsPicking(false);
    }
  }, [images.length, isPicking]);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handlePost = useCallback(async () => {
    if (!isAuthenticated || !session) {
      Alert.alert('Login required', 'Please sign in to post');
      navigation.navigate('Login');
      return;
    }
    if (images.length === 0) {
      Alert.alert('Error', 'Please select at least one image');
      return;
    }
    setPosting(true);
    try {
      const agent = getAgent();

      // Upload all images
      const uploadedImages = [];
      for (const img of images) {
        const response = await fetch(img.uri);
        const blob = await response.blob();
        const upload = await agent.uploadBlob(blob, { encoding: 'image/jpeg' });
        uploadedImages.push({ image: upload.data.blob, alt: '' });
      }

      // Build embed
      const embed: any = {
        $type: 'app.bsky.embed.images',
        images: uploadedImages,
      };

      // Build reply ref if replying
      let reply: any = undefined;
      if (replyUri && replyCid) {
        reply = {
          parent: { uri: replyUri, cid: replyCid },
          root: { uri: replyUri, cid: replyCid },
        };
      }

      await agent.post({
        text: caption.trim(),
        embed,
        reply,
      });

      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to post');
    }
    setPosting(false);
  }, [isAuthenticated, session, images, caption, replyUri, replyCid, navigation]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header — matching web: Cancel text + Post button */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="text-sm text-foreground hover:text-muted-foreground transition-colors">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-foreground">
          {replyUri ? 'Reply' : 'New Post'}
        </Text>
        <TouchableOpacity
          onPress={handlePost}
          disabled={posting || (!caption.trim() && images.length === 0)}
          className="px-5 py-2 rounded-full bg-brand opacity-100 disabled:opacity-40"
        >
          {posting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text className="text-white font-semibold text-sm">{replyUri ? 'Reply' : 'Post'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Reply context */}
        {replyAuthor && replyText && (
          <View className="flex-row gap-3 mb-4 px-1">
            <View className="w-10 shrink-0" />
            <View className="flex-1 pb-2 border-b border-border">
              <Text className="text-sm text-muted-foreground">
                Replying to <Text className="text-blue font-medium">@{replyAuthor}</Text>
              </Text>
              <Text className="text-sm text-muted-foreground mt-0.5 line-clamp-1" numberOfLines={1}>{replyText}</Text>
            </View>
          </View>
        )}

        {/* Image grid */}
        {images.length > 0 && (
          <View className={`mb-4 ${images.length > 1 ? 'flex-row flex-wrap gap-2' : ''}`}>
            {images.map((img, i) => (
              <View
                key={i}
                className={`relative rounded-xl overflow-hidden border border-border ${
                  images.length > 1 ? 'w-[48%]' : 'w-full'
                }`}
                style={{ height: images.length > 1 ? 160 : 320 }}
              >
                <Image source={{ uri: img.uri }} className="w-full h-full" resizeMode="cover" />
                <TouchableOpacity
                  onPress={() => removeImage(i)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 items-center justify-center"
                >
                  <X size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Image picker button */}
        {images.length < MAX_IMAGES && (
          <TouchableOpacity
            onPress={pickImages}
            className="w-full h-32 rounded-xl border-2 border-dashed border-border items-center justify-center mb-4"
          >
            <ImagePlus size={36} color="#8e8e8e" />
            <Text className="text-muted-foreground text-sm mt-2">
              {images.length === 0 ? 'Tap to add images' : `Add more (${images.length}/${MAX_IMAGES})`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Caption — auto-resizing like web */}
        <TextInput
          className="bg-surface-elevated rounded-xl px-4 py-3 text-foreground text-[15px]"
          style={{ height: Math.max(100, inputHeight), minHeight: 100 }}
          placeholder="What's happening?"
          placeholderTextColor="#8e8e8e"
          value={caption}
          onChangeText={setCaption}
          onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
          multiline
          textAlignVertical="top"
          maxLength={300}
        />

        <View className="flex-row items-center justify-between mt-3">
          <View className="flex-row items-center gap-2">
            {posting && (
              <View className="flex-row items-center gap-1">
                <View className="h-2 w-2 rounded-full bg-brand animate-pulse" />
                <Text className="text-xs text-muted-foreground">Posting...</Text>
              </View>
            )}
            {isPicking && (
              <View className="flex-row items-center gap-1">
                <View className="h-2 w-2 rounded-full bg-brand animate-pulse" />
                <Text className="text-xs text-muted-foreground">Compressing...</Text>
              </View>
            )}
          </View>
          <Text className="text-xs text-muted-foreground tabular-nums">{caption.length}/300</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
