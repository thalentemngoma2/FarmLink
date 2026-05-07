import React from 'react';
import { Redirect } from 'expo-router';

export default function FarmLinkPage() {
  // Automatically redirect to the community page as the default home view
  return <Redirect href="/community" />;
}