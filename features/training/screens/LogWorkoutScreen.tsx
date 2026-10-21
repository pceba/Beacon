import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Dumbbell, History } from 'lucide-react-native';
import { Card } from '../../../components/ui/Card';
import { ConfirmSheet } from '../../../components/ui/ConfirmSheet';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ListRow } from '../../../components/ui/ListRow';
import { Sheet } from '../../../components/ui/Sheet';
import { Colors } from '../../../constants/colors';
import { Spacing } from '../../../constants/spacing';
import { Type } from '../../../constants/typography';
import { toast } from '../../../lib/toast';
import { LogStackParamList } from '../../../types/navigation';
import { useReturnToToday } from '../../../utils/finishLog';
import { ActionMenu, MenuItem } from '../components/ActionMenu';
import { ActiveWorkoutCard } from '../components/ActiveWorkoutCard';
import { RoutineRow } from '../components/RoutineRow';
import { ScreenBar } from '../components/ScreenBar';
import { StartTiles } from '../components/StartTiles';
import { useStartActions } from '../hooks/useStartActions';
import { trainingQueries } from '../trainingQueries';

const ROUTINE_MENU: MenuItem[] = [
  { key: 'edit', label: 'Editar' },
  { key: 'duplicate', label: 'Duplicar' },
  { key: 'delete', label: 'Eliminar', danger: true },
];

type Dialog = 'menu' | 'delete' | 'discard' | null;

// Empezar (DESIGN.md §7.1): entreno en curso, empezar vacío, repetir, rutinas e historial.
export const LogWorkoutScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<LogStackParamList, 'LogWorkoutScreen'>>();
  const fromToday = route.params?.fromToday;
  useReturnToToday(fromToday);
  const insets = useSafeAreaInsets();
  const actions = useStartActions(fromToday);
  const active = useQuery(trainingQueries.active('any'));
  const last = useQuery(trainingQueries.last());
  const routines = useQuery(trainingQueries.routines());
  const [dialog, setDialog] = useState<Dialog>(null);
  const [routineId, setRoutineId] = useState<string | null>(null);

  const failed = active.isError || last.isError || routines.isError;
  useEffect(() => {
    if (failed) toast.show({ message: 'No se ha podido cargar todo. Vuelve a abrir para reintentar.', kind: 'error' });
  }, [failed]);

  const current = active.data ?? null;
  const locked = !!current || actions.busy;
  const lastInfo = useMemo(
    () => (last.data ? { name: last.data.workout.name, startedAt: last.data.workout.started_at } : null),
    [last.data],
  );
  const list = routines.data ?? [];
  const selected = list.find((routine) => routine.id === routineId) ?? null;

  const close = useCallback(() => navigation.goBack(), [navigation]);
  const closeDialog = useCallback(() => setDialog(null), []);
  const onRepeat = useCallback(() => {
    if (last.data) actions.repeat(last.data.workout.id);
  }, [actions, last.data]);
  const onMenu = useCallback((id: string) => {
    setRoutineId(id);
    setDialog('menu');
  }, []);
  const onRoutineMenu = useCallback(
    (key: string) => {
      if (key === 'delete') return setDialog('delete');
      setDialog(null);
      if (!routineId) return;
      if (key === 'edit') actions.editRoutine(routineId);
      if (key === 'duplicate') void actions.duplicate(routineId);
    },
    [actions, routineId],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenBar title="Entreno" leftLabel="Cancelar" onLeft={close} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xxl }]}>
        {current ? (
          <>
            <ActiveWorkoutCard workout={current} onContinue={() => actions.open(current.id)} onDiscard={() => setDialog('discard')} />
            <Text style={styles.note}>Termina o descarta el entreno en curso para empezar otro.</Text>
          </>
        ) : null}
        <StartTiles locked={locked} last={lastInfo} onBlank={actions.startBlank} onRepeat={onRepeat} />
        <View style={styles.sectionHead}>
          <Text style={styles.section}>Rutinas</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Nueva rutina" onPress={actions.newRoutine} style={styles.link}>
            <Text style={styles.linkText}>Nueva rutina</Text>
          </Pressable>
        </View>
        {routines.isSuccess && list.length === 0 ? (
          <Card>
            <EmptyState
              icon={Dumbbell}
              color={Colors.workout}
              soft={Colors.workoutSoft}
              title="Crea tu primera rutina"
              body="Guarda los ejercicios que repites y empieza en un toque."
              action={{ label: 'Nueva rutina', onPress: actions.newRoutine }}
            />
          </Card>
        ) : list.length ? (
          <Card inset>
            {list.map((routine, index) => (
              <RoutineRow key={routine.id} routine={routine} locked={locked} last={index === list.length - 1} onStart={actions.startRoutine} onMenu={onMenu} />
            ))}
          </Card>
        ) : null}
        <Card inset>
          <ListRow title="Historial" icon={History} iconColor={Colors.workout} iconSoft={Colors.workoutSoft} chevron last onPress={actions.history} />
        </Card>
      </ScrollView>
      <Sheet visible={dialog === 'menu'} onClose={closeDialog} label="Opciones de la rutina">
        <ActionMenu title={selected?.name} items={ROUTINE_MENU} onSelect={onRoutineMenu} />
      </Sheet>
      <ConfirmSheet
        visible={dialog === 'delete'}
        title="¿Eliminar la rutina?"
        body="Los entrenos que hiciste con ella no se borran."
        confirmLabel="Eliminar"
        onConfirm={() => {
          setDialog(null);
          if (routineId) void actions.removeRoutine(routineId);
        }}
        onClose={closeDialog}
      />
      <ConfirmSheet
        visible={dialog === 'discard'}
        title="¿Descartar el entreno?"
        body="Se borran sus ejercicios y series."
        confirmLabel="Descartar"
        onConfirm={() => {
          setDialog(null);
          if (current) void actions.discardActive(current.id);
        }}
        onClose={closeDialog}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  note: { ...Type.caption, color: Colors.text3 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  section: { ...Type.section, color: Colors.ink },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { ...Type.bodyStrong, color: Colors.accent },
});
