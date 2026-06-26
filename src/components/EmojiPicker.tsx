import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useTheme, Colors, EMOJI_OPTIONS } from '../theme';

interface Props {
  selected: string;
  onSelect: (emoji: string) => void;
}

const createStyles = (colors: Colors) => StyleSheet.create({
  grid: { gap: 4 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    margin: 3,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cellSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceElevated,
  },
  emoji: { fontSize: 24 },
});

export default function EmojiPicker({ selected, onSelect }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <FlatList
      data={EMOJI_OPTIONS}
      numColumns={6}
      keyExtractor={(item) => item}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.cell, item === selected && styles.cellSelected]}
          onPress={() => onSelect(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.emoji}>{item}</Text>
        </TouchableOpacity>
      )}
      contentContainerStyle={styles.grid}
    />
  );
}
