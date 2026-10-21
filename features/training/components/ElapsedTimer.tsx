import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Colors } from '../../../constants/colors';
import { Type, tabular } from '../../../constants/typography';
import { formatElapsed } from '../numbers';

// Cronómetro aislado: solo él se repinta cada segundo, no la pantalla.
export const ElapsedTimer = memo(({ startedAt }: { startedAt: string }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const start = Date.parse(startedAt);
  const seconds = Number.isFinite(start) ? (now - start) / 1000 : 0;

  return (
    <Text accessibilityRole="timer" accessibilityLabel="Tiempo de entreno" maxFontSizeMultiplier={1.3} style={styles.text}>
      {formatElapsed(seconds)}
    </Text>
  );
});

const styles = StyleSheet.create({
  text: { ...Type.bodyStrong, ...tabular, color: Colors.ink },
});
