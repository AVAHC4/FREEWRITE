import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity,
  TouchableWithoutFeedback,
  StatusBar,
  useColorScheme as _useColorScheme,
  ScrollView,
  SafeAreaView,
  Platform,
  Keyboard,
  GestureResponderEvent,
  FlatList,
  SectionList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';

// Type for journal entries
interface HumanEntry {
  id: string;
  date: string;
  filename: string;
  previewText: string;
}

// Add type definitions for the section data
type Section = {
  title: string;
  data: HumanEntry[];
};

export default function App() {
  const systemColorScheme = _useColorScheme();
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(systemColorScheme === 'dark' ? 'dark' : 'light');
  const [text, setText] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(900); // 15 minutes in seconds
  const [timerIsRunning, setTimerIsRunning] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [showSidebar, setShowSidebar] = useState(false);
  const [entries, setEntries] = useState<HumanEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedFont, setSelectedFont] = useState<string>('Lato-Regular');
  const [currentRandomFont, setCurrentRandomFont] = useState<string>('');
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEntries, setFilteredEntries] = useState<HumanEntry[]>([]);
  
  // Available fonts - similar to the original implementation
  const fontOptions = [
    { name: 'Lato', value: 'Lato-Regular' },
    { name: 'Arial', value: 'Arial' },
    { name: 'System', value: 'System' },
    { name: 'Serif', value: 'serif' },
    { name: 'Random', value: 'random' }
  ];
  
  // Additional available fonts for random selection
  const availableFonts = [
    'Lato-Regular', 
    'Arial',
    'System',
    'serif',
    'Georgia',
    'Verdana',
    'Helvetica',
    'Courier',
    'Palatino'
  ];
  
  // Load fonts
  const [fontsLoaded] = useFonts({
    'Lato-Regular': require('./assets/fonts/Lato-Regular.ttf'),
  });

  // Random placeholder messages
  const placeholderOptions = [
    "Begin writing",
    "Pick a thought and go",
    "Start typing",
    "What's on your mind",
    "Just start",
    "Type your first thought",
    "Start with one sentence",
    "Just say it"
  ];
  
  const [placeholderText] = useState(() => {
    const randomIndex = Math.floor(Math.random() * placeholderOptions.length);
    return placeholderOptions[randomIndex];
  });

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (timerIsRunning) {
      interval = setInterval(() => {
        setTimeRemaining(prevTime => {
          if (prevTime <= 1) {
            setTimerIsRunning(false);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerIsRunning]);

  // Format timer display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Toggle timer
  const toggleTimer = () => {
    if (timeRemaining === 0) {
      setTimeRemaining(900); // Reset to 15 minutes
      setTimerIsRunning(true);
    } else {
      setTimerIsRunning(!timerIsRunning);
    }
  };

  // Reset timer
  const resetTimer = () => {
    setTimeRemaining(900);
    setTimerIsRunning(false);
  };
  
  // Load entries from storage
  const loadEntries = async () => {
    try {
      const entriesDir = FileSystem.documentDirectory + 'freewrite/';
      const dirInfo = await FileSystem.getInfoAsync(entriesDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(entriesDir, { intermediates: true });
      }
      
      const files = await FileSystem.readDirectoryAsync(entriesDir);
      const mdFiles = files.filter(file => file.endsWith('.md'));
      
      const loadedEntries = await Promise.all(
        mdFiles.map(async (filename) => {
          // Extract ID and date from filename using regex
          const uuidMatch = filename.match(/\[(.*?)\]/);
          const dateMatch = filename.match(/\[(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})\]/);
          
          if (!uuidMatch || !dateMatch) return null;
          
          const id = uuidMatch[1];
          const dateString = dateMatch[1];
          
          // Parse date to create display date
          const [year, month, day] = dateString.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          const displayDate = `${date.toLocaleString('en', { month: 'short' })} ${date.getDate()}`;
          
          // Read file content for preview
          const fileUri = FileSystem.documentDirectory + 'freewrite/' + filename;
          const content = await FileSystem.readAsStringAsync(fileUri);
          const preview = content.replace(/\n/g, ' ').trim();
          const truncatedPreview = preview.length > 30 ? 
            preview.substring(0, 30) + '...' : preview;
          
          return {
            id,
            date: displayDate,
            filename,
            previewText: truncatedPreview
          };
        })
      );
      
      // Filter out nulls and sort by date (newest first)
      const validEntries = loadedEntries
        .filter((entry): entry is HumanEntry => entry !== null)
        .sort((a, b) => {
          const dateA = a.filename.match(/\[(\d{4}-\d{2}-\d{2})/)?.[1] || '';
          const dateB = b.filename.match(/\[(\d{4}-\d{2}-\d{2})/)?.[1] || '';
          return dateB.localeCompare(dateA);
        });
      
      setEntries(validEntries);
      
      // Check if we need to create a new entry
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      const hasEmptyEntryToday = validEntries.some(entry => {
        const dateMatch = entry.filename.match(/\[(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          const [year, month, day] = dateMatch[1].split('-').map(Number);
          const entryDate = new Date(year, month - 1, day);
          const entryDayStart = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
          return (
            entryDayStart.getTime() === todayStart.getTime() && 
            entry.previewText === ''
          );
        }
        return false;
      });
      
      const hasOnlyWelcomeEntry = validEntries.length === 1 && 
        validEntries[0].previewText.includes("Welcome to Freewrite");
      
      if (validEntries.length === 0) {
        // First time user - create welcome entry
        createNewEntry(true);
      } else if (!hasEmptyEntryToday && !hasOnlyWelcomeEntry) {
        // No empty entry for today and not just welcome entry
        createNewEntry();
      } else {
        // Select most recent empty entry from today or welcome entry
        const todayEntry = validEntries.find(entry => {
          const dateMatch = entry.filename.match(/\[(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            const [year, month, day] = dateMatch[1].split('-').map(Number);
            const entryDate = new Date(year, month - 1, day);
            const entryDayStart = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
            return entryDayStart.getTime() === todayStart.getTime() && entry.previewText === '';
          }
          return false;
        });
        
        if (todayEntry) {
          setSelectedEntryId(todayEntry.id);
          loadEntry(todayEntry);
        } else if (hasOnlyWelcomeEntry) {
          setSelectedEntryId(validEntries[0].id);
          loadEntry(validEntries[0]);
        }
      }
    } catch (error) {
      console.error('Error loading entries:', error);
      createNewEntry();
    }
  };
  
  // Create a new entry
  const createNewEntry = async (isWelcome = false) => {
    const newId = generateUUID();
    const now = new Date();
    const dateFormatter = (date: Date) => {
      const pad = (num: number) => num.toString().padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
    };
    
    const dateString = dateFormatter(now);
    const displayDate = `${now.toLocaleString('en', { month: 'short' })} ${now.getDate()}`;
    const filename = `[${newId}]-[${dateString}].md`;
    
    const initialContent = isWelcome ? 
      "\n\nWelcome to Freewrite.\n\nThis is a simple, distraction-free writing app to help you focus.\n\nSet a timer, pick a font size, and just start writing.\n\nYour entries are saved automatically and can be accessed from the history sidebar." :
      "\n\n";
    
    try {
      const fileUri = FileSystem.documentDirectory + 'freewrite/' + filename;
      await FileSystem.writeAsStringAsync(fileUri, initialContent);
      
      const newEntry: HumanEntry = {
        id: newId,
        date: displayDate,
        filename,
        previewText: isWelcome ? "Welcome to Freewrite." : ""
      };
      
      setEntries(prev => [newEntry, ...prev]);
      setSelectedEntryId(newId);
      setText(initialContent);
    } catch (error) {
      console.error('Error creating new entry:', error);
    }
  };
  
  // Load a specific entry
  const loadEntry = async (entry: HumanEntry) => {
    try {
      const fileUri = FileSystem.documentDirectory + 'freewrite/' + entry.filename;
      const content = await FileSystem.readAsStringAsync(fileUri);
      setText(content);
    } catch (error) {
      console.error('Error loading entry:', error);
    }
  };
  
  // Save current entry
  const saveCurrentEntry = async () => {
    if (!selectedEntryId) return;
    
    const currentEntry = entries.find(entry => entry.id === selectedEntryId);
    if (!currentEntry) return;
    
    try {
      const fileUri = FileSystem.documentDirectory + 'freewrite/' + currentEntry.filename;
      await FileSystem.writeAsStringAsync(fileUri, text);
      
      // Update entry preview in the list
      const preview = text.replace(/\n/g, ' ').trim();
      const truncatedPreview = preview.length > 30 ? 
        preview.substring(0, 30) + '...' : preview;
      
      setEntries(prev => prev.map(entry => 
        entry.id === selectedEntryId 
          ? { ...entry, previewText: truncatedPreview }
          : entry
      ));
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };
  
  // Share current entry
  const shareEntry = async () => {
    if (!selectedEntryId) return;
    
    const currentEntry = entries.find(entry => entry.id === selectedEntryId);
    if (!currentEntry) return;
    
    try {
      const fileUri = FileSystem.documentDirectory + 'freewrite/' + currentEntry.filename;
      const tempFileUri = FileSystem.cacheDirectory + currentEntry.filename;
      
      await FileSystem.copyAsync({
        from: fileUri,
        to: tempFileUri
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(tempFileUri, {
          mimeType: 'text/markdown',
          dialogTitle: 'Share your writing'
        });
      }
    } catch (error) {
      console.error('Error sharing entry:', error);
    }
  };
  
  // Delete an entry
  const deleteEntry = async (entryId: string) => {
    const entryToDelete = entries.find(entry => entry.id === entryId);
    if (!entryToDelete) return;
    
    try {
      const fileUri = FileSystem.documentDirectory + 'freewrite/' + entryToDelete.filename;
      await FileSystem.deleteAsync(fileUri);
      
      setEntries(prev => prev.filter(entry => entry.id !== entryId));
      
      if (selectedEntryId === entryId) {
        // If we deleted the selected entry, create a new one or select the first available
        if (entries.length > 1) {
          const newSelectedEntry = entries.find(entry => entry.id !== entryId);
          if (newSelectedEntry) {
            setSelectedEntryId(newSelectedEntry.id);
            loadEntry(newSelectedEntry);
            return;
          }
        }
        createNewEntry();
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  // Generate UUID helper
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
  
  // Toggle dark/light mode
  const toggleColorScheme = () => {
    const newScheme = colorScheme === 'light' ? 'dark' : 'light';
    setColorScheme(newScheme);
    AsyncStorage.setItem('colorScheme', newScheme);
  };
  
  // Change font size
  const changeFontSize = (size: number) => {
    setFontSize(size);
    AsyncStorage.setItem('fontSize', size.toString());
  };
  
  // Toggle font menu
  const toggleFontMenu = () => {
    setShowFontMenu(!showFontMenu);
  };

  // Function to get display name for a font
  const getDisplayFontName = (fontValue: string) => {
    if (fontValue === 'System') return Platform.OS === 'ios' ? 'San Francisco' : 'Roboto';
    if (fontValue === 'Lato-Regular') return 'Lato';
    if (fontValue === 'serif' && Platform.OS === 'ios') return 'Times New Roman';
    
    return fontValue;
  };

  // Random button title, following the original app's implementation
  const randomButtonTitle = currentRandomFont.length === 0 ? 
    "Random" : `Random [${getDisplayFontName(currentRandomFont)}]`;

  // Set font - updated to match original implementation
  const changeFont = (fontValue: string) => {
    if (fontValue === 'random') {
      // Choose a random font from the available fonts list
      const randomIndex = Math.floor(Math.random() * (availableFonts.length - 1));
      const randomFont = availableFonts[randomIndex];
      setSelectedFont(randomFont);
      setCurrentRandomFont(randomFont); // Track which random font is selected
      AsyncStorage.setItem('selectedFont', randomFont);
      AsyncStorage.setItem('currentRandomFont', randomFont);
    } else {
      setSelectedFont(fontValue);
      setCurrentRandomFont(''); // Clear random font tracking when explicitly choosing a font
      AsyncStorage.setItem('selectedFont', fontValue);
      AsyncStorage.setItem('currentRandomFont', '');
    }
    setShowFontMenu(false);
  };
  
  // Get system font name
  const getSystemFont = () => {
    return Platform.OS === 'ios' ? 'San Francisco' : 'Roboto';
  };
  
  // Get font display name for UI
  const getFontDisplayName = (fontValue: string) => {
    if (fontValue === 'System') return getSystemFont();
    
    const font = fontOptions.find(opt => opt.value === fontValue);
    return font ? font.name : fontValue;
  };
  
  // Load saved preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedColorScheme = await AsyncStorage.getItem('colorScheme');
        if (savedColorScheme === 'light' || savedColorScheme === 'dark') {
          setColorScheme(savedColorScheme as 'light' | 'dark');
        }
        
        const savedFontSize = await AsyncStorage.getItem('fontSize');
        if (savedFontSize !== null) {
          setFontSize(parseInt(savedFontSize, 10));
        }
        
        const savedFont = await AsyncStorage.getItem('selectedFont');
        if (savedFont !== null) {
          setSelectedFont(savedFont);
        }
        
        const savedRandomFont = await AsyncStorage.getItem('currentRandomFont');
        if (savedRandomFont !== null) {
          setCurrentRandomFont(savedRandomFont);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };
    
    loadPreferences();
    loadEntries();
  }, []);
  
  // Auto-save
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (selectedEntryId) {
        saveCurrentEntry();
      }
    }, 1000);
    
    return () => clearInterval(saveInterval);
  }, [selectedEntryId, text]);
  
  // Filter entries based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEntries(entries);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredEntries(
        entries.filter(entry => 
          entry.date.toLowerCase().includes(query) || 
          entry.previewText.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, entries]);

  // Group entries by month and year
  const getSectionedEntries = () => {
    const grouped: { [key: string]: HumanEntry[] } = {};
    
    filteredEntries.forEach(entry => {
      // Extract month and year from filename
      const dateMatch = entry.filename.match(/\[(\d{4}-\d{2})/);
      if (dateMatch) {
        const [year, month] = dateMatch[1].split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        
        // Format as "Month YYYY"
        const monthYear = date.toLocaleString('en', { month: 'long', year: 'numeric' });
        
        if (!grouped[monthYear]) {
          grouped[monthYear] = [];
        }
        
        grouped[monthYear].push(entry);
      }
    });
    
    // Convert to sections format for SectionList
    return Object.keys(grouped).map(title => ({
      title,
      data: grouped[title]
    }));
  };

  // Render a section header with proper type
  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={[
      styles.sectionHeader,
      { backgroundColor: colorScheme === 'dark' ? '#222' : '#e5e5e5' }
    ]}>
      <Text style={[
        styles.sectionHeaderText,
        { color: textColor }
      ]}>
        {section.title}
      </Text>
    </View>
  );

  // Render an individual entry
  const renderEntryItem = ({ item }: { item: HumanEntry }) => (
    <TouchableOpacity
      style={[
        styles.entryItem,
        selectedEntryId === item.id && {
          backgroundColor: colorScheme === 'dark' ? '#333' : '#e0e0e0' 
        }
      ]}
      onPress={() => {
        setSelectedEntryId(item.id);
        loadEntry(item);
        setShowSidebar(false);
      }}
    >
      <View style={styles.entryInfo}>
        <Text style={[styles.entryDate, { color: textColor }]}>
          {item.date}
        </Text>
        <Text 
          style={[
            styles.entryPreview, 
            { color: colorScheme === 'dark' ? '#aaa' : '#666' }
          ]}
          numberOfLines={1}
        >
          {item.previewText || placeholderText}
        </Text>
      </View>
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={(e) => {
          e.stopPropagation();
          deleteEntry(item.id);
        }}
      >
        <Ionicons name="trash-outline" size={18} color={colorScheme === 'dark' ? '#aaa' : '#666'} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (!fontsLoaded) {
    return (
      <View style={[
        styles.container,
        { backgroundColor: colorScheme === 'dark' ? '#000' : '#fff' }
      ]}>
        <Text style={{ color: colorScheme === 'dark' ? '#fff' : '#000' }}>
          Loading...
        </Text>
      </View>
    );
  }
  
  const textColor = colorScheme === 'dark' ? '#fff' : '#000';
  const backgroundColor = colorScheme === 'dark' ? '#000' : '#fff';
  const iconColor = colorScheme === 'dark' ? '#fff' : '#000';
  const buttonColor = colorScheme === 'dark' ? '#333' : '#f0f0f0';
  const placeholderColor = colorScheme === 'dark' ? '#666' : '#aaa';
  
  // Get font family for TextInput styling
  const getFontFamily = () => {
    if (selectedFont === 'System') {
      return undefined; // Let the system default be used
    }
    return selectedFont;
  };
  
  const textStyle = {
    color: textColor,
    fontSize,
    lineHeight: fontSize * 1.5,
    fontFamily: getFontFamily(),
  };
  
  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor }
    ]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Add a wrapper to detect taps outside the menu */}
      <TouchableWithoutFeedback onPress={() => showMenu && setShowMenu(false)}>
        <View style={{ flex: 1 }}>
          {/* Top Navigation */}
          <View style={styles.topNav}>
            <TouchableOpacity 
              style={styles.navButton} 
              onPress={() => setShowSidebar(!showSidebar)}
            >
              <Ionicons name="menu-outline" size={24} color={iconColor} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.navButton}
              onPress={toggleTimer}
            >
              <Text style={[styles.timerText, { color: timerIsRunning ? iconColor : placeholderColor }]}>
                {formatTime(timeRemaining)}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.navButton}
              onPress={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
            >
              <Ionicons name="settings-outline" size={24} color={iconColor} />
            </TouchableOpacity>
          </View>
          
          {/* Main Content - Sidebar or Editor */}
          <View style={styles.mainContent}>
            {showSidebar ? (
              <View style={[
                styles.sidebar,
                { backgroundColor: colorScheme === 'dark' ? '#111' : '#f7f7f7' }
              ]}>
                <View style={[
                  styles.sidebarHeader,
                  { borderBottomColor: colorScheme === 'dark' ? '#333' : '#ddd' }
                ]}>
                  <Text style={[
                    styles.sidebarTitle,
                    { color: textColor }
                  ]}>
                    History
                  </Text>
                  <View style={[
                    styles.searchContainer,
                    { backgroundColor: colorScheme === 'dark' ? '#222' : '#e9e9e9' }
                  ]}>
                    <Ionicons 
                      name="search-outline" 
                      size={18} 
                      color={colorScheme === 'dark' ? '#999' : '#666'} 
                      style={{ marginRight: 8 }}
                    />
                    <TextInput
                      style={[
                        styles.searchInput,
                        { color: textColor }
                      ]}
                      placeholder="Search entries..."
                      placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      keyboardAppearance={colorScheme === 'dark' ? 'dark' : 'light'}
                      autoCapitalize="none"
                      autoCorrect={false}
                      clearButtonMode="always"
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons 
                          name="close-circle" 
                          size={18} 
                          color={colorScheme === 'dark' ? '#999' : '#666'} 
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <SectionList
                  sections={getSectionedEntries()}
                  keyExtractor={(item) => item.id}
                  renderItem={renderEntryItem}
                  renderSectionHeader={renderSectionHeader}
                  stickySectionHeadersEnabled={true}
                  showsVerticalScrollIndicator={true}
                  initialNumToRender={20}
                  maxToRenderPerBatch={20}
                  windowSize={10}
                  ListEmptyComponent={
                    <View style={styles.emptyList}>
                      <Text style={{ color: colorScheme === 'dark' ? '#999' : '#666', textAlign: 'center' }}>
                        {searchQuery.length > 0 ? 'No matching entries found' : 'No entries yet'}
                      </Text>
                    </View>
                  }
                  style={styles.entriesList}
                />
              </View>
            ) : (
              <View style={styles.editor}>
                <TextInput
                  style={[
                    styles.textInput,
                    textStyle
                  ]}
                  multiline
                  value={text}
                  onChangeText={setText}
                  placeholder={placeholderText}
                  placeholderTextColor={placeholderColor}
                  keyboardAppearance={colorScheme === 'dark' ? 'dark' : 'light'}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  textContentType="none"
                />
              </View>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
      
      {/* Settings Menu Popup */}
      {showMenu && (
        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
          <View style={[
            styles.menuPopup,
            { backgroundColor: colorScheme === 'dark' ? '#333' : '#f0f0f0' }
          ]}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={toggleColorScheme}
            >
              <Text style={{ color: textColor }}>
                {colorScheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </Text>
              <Ionicons 
                name={colorScheme === 'dark' ? 'sunny-outline' : 'moon-outline'} 
                size={20} 
                color={iconColor} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={toggleFontMenu}
            >
              <Text style={{ color: textColor }}>Font</Text>
              <View style={styles.menuValue}>
                <Text style={{ color: textColor }}>
                  {currentRandomFont.length > 0 
                    ? `Random [${getDisplayFontName(currentRandomFont)}]`
                    : getDisplayFontName(selectedFont)}
                </Text>
                <Ionicons name="chevron-down" size={16} color={iconColor} style={{ marginLeft: 5 }} />
              </View>
            </TouchableOpacity>
            
            {showFontMenu && (
              <View style={styles.submenu}>
                {fontOptions.map((font) => (
                  <TouchableOpacity
                    key={font.value}
                    style={[
                      styles.submenuItem,
                      (font.value === 'random' && currentRandomFont.length > 0) || 
                      (font.value !== 'random' && selectedFont === font.value && currentRandomFont.length === 0)
                        ? styles.selectedSubmenuItem
                        : null
                    ]}
                    onPress={() => changeFont(font.value)}
                  >
                    <Text 
                      style={{ 
                        color: textColor,
                        fontFamily: font.value === 'System' ? undefined : 
                                  font.value === 'random' ? undefined : 
                                  font.value,
                        fontWeight: ((font.value === 'random' && currentRandomFont.length > 0) || 
                                   (font.value !== 'random' && selectedFont === font.value && currentRandomFont.length === 0)) 
                                   ? 'bold' : 'normal',
                      }}
                    >
                      {font.value === 'random' ? randomButtonTitle : font.name}
                    </Text>
                    {((font.value === 'random' && currentRandomFont.length > 0) || 
                     (font.value !== 'random' && selectedFont === font.value && currentRandomFont.length === 0)) && (
                      <Ionicons name="checkmark" size={16} color={iconColor} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            <View style={styles.menuItem}>
              <Text style={{ color: textColor }}>Font Size</Text>
              <View style={styles.fontSizeButtons}>
                {[16, 18, 20, 22, 24].map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.fontSizeButton,
                      fontSize === size && styles.selectedFontSize,
                      { borderColor: textColor }
                    ]}
                    onPress={() => changeFontSize(size)}
                  >
                    <Text style={{ color: textColor, fontSize: size / 2 }}>
                      A
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={resetTimer}
            >
              <Text style={{ color: textColor }}>Reset Timer</Text>
              <Ionicons name="refresh-outline" size={20} color={iconColor} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={shareEntry}
            >
              <Text style={{ color: textColor }}>Share</Text>
              <Ionicons name="share-outline" size={20} color={iconColor} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => createNewEntry()}
            >
              <Text style={{ color: textColor }}>New Entry</Text>
              <Ionicons name="add-outline" size={20} color={iconColor} />
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  navButton: {
    padding: 8,
  },
  timerText: {
    fontSize: 16,
    fontFamily: 'Lato-Regular',
  },
  mainContent: {
    flex: 1,
  },
  editor: {
    flex: 1,
    padding: 16,
  },
  textInput: {
    flex: 1,
    padding: 0,
    fontFamily: 'Lato-Regular',
    textAlignVertical: 'top',
  },
  menuPopup: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 220,
    borderRadius: 8,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  fontSizeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: 130,
  },
  fontSizeButton: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 3,
    marginRight: 1,
    marginBottom: 2,
    borderWidth: 1,
    borderRadius: 11,
  },
  selectedFontSize: {
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  sidebar: {
    flex: 1,
    height: '100%',
  },
  sidebarHeader: {
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  sidebarTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    height: 36,
    fontSize: 16,
    padding: 0,
  },
  entriesList: {
    flex: 1,
  },
  sectionHeader: {
    padding: 8,
    paddingLeft: 16,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  entryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  entryInfo: {
    flex: 1,
  },
  entryDate: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  entryPreview: {
    fontSize: 14,
  },
  deleteButton: {
    padding: 8,
  },
  menuValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submenu: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginTop: -8,
    marginBottom: 8,
    paddingBottom: 4,
  },
  submenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  selectedSubmenuItem: {
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  emptyList: {
    padding: 20,
    alignItems: 'center',
  },
});
