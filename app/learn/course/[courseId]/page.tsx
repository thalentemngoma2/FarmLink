import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/ui/glass-card';
import { supabase } from '@/lib/supabase';

interface Lesson {
  lesson_id: string;
  title: string;
  description: string;
  content: string;
  video_url: string | null;
  order_index: number;
}

interface Course {
  course_id: string;
  title: string;
  description: string;
  lessons_count: number;
  duration: string;
  rating: number;
  icon: string;
  color_start: string;
  color_end: string;
  created_by: string;
}

export default function CourseDetailPage() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDescription, setLessonDescription] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (courseId) fetchData();
  }, [courseId]);

  const fetchData = async () => {
    if (!courseId) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);

    const { data: courseData } = await supabase
      .from('courses')
      .select('*')
      .eq('course_id', courseId)
      .single();
    
    setCourse(courseData);
    setIsCreator(user && courseData?.created_by === user.id ? true : false);

    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });
    
    setLessons(lessonsData || []);
    setLoading(false);
  };

  const handleCreateLesson = async () => {
    if (!courseId || !lessonTitle.trim()) return;
    
    setSubmitting(true);
    try {
      const newOrder = lessons.length + 1;
      
      if (editingLesson) {
        await supabase
          .from('lessons')
          .update({
            title: lessonTitle.trim(),
            description: lessonDescription.trim(),
            content: lessonContent,
          })
          .eq('lesson_id', editingLesson.lesson_id);
      } else {
        await supabase
          .from('lessons')
          .insert({
            course_id: courseId,
            title: lessonTitle.trim(),
            description: lessonDescription.trim(),
            content: lessonContent,
            order_index: newOrder,
          });
      }

      setShowLessonModal(false);
      resetLessonForm();
      await fetchData();
      
      await supabase
        .from('courses')
        .update({ lessons_count: newOrder })
        .eq('course_id', courseId);
        
    } catch (err) {
      console.error('Error saving lesson:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    await supabase.from('lessons').delete().eq('lesson_id', lessonId);
    await fetchData();
  };

  const resetLessonForm = () => {
    setLessonTitle('');
    setLessonDescription('');
    setLessonContent('');
    setEditingLesson(null);
  };

  const openEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonTitle(lesson.title);
    setLessonDescription(lesson.description || '');
    setLessonContent(lesson.content || '');
    setShowLessonModal(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      </SafeAreaView>
    );
  }

  if (!course) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text>Course not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const colors = course.color_start && course.color_end
    ? [course.color_start, course.color_end]
    : ['#22c55e', '#16a34a'];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#f0fdf4', '#ffffff', '#ecfdf5']}
          style={StyleSheet.absoluteFill}
        />
        
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={SlideInDown.duration(500)} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <LinearGradient colors={colors as any} style={styles.courseIcon}>
                <Ionicons name={(course.icon as any) || 'book-outline'} size={32} color="white" />
              </LinearGradient>
              <Text style={styles.courseTitle}>{course.title}</Text>
              <Text style={styles.courseDesc}>{course.description}</Text>
              <View style={styles.courseMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="book-outline" size={14} color="#687076" />
                  <Text style={styles.metaText}>{lessons.length} lessons</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color="#687076" />
                  <Text style={styles.metaText}>{course.duration || '0h'}</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          <View style={styles.lessonsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Lessons</Text>
              {isCreator && (
                <TouchableOpacity
                  style={styles.addLessonButton}
                  onPress={() => {
                    resetLessonForm();
                    setShowLessonModal(true);
                  }}
                >
                  <Ionicons name="add" size={20} color="white" />
                  <Text style={styles.addLessonText}>Add Lesson</Text>
                </TouchableOpacity>
              )}
            </View>

            {lessons.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyTitle}>No lessons yet</Text>
                <Text style={styles.emptyText}>
                  {isCreator ? 'Add your first lesson to this course' : 'Check back later for lessons'}
                </Text>
              </View>
            ) : (
              lessons.map((lesson, index) => (
                <Animated.View key={lesson.lesson_id} entering={FadeIn.delay(index * 50)}>
                  <GlassCard style={styles.lessonCard}>
                    <TouchableOpacity style={styles.lessonRow}>
                      <View style={styles.lessonNumber}>
                        <Text style={styles.lessonNumberText}>{index + 1}</Text>
                      </View>
                      <View style={styles.lessonInfo}>
                        <Text style={styles.lessonTitle}>{lesson.title}</Text>
                        {lesson.description && (
                          <Text style={styles.lessonDesc} numberOfLines={2}>
                            {lesson.description}
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                    {isCreator && (
                      <View style={styles.lessonActions}>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => openEditLesson(lesson)}
                        >
                          <Ionicons name="pencil" size={16} color="#3b82f6" />
                          <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteLesson(lesson.lesson_id)}
                        >
                          <Ionicons name="trash" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </GlassCard>
                </Animated.View>
              ))
            )}
          </View>
        </ScrollView>

        <Modal
          visible={showLessonModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowLessonModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingLesson ? 'Edit Lesson' : 'Add New Lesson'}
                </Text>
                <TouchableOpacity onPress={() => setShowLessonModal(false)}>
                  <Ionicons name="close" size={24} color="#687076" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.inputLabel}>Lesson Title *</Text>
                <TextInput
                  style={styles.input}
                  value={lessonTitle}
                  onChangeText={setLessonTitle}
                  placeholder="e.g., Introduction to Soil Preparation"
                  placeholderTextColor="#9ca3af"
                />

                <Text style={styles.inputLabel}>Short Description</Text>
                <TextInput
                  style={[styles.input, styles.textAreaSmall]}
                  value={lessonDescription}
                  onChangeText={setLessonDescription}
                  placeholder="Brief description..."
                  placeholderTextColor="#9ca3af"
                  multiline
                />

                <Text style={styles.inputLabel}>Lesson Content</Text>
                <Text style={styles.inputHint}>Write your lesson content here.</Text>
                <TextInput
                  style={[styles.input, styles.contentInput]}
                  value={lessonContent}
                  onChangeText={setLessonContent}
                  placeholder="Start writing your lesson content..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  textAlignVertical="top"
                />
              </ScrollView>

              <TouchableOpacity
                style={[styles.submitButton, (!lessonTitle.trim() || submitting) && styles.submitButtonDisabled]}
                onPress={handleCreateLesson}
                disabled={!lessonTitle.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editingLesson ? 'Update Lesson' : 'Add Lesson'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, position: 'relative' },
  scrollContent: { flexGrow: 1, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16 },
  backButton: { marginBottom: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
  headerContent: { alignItems: 'center' },
  courseIcon: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  courseTitle: { fontSize: 24, fontWeight: 'bold', color: '#11181C', textAlign: 'center', marginBottom: 8 },
  courseDesc: { fontSize: 14, color: '#687076', textAlign: 'center', marginBottom: 16 },
  courseMeta: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#687076' },
  lessonsSection: { padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#11181C' },
  addLessonButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#22c55e', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  addLessonText: { fontSize: 14, fontWeight: '500', color: 'white' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 12 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 4, textAlign: 'center' },
  lessonCard: { marginBottom: 12 },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lessonNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' },
  lessonNumberText: { fontSize: 14, fontWeight: '600', color: 'white' },
  lessonInfo: { flex: 1 },
  lessonTitle: { fontSize: 16, fontWeight: '500', color: '#11181C' },
  lessonDesc: { fontSize: 12, color: '#687076', marginTop: 2 },
  lessonActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editButtonText: { fontSize: 14, color: '#3b82f6' },
  deleteButton: { padding: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#11181C' },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8, marginTop: 16 },
  inputHint: { fontSize: 12, color: '#9ca3af', marginBottom: 8 },
  input: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 14, fontSize: 16, color: '#11181C', borderWidth: 1, borderColor: '#e5e7eb' },
  textAreaSmall: { minHeight: 60 },
  contentInput: { minHeight: 200 },
  submitButton: { backgroundColor: '#22c55e', margin: 20, marginTop: 10, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitButtonDisabled: { backgroundColor: '#9ca3af' },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: 'white' },
});