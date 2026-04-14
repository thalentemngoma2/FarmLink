import React, { createContext, useContext, useId } from 'react';
import {
    Controller,
    ControllerProps,
    FieldPath,
    FieldValues,
    FormProvider,
    useFormContext,
    useFormState,
} from 'react-hook-form';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

// -----------------------------------------------------------------------------
// Types & Context
// -----------------------------------------------------------------------------
type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = createContext<FormFieldContextValue>({} as FormFieldContextValue);

type FormItemContextValue = {
  id: string;
};

const FormItemContext = createContext<FormItemContextValue>({} as FormItemContextValue);

// -----------------------------------------------------------------------------
// Form (Provider)
// -----------------------------------------------------------------------------
export const Form = FormProvider;

// -----------------------------------------------------------------------------
// FormField – wraps Controller
// -----------------------------------------------------------------------------
export const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// useFormField – hook to get field state and IDs
// -----------------------------------------------------------------------------
export const useFormField = () => {
  const fieldContext = useContext(FormFieldContext);
  const itemContext = useContext(FormItemContext);
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext.name });
  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error('useFormField must be used within <FormField>');
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

// -----------------------------------------------------------------------------
// FormItem – container for label, control, description, message
// -----------------------------------------------------------------------------
interface FormItemProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

export const FormItem: React.FC<FormItemProps> = ({ children, style }) => {
  const id = useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <View style={[styles.formItem, style]}>{children}</View>
    </FormItemContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// FormLabel
// -----------------------------------------------------------------------------
interface FormLabelProps {
  children?: React.ReactNode;
  style?: TextStyle;
}

export const FormLabel: React.FC<FormLabelProps> = ({ children, style }) => {
  const { error, formItemId } = useFormField();
  const labelStyle = [styles.label, error && styles.labelError, style];

  return (
    <Text style={labelStyle} nativeID={formItemId}>
      {children}
    </Text>
  );
};

// -----------------------------------------------------------------------------
// FormControl – renders the actual input component (wraps it)
// -----------------------------------------------------------------------------
interface FormControlProps {
  children: React.ReactNode;
}

export const FormControl: React.FC<FormControlProps> = ({ children }) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

  if (!React.isValidElement(children)) {
    return null;
  }

  // In React Native, we use accessibility props:
  // - accessibilityLabel (instead of id)
  // - accessibilityHint (combined description + error message)
  // - accessibilityState (invalid = !!error)
  const describedBy = !error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`;
  const accessibilityProps = {
    accessible: true,
    accessibilityLabel: formItemId,
    accessibilityHint: describedBy,
    accessibilityState: { invalid: !!error },
  };

  // Clone the child and merge our accessibility props
  return React.cloneElement(children as React.ReactElement<any>, {
    ...(children.props as object),
    ...accessibilityProps,
  });
};

// -----------------------------------------------------------------------------
// FormDescription
// -----------------------------------------------------------------------------
interface FormDescriptionProps {
  children?: React.ReactNode;
  style?: TextStyle;
}

export const FormDescription: React.FC<FormDescriptionProps> = ({ children, style }) => {
  const { formDescriptionId } = useFormField();
  if (!children) return null;

  return (
    <Text style={[styles.description, style]} nativeID={formDescriptionId}>
      {children}
    </Text>
  );
};

// -----------------------------------------------------------------------------
// FormMessage – shows error message
// -----------------------------------------------------------------------------
interface FormMessageProps {
  children?: React.ReactNode;
  style?: TextStyle;
}

export const FormMessage: React.FC<FormMessageProps> = ({ children, style }) => {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error.message ?? '') : children;

  if (!body) return null;

  return (
    <Text style={[styles.message, style]} nativeID={formMessageId}>
      {body}
    </Text>
  );
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  formItem: {
    marginBottom: 16,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#11181C',
  },
  labelError: {
    color: '#ef4444',
  },
  description: {
    fontSize: 12,
    color: '#687076',
  },
  message: {
    fontSize: 12,
    color: '#ef4444',
  },
});