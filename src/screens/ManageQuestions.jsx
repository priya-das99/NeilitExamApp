import React, { useEffect, useState, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, Modal, TextInput, ActivityIndicator, StatusBar, SafeAreaView } from 'react-native';
import { databases, appwriteConfig, storage } from '../utils/appwriteConfig';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminSidebar from '../components/AdminSidebar';
import { launchImageLibrary } from 'react-native-image-picker';
import RNFetchBlob from 'rn-fetch-blob';
import { ID, Query } from 'appwrite';
import ImageResizer from 'react-native-image-resizer';
import { AppwriteContext } from '../utils/AppwriteContext';
import { useNavigation } from '@react-navigation/native';

const defaultQuestion = {
  text: '',
  options: [
    { text: '', image: null },
    { text: '', image: null },
    { text: '', image: null },
    { text: '', image: null }
  ],
  correctAnswers: [],
  image: null,
  type: 'mcq',
  marks: 1,
  difficulty: 'easy',
  tags: '',
  displayNumber: 0
};

const ManageQuestions = () => {
  const { user, isAdmin } = useContext(AppwriteContext);
  const navigation = useNavigation();
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForms, setQuestionForms] = useState([defaultQuestion]);
  const [saving, setSaving] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [fullText, setFullText] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'Only administrators can access this page.');
      navigation.goBack();
      return;
    }
    fetchQuestions();
  }, [isAdmin, navigation]);

  useEffect(() => {
    // Extract unique tags from questions
    const tagSet = new Set();
    questions.forEach(q => {
      if (Array.isArray(q.tags)) {
        q.tags.forEach(tag => tag && tagSet.add(tag));
      }
    });
    setAllTags(Array.from(tagSet).sort());
  }, [questions]);

  useEffect(() => {
    let filtered = [...questions];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(question => 
        question.questionText.toLowerCase().includes(query) ||
        (Array.isArray(question.tags) && question.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }
    
    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(question =>
        Array.isArray(question.tags) && selectedTags.every(tag => question.tags.includes(tag))
      );
    }
    
    // Apply difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(q => q.difficulty === selectedDifficulty);
    }
    
    setFilteredQuestions(filtered);
  }, [searchQuery, selectedTags, questions, selectedDifficulty]);

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const getNextQuestionNumber = async () => {
    try {
      const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.questionsCollectionId,
        [
          Query.orderDesc('questionNumber'),
          Query.limit(1)
        ]
      );
      if (res.documents.length > 0) {
        return (res.documents[0].questionNumber || 0) + 1;
      }
      return 1;
    } catch (err) {
      console.error('Error getting next question number:', err);
      return 1;
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      console.log('Fetching questions from Appwrite...');
      const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.questionsCollectionId
      );
      console.log('Questions fetched successfully:', res.documents.length);
      const formattedQuestions = res.documents.map((q, index) => ({
        ...q,
        options: q.options ? JSON.parse(q.options) : [],
        correctAnswers: q.correctAnswers ? JSON.parse(q.correctAnswers).map(a => a.charCodeAt(0) - 97) : [],
        tags: Array.isArray(q.tags) ? q.tags : (q.tags ? [q.tags] : []),
        displayNumber: index + 1 // Add display number for UI only
      }));
      setQuestions(formattedQuestions);
      setFilteredQuestions(formattedQuestions);
    } catch (err) {
      console.error('Error fetching questions:', err);
      Alert.alert('Error', 'Failed to load questions. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (index, field, value) => {
    setQuestionForms(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
  };

  const handleOptionChange = (qIdx, optIdx, value) => {
    setQuestionForms(prev => prev.map((q, i) => i === qIdx ? {
      ...q,
      options: q.options.map((o, j) => j === optIdx ? { ...o, text: value } : o)
    } : q));
  };

  const handleCorrectAnswerChange = (qIdx, optIdx) => {
    setQuestionForms(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      if (q.type === 'mcq') {
        return { ...q, correctAnswers: [optIdx] };
      } else {
        return {
          ...q,
          correctAnswers: q.correctAnswers.includes(optIdx)
            ? q.correctAnswers.filter(a => a !== optIdx)
            : [...q.correctAnswers, optIdx]
        };
      }
    }));
  };

  const checkImageResolution = (uri, minWidth = 1200, minHeight = 1600) => {
    return new Promise((resolve, reject) => {
      Image.getSize(uri, (width, height) => {
        if (width >= minWidth && height >= minHeight) {
          resolve(true);
        } else {
          resolve(false);
        }
      }, reject);
    });
  };

  const handleImagePick = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.assets && result.assets[0]) {
      const asset = result.assets[0];
      const isValid = await checkImageResolution(asset.uri);
      if (!isValid) {
        Alert.alert('Image too small', 'Please select an image with at least 1200x1600 pixels (2MP) for clarity.');
        return;
      }
      try {
        const resized = await ImageResizer.createResizedImage(
          asset.uri,
          150, // width
          120, // height
          'JPEG',
          80 // quality
        );
        setQuestionForms(prev => prev.map(q => q.image ? { ...q, image: { ...asset, uri: resized.uri } } : q));
      } catch (err) {
        Alert.alert('Resize Error', 'Failed to resize image.');
      }
    }
  };

  const handleOptionImagePick = async (idx) => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.assets && result.assets[0]) {
      const asset = result.assets[0];
      const isValid = await checkImageResolution(asset.uri);
      if (!isValid) {
        Alert.alert('Image too small', 'Please select an image with at least 1200x1600 pixels (2MP) for clarity.');
        return;
      }
      try {
        const resized = await ImageResizer.createResizedImage(
          asset.uri,
          150, // width
          120, // height
          'JPEG',
          80 // quality
        );
        setQuestionForms(prev => prev.map((q, i) => i === idx ? {
          ...q,
          options: q.options.map((o, j) => j === idx ? { ...o, image: { ...asset, uri: resized.uri } } : o)
        } : q));
      } catch (err) {
        Alert.alert('Resize Error', 'Failed to resize option image.');
      }
    }
  };

  const handleRemoveImage = () => {
    setQuestionForms(prev => prev.map(q => q.image ? { ...q, image: null } : q));
  };

  const handleRemoveOptionImage = (idx) => {
    setQuestionForms(prev => prev.map(q => ({
      ...q,
      options: q.options.map((o, j) => j === idx ? { ...o, image: null } : o)
    })));
  };

  const uploadImageToAppwrite = async (image) => {
    try {
      const fileId = ID.unique();
      const response = await RNFetchBlob.fetch(
        'POST',
        `https://cloud.appwrite.io/v1/storage/buckets/${appwriteConfig.bucketId}/files`,
        {
          'Content-Type': 'multipart/form-data',
          'X-Appwrite-Project': appwriteConfig.projectId,
        },
        [
          { name: 'fileId', data: fileId },
          {
            name: 'file',
            filename: image.fileName || 'photo.jpg',
            type: image.type || 'image/jpeg',
            data: RNFetchBlob.wrap(image.uri),
          },
        ]
      );

      const data = JSON.parse(response.data);
      if (response.respInfo.status !== 201) {
        throw new Error(data.message || 'Upload failed');
      }
      return data.$id;
    } catch (err) {
      console.error('Image upload failed:', err);
      throw err;
    }
  };

  const handleSaveAll = async () => {
    // Validate all forms
    for (const q of questionForms) {
      if (!q.text || q.options.some(o => !o.text) || q.correctAnswers.length === 0) {
        Alert.alert('Error', 'Please fill all required fields and select correct answer(s) for each question');
        return;
      }
    }
    setSaving(true);
    try {
      for (const q of questionForms) {
        let imageId = null;
        if (q.image) {
          imageId = await uploadImageToAppwrite(q.image);
        }
        const optionsWithImages = await Promise.all(q.options.map(async (opt, i) => {
          let optionImageId = null;
          if (opt.image) {
            optionImageId = await uploadImageToAppwrite(opt.image);
          }
          return {
            optionId: String.fromCharCode(97 + i),
            text: opt.text,
            imageId: optionImageId
          };
        }));
        let questionId = ID.unique();
        const data = {
          questionId,
          questionText: q.text,
          imageId: imageId,
          options: JSON.stringify(optionsWithImages),
          correctAnswers: JSON.stringify(q.correctAnswers.map(i => String.fromCharCode(97 + i))),
          type: q.type,
          marks: Number(q.marks) || 1,
          difficulty: q.difficulty,
          tags: q.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
        };
        await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.questionsCollectionId,
          ID.unique(),
          data
        );
      }
      fetchQuestions();
      closeModal();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save questions');
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingQuestion(null);
    setQuestionForms([defaultQuestion]);
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setQuestionForms(prev => prev.map(q => ({
      ...q,
      text: question.questionText,
      options: question.options.map(o => ({
        text: o.text,
        image: o.imageId ? { uri: `https://cloud.appwrite.io/v1/storage/buckets/${appwriteConfig.bucketId}/files/${o.imageId}/view` } : null
      })),
      correctAnswers: question.correctAnswers,
      image: question.imageId ? { uri: `https://cloud.appwrite.io/v1/storage/buckets/${appwriteConfig.bucketId}/files/${question.imageId}/view` } : null,
      type: question.type,
      marks: question.marks,
      difficulty: question.difficulty,
      tags: Array.isArray(question.tags) ? question.tags.join(', ') : (question.tags || ''),
      displayNumber: question.displayNumber
    })));
    setModalVisible(true);
  };

  const handleDelete = async (questionId) => {
    Alert.alert(
      'Delete Question',
      'Are you sure you want to delete this question?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databases.deleteDocument(
                appwriteConfig.databaseId,
                appwriteConfig.questionsCollectionId,
                questionId
              );
              fetchQuestions();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete question');
            }
          }
        }
      ]
    );
  };

  const handleAddQuestionForm = () => {
    setQuestionForms(prev => [...prev, defaultQuestion]);
  };

  const handleRemoveQuestionForm = (idx) => {
    setQuestionForms(prev => prev.filter((_, i) => i !== idx));
  };

  const renderQuestionItem = (question) => (
    <View key={`${question.questionId}-${question.$id}`} style={styles.questionCard}>
      <View style={styles.questionHeader}>
        <View style={styles.questionNumberContainer}>
          <Text style={styles.questionNumber}>Q{question.displayNumber}</Text>
        </View>
        <Text style={styles.questionTitle} numberOfLines={2}>
          {question.questionText}
        </Text>
        <View style={styles.questionActions}>
          <TouchableOpacity onPress={() => handleEdit(question)} style={styles.actionButton}>
            <Icon name="edit" size={20} color="#1976d2" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(question.$id)} style={styles.actionButton}>
            <Icon name="delete" size={20} color="#f44336" />
          </TouchableOpacity>
        </View>
      </View>
      {question.imageId && (
        <Image
          source={{ uri: `https://cloud.appwrite.io/v1/storage/buckets/${appwriteConfig.bucketId}/files/${question.imageId}/view` }}
          style={styles.questionImage}
          resizeMode="contain"
        />
      )}
      <View style={styles.questionDetails}>
        <Text style={styles.detailText}>Type: {question.type.toUpperCase()}</Text>
        <Text style={styles.detailText}>Difficulty: {question.difficulty}</Text>
        <Text style={styles.detailText}>Marks: {question.marks}</Text>
      </View>
      <View style={styles.tagsContainer}>
        {Array.isArray(question.tags) ? question.tags.map((tag, idx) => (
          <View key={`${question.questionId}-${question.$id}-tag-${idx}`} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        )) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        <AdminSidebar isVisible={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setIsMenuOpen(true)}>
            <Icon name="menu" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Questions</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedDifficulty === 'all' && styles.filterButtonActive
              ]}
              onPress={() => setSelectedDifficulty('all')}
            >
              <Text style={[
                styles.filterButtonText,
                selectedDifficulty === 'all' && styles.filterButtonTextActive
              ]}>All</Text>
            </TouchableOpacity>
            {['easy', 'medium', 'hard'].map(difficulty => (
              <TouchableOpacity
                key={difficulty}
                style={[
                  styles.filterButton,
                  selectedDifficulty === difficulty && styles.filterButtonActive
                ]}
                onPress={() => setSelectedDifficulty(difficulty)}
              >
                <Text style={[
                  styles.filterButtonText,
                  selectedDifficulty === difficulty && styles.filterButtonTextActive
                ]}>
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView style={styles.content}>
          {filteredQuestions.map(renderQuestionItem)}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  filtersContainer: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#1976d2',
  },
  filterButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 10,
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  questionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginRight: 8,
  },
  questionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  questionImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  questionDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    color: '#1976d2',
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  imageContainer: {
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  uploadButton: {
    borderWidth: 1,
    borderColor: '#1976d2',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    color: '#1976d2',
    marginTop: 8,
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 8,
  },
  optionInput: {
    flex: 1,
    marginBottom: 0,
  },
  optionImageContainer: {
    width: 40,
    height: 40,
    marginLeft: 8,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  optionImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeOptionImageButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 2,
  },
  optionImageButton: {
    width: 40,
    height: 40,
    marginLeft: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1976d2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  difficultyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1976d2',
    alignItems: 'center',
  },
  difficultyButtonActive: {
    backgroundColor: '#1976d2',
  },
  difficultyButtonText: {
    color: '#1976d2',
  },
  difficultyButtonTextActive: {
    color: '#fff',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 16,
    paddingBottom: 32,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  saveButton: {
    backgroundColor: '#1976d2',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1976d2',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#1976d2',
  },
  typeButtonText: {
    color: '#1976d2',
    fontSize: 16,
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  questionNumberContainer: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  questionNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  questionNumberLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 12,
    marginTop: 4,
  },
  tagsScrollView: {
    maxHeight: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedTag: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  selectedTagText: {
    color: '#fff',
  },
});

export default ManageQuestions; 