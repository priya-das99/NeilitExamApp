import { StyleSheet, Text, View, SafeAreaView } from 'react-native'
import React from 'react'
import MainLayout from '../components/MainLayout'

const Result = () => {
  return (
    <MainLayout>
      <SafeAreaView style={styles.container}>
        <Text>Result</Text>
      </SafeAreaView>
    </MainLayout>
  )
}

export default Result

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
})