import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Fuse from 'fuse.js';
import { databases, appwriteConfig } from '../utils/appwriteConfig';
import { Query } from 'appwrite';

const QuestionSearch = ({ onQuestionSelect, initialSelectedTags = [], onTagsChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fuse, setFuse] = useState(null);
  const [selectedTags, setSelectedTags] = useState(initialSelectedTags);
  const [cache, setCache] = useState({
    questions: new Map(),
    tags: new Map(),
  });

  // Initialize Fuse.js with search options
  useEffect(() => {
    if (questions.length > 0) {
      const fuseOptions = {
        keys: ['text', 'tags'],
        threshold: 0.3,
        includeScore: true,
        ignoreCase: true,
        tokenize: true,
        matchAllTokens: true,
      };
      setFuse(new Fuse(questions, fuseOptions));
    }
  }, [questions]);

  // Fetch questions and tags with caching
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Check cache for questions
      const cachedQuestions = cache.questions.get('all');
      if (cachedQuestions) {
        setQuestions(cachedQuestions.map(q => ({
          ...q,
          tags: Array.isArray(q.tags) ? q.tags : (typeof q.tags === 'string' ? q.tags.split(',').map(t => t.trim()) : []),
        })));
        return;
      }
      const questionsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.questionsCollectionId
      );
      const formattedQuestions = questionsRes.documents.map(q => ({
        ...q,
        text: q.questionText,
        tags: Array.isArray(q.tags) ? q.tags : (typeof q.tags === 'string' ? q.tags.split(',').map(t => t.trim()) : []),
      }));
      // Update cache
      setCache(prev => ({
        ...prev,
        questions: new Map(prev.questions).set('all', formattedQuestions),
      }));
      setQuestions(formattedQuestions);
      // Extract and count unique tags
      const tagCounts = formattedQuestions.reduce((acc, q) => {
        q.tags.forEach(tag => {
          acc[tag] = (acc[tag] || 0) + 1;
        });
        return acc;
      }, {});
      const uniqueTags = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);
      setTags(uniqueTags);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  }, [cache]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Search and filter questions
  useEffect(() => {
    if (!fuse) return;
    let results = [...questions];
    // Apply tag filtering first
    if (selectedTags.length > 0) {
      results = results.filter(q =>
        Array.isArray(q.tags) && selectedTags.every(tag => q.tags.includes(tag))
      );
    }
    // Then apply text search if query exists
    if (searchQuery.trim()) {
      const searchResults = fuse.search(searchQuery);
      const searchResultIds = new Set(searchResults.map(result => result.item.$id));
      results = results.filter(q => searchResultIds.has(q.$id));
    }
    // Debug log
    console.log('Filtered questions:', results);
    setFilteredQuestions(results);
  }, [searchQuery, selectedTags, fuse, questions]);

  const toggleTag = (tag) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newTags);
    onTagsChange?.(newTags);
  };

  const renderQuestionItem = ({ item }) => (
    <TouchableOpacity
      style={styles.questionItem}
      onPress={() => onQuestionSelect(item)}
    >
      <Text style={styles.questionText} numberOfLines={2}>
        {item.text}
      </Text>
      <View style={styles.tagsContainer}>
        {item.tags.map(tag => (
          <View key={tag} style={[
            styles.tag,
            selectedTags.includes(tag) && styles.selectedTag
          ]}>
            <Text style={[
              styles.tagText,
              selectedTags.includes(tag) && styles.selectedTagText
            ]}>
              {tag}
            </Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search questions..."
          placeholderTextColor="#666"
        />
        {loading && <ActivityIndicator size="small" color="#1976d2" />}
      </View>

      <View style={styles.tagsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {tags.map(({ tag, count }) => (
            <TouchableOpacity
              key={tag}
              style={[
                styles.tag,
                selectedTags.includes(tag) && styles.selectedTag,
              ]}
              onPress={() => toggleTag(tag)}
            >
              <Text style={[
                styles.tagText,
                selectedTags.includes(tag) && styles.selectedTagText,
              ]}>
                {tag} ({count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredQuestions}
        renderItem={renderQuestionItem}
        keyExtractor={item => item.$id}
        style={styles.resultsList}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {loading ? 'Loading questions...' : 'No questions found'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedTag: {
    backgroundColor: '#1976d2',
  },
  tagText: {
    color: '#333',
    fontSize: 14,
  },
  selectedTagText: {
    color: '#fff',
  },
  resultsList: {
    flex: 1,
  },
  questionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  questionText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
});

export default QuestionSearch; 