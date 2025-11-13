import React, { useState } from 'react';
import { View, Image, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DeleteButton } from './DeleteButton';

type Attachment = {
  id?: string;
  uri: string;
  url?: string;
  fileName?: string;
  contentType?: string;
};

export function AttachmentsGrid({
  items,
  onRemove,
  onPreview,
}: {
  items: Attachment[];
  onRemove?: (index: number) => void;
  onPreview?: (index: number) => void;
}) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [imageLoading, setImageLoading] = useState<Set<string>>(new Set());

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {items.map((att, idx) => {
        // Check if it's an image by contentType first, then by file extension
        const contentType = att.contentType?.toLowerCase() || '';
        const fileName = att.fileName?.toLowerCase() || '';
        const uri = (att.url || att.uri || '').toLowerCase();
        const imageUri = att.url || att.uri;
        const itemKey = att.id || att.uri || `item-${idx}`;
        
        const isImageByContentType = contentType.startsWith('image/');
        const isImageByExtension = /\.(png|jpg|jpeg|gif|webp)(\?|$)/.test(fileName) || /\.(png|jpg|jpeg|gif|webp)(\?|$)/.test(uri);
        const isImage = isImageByContentType || isImageByExtension;
        const hasError = imageErrors.has(itemKey);
        const isLoading = imageLoading.has(itemKey);
        
        return (
          <View key={`${att.id || att.uri}-${idx}`} style={{ marginRight: 8, marginBottom: 8 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 8,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: '#e5e7eb',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fafafa',
              }}
            >
              {isImage && !hasError ? (
                <TouchableOpacity 
                  activeOpacity={0.85} 
                  onPress={() => onPreview && onPreview(idx)} 
                  style={{ width: '100%', height: '100%' }}
                >
                  {isLoading && (
                    <View style={{ position: 'absolute', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
                      <ActivityIndicator size="small" color="#6b7280" />
                    </View>
                  )}
                  <Image 
                    source={{ uri: imageUri }} 
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                    onLoadStart={() => {
                      setImageLoading(prev => new Set(prev).add(itemKey));
                    }}
                    onLoadEnd={() => {
                      setImageLoading(prev => {
                        const next = new Set(prev);
                        next.delete(itemKey);
                        return next;
                      });
                    }}
                    onError={() => {
                      setImageErrors(prev => new Set(prev).add(itemKey));
                      setImageLoading(prev => {
                        const next = new Set(prev);
                        next.delete(itemKey);
                        return next;
                      });
                    }}
                  />
                </TouchableOpacity>
              ) : (
                <View style={{ alignItems: 'center', justifyContent: 'center', padding: 4 }}>
                  <Ionicons 
                    name={isImage && hasError ? "image-outline" : "document-text-outline"} 
                    size={24} 
                    color="#6b7280" 
                  />
                  <Text numberOfLines={1} style={{ fontSize: 10, color: '#6b7280', paddingHorizontal: 4, marginTop: 4 }}>
                    {att.fileName || 'soubor'}
                  </Text>
                </View>
              )}
            </View>
            {onRemove ? (
              <DeleteButton
                onDelete={() => onRemove(idx)}
                size={14}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}


