// Firebase Firestore Database Manager
// This module handles all Firestore database operations for high scores and user data

import { db } from './firebase-config.js';
import { 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    limit,
    updateDoc,
    serverTimestamp,
    writeBatch
} from 'firebase/firestore';

class FirebaseDBManager {
    constructor() {
        this.collections = {
            USERS: 'users',
            HIGHSCORES: 'highscores',
            LEADERBOARD: 'leaderboard'
        };
    }

    // Save or update user data
    async saveUserData(user) {
        try {
            const userRef = doc(db, this.collections.USERS, user.uid);
            const userData = {
                displayName: user.displayName || '',
                email: user.email || '',
                photoURL: user.photoURL || '',
                lastLogin: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            // Check if user exists
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
                // Update existing user
                await updateDoc(userRef, {
                    ...userData,
                    totalLogins: (userDoc.data().totalLogins || 0) + 1
                });
            } else {
                // Create new user
                await setDoc(userRef, {
                    ...userData,
                    createdAt: serverTimestamp(),
                    totalLogins: 1,
                    totalQuizzes: 0,
                    bestScores: {}
                });
            }

            console.log('User data saved successfully');
            return true;
        } catch (error) {
            console.error('Error saving user data:', error);
            throw new Error('Gagal menyimpan data pengguna');
        }
    }

    // Get user data
    async getUserData(userId) {
        try {
            const userRef = doc(db, this.collections.USERS, userId);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                return userDoc.data();
            } else {
                console.log('User data not found');
                return null;
            }
        } catch (error) {
            console.error('Error getting user data:', error);
            throw new Error('Gagal mengambil data pengguna');
        }
    }

    // Save high score
    async saveHighScore(userId, userDisplayName, userEmail, category, score, questionsAnswered) {
        try {
            // Create high score document
            const highScoreData = {
                userId: userId,
                userName: userDisplayName,
                userEmail: userEmail,
                category: category,
                score: score,
                questionsAnswered: questionsAnswered,
                timestamp: serverTimestamp(),
                createdAt: serverTimestamp()
            };

            // Use batch write for atomic operations
            const batch = writeBatch(db);

            // Save to highscores collection with unique ID
            const highScoreId = `${userId}_${category}_${Date.now()}`;
            const highScoreRef = doc(db, this.collections.HIGHSCORES, highScoreId);
            batch.set(highScoreRef, highScoreData);

            // Update user's best scores
            const userRef = doc(db, this.collections.USERS, userId);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const currentBestScores = userData.bestScores || {};
                const currentBestForCategory = currentBestScores[category] || 0;

                // Only update if this is a new high score
                if (score > currentBestForCategory) {
                    batch.update(userRef, {
                        [`bestScores.${category}`]: score,
                        totalQuizzes: (userData.totalQuizzes || 0) + 1,
                        updatedAt: serverTimestamp()
                    });
                }
            }

            // Commit the batch
            await batch.commit();

            console.log('High score saved successfully');
            return true;
        } catch (error) {
            console.error('Error saving high score:', error);
            throw new Error('Gagal menyimpan skor tinggi');
        }
    }

    // Get user's best score for a category
    async getUserBestScore(userId, category) {
        try {
            const userRef = doc(db, this.collections.USERS, userId);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const bestScores = userData.bestScores || {};
                return bestScores[category] || 0;
            }
            
            return 0;
        } catch (error) {
            console.error('Error getting user best score:', error);
            return 0;
        }
    }

    // Get global leaderboard for a category
    async getLeaderboard(category, limitCount = 10) {
        try {
            const q = query(
                collection(db, this.collections.HIGHSCORES),
                where('category', '==', category),
                orderBy('score', 'desc'),
                orderBy('timestamp', 'asc'),
                limit(limitCount)
            );

            const querySnapshot = await getDocs(q);
            const leaderboard = [];
            
            querySnapshot.forEach((doc) => {
                leaderboard.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return leaderboard;
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            throw new Error('Gagal mengambil papan peringkat');
        }
    }

    // Get user's high score history
    async getUserHighScoreHistory(userId, category = null, limitCount = 20) {
        try {
            let q;
            
            if (category) {
                q = query(
                    collection(db, this.collections.HIGHSCORES),
                    where('userId', '==', userId),
                    where('category', '==', category),
                    orderBy('timestamp', 'desc'),
                    limit(limitCount)
                );
            } else {
                q = query(
                    collection(db, this.collections.HIGHSCORES),
                    where('userId', '==', userId),
                    orderBy('timestamp', 'desc'),
                    limit(limitCount)
                );
            }

            const querySnapshot = await getDocs(q);
            const history = [];
            
            querySnapshot.forEach((doc) => {
                history.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return history;
        } catch (error) {
            console.error('Error getting user high score history:', error);
            throw new Error('Gagal mengambil riwayat skor');
        }
    }

    // Get user statistics
    async getUserStatistics(userId) {
        try {
            const userRef = doc(db, this.collections.USERS, userId);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                return null;
            }

            const userData = userDoc.data();
            
            // Get user's high score history for additional stats
            const history = await this.getUserHighScoreHistory(userId);
            
            // Calculate statistics
            const stats = {
                totalQuizzes: userData.totalQuizzes || 0,
                totalLogins: userData.totalLogins || 0,
                bestScores: userData.bestScores || {},
                recentScores: history.slice(0, 5),
                averageScore: 0,
                totalScore: 0,
                favoriteCategory: null
            };

            // Calculate average score and favorite category
            if (history.length > 0) {
                const totalScore = history.reduce((sum, score) => sum + score.score, 0);
                stats.totalScore = totalScore;
                stats.averageScore = Math.round(totalScore / history.length);

                // Find favorite category (most played)
                const categoryCount = {};
                history.forEach(score => {
                    categoryCount[score.category] = (categoryCount[score.category] || 0) + 1;
                });
                
                stats.favoriteCategory = Object.keys(categoryCount).reduce((a, b) => 
                    categoryCount[a] > categoryCount[b] ? a : b
                );
            }

            return stats;
        } catch (error) {
            console.error('Error getting user statistics:', error);
            throw new Error('Gagal mengambil statistik pengguna');
        }
    }

    // Check if score is a new personal best
    async isNewPersonalBest(userId, category, score) {
        try {
            const currentBest = await this.getUserBestScore(userId, category);
            return score > currentBest;
        } catch (error) {
            console.error('Error checking personal best:', error);
            return false;
        }
    }

    // Get global statistics
    async getGlobalStatistics() {
        try {
            // This would require more complex queries and potentially cloud functions
            // For now, return basic stats
            const usersSnapshot = await getDocs(collection(db, this.collections.USERS));
            const highScoresSnapshot = await getDocs(collection(db, this.collections.HIGHSCORES));

            return {
                totalUsers: usersSnapshot.size,
                totalQuizzes: highScoresSnapshot.size,
                lastUpdated: new Date()
            };
        } catch (error) {
            console.error('Error getting global statistics:', error);
            throw new Error('Gagal mengambil statistik global');
        }
    }

    // Clean up old high scores (utility function)
    async cleanupOldHighScores(daysOld = 365) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            // This would require a more complex query with timestamps
            // For production, this should be handled by Cloud Functions
            console.log('Cleanup function would run here for scores older than', cutoffDate);
            
            return true;
        } catch (error) {
            console.error('Error cleaning up old high scores:', error);
            return false;
        }
    }
}

// Create and export a singleton instance
export const dbManager = new FirebaseDBManager();

// Export the class for testing purposes
export { FirebaseDBManager };

