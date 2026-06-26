import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet, ImageStyle, StyleProp } from 'react-native';
import { useTheme, Colors } from '../theme';

interface Props {
  username: string;
  photoBase64?: string;
  size?: number;
  color?: string;
  style?: StyleProp<ImageStyle>;
}

const createStyles = (colors: Colors) => StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff', fontWeight: '700' },
});

export default function Avatar({ username, photoBase64, size = 40, color, style }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const radius = size / 2;
  const fontSize = Math.round(size * 0.35);
  const bgColor = color ?? colors.accent;
  const imageUri = photoBase64 ? `data:image/jpeg;base64,${photoBase64}` : undefined;

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[{ width: size, height: size, borderRadius: radius }, style]}
      />
    );
  }

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: radius, backgroundColor: bgColor },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>
        {(username || '?').slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}
