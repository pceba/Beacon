import React, { memo } from 'react';
import { History } from 'lucide-react-native';
import { ListRow } from '../../../components/ui/ListRow';
import { Colors } from '../../../constants/colors';
import { openWorkoutHistory } from '../navigation';

// Fila «Historial de entrenos» para Datos. Va dentro de una tarjeta (Card inset).
export const TrainingHistoryLink = memo(({ last = true }: { last?: boolean }) => (
  <ListRow
    title="Historial de entrenos"
    icon={History}
    iconColor={Colors.workout}
    iconSoft={Colors.workoutSoft}
    chevron
    last={last}
    onPress={openWorkoutHistory}
  />
));
