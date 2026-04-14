import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface AlertDialogProps {
  visible: boolean;
  title?: string;
  description?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  visible,
  title,
  description,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.dialog,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {title && <Text style={styles.title}>{title}</Text>}
          {description && <Text style={styles.description}>{description}</Text>}
          <View style={styles.buttonContainer}>
            {onCancel && (
              <TouchableOpacity style={styles.button} onPress={onCancel}>
                <Text style={styles.buttonText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, destructive && styles.destructiveButton]}
              onPress={onConfirm}
            >
              <Text
                style={[
                  styles.buttonText,
                  destructive && styles.destructiveText,
                ]}
              >
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', // Semi-transparent background
  },
  dialog: {
    width: width * 0.8,
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
    color: '#11181C',
  },
  description: {
    fontSize: 14,
    color: '#687076',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  destructiveButton: {
    backgroundColor: '#dc2626',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#22c55e',
  },
  destructiveText: {
    color: 'white',
  },
});