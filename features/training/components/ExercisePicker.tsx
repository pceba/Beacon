import React, { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, ListRenderItem, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Plus, Search } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../../components/ui/Button';
import { Colors } from '../../../constants/colors';
import { Radius, Spacing } from '../../../constants/spacing';
import { Type, tabular } from '../../../constants/typography';
import { selection } from '../../../lib/haptics';
import { EXERCISE_CATALOG } from '../catalog';
import { buildPickerRows, PickerRow, recentExerciseNames, selectionIndex, toggleSelection } from '../exerciseSearch';
import { trainingQueries } from '../trainingQueries';

type Props = {
  // «multi»: marcar varios y «Añadir». «single» (Reemplazar): tocar uno elige y cierra.
  mode: 'multi' | 'single';
  onConfirm: (names: string[]) => void;
};

const NO_NAMES: string[] = [];

type RowProps = { row: PickerRow; order: number; multi: boolean; onPress: (name: string) => void };

const Row = memo(({ row, order, multi, onPress }: RowProps) => {
  if (row.kind === 'header') return <Text style={styles.header}>{row.title}</Text>;
  const create = row.kind === 'create';
  const selected = order > 0;
  return (
    <Pressable
      accessibilityRole={multi ? 'checkbox' : 'button'}
      accessibilityState={multi ? { checked: selected } : undefined}
      accessibilityLabel={create ? `Crear ${row.name}` : row.name}
      onPress={() => onPress(row.name)}
      style={styles.row}
    >
      {create ? <Plus color={Colors.accent} size={18} /> : null}
      <Text numberOfLines={1} style={[styles.name, create ? styles.create : null]}>
        {create ? `Crear «${row.name}»` : row.name}
      </Text>
      {multi && !create ? (
        <View style={[styles.mark, selected ? styles.markOn : null]}>{selected ? <Text style={styles.markText}>{order}</Text> : null}</View>
      ) : null}
    </Pressable>
  );
});

export const ExercisePicker = ({ mode, onConfirm }: Props) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>(NO_NAMES);
  const strength = useQuery(trainingQueries.strength());
  const recents = useMemo(() => recentExerciseNames(strength.data ?? []), [strength.data]);
  const rows = useMemo(() => buildPickerRows({ query, recents, catalog: EXERCISE_CATALOG, selected }), [query, recents, selected]);
  const multi = mode === 'multi';

  const onPress = useCallback(
    (name: string) => {
      if (!multi) {
        onConfirm([name]);
        return;
      }
      selection();
      setSelected((current) => toggleSelection(current, name));
      setQuery((current) => (current ? '' : current));
    },
    [multi, onConfirm],
  );

  const renderItem: ListRenderItem<PickerRow> = useCallback(
    ({ item }) => <Row row={item} order={item.kind === 'item' ? selectionIndex(selected, item.name) + 1 : 0} multi={multi} onPress={onPress} />,
    [multi, onPress, selected],
  );

  const count = selected.length;

  return (
    <View style={styles.wrap}>
      <View style={styles.search}>
        <Search color={Colors.text3} size={18} />
        <TextInput
          accessibilityLabel="Buscar o crear ejercicio"
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar o crear ejercicio"
          placeholderTextColor={Colors.text4}
          returnKeyType="done"
          autoCorrect={false}
          maxLength={60}
          style={styles.input}
        />
      </View>
      <FlatList
        data={rows}
        keyExtractor={keyOf}
        renderItem={renderItem}
        extraData={selected}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={16}
        style={styles.list}
      />
      {multi ? (
        <View style={styles.footer}>
          <Button
            title={count === 1 ? 'Añadir 1 ejercicio' : count > 1 ? `Añadir ${count} ejercicios` : 'Añadir ejercicios'}
            disabled={count === 0}
            onPress={() => onConfirm(selected)}
          />
        </View>
      ) : null}
    </View>
  );
};

const keyOf = (row: PickerRow) => row.key;

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.fill,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
  },
  // Sin el marco de foco del navegador en web: la caja gris ya marca el campo.
  input: { ...Type.body, color: Colors.ink, flex: 1, minHeight: 48, paddingVertical: 0, outlineWidth: 0 },
  list: { flex: 1, marginTop: Spacing.sm },
  header: { ...Type.label, color: Colors.text3, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.line,
  },
  name: { ...Type.body, color: Colors.ink, flex: 1 },
  create: { color: Colors.accent },
  mark: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  markOn: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  markText: { ...Type.caption, ...tabular, color: Colors.surface },
  footer: { paddingTop: Spacing.sm },
});
