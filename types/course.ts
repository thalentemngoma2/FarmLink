export interface Course {
  course_id: string;
  title: string;
  description: string;
  lessons_count: number;
  duration: string;
  rating: number;
  enrolled_count: number;
  icon: string;
  color_start: string;
  color_end: string;
}

export interface Lesson {
  lesson_id: string;
  course_id: string;
  title: string;
  description: string;
  duration: string;
  order_index: number;
}

export interface QuickTip {
  quick_tip_id: string;
  title: string;
  duration: string;
  views_count: number;
}