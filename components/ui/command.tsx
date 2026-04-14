import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
type CommandItemType = {
  label: string;
  value: string;
  onSelect?: () => void;
  shortcut?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
};

type CommandGroupType = {
  title: string;
  items: CommandItemType[];
};

interface CommandProps {
  children?: React.ReactNode; // if using JSX children
  items?: CommandItemType[];   // alternative: provide items directly
  groups?: CommandGroupType[]; // alternative: provide grouped items
  filter?: (item: CommandItemType, search: string) => boolean;
  placeholder?: string;
  emptyMessage?: string;
  onSelect?: (value: string, item: CommandItemType) => void;
  style?: any;
}

interface CommandDialogProps extends CommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  showCloseButton?: boolean;
}

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------
type CommandContextType = {
  search: string;
  setSearch: (text: string) => void;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  items: CommandItemType[];
  groups: CommandGroupType[];
  onSelect: (item: CommandItemType) => void;
  filter: (item: CommandItemType, search: string) => boolean;
};

const CommandContext = React.createContext<CommandContextType | null>(null);

const useCommand = () => {
  const ctx = React.useContext(CommandContext);
  if (!ctx) throw new Error('useCommand must be used inside <Command>');
  return ctx;
};

// -----------------------------------------------------------------------------
// Default filter (case-insensitive includes)
// -----------------------------------------------------------------------------
const defaultFilter = (item: CommandItemType, search: string) => {
  if (!search) return true;
  return item.label.toLowerCase().includes(search.toLowerCase());
};

