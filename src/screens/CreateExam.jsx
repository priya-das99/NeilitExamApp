import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
  SafeAreaView,
  Image,
  Modal,
  ActivityIndicator,
  Button,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AdminSidebar from '../components/AdminSidebar';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary } from 'react-native-image-picker';
import { databases, appwriteConfig, ID, storage } from '../utils/appwriteConfig';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import mime from 'react-native-mime-types';
import RNFetchBlob from 'rn-fetch-blob';
import { Query } from 'appwrite';
import { Image as RNImage } from 'react-native';
import ImageResizer from 'react-native-image-resizer';
import QuestionSearch from '../components/QuestionSearch';
import Fuse from 'fuse.js';

// Place these after imports, before CreateExam component
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
  tags: ''
};

const defaultExamData = {
  title: '',
  description: '',
  duration: '',
  totalMarks: '',
  passingMarks: '',
  status: 'scheduled',
};

const CreateExam = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [examData, setExamData] = useState({
    title: '',
    description: '',
    duration: '',
    totalMarks: '',
    passingMarks: '',
    status: 'scheduled',
  });
  const [startDate, setStartDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [questions, setQuestions] = useState([
    { 
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
      tags: ''
    }
  ]);
  const navigation = useNavigation();
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [allQuestions, setAllQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showTagDropdowns, setShowTagDropdowns] = useState([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [bankSelectedTags, setBankSelectedTags] = useState([]);
  const [bankFilteredQuestions, setBankFilteredQuestions] = useState([]);
  const [questionSearches, setQuestionSearches] = useState([]);
  const [questionTagSelections, setQuestionTagSelections] = useState([]);
  const [questionSuggestions, setQuestionSuggestions] = useState([]);
  const [showSuggestionDropdown, setShowSuggestionDropdown] = useState([]);
  const [questionSearchCache, setQuestionSearchCache] = useState({});
  const [questionTagCache, setQuestionTagCache] = useState({});
  const [showTagModal, setShowTagModal] = useState(Array(questions.length).fill(false));
  const [showSuggestionBox, setShowSuggestionBox] = useState(Array(questions.length).fill(false));
  const [showAllTagsMode, setShowAllTagsMode] = useState(Array(questions.length).fill(false));
  const debounceTimers = useRef([]);

  useEffect(() => {
    // Fetch courses from Appwrite
    const fetchCourses = async () => {
      try {
        const res = await databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.coursesCollectionId);
        setCourses(res.documents);
      } catch (err) {
        Alert.alert('Error', 'Failed to load courses');
      }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    const fetchAllQuestions = async () => {
      try {
        const res = await databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.questionsCollectionId);
        const questions = res.documents.map(q => ({
          ...q,
          options: q.options ? JSON.parse(q.options) : [],
          correctAnswers: q.correctAnswers ? JSON.parse(q.correctAnswers).map(a => a.charCodeAt(0) - 97) : [],
          tags: Array.isArray(q.tags)
            ? q.tags
            : (q.tags
                ? q.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
                : [])
        }));
        console.log('Loaded questions from questions table:', questions);
        setAllQuestions(questions);
        setFilteredQuestions(questions);
        // Extract all unique tags
        const tagSet = new Set();
        questions.forEach(q => q.tags.forEach(tag => tag && tagSet.add(tag)));
        setAllTags(Array.from(tagSet));
      } catch (err) {
        Alert.alert('Error', 'Failed to load questions from question bank');
      }
    };
    fetchAllQuestions();
  }, []);

  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    setFilteredQuestions(
      allQuestions.filter(q => {
        const matchesSearch = !query || 
          q.questionText.toLowerCase().includes(query) ||
          (Array.isArray(q.tags) && q.tags.some(tag => tag.toLowerCase().includes(query)));
        const matchesTags = selectedTags.length === 0 || 
          (Array.isArray(q.tags) && selectedTags.every(tag => q.tags.includes(tag)));
        return matchesSearch && matchesTags;
      })
    );
  }, [searchQuery, selectedTags, allQuestions]);

  useEffect(() => {
    const query = bankSearch.trim().toLowerCase();
    setBankFilteredQuestions(
      allQuestions.filter(q => {
        const matchesSearch = !query || 
          q.questionText.toLowerCase().includes(query) ||
          (Array.isArray(q.tags) && q.tags.some(tag => tag.toLowerCase().includes(query)));
        const matchesTags = bankSelectedTags.length === 0 || 
          (Array.isArray(q.tags) && bankSelectedTags.every(tag => q.tags.includes(tag)));
        return matchesSearch && matchesTags;
      })
    );
  }, [bankSearch, bankSelectedTags, allQuestions]);

  useEffect(() => {
    setQuestionSearches(Array(questions.length).fill(''));
    setQuestionTagSelections(Array(questions.length).fill([]));
    setQuestionSuggestions(Array(questions.length).fill([]));
    setShowSuggestionDropdown(Array(questions.length).fill(false));
  }, [questions.length]);

  useEffect(() => {
    setShowTagDropdowns(Array(questions.length).fill(false));
  }, [questions.length]);

  useFocusEffect(
    React.useCallback(() => {
      setExamData(defaultExamData);
      setStartDate(new Date());
      setStartTime(new Date());
      setSelectedCourse('');
      setSubjectName('');
      setQuestions([defaultQuestion]);
      setSelectedStudents([]);
      setSearchQuery('');
      setSelectedTags([]);
      setFilteredQuestions(allQuestions);
    }, [allQuestions])
  );

  useEffect(() => {
    if (examData.duration && startDate && startTime) {
      const duration = parseInt(examData.duration);
      if (!isNaN(duration)) {
        const startDateTime = new Date(startDate);
        startDateTime.setHours(startTime.getHours());
        startDateTime.setMinutes(startTime.getMinutes());
        
        const endDateTime = new Date(startDateTime);
        endDateTime.setMinutes(endDateTime.getMinutes() + duration);
        
        // Check if end time is on the next day
        if (endDateTime.getDate() !== startDateTime.getDate()) {
          Alert.alert(
            'Invalid Duration',
            'The exam duration would extend to the next day. Please adjust the start time or duration.'
          );
          return;
        }
      }
    }
  }, [examData.duration, startDate, startTime]);

  const handleInputChange = (field, value) => {
    setExamData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleQuestionChange = (idx, field, value) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const handleOptionChange = (qIdx, optIdx, value) => {
    setQuestions(prev => prev.map((q, i) =>
      i === qIdx ? {
        ...q,
        options: q.options.map((o, oi) => oi === optIdx ? { ...o, text: value } : o)
      } : q
    ));
  };

  const handleQuestionTypeChange = (qIdx, type) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i === qIdx) {
        // If changing to MCQ, keep only the first correct answer if any
        const correctAnswers = type === 'mcq' && q.correctAnswers.length > 0 
          ? [q.correctAnswers[0]] 
          : [];
        return { ...q, type, correctAnswers };
      }
      return q;
    }));
  };

  const handleCorrectAnswerChange = (qIdx, optIdx) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i === qIdx) {
        if (q.type === 'mcq') {
          // For MCQ, only one correct answer is allowed
          return { ...q, correctAnswers: [optIdx] };
        } else {
          // For MSQ, multiple correct answers are allowed
          return { 
            ...q, 
            correctAnswers: q.correctAnswers.includes(optIdx) 
              ? q.correctAnswers.filter(a => a !== optIdx) 
              : [...q.correctAnswers, optIdx] 
          };
        }
      }
      return q;
    }));
  };

  const addQuestion = () => {
    setQuestions(prev => {
      const newQuestions = [...prev, {
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
        tags: ''
      }];
      // Update tag modal and suggestion box state arrays to match new length
      setShowTagModal(Array(newQuestions.length).fill(false));
      setShowSuggestionBox(Array(newQuestions.length).fill(false));
      setQuestionSearches(Array(newQuestions.length).fill(''));
      setQuestionTagSelections(Array(newQuestions.length).fill([]));
      setQuestionSuggestions(Array(newQuestions.length).fill([]));
      setShowSuggestionDropdown(Array(newQuestions.length).fill(false));
      return newQuestions;
    });
  };

  const removeQuestion = (idx) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const getCombinedDateTime = (date, time) => {
    const combined = new Date(date);
    combined.setHours(time.getHours());
    combined.setMinutes(time.getMinutes());
    combined.setSeconds(0);
    combined.setMilliseconds(0);
    return combined;
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

  const fetchStudents = async (courseId) => {
    try {
      setLoadingStudents(true);
      const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.studentsCollectionId,
        [
          Query.equal('courseId', courseId)
        ]
      );
      setStudents(res.documents);
    } catch (err) {
      console.error('Failed to fetch students:', err);
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleCourseSelect = (courseId) => {
    setSelectedCourse(courseId);
    if (courseId) {
      fetchStudents(courseId);
    }
  };

  const handleStudentSelect = (studentId, status) => {
    if (status !== 'active') {
      Alert.alert('Cannot Select', 'Only active students can be assigned exams');
      return;
    }

    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSubmit = async () => {
    if (!selectedCourse || !subjectName || !examData.title || !examData.duration || !examData.totalMarks || !examData.passingMarks) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (!startDate || !startTime) {
      Alert.alert('Error', 'Please select start date and time');
      return;
    }
    if (questions.some(q => !q.text || q.options.some(o => !o.text) || q.correctAnswers.length === 0)) {
      Alert.alert('Error', 'Please complete all questions including options and correct answers');
      return;
    }
    if (selectedStudents.length === 0) {
      // Student assignment is now optional; do nothing here
    }

    try {
      const startDateTime = new Date(startDate);
      startDateTime.setHours(startTime.getHours());
      startDateTime.setMinutes(startTime.getMinutes());
      
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + parseInt(examData.duration));
      
      // Check if end time is on the next day
      if (endDateTime.getDate() !== startDateTime.getDate()) {
        Alert.alert('Error', 'The exam duration would extend to the next day. Please adjust the start time or duration.');
        return;
      }

      // 1. Create subject
      const newSubjectId = ID.unique();
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.subjectsCollectionId,
        newSubjectId, // Appwrite document ID
        {
          subjectId: newSubjectId, // Unique subject ID field
          subjectName: subjectName.trim(), // The name entered by the user
          courseId: selectedCourse
        }
      );

      // 2. Create exam and get the new exam's $id
      const generatedExamId = ID.unique();
      const examRes = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.examsCollectionId,
        generatedExamId, // Use generated ID
        {
          examId: generatedExamId, // Add examId field for schema
          ...examData,
          courseId: selectedCourse,
          subjectId: newSubjectId,
          duration: parseInt(examData.duration),
          totalMarks: parseInt(examData.totalMarks),
          passingMarks: parseInt(examData.passingMarks),
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
        }
      );
      const examId = generatedExamId;

      // Create questions and exam_questions mapping
      for (const [idx, q] of questions.entries()) {
        let questionId = q.questionId;
        // Deduplication: Check if a question with the same text exists in allQuestions
        if (!questionId) {
          const existing = allQuestions.find(qq =>
            (qq.questionText || qq.text || '').trim().toLowerCase() === (q.text || '').trim().toLowerCase()
          );
          if (existing && existing.questionId) {
            questionId = existing.questionId;
          } else {
            // New question: create in questions collection
            questionId = `Q${idx + 1}_${Date.now()}_${Math.floor(Math.random()*10000)}`;
            await databases.createDocument(
              appwriteConfig.databaseId,
              appwriteConfig.questionsCollectionId,
              ID.unique(),
              {
                examId: examId,
                questionId: questionId,
                subjectId: newSubjectId,
                courseId: selectedCourse,
                type: q.type,
                questionText: q.text,
                options: JSON.stringify(q.options.map((opt, i) => ({
                  optionId: String.fromCharCode(97 + i),
                  text: opt.text
                }))),
                correctAnswers: JSON.stringify(q.correctAnswers.map(i => String.fromCharCode(97 + i))),
                marks: Number(q.marks) || 1,
                difficulty: q.difficulty || 'easy',
                tags: q.tags && typeof q.tags === 'string' ? q.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
              }
            );
          }
        }
        // Always create mapping in exam_questions
        await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.examQuestionsCollectionId,
          ID.unique(),
          {
            examId: examId,
            questionId: questionId,
            order: idx + 1,
            createdAt: new Date().toISOString()
          }
        );
      }

      // Assign exam to selected students
      if (selectedStudents.length > 0) {
        for (const studentId of selectedStudents) {
          const assignmentId = ID.unique();
          await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.examAssignmentsCollectionId,
            assignmentId, // Use generated assignmentId as document ID
            {
              assignmentId, // Add assignmentId field for schema
              examId: examId,
              studentId,
              courseId: selectedCourse,
              status: 'pending',
              // Add other fields as needed
            }
          );
        }
      }

      Alert.alert('Success', 'Exam created and assigned successfully', [
        { text: 'OK', onPress: () => navigation.navigate('ManageExams') }
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create exam');
    }
  };

  const handleAddBankQuestion = (q) => {
    // Deep copy to avoid reference issues
    const newQ = JSON.parse(JSON.stringify(q));
    setQuestions(prev => [...prev, newQ]);
    setShowBankModal(false);
  };

  const updateSuggestions = (qIdx, search, tags) => {
    const query = (search || '').trim().toLowerCase();
    const selectedTags = Array.isArray(tags) ? tags : [];
    
    // Get current question texts to avoid suggesting duplicates
    const currentQuestionTexts = questions.map(q => (q.text || '').trim().toLowerCase());
    
    let filtered = allQuestions.filter(q => {
      if (currentQuestionTexts.includes((q.questionText || '').trim().toLowerCase())) {
        return false;
      }
      const qTags = Array.isArray(q.tags) ? q.tags : (q.tags ? q.tags.split(',').map(t => t.trim()) : []);
      // OR logic: show if any selected tag is present
      if (selectedTags.length > 0) {
        const hasAnyTag = selectedTags.some(tag => qTags.includes(tag));
        if (!hasAnyTag) return false;
      }
      if (query) {
        const matchesSearch = q.questionText.toLowerCase().includes(query) ||
                            qTags.some(tag => tag.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      return true;
    });

    // Sort by relevance
    filtered.sort((a, b) => {
      const aTags = Array.isArray(a.tags) ? a.tags : (a.tags ? a.tags.split(',').map(t => t.trim()) : []);
      const bTags = Array.isArray(b.tags) ? b.tags : (b.tags ? b.tags.split(',').map(t => t.trim()) : []);
      if (selectedTags.length > 0) {
        const aMatchingTags = aTags.filter(tag => selectedTags.includes(tag)).length;
        const bMatchingTags = bTags.filter(tag => selectedTags.includes(tag)).length;
        if (aMatchingTags !== bMatchingTags) {
          return bMatchingTags - aMatchingTags;
        }
      }
      if (query) {
        const aMatchesText = a.questionText.toLowerCase().includes(query);
        const bMatchesText = b.questionText.toLowerCase().includes(query);
        if (aMatchesText !== bMatchesText) {
          return bMatchesText - aMatchesText;
        }
      }
      return 0;
    });

    filtered = filtered.slice(0, 5);
    setQuestionSuggestions(prev => prev.map((arr, i) => i === qIdx ? filtered : arr));
    setShowSuggestionDropdown(prev => prev.map((val, i) => i === qIdx ? filtered.length > 0 : val));
  };

  const handleQuestionSearchChange = (qIdx, text) => {
    setQuestionSearches(prev => prev.map((s, i) => i === qIdx ? text : s));
    updateSuggestions(qIdx, text, questionTagSelections[qIdx] || []);
  };

  const handleQuestionTagSelect = (qIdx, tag) => {
    // Update the selected tags for this question
    const currentTags = questionTagSelections[qIdx] || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    
    setQuestionTagSelections(prev => prev.map((arr, i) => i === qIdx ? newTags : arr));
    
    // Update suggestions based on new tags
    const searchText = questionSearches[qIdx] || '';
    updateSuggestions(qIdx, searchText, newTags);
    
    // Show suggestion box when tags are selected
    if (newTags.length > 0) {
      setShowSuggestionBox(prev => prev.map((v, i) => i === qIdx ? true : v));
    }
  };

  const handleSuggestionSelect = (qIdx, suggestion) => {
    setQuestions(prev => prev.map((q, i) => i === qIdx ? {
      ...q,
      text: suggestion.questionText || '',
      type: suggestion.type || q.type,
      marks: suggestion.marks || q.marks,
      difficulty: suggestion.difficulty || q.difficulty,
      tags: Array.isArray(suggestion.tags) ? suggestion.tags.join(', ') : (suggestion.tags || q.tags),
      options: suggestion.options || q.options,
      correctAnswers: suggestion.correctAnswers || q.correctAnswers,
    } : q));
    setShowSuggestionDropdown(prev => prev.map((val, i) => i === qIdx ? false : val));
  };

  const toggleTagDropdown = (qIdx) => {
    setShowTagDropdowns(prev => prev.map((v, i) => i === qIdx ? !v : false));
  };

  const handleTagBoxSelect = (qIdx, tag) => {
    // Update the question's tags
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const currentTags = Array.isArray(q.tags) ? q.tags : (q.tags ? q.tags.split(',').map(t => t.trim()) : []);
      const newTags = currentTags.includes(tag) 
        ? currentTags.filter(t => t !== tag) 
        : [...currentTags, tag];
      return { ...q, tags: newTags };
    }));

    // Update tag selection for suggestions
    const currentTags = questionTagSelections[qIdx] || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    
    setQuestionTagSelections(prev => prev.map((arr, i) => i === qIdx ? newTags : arr));
    
    // Update suggestions
    updateSuggestions(qIdx, questionSearches[qIdx] || '', newTags);
    
    // Close tag dropdown
    setShowTagDropdowns(prev => prev.map((v, i) => i === qIdx ? false : v));
  };

  const handleTagBoxRemove = (qIdx, tag) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const tags = Array.isArray(q.tags) ? q.tags : (q.tags ? [q.tags] : []);
      return {
        ...q,
        tags: tags.filter(t => t !== tag)
      };
    }));
  };

  // Debounced trigger for suggestions
  const triggerSuggestionBox = (qIdx) => {
    clearTimeout(debounceTimers.current[qIdx]);
    debounceTimers.current[qIdx] = setTimeout(() => {
      if ((questionTagSelections[qIdx] && questionTagSelections[qIdx].length > 0) || (questionSearches[qIdx] && questionSearches[qIdx].trim().length > 0)) {
        setShowSuggestionBox(prev => prev.map((v, i) => i === qIdx ? true : v));
      }
    }, 1000);
  };

  // Update trigger in tag and search handlers
  const handleQuestionTagSelectDebounced = (qIdx, tag) => {
    handleQuestionTagSelect(qIdx, tag);
    triggerSuggestionBox(qIdx);
  };
  const handleQuestionSearchChangeDebounced = (qIdx, text) => {
    handleQuestionSearchChange(qIdx, text);
    triggerSuggestionBox(qIdx);
  };

  // Collapse suggestion box on outside click, question select, or tags cleared
  const collapseSuggestionBox = (qIdx) => {
    setShowSuggestionBox(prev => prev.map((v, i) => i === qIdx ? false : v));
  };

  const handleImagePick = async (qIdx) => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert('Error', 'Failed to pick image');
        return;
      }

      const image = result.assets[0];
      const resolution = await checkImageResolution(image.uri);
      
      if (!resolution.valid) {
        Alert.alert('Error', `Image resolution must be at least ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT}px`);
        return;
      }

      setQuestions(prev => prev.map((q, i) => 
        i === qIdx ? { ...q, image } : q
      ));
    } catch (err) {
      console.error('Image pick error:', err);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleOptionImagePick = async (qIdx, optIdx) => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert('Error', 'Failed to pick image');
        return;
      }

      const image = result.assets[0];
      const resolution = await checkImageResolution(image.uri);
      
      if (!resolution.valid) {
        Alert.alert('Error', `Image resolution must be at least ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT}px`);
        return;
      }

      setQuestions(prev => prev.map((q, i) => 
        i === qIdx ? {
          ...q,
          options: q.options.map((opt, oi) => 
            oi === optIdx ? { ...opt, image } : opt
          )
        } : q
      ));
    } catch (err) {
      console.error('Image pick error:', err);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleRemoveImage = (qIdx) => {
    setQuestions(prev => prev.map((q, i) => 
      i === qIdx ? { ...q, image: null } : q
    ));
  };

  const handleOptionRemoveImage = (qIdx, optIdx) => {
    setQuestions(prev => prev.map((q, i) => 
      i === qIdx ? {
        ...q,
        options: q.options.map((opt, oi) => 
          oi === optIdx ? { ...opt, image: null } : opt
        )
      } : q
    ));
  };

  const checkImageResolution = async (uri) => {
    return new Promise((resolve) => {
      Image.getSize(uri, (width, height) => {
        resolve({
          valid: width >= MIN_IMAGE_WIDTH && height >= MIN_IMAGE_HEIGHT,
          width,
          height
        });
      }, () => resolve({ valid: false }));
    });
  };

  const renderStudentSelection = () => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>Select Students *</Text>
      {loadingStudents ? (
        <ActivityIndicator size="small" color="#00e4d0" />
      ) : students.length === 0 ? (
        <Text style={styles.noStudentsText}>No students found for this course</Text>
      ) : (
        <View style={styles.studentList}>
          {students.map(student => (
            <TouchableOpacity
              key={student.$id}
              style={[
                styles.studentCard,
                selectedStudents.includes(student.$id) && styles.selectedCard,
                student.status !== 'active' && styles.inactiveCard
              ]}
              onPress={() => handleStudentSelect(student.$id, student.status)}
            >
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentEmail}>{student.email}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: student.status === 'active' ? '#4CAF50' : student.status === 'pending' ? '#FFC107' : '#F44336' }
                ]}>
                  <Text style={styles.statusText}>{student.status}</Text>
                </View>
              </View>
              <Icon
                name={selectedStudents.includes(student.$id) ? 'check-box' : 'check-box-outline-blank'}
                size={24}
                color={selectedStudents.includes(student.$id) ? '#00e4d0' : '#666'}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
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
          <Text style={styles.headerTitle}>Create New Exam</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Course *</Text>
              <View style={{ borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8 }}>
                <Picker
                  selectedValue={selectedCourse}
                  onValueChange={handleCourseSelect}
                  style={{ height: 50 }}
                >
                  <Picker.Item label="Select Course" value="" />
                  {courses.map(course => (
                    <Picker.Item key={course.$id} label={course.name} value={course.$id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Subject Name *</Text>
              <TextInput
                style={styles.input}
                value={subjectName}
                onChangeText={setSubjectName}
                placeholder="Enter subject name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Exam Title *</Text>
              <TextInput
                style={styles.input}
                value={examData.title}
                onChangeText={(text) => handleInputChange('title', text)}
                placeholder="Enter exam title"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={examData.description}
                onChangeText={(text) => handleInputChange('description', text)}
                placeholder="Enter exam description"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Start Date *</Text>
              <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.input}>
                <Text>{startDate.toLocaleDateString()}</Text>
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="default"
                  onChange={(e, date) => { setShowStartDatePicker(false); if (date) setStartDate(date); }}
                />
              )}
              <Text style={styles.label}>Start Time *</Text>
              <TouchableOpacity onPress={() => setShowStartTimePicker(true)} style={styles.input}>
                <Text>{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </TouchableOpacity>
              {showStartTimePicker && (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  display="default"
                  onChange={(e, time) => { setShowStartTimePicker(false); if (time) setStartTime(time); }}
                />
              )}
              <Text style={styles.label}>Duration (minutes) *</Text>
              <TextInput
                style={styles.input}
                value={examData.duration}
                onChangeText={(text) => handleInputChange('duration', text)}
                placeholder="Enter exam duration"
                keyboardType="numeric"
              />
              {examData.duration && startDate && startTime && (
                <View style={[styles.input, { backgroundColor: '#f5f5f5', marginTop: 8 }]}>
                  <Text style={{ color: '#666' }}>
                    Exam will end at: {(() => {
                      const duration = parseInt(examData.duration);
                      if (!isNaN(duration)) {
                        const startDateTime = new Date(startDate);
                        startDateTime.setHours(startTime.getHours());
                        startDateTime.setMinutes(startTime.getMinutes());
                        const endDateTime = new Date(startDateTime);
                        endDateTime.setMinutes(endDateTime.getMinutes() + duration);
                        return endDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      }
                      return '';
                    })()}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Total Marks *</Text>
              <TextInput
                style={styles.input}
                value={examData.totalMarks}
                onChangeText={(text) => handleInputChange('totalMarks', text)}
                placeholder="Enter total marks"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Passing Marks *</Text>
              <TextInput
                style={styles.input}
                value={examData.passingMarks}
                onChangeText={(text) => handleInputChange('passingMarks', text)}
                placeholder="Enter passing marks"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Questions *</Text>
              {questions.map((q, qIdx) => {
                // Filter tags by selected difficulty for this question
                const filteredTags = allQuestions
                  .filter(qq => qq.difficulty === q.difficulty)
                  .flatMap(qq => Array.isArray(qq.tags) ? qq.tags : (qq.tags ? qq.tags.split(',').map(t => t.trim()) : []));
                const uniqueFilteredTags = Array.from(new Set(filteredTags));
                const showAllTags = questionTagSelections[qIdx]?.includes('__ALL__');
                const tagsToShow = showAllTags ? allTags : uniqueFilteredTags;
                return (
                  <View key={qIdx} style={{ marginBottom: 20, borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10 }}>
                    {/* Question Number */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontWeight: 'bold', color: '#333', marginRight: 8 }}>{`Question ${qIdx + 1}`}</Text>
                    </View>

                    {/* 1. Type Selection */}
                    <View style={{ marginBottom: 8 }}>
                      <Text style={styles.label}>Type</Text>
                      <View style={{ borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff', marginTop: 4 }}>
                        <Picker
                          selectedValue={q.type}
                          onValueChange={type => handleQuestionTypeChange(qIdx, type)}
                          style={{ height: 51, width: '100%', fontSize: 18, paddingVertical: 10 }}
                          itemStyle={{ fontSize: 18, height: 48 }}
                          dropdownIconColor="#1976d2"
                        >
                          <Picker.Item label="MCQ" value="mcq" />
                          <Picker.Item label="MSQ" value="msq" />
                        </Picker>
                      </View>
                    </View>

                    {/* Difficulty Filter */}
                    <View style={{ marginBottom: 8 }}>
                      <Text style={styles.label}>Difficulty</Text>
                      <View style={{ borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff', marginTop: 4 }}>
                        <Picker
                          selectedValue={q.difficulty}
                          onValueChange={value => handleQuestionChange(qIdx, 'difficulty', value)}
                          style={{ height: 51, width: '100%', fontSize: 18, paddingVertical: 10 }}
                          itemStyle={{ fontSize: 18, height: 48 }}
                          dropdownIconColor="#1976d2"
                        >
                          <Picker.Item label="Easy" value="easy" />
                          <Picker.Item label="Medium" value="medium" />
                          <Picker.Item label="Hard" value="hard" />
                        </Picker>
                      </View>
                    </View>

                    {/* 2. Search Box */}
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', paddingHorizontal: 12, height: 40, marginBottom: 8, position: 'relative' }}>
                      <Icon name="search" size={18} color="#666" style={{ marginRight: 6 }} />
                      <TextInput
                        style={{ flex: 1, fontSize: 16, color: '#333', height: 40, borderWidth: 0, backgroundColor: 'transparent', paddingVertical: 0, paddingTop: 0, paddingBottom: 0 }}
                        placeholder="Search questions or keywords"
                        placeholderTextColor="#888"
                        value={questionSearches[qIdx] || ''}
                        onChangeText={(text) => handleQuestionSearchChangeDebounced(qIdx, text)}
                        underlineColorAndroid="transparent"
                      />
                    </View>

                    {/* 3. Filter by Tags */}
                    <TouchableOpacity
                      style={{ marginTop: 6, alignSelf: 'flex-start', backgroundColor: '#e3f2fd', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' }}
                      onPress={() => setShowTagModal(prev => prev.map((v, i) => i === qIdx ? true : v))}
                    >
                      <Icon name="add" size={18} color="#1976d2" style={{ marginRight: 4 }} />
                      <Text style={{ color: '#1976d2', fontWeight: 'bold' }}>Select Tags</Text>
                    </TouchableOpacity>

                    {/* Selected Tags Display */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginBottom: 4 }}>
                      {(questionTagSelections[qIdx] || []).map((tag, tIdx) => (
                        <View key={tIdx} style={{ backgroundColor: '#1976d2', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, marginBottom: 6, flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 13 }}>{tag}</Text>
                          <TouchableOpacity onPress={() => { handleQuestionTagSelectDebounced(qIdx, tag); if ((questionTagSelections[qIdx] || []).length <= 1) collapseSuggestionBox(qIdx); }} style={{ marginLeft: 4 }}>
                            <Icon name="close" size={15} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>

                    {/* Suggestion Box */}
                    {showSuggestionBox[qIdx] && ((questionTagSelections[qIdx] && questionTagSelections[qIdx].length > 0) || (questionSearches[qIdx] && questionSearches[qIdx].trim().length > 0)) && (
                      <TouchableWithoutFeedback onPress={() => collapseSuggestionBox(qIdx)}>
                        <View style={{ position: 'relative', width: '100%', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#1976d2', marginTop: 2, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, zIndex: 1000 }}>
                          <View style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
                            <Text style={{ fontSize: 13, color: '#666' }}>{`${questionSuggestions[qIdx]?.length || 0} matches for [${(questionTagSelections[qIdx] || []).join(', ')}]`}</Text>
                          </View>
                          <ScrollView style={{ maxHeight: 150 }}>
                            {(questionSuggestions[qIdx] || []).slice(0, 5).map((sugg, sIdx) => (
                              <View key={sugg.$id || sIdx} style={{ borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 }}>
                                <Text numberOfLines={1} style={{ flex: 1, color: '#1976d2', fontWeight: 'bold', fontSize: 15, marginRight: 8 }}>{sugg.questionText}</Text>
                                <TouchableOpacity onPress={() => { handleSuggestionSelect(qIdx, sugg); collapseSuggestionBox(qIdx); }} style={{ backgroundColor: '#00e4d0', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
                                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Select</Text>
                                </TouchableOpacity>
                              </View>
                            ))}
                          </ScrollView>
                        </View>
                      </TouchableWithoutFeedback>
                    )}

                    {/* Tag Modal */}
                    <Modal
                      visible={showTagModal[qIdx]}
                      transparent
                      animationType="fade"
                      onRequestClose={() => setShowTagModal(prev => prev.map((v, i) => i === qIdx ? false : v))}
                    >
                      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }} activeOpacity={1} onPress={() => setShowTagModal(prev => prev.map((v, i) => i === qIdx ? false : v))}>
                        <View style={{ position: 'absolute', top: 120, left: 30, right: 30, backgroundColor: '#fff', borderRadius: 12, padding: 18, elevation: 5 }}>
                          <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 10 }}>Select Tags</Text>
                          <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
                            onPress={() => {
                              setShowAllTagsMode(prev => prev.map((v, i) => i === qIdx ? !v : v));
                            }}
                          >
                            <Text style={{ color: '#1976d2', fontWeight: 'bold' }}>All Tags</Text>
                          </TouchableOpacity>
                          <ScrollView style={{ maxHeight: 180 }}>
                            {(showAllTagsMode[qIdx] ? allTags : tagsToShow).map(tag => (
                              <TouchableOpacity
                                key={tag}
                                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
                                onPress={() => handleQuestionTagSelect(qIdx, tag)}
                              >
                                <Icon name={(questionTagSelections[qIdx] || []).includes(tag) ? 'check-box' : 'check-box-outline-blank'} size={18} color={(questionTagSelections[qIdx] || []).includes(tag) ? '#1976d2' : '#aaa'} style={{ marginRight: 8 }} />
                                <Text style={{ color: '#333', fontSize: 15 }}>{tag}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                          <TouchableOpacity style={{ alignSelf: 'flex-end', marginTop: 10 }} onPress={() => setShowTagModal(prev => prev.map((v, i) => i === qIdx ? false : v))}>
                            <Text style={{ color: '#1976d2', fontWeight: 'bold' }}>Done</Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    </Modal>

                    {/* 4. Question Text with Image Upload */}
                    <View style={{ marginBottom: 16 }}>
                      <Text style={styles.label}>Question Text *</Text>
                      <TextInput
                        style={[styles.input, { marginBottom: 8 }]}
                        value={q.text}
                        onChangeText={text => handleQuestionChange(qIdx, 'text', text)}
                        placeholder="Enter question text"
                        multiline
                      />
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <TouchableOpacity onPress={() => handleImagePick(qIdx)} style={{ marginRight: 10, flexDirection: 'row', alignItems: 'center' }}>
                          <Icon name="image" size={20} color="#1976d2" />
                          <Text style={{ color: '#1976d2', marginLeft: 5 }}>Upload an Image</Text>
                        </TouchableOpacity>
                        {q.image && (
                          <TouchableOpacity onPress={() => handleRemoveImage(qIdx)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Icon name="close" size={20} color="#f44336" />
                            <Text style={{ color: '#f44336', marginLeft: 5 }}>Remove Image</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {q.image && (
                        <View style={{ width: '100%', maxWidth: 320, height: 180, alignSelf: 'center', marginBottom: 10, borderRadius: 12, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
                          <Image source={{ uri: q.image.uri }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                        </View>
                      )}
                    </View>

                    {/* 5. Options with Image Upload */}
                    <View style={{ marginBottom: 16 }}>
                      <Text style={styles.label}>Options *</Text>
                      {q.options.map((option, optIdx) => (
                        <View key={optIdx} style={styles.optionContainer}>
                          <TouchableOpacity
                            onPress={() => handleCorrectAnswerChange(qIdx, optIdx)}
                            style={styles.checkbox}
                          >
                            <Icon
                              name={q.correctAnswers.includes(optIdx) ? 'check-box' : 'check-box-outline-blank'}
                              size={24}
                              color={q.correctAnswers.includes(optIdx) ? '#1976d2' : '#aaa'}
                            />
                          </TouchableOpacity>
                          <TextInput
                            style={[styles.input, styles.optionInput]}
                            value={option.text}
                            onChangeText={text => handleOptionChange(qIdx, optIdx, text)}
                            placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                          />
                          <TouchableOpacity onPress={() => handleOptionImagePick(qIdx, optIdx)} style={{ marginLeft: 8 }}>
                            <Icon name="image" size={20} color="#1976d2" />
                          </TouchableOpacity>
                          {option.image && (
                            <TouchableOpacity onPress={() => handleOptionRemoveImage(qIdx, optIdx)} style={{ marginLeft: 8 }}>
                              <Icon name="close" size={20} color="#f44336" />
                            </TouchableOpacity>
                          )}
                          {option.image && (
                            <Image source={{ uri: option.image.uri || option.image }} style={{ width: 40, height: 40, marginLeft: 8, borderRadius: 6 }} />
                          )}
                        </View>
                      ))}
                    </View>

                    {/* Show correct answer(s) below options */}
                    <View style={{ marginBottom: 8 }}>
                      {q.type === 'mcq' && q.correctAnswers.length > 0 && (
                        <Text style={{ color: '#1976d2', fontWeight: 'bold' }}>
                          Correct Answer: Option {String.fromCharCode(65 + q.correctAnswers[0])}
                        </Text>
                      )}
                      {q.type === 'msq' && q.correctAnswers.length > 0 && (
                        <Text style={{ color: '#1976d2', fontWeight: 'bold' }}>
                          Correct Answers: {q.correctAnswers.map(idx => `Option ${String.fromCharCode(65 + idx)}`).join(', ')}
                        </Text>
                      )}
                    </View>

                    {/* 6. Tags (comma separated) */}
                    <View style={{ marginBottom: 8 }}>
                      <Text style={styles.label}>Tags (optional, comma separated)</Text>
                      <TextInput
                        style={[styles.input, { height: 40 }]}
                        value={q.tags || ''}
                        onChangeText={(text) => handleQuestionChange(qIdx, 'tags', text)}
                        placeholder="e.g. stack, complexity, DS"
                      />
                    </View>

                    {/* 7. Marks */}
                    <View style={{ marginBottom: 8 }}>
                      <Text style={styles.label}>Marks *</Text>
                      <TextInput
                        style={[styles.input, { width: 100 }]}
                        value={q.marks ? String(q.marks) : ''}
                        onChangeText={text => handleQuestionChange(qIdx, 'marks', text.replace(/[^0-9]/g, ''))}
                        placeholder="1"
                        keyboardType="numeric"
                      />
                    </View>

                    {/* Question Actions */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                      <TouchableOpacity onPress={() => removeQuestion(qIdx)} style={{ backgroundColor: '#f44336', padding: 8, borderRadius: 6 }}>
                        <Text style={{ color: '#fff' }}>Remove</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={addQuestion} style={{ backgroundColor: '#1976d2', padding: 8, borderRadius: 6 }}>
                        <Text style={{ color: '#fff' }}>Add Question</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>

            {questions.length === 0 && (
              <View style={{ alignItems: 'center', marginVertical: 20 }}>
                <TouchableOpacity onPress={addQuestion} style={{ backgroundColor: '#1976d2', padding: 12, borderRadius: 8 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Add Question</Text>
                </TouchableOpacity>
              </View>
            )}

            {selectedCourse && renderStudentSelection()}

            <View style={{ paddingBottom: 30, paddingHorizontal: 10, backgroundColor: '#fff' }}>
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>Create Exam</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  formContainer: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#00e4d0',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  studentList: {
    marginTop: 10,
  },
  studentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedCard: {
    borderColor: '#00e4d0',
    backgroundColor: '#f0f9f8',
  },
  inactiveCard: {
    opacity: 0.7,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  noStudentsText: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  checkbox: {
    padding: 4,
  },
  optionInput: {
    flex: 1,
  },
});

export default CreateExam; 