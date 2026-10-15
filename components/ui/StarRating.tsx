import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';

type Props = {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
};

export const StarRating = ({ value, onChange, readonly }: Props) => (
  <View style={styles.row}>
    {[1, 2, 3, 4, 5].map((star) => {
      const filled = star <= value;
      const icon = <Star size={22} color={filled ? Colors.ink : Colors.border} fill={filled ? Colors.ink : 'transparent'} />;
      if (readonly || !onChange) return <View key={star}>{icon}</View>;
      return (
        <Pressable key={star} accessibilityRole="button" accessibilityLabel={`${star} de 5`} hitSlop={11} onPress={() => onChange(star)}>
          {icon}
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
