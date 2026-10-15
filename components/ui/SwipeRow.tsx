import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Colors } from '../../constants/colors';
import { Type } from '../../constants/typography';
import { warning } from '../../lib/haptics';

type Props = {
  children: React.ReactNode;
  label: string;
  onDelete: () => void;
};

export const SwipeRow = ({ children, label, onDelete }: Props) => {
  const fired = useRef(false);
  const run = () => {
    if (fired.current) return;
    fired.current = true;
    warning();
    onDelete();
  };

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={48}
      renderRightActions={() => (
        <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={run} style={styles.action}>
          <Text style={styles.actionText}>Eliminar</Text>
        </Pressable>
      )}
      onSwipeableOpen={run}
    >
      {children}
    </ReanimatedSwipeable>
  );
};

const styles = StyleSheet.create({
  action: { backgroundColor: Colors.danger, justifyContent: 'center', paddingHorizontal: 16 },
  actionText: { ...Type.bodyStrong, color: Colors.surface },
});
