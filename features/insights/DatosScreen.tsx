import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InlineError } from '../../components/ui/InlineError';
import { Segmented } from '../../components/ui/Segmented';
import { Colors } from '../../constants/colors';
import { Spacing, tabClearance } from '../../constants/spacing';
import { Type } from '../../constants/typography';
import { RootStackParamList } from '../../types/navigation';
import { KpiBoard } from './components/KpiBoard';
import { HabitsSection, TrainingSection, WeightSection } from './components/PeriodSections';
import { SleepSection } from './components/SleepSection';
import { StrengthSection } from './components/StrengthSection';
import { useInsightsData } from './hooks/useInsightsData';
import { Kpi, Period } from './insightsMath';

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: '7', label: 'Semana' },
  { value: '30', label: 'Mes' },
  { value: '90', label: '3 meses' },
];

const NO_KPIS: Kpi[] = [];

export const DatosScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [period, setPeriod] = useState<Period>('7');
  const [refreshing, setRefreshing] = useState(false);
  const { data, strength, failed, refetchAll } = useInsightsData(period);
  // Mientras llega el periodo nuevo, las secciones siguen pintando el anterior con su forma.
  const shownPeriod = data?.period ?? period;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
  }, [refetchAll]);

  const logSleep = useCallback(() => navigation.navigate('LogSleepScreen', { fromToday: false }), [navigation]);
  const openExercise = useCallback((exerciseKey: string) => navigation.navigate('ExerciseProgressScreen', { exerciseKey }), [navigation]);

  const contentStyle = useMemo(
    () => [styles.content, { paddingTop: insets.top + Spacing.lg, paddingBottom: tabClearance(insets.bottom) + 24 }],
    [insets.bottom, insets.top],
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={contentStyle}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={Colors.ink} />}
    >
      <View style={styles.header}>
        <Text style={styles.overline}>{data?.range ?? ''}</Text>
        <Text style={styles.title}>Datos</Text>
      </View>
      <Segmented value={period} options={PERIODS} onChange={setPeriod} />
      {failed ? <InlineError title="No se han podido cargar los datos" body="Tira hacia abajo o inténtalo otra vez." onRetry={() => void onRefresh()} /> : null}
      <KpiBoard kpis={data?.kpis ?? NO_KPIS} />
      <SleepSection data={data} period={shownPeriod} onLog={logSleep} />
      <HabitsSection data={data} period={shownPeriod} />
      <WeightSection data={data} />
      <TrainingSection data={data} period={shownPeriod} />
      <StrengthSection exercises={strength} onOpen={openExercise} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  header: { gap: 4 },
  overline: { ...Type.overline, color: Colors.text3 },
  title: { ...Type.title, color: Colors.ink },
});
