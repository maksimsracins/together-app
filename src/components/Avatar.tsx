import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../theme';

interface AvatarProps {
  emoji: string;
  uri?: string | null;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ emoji, uri, size = 48, style }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  // Locally-picked photos live in a per-install sandbox cache dir — a
  // reinstall (e.g. a fresh native build) invalidates the old file:// path.
  // Reset the failure flag whenever the uri itself changes, so a newly
  // picked photo gets a fresh chance to load.
  useEffect(() => setFailed(false), [uri]);

  const showImage = !!uri && !failed;

  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2 },
        !showImage && { backgroundColor: colors.roseMist },
        style,
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: uri! }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={{ fontSize: size * 0.46 }}>{emoji}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
