import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';
import { Type } from '../../constants/typography';
import { PressableScale } from '../PressableScale';

type Props = {
  title: string;
  value?: string;
  icon?: React.ComponentType<{ size: number; color: string }>;
  iconColor?: string;
  iconSoft?: string;
  chevron?: boolean;
  onPress?: () => void;
  last?: boolean;
};

export const ListRow = ({ title, value, icon: Icon, iconColor = Colors.accent, iconSoft = Colors.accentSoft, chevron, onPress, last }: Props) => {
  const body = (
    <>
      {Icon ? (
        <View style={[styles.icon, { backgroundColor: iconSoft }]}>
          <Icon size={18} color={iconColor} />
        </View>
      ) : null}
      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      {value ? (
        <Text numberOfLines={1} style={styles.value}>
          {value}
        </Text>
      ) : null}
      {chevron ? <ChevronRight color={Colors.text4} size={18} /> : null}
    </>
  );

  if (!onPress) return <View style={[styles.row, last ? styles.last : null]}>{body}</View>;

  return (
    <PressableScale accessibilityLabel={value ? `${title}, ${value}` : title} onPress={onPress} style={[styles.row, last ? styles.last : null]}>
      {body}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.line,
  },
  last: { borderBottomWidth: 0 },
  icon: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  title: { ...Type.body, color: Colors.ink, flex: 1 },
  value: { ...Type.body, color: Colors.text3 },
});
