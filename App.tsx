import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import * as Speech from 'expo-speech';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Check, CircleStop, Settings2, Volume2, X } from 'lucide-react-native';
import { locales, type Locale } from './src/locales';
import { backendRequest, validateConnection, type Connection } from './src/connection';
import { createPredictionScheduler } from './src/prediction';
import { loadConnection, storeConnection } from './src/credentials';
import { createAudioCache } from './src/audioCache';

const extra = Constants.expoConfig?.extra ?? {};
const green = '#14745c';

function SettingsButton({ label, onPress }: { label: string; onPress: () => void }) {
  const [hovered, setHovered] = useState(false);
  return <View style={styles.iconButton}>
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} style={styles.iconButton}><Settings2 size={22} color="#313a43" /></Pressable>
    {hovered && <Text style={styles.tooltip}>{label}</Text>}
  </View>;
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(extra.defaultLocale === 'bg' ? 'bg' : 'en');
  const [mode, setMode] = useState<'demo' | 'connected'>('demo');
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<'ready' | 'preparing' | 'speaking'>('ready');
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(false);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [url, setUrl] = useState<string>(extra.backendUrl ?? '');
  const [token, setToken] = useState('');
  const [saved, setSaved] = useState(false);
  const [predictionsEnabled, setPredictionsEnabled] = useState(false);
  const [predictions, setPredictions] = useState<string[]>([]);
  const input = useRef<TextInput>(null);
  const revision = useRef(0);
  const locked = useRef(false);
  const request = useRef<AbortController | null>(null);
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);
  const cache = useMemo(createAudioCache, []);
  const t = locales[locale];
  const scheduler = useMemo(() => createPredictionScheduler(async (value, signal) => {
    if (!connection || mode !== 'connected' || !predictionsEnabled) return [];
    const response = await backendRequest(connection, 'predictions', value, locale, signal);
    return (await response.json()).words;
  }, setPredictions), [connection, mode, predictionsEnabled, locale]);

  useEffect(() => {
    let mounted = true;
    loadConnection().then(stored => {
      if (!mounted || !stored) return;
      try {
        const checked = validateConnection(stored.url, stored.token, __DEV__);
        setConnection(checked);
        setUrl(checked.url);
        setToken(checked.token);
      } catch { /* Invalid or outdated stored settings are ignored. */ }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    setPredictions([]);
    if (mode === 'connected' && predictionsEnabled) scheduler.schedule(text);
    return () => scheduler.cancel();
  }, [text, scheduler, mode, predictionsEnabled]);

  useEffect(() => () => {
    revision.current += 1;
    request.current?.abort();
    void Speech.stop();
    void cache.clear().catch(() => {});
  }, [cache]);

  useEffect(() => {
    if (mode !== 'connected') return;
    if (playerStatus.didJustFinish || playerStatus.playbackState === 'error') {
      locked.current = false;
      setPhase('ready');
      if (playerStatus.playbackState === 'error') setError(t.error);
      player.replace(null);
      void cache.clear().catch(() => {});
    }
  }, [playerStatus.didJustFinish, playerStatus.playbackState, mode, player, cache, t.error]);

  async function stop() {
    revision.current += 1;
    request.current?.abort();
    player.pause();
    player.replace(null);
    await Speech.stop();
    await cache.clear().catch(() => {});
    locked.current = false;
    setPhase('ready');
  }

  function changeLocale(value: Locale) {
    scheduler.cancel();
    void stop();
    setPredictions([]);
    setLocale(value);
    setError('');
  }

  async function speak(value = text) {
    const message = value.trim();
    if (!message || locked.current) return;
    locked.current = true;
    const current = ++revision.current;
    setError('');
    setPhase('preparing');
    const finish = () => {
      if (revision.current !== current) return;
      locked.current = false;
      setPhase('ready');
    };
    try {
      if (mode === 'demo') {
        const voices = await Speech.getAvailableVoicesAsync();
        if (revision.current !== current) return;
        const voice = voices.find(item => item.language.toLowerCase().startsWith(locale));
        if (!voice) throw new Error('voice');
        Speech.speak(message, {
          language: locale, voice: voice.identifier,
          onStart: () => { if (revision.current === current) setPhase('speaking'); },
          onDone: finish, onStopped: finish,
          onError: () => { if (revision.current === current) setError(t.error); finish(); }
        });
      } else {
        if (!connection) throw new Error('connection');
        request.current = new AbortController();
        const response = await backendRequest(connection, 'speech', message, locale, request.current.signal);
        if (!response.headers.get('content-type')?.includes('audio/')) throw new Error('audio');
        const buffer = await response.arrayBuffer();
        if (revision.current !== current) return;
        const uri = await cache.prepare(buffer);
        if (revision.current !== current) { await cache.clear(); return; }
        await setAudioModeAsync({ playsInSilentMode: true });
        if (revision.current !== current) return;
        player.replace({ uri });
        player.play();
        setPhase('speaking');
      }
    } catch (failure) {
      if (revision.current !== current) return;
      const code = failure instanceof Error ? failure.message : '';
      setError(code === 'voice' ? t.noVoice : code === 'connection' ? t.noConnection : code === 'auth' ? t.authError : code === 'limit' ? t.limitError : t.error);
      finish();
    }
  }

  async function saveConnection() {
    try {
      const next = validateConnection(url, token, __DEV__);
      await storeConnection(next);
      scheduler.cancel();
      await stop();
      setConnection(next);
      setUrl(next.url);
      setToken(next.token);
      setSaved(true);
      setError('');
    } catch (failure) {
      const code = failure instanceof Error ? failure.message : '';
      setError(code === 'token' ? t.tokenError : code === 'url' || failure instanceof TypeError ? t.urlError : t.error);
    }
  }

  const busy = phase !== 'ready';
  const words = predictionsEnabled && mode === 'connected' && text.trim() && predictions.length ? predictions : [];

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.page}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <View style={styles.brand}>
                <View style={styles.brandMark}><Volume2 color="#26648e" size={22} /></View>
                <Text style={styles.brandText}>{t.title}</Text>
              </View>
              <SettingsButton label={t.settings} onPress={() => { setSettings(true); setSaved(false); setError(''); }} />
            </View>
            <View style={styles.toolbar}>
              <View style={styles.modeLabel}><View style={[styles.dot, mode === 'connected' && { backgroundColor: green }]} /><Text style={styles.modeText}>{mode === 'demo' ? t.demo : t.connected}</Text></View>
              <View style={styles.languages}>
                {(['en', 'bg'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={locales[value].language} accessibilityState={{ selected: locale === value }} onPress={() => changeLocale(value)} style={[styles.locale, locale === value && styles.localeActive]}><Text style={[styles.localeText, locale === value && { color: '#fff' }]}>{value.toUpperCase()}</Text></Pressable>)}
              </View>
            </View>
            <Text style={styles.greeting}>{t.greeting}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={busy ? t.stop : t.speak} accessibilityState={{ disabled: !busy && !text.trim() }} disabled={!busy && !text.trim()} onPress={() => busy ? void stop() : void speak()} style={[styles.speak, !busy && !text.trim() && styles.speakDisabled]}>
              {phase === 'preparing' ? <ActivityIndicator color="#fff" /> : busy ? <CircleStop color="#fff" size={28} /> : <Volume2 color="#fff" size={28} />}
              <Text style={styles.speakText}>{busy ? t.stop : t.speak}</Text>
            </Pressable>
            <View style={styles.inputHeader}><Text style={styles.label}>{t.message}</Text><Text style={styles.counter}>{text.length}/500</Text></View>
            <View style={styles.inputWrapper}>
              <TextInput ref={input} accessibilityLabel={t.message} value={text} onChangeText={value => { scheduler.cancel(); setText(value); setError(''); }} placeholder={t.placeholder} placeholderTextColor="#7a8580" multiline maxLength={500} autoCorrect spellCheck autoCapitalize="sentences" textAlignVertical="top" style={styles.input} />
              {!!text && <Pressable accessibilityRole="button" accessibilityLabel={t.clear} onPress={() => { scheduler.cancel(); setText(''); setPredictions([]); setError(''); input.current?.focus(); }} style={styles.clear}><X size={20} color="#53665c" /></Pressable>}
            </View>
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            {words.length > 0 && <View style={styles.phraseSection}><Text style={styles.label}>{t.suggestions}</Text><View style={styles.phrases}>{words.map(word => <Pressable accessibilityRole="button" accessibilityLabel={word} key={word} style={styles.prediction} onPress={() => { scheduler.cancel(); setText(previous => `${previous.trimEnd()} ${word} `.slice(0, 500)); setPredictions([]); input.current?.focus(); }}><Text style={styles.phraseText}>{word}</Text></Pressable>)}</View></View>}
            <View style={styles.phraseSection}>
              <Text style={styles.label}>{t.quick}</Text>
              <View style={styles.phrases}>{t.phraseList.map(phrase => <Pressable key={phrase} accessibilityRole="button" accessibilityLabel={phrase} disabled={busy} style={[styles.phrase, busy && { opacity: 0.5 }]} onPress={() => { if (locked.current) return; scheduler.cancel(); setText(phrase); void speak(phrase); }}><Text style={styles.phraseText}>{phrase}</Text></Pressable>)}</View>
            </View>
            <View style={styles.footer}><Text accessibilityLiveRegion="polite" style={styles.footerText}>{phase === 'preparing' ? t.working : phase === 'speaking' ? t.speaking : t.ready}</Text><Text style={styles.footerText}>{mode === 'demo' ? t.demoHint : connection ? new URL(connection.url).hostname : t.connected}</Text></View>
          </ScrollView>
        </KeyboardAvoidingView>
        <Modal visible={settings} transparent animationType="fade" onRequestClose={() => setSettings(false)}>
          <View style={styles.modalBackdrop}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalSize}>
              <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
                <View style={styles.modalHeader}><Text style={styles.settingsTitle}>{t.settings}</Text><Pressable accessibilityRole="button" accessibilityLabel={t.close} style={styles.iconButton} onPress={() => setSettings(false)}><X size={22} color="#28332f" /></Pressable></View>
                <Text style={styles.label}>{t.mode}</Text>
                <View style={styles.modeButtons}>{(['demo', 'connected'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: mode === value }} onPress={() => { scheduler.cancel(); void stop(); setMode(value); setPredictionsEnabled(false); setPredictions([]); setError(''); }} style={[styles.modeButton, mode === value && styles.modeButtonActive]}><Text style={[styles.modeButtonText, mode === value && { color: green }]}>{value === 'demo' ? t.demo : t.connected}</Text></Pressable>)}</View>
                {mode === 'connected' && <>
                  <Text style={styles.notice}>{t.connectedNotice}</Text>
                  <Text style={styles.label}>{t.url}</Text><TextInput accessibilityLabel={t.url} value={url} onChangeText={value => { setUrl(value); setSaved(false); }} placeholder="https://your-backend.example" autoCapitalize="none" autoCorrect={false} keyboardType="url" style={styles.settingInput} />
                  <Text style={styles.label}>{t.token}</Text><TextInput accessibilityLabel={t.token} value={token} onChangeText={value => { setToken(value); setSaved(false); }} secureTextEntry autoCapitalize="none" autoCorrect={false} style={styles.settingInput} />
                  {Platform.OS === 'web' && <Text style={styles.notice}>{t.webNotice}</Text>}
                  <Pressable accessibilityRole="button" onPress={() => void saveConnection()} style={styles.save}><Check size={18} color="#fff" /><Text style={styles.saveText}>{saved ? t.saved : t.save}</Text></Pressable>
                  {connection && <Pressable accessibilityRole="button" onPress={async () => { try { scheduler.cancel(); await stop(); await storeConnection(null); setConnection(null); setToken(''); setSaved(false); setPredictionsEnabled(false); } catch { setError(t.error); } }} style={styles.forget}><Text style={styles.forgetText}>{t.forget}</Text></Pressable>}
                  <View style={styles.switchRow}><Text style={styles.switchLabel}>{t.predictions}</Text><Switch accessibilityLabel={t.predictions} value={predictionsEnabled} disabled={!connection} onValueChange={value => { scheduler.cancel(); setPredictionsEnabled(value); }} trackColor={{ true: green }} /></View>
                  <Text style={styles.notice}>{t.predictionNotice}</Text>
                </>}
                {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, page: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 24, paddingTop: 18, paddingBottom: 36, width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#dce1e6' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }, brandMark: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8f1f8', borderRadius: 8 },
  brandText: { fontSize: 20, fontWeight: '700', color: '#232729', flexShrink: 1 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  tooltip: { position: 'absolute', right: 0, top: 44, zIndex: 10, minWidth: 140, padding: 8, backgroundColor: '#313a43', color: '#fff', fontSize: 12, borderRadius: 4 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 24, gap: 12 },
  modeLabel: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#b4771a' }, modeText: { color: '#60656c', fontSize: 13, fontWeight: '600', flexShrink: 1 },
  languages: { flexDirection: 'row', gap: 3 }, locale: { minWidth: 44, height: 44, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 6 }, localeActive: { backgroundColor: '#313a43' }, localeText: { fontSize: 13, color: '#60656c', fontWeight: '600' },
  greeting: { fontSize: 28, lineHeight: 36, fontWeight: '600', color: '#232729', marginBottom: 20, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  speak: { height: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: green, borderRadius: 8, marginBottom: 24 }, speakDisabled: { backgroundColor: '#71897b' }, speakText: { color: '#fff', fontSize: 25, fontWeight: '600' },
  inputHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 8 }, label: { fontSize: 13, color: '#60656c', fontWeight: '600', marginBottom: 8 }, counter: { fontSize: 12, color: '#69717a' },
  inputWrapper: { position: 'relative' }, input: { minHeight: 168, maxHeight: 260, borderWidth: 1, borderColor: '#bdc7d0', backgroundColor: '#fff', borderRadius: 8, padding: 18, paddingRight: 52, fontSize: 22, lineHeight: 32, color: '#232729' },
  clear: { position: 'absolute', right: 6, top: 6, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  phraseSection: { marginTop: 24 }, phrases: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, phrase: { minHeight: 46, paddingVertical: 12, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#d9dfe4', borderRadius: 6, maxWidth: '100%' }, phraseText: { fontSize: 15, color: '#313a43', lineHeight: 21 }, prediction: { minHeight: 46, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#e8f1f8', borderRadius: 6 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderTopColor: '#dce1e6', paddingTop: 16, marginTop: 28 }, footerText: { color: '#69717a', fontSize: 12, flexShrink: 1 },
  error: { fontSize: 15, color: '#a33131', lineHeight: 22, marginTop: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(20,36,27,0.35)', alignItems: 'center', justifyContent: 'center', padding: 16 }, modalSize: { width: '100%', maxWidth: 480, maxHeight: '90%' }, modal: { backgroundColor: '#fff', borderRadius: 8 }, modalContent: { padding: 22 }, modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12 }, settingsTitle: { fontSize: 21, color: '#182a21', fontWeight: '600', flexShrink: 1 },
  modeButtons: { flexDirection: 'row', gap: 8, marginBottom: 16 }, modeButton: { flex: 1, minHeight: 48, padding: 10, borderWidth: 1, borderColor: '#d3dfd8', borderRadius: 6, justifyContent: 'center', alignItems: 'center' }, modeButtonActive: { backgroundColor: '#edf6f0', borderColor: green }, modeButtonText: { fontSize: 14, fontWeight: '600', color: '#53645a', textAlign: 'center' }, notice: { fontSize: 13, lineHeight: 20, color: '#5d6c62', marginBottom: 18 }, settingInput: { borderWidth: 1, borderColor: '#b7cabe', borderRadius: 6, padding: 12, minHeight: 48, fontSize: 15, color: '#182a21', marginBottom: 18 }, save: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: green, borderRadius: 6, minHeight: 48, padding: 12, marginBottom: 12 }, saveText: { color: '#fff', fontSize: 15, fontWeight: '600', flexShrink: 1 }, forget: { alignItems: 'center', minHeight: 44, justifyContent: 'center' }, forgetText: { color: '#a33131', fontSize: 14 }, switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 18, marginBottom: 10 }, switchLabel: { fontSize: 15, color: '#182a21', flex: 1 }
});
