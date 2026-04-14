import React, { createContext, ReactNode, useContext, useId } from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

// -----------------------------------------------------------------------------
// Types & Context
// -----------------------------------------------------------------------------
type FieldContextValue = {
  id: string;
  name?: string;
  error?: string;
  disabled?: boolean;
};

const FieldContext = createContext<FieldContextValue | undefined>(undefined);

const useField = () => {
  const context = useContext(FieldContext);
  if (!context) throw new Error('Field components must be used within a <Field>');
  return context;
};

// -----------------------------------------------------------------------------
// Field Root
// -----------------------------------------------------------------------------
interface FieldProps {
  children: ReactNode;
  name?: string;
  error?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export const Field: React.FC<FieldProps> = ({
  children,
  name,
  error,
  disabled = false,
  style,
}) => {
  const id = useId();
  const value = { id, name, error, disabled };

  return (
    <FieldContext.Provider value={value}>
      <View style={[styles.field, style]}>{children}</View>
    </FieldContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// FieldLabel
// -----------------------------------------------------------------------------
interface FieldLabelProps {
  children: ReactNode;
  style?: TextStyle;
  required?: boolean;
}

export const FieldLabel: React.FC<FieldLabelProps> = ({
  children,
  style,
  required = false,
}) => {
  const { id, disabled } = useField();
  const color = disabled ? styles.labelDisabled.color : styles.label.color;

  return (
    <View style={styles.labelContainer}>
      <Text style={[styles.label, { color }, style]} nativeID={`${id}-label`}>
        {children}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
    </View>
  );
};

// -----------------------------------------------------------------------------
// FieldControl – a wrapper for the actual input component
// -----------------------------------------------------------------------------
interface FieldControlProps {
  children: ReactNode;
}

export const FieldControl: React.FC<FieldControlProps> = ({ children }) => {
  const { id, disabled } = useField();

  // Clone child and inject accessibility props and disabled state if needed
  return (
    <View>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<any>, {
            accessible: true,
            accessibilityLabel: `${id}-control`,
            accessibilityState: { disabled },
            editable: !disabled,
            ...(children.props as any),
          })
        : children}
    </View>
  );
};

// -----------------------------------------------------------------------------
// FieldDescription
// -----------------------------------------------------------------------------
interface FieldDescriptionProps {
  children: ReactNode;
  style?: TextStyle;
}

export const FieldDescription: React.FC<FieldDescriptionProps> = ({
  children,
  style,
}) => {
  const { id } = useField();
  return (
    <Text style={[styles.description, style]} nativeID={`${id}-description`}>
      {children}
    </Text>
  );
};

// -----------------------------------------------------------------------------
// FieldMessage – for error messages
// -----------------------------------------------------------------------------
interface FieldMessageProps {
  children?: ReactNode;
  style?: TextStyle;
}

export const FieldMessage: React.FC<FieldMessageProps> = ({ children, style }) => {
  const { error } = useField();
  const message = children ?? error;

  if (!message) return null;

  return (
    <Text style={[styles.message, style]} accessibilityRole="alert">
      {message}
    </Text>
  );
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  field: {
    marginBottom: 16,
  },
  labelContainer: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#11181C',
  },
  labelDisabled: {
    color: '#9ca3af',
  },
  required: {
    color: '#ef4444',
    marginLeft: 2,
  },
  description: {
    fontSize: 12,
    color: '#687076',
    marginTop: 4,
  },
  message: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
});