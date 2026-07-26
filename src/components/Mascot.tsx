import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../theme';

// A small illustrated bird companion for empty states, built from plain
// Views (no image asset, no SVG lib) -- one consistent character reused
// with a different pose/mood per context, the way a mascot should read
// across a few screens rather than a one-off icon per screen.
export type MascotPose = 'idle' | 'reading' | 'sleepy' | 'listening';

const BASE_W = 100;
const BASE_H = 96;

interface MascotProps {
  pose?: MascotPose;
  size?: number;
  style?: ViewStyle;
}

export function Mascot({ pose = 'idle', size = 96, style }: MascotProps) {
  const scale = size / BASE_W;
  const eyesClosed = pose === 'sleepy';
  const headTilt = pose === 'listening' ? '-6deg' : '0deg';
  const wingLift = pose === 'listening';

  return (
    <View style={[{ width: size, height: BASE_H * scale, alignItems: 'center', justifyContent: 'flex-end' }, style]}>
      <View style={{ width: BASE_W, height: BASE_H, transform: [{ scale }] }}>
        <View style={s.groundShadow} />

        <View style={[s.wing, s.wingLeft, wingLift && { transform: [{ rotate: '-42deg' }] }]} />
        <View style={[s.wing, s.wingRight, wingLift && { transform: [{ rotate: '42deg' }] }]} />

        <View style={s.foot} />
        <View style={[s.foot, { left: 52 }]} />

        <View style={s.body} />
        <View style={s.belly} />

        <View style={[s.head, { transform: [{ rotate: headTilt }] }]}>
          <View style={s.tuft} />
          {eyesClosed ? (
            <>
              <View style={[s.eyeClosed, { left: 14 }]} />
              <View style={[s.eyeClosed, { left: 33 }]} />
            </>
          ) : (
            <>
              <View style={[s.eye, { left: 13 }]}>
                <View style={s.eyeShine} />
              </View>
              <View style={[s.eye, { left: 32 }]}>
                <View style={s.eyeShine} />
              </View>
            </>
          )}
          <View style={s.beak} />
        </View>

        {pose === 'reading' && (
          <View style={s.letter}>
            <View style={s.letterFlap} />
          </View>
        )}
        {pose === 'sleepy' && (
          <>
            <View style={[s.zLetter, { top: 4, left: 66, opacity: 0.9 }]} />
            <View style={[s.zLetter, { top: -4, left: 74, opacity: 0.6, transform: [{ scale: 0.75 }] }]} />
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  groundShadow: {
    position: 'absolute', bottom: 0, left: 26, width: 48, height: 8,
    borderRadius: 4, backgroundColor: colors.border,
  },
  wing: {
    position: 'absolute', bottom: 22, width: 16, height: 26,
    borderRadius: 12, backgroundColor: colors.sageDark,
  },
  wingLeft: { left: 12, transform: [{ rotate: '-18deg' }] },
  wingRight: { right: 12, transform: [{ rotate: '18deg' }] },
  foot: {
    position: 'absolute', bottom: 8, left: 38, width: 10, height: 6,
    borderRadius: 3, backgroundColor: colors.sand,
  },
  body: {
    position: 'absolute', bottom: 12, left: 20, width: 60, height: 52,
    borderRadius: 30, backgroundColor: colors.sage,
  },
  belly: {
    position: 'absolute', bottom: 14, left: 32, width: 36, height: 34,
    borderRadius: 18, backgroundColor: colors.sageMist,
  },
  head: {
    position: 'absolute', top: 6, left: 22, width: 56, height: 50,
    borderRadius: 26, backgroundColor: colors.sage, alignItems: 'center',
  },
  tuft: {
    position: 'absolute', top: -6, left: 25, width: 6, height: 14,
    borderRadius: 3, backgroundColor: colors.sageDark, transform: [{ rotate: '-10deg' }],
  },
  eye: {
    position: 'absolute', top: 20, width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center',
  },
  eyeShine: {
    position: 'absolute', top: 1, left: 1.5, width: 3, height: 3, borderRadius: 1.5,
    backgroundColor: colors.cream,
  },
  eyeClosed: {
    position: 'absolute', top: 24, width: 10, height: 2, borderRadius: 1,
    backgroundColor: colors.ink,
  },
  beak: {
    position: 'absolute', top: 33, left: 22, width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: colors.sand,
  },
  letter: {
    position: 'absolute', bottom: 20, left: 38, width: 24, height: 17,
    borderRadius: 3, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  letterFlap: {
    position: 'absolute', top: -0.5, width: 0, height: 0,
    borderLeftWidth: 12, borderRightWidth: 12, borderTopWidth: 9,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: colors.roseMist,
  },
  zLetter: {
    position: 'absolute', width: 8, height: 8, borderRadius: 2,
    backgroundColor: colors.sageDark, opacity: 0.5,
  },
});
