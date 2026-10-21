import { StyleSheet } from 'react-native';
import { Colors } from '../../../constants/colors';
import { Type } from '../../../constants/typography';

export const sectionStyles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...Type.section, color: Colors.ink },
  meta: { ...Type.caption, color: Colors.text3 },
  linkHit: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  link: { ...Type.bodyStrong, color: Colors.accent, fontSize: 15 },
  empty: { ...Type.body, color: Colors.text3, paddingVertical: 12 },
});
