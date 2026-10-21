import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DelayedSkeleton, SkeletonBlock } from '../../../components/ui/Skeleton';
import { Colors } from '../../../constants/colors';
import { Spacing } from '../../../constants/spacing';

export const TodaySkeleton = ({ top }: { top: number }) => (
  <View style={[styles.screen, { paddingTop: top + Spacing.lg }]}>
    <DelayedSkeleton
      loading
      fallback={
        <View style={styles.skeleton}>
          <SkeletonBlock width="42%" height={14} />
          <SkeletonBlock width="58%" height={32} />
          <SkeletonBlock width="100%" height={48} />
          <SkeletonBlock width="100%" height={224} />
          <SkeletonBlock width="100%" height={160} />
        </View>
      }
    >
      {null}
    </DelayedSkeleton>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg, paddingHorizontal: Spacing.lg },
  skeleton: { gap: 16 },
});
