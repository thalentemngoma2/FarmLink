import { useAuth } from "@/context/AuthContext";
import React, { useState } from "react";
import { TouchableOpacity, TouchableOpacityProps } from "react-native";
import { AuthPromptModal } from "./AuthPromptModal";

interface ProtectedActionProps extends TouchableOpacityProps {
  children: React.ReactNode;
  featureName?: string;
  onAuthenticatedAction?: () => void;
}

export const ProtectedAction: React.FC<ProtectedActionProps> = ({
  children,
  featureName,
  onAuthenticatedAction,
  onPress,
  ...props
}) => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);

  const handlePress = () => {
    if (user) {
      // User is logged in, execute the action
      onAuthenticatedAction?.();
      onPress?.({} as any);
    } else {
      // Show login prompt modal
      setShowModal(true);
    }
  };

  return (
    <>
      <TouchableOpacity onPress={handlePress} {...props}>
        {children}
      </TouchableOpacity>

      <AuthPromptModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        featureName={featureName}
      />
    </>
  );
};