// -----------------------------------------------------------------------------
// Command (the main container)
// -----------------------------------------------------------------------------
export const Command: React.FC<CommandProps> = ({
  children,
  items = [],
  groups = [],
  filter = defaultFilter,
  placeholder = 'Search...',
  emptyMessage = 'No results found.',
  onSelect: externalOnSelect,
  style,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const flatListRef = useRef<FlatList<any>>(null);

  // Flatten items from groups or items prop
  const allItems = useMemo(() => {
    if (groups.length) {
      return groups.flatMap(g => g.items);
    }
    return items;
  }, [groups, items]);

  const filteredItems = useMemo(() => {
    return allItems.filter(item => filter(item, search));
  }, [allItems, filter, search]);

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length]);

  const handleSelect = useCallback((item: CommandItemType) => {
    externalOnSelect?.(item.value, item);
    item.onSelect?.();
    setSearch('');
  }, [externalOnSelect]);

  // Keyboard navigation (up/down)
  const handleKeyDown = useCallback((e: any) => {
    if (e.nativeEvent.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(0, prev - 1));
      scrollToIndex(selectedIndex - 1);
    } else if (e.nativeEvent.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(filteredItems.length - 1, prev + 1));
      scrollToIndex(selectedIndex + 1);
    } else if (e.nativeEvent.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    }
  }, [filteredItems, selectedIndex, handleSelect]);

  const scrollToIndex = (index: number) => {
    if (flatListRef.current && index >= 0 && index < filteredItems.length) {
      flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }
  };

  return (
    <CommandContext.Provider
      value={{
        search,
        setSearch,
        selectedIndex,
        setSelectedIndex,
        items: filteredItems,
        groups,
        onSelect: handleSelect,
        filter,
      }}
    >
      <View style={[styles.commandContainer, style]}>
        <CommandInput
          placeholder={placeholder}
          value={search}
          onChangeText={setSearch}
          onKeyPress={handleKeyDown}
        />
        <CommandList
          ref={flatListRef}
          emptyMessage={emptyMessage}
        />
      </View>
    </CommandContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// CommandDialog (modal wrapper)
// -----------------------------------------------------------------------------
export const CommandDialog: React.FC<CommandDialogProps> = ({
  open,
  onOpenChange,
  title = 'Command Palette',
  description = 'Search for a command to run...',
  showCloseButton = true,
  ...commandProps
}) => {
  const [localOpen, setLocalOpen] = useState(open);

  useEffect(() => {
    setLocalOpen(open);
  }, [open]);

  const handleClose = () => {
    setLocalOpen(false);
    onOpenChange(false);
  };

  return (
    <Modal
      visible={localOpen}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            {showCloseButton && (
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          {description ? (
            <Text style={styles.modalDescription}>{description}</Text>
          ) : null}
          <Command {...commandProps} />
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// -----------------------------------------------------------------------------
// CommandInput
// -----------------------------------------------------------------------------
interface CommandInputProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onKeyPress?: (e: any) => void;
  style?: any;
}

export const CommandInput: React.FC<CommandInputProps> = ({
  placeholder,
  value,
  onChangeText,
  onKeyPress,
  style,
}) => {
  const context = React.useContext(CommandContext);
  const inputValue = value !== undefined ? value : context?.search ?? '';
  const handleChange = onChangeText ?? ((text) => context?.setSearch(text));
  const handleKey = onKeyPress ?? ((e) => {});

  return (
    <View style={[styles.inputWrapper, style]}>
      <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#999"
        value={inputValue}
        onChangeText={handleChange}
        onKeyPress={handleKey}
        autoFocus
      />
    </View>
  );
};

// -----------------------------------------------------------------------------
// CommandList
// -----------------------------------------------------------------------------
interface CommandListProps {
  emptyMessage?: string;
  ref?: React.Ref<FlatList<any>>;
}

export const CommandList = React.forwardRef<FlatList<any>, CommandListProps>(
  ({ emptyMessage = 'No results found.' }, ref) => {
    const { items, groups, selectedIndex, onSelect } = useCommand();

    // If groups are provided, render sections
    if (groups.length) {
      // We'll flatten groups for rendering, but keep titles as section headers
      const sections = groups.map((group, sectionIdx) => ({
        title: group.title,
        data: group.items.filter(item => defaultFilter(item, useCommand().search)),
      })).filter(s => s.data.length > 0);

      const renderSectionHeader = ({ section }: { section: typeof sections[0] }) => (
        <Text style={styles.groupHeading}>{section.title}</Text>
      );

      return (
        <FlatList
          ref={ref}
          data={sections}
          keyExtractor={(_, idx) => `section-${idx}`}
          renderItem={({ item: section }) => (
            <>
              {section.title ? (
                <Text style={styles.groupHeading}>{section.title}</Text>
              ) : null}
              {section.data.map((item: CommandItemType, idx: number) => (
                <CommandItem
                  key={item.value}
                  item={item}
                  onSelect={() => onSelect(item)}
                  isSelected={selectedIndex === idx}
                />
              ))}
            </>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          }
        />
      );
    }

    // Simple list
    return (
      <FlatList
        ref={ref}
        data={items}
        keyExtractor={(item) => item.value}
        renderItem={({ item, index }) => (
          <CommandItem
            item={item}
            onSelect={() => onSelect(item)}
            isSelected={selectedIndex === index}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        }
      />
    );
  }
);

// -----------------------------------------------------------------------------
// CommandItem
// -----------------------------------------------------------------------------
interface CommandItemProps {
  item: CommandItemType;
  onSelect: () => void;
  isSelected: boolean;
}

export const CommandItem: React.FC<CommandItemProps> = ({ item, onSelect, isSelected }) => {
  return (
    <TouchableOpacity
      style={[styles.item, isSelected && styles.itemSelected]}
      onPress={onSelect}
      disabled={item.disabled}
      activeOpacity={0.7}
    >
      {item.icon && (
        <Ionicons name={item.icon} size={20} color="#666" style={styles.itemIcon} />
      )}
      <Text style={[styles.itemText, item.disabled && styles.itemDisabled]}>
        {item.label}
      </Text>
      {item.shortcut && (
        <Text style={styles.itemShortcut}>{item.shortcut}</Text>
      )}
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------------
// Empty / Separator / Group / Shortcut (aliases)
// -----------------------------------------------------------------------------
export const CommandEmpty: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <Text style={styles.emptyText}>{children}</Text>
);

export const CommandSeparator: React.FC = () => (
  <View style={styles.separator} />
);

export const CommandGroup: React.FC<{ heading?: string; children?: React.ReactNode }> = ({ heading, children }) => (
  <View>
    {heading ? <Text style={styles.groupHeading}>{heading}</Text> : null}
    {children}
  </View>
);

export const CommandShortcut: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <Text style={styles.shortcut}>{children}</Text>
);

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  commandContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    maxHeight: height * 0.7,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#11181C',
  },
  modalDescription: {
    fontSize: 14,
    color: '#687076',
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#11181C',
    paddingVertical: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  itemSelected: {
    backgroundColor: '#f3f4f6',
  },
  itemIcon: {
    marginRight: 10,
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    color: '#11181C',
  },
  itemDisabled: {
    opacity: 0.5,
  },
  itemShortcut: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: '#9ca3af',
    fontSize: 14,
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  groupHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f9fafb',
  },
  shortcut: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 8,
  },
});