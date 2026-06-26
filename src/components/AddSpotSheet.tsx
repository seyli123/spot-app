import React, { useState, useMemo, useRef } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import MapView, { Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTheme, Colors, COPENHAGEN, DARK_MAP_STYLE, EMOJI_OPTIONS } from '../theme';
import EmojiPicker from './EmojiPicker';
import { createSpot } from '../services/firestore';
import { User } from '../types';

interface Props {
  visible: boolean;
  user: User;
  onClose: () => void;
}

const createStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  cancelBtn: { width: 60 },
  cancelText: { color: colors.accent, fontSize: 16 },
  title: { color: colors.text, fontSize: 17, fontWeight: '600' },
  mapContainer: { height: 220, position: 'relative' },
  map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  pinContainer: {
    position: 'absolute', top: '50%', left: '50%',
    transform: [{ translateX: -20 }, { translateY: -48 }],
    alignItems: 'center',
  },
  pin: {
    fontSize: 36,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4,
  },
  pinShadow: {
    width: 8, height: 4, backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 4, marginTop: 2,
  },
  mapHint: {
    position: 'absolute', bottom: 10, alignSelf: 'center',
    color: '#fff', fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, overflow: 'hidden',
  },
  locateBtn: {
    position: 'absolute', bottom: 10, right: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25, shadowRadius: 3, elevation: 4,
  },
  locateIcon: { fontSize: 18, color: '#333', lineHeight: 22 },
  form: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  label: {
    color: colors.textSecondary, fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 12,
  },
  input: {
    backgroundColor: colors.surface, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border,
  },
  addBtn: {
    backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 20, marginBottom: 8,
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

export default function AddSpotSheet({ visible, user, onClose }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState<Region>({ ...COPENHAGEN, latitudeDelta: 0.01, longitudeDelta: 0.01 });
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<MapView>(null);

  async function handleLocateMe() {
    if (locating) return;
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow location access to use this feature.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapRef.current?.animateToRegion({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 600);
    } catch {
      Alert.alert('Location error', 'Could not get your location. Try again.');
    } finally {
      setLocating(false);
    }
  }

  async function handleAdd() {
    if (!name.trim()) { Alert.alert('Name required', 'Give this spot a name.'); return; }
    setLoading(true);
    try {
      await createSpot({ name: name.trim(), lat: region.latitude, lng: region.longitude, emoji, addedBy: user.id, createdAt: Date.now() });
      setName(''); setEmoji(EMOJI_OPTIONS[0]); onClose();
    } catch { Alert.alert('Error', 'Failed to add spot. Try again.'); }
    finally { setLoading(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add Spot</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region}
            onRegionChangeComplete={setRegion}
            customMapStyle={DARK_MAP_STYLE}
            userInterfaceStyle="dark"
          />
          <View style={styles.pinContainer} pointerEvents="none">
            <Text style={styles.pin}>{emoji}</Text>
            <View style={styles.pinShadow} />
          </View>
          <Text style={styles.mapHint}>Pan to place the pin</Text>
          <TouchableOpacity style={styles.locateBtn} onPress={handleLocateMe} activeOpacity={0.7}>
            {locating
              ? <ActivityIndicator size="small" color="#333" />
              : <Text style={styles.locateIcon}>⊕</Text>}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.form}>
          <Text style={styles.label}>Spot name</Text>
          <TextInput
            style={styles.input} value={name} onChangeText={setName}
            placeholder="e.g. Juno the Bakery" placeholderTextColor={colors.textMuted}
            maxLength={48} returnKeyType="done"
          />
          <Text style={styles.label}>Pick an emoji</Text>
          <EmojiPicker selected={emoji} onSelect={setEmoji} />
          <TouchableOpacity
            style={[styles.addBtn, loading && styles.addBtnDisabled]}
            onPress={handleAdd} disabled={loading} activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.addBtnText}>Add to map</Text>}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
