import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import Toast, {
    BaseToast,
    ErrorToast,
    InfoToast,
    SuccessToast,
    ToastConfig,
    ToastConfigParams,
} from 'react-native-toast-message';

// -----------------------------------------------------------------------------
// Toast configuration
// -----------------------------------------------------------------------------
const toastConfig: ToastConfig = {
  success: (props: ToastConfigParams<any>) => (
    <SuccessToast
      {...props}
      text1Style={{
        fontSize: 14,
        fontWeight: '500',
      }}
      text2Style={{
        fontSize: 12,
      }}
    />
  ),
  error: (props: ToastConfigParams<any>) => (
    <ErrorToast
      {...props}
      text1Style={{
        fontSize: 14,
        fontWeight: '500',
      }}
      text2Style={{
        fontSize: 12,
      }}
    />
  ),
  info: (props: ToastConfigParams<any>) => (
    <InfoToast
      {...props}
      text1Style={{
        fontSize: 14,
        fontWeight: '500',
      }}
      text2Style={{
        fontSize: 12,
      }}
    />
  ),
  default: (props: ToastConfigParams<any>) => (
    <BaseToast
      {...props}
      text1Style={{
        fontSize: 14,
        fontWeight: '500',
      }}
      text2Style={{
        fontSize: 12,
      }}
    />
  ),
};

// -----------------------------------------------------------------------------
// Toaster component – renders the toast container
// -----------------------------------------------------------------------------
interface ToasterProps {
  position?: 'top' | 'bottom';
  visible?: boolean;
  config?: ToastConfig;
  theme?: 'light' | 'dark' | 'system';
}

export const Toaster: React.FC<ToasterProps> = ({
  position = 'top',
  theme = 'system',
}) => {
  const colorScheme = useColorScheme();
  const effectiveTheme = theme === 'system' ? colorScheme : theme;

  return <Toast config={toastConfig} position={position} topOffset={50} bottomOffset={40} />;
};

// -----------------------------------------------------------------------------
// Toast API – export a toast object with convenience methods
// -----------------------------------------------------------------------------
export const toast = {
  show: (options: {
    type?: 'success' | 'error' | 'info' | 'default';
    text1?: string;
    text2?: string;
    onPress?: () => void;
    visibilityTime?: number;
    autoHide?: boolean;
  }) => {
    Toast.show({
      type: options.type || 'default',
      text1: options.text1,
      text2: options.text2,
      onPress: options.onPress,
      visibilityTime: options.visibilityTime || 4000,
      autoHide: options.autoHide !== false,
      position: 'top',
    });
  },
  success: (text1: string, text2?: string, options?: any) => {
    Toast.show({
      type: 'success',
      text1,
      text2,
      ...options,
    });
  },
  error: (text1: string, text2?: string, options?: any) => {
    Toast.show({
      type: 'error',
      text1,
      text2,
      ...options,
    });
  },
  info: (text1: string, text2?: string, options?: any) => {
    Toast.show({
      type: 'info',
      text1,
      text2,
      ...options,
    });
  },
  promise: async <T,>(
    promise: Promise<T>,
    options: {
      loading?: string;
      success?: string | ((data: T) => string);
      error?: string | ((error: any) => string);
    }
  ) => {
    const id = Toast.show({
      type: 'info',
      text1: options.loading || 'Loading...',
      autoHide: false,
    });

    try {
      const result = await promise;
      Toast.hide(id);
      const successMsg = typeof options.success === 'function' ? options.success(result) : options.success || 'Success';
      Toast.show({
        type: 'success',
        text1: successMsg,
      });
      return result;
    } catch (err) {
      Toast.hide(id);
      const errorMsg = typeof options.error === 'function' ? options.error(err) : options.error || 'Something went wrong';
      Toast.show({
        type: 'error',
        text1: errorMsg,
      });
      throw err;
    }
  },
};

// -----------------------------------------------------------------------------
// Optional: Hide toast programmatically
// -----------------------------------------------------------------------------
export const hideToast = () => Toast.hide();