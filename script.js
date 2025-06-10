import { authManager } from './firebase-auth.js';

document.addEventListener("DOMContentLoaded", () => {
    // Enhanced Constants and Configuration
    const CONFIG = {
        TOTAL_HEARTS: 3,
        ANSWER_DELAY_MS: 1000,
        TARGET_CORRECT_ANSWERS: 50,
        CONFETTI_DURATION: 3000,
        PAGE_TRANSITION_DELAY: 300,
        COLUMNS: {
            MANDARIN: 0,
            PINYIN: 1,
            INDONESIA: 2,
            ARTI: 3
        },
        MESSAGES: {
            NO_QUESTION_DATA: "Tidak ada data pertanyaan yang tersedia untuk memulai kuis.",
            MIX_FIELD_WARNING: "MIX: Kurang dari 2 bidang valid untuk Q&A, melewati.",
            SPECIFIC_FIELD_EMPTY_WARNING: "SPESIFIK: Bidang Q/A terpilih kosong, melewati.",
            ALL_TERMS_EXHAUSTED: "Semua istilah unik habis, kuis berakhir.",
            QUIZ_COMPLETE: "Kuis Selesai",
            GAME_OVER: "Permainan Berakhir",
            CONGRATULATIONS: "Selamat!",
            EXCELLENT_MESSAGE: "Luar biasa! Anda telah menguasai kategori ini!",
            GREAT_JOB_MESSAGE: "Kerja bagus! Anda hampir berhasil!",
            GOOD_EFFORT_MESSAGE: "Usaha bagus! Teruslah berlatih!",
            NOT_BAD_MESSAGE: "Tidak buruk! Ada ruang untuk perbaikan.",
            KEEP_STUDYING_MESSAGE: "Teruslah belajar dan coba lagi!",
            NEW_HIGH_SCORE: "Skor Tertinggi Baru untuk kategori ini:",
            HIGH_SCORE: "Skor Tertinggi Kategori Ini:",
            NO_MATCHING_TERMS: "Tidak ada istilah yang cocok.",
            FAILED_TO_LOAD_DATA: "Gagal memuat data. Silakan coba lagi nanti.",
            FAILED_TO_PLAY_SOUND: "Gagal memutar suara:",
            BGM_BLOCKED: "Pemutaran BGM diblokir. Menunggu interaksi pengguna.",
            USER_INTERACTION_DETECTED: "Interaksi pengguna terdeteksi, mencoba memutar BGM lagi.",
            BGM_STARTED: "BGM mulai diputar atau dilanjutkan.",
            LOGIN_SUCCESS: "Berhasil masuk! Skor tinggi Anda akan disimpan.",
            LOGIN_ERROR: "Gagal masuk. Silakan coba lagi.",
            LOGOUT_SUCCESS: "Berhasil keluar.",
            SCORE_SAVED: "Skor tinggi berhasil disimpan!",
            SCORE_SAVE_ERROR: "Gagal menyimpan skor tinggi.",
            LOGIN_REQUIRED: "Masuk dengan Google untuk menyimpan skor tinggi Anda!"
        }
    };

    // Global State
    let gameState = {
        allTerms: [],
        currentQuizTerms: [],
        currentQuestionIndex: 0,
        score: 0,
        questionsAnsweredThisSession: 0,
        heartsRemaining: CONFIG.TOTAL_HEARTS,
        quizCategory: "",
        autoAdvanceTimeout: null,
        hasInteractedForBGM: false,
        isMuted: false,
        currentUser: null
    };

    // DOM Elements Cache
    const elements = {
        pages: {
            main: document.getElementById("main-page"),
            quizCategories: document.getElementById("quiz-categories-page"),
            quiz: document.getElementById("quiz-page"),
            results: document.getElementById("results-page"),
            terminologi: document.getElementById("terminologi-page"),
            about: document.getElementById("about-page")
        },
        audio: {
            correct: document.getElementById("correct-sound"),
            wrong: document.getElementById("wrong-sound"),
            bgm: document.getElementById("bgm-sound"),
            lose: document.getElementById("lose-sound"),
            highscore: document.getElementById("highscore-sound"),
            congrats: document.getElementById("congrats-sound")
        },
        auth: {
            loginButton: document.getElementById("login-button"),
            logoutButton: document.getElementById("logout-button"),
            userInfo: document.getElementById("user-info"),
            userAvatar: document.getElementById("user-avatar"),
            userName: document.getElementById("user-name"),
            loginForHighscore: document.getElementById("login-for-highscore"),
            loginPrompt: document.getElementById("login-prompt"),
            saveStatus: document.getElementById("save-status"),
            saveMessage: document.getElementById("save-message")
        },
        buttons: {
            goToQuizCategories: document.getElementById("btn-goto-quiz-categories"),
            goToTerminologi: document.getElementById("btn-goto-terminologi"),
            goToAbout: document.getElementById("btn-goto-about"),
            categories: document.querySelectorAll(".category-btn"),
            backToMainFromCategories: document.getElementById("btn-back-to-main-from-categories"),
            quitQuiz: document.getElementById("btn-quit-quiz"),
            restartQuiz: document.getElementById("btn-restart-quiz"),
            backToCategoriesFromResults: document.getElementById("btn-back-to-categories-from-results"),
            backToMainFromResults: document.getElementById("btn-back-to-main-from-results"),
            backToMainFromTerminologi: document.getElementById("btn-back-to-main-from-terminologi"),
            backToMainFromAbout: document.getElementById("btn-back-to-main-from-about")
        },
        quiz: {
            heartsContainer: document.getElementById("hearts-container"),
            questionCounter: document.getElementById("question-counter"),
            scoreDisplay: document.getElementById("score-display"),
            questionText: document.getElementById("question-text"),
            answerButtonsContainer: document.getElementById("answer-buttons-container")
        },
        results: {
            title: document.getElementById("result-title"),
            finalScore: document.getElementById("final-score"),
            message: document.getElementById("result-message"),
            highScoreDisplay: document.getElementById("high-score-display")
        },
        terminologi: {
            list: document.getElementById("terminologi-list"),
            searchInput: document.getElementById("search-terminologi")
        }
    };

    // Enhanced Audio Management
    class AudioManager {
        constructor() {
            this.setupAudioControl();
            this.initializeBGM();
        }

        setupAudioControl() {
            const audioControl = document.createElement("button");
            audioControl.className = "audio-control";
            audioControl.innerHTML = "🔊";
            audioControl.title = "Toggle Audio";
            audioControl.addEventListener("click", () => this.toggleMute());
            document.body.appendChild(audioControl);
        }

        toggleMute() {
            gameState.isMuted = !gameState.isMuted;
            const audioControl = document.querySelector(".audio-control");
            
            if (gameState.isMuted) {
                elements.audio.bgm.pause();
                audioControl.innerHTML = "🔇";
                audioControl.title = "Unmute Audio";
            } else {
                this.tryPlayBGM();
                audioControl.innerHTML = "🔊";
                audioControl.title = "Mute Audio";
            }
        }

        initializeBGM() {
            this.tryPlayBGM();
        }

        tryPlayBGM() {
            if (gameState.isMuted || !elements.audio.bgm) return;

            if (elements.audio.bgm.paused) {
                elements.audio.bgm.volume = 0.08;
                elements.audio.bgm.play().then(() => {
                    console.log(CONFIG.MESSAGES.BGM_STARTED);
                    gameState.hasInteractedForBGM = true;
                    document.removeEventListener("click", this.handleFirstInteractionForBGM);
                    document.removeEventListener("touchstart", this.handleFirstInteractionForBGM);
                }).catch(error => {
                    console.warn(CONFIG.MESSAGES.BGM_BLOCKED, error);
                    if (!gameState.hasInteractedForBGM) {
                        document.addEventListener("click", this.handleFirstInteractionForBGM, { once: true });
                        document.addEventListener("touchstart", this.handleFirstInteractionForBGM, { once: true });
                    }
                });
            }
        }

        handleFirstInteractionForBGM = () => {
            console.log(CONFIG.MESSAGES.USER_INTERACTION_DETECTED);
            this.tryPlayBGM();
        }

        playSound(soundElement, volume = 0.5) {
            if (gameState.isMuted || !soundElement) return;
            
            soundElement.currentTime = 0;
            soundElement.volume = volume;
            soundElement.play().catch(error => 
                console.log(`${CONFIG.MESSAGES.FAILED_TO_PLAY_SOUND} ${error}`)
            );
        }
    }

    // Enhanced Authentication Manager Integration
    class AuthenticationManager {
        constructor() {
            this.setupAuthEventListeners();
            this.setupAuthStateListener();
        }

        setupAuthEventListeners() {
            // Main login button
            if (elements.auth.loginButton) {
                elements.auth.loginButton.addEventListener('click', () => this.handleLogin());
            }

            // Logout button
            if (elements.auth.logoutButton) {
                elements.auth.logoutButton.addEventListener('click', () => this.handleLogout());
            }

            // Login for high score button
            if (elements.auth.loginForHighscore) {
                elements.auth.loginForHighscore.addEventListener('click', () => this.handleLogin());
            }
        }

        setupAuthStateListener() {
            authManager.addAuthStateListener((user) => {
                gameState.currentUser = user;
                this.updateAuthUI(user);
            });
        }

        async handleLogin() {
            try {
                const user = await authManager.signInWithGoogle();
                this.showSaveStatus(CONFIG.MESSAGES.LOGIN_SUCCESS, 'success');
                console.log('User logged in:', user.displayName);
            } catch (error) {
                this.showSaveStatus(error.message || CONFIG.MESSAGES.LOGIN_ERROR, 'error');
                console.error('Login error:', error);
            }
        }

        async handleLogout() {
            try {
                await authManager.signOutUser();
                this.showSaveStatus(CONFIG.MESSAGES.LOGOUT_SUCCESS, 'success');
                console.log('User logged out');
            } catch (error) {
                this.showSaveStatus(error.message, 'error');
                console.error('Logout error:', error);
            }
        }

        updateAuthUI(user) {
            if (user) {
                // User is logged in
                if (elements.auth.loginPrompt) {
                    elements.auth.loginPrompt.style.display = 'none';
                }
            } else {
                // User is logged out
                if (elements.auth.saveStatus) {
                    elements.auth.saveStatus.style.display = 'none';
                }
            }
        }

        showSaveStatus(message, type = 'success') {
            if (elements.auth.saveStatus && elements.auth.saveMessage) {
                elements.auth.saveMessage.textContent = message;
                elements.auth.saveStatus.className = `save-status ${type}`;
                elements.auth.saveStatus.style.display = 'block';

                // Hide after 5 seconds
                setTimeout(() => {
                    if (elements.auth.saveStatus) {
                        elements.auth.saveStatus.style.display = 'none';
                    }
                }, 5000);
            }
        }

        isUserLoggedIn() {
            return authManager.isAuthenticated();
        }

        getCurrentUser() {
            return authManager.getCurrentUser();
        }
    }

    // Enhanced Page Navigation with Animations
    class PageNavigator {
        static showPage(pageId, useAnimation = true) {
            clearTimeout(gameState.autoAdvanceTimeout);
            
            if (useAnimation) {
                const currentPage = document.querySelector(".page.active");
                if (currentPage) {
                    currentPage.classList.add("fade-out");
                    setTimeout(() => {
                        this.switchToPage(pageId);
                    }, CONFIG.PAGE_TRANSITION_DELAY);
                } else {
                    this.switchToPage(pageId);
                }
            } else {
                this.switchToPage(pageId);
            }
        }

        static switchToPage(pageId) {
            Object.values(elements.pages).forEach(page => {
                page.classList.remove("active", "fade-in", "fade-out");
            });

            const targetPage = elements.pages[pageId];
            if (targetPage) {
                targetPage.classList.add("active", "fade-in");
                this.scrollToTop(targetPage);
            }
        }

        static scrollToTop(page) {
            if (page.parentElement) {
                page.parentElement.scrollTop = 0;
            } else {
                window.scrollTo(0, 0);
            }
        }
    }

    // Enhanced Data Management
    class DataManager {
        static async loadData() {
            try {
                const response = await fetch("data.json");
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const jsonData = await response.json();
                gameState.allTerms = jsonData.slice(1).filter(term => 
                    term.some(field => field && String(field).trim() !== "")
                );
                
                if (gameState.allTerms.length < 4) {
                    console.warn(`Warning: Only ${gameState.allTerms.length} terms available. Quiz may have limited options.`);
                }
                
                TerminologyManager.populateList(gameState.allTerms);
                return true;
            } catch (error) {
                console.error("Failed to load terminology data:", error);
                if (elements.pages.main) {
                    elements.pages.main.innerHTML = `<p>${CONFIG.MESSAGES.FAILED_TO_LOAD_DATA}</p>`;
                }
                return false;
            }
        }
    }

    // Enhanced Terminology Management
    class TerminologyManager {
        static populateList(termsToDisplay) {
            elements.terminologi.list.innerHTML = "";
            
            if (termsToDisplay.length === 0) {
                elements.terminologi.list.innerHTML = `<p style="padding:10px;">${CONFIG.MESSAGES.NO_MATCHING_TERMS}</p>`;
                return;
            }

            termsToDisplay.forEach((term, index) => {
                const item = document.createElement("div");
                item.classList.add("terminologi-item");
                item.style.animationDelay = `${index * 0.05}s`;
                
                item.innerHTML = `
                    <strong>${String(term[CONFIG.COLUMNS.MANDARIN] || "-")}</strong>
                    <span class="pinyin">${String(term[CONFIG.COLUMNS.PINYIN] || "-")}</span>
                    <span class="bahasa-indonesia">${String(term[CONFIG.COLUMNS.INDONESIA] || "-")}</span>
                    <div class="arti">${String(term[CONFIG.COLUMNS.ARTI] || "Tidak ada keterangan.")}</div>
                `;
                
                item.addEventListener("click", () => {
                    item.classList.toggle("active");
                });
                
                elements.terminologi.list.appendChild(item);
            });
        }

        static setupSearch() {
            elements.terminologi.searchInput.addEventListener("input", (e) => {
                const searchTerm = e.target.value.toLowerCase();
                const filteredTerms = gameState.allTerms.filter(term =>
                    Object.values(CONFIG.COLUMNS).some(colIndex =>
                        term[colIndex] && String(term[colIndex]).toLowerCase().includes(searchTerm)
                    )
                );
                this.populateList(filteredTerms);
            });
        }
    }

    // Enhanced Score Management with Firebase Integration
    class ScoreManager {
        static getHighScore(category) {
            const highScore = localStorage.getItem(`highScore_${category}_target${CONFIG.TARGET_CORRECT_ANSWERS}`);
            return highScore ? parseInt(highScore, 10) : 0;
        }

        static saveHighScore(category, newScore) {
            const currentHighScore = this.getHighScore(category);
            if (newScore > currentHighScore) {
                localStorage.setItem(`highScore_${category}_target${CONFIG.TARGET_CORRECT_ANSWERS}`, newScore);
                return true;
            }
            return false;
        }

        // Enhanced Score Management with Firebase Integration
        static async saveHighScoreToCloud(category, score, questionsAnswered) {
            if (!authenticationManager.isUserLoggedIn()) {
                console.log('User not logged in, cannot save to cloud');
                return false;
            }

            try {
                // Check if this is a new personal best
                const isNewBest = await authManager.isNewPersonalBest(category, score);
                
                if (isNewBest) {
                    // Save to Firebase Firestore
                    await authManager.saveHighScore(category, score, questionsAnswered);
                    authenticationManager.showSaveStatus(CONFIG.MESSAGES.SCORE_SAVED, 'success');
                    return true;
                } else {
                    // Still save the score but don't show as new high score
                    await authManager.saveHighScore(category, score, questionsAnswered);
                    authenticationManager.showSaveStatus('Skor disimpan!', 'success');
                    return false;
                }
            } catch (error) {
                console.error('Error saving high score to cloud:', error);
                authenticationManager.showSaveStatus(CONFIG.MESSAGES.SCORE_SAVE_ERROR, 'error');
                return false;
            }
        }

        // Get cloud high score for a category
        static async getCloudHighScore(category) {
            if (!authenticationManager.isUserLoggedIn()) {
                return 0;
            }

            try {
                return await authManager.getUserBestScore(category);
            } catch (error) {
                console.error('Error getting cloud high score:', error);
                return 0;
            }
        }
    }

    // Enhanced Quiz Engine
    class QuizEngine {
        static shuffleArray(array) {
            const newArray = [...array];
            for (let i = newArray.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
            }
            return newArray;
        }

        static updateHeartsDisplay() {
            elements.quiz.heartsContainer.innerHTML = "";
            for (let i = 0; i < CONFIG.TOTAL_HEARTS; i++) {
                const heart = document.createElement("span");
                heart.classList.add("heart-icon");
                heart.textContent = "❤";
                if (i >= gameState.heartsRemaining) {
                    heart.classList.add("lost");
                }
                elements.quiz.heartsContainer.appendChild(heart);
            }
        }

        static startQuiz(category) {
            gameState.quizCategory = category;
            gameState.score = 0;
            gameState.questionsAnsweredThisSession = 0;
            gameState.currentQuestionIndex = 0;
            gameState.heartsRemaining = CONFIG.TOTAL_HEARTS;
            
            this.updateHeartsDisplay();
            gameState.currentQuizTerms = this.shuffleArray([...gameState.allTerms]);

            if (gameState.currentQuizTerms.length === 0) {
                alert(CONFIG.MESSAGES.NO_QUESTION_DATA);
                PageNavigator.showPage("quizCategories");
                return;
            }

            console.log(`Memulai kuis kategori: ${category}. Target: ${CONFIG.TARGET_CORRECT_ANSWERS} jawaban benar. Total istilah tersedia: ${gameState.currentQuizTerms.length}`);
            PageNavigator.showPage("quiz");
            this.displayQuestion();
        }

        static displayQuestion() {
            this.resetAnswerButtonsState();
            
            if (gameState.heartsRemaining <= 0) {
                this.showResults(true);
                return;
            }

            if (gameState.currentQuestionIndex < gameState.currentQuizTerms.length) {
                const currentTermData = gameState.currentQuizTerms[gameState.currentQuestionIndex];
                const questionData = this.generateQuestionData(currentTermData);
                
                if (!questionData) {
                    gameState.currentQuestionIndex++;
                    this.displayQuestion();
                    return;
                }

                this.renderQuestion(questionData);
            } else {
                console.log(CONFIG.MESSAGES.ALL_TERMS_EXHAUSTED);
                this.showResults(false);
            }
        }

        static generateQuestionData(currentTermData) {
            const fields = [
                currentTermData[CONFIG.COLUMNS.MANDARIN],
                currentTermData[CONFIG.COLUMNS.PINYIN],
                currentTermData[CONFIG.COLUMNS.INDONESIA],
                currentTermData[CONFIG.COLUMNS.ARTI]
            ];

            let questionFieldIndex, answerFieldIndex;

            if (gameState.quizCategory === "mix") {
                const validIndices = fields
                    .map((field, index) => (field && String(field).trim() !== "") ? index : -1)
                    .filter(index => index !== -1);
                
                if (validIndices.length < 2) {
                    console.warn(CONFIG.MESSAGES.MIX_FIELD_WARNING, currentTermData);
                    return null;
                }
                
                questionFieldIndex = validIndices[Math.floor(Math.random() * validIndices.length)];
                const possibleAnswerIndices = validIndices.filter(i => i !== questionFieldIndex);
                answerFieldIndex = possibleAnswerIndices[Math.floor(Math.random() * possibleAnswerIndices.length)];
            } else {
                const categoryMap = {
                    "mandarin": [CONFIG.COLUMNS.MANDARIN, CONFIG.COLUMNS.INDONESIA],
                    "pinyin": [CONFIG.COLUMNS.PINYIN, CONFIG.COLUMNS.INDONESIA],
                    "indonesia": [CONFIG.COLUMNS.INDONESIA, CONFIG.COLUMNS.MANDARIN],
                    "arti": [CONFIG.COLUMNS.ARTI, CONFIG.COLUMNS.INDONESIA]
                };
                
                [questionFieldIndex, answerFieldIndex] = categoryMap[gameState.quizCategory] || 
                    [CONFIG.COLUMNS.INDONESIA, CONFIG.COLUMNS.MANDARIN];
            }

            if (!fields[questionFieldIndex] || String(fields[questionFieldIndex]).trim() === "" ||
                !fields[answerFieldIndex] || String(fields[answerFieldIndex]).trim() === "") {
                console.warn(CONFIG.MESSAGES.SPECIFIC_FIELD_EMPTY_WARNING, currentTermData);
                return null;
            }

            const question = String(fields[questionFieldIndex]);
            const correctAnswer = String(fields[answerFieldIndex]);
            const answerOptions = this.generateAnswerOptions(correctAnswer, answerFieldIndex, currentTermData);

            return { question, correctAnswer, answerOptions };
        }

        static generateAnswerOptions(correctAnswer, answerFieldIndex, currentTermData) {
            const answerOptions = [{ text: correctAnswer, correct: true }];
            const wrongAnswerTexts = new Set();
            const shuffledAllTermsForWrongOptions = this.shuffleArray([...gameState.allTerms]);

            for (const term of shuffledAllTermsForWrongOptions) {
                if (answerOptions.length >= 4) break;
                
                if (term !== currentTermData &&
                    term[answerFieldIndex] && String(term[answerFieldIndex]).trim() !== "" &&
                    String(term[answerFieldIndex]) !== correctAnswer &&
                    !wrongAnswerTexts.has(String(term[answerFieldIndex]))
                ) {
                    const wrongText = String(term[answerFieldIndex]);
                    answerOptions.push({ text: wrongText, correct: false });
                    wrongAnswerTexts.add(wrongText);
                }
            }

            let dummyCounter = 1;
            while (answerOptions.length < 4) {
                let dummyText = `Pilihan ${String.fromCharCode(65 + dummyCounter - 1)}`;
                while (answerOptions.some(opt => opt.text === dummyText) || wrongAnswerTexts.has(dummyText)) {
                    dummyText = `Pilihan ${dummyCounter++}`;
                    if (dummyCounter > 26) {
                        dummyText = `Opsi Unik ${Date.now()}${dummyCounter}`;
                        break;
                    }
                }
                answerOptions.push({ text: dummyText, correct: false });
                wrongAnswerTexts.add(dummyText);
                if (dummyCounter > 50) break;
            }

            return this.shuffleArray(answerOptions);
        }

        static renderQuestion({ question, correctAnswer, answerOptions }) {
            elements.quiz.questionText.style.opacity = "0";
            setTimeout(() => {
                elements.quiz.questionText.textContent = question;
                elements.quiz.questionText.style.opacity = "1";
            }, 200);

            elements.quiz.questionCounter.textContent = `Pertanyaan ${gameState.questionsAnsweredThisSession + 1}`;
            elements.quiz.scoreDisplay.textContent = `Benar: ${gameState.score} / ${CONFIG.TARGET_CORRECT_ANSWERS}`;

            answerOptions.forEach((option, index) => {
                const button = document.createElement("button");
                button.innerText = option.text;
                button.dataset.correct = String(option.correct);
                button.style.animationDelay = `${index * 0.1}s`;
                button.addEventListener("click", (e) => this.selectAnswer(e));
                elements.quiz.answerButtonsContainer.appendChild(button);
            });
        }

        static resetAnswerButtonsState() {
            clearTimeout(gameState.autoAdvanceTimeout);
            elements.quiz.answerButtonsContainer.innerHTML = "";
        }

        static selectAnswer(e) {
            gameState.questionsAnsweredThisSession++;
            const selectedButton = e.target;
            const isCorrect = selectedButton.dataset.correct === "true";

            Array.from(elements.quiz.answerButtonsContainer.children).forEach(button => {
                button.disabled = true;
            });

            selectedButton.classList.add("selected-answer");

            if (isCorrect) {
                gameState.score++;
                selectedButton.classList.add("correct");
                audioManager.playSound(elements.audio.correct);
                this.triggerConfetti();
            } else {
                gameState.heartsRemaining--;
                this.updateHeartsDisplay();
                selectedButton.classList.add("wrong");
                audioManager.playSound(elements.audio.wrong);
                
                const correctButton = Array.from(elements.quiz.answerButtonsContainer.children)
                    .find(btn => btn.dataset.correct === "true");
                if (correctButton) {
                    correctButton.classList.add("correct");
                }
            }

            elements.quiz.scoreDisplay.textContent = `Benar: ${gameState.score} / ${CONFIG.TARGET_CORRECT_ANSWERS}`;

            gameState.autoAdvanceTimeout = setTimeout(() => {
                selectedButton.classList.remove("selected-answer");
                
                if (gameState.score >= CONFIG.TARGET_CORRECT_ANSWERS) {
                    this.showResults(false, true);
                } else if (gameState.heartsRemaining <= 0) {
                    this.showResults(true);
                } else {
                    gameState.currentQuestionIndex++;
                    this.displayQuestion();
                }
            }, CONFIG.ANSWER_DELAY_MS);
        }

        static triggerConfetti() {
            if (typeof confetti !== "undefined") {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
        }

        static async showResults(isGameOver, isWin = false) {
            const category = gameState.quizCategory;
            const finalScore = gameState.score;
            const isNewLocalHighScore = ScoreManager.saveHighScore(category, finalScore);
            const localHighScore = ScoreManager.getHighScore(category);

            // Get cloud high score if user is logged in
            let cloudHighScore = 0;
            let isNewCloudHighScore = false;
            
            if (authenticationManager.isUserLoggedIn()) {
                try {
                    cloudHighScore = await ScoreManager.getCloudHighScore(category);
                    isNewCloudHighScore = finalScore > cloudHighScore;
                } catch (error) {
                    console.error('Error getting cloud high score:', error);
                }
            }

            // Use the higher of local or cloud high score for display
            const displayHighScore = Math.max(localHighScore, cloudHighScore);
            const isNewHighScore = isNewLocalHighScore || isNewCloudHighScore;

            // Set result title with color
            if (isWin) {
                elements.results.title.textContent = CONFIG.MESSAGES.CONGRATULATIONS;
                elements.results.title.style.color = "#28a745";
                audioManager.playSound(elements.audio.congrats);
                
                setTimeout(() => {
                    if (typeof confetti !== "undefined") {
                        confetti({
                            particleCount: 200,
                            spread: 100,
                            origin: { y: 0.4 }
                        });
                    }
                }, 500);
            } else if (isGameOver) {
                elements.results.title.textContent = CONFIG.MESSAGES.GAME_OVER;
                elements.results.title.style.color = "#dc3545";
                audioManager.playSound(elements.audio.lose);
            } else {
                elements.results.title.textContent = CONFIG.MESSAGES.QUIZ_COMPLETE;
                elements.results.title.style.color = "#007bff";
            }

            this.animateScore(finalScore);

            let message = "";
            if (isWin) {
                message = CONFIG.MESSAGES.EXCELLENT_MESSAGE;
            } else if (finalScore >= CONFIG.TARGET_CORRECT_ANSWERS * 0.8) {
                message = CONFIG.MESSAGES.GREAT_JOB_MESSAGE;
            } else if (finalScore >= CONFIG.TARGET_CORRECT_ANSWERS * 0.6) {
                message = CONFIG.MESSAGES.GOOD_EFFORT_MESSAGE;
            } else if (finalScore >= CONFIG.TARGET_CORRECT_ANSWERS * 0.4) {
                message = CONFIG.MESSAGES.NOT_BAD_MESSAGE;
            } else {
                message = CONFIG.MESSAGES.KEEP_STUDYING_MESSAGE;
            }

            elements.results.message.textContent = message;

            if (isNewHighScore) {
                elements.results.highScoreDisplay.textContent = `${CONFIG.MESSAGES.NEW_HIGH_SCORE} ${displayHighScore}`;
                elements.results.highScoreDisplay.style.color = "#ffc107";
                audioManager.playSound(elements.audio.highscore);
            } else {
                elements.results.highScoreDisplay.textContent = `${CONFIG.MESSAGES.HIGH_SCORE} ${displayHighScore}`;
                elements.results.highScoreDisplay.style.color = "#6c757d";
            }

            // Handle high score saving and login prompts
            await this.handleHighScoreSaving(category, finalScore, gameState.questionsAnsweredThisSession, isNewCloudHighScore);

            PageNavigator.showPage("results");
        }

        static async handleHighScoreSaving(category, score, questionsAnswered, isNewHighScore) {
            if (authenticationManager.isUserLoggedIn()) {
                // User is logged in, save to cloud
                try {
                    await ScoreManager.saveHighScoreToCloud(category, score, questionsAnswered);
                } catch (error) {
                    console.error('Error saving to cloud:', error);
                }
                
                // Hide login prompt
                if (elements.auth.loginPrompt) {
                    elements.auth.loginPrompt.style.display = 'none';
                }
            } else {
                // User is not logged in, show login prompt for high scores
                if (isNewHighScore && elements.auth.loginPrompt) {
                    elements.auth.loginPrompt.style.display = 'block';
                }
                
                // Hide save status
                if (elements.auth.saveStatus) {
                    elements.auth.saveStatus.style.display = 'none';
                }
            }
        }

        static animateScore(targetScore) {
            let currentScore = 0;
            const increment = Math.ceil(targetScore / 20);
            const timer = setInterval(() => {
                currentScore += increment;
                if (currentScore >= targetScore) {
                    currentScore = targetScore;
                    clearInterval(timer);
                }
                elements.results.finalScore.textContent = `Skor Akhir Anda: ${currentScore} / ${CONFIG.TARGET_CORRECT_ANSWERS}`;
            }, 50);
        }
    }

    // Initialize managers
    const audioManager = new AudioManager();
    const authenticationManager = new AuthenticationManager();

    // Event Listeners Setup
    function setupEventListeners() {
        // Main menu navigation
        elements.buttons.goToQuizCategories.addEventListener("click", () => 
            PageNavigator.showPage("quizCategories"));
        elements.buttons.goToTerminologi.addEventListener("click", () => 
            PageNavigator.showPage("terminologi"));
        elements.buttons.goToAbout.addEventListener("click", () => 
            PageNavigator.showPage("about"));

        // Category selection
        elements.buttons.categories.forEach(button => {
            button.addEventListener("click", (e) => {
                const category = e.target.dataset.category;
                QuizEngine.startQuiz(category);
            });
        });

        // Back navigation
        elements.buttons.backToMainFromCategories.addEventListener("click", () => 
            PageNavigator.showPage("main"));
        elements.buttons.quitQuiz.addEventListener("click", () => 
            PageNavigator.showPage("main"));
        elements.buttons.restartQuiz.addEventListener("click", () => 
            QuizEngine.startQuiz(gameState.quizCategory));
        elements.buttons.backToCategoriesFromResults.addEventListener("click", () => 
            PageNavigator.showPage("quizCategories"));
        elements.buttons.backToMainFromResults.addEventListener("click", () => 
            PageNavigator.showPage("main"));
        elements.buttons.backToMainFromTerminologi.addEventListener("click", () => 
            PageNavigator.showPage("main"));
        elements.buttons.backToMainFromAbout.addEventListener("click", () => 
            PageNavigator.showPage("main"));

        // Setup terminology search
        TerminologyManager.setupSearch();
    }

    // Initialize Application
    async function initializeApp() {
        console.log("Menginisialisasi Aplikasi Kuis yang Ditingkatkan dengan Firebase...");
        
        const dataLoaded = await DataManager.loadData();
        if (!dataLoaded) {
            console.error("Gagal memuat data. Aplikasi mungkin tidak berfungsi dengan benar.");
            return;
        }

        setupEventListeners();
        PageNavigator.showPage("main", false);
        
        console.log("Aplikasi Kuis yang Ditingkatkan dengan Firebase berhasil diinisialisasi!");
    }

    // Start the application
    initializeApp();
});

