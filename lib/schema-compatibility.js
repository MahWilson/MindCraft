// Schema compatibility helpers
// Use these functions to handle both old and new database schemas

/**
 * Normalizes enrollment data to handle both old (flat) and new (nested) schemas
 * @param {Object} enrollmentData - Raw enrollment data from Firestore
 * @returns {Object} Normalized enrollment data with consistent structure
 */
export function normalizeEnrollment(enrollmentData) {
	if (!enrollmentData) return null;
	
	// If old schema (flat structure - completedLessons at root level)
	if (enrollmentData.completedLessons && !enrollmentData.progress) {
		return {
			...enrollmentData,
			progress: {
				completedModules: enrollmentData.completedModules || [],
				completedLessons: enrollmentData.completedLessons || [],
				overallProgress: enrollmentData.overallProgress || 0
			}
		};
	}
	
	// If new schema (nested progress) or already normalized
	return {
		...enrollmentData,
		progress: enrollmentData.progress || {
			completedModules: [],
			completedLessons: [],
			overallProgress: 0
		}
	};
}

/**
 * Gets lesson content, handling both old (content) and new (contentHtml) field names
 * @param {Object} lessonData - Raw lesson data from Firestore
 * @returns {string} Lesson content HTML
 */
export function getLessonContent(lessonData) {
	if (!lessonData) return '';
	
	// Prefer contentHtml (new), fallback to content (old)
	return lessonData.contentHtml || lessonData.content || '';
}

/**
 * Normalizes course data with default values for missing fields
 * @param {Object} courseData - Raw course data from Firestore
 * @returns {Object} Normalized course data
 */
export function normalizeCourse(courseData) {
	if (!courseData) return null;
	
	return {
		...courseData,
		status: courseData.status || 'draft',
		modules: courseData.modules || [],
		createdAt: courseData.createdAt || null,
		updatedAt: courseData.updatedAt || null,
		description: courseData.description || ''
	};
}

/**
 * Normalizes module data with default values
 * @param {Object} moduleData - Raw module data from Firestore
 * @returns {Object} Normalized module data
 */
export function normalizeModule(moduleData) {
	if (!moduleData) return null;
	
	return {
		...moduleData,
		lessons: moduleData.lessons || [],
		order: moduleData.order || 0,
		title: moduleData.title || 'Untitled Module'
	};
}

/**
 * Gets progress percentage from enrollment, handling both schemas
 * @param {Object} enrollmentData - Raw enrollment data from Firestore
 * @returns {number} Progress percentage (0-100)
 */
export function getEnrollmentProgress(enrollmentData) {
	const normalized = normalizeEnrollment(enrollmentData);
	return normalized?.progress?.overallProgress || 0;
}

/**
 * Gets completed lessons array from enrollment, handling both schemas
 * @param {Object} enrollmentData - Raw enrollment data from Firestore
 * @returns {Array} Array of completed lesson IDs
 */
export function getCompletedLessons(enrollmentData) {
	const normalized = normalizeEnrollment(enrollmentData);
	return normalized?.progress?.completedLessons || [];
}

/**
 * Gets completed modules array from enrollment, handling both schemas
 * @param {Object} enrollmentData - Raw enrollment data from Firestore
 * @returns {Array} Array of completed module IDs
 */
export function getCompletedModules(enrollmentData) {
	const normalized = normalizeEnrollment(enrollmentData);
	return normalized?.progress?.completedModules || [];
}

/**
 * Checks if a lesson is completed based on enrollment data
 * @param {Object} enrollmentData - Raw enrollment data from Firestore
 * @param {string} lessonId - Lesson ID to check
 * @returns {boolean} True if lesson is completed
 */
export function isLessonCompleted(enrollmentData, lessonId) {
	const completedLessons = getCompletedLessons(enrollmentData);
	return completedLessons.includes(lessonId);
}

/**
 * Checks if a module is completed based on enrollment data
 * @param {Object} enrollmentData - Raw enrollment data from Firestore
 * @param {string} moduleId - Module ID to check
 * @returns {boolean} True if module is completed
 */
export function isModuleCompleted(enrollmentData, moduleId) {
	const completedModules = getCompletedModules(enrollmentData);
	return completedModules.includes(moduleId);
}

