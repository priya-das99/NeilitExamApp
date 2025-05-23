import { client, account, databases, ID, Permission, Role, appwriteConfig } from './appwriteConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { databaseId, studentsCollectionId } = appwriteConfig;

// Session management service
const SessionService = {
  storeSession: async (user) => {
    try {
      await AsyncStorage.multiSet([
        ['user_data', JSON.stringify(user)],
        ['session_active', 'true'],
        ['user_role', user.preferences?.role || ''],
        ['last_activity', new Date().toISOString()]
      ]);
    } catch (error) {
      console.error('Session storage error:', error);
      throw new Error('Failed to store session data');
    }
  },

  clearSession: async () => {
    try {
      await AsyncStorage.multiRemove([
        'user_data',
        'session_active',
        'user_role',
        'last_activity'
      ]);
    } catch (error) {
      console.error('Session clearance error:', error);
      throw new Error('Failed to clear session data');
    }
  },

  getStoredUser: async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Session retrieval error:', error);
      return null;
    }
  },

  validateActiveSession: async () => {
    try {
      const sessionActive = await AsyncStorage.getItem('session_active');
      return sessionActive === 'true';
    } catch (error) {
      await SessionService.clearSession();
      return false;
    }
  }
};

export const AuthService = {
  // User registration with pending status
  async registerUser(email, password, name, selectedCourse) {
    try {
      if (!email || !password || !name || !selectedCourse) {
        throw new Error('All fields are required');
      }

      const userId = ID.unique();

      // Create user account in Appwrite
      await account.create(userId, email, password, name);

      // Create a document in the database with valid permissions
      await databases.createDocument(
        databaseId,
        studentsCollectionId,
        userId,
        {
          name,
          email,
          studentId: userId,
          status: 'pending', // Default status
          courseId: selectedCourse.$id,
          
          createdAt: new Date().toISOString() // Include `created_at`
        },
        [
          Permission.read(Role.any()), // Public read access
          Permission.update(Role.guests()), // Guest can update (adjust as needed)
          Permission.delete(Role.guests()) // Guest can delete (adjust as needed)
        ]
      );

      return {
        id: userId,
        email,
        name,
        status: 'pending',
        course: {
          id: selectedCourse.$id,
          name: selectedCourse.name
        }
      };
    } catch (error) {
      console.error('Registration Error:', error);
      throw this.handleAuthError(error);
    }
  },

  async loginUser(email, password) {
    try {
      await this.performCleanLogout();

      const session = await account.createEmailPasswordSession(email, password);
      const currentUser = await account.get();

      let preferences = {};
      try {
        preferences = await account.getPrefs();
      } catch (prefsError) {
        console.warn('Could not retrieve preferences:', prefsError.message);
        const userDoc = await databases.getDocument(
          databaseId,
          studentsCollectionId,
          currentUser.$id
        );
        if (userDoc?.role) {
          preferences = { role: userDoc.role };
          await account.updatePrefs({ role: userDoc.role });
        }
      }

      this.validateUserRole(preferences?.role);

      const completeUser = {
        ...currentUser,
        preferences,
        sessionValidated: true
      };

      await SessionService.storeSession(completeUser);
      return completeUser;
    } catch (error) {
      console.error('Login Error:', error);
      await this.performCleanLogout();
      throw this.handleAuthError(error);
    }
  },

  async getAuthenticatedUser() {
    try {
      const hasValidSession = await SessionService.validateActiveSession();
      if (!hasValidSession) return null;

      const storedUser = await SessionService.getStoredUser();
      if (storedUser) return storedUser;

      const currentUser = await account.get();

      let preferences = {};
      try {
        preferences = await account.getPrefs();
      } catch (prefsError) {
        console.warn('Could not retrieve preferences:', prefsError.message);
        const userDoc = await databases.getDocument(
          databaseId,
          studentsCollectionId,
          currentUser.$id
        );
        if (userDoc?.role) {
          preferences = { role: userDoc.role };
        }
      }

      const freshUserData = {
        ...currentUser,
        preferences
      };

      await SessionService.storeSession(freshUserData);
      return freshUserData;
    } catch (error) {
      console.error('Auth Check Error:', error);
      return null;
    }
  },

  async performCleanLogout() {
    try {
      await account.deleteSession('current');
    } catch (sessionError) {
      console.warn('Session deletion failed:', sessionError.message);
    } finally {
      await SessionService.clearSession();
    }
  },

  validateUserRole(role) {
    const validRoles = ['admin', 'student'];
    if (!role || !validRoles.includes(role)) {
      throw new Error('Invalid or missing user role');
    }
  },

  handleAuthError(error) {
    console.error('Authentication Error:', error);

    const errorMapping = {
      401: 'Invalid credentials',
      404: 'User not found',
      429: 'Too many requests. Please try again later.',
      500: 'Internal server error',
      default: 'An unknown error occurred. Please try again.'
    };

    const errorMessage =
      errorMapping[error.code] || errorMapping.default;
    return new Error(errorMessage);
  }
};
