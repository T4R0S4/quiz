// Firebase Authentication Manager
// This module handles all Firebase authentication functionality

import { auth, googleProvider } from './firebase-config.js';
import { dbManager } from './firebase-db.js';
import { 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from 'firebase/auth';

class FirebaseAuthManager {
    constructor() {
        this.currentUser = null;
        this.authStateListeners = [];
        this.initializeAuth();
    }

    async initializeAuth() {
        try {
            // Set persistence to local storage
            await setPersistence(auth, browserLocalPersistence);
            
            // Listen for authentication state changes
            onAuthStateChanged(auth, (user) => {
                this.currentUser = user;
                this.notifyAuthStateListeners(user);
                this.updateUIForAuthState(user);
                
                // Save user data to Firestore when user signs in
                if (user) {
                    this.handleUserSignIn(user);
                }
            });
        } catch (error) {
            console.error('Error initializing Firebase Auth:', error);
        }
    }

    // Handle user sign in - save user data to Firestore
    async handleUserSignIn(user) {
        try {
            await dbManager.saveUserData(user);
            console.log('User data saved to Firestore');
        } catch (error) {
            console.error('Error saving user data to Firestore:', error);
        }
    }

    // Sign in with Google
    async signInWithGoogle() {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            
            console.log('User signed in successfully:', user.displayName);
            
            return user;
        } catch (error) {
            console.error('Error signing in with Google:', error);
            
            // Handle specific error cases
            if (error.code === 'auth/popup-closed-by-user') {
                throw new Error('Login dibatalkan oleh pengguna');
            } else if (error.code === 'auth/popup-blocked') {
                throw new Error('Popup diblokir oleh browser. Silakan izinkan popup untuk situs ini.');
            } else {
                throw new Error('Gagal masuk dengan Google. Silakan coba lagi.');
            }
        }
    }

    // Sign out
    async signOutUser() {
        try {
            await signOut(auth);
            console.log('User signed out successfully');
        } catch (error) {
            console.error('Error signing out:', error);
            throw new Error('Gagal keluar. Silakan coba lagi.');
        }
    }

    // Add auth state listener
    addAuthStateListener(callback) {
        this.authStateListeners.push(callback);
    }

    // Remove auth state listener
    removeAuthStateListener(callback) {
        const index = this.authStateListeners.indexOf(callback);
        if (index > -1) {
            this.authStateListeners.splice(index, 1);
        }
    }

    // Notify all auth state listeners
    notifyAuthStateListeners(user) {
        this.authStateListeners.forEach(callback => {
            try {
                callback(user);
            } catch (error) {
                console.error('Error in auth state listener:', error);
            }
        });
    }

    // Update UI based on authentication state
    updateUIForAuthState(user) {
        const loginButton = document.getElementById('login-button');
        const logoutButton = document.getElementById('logout-button');
        const userInfo = document.getElementById('user-info');
        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');

        if (user) {
            // User is signed in
            if (loginButton) loginButton.style.display = 'none';
            if (logoutButton) logoutButton.style.display = 'block';
            if (userInfo) userInfo.style.display = 'flex';
            
            if (userAvatar) {
                userAvatar.src = user.photoURL || 'https://via.placeholder.com/40x40?text=User';
                userAvatar.alt = `Avatar ${user.displayName || 'User'}`;
            }
            
            if (userName) {
                userName.textContent = user.displayName || user.email || 'Pengguna';
            }
        } else {
            // User is signed out
            if (loginButton) loginButton.style.display = 'block';
            if (logoutButton) logoutButton.style.display = 'none';
            if (userInfo) userInfo.style.display = 'none';
        }
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Get user display name
    getUserDisplayName() {
        return this.currentUser?.displayName || this.currentUser?.email || 'Pengguna';
    }

    // Get user email
    getUserEmail() {
        return this.currentUser?.email || '';
    }

    // Get user photo URL
    getUserPhotoURL() {
        return this.currentUser?.photoURL || 'https://via.placeholder.com/40x40?text=User';
    }

    // Get user ID
    getUserId() {
        return this.currentUser?.uid || null;
    }

    // Get user statistics from Firestore
    async getUserStatistics() {
        if (!this.isAuthenticated()) {
            return null;
        }

        try {
            return await dbManager.getUserStatistics(this.getUserId());
        } catch (error) {
            console.error('Error getting user statistics:', error);
            return null;
        }
    }

    // Get user's best score for a category
    async getUserBestScore(category) {
        if (!this.isAuthenticated()) {
            return 0;
        }

        try {
            return await dbManager.getUserBestScore(this.getUserId(), category);
        } catch (error) {
            console.error('Error getting user best score:', error);
            return 0;
        }
    }

    // Save high score to Firestore
    async saveHighScore(category, score, questionsAnswered) {
        if (!this.isAuthenticated()) {
            throw new Error('User must be authenticated to save high scores');
        }

        try {
            const user = this.getCurrentUser();
            await dbManager.saveHighScore(
                user.uid,
                user.displayName || user.email,
                user.email,
                category,
                score,
                questionsAnswered
            );
            return true;
        } catch (error) {
            console.error('Error saving high score:', error);
            throw error;
        }
    }

    // Check if score is a new personal best
    async isNewPersonalBest(category, score) {
        if (!this.isAuthenticated()) {
            return false;
        }

        try {
            return await dbManager.isNewPersonalBest(this.getUserId(), category, score);
        } catch (error) {
            console.error('Error checking personal best:', error);
            return false;
        }
    }

    // Get leaderboard for a category
    async getLeaderboard(category, limit = 10) {
        try {
            return await dbManager.getLeaderboard(category, limit);
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            return [];
        }
    }

    // Get user's high score history
    async getUserHighScoreHistory(category = null, limit = 20) {
        if (!this.isAuthenticated()) {
            return [];
        }

        try {
            return await dbManager.getUserHighScoreHistory(this.getUserId(), category, limit);
        } catch (error) {
            console.error('Error getting user high score history:', error);
            return [];
        }
    }
}

// Create and export a singleton instance
export const authManager = new FirebaseAuthManager();

// Export the class for testing purposes
export { FirebaseAuthManager };

