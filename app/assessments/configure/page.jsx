'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AssessmentConfigure from './configure';
import {
	ArrowLeft,
	Save,
	Clock,
	Users,
	Bell,
	AlertCircle,
	CheckCircle2,
	Calendar,
	Lock,
} from 'lucide-react';
import Link from 'next/link';

/**
 * Assessment Configuration Page
 * Handles: US006-02 - Configure Assessment
 * Features:
 * - Marking scheme configuration
 * - Availability (start/end dates and times)
 * - Student access control
 * - Notification settings
 * - Deadline enforcement
 */
export default function ConfigureAssessmentPage({ params }) {
	const [assessment, setAssessment] = useState(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [userRole, setUserRole] = useState(null);
	const [activeTab, setActiveTab] = useState('grading'); // 'grading', 'availability', 'access', 'notifications'
	const router = useRouter();
	const assessmentId = params.id;

	// Availability State
	const [startDate, setStartDate] = useState('');
	const [startTime, setStartTime] = useState('');
	const [endDate, setEndDate] = useState('');
	const [endTime, setEndTime] = useState('');
	const [duration, setDuration] = useState('');
	const [showDuration, setShowDuration] = useState(false);

	// Student Access State
	const [studentAccess, setStudentAccess] = useState('online');
	const [maxAttempts, setMaxAttempts] = useState(1);
	const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(false);

	// Notification State
	const [enableReminder, setEnableReminder] = useState(false);
	const [reminderBefore, setReminderBefore] = useState(24);
	const [sendNotificationOnStart, setSendNotificationOnStart] = useState(false);
	const [autoUnavailable, setAutoUnavailable] = useState(true);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (userDoc.exists()) {
					const role = userDoc.data().role;
					setUserRole(role);

					// Only teachers and admins can configure assessments
					if (role !== 'teacher' && role !== 'admin') {
						router.push('/dashboard/student');
						return;
					}

					await loadAssessment();
				}
			} else {
				router.push('/login');
			}
		});
		return () => unsubscribe();
	}, [assessmentId, router]);

	async function loadAssessment() {
		try {
			setLoading(true);
			const docRef = doc(db, 'assessments', assessmentId);
			const docSnap = await getDoc(docRef);

			if (!docSnap.exists()) {
				setError('Assessment not found');
				return;
			}

			const data = docSnap.data();
			setAssessment(data);

			// Load configuration
			const config = data.config || {};
			setStartDate(config.startDate || '');
			setStartTime(config.startTime || '');
			setEndDate(config.endDate || '');
			setEndTime(config.endTime || '');
			setDuration(config.duration || '');
			setShowDuration(config.showDuration || false);
			setStudentAccess(config.studentAccess || 'online');
			setMaxAttempts(config.maxAttempts || 1);
			setAllowMultipleAttempts(config.allowMultipleAttempts || false);
			setEnableReminder(config.enableReminder || false);
			setReminderBefore(config.reminderBefore || 24);
			setSendNotificationOnStart(config.sendNotificationOnStart || false);
			setAutoUnavailable(config.autoUnavailable !== false);
		} catch (err) {
			console.error('Error loading assessment:', err);
			setError('Failed to load assessment');
		} finally {
			setLoading(false);
		}
	}

	async function handleGradingConfigChange(configData) {
		try {
			setError('');
			const docRef = doc(db, 'assessments', assessmentId);
			const currentData = assessment;

			await updateDoc(docRef, {
				config: {
					...currentData.config,
					...configData,
				},
				updatedAt: serverTimestamp(),
			});

			setSuccess('Grading configuration saved successfully!');
			setTimeout(() => setSuccess(''), 3000);
		} catch (err) {
			console.error('Error saving grading config:', err);
			setError(err.message || 'Failed to save configuration');
		}
	}

	async function handleSaveAvailability() {
		try {
			setError('');
			setSubmitting(true);

			// Validation
			if (startDate && endDate) {
				const start = new Date(`${startDate}T${startTime || '00:00'}`);
				const end = new Date(`${endDate}T${endTime || '23:59'}`);
				if (start >= end) {
					setError('Start date/time must be before end date/time');
					setSubmitting(false);
					return;
				}
			}

			const docRef = doc(db, 'assessments', assessmentId);
			const currentData = assessment;

			const configUpdate = {
				...currentData.config,
				startDate: startDate || null,
				startTime: startTime || null,
				endDate: endDate || null,
				endTime: endTime || null,
				duration: duration ? parseInt(duration) : null,
				showDuration,
				autoUnavailable,
			};

			await updateDoc(docRef, {
				config: configUpdate,
				updatedAt: serverTimestamp(),
			});

			setSuccess('Availability settings saved successfully!');
			setTimeout(() => setSuccess(''), 3000);
		} catch (err) {
			console.error('Error saving availability:', err);
			setError(err.message || 'Failed to save availability settings');
		} finally {
			setSubmitting(false);
		}
	}

	async function handleSaveAccess() {
		try {
			setError('');
			setSubmitting(true);

			const docRef = doc(db, 'assessments', assessmentId);
			const currentData = assessment;

			const configUpdate = {
				...currentData.config,
				studentAccess,
				maxAttempts: parseInt(maxAttempts),
				allowMultipleAttempts,
			};

			await updateDoc(docRef, {
				config: configUpdate,
				updatedAt: serverTimestamp(),
			});

			setSuccess('Student access settings saved successfully!');
			setTimeout(() => setSuccess(''), 3000);
		} catch (err) {
			console.error('Error saving access settings:', err);
			setError(err.message || 'Failed to save access settings');
		} finally {
			setSubmitting(false);
		}
	}

	async function handleSaveNotifications() {
		try {
			setError('');
			setSubmitting(true);

			const docRef = doc(db, 'assessments', assessmentId);
			const currentData = assessment;

			const configUpdate = {
				...currentData.config,
				enableReminder,
				reminderBefore: parseInt(reminderBefore),
				sendNotificationOnStart,
			};

			await updateDoc(docRef, {
				config: configUpdate,
				updatedAt: serverTimestamp(),
			});

			setSuccess('Notification settings saved successfully!');
			setTimeout(() => setSuccess(''), 3000);
		} catch (err) {
			console.error('Error saving notifications:', err);
			setError(err.message || 'Failed to save notification settings');
		} finally {
			setSubmitting(false);
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">Loading assessment configuration...</p>
			</div>
		);
	}

	if (!assessment) {
		return null;
	}

	return (
		<div className="max-w-6xl mx-auto">
			{/* Header */}
			<div className="mb-8">
				<Link href="/dashboard/assessments">
					<Button variant="ghost" size="sm" className="mb-4">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Assessments
					</Button>
				</Link>
				<h1 className="text-h1 text-neutralDark">Configure Assessment</h1>
				<p className="text-body text-muted-foreground mt-2">
					{assessment.title} - Set up grading rules, availability, and access controls
				</p>
			</div>

			{/* Global Error/Success Messages */}
			{error && (
				<Card className="mb-6 border-error bg-error/5">
					<CardContent className="pt-6">
						<div className="flex items-start gap-3">
							<AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
							<p className="text-body text-error">{error}</p>
						</div>
					</CardContent>
				</Card>
			)}

			{success && (
				<Card className="mb-6 border-success bg-success/5">
					<CardContent className="pt-6">
						<div className="flex items-start gap-3">
							<CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
							<p className="text-body text-success">{success}</p>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Configuration Tabs */}
			<div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
				{/* Tab Navigation */}
				<div className="lg:col-span-1">
					<div className="space-y-2 sticky top-6">
						{[
							{ id: 'grading', label: 'Grading', icon: '📊' },
							{ id: 'availability', label: 'Availability', icon: '📅' },
							{ id: 'access', label: 'Student Access', icon: '👥' },
							{ id: 'notifications', label: 'Notifications', icon: '🔔' },
						].map((tab) => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`w-full px-4 py-3 text-left rounded-lg font-medium transition-colors ${
									activeTab === tab.id
										? 'bg-primary text-white'
										: 'bg-background border border-input text-neutralDark hover:bg-accent'
								}`}
							>
								<span className="mr-2">{tab.icon}</span>
								{tab.label}
							</button>
						))}
					</div>
				</div>

				{/* Tab Content */}
				<div className="lg:col-span-3">
					{/* Grading Tab */}
					{activeTab === 'grading' && (
						<AssessmentConfigure
							assessment={assessment}
							onConfigChange={handleGradingConfigChange}
							loading={submitting}
						/>
					)}

					{/* Availability Tab */}
					{activeTab === 'availability' && (
						<div className="space-y-6">
							<Card>
								<CardHeader>
									<CardTitle className="text-h2 flex items-center gap-2">
										<Calendar className="h-5 w-5" />
										Assessment Availability
									</CardTitle>
									<p className="text-body text-muted-foreground mt-2">
										Define when students can start and submit the assessment
									</p>
								</CardHeader>
								<CardContent className="space-y-6">
									{/* Start Date/Time */}
									<div className="p-4 border border-input rounded-lg space-y-4">
										<h3 className="text-h3 font-semibold text-neutralDark">Start Date & Time</h3>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div>
												<label className="block text-body font-medium text-neutralDark mb-2">
													Start Date
												</label>
												<Input
													type="date"
													value={startDate}
													onChange={(e) => setStartDate(e.target.value)}
													disabled={submitting}
												/>
											</div>
											<div>
												<label className="block text-body font-medium text-neutralDark mb-2">
													Start Time
												</label>
												<Input
													type="time"
													value={startTime}
													onChange={(e) => setStartTime(e.target.value)}
													disabled={submitting}
												/>
											</div>
										</div>
										<p className="text-caption text-muted-foreground">
											Assessment will become available for students on this date and time
										</p>
									</div>

									{/* End Date/Time */}
									<div className="p-4 border border-input rounded-lg space-y-4">
										<h3 className="text-h3 font-semibold text-neutralDark">End Date & Time</h3>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div>
												<label className="block text-body font-medium text-neutralDark mb-2">
													End Date
												</label>
												<Input
													type="date"
													value={endDate}
													onChange={(e) => setEndDate(e.target.value)}
													disabled={submitting}
												/>
											</div>
											<div>
												<label className="block text-body font-medium text-neutralDark mb-2">
													End Time
												</label>
												<Input
													type="time"
													value={endTime}
													onChange={(e) => setEndTime(e.target.value)}
													disabled={submitting}
												/>
											</div>
										</div>
										<p className="text-caption text-muted-foreground">
											Assessment deadline - students cannot submit after this time
										</p>
									</div>

									{/* Duration Option */}
									<div className="p-4 border border-input rounded-lg space-y-4">
										<h3 className="text-h3 font-semibold text-neutralDark flex items-center gap-2">
											<Clock className="h-5 w-5" />
											Timed Duration
										</h3>
										<div>
											<label className="block text-body font-medium text-neutralDark mb-2">
												Duration (minutes)
											</label>
											<Input
												type="number"
												min="1"
												value={duration}
												onChange={(e) => setDuration(e.target.value)}
												placeholder="e.g., 60 for 1 hour"
												disabled={submitting}
											/>
											<p className="text-caption text-muted-foreground mt-2">
												If set, assessment will auto-close after this duration from start
											</p>
										</div>
										<label className="flex items-center gap-3 cursor-pointer">
											<input
												type="checkbox"
												checked={showDuration}
												onChange={(e) => setShowDuration(e.target.checked)}
												className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-ring cursor-pointer"
												disabled={submitting}
											/>
											<span className="text-body text-neutralDark">
												Show remaining time to students
											</span>
										</label>
									</div>

									{/* Auto Unavailable */}
									<div className="p-4 bg-info/10 border border-info rounded-lg space-y-3">
										<label className="flex items-start gap-3 cursor-pointer">
											<input
												type="checkbox"
												checked={autoUnavailable}
												onChange={(e) => setAutoUnavailable(e.target.checked)}
												className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-ring cursor-pointer mt-1"
												disabled={submitting}
											/>
											<div>
												<span className="text-body font-medium text-neutralDark block">
													Automatically make unavailable after deadline
												</span>
												<span className="text-caption text-muted-foreground">
													Assessment will be hidden from students once the end date/time passes
												</span>
											</div>
										</label>
									</div>

									<Button
										onClick={handleSaveAvailability}
										disabled={submitting}
										size="lg"
										className="w-full"
									>
										<Save className="h-4 w-4 mr-2" />
										{submitting ? 'Saving...' : 'Save Availability Settings'}
									</Button>
								</CardContent>
							</Card>
						</div>
					)}

					{/* Student Access Tab */}
					{activeTab === 'access' && (
						<div className="space-y-6">
							<Card>
								<CardHeader>
									<CardTitle className="text-h2 flex items-center gap-2">
										<Users className="h-5 w-5" />
										Student Access Control
									</CardTitle>
									<p className="text-body text-muted-foreground mt-2">
										Configure how students can interact with this assessment
									</p>
								</CardHeader>
								<CardContent className="space-y-6">
									{/* Access Mode */}
									<div className="p-4 border border-input rounded-lg space-y-4">
										<h3 className="text-h3 font-semibold text-neutralDark flex items-center gap-2">
											<Lock className="h-5 w-5" />
											Access Mode
										</h3>
										<div className="space-y-3">
											{[
												{
													value: 'online',
													label: 'Online Only',
													description: 'Students must take the assessment on the platform',
												},
												{
													value: 'offline',
													label: 'Offline',
													description: 'Assessment can be taken offline and submitted later',
												},
												{
													value: 'disabled',
													label: 'Disabled',
													description: 'Students cannot access this assessment',
												},
											].map((option) => (
												<label key={option.value} className="flex items-start gap-3 p-3 border border-input rounded-lg cursor-pointer hover:bg-accent transition-colors">
													<input
														type="radio"
														name="accessMode"
														value={option.value}
														checked={studentAccess === option.value}
														onChange={(e) => setStudentAccess(e.target.value)}
														className="w-4 h-4 mt-1"
														disabled={submitting}
													/>
													<div>
														<span className="text-body font-medium text-neutralDark block">
															{option.label}
														</span>
														<span className="text-caption text-muted-foreground">
															{option.description}
														</span>
													</div>
												</label>
											))}
										</div>
									</div>

									{/* Attempt Settings */}
									<div className="p-4 border border-input rounded-lg space-y-4">
										<h3 className="text-h3 font-semibold text-neutralDark">Attempt Settings</h3>
										<label className="flex items-center gap-3 cursor-pointer">
											<input
												type="checkbox"
												checked={allowMultipleAttempts}
												onChange={(e) => setAllowMultipleAttempts(e.target.checked)}
												className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-ring cursor-pointer"
												disabled={submitting}
											/>
											<span className="text-body text-neutralDark">Allow multiple attempts</span>
										</label>

										{allowMultipleAttempts && (
											<div>
												<label className="block text-body font-medium text-neutralDark mb-2">
													Maximum Attempts
												</label>
												<Input
													type="number"
													min="1"
													max="10"
													value={maxAttempts}
													onChange={(e) => setMaxAttempts(e.target.value)}
													disabled={submitting}
												/>
											</div>
										)}
									</div>

									<Button
										onClick={handleSaveAccess}
										disabled={submitting}
										size="lg"
										className="w-full"
									>
										<Save className="h-4 w-4 mr-2" />
										{submitting ? 'Saving...' : 'Save Access Settings'}
									</Button>
								</CardContent>
							</Card>
						</div>
					)}

					{/* Notifications Tab */}
					{activeTab === 'notifications' && (
						<div className="space-y-6">
							<Card>
								<CardHeader>
									<CardTitle className="text-h2 flex items-center gap-2">
										<Bell className="h-5 w-5" />
										Notifications & Reminders
									</CardTitle>
									<p className="text-body text-muted-foreground mt-2">
										Configure how and when students are notified about this assessment
									</p>
								</CardHeader>
								<CardContent className="space-y-6">
									{/* Deadline Reminder */}
									<div className="p-4 border border-input rounded-lg space-y-4">
										<label className="flex items-start gap-3 cursor-pointer">
											<input
												type="checkbox"
												checked={enableReminder}
												onChange={(e) => setEnableReminder(e.target.checked)}
												className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-ring cursor-pointer mt-1"
												disabled={submitting}
											/>
											<div className="flex-1">
												<span className="text-body font-medium text-neutralDark block">
													Send deadline reminder notification
												</span>
												<span className="text-caption text-muted-foreground">
													Notify students before the assessment deadline
												</span>
											</div>
										</label>

										{enableReminder && (
											<div className="ml-7">
												<label className="block text-body font-medium text-neutralDark mb-2">
													Send reminder (hours before deadline)
												</label>
												<Input
													type="number"
													min="1"
													max="72"
													value={reminderBefore}
													onChange={(e) => setReminderBefore(e.target.value)}
													disabled={submitting}
												/>
												<p className="text-caption text-muted-foreground mt-2">
													e.g., 24 = send reminder 24 hours before deadline
												</p>
											</div>
										)}
									</div>

									{/* Start Notification */}
									<div className="p-4 border border-input rounded-lg space-y-4">
										<label className="flex items-start gap-3 cursor-pointer">
											<input
												type="checkbox"
												checked={sendNotificationOnStart}
												onChange={(e) => setSendNotificationOnStart(e.target.checked)}
												className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-ring cursor-pointer mt-1"
												disabled={submitting}
											/>
											<div>
												<span className="text-body font-medium text-neutralDark block">
													Send notification when assessment becomes available
												</span>
												<span className="text-caption text-muted-foreground">
													Notify students on the start date/time
												</span>
											</div>
										</label>
									</div>

									{/* Notification Summary */}
									<div className="p-4 bg-accent rounded-lg space-y-2">
										<p className="text-body font-medium text-neutralDark">Notification Summary</p>
										<ul className="text-caption text-muted-foreground space-y-1">
											{sendNotificationOnStart && (
												<li>✓ Notification on availability start</li>
											)}
											{enableReminder && (
												<li>✓ Reminder {reminderBefore} hours before deadline</li>
											)}
											{autoUnavailable && (
												<li>✓ Auto-unavailable after deadline</li>
											)}
											{!sendNotificationOnStart && !enableReminder && (
												<li>No notifications configured</li>
											)}
										</ul>
									</div>

									<Button
										onClick={handleSaveNotifications}
										disabled={submitting}
										size="lg"
										className="w-full"
									>
										<Save className="h-4 w-4 mr-2" />
										{submitting ? 'Saving...' : 'Save Notification Settings'}
									</Button>
								</CardContent>
							</Card>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
