import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Segmented } from '../../../components/ui/Segmented';
import { Colors } from '../../../constants/colors';
import { Radius, Spacing } from '../../../constants/spacing';
import { Type } from '../../../constants/typography';
import { PlanView } from '../planPeriods';

const OPTIONS: Array<{ value: PlanView; label: string }> = [
  { value: 'month', label: 'Mes' },
  { value: 'week', label: 'Semana' },
  { value: 'day', label: 'Día' },
  { value: 'list', label: 'Lista' },
];

type Props = {
  title: string;
  view: PlanView;
  onView: (view: PlanView) => void;
  onToday: () => void;
  onAdd: () => void;
};

// Cabecera común de Plan (DESIGN.md §8.1).
export const PlanHeader = memo(({ title, view, onView, onToday, onAdd }: Props) => (
  <View style={styles.wrap}>
    <View style={styles.row}>
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Ir a hoy" onPress={onToday} style={styles.today}>
          <Text style={styles.todayText}>Hoy</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Añadir al plan" onPress={onAdd} style={styles.plus}>
          <Plus color={Colors.surface} size={22} />
        </Pressable>
      </View>
    </View>
    <Segmented value={view} options={OPTIONS} onChange={onView} />
  </View>
));

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  title: { ...Type.headline, color: Colors.ink, flexShrink: 1 },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  today: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: { ...Type.bodyStrong, fontSize: 14, color: Colors.ink },
  plus: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center' },
});
