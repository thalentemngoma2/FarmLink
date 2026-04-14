import { Ionicons } from '@expo/vector-icons';
import { addMonths, format, isSameDay, subMonths } from 'date-fns';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DateData, Calendar as RNCalendar } from 'react-native-calendars';

type MarkedDates = Record<string, any>;

type Mode = 'single' | 'range';

interface CalendarProps {
  mode?: Mode;
  selected?: Date | { start: Date; end: Date } | null;
  onSelect?: (date: Date | { start: Date; end: Date }) => void;
  minDate?: Date;
  maxDate?: Date;
  showOutsideDays?: boolean;
  captionLayout?: 'label' | 'dropdown'; // dropdown not fully implemented, falls back to label
  buttonVariant?: 'default' | 'ghost' | 'outline' | 'secondary'; // used for nav buttons
  className?: string; // ignored, use style prop
  style?: any;
  theme?: any; // custom theme for react-native-calendars
}

export const Calendar: React.FC<CalendarProps> = ({
  mode = 'single',
  selected = null,
  onSelect,
  minDate,
  maxDate,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  style,
  theme: customTheme,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Local state for range selection (if needed)
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);

  // Determine the marked dates based on mode and selection
  const getMarkedDates = useCallback((): MarkedDates => {
    const marked: MarkedDates = {};

    if (mode === 'single' && selected instanceof Date) {
      const dateStr = format(selected, 'yyyy-MM-dd');
      marked[dateStr] = {
        selected: true,
        selectedColor: '#22c55e',
        selectedTextColor: '#fff',
      };
    } else if (mode === 'range') {
      const start = (selected as { start: Date; end: Date })?.start ?? rangeStart;
      const end = (selected as { start: Date; end: Date })?.end ?? rangeEnd;
      if (start) {
        const startStr = format(start, 'yyyy-MM-dd');
        marked[startStr] = { startingDay: true, color: '#22c55e', textColor: '#fff' };
        if (end) {
          const endStr = format(end, 'yyyy-MM-dd');
          marked[endStr] = { endingDay: true, color: '#22c55e', textColor: '#fff' };
        }
        if (start && end && !isSameDay(start, end)) {
          // Mark intermediate days
          let current = new Date(start);
          while (current < end) {
            current.setDate(current.getDate() + 1);
            const curStr = format(current, 'yyyy-MM-dd');
            if (current < end) {
              marked[curStr] = { color: '#e6f7e6', textColor: '#000' };
            }
          }
        }
      }
    }
    return marked;
  }, [mode, selected, rangeStart, rangeEnd]);

  // Handle day press
  const handleDayPress = (day: DateData) => {
    const selectedDate = new Date(day.timestamp);
    if (mode === 'single') {
      onSelect?.(selectedDate);
    } else {
      // Range mode logic
      if (!rangeStart) {
        setRangeStart(selectedDate);
        setRangeEnd(null);
        onSelect?.({ start: selectedDate, end: selectedDate });
      } else if (!rangeEnd) {
        const start = rangeStart;
        const end = selectedDate;
        if (end < start) {
          setRangeStart(end);
          setRangeEnd(start);
          onSelect?.({ start: end, end: start });
        } else {
          setRangeEnd(end);
          onSelect?.({ start, end });
        }
      } else {
        // Reset and start new range
        setRangeStart(selectedDate);
        setRangeEnd(null);
        onSelect?.({ start: selectedDate, end: selectedDate });
      }
    }
  };

  // Navigation handlers
  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  // Convert date boundaries to string format for react-native-calendars
  const minDateStr = minDate ? format(minDate, 'yyyy-MM-dd') : undefined;
  const maxDateStr = maxDate ? format(maxDate, 'yyyy-MM-dd') : undefined;

  // Default theme (green primary, subtle grays)
  const defaultTheme = {
    backgroundColor: '#ffffff',
    calendarBackground: '#ffffff',
    textSectionTitleColor: '#b6c1cd',
    selectedDayBackgroundColor: '#22c55e',
    selectedDayTextColor: '#ffffff',
    todayTextColor: '#22c55e',
    dayTextColor: '#2d4150',
    textDisabledColor: '#d9e1e8',
    dotColor: '#22c55e',
    selectedDotColor: '#ffffff',
    arrowColor: '#22c55e',
    monthTextColor: '#2d4150',
    textDayFontWeight: '400',
    textMonthFontWeight: '600',
    textDayHeaderFontWeight: '500',
    textDayFontSize: 14,
    textMonthFontSize: 16,
    textDayHeaderFontSize: 12,
  };

  return (
    <View style={[styles.container, style]}>
      {/* Custom header with month/year and navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={20} color="#22c55e" />
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {format(currentMonth, 'MMMM yyyy')}
        </Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={20} color="#22c55e" />
        </TouchableOpacity>
      </View>

      <RNCalendar
        current={format(currentMonth, 'yyyy-MM-dd')}
        onDayPress={handleDayPress}
        markedDates={getMarkedDates()}
        minDate={minDateStr}
        maxDate={maxDateStr}
        hideExtraDays={!showOutsideDays}
        firstDay={1} // Monday first
        theme={{ ...defaultTheme, ...customTheme }}
        // Custom day component (optional) – we can use default for simplicity
      />
    </View>
  );
};

// Helper component if you need to replicate DayButton
export const CalendarDayButton: React.FC<{ date: Date; onPress: () => void; selected?: boolean; }> = ({ date, onPress, selected }) => {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.dayButton, selected && styles.selectedDay]}>
      <Text style={[styles.dayText, selected && styles.selectedDayText]}>{format(date, 'd')}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  dayButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  selectedDay: {
    backgroundColor: '#22c55e',
  },
  dayText: {
    fontSize: 14,
    color: '#374151',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: '600',
  },
});