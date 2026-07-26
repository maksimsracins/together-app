import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

// A quiet, consistent bit of atmosphere behind every main screen: two soft
// color blobs in fixed corners. No blur API in RN, so the "soft edge" is
// faked with three concentric low-opacity circles per blob (each ring adds
// a little more color toward the center) instead of a hard-edged flat fill.
function Blob({ color, size, top, left, right, bottom }: {
  color: string;
  size: number;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
}) {
  return (
    <View style={[styles.blobWrap, { width: size, height: size, top, left, right, bottom }]}>
      {[1, 0.68, 0.4].map((s) => (
        <View
          key={s}
          style={[
            styles.ring,
            {
              width: size, height: size, borderRadius: size / 2, backgroundColor: color,
              transform: [{ scale: s }],
            },
          ]}
        />
      ))}
    </View>
  );
}

export function AmbientBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Blob color={colors.rose} size={280} top={-100} right={-90} />
      <Blob color={colors.sage} size={240} bottom={-90} left={-70} />
    </View>
  );
}

const styles = StyleSheet.create({
  blobWrap: { position: 'absolute' },
  ring: { position: 'absolute', opacity: 0.09 },
});
