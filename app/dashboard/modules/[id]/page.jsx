'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/firebase';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RichTextEditor from '@/app/components/RichTextEditor';
import AILearningHelper from '@/app/components/AILearningHelper';
import { ArrowLeft, Plus, Trash2, Edit2, Save, X, Pencil, Eye, Upload, File, Download } from 'lucide-react';
import Link from 'next/link';

export default function ModuleDetailPage() {
	const params = useParams();
	const router = useRouter();
	const moduleId = params.id;
	
	const [module, setModule] = useState(null);
	const [lessons, setLessons] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [editingTitle, setEditingTitle] = useState(false);
	const [newTitle, setNewTitle] = useState('');
	const [newLessonTitle, setNewLessonTitle] = useState('');
	const [newLessonContent, setNewLessonContent] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [successMessage, setSuccessMessage] = useState('');
	const [editingLessonId, setEditingLessonId] = useState(null);
	const [editLessonTitle, setEditLessonTitle] = useState('');
	const [editLessonContent, setEditLessonContent] = useState('');
	const [editLessonMaterials, setEditLessonMaterials] = useState([]);
	const [newLessonMaterials, setNewLessonMaterials] = useState([]);
	const [uploadingFiles, setUploadingFiles] = useState({});
	const [currentUserId, setCurrentUserId] = useState(null);
	const [userRole, setUserRole] = useState(null);
	const fileInputRef = useRef(null);
	const editFileInputRef = useRef(null);

	useEffect(() => {
		loadModule();
		
		// Get current user info for permission checks
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setCurrentUserId(user.uid);
				const userDoc = await getDoc(doc(db, 'user', user.uid));
				if (userDoc.exists()) {
					setUserRole(userDoc.data().role);
				}
			} else {
				setCurrentUserId(null);
				setUserRole(null);
			}
		});
		
		return () => unsubscribe();
	}, [moduleId]);

	async function loadModule() {
		setLoading(true);
		try {
			// Load module
			const moduleDoc = await getDoc(doc(db, 'module', moduleId));
			if (!moduleDoc.exists()) {
				setError('Module not found');
				setLoading(false);
				return;
			}

			const moduleData = { id: moduleDoc.id, ...moduleDoc.data() };
			setModule(moduleData);
			setNewTitle(moduleData.title);

			// Load lessons
			if (moduleData.lessons && moduleData.lessons.length > 0) {
				try {
					const lessonsResponse = await fetch(`/api/lessons?moduleId=${moduleId}`);
					const lessonsData = await lessonsResponse.json();
					
					if (lessonsData.error) {
						console.error('Error fetching lessons:', lessonsData.error);
						// Fallback: load lessons directly from Firestore
						const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
						try {
							const lessonsQuery = query(
								collection(db, 'lesson'),
								where('moduleId', '==', moduleId)
							);
							const snapshot = await getDocs(lessonsQuery);
							const loadedLessons = snapshot.docs.map(doc => ({
								id: doc.id,
								...doc.data(),
							})).sort((a, b) => (a.order || 0) - (b.order || 0));
							setLessons(loadedLessons);
						} catch (fallbackErr) {
							console.error('Fallback lesson loading error:', fallbackErr);
							setLessons([]);
						}
					} else if (lessonsData.lessons) {
						setLessons(lessonsData.lessons);
					} else {
						setLessons([]);
					}
				} catch (err) {
					console.error('Error loading lessons:', err);
					setLessons([]);
				}
			} else {
				setLessons([]);
			}
		} catch (err) {
			console.error('Error loading module:', err);
			setError('Failed to load module');
		} finally {
			setLoading(false);
		}
	}

	async function updateModuleTitle() {
		if (!newTitle.trim()) {
			setEditingTitle(false);
			return;
		}

		setSubmitting(true);
		try {
			await updateDoc(doc(db, 'module', moduleId), {
				title: newTitle.trim(),
				updatedAt: serverTimestamp(),
			});

			setModule(prev => ({ ...prev, title: newTitle.trim() }));
			setEditingTitle(false);
		} catch (err) {
			console.error('Error updating module title:', err);
			alert('Failed to update module title');
		} finally {
			setSubmitting(false);
		}
	}

	async function addLesson() {
		if (!newLessonTitle.trim()) return;

		setSubmitting(true);
		try {
			// Check authentication
			if (!auth.currentUser) {
				throw new Error('You must be signed in to create a lesson');
			}

			// Create lesson directly in Firestore (client-side with Firebase Auth)
			const { collection, addDoc } = await import('firebase/firestore');
			const lessonData = {
				moduleId,
				title: newLessonTitle.trim(),
				contentHtml: newLessonContent || '',
				materials: newLessonMaterials,
				order: lessons.length,
				aiGenerated: false,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			};

			const lessonRef = await addDoc(collection(db, 'lesson'), lessonData);

			// Update module to include this lesson
			const moduleLessons = module?.lessons || [];
			if (!moduleLessons.includes(lessonRef.id)) {
				await updateDoc(doc(db, 'module', moduleId), {
					lessons: [...moduleLessons, lessonRef.id],
					updatedAt: serverTimestamp(),
				});
			}

			// Clear form immediately for better UX
			setNewLessonTitle('');
			setNewLessonContent('');
			setNewLessonMaterials([]);
			setSuccessMessage('Lesson added successfully!');

			// Clear success message after 3 seconds
			setTimeout(() => setSuccessMessage(''), 3000);

			// Reload lessons with a small delay to ensure Firestore has updated
			setTimeout(async () => {
				await loadModule();
			}, 500);
		} catch (err) {
			console.error('Error adding lesson:', err);
			alert(err.message || 'Failed to add lesson');
		} finally {
			setSubmitting(false);
		}
	}

	function startEditLesson(lesson) {
		setEditingLessonId(lesson.id);
		setEditLessonTitle(lesson.title);
		setEditLessonContent(lesson.contentHtml || '');
		setEditLessonMaterials(lesson.materials || []);
	}

	function cancelEditLesson() {
		setEditingLessonId(null);
		setEditLessonTitle('');
		setEditLessonContent('');
		setEditLessonMaterials([]);
	}

	// File upload functions
	async function handleFileUpload(event, isEditMode = false) {
		const file = event.target.files[0];
		if (!file) {
			console.log('No file selected');
			return;
		}

		console.log('File selected:', file.name, 'Type:', file.type, 'Size:', file.size);

		// Validate file size (10MB limit for shared project - to stay within free tier)
		const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
		if (file.size > MAX_FILE_SIZE) {
			alert(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB. This helps us stay within Firebase free tier limits.`);
			// Reset file input
			if (isEditMode) {
				if (editFileInputRef.current) editFileInputRef.current.value = '';
			} else {
				if (fileInputRef.current) fileInputRef.current.value = '';
			}
			return;
		}

		// Validate file type by MIME type and extension
		const allowedMimeTypes = [
			'application/pdf',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
			'application/msword', // .doc
			'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
			'application/vnd.ms-powerpoint', // .ppt
			'image/jpeg',
			'image/png',
			'image/gif',
			'video/mp4',
			'video/mpeg',
		];

		const allowedExtensions = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mpeg'];
		
		// Get file extension
		const fileName = file.name.toLowerCase();
		const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
		
		// Check both MIME type and extension (some browsers don't report correct MIME types)
		const isValidMimeType = allowedMimeTypes.includes(file.type);
		const isValidExtension = allowedExtensions.includes(fileExtension);
		
		console.log('File validation:', { isValidMimeType, isValidExtension, fileExtension, mimeType: file.type });
		
		if (!isValidMimeType && !isValidExtension) {
			alert('File type not supported. Please upload PDF, DOCX, PPTX, images, or videos.');
			// Reset file input
			if (isEditMode) {
				if (editFileInputRef.current) editFileInputRef.current.value = '';
			} else {
				if (fileInputRef.current) fileInputRef.current.value = '';
			}
			return;
		}

		const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		setUploadingFiles(prev => ({ ...prev, [fileId]: true }));

		try {
			console.log('Starting file upload...', { fileId, moduleId, fileName: file.name });
			
			// Check authentication
			if (!auth.currentUser) {
				throw new Error('You must be signed in to upload files');
			}
			
			// Upload to Firebase Storage
			const filePath = `lesson-materials/${moduleId}/${fileId}_${file.name}`;
			console.log('Uploading to path:', filePath);
			const fileRef = ref(storage, filePath);
			
			console.log('Calling uploadBytes...');
			await uploadBytes(fileRef, file);
			console.log('Upload complete, getting download URL...');
			
			const downloadURL = await getDownloadURL(fileRef);
			console.log('Download URL obtained:', downloadURL);

			// Add to materials array (include uploader for delete permissions)
			const material = {
				id: fileId,
				name: file.name,
				url: downloadURL,
				type: file.type || 'application/octet-stream',
				size: file.size,
				uploadedAt: new Date().toISOString(),
				uploadedBy: auth.currentUser.uid, // Track who uploaded for delete permissions
			};

			if (isEditMode) {
				setEditLessonMaterials(prev => [...prev, material]);
				console.log('Material added to edit lesson materials');
			} else {
				setNewLessonMaterials(prev => [...prev, material]);
				console.log('Material added to new lesson materials');
			}
			
			// Reset file input
			if (isEditMode) {
				if (editFileInputRef.current) editFileInputRef.current.value = '';
			} else {
				if (fileInputRef.current) fileInputRef.current.value = '';
			}
			
			setSuccessMessage('File uploaded successfully!');
			setTimeout(() => setSuccessMessage(''), 3000);
		} catch (err) {
			console.error('Error uploading file:', err);
			console.error('Error details:', {
				code: err.code,
				message: err.message,
				stack: err.stack
			});
			
			// Provide more specific error messages
			let errorMessage = 'Failed to upload file';
			if (err.code === 'storage/unauthorized') {
				errorMessage = 'Storage permission denied. Please check Firebase Storage rules.';
			} else if (err.code === 'storage/canceled') {
				errorMessage = 'Upload was canceled.';
			} else if (err.code === 'storage/unknown') {
				errorMessage = 'Unknown storage error occurred.';
			} else if (err.message) {
				errorMessage = err.message;
			}
			
			alert(errorMessage);
			
			// Reset file input
			if (isEditMode) {
				if (editFileInputRef.current) editFileInputRef.current.value = '';
			} else {
				if (fileInputRef.current) fileInputRef.current.value = '';
			}
		} finally {
			setUploadingFiles(prev => {
				const updated = { ...prev };
				delete updated[fileId];
				return updated;
			});
		}
	}

	function canDeleteMaterial(material, module) {
		if (!currentUserId || !module) return false;
		
		// Admin can always delete
		if (userRole === 'admin') return true;
		
		// Module owner can delete
		if (module.createdBy === currentUserId) return true;
		
		// Uploader can delete their own files
		if (material.uploadedBy === currentUserId) return true;
		
		// Note: Collaboration features removed for now - keeping this check for backward compatibility
		if (module.collaborators && Array.isArray(module.collaborators)) {
			if (module.collaborators.includes(currentUserId)) {
				// Collaborators can only delete their own uploads
				return material.uploadedBy === currentUserId;
			}
		}
		
		return false;
	}

	function removeMaterial(materialId, isEditMode = false) {
		const materials = isEditMode ? editLessonMaterials : newLessonMaterials;
		const material = materials.find(m => m.id === materialId);
		
		if (!material) return;
		
		// Check permissions
		if (!canDeleteMaterial(material, module)) {
			alert('You can only delete materials you uploaded, or you must be the module owner or admin.');
			return;
		}
		
		if (isEditMode) {
			setEditLessonMaterials(prev => prev.filter(m => m.id !== materialId));
		} else {
			setNewLessonMaterials(prev => prev.filter(m => m.id !== materialId));
		}
	}

	function getFileIcon(type) {
		if (type?.includes('pdf')) return '📄';
		if (type?.includes('word') || type?.includes('document')) return '📝';
		if (type?.includes('presentation') || type?.includes('powerpoint')) return '📊';
		if (type?.includes('image')) return '🖼️';
		if (type?.includes('video')) return '🎥';
		return '📎';
	}

	function formatFileSize(bytes) {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}

	async function saveLessonEdit(lessonId) {
		if (!editLessonTitle.trim()) {
			alert('Lesson title is required');
			return;
		}

		setSubmitting(true);
		try {
			const lessonRef = doc(db, 'lesson', lessonId);
			await updateDoc(lessonRef, {
				title: editLessonTitle.trim(),
				contentHtml: editLessonContent || '',
				materials: editLessonMaterials,
				updatedAt: serverTimestamp(),
			});

			// Reload lessons
			const lessonsResponse = await fetch(`/api/lessons?moduleId=${moduleId}`);
			const lessonsData = await lessonsResponse.json();
			if (lessonsData.lessons) {
				setLessons(lessonsData.lessons);
			}

			setEditingLessonId(null);
			setEditLessonTitle('');
			setEditLessonContent('');
			setEditLessonMaterials([]);
			setSuccessMessage('Lesson updated successfully!');
			setTimeout(() => setSuccessMessage(''), 3000);
		} catch (err) {
			console.error('Error updating lesson:', err);
			alert(err.message || 'Failed to update lesson');
		} finally {
			setSubmitting(false);
		}
	}

	async function deleteLesson(lessonId) {
		if (!confirm('Delete this lesson?')) return;

		setSubmitting(true);
		try {
			const response = await fetch(`/api/lessons/${lessonId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error);
			}

			// Reload lessons
			const lessonsResponse = await fetch(`/api/lessons?moduleId=${moduleId}`);
			const lessonsData = await lessonsResponse.json();
			if (lessonsData.lessons) {
				setLessons(lessonsData.lessons);
			}
			// Also reload module to update lesson count
			await loadModule();
		} catch (err) {
			console.error('Error deleting lesson:', err);
			alert(err.message || 'Failed to delete lesson');
		} finally {
			setSubmitting(false);
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">Loading module...</p>
			</div>
		);
	}

	if (error || !module) {
		return (
			<Card className="border-error bg-error/5">
				<CardContent className="pt-6">
					<p className="text-body text-error">{error || 'Module not found'}</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="max-w-4xl mx-auto space-y-6">
			{/* Header */}
			<div className="flex items-center gap-3">
				<Link href="/dashboard/modules">
					<Button 
						variant="ghost" 
						size="sm" 
						className="hover:bg-neutralLight transition-colors duration-200"
						title="Return to the module library"
					>
						<ArrowLeft className="h-5 w-5 mr-2" />
						Back to Module Library
					</Button>
				</Link>
			</div>

			{/* Module Title */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						{editingTitle ? (
							<div className="flex items-center gap-2 flex-1">
								<Input
									value={newTitle}
									onChange={(e) => setNewTitle(e.target.value)}
									className="flex-1"
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											updateModuleTitle();
										}
										if (e.key === 'Escape') {
											setEditingTitle(false);
											setNewTitle(module.title);
										}
									}}
								/>
								<Button
									size="sm"
									onClick={updateModuleTitle}
									disabled={submitting}
									title="Save module title"
								>
									<Save className="h-5 w-5" />
								</Button>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => {
										setEditingTitle(false);
										setNewTitle(module.title);
									}}
									title="Cancel editing"
								>
									<X className="h-5 w-5" />
								</Button>
							</div>
						) : (
							<>
								<CardTitle className="text-h2">{module.title}</CardTitle>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setEditingTitle(true)}
									title="Edit module title"
								>
									<Edit2 className="h-5 w-5 mr-2" />
									Edit Title
								</Button>
							</>
						)}
					</div>
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-2 text-caption text-muted-foreground">
						<span>{lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}</span>
					</div>
				</CardContent>
			</Card>

			{/* Lessons List */}
			<Card>
				<CardHeader>
					<CardTitle className="text-h3">Lessons</CardTitle>
					<CardDescription>Manage lessons within this module</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{lessons.length > 0 ? (
						<div className="space-y-2">
							{lessons.map((lesson, index) => (
								<div key={lesson.id}>
									{editingLessonId === lesson.id ? (
										// Edit Mode
										<div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
											<div className="space-y-4">
												<Input
													value={editLessonTitle}
													onChange={(e) => setEditLessonTitle(e.target.value)}
													placeholder="Lesson title"
												/>
												<RichTextEditor
													value={editLessonContent}
													onChange={setEditLessonContent}
													placeholder="Start typing your lesson content..."
												/>
												{/* AI Learning Helper */}
												<AILearningHelper
													currentContent={editLessonContent}
													lessonTitle={editLessonTitle}
													onFormatContent={(formatted) => setEditLessonContent(formatted)}
													onGenerateContent={(generated) => setEditLessonContent(generated)}
												/>
												
												{/* Lesson Materials Section */}
												<div className="space-y-3 pt-2 border-t border-border">
													<div className="flex items-center justify-between">
														<h4 className="text-body font-medium text-neutralDark">Lesson Materials</h4>
														<div>
															<input
																ref={editFileInputRef}
																type="file"
																accept=".pdf,.docx,.doc,.pptx,.ppt,.jpg,.jpeg,.png,.gif,.mp4,.mpeg"
																onChange={(e) => handleFileUpload(e, true)}
																className="hidden"
																disabled={submitting || Object.keys(uploadingFiles).length > 0}
															/>
															<Button
																type="button"
																size="sm"
																variant="outline"
																disabled={submitting || Object.keys(uploadingFiles).length > 0}
																onClick={() => editFileInputRef.current?.click()}
																title="Upload lesson materials (PDF, DOCX, PPTX, images, videos)"
															>
																<Upload className="h-5 w-5 mr-2" />
																{Object.keys(uploadingFiles).length > 0 ? 'Uploading...' : 'Upload Material'}
															</Button>
														</div>
													</div>
													
													{editLessonMaterials.length > 0 && (
														<div className="space-y-2">
															{editLessonMaterials.map((material) => (
																<div
																	key={material.id}
																	className="flex items-center gap-3 p-2 rounded-lg border border-border bg-neutralLight"
																>
																	<span className="text-2xl">{getFileIcon(material.type)}</span>
																	<div className="flex-1 min-w-0">
																		<p className="text-body font-medium text-neutralDark truncate">{material.name}</p>
																		<p className="text-caption text-muted-foreground">{formatFileSize(material.size)}</p>
																	</div>
																	<a
																		href={material.url}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="text-primary hover:text-primary/80"
																		title="Download file"
																	>
																		<Download className="h-4 w-4" />
																	</a>
																	{canDeleteMaterial(material, module) ? (
																		<Button
																			variant="ghost"
																			size="sm"
																			onClick={() => removeMaterial(material.id, true)}
																			disabled={submitting}
																			className="text-error hover:text-error hover:bg-error/10"
																			title="Remove material (only you, module owner, or admin can delete)"
																		>
																			<Trash2 className="h-4 w-4" />
																		</Button>
																	) : (
																		<span className="text-caption text-muted-foreground" title="You can only delete materials you uploaded">
																			Locked
																		</span>
																	)}
																</div>
															))}
														</div>
													)}
													{editLessonMaterials.length === 0 && (
														<p className="text-caption text-muted-foreground italic">
															No materials uploaded yet. Click "Upload Material" to add files.
														</p>
													)}
												</div>
												
												<div className="flex items-center gap-2">
													<Button
														size="sm"
														onClick={() => saveLessonEdit(lesson.id)}
														disabled={submitting || !editLessonTitle.trim()}
														title="Save lesson changes"
													>
														<Save className="h-5 w-5 mr-2" />
														Save
													</Button>
													<Link href={`/dashboard/modules/${moduleId}/lessons/${lesson.id}/preview`}>
														<Button
															size="sm"
															variant="outline"
															disabled={submitting}
															title="Preview lesson as students will see it"
														>
															<Eye className="h-5 w-5 mr-2" />
															Preview
														</Button>
													</Link>
													<Button
														size="sm"
														variant="ghost"
														onClick={cancelEditLesson}
														disabled={submitting}
														title="Cancel editing and discard changes"
													>
														<X className="h-5 w-5 mr-2" />
														Cancel
													</Button>
												</div>
											</div>
										</div>
									) : (
										// View Mode
										<div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-neutralLight hover:border-primary/30 transition-colors duration-200">
											<div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-caption font-medium flex-shrink-0">
												{index + 1}
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-body font-medium text-neutralDark">{lesson.title}</p>
												{lesson.contentHtml && (
													<p className="text-caption text-muted-foreground line-clamp-1">
														{lesson.contentHtml.replace(/<[^>]*>/g, '').substring(0, 50)}...
													</p>
												)}
											</div>
											<div className="flex items-center gap-2 flex-shrink-0">
												<Link href={`/dashboard/modules/${moduleId}/lessons/${lesson.id}/preview`}>
													<Button
														variant="ghost"
														size="sm"
														disabled={submitting}
														className="hover:bg-primary/10"
														title="Preview lesson"
													>
														<Eye className="h-5 w-5" />
													</Button>
												</Link>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => startEditLesson(lesson)}
													disabled={submitting}
													className="hover:bg-primary/10"
													title="Edit lesson"
												>
													<Edit2 className="h-5 w-5" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => deleteLesson(lesson.id)}
													className="text-error hover:text-error hover:bg-error/10"
													disabled={submitting}
													title="Delete lesson"
												>
													<Trash2 className="h-5 w-5" />
												</Button>
											</div>
										</div>
									)}
								</div>
							))}
						</div>
					) : (
						<p className="text-body text-muted-foreground py-4 text-center">
							No lessons in this module yet
						</p>
					)}

					{/* Success Message */}
					{successMessage && (
						<div className="p-3 rounded-lg bg-success/10 border border-success/20">
							<p className="text-caption text-success">{successMessage}</p>
						</div>
					)}

					{/* Add Lesson */}
					<div className="space-y-4 pt-4 border-t border-border">
						<Input
							value={newLessonTitle}
							onChange={(e) => setNewLessonTitle(e.target.value)}
							placeholder="Lesson title"
							onKeyDown={(e) => {
								if (e.key === 'Enter' && e.ctrlKey) {
									e.preventDefault();
									addLesson();
								}
							}}
						/>
						<RichTextEditor
							value={newLessonContent}
							onChange={setNewLessonContent}
							placeholder="Start typing your lesson content..."
						/>
						{/* AI Learning Helper */}
						<AILearningHelper
							currentContent={newLessonContent}
							lessonTitle={newLessonTitle}
							onFormatContent={(formatted) => setNewLessonContent(formatted)}
							onGenerateContent={(generated) => setNewLessonContent(generated)}
						/>
						
						{/* Lesson Materials Section */}
						<div className="space-y-3 pt-2 border-t border-border">
							<div className="flex items-center justify-between">
								<h4 className="text-body font-medium text-neutralDark">Lesson Materials</h4>
								<div>
									<input
										ref={fileInputRef}
										type="file"
										accept=".pdf,.docx,.doc,.pptx,.ppt,.jpg,.jpeg,.png,.gif,.mp4,.mpeg"
										onChange={(e) => handleFileUpload(e, false)}
										className="hidden"
										disabled={submitting || Object.keys(uploadingFiles).length > 0}
									/>
									<Button
										type="button"
										size="sm"
										variant="outline"
										disabled={submitting || Object.keys(uploadingFiles).length > 0}
										onClick={() => fileInputRef.current?.click()}
										title="Upload lesson materials (PDF, DOCX, PPTX, images, videos)"
									>
										<Upload className="h-5 w-5 mr-2" />
										{Object.keys(uploadingFiles).length > 0 ? 'Uploading...' : 'Upload Material'}
									</Button>
								</div>
							</div>
							
							{newLessonMaterials.length > 0 && (
								<div className="space-y-2">
									{newLessonMaterials.map((material) => (
										<div
											key={material.id}
											className="flex items-center gap-3 p-2 rounded-lg border border-border bg-neutralLight"
										>
											<span className="text-2xl">{getFileIcon(material.type)}</span>
											<div className="flex-1 min-w-0">
												<p className="text-body font-medium text-neutralDark truncate">{material.name}</p>
												<p className="text-caption text-muted-foreground">{formatFileSize(material.size)}</p>
											</div>
											<a
												href={material.url}
												target="_blank"
												rel="noopener noreferrer"
												className="text-primary hover:text-primary/80"
												title="Download file"
											>
												<Download className="h-4 w-4" />
											</a>
											{canDeleteMaterial(material, module) ? (
												<Button
													variant="ghost"
													size="sm"
													onClick={() => removeMaterial(material.id, false)}
													disabled={submitting}
													className="text-error hover:text-error hover:bg-error/10"
													title="Remove material (only you, module owner, or admin can delete)"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											) : (
												<span className="text-caption text-muted-foreground" title="You can only delete materials you uploaded">
													Locked
												</span>
											)}
										</div>
									))}
								</div>
							)}
							{newLessonMaterials.length === 0 && (
								<p className="text-caption text-muted-foreground italic">
									No materials uploaded yet. Click "Upload Material" to add files.
								</p>
							)}
						</div>
						
						<Button
							onClick={addLesson}
							disabled={submitting || !newLessonTitle.trim()}
							variant="outline"
							title="Add a new lesson to this module"
						>
							<Plus className="h-5 w-5 mr-2" />
							{submitting ? 'Adding...' : 'Add Lesson'}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

