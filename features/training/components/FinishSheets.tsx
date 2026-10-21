import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/ui/Button';
import { Colors } from '../../../constants/colors';
import { Radius, Spacing } from '../../../constants/spacing';
import { Type, tabular } from '../../../constants/typography';
import { formatNumber } from '../../../utils/format';
import { formatPr, SessionSummary } from '../sessionMath';

export type UntickedChoice = 'mark' | 'drop' | 'keep';

// «Tienes 3 series sin marcar»
export const UntickedContent = ({ count, onChoose }: { count: number; onChoose: (choice: UntickedChoice) => void }) => (
  <View style={styles.wrap}>
    <Text style={styles.title}>{count === 1 ? 'Tienes 1 serie sin marcar' : `Tienes ${formatNumber(count)} series sin marcar`}</Text>
    <Text style={styles.body}>Tienen valores pero no las has marcado como hechas.</Text>
    <View style={styles.buttons}>
      <Button title="Marcarlas como hechas" onPress={() => onChoose('mark')} />
      <Button title="Descartarlas" variant="outline" onPress={() => onChoose('drop')} />
      <Button title="Seguir entrenando" variant="ghost" onPress={() => onChoose('keep')} />
    </View>
  </View>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.stat}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text maxFontSizeMultiplier={1.3} style={styles.statValue}>
      {value}
    </Text>
  </View>
);

type SummaryProps = { summary: SessionSummary; onSaveRoutine: () => void; onDone: () => void };

export const SummaryContent = ({ summary, onSaveRoutine, onDone }: SummaryProps) => (
  <View style={styles.wrap}>
    <Text style={styles.title}>Entreno terminado</Text>
    <View style={styles.grid}>
      <Stat label="Duración" value={`${formatNumber(summary.durationMinutes)} min`} />
      <Stat label="Volumen" value={summary.volumeKg > 0 ? `${formatNumber(Math.round(summary.volumeKg))} kg` : '—'} />
      <Stat label="Series" value={formatNumber(summary.setsDone)} />
      <Stat label="PRs" value={formatNumber(summary.prs.length)} />
    </View>
    {summary.prs.length ? (
      <View style={styles.prs}>
        {summary.prs.map((pr) => (
          <Text key={pr.exerciseId} style={styles.pr}>
            {formatPr(pr)}
          </Text>
        ))}
      </View>
    ) : null}
    <View style={styles.buttons}>
      <Button title="Guardar como rutina" variant="secondary" onPress={onSaveRoutine} />
      <Button title="Listo" onPress={onDone} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  title: { ...Type.headline, color: Colors.ink },
  body: { ...Type.body, color: Colors.text2 },
  buttons: { gap: Spacing.sm, marginTop: Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  stat: { flexBasis: '47%', flexGrow: 1, backgroundColor: Colors.fill, borderRadius: Radius.md, padding: 14, gap: 4 },
  statLabel: { ...Type.label, color: Colors.text3 },
  statValue: { ...Type.headline, ...tabular, color: Colors.ink },
  prs: { gap: 4 },
  pr: { ...Type.body, ...tabular, color: Colors.success },
});
