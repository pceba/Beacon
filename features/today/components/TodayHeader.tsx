import React, { memo, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { BeaconMark } from '../../../components/ui/BeaconMark';
import { Colors } from '../../../constants/colors';
import { Type, tabular } from '../../../constants/typography';
import { success } from '../../../lib/haptics';
import { getStored, setStored } from '../../../lib/storage';
import { fromKey } from '../../../utils/dates';
import { formatNumber } from '../../../utils/format';
import { monthDay, weekdayName } from '../../../utils/labels';
import { Entrance } from '../hooks/useEntrance';

type Props = {
  todayKey: string;
  initial: string;
  brief: string;
  doneCount: number;
  checkCount: number;
  reduce: boolean;
  enter: Entrance['enter'];
  onOpenSettings: () => void;
};

export const TodayHeader = memo(({ todayKey, initial, brief, doneCount, checkCount, reduce, enter, onOpenSettings }: Props) => {
  const today = fromKey(todayKey);
  return (
    <>
      <Animated.View entering={enter(0)} style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.overline}>{weekdayName(today)}</Text>
          <Text style={styles.title}>{monthDay(today)}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Ajustes y cuenta" onPress={onOpenSettings} style={styles.avatar}>
          {initial ? <Text style={styles.avatarText}>{initial}</Text> : <BeaconMark size={26} />}
        </Pressable>
      </Animated.View>
      <Animated.View entering={enter(1)}>
        <BriefLine text={brief} />
      </Animated.View>
      <DayProgress todayKey={todayKey} doneCount={doneCount} checkCount={checkCount} reduce={reduce} enter={enter} />
    </>
  );
});

const BRIEF_PARTS = /(«[^»]+»|\d{1,3}(?:\.\d{3})*(?:,\d+)?(?:\s(?:ml|L|h|kcal|min)\b(?![A-Za-zÁÉÍÓÚÜÑáéíóúüñ]))?)/;

const BriefLine = memo(({ text }: { text: string }) => {
  const parts = text.split(BRIEF_PARTS).filter((part) => part.length > 0);
  return (
    <Text style={styles.brief}>
      {parts.map((part, index) =>
        /^(\d|«)/.test(part) ? (
          <Text key={index} style={styles.briefStrong}>
            {part}
          </Text>
        ) : (
          <Text key={index}>{part}</Text>
        ),
      )}
    </Text>
  );
});

type ProgressProps = Pick<Props, 'todayKey' | 'doneCount' | 'checkCount' | 'reduce' | 'enter'>;

// Barra del día: late una vez al día cuando todo está hecho.
const DayProgress = ({ todayKey, doneCount, checkCount, reduce, enter }: ProgressProps) => {
  const pulse = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  useEffect(() => {
    if (checkCount === 0 || doneCount < checkCount) return;
    let alive = true;
    void (async () => {
      const flag = await getStored('lifepp_goal_pulse');
      if (!alive || flag === todayKey) return;
      await setStored('lifepp_goal_pulse', todayKey);
      success();
      if (!reduce) pulse.value = withSequence(withTiming(1.06, { duration: 180 }), withTiming(1, { duration: 220 }));
    })();
    return () => {
      alive = false;
    };
  }, [checkCount, doneCount, pulse, reduce, todayKey]);

  return (
    <Animated.View entering={enter(2)} style={[styles.segments, pulseStyle]}>
      <View style={styles.segmentRow}>
        {Array.from({ length: checkCount }, (_, index) => (
          <View key={index} style={[styles.segment, index < doneCount ? styles.segmentOn : null]} />
        ))}
      </View>
      <Text style={styles.segmentCount}>
        {formatNumber(doneCount)} de {formatNumber(checkCount)}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headerCopy: { flex: 1, gap: 2 },
  overline: { ...Type.overline, color: Colors.text3 },
  title: { ...Type.title, color: Colors.ink },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...Type.bodyStrong, color: Colors.surface },
  brief: { ...Type.body, color: Colors.text2, fontSize: 15, lineHeight: 22 },
  briefStrong: { ...Type.bodyStrong, color: Colors.ink, fontSize: 15, lineHeight: 22 },
  segments: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: -8 },
  segmentRow: { flex: 1, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  segmentOn: { backgroundColor: Colors.ink },
  segmentCount: { ...Type.caption, ...tabular, color: Colors.text2, fontFamily: 'Outfit_600SemiBold' },
});
