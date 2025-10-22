import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  Text,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Loader2 } from 'lucide-react-native';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'gradient' | 'minimal';
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({
  size = 'medium',
  variant = 'default',
  message,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const spinValue = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Spin animation
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getSizeValue = () => {
    switch (size) {
      case 'small':
        return 24;
      case 'large':
        return 64;
      default:
        return 40;
    }
  };

  const sizeValue = getSizeValue();

  if (variant === 'minimal') {
    return (
      <Animated.View
        style={[
          styles.container,
          fullScreen && styles.fullScreen,
          { opacity: fadeAnim },
        ]}
      >
        <ActivityIndicator
          size={size === 'small' ? 'small' : 'large'}
          color="#22c55e"
        />
        {message && <Text style={styles.message}>{message}</Text>}
      </Animated.View>
    );
  }

  if (variant === 'gradient') {
    return (
      <Animated.View
        style={[
          styles.container,
          fullScreen && styles.fullScreen,
          { opacity: fadeAnim },
        ]}
      >
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <LinearGradient
            colors={['#22c55e', '#16a34a', '#22c55e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.gradientCircle,
              {
                width: sizeValue + 16,
                height: sizeValue + 16,
                borderRadius: (sizeValue + 16) / 2,
              },
            ]}
          >
            <View
              style={[
                styles.innerCircle,
                {
                  width: sizeValue,
                  height: sizeValue,
                  borderRadius: sizeValue / 2,
                },
              ]}
            />
          </LinearGradient>
        </Animated.View>
        {message && <Text style={styles.message}>{message}</Text>}
      </Animated.View>
    );
  }

  // Default variant
  return (
    <Animated.View
      style={[
        styles.container,
        fullScreen && styles.fullScreen,
        { opacity: fadeAnim },
      ]}
    >
      <Animated.View
        style={[
          styles.spinner,
          {
            transform: [{ rotate: spin }],
          },
        ]}
      >
        <Loader2 size={sizeValue} color="#22c55e" strokeWidth={2.5} />
      </Animated.View>
      {message && <Text style={styles.message}>{message}</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  spinner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  innerCircle: {
    backgroundColor: '#ffffff',
  },
  message: {
    marginTop: 16,
    fontSize: 14,
    color: '#737373',
    textAlign: 'center',
  },
});
