import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthService } from './authService';
import { client, account, databases, appwriteConfig } from './appwriteConfig';

// Create and export the context explicitly
export const AppwriteContext = createContext({
  isLoggedIn: false,
  user: null,
  isLoading: true,
  error: null,
  isAdmin: false,
  isStudent: false,
  handleLogin: async () => {},
  handleLogout: async () => {},
  getCurrentRole: async () => null,
  verifyRole: async () => false,
});

export const AppwriteProvider = ({ children }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const userData = await account.get();
            if (userData) {
                const preferences = await account.getPrefs();
                setUser({ ...userData, preferences });
                setIsLoggedIn(true);
            }
        } catch (error) {
            console.log('No user found:', error);
            setUser(null);
            setIsLoggedIn(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async (email, password) => {
        try {
            setIsLoading(true);
            setError(null);
            
            const userData = await AuthService.loginUser(email, password);
            const preferences = await account.getPrefs();
            
            setUser({ ...userData, preferences });
            setIsLoggedIn(true);
            
            return userData;
        } catch (error) {
            setError(error.message);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            setIsLoading(true);
            setError(null);
            console.log('Attempting logout...');
            await AuthService.performCleanLogout();
            setUser(null);
            setIsLoggedIn(false);
            setError(null);
            console.log('Logout successful, user and login state cleared.');
        } catch (error) {
            setError(error.message);
            setUser(null);
            setIsLoggedIn(false);
            console.error('Logout error:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const isAdmin = user?.preferences?.role === 'admin';
    const isStudent = user?.preferences?.role === 'student';

    const value = {
        isLoggedIn,
        user,
        isLoading,
        error,
        isAdmin,
        isStudent,
        handleLogin,
        handleLogout,
        getCurrentRole: async () => {
            try {
                return await AuthService.fetchCurrentRole();
            } catch (error) {
                console.error('Failed to get role:', error);
                return null;
            }
        },
        verifyRole: async (expectedRole) => {
            try {
                return await AuthService.verifyUserRole(expectedRole);
            } catch (error) {
                console.error('Role verification failed:', error);
                return false;
            }
        },
        databases,
        account,
        client,
        databaseId: appwriteConfig.databaseId,
        studentsCollectionId: appwriteConfig.studentsCollectionId,
    };

    return (
        <AppwriteContext.Provider value={value}>
            {children}
        </AppwriteContext.Provider>
    );
};

// Custom hook with better error handling
export const useAppwrite = () => {
    const context = useContext(AppwriteContext);
    if (context === undefined) {
        throw new Error('useAppwrite must be used within an AppwriteProvider');
    }
    return context;
};