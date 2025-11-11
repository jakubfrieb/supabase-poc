import React from 'react';
import { View, Image, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {items.map((att, idx) => {
        const isImage = (att.contentType || att.fileName || att.uri).toLowerCase().match(/\.(png|jpg|jpeg|gif|webp)$/);
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
              {isImage ? (
                <TouchableOpacity activeOpacity={0.85} onPress={() => onPreview && onPreview(idx)} style={{ width: '100%', height: '100%' }}>
                  <Image source={{ uri: att.url || att.uri }} style={{ width: '100%', height: '100%' }} />
                </TouchableOpacity>
              ) : (
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="document-text-outline" size={24} color="#6b7280" />
                  <Text numberOfLines={1} style={{ fontSize: 10, color: '#6b7280', paddingHorizontal: 4 }}>
                    {att.fileName || 'soubor'}
                  </Text>
                </View>
              )}
            </View>
            {onRemove ? (
              <TouchableOpacity
                onPress={() => onRemove(idx)}
                style={{ position: 'absolute', top: -8, right: -8, backgroundColor: '#0009', borderRadius: 12, padding: 4 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash" size={14} color="#fff" />
              </TouchableOpacity>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}


