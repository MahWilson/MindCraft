import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

/**
 * Assessment Configuration Utilities
 */

/**
 * Check if assessment is available for student to attempt
 * @param {Object} assessment - Assessment object with config
 * @param {string} userId - User ID to check attempts
 * @returns {Object} { available: boolean, reason: string, status: string }
 */
export async function checkAssessmentAvailability(assessmentId, userId) {
	try {
		const response = await fetch(`/api/assessments/${assessmentId}/check-availability`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ userId }),
		});

		const data = await response.json();
		return data;
	} catch (error) {
		console.error('Error checking assessment availability:', error);
		return {
			success: false,
			available: false,
			reason: 'Failed to check availability',
		};
	}
}

/**
 * Format deadline for display
 * @param {string|Date} deadline - Deadline date/time
 * @returns {string} Formatted deadline string
 */
export function formatDeadline(deadline) {
	if (!deadline) return 'No deadline';
	
	const date = new Date(deadline);
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

/**
 * Calculate remaining time until deadline
 * @param {string|Date} deadline - Deadline date/time
 * @returns {Object} { days, hours, minutes, total_ms, expired: boolean }
 */
export function calculateTimeRemaining(deadline) {
	const now = new Date();
	const deadlineDate = new Date(deadline);
	const diff = deadlineDate - now;

	if (diff <= 0) {
		return {
			days: 0,
			hours: 0,
			minutes: 0,
			seconds: 0,
			total_ms: 0,
			expired: true,
		};
	}

	const days = Math.floor(diff / (1000 * 60 * 60 * 24));
	const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
	const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
	const seconds = Math.floor((diff % (1000 * 60)) / 1000);

	return {
		days,
		hours,
		minutes,
		seconds,
		total_ms: diff,
		expired: false,
	};
}

/**
 * Format time remaining for display
 * @param {Object} timeRemaining - Result from calculateTimeRemaining
 * @returns {string} Formatted string like "2 days, 3 hours"
 */
export function formatTimeRemaining(timeRemaining) {
	if (timeRemaining.expired) return 'Expired';

	const parts = [];
	if (timeRemaining.days > 0) parts.push(`${timeRemaining.days} day${timeRemaining.days > 1 ? 's' : ''}`);
	if (timeRemaining.hours > 0) parts.push(`${timeRemaining.hours} hour${timeRemaining.hours > 1 ? 's' : ''}`);
	if (timeRemaining.minutes > 0) parts.push(`${timeRemaining.minutes} minute${timeRemaining.minutes > 1 ? 's' : ''}`);

	if (parts.length === 0) return `${timeRemaining.seconds} seconds`;
	return parts.join(', ');
}

/**
 * Get assessment status badge color
 * @param {string} status - Status from check-availability response
 * @returns {string} Tailwind color class
 */
export function getAssessmentStatusColor(status) {
	const statusColors = {
		available: 'bg-success/10 text-success border-success',
		not_published: 'bg-warning/10 text-warning border-warning',
		access_disabled: 'bg-error/10 text-error border-error',
		not_started: 'bg-info/10 text-info border-info',
		deadline_passed: 'bg-error/10 text-error border-error',
		max_attempts_reached: 'bg-error/10 text-error border-error',
	};
	return statusColors[status] || 'bg-muted/10 text-muted-foreground border-muted';
}

/**
 * Calculate passing percentage
 * @param {number} passingMarks - Passing marks
 * @param {number} totalMarks - Total marks
 * @returns {number} Percentage (0-100)
 */
export function calculatePassingPercentage(passingMarks, totalMarks) {
	if (totalMarks === 0) return 0;
	return ((passingMarks / totalMarks) * 100).toFixed(1);
}

/**
 * Validate grading configuration
 * @param {Object} config - Configuration object
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateGradingConfig(config) {
	const errors = [];

	if (!config.totalMarks || config.totalMarks <= 0) {
		errors.push('Total marks must be greater than 0');
	}

	if (config.passingMarks < 0 || config.passingMarks > config.totalMarks) {
		errors.push('Passing marks must be between 0 and total marks');
	}

	if (config.weightage && config.weightage.length > 0) {
		const totalWeight = config.weightage.reduce((sum, w) => sum + (parseFloat(w.weight) || 0), 0);
		if (totalWeight > 0 && totalWeight !== 100) {
			errors.push(`Weightage must sum to 100%. Current: ${totalWeight}%`);
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Validate availability configuration
 * @param {Object} config - Configuration object
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateAvailabilityConfig(config) {
	const errors = [];

	if (config.startDate && config.endDate) {
		const start = new Date(config.startDate);
		const end = new Date(config.endDate);
		if (start >= end) {
			errors.push('Start date must be before end date');
		}
	}

	if (config.duration && config.duration <= 0) {
		errors.push('Duration must be greater than 0');
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}
