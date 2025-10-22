import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  View,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LucideIcon } from 'lucide-react-native';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon: React.ReactElement;
  label?: string;
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary';
}

export default function FloatingActionButton({
  onPress,
  icon,
  label,
  position = 'bottom-right',
  size = 'medium',
  variant = 'primary',
}: FloatingActionButtonProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entry animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { width: 48, height: 48, borderRadius: 24 };
      case 'large':
        return { width: 72, height: 72, borderRadius: 36 };
      default:
        return { width: 56, height: 56, borderRadius: 28 };
    }
  };

  const getPositionStyles = () => {
    const base = { position: 'absolute' as const, bottom: 20 };
    switch (position) {
      case 'bottom-left':
        return { ...base, left: 20 };
      case 'bottom-center':
        return { ...base, alignSelf: 'center' as const };
      default:
        return { ...base, right: 20 };
    }
  };

  const gradientColors =
    variant === 'primary' ? ['#22c55e', '#16a34a'] : ['#87ceeb', '#4ade80'];

  return (
    <Animated.View
      style={[
        getPositionStyles(),
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={styles.container}
      >
        <Animated.View
          style={{
            transform: [{ scale: pulseAnim }],
          }}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.button, getSizeStyles()]}
          >
            {icon}
            {label && (
              <Text style={styles.label} numberOfLines={1}>
                {label}
              </Text>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Shadow effect for elevation */}
        <View style={[styles.shadow, getSizeStyles()]} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#22c55e',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  shadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
    }),
  },
  label: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
