import { useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function CourseDetailsScreen() {
  // This hook grabs the dynamic ID from the URL/route
  const { courseId } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Course Details</Text>
      <Text style={styles.subtitle}>Viewing course ID: {courseId}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    marginTop: 10,
  },
});
