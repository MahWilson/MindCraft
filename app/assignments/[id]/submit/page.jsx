'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Upload, File, X, CheckCircle, AlertCircle, Loader2, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function SubmitAssignmentPage() {
	const params = useParams();
	const router = useRouter();
	const { language } = useLanguage();
	const assignmentId = params.id;
	const fileInputRef = useRef(null);

	const [assignment, setAssignment] = useState(null);
	const [submission, setSubmission] = useState(null);
	const [uploadedFiles, setUploadedFiles] = useState([]);
	const [uploading, setUploading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [loading, setLoading] = useState(true);
	const [currentUserId, setCurrentUserId] = useState(null);
	const [error, setError] = useState('');
	const [successMessage, setSuccessMessage] = useState('');
	const [userRole, setUserRole] = useState(null);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setCurrentUserId(user.uid);
				const { doc, getDoc } = await import('firebase/firestore');
				const userDoc = await getDoc(doc(db, 'user', user.uid));
				if (userDoc.exists()) {
					const role = userDoc.data().role;
					setUserRole(role);
					if (role !== 'student') {
						router.push('/assignments');
					} else {
						await loadData();
					}
				}
			} else {
				router.push('/login');
			}
		});

		return () => unsubscribe();
	}, [assignmentId, router]);

	async function loadData() {
		setLoading(true);
		try {
			// Load assignment
			const assignmentDoc = await getDoc(doc(db, 'assignment', assignmentId));
			if (!assignmentDoc.exists()) {
				setError(language === 'bm' ? 'Tugasan tidak dijumpai' : 'Assignment not found');
				setLoading(false);
				return;
			}

			const assignmentData = { id: assignmentDoc.id, ...assignmentDoc.data() };
			setAssignment(assignmentData);

			// Check if assignment is open and published
			if (assignmentData.status !== 'published' || !assignmentData.isOpen) {
				setError(language === 'bm' 
					? 'Tugasan ini tidak tersedia untuk penyerahan' 
					: 'This assignment is not available for submission');
				setLoading(false);
				return;
			}

			// Check if deadline has passed
			if (assignmentData.deadline) {
				const deadlineDate = assignmentData.deadline.toDate 
					? assignmentData.deadline.toDate() 
					: new Date(assignmentData.deadline);
				const now = new Date();
				if (deadlineDate < now && !assignmentData.allowLateSubmissions) {
					setError(language === 'bm' 
						? 'Tarikh akhir telah tamat dan penyerahan lewat tidak dibenarkan' 
						: 'Deadline has passed and late submissions are not allowed');
					setLoading(false);
					return;
				}
			}

			// Load existing submission if any
			if (currentUserId) {
				const submissionsQuery = query(
					collection(db, 'submission'),
					where('assignmentId', '==', assignmentId),
					where('studentId', '==', currentUserId)
				);
				const submissionsSnapshot = await getDocs(submissionsQuery);
				
				if (!submissionsSnapshot.empty) {
					const existingSubmission = {
						id: submissionsSnapshot.docs[0].id,
						...submissionsSnapshot.docs[0].data(),
					};
					setSubmission(existingSubmission);
					setUploadedFiles(existingSubmission.files || []);
				}
			}
		} catch (err) {
			console.error('Error loading data:', err);
			setError(language === 'bm' 
				? 'Gagal memuatkan tugasan' 
				: 'Failed to load assignment');
		} finally {
			setLoading(false);
		}
	}

	async function handleFileUpload(event) {
		const file = event.target.files[0];
		if (!file) return;

		// Validate file size (10MB limit)
		const MAX_FILE_SIZE = 10 * 1024 * 1024;
		if (file.size > MAX_FILE_SIZE) {
			alert(language === 'bm' 
				? `Saiz fail mestilah kurang daripada ${MAX_FILE_SIZE / 1024 / 1024}MB` 
				: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
			if (fileInputRef.current) fileInputRef.current.value = '';
			return;
		}

		// Validate file type
		const allowedMimeTypes = [
			'application/pdf',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/msword',
			'application/zip',
			'application/x-zip-compressed',
			'text/plain',
			'text/markdown',
			'text/x-python',
			'text/javascript',
			'text/x-java',
			'image/jpeg',
			'image/png',
		];

		const allowedExtensions = ['.pdf', '.docx', '.doc', '.zip', '.txt', '.md', '.py', '.js', '.java', '.jpg', '.jpeg', '.png'];
		const fileName = file.name.toLowerCase();
		const fileExtension = fileName.substring(fileName.lastIndexOf('.'));

		const isValidMimeType = allowedMimeTypes.includes(file.type);
		const isValidExtension = allowedExtensions.includes(fileExtension);

		if (!isValidMimeType && !isValidExtension) {
			alert(language === 'bm' 
				? 'Jenis fail tidak disokong. Sila muat naik PDF, DOCX, ZIP, fail teks, atau imej.' 
				: 'File type not supported. Please upload PDF, DOCX, ZIP, text files, or images.');
			if (fileInputRef.current) fileInputRef.current.value = '';
			return;
		}

		const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		setUploading(true);

		try {
			if (!auth.currentUser) {
				throw new Error('You must be signed in to upload files');
			}

			// Upload to Firebase Storage
			const filePath = `assignment-submissions/${assignmentId}/${fileId}_${file.name}`;
			const fileRef = ref(storage, filePath);
			
			await uploadBytes(fileRef, file);
			const downloadURL = await getDownloadURL(fileRef);

			const fileData = {
				id: fileId,
				name: file.name,
				url: downloadURL,
				type: file.type || 'application/octet-stream',
				size: file.size,
				uploadedAt: new Date().toISOString(),
			};

			setUploadedFiles(prev => [...prev, fileData]);
			setSuccessMessage(language === 'bm' ? 'Fail dimuat naik dengan jayanya!' : 'File uploaded successfully!');
			setTimeout(() => setSuccessMessage(''), 3000);
		} catch (err) {
			console.error('Error uploading file:', err);
			alert(language === 'bm' 
				? 'Gagal memuat naik fail: ' + (err.message || 'Ralat tidak diketahui')
				: 'Failed to upload file: ' + (err.message || 'Unknown error'));
		} finally {
			setUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = '';
		}
	}

	function removeFile(fileId) {
		setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
	}

	async function handleSubmit() {
		if (uploadedFiles.length === 0) {
			alert(language === 'bm' 
				? 'Sila muat naik sekurang-kurangnya satu fail' 
				: 'Please upload at least one file');
			return;
		}

		setSubmitting(true);
		setError('');

		try {
			if (!auth.currentUser) {
				throw new Error('You must be signed in to submit');
			}

			const submissionData = {
				assignmentId,
				studentId: auth.currentUser.uid,
				files: uploadedFiles.map(f => ({
					name: f.name,
					url: f.url,
					type: f.type,
					size: f.size,
				})),
				status: 'submitted',
				submittedAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
			};

			if (submission) {
				// Update existing submission
				await updateDoc(doc(db, 'submission', submission.id), submissionData);
				setSuccessMessage(language === 'bm' ? 'Tugasan dikemas kini dengan jayanya!' : 'Assignment updated successfully!');
			} else {
				// Create new submission
				await addDoc(collection(db, 'submission'), submissionData);
				setSuccessMessage(language === 'bm' ? 'Tugasan dihantar dengan jayanya!' : 'Assignment submitted successfully!');
			}

			setTimeout(() => {
				router.push('/assignments');
			}, 2000);
		} catch (err) {
			console.error('Error submitting assignment:', err);
			setError(language === 'bm' 
				? 'Gagal menghantar tugasan: ' + (err.message || 'Ralat tidak diketahui')
				: 'Failed to submit assignment: ' + (err.message || 'Unknown error'));
		} finally {
			setSubmitting(false);
		}
	}

	function formatFileSize(bytes) {
		if (bytes < 1024) return bytes + ' B';
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}

	function formatDate(timestamp) {
		if (!timestamp) return language === 'bm' ? 'Tiada' : 'N/A';
		const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
		return date.toLocaleDateString(language === 'bm' ? 'ms-MY' : 'en-US', { 
			year: 'numeric', 
			month: 'short', 
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function isDeadlinePassed(deadline) {
		if (!deadline) return false;
		const deadlineDate = deadline.toDate ? deadline.toDate() : new Date(deadline);
		return deadlineDate < new Date();
	}

	if (loading) {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">
						{language === 'bm' ? 'Hantar Tugasan' : 'Submit Assignment'}
					</h1>
					<p className="text-body text-muted-foreground">
						{language === 'bm' ? 'Memuatkan...' : 'Loading...'}
					</p>
				</div>
			</div>
		);
	}

	if (error && !assignment) {
		return (
			<div className="space-y-8">
				<Link href="/assignments">
					<Button variant="ghost" className="mb-4">
						<ArrowLeft className="h-4 w-4 mr-2" />
						{language === 'bm' ? 'Kembali ke Tugasan' : 'Back to Assignments'}
					</Button>
				</Link>
				<Card>
					<CardContent className="py-12 text-center">
						<AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
						<p className="text-body text-destructive">{error}</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (userRole !== 'student') {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">
						{language === 'bm' ? 'Hantar Tugasan' : 'Submit Assignment'}
					</h1>
					<p className="text-body text-muted-foreground">
						{language === 'bm' ? 'Akses ditolak.' : 'Access denied.'}
					</p>
				</div>
			</div>
		);
	}

	const deadlinePassed = assignment?.deadline ? isDeadlinePassed(assignment.deadline) : false;

	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<Link href="/assignments">
					<Button variant="ghost" className="mb-4" title={language === 'bm' ? 'Kembali ke Tugasan' : 'Back to Assignments'}>
						<ArrowLeft className="h-4 w-4 mr-2" />
						{language === 'bm' ? 'Kembali ke Tugasan' : 'Back to Assignments'}
					</Button>
				</Link>
				<h1 className="text-h1 text-neutralDark mb-2">
					{language === 'bm' ? 'Hantar Tugasan' : 'Submit Assignment'}
				</h1>
				<p className="text-body text-muted-foreground">{assignment?.title}</p>
			</div>

			{/* Assignment Details */}
			{assignment && (
				<Card>
					<CardHeader>
						<CardTitle>{assignment.title}</CardTitle>
						<CardDescription>
							{language === 'bm' ? 'Butiran Tugasan' : 'Assignment Details'}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{assignment.description && (
							<div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: assignment.description }} />
						)}
						
						<div className="space-y-2">
							{assignment.deadline && (
								<div className="flex items-center gap-2 text-sm">
									<Calendar className={`h-5 w-5 ${deadlinePassed ? 'text-destructive' : 'text-muted-foreground'}`} />
									<span className={deadlinePassed ? 'text-destructive font-medium' : 'text-muted-foreground'}>
										{language === 'bm' ? 'Tarikh akhir:' : 'Due:'} {formatDate(assignment.deadline)}
									</span>
									{deadlinePassed && (
										<span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">
											{language === 'bm' ? 'Lewat' : 'Late'}
										</span>
									)}
								</div>
							)}
							{assignment.allowLateSubmissions && deadlinePassed && (
								<div className="flex items-center gap-2 text-sm text-info">
									<Clock className="h-4 w-4" />
									{language === 'bm' ? 'Penyerahan lewat dibenarkan' : 'Late submissions allowed'}
								</div>
							)}
						</div>

						{submission && (
							<div className="p-3 bg-info/10 border border-info/20 rounded-lg">
								<p className="text-sm text-info flex items-center gap-2">
									<CheckCircle className="h-4 w-4" />
									{language === 'bm' 
										? 'Anda telah menghantar tugasan ini. Memuat naik fail baharu akan mengemas kini penyerahan anda.'
										: 'You have already submitted this assignment. Uploading new files will update your submission.'}
								</p>
								{submission.submittedAt && (
									<p className="text-xs text-muted-foreground mt-1">
										{language === 'bm' ? 'Dihantar pada:' : 'Submitted on:'} {formatDate(submission.submittedAt)}
									</p>
								)}
							</div>
						)}
					</CardContent>
				</Card>
			)}

			{/* File Upload Section */}
			<Card>
				<CardHeader>
					<CardTitle>{language === 'bm' ? 'Muat Naik Fail' : 'Upload Files'}</CardTitle>
					<CardDescription>
						{language === 'bm' 
							? 'Muat naik fail tugasan anda (PDF, DOCX, ZIP, fail teks, atau imej). Maksimum 10MB setiap fail.'
							: 'Upload your assignment files (PDF, DOCX, ZIP, text files, or images). Maximum 10MB per file.'}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<input
						ref={fileInputRef}
						type="file"
						onChange={handleFileUpload}
						className="hidden"
						accept=".pdf,.docx,.doc,.zip,.txt,.md,.py,.js,.java,.jpg,.jpeg,.png"
					/>

					<Button
						onClick={() => fileInputRef.current?.click()}
						disabled={uploading}
						variant="outline"
						className="w-full"
						title={language === 'bm' ? 'Klik untuk memilih fail untuk dimuat naik' : 'Click to select a file to upload'}
					>
						{uploading ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								{language === 'bm' ? 'Memuat naik...' : 'Uploading...'}
							</>
						) : (
							<>
								<Upload className="h-4 w-4 mr-2" />
								{language === 'bm' ? 'Pilih Fail' : 'Choose File'}
							</>
						)}
					</Button>

					{successMessage && (
						<div className="p-3 bg-success/10 border border-success/20 rounded-lg">
							<p className="text-sm text-success">{successMessage}</p>
						</div>
					)}

					{error && (
						<div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
							<p className="text-sm text-destructive">{error}</p>
						</div>
					)}

					{/* Uploaded Files List */}
					{uploadedFiles.length > 0 && (
						<div className="space-y-2">
							<h4 className="text-h4 font-medium">
								{language === 'bm' ? 'Fail yang Dimuat Naik' : 'Uploaded Files'} ({uploadedFiles.length})
							</h4>
							<div className="space-y-2">
								{uploadedFiles.map((file) => (
									<div
										key={file.id}
										className="flex items-center justify-between p-3 border rounded-lg"
									>
										<div className="flex items-center gap-3 flex-1">
											<File className="h-5 w-5 text-muted-foreground" />
											<div className="flex-1 min-w-0">
												<p className="text-body font-medium truncate">{file.name}</p>
												<p className="text-sm text-muted-foreground">
													{formatFileSize(file.size)}
												</p>
											</div>
										</div>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => removeFile(file.id)}
											title={language === 'bm' ? 'Buang fail' : 'Remove file'}
										>
											<X className="h-4 w-4" />
										</Button>
									</div>
								))}
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Submit Button */}
			<div className="flex gap-4">
				<Button
					onClick={handleSubmit}
					disabled={submitting || uploadedFiles.length === 0}
					className="flex-1"
					title={language === 'bm' ? 'Hantar tugasan anda' : 'Submit your assignment'}
				>
					{submitting ? (
						<>
							<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							{submission ? (language === 'bm' ? 'Mengemas kini...' : 'Updating...') : (language === 'bm' ? 'Menghantar...' : 'Submitting...')}
						</>
					) : (
						<>
							{submission ? (language === 'bm' ? 'Kemas Kini Penyerahan' : 'Update Submission') : (language === 'bm' ? 'Hantar Tugasan' : 'Submit Assignment')}
						</>
					)}
				</Button>
				<Link href="/assignments">
					<Button variant="outline" title={language === 'bm' ? 'Batal dan kembali' : 'Cancel and go back'}>
						{language === 'bm' ? 'Batal' : 'Cancel'}
					</Button>
				</Link>
			</div>
		</div>
	);
}

