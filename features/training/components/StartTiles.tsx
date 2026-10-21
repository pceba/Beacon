import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Plus, RotateCcw } from 'lucide-react-native';
import { PressableScale } from '../../../components/PressableScale';
import { Colors } from '../../../constants/colors';
import { Radius, Spacing } from '../../../constants/spacing';
import { Type } from '../../../constants/typography';
import { weekdayDay } from '../labels';

type Props = {
  locked: boolean;
  last: { name: string; startedAt: string } | null;
  onBlank: () => void;
  onRepeat: () => void;
};

type TileProps = { icon: typeof Plus; title: string; caption?: string; disabled: boolean; onPress: () => void };

const Tile = ({ icon: Icon, title, caption, disabled, onPress }: TileProps) => (
  <PressableScale accessibilityLabel={caption ? `${title}, ${caption}` : title} disabled={disabled} onPress={onPress} style={styles.tile} layoutStyle={styles.tileLayout}>
    <View style={[styles.icon, disabled ? styles.iconOff : null]}>
      <Icon color={disabled ? Colors.text4 : Colors.workout} size={20} />
    </View>
    <View style={styles.copy}>
      <Text numberOfLines={1} style={[styles.title, disabled ? styles.off : null]}>
        {title}
      </Text>
      {caption ? (
        <Text numberOfLines={1} style={[styles.caption, disabled ? styles.off : null]}>
          {caption}
        </Text>
      ) : null}
    </View>
  </PressableScale>
);

// «Empezar vacío» y «Repetir el último» (desactivado si no hay ninguno).
export const StartTiles = memo(({ locked, last, onBlank, onRepeat }: Props) => (
  <View style={styles.row}>
    <Tile icon={Plus} title="Empezar vacío" disabled={locked} onPress={onBlank} />
    <Tile
      icon={RotateCcw}
      title="Repetir el último"
      caption={last ? `${last.name} · ${weekdayDay(last.startedAt)}` : 'Aún no hay ninguno'}
      disabled={locked || !last}
      onPress={onRepeat}
    />
  </View>
));

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.md },
  tileLayout: { flex: 1 },
  tile: { minHeight: 96, borderRadius: Radius.lg, backgroundColor: Colors.fill, padding: 14, gap: Spacing.sm, justifyContent: 'space-between' },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.workoutSoft, alignItems: 'center', justifyContent: 'center' },
  iconOff: { backgroundColor: Colors.track },
  copy: { gap: 0 },
  title: { ...Type.bodyStrong, color: Colors.ink },
  caption: { ...Type.caption, color: Colors.text3 },
  off: { color: Colors.text4 },
});
