// QuestionCard.js implementation
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import MathJax from 'react-native-mathjax';

export const QuestionCard = ({ question, currentIndex, totalQuestions }) => {
  return (
    <View style={styles.card}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionNumber}>
          Question {currentIndex + 1} of {totalQuestions}
        </Text>
        <View style={styles.questionType}>
          <Text style={styles.questionTypeText}>
            {question.type === 'mcq' ? 'Single Select' : 'Multi Select'}
          </Text>
        </View>
      </View>

      <View style={styles.questionContent}>
        {question.isMath && question.question ? (
          <MathJax
            html={`<div>${question.question}</div>`}
            mathJaxOptions={{
              messageStyle: 'none',
              extensions: ['tex2jax.js'],
              jax: ['input/TeX', 'output/HTML-CSS'],
              tex2jax: {
                inlineMath: [
                  ['$', '$'],
                  ['\\(', '\\)'],
                ],
                displayMath: [
                  ['$$', '$$'],
                  ['\\[', '\\]'],
                ],
                processEscapes: true,
              },
              TeX: {
                extensions: [
                  'AMSmath.js',
                  'AMSsymbols.js',
                  'noErrors.js',
                  'noUndefined.js',
                ],
              },
            }}
          />
        ) : (
          <Text style={styles.questionText}>{question.question || question.questionText}</Text>
        )}

        {question.hasImage && question.imageUrl && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: question.imageUrl }} style={styles.questionImage} />
          </View>
        )}
      </View>

      {question.type === 'msq' && (
        <Text style={styles.instructionText}>
          Select all that apply
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  questionNumber: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: 'bold',
    fontFamily: 'Roboto-Medium',
  },
  questionType: {
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  questionTypeText: {
    fontSize: 12,
    color: '#1E3A8A',
    fontFamily: 'Roboto-Medium',
  },
  questionContent: {
    marginBottom: 16,
  },
  questionText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
    fontFamily: 'Roboto-Regular',
  },
  imageContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  questionImage: {
    width: '100%',
    height: 180,
    resizeMode: 'contain',
    borderRadius: 4,
  },
  instructionText: {
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
    marginBottom: 8,
    fontFamily: 'Roboto-Italic',
  },
});