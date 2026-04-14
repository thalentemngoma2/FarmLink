import React, { useState } from 'react';
import {
    Image,
    ImageStyle,
    StyleSheet,
    Text,
    TextStyle,
    View,
    ViewStyle,
} from 'react-native';

interface AvatarProps {
  children?: React.ReactNode;
  size?: number; // size in pixels, default 32
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  children,
  size = 32,
  style,
}) => {
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

interface AvatarImageProps {
  source: { uri: string };
  style?: ImageStyle;
  onError?: () => void;
}

export const AvatarImage: React.FC<AvatarImageProps> = ({
  source,
  style,
  onError,
}) => {
  return (
    <Image
      source={source}
      style={[styles.image, style]}
      onError={onError}
    />
  );
};

interface AvatarFallbackProps {
  children?: React.ReactNode;
  style?: TextStyle;
}

export const AvatarFallback: React.FC<AvatarFallbackProps> = ({
  children,
  style,
}) => {
  return (
    <View style={styles.fallbackContainer}>
      <Text style={[styles.fallbackText, style]}>{children}</Text>
    </View>
  );
};

// Optional: A combined Avatar component that handles image loading errors
interface AvatarWithFallbackProps {
  uri?: string;
  fallbackText?: string;
  size?: number;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  textStyle?: TextStyle;
}

export const AvatarWithFallback: React.FC<AvatarWithFallbackProps> = ({
  uri,
  fallbackText,
  size = 32,
  style,
  imageStyle,
  textStyle,
}) => {
  const [hasError, setHasError] = useState(false);

  const handleImageError = () => {
    setHasError(true);
  };

  return (
    <Avatar size={size} style={style}>
      {!hasError && uri ? (
        <AvatarImage
          source={{ uri }}
          style={imageStyle}
          onError={handleImageError}
        />
      ) : (
        <AvatarFallback style={textStyle}>
          {fallbackText || '?'}
        </AvatarFallback>
      )}
    </Avatar>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#e5e7eb', // fallback background
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
  },
  fallbackText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
});