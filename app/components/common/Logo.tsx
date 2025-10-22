import React from 'react';
import { View, Text, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'light' | 'dark' | 'gradient';
  showTagline?: boolean;
}

const Logo = ({
  size = 'medium',
  variant = 'gradient',
  showTagline = true,
}: LogoProps) => {
  const getImageSize = () => {
    if (size === 'small') return 80;
    if (size === 'large') return 160;
    return 128; // medium
  };

  const getFontSizes = () => {
    if (size === 'small') return { title: 16, tagline: 11 };
    if (size === 'large') return { title: 28, tagline: 16 };
    return { title: 20, tagline: 14 }; // medium
  };

  const imageSize = getImageSize();
  const fontSizes = getFontSizes();

  const renderLogoBackground = () => {
    if (variant === 'gradient') {
      return (
        <LinearGradient
          colors={['#22c55e', '#16a34a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: imageSize,
            height: imageSize,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image
            source={require('../../../assets/images/icon.png')}
            style={{
              width: imageSize * 0.8,
              height: imageSize * 0.8,
              borderRadius: 999,
            }}
            resizeMode="contain"
          />
        </LinearGradient>
      );
    }

    return (
      <View
        style={{
          width: imageSize,
          height: imageSize,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: variant === 'light' ? '#f0fdf4' : '#166534',
        }}
      >
        <Image
          source={require('../../../assets/images/icon.png')}
          style={{
            width: imageSize,
            height: imageSize,
            borderRadius: 999,
          }}
          resizeMode="contain"
        />
      </View>
    );
  };

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {renderLogoBackground()}
      <Text
        style={{
          marginTop: 12,
          fontSize: fontSizes.title,
          fontWeight: 'bold',
          color: variant === 'light' ? '#ffffff' : '#166534',
          letterSpacing: 0.5,
        }}
      >
        RefreshLawn
      </Text>
      {showTagline && (
        <Text
          style={{
            fontSize: fontSizes.tagline,
            color: variant === 'light' ? '#dcfce7' : '#737373',
            marginTop: 2,
          }}
        >
          Professional Lawn Care
        </Text>
      )}
    </View>
  );
};

export default Logo;
