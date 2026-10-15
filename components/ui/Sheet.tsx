import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/spacing';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const Handle = () => (
  <View style={styles.handleWrap}>
    <View style={styles.handle} />
  </View>
);

export const Sheet = ({ visible, onClose, children }: Props) => {
  const reduce = useReduceMotion();
  const ref = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (visible) ref.current?.present();
    else ref.current?.dismiss();
  }, [visible]);

  const backdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.38} pressBehavior="close" />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      enablePanDownToClose
      animateOnMount={!reduce}
      animationConfigs={reduce ? { duration: 1 } : { damping: 22, stiffness: 220 }}
      onDismiss={onClose}
      backdropComponent={backdrop}
      handleComponent={Handle}
      backgroundStyle={styles.sheet}
    >
      <BottomSheetView style={styles.body}>{children}</BottomSheetView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
  },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle: { width: 36, height: 5, borderRadius: 3, backgroundColor: Colors.track },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
});
