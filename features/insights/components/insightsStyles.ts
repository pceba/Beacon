import { StyleSheet } from 'react-native';
import { Colors } from '../../../constants/colors';
import { Type, tabular } from '../../../constants/typography';

export const insightsStyles = StyleSheet.create({
  sectionCard: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  section: { ...Type.section, color: Colors.ink },
  meta: { ...Type.caption, ...tabular, color: Colors.text3, flexShrink: 1, textAlign: 'right' },
  metaStrong: { ...tabular, fontFamily: 'Outfit_600SemiBold', fontSize: 13, flexShrink: 1, textAlign: 'right' },
  unit: { fontFamily: 'Outfit_400Regular', fontSize: 13, color: Colors.text3 },
  note: { ...Type.caption, color: Colors.text3 },
  empty: { ...Type.body, color: Colors.text3 },
  up: { color: Colors.success },
  down: { color: Colors.danger },
  flat: { color: Colors.text2 },
});
