'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { query, collection, where, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, BookOpen, Download, FileText, File, ShieldCheck, List, Eye, X, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function LessonPage() {
	const params = useParams();
	const router = useRouter();
	const { id: courseId, moduleId, lessonId } = params;
	
	const [lesson, setLesson] = useState(null);
	const [module, setModule] = useState(null);
	const [course, setCourse] = useState(null);
	const [allLessons, setAllLessons] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [currentLessonIndex, setCurrentLessonIndex] = useState(-1);
	// State for HTML content downloads
	const [downloading, setDownloading] = useState(false);
	const [showDownloadMenu, setShowDownloadMenu] = useState(false);
	const contentRef = useRef(null);
	const downloadMenuRef = useRef(null);
	// State for secure lesson material downloads
	const [user, setUser] = useState(null);
	const [downloadStatus, setDownloadStatus] = useState({});
	const [downloadMessage, setDownloadMessage] = useState('');
	const [tableOfContents, setTableOfContents] = useState([]);
	const [activeSection, setActiveSection] = useState('');
	const [showTOC, setShowTOC] = useState(true);
	const [userRole, setUserRole] = useState(null);
	const [isEnrolled, setIsEnrolled] = useState(false);
	const [accessChecked, setAccessChecked] = useState(false);
	const [viewingMaterial, setViewingMaterial] = useState(null);
	const [textContent, setTextContent] = useState({});
	const [isLessonCompleted, setIsLessonCompleted] = useState(false);
	const [completingLesson, setCompletingLesson] = useState(false);

	useEffect(() => {
		// Track signed-in user for material downloads and check access
		const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
			setUser(currentUser);
			
			if (currentUser && courseId) {
				// Get user role
				try {
					const userDoc = await getDoc(doc(db, 'user', currentUser.uid));
					if (userDoc.exists()) {
						const role = userDoc.data().role;
						setUserRole(role);
						
						// For students, check enrollment and lesson completion
						if (role === 'student') {
							try {
								const enrollmentId = `${currentUser.uid}_${courseId}`;
								const enrollmentDoc = await getDoc(doc(db, 'enrollment', enrollmentId));
								const enrolled = enrollmentDoc.exists();
								setIsEnrolled(enrolled);
								
								// Check if lesson is completed
								if (enrolled && lessonId) {
									const enrollmentData = enrollmentDoc.data();
									const completedLessons = enrollmentData?.progress?.completedLessons || [];
									setIsLessonCompleted(completedLessons.includes(lessonId));
								}
								
								console.log('Enrollment check:', { enrollmentId, enrolled, courseId, userId: currentUser.uid });
							} catch (err) {
								console.error('Error checking enrollment:', err);
								setIsEnrolled(false);
							}
						} else if (role === 'teacher' || role === 'admin') {
							// Teachers and admins have access
							setIsEnrolled(true);
						}
					} else {
						// User document doesn't exist, treat as guest
						setUserRole(null);
						setIsEnrolled(false);
					}
				} catch (err) {
					console.error('Error loading user data:', err);
					setUserRole(null);
					setIsEnrolled(false);
				}
			} else if (!currentUser) {
				// Not logged in
				setUserRole(null);
				setIsEnrolled(false);
			}
			setAccessChecked(true);
		});

		return () => unsubscribe();
	}, [courseId]);

	useEffect(() => {
		async function loadLesson() {
			try {
				// Load lesson
				const lessonDoc = await getDoc(doc(db, 'lesson', lessonId));
				if (!lessonDoc.exists()) {
					setError('Lesson not found');
					setLoading(false);
					return;
				}

				const lessonData = { id: lessonDoc.id, ...lessonDoc.data() };
				setLesson(lessonData);

				// Load module
				const moduleDoc = await getDoc(doc(db, 'module', moduleId));
				if (moduleDoc.exists()) {
					const moduleData = { id: moduleDoc.id, ...moduleDoc.data() };
					setModule(moduleData);

					// Load all lessons in module to get navigation
					if (moduleData.lessons && moduleData.lessons.length > 0) {
						const lessonsResponse = await fetch(`/api/lessons?moduleId=${moduleId}`);
						const lessonsData = await lessonsResponse.json();
						if (lessonsData.lessons) {
							setAllLessons(lessonsData.lessons);
							const index = lessonsData.lessons.findIndex(l => l.id === lessonId);
							setCurrentLessonIndex(index);
						}
					}
				}

				// Load course for breadcrumb
				const courseDoc = await getDoc(doc(db, 'course', courseId));
				if (courseDoc.exists()) {
					setCourse({ id: courseDoc.id, ...courseDoc.data() });
				}
			} catch (err) {
				console.error('Error loading lesson:', err);
				setError('Failed to load lesson');
			} finally {
				setLoading(false);
			}
		}

		if (courseId && moduleId && lessonId) {
			loadLesson();
		}
	}, [courseId, moduleId, lessonId]);

	const nextLesson = currentLessonIndex >= 0 && currentLessonIndex < allLessons.length - 1 
		? allLessons[currentLessonIndex + 1] 
		: null;
	const prevLesson = currentLessonIndex > 0 
		? allLessons[currentLessonIndex - 1] 
		: null;

	// Extract table of contents after content is rendered
	useEffect(() => {
		if (!lesson?.contentHtml || !contentRef.current) return;

		const contentDiv = contentRef.current;
		const headings = contentDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
		const toc = [];

		headings.forEach((heading, index) => {
			const id = `section-${index}`;
			if (!heading.id) {
				heading.id = id;
			}
			toc.push({
				id: heading.id,
				text: heading.textContent.trim(),
				level: parseInt(heading.tagName.charAt(1)),
			});
		});

		setTableOfContents(toc);
		if (toc.length > 0) {
			setActiveSection(toc[0].id);
		}
	}, [lesson?.contentHtml]);

	// Scroll to section
	function scrollToSection(sectionId) {
		const element = document.getElementById(sectionId);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
			setActiveSection(sectionId);
		}
	}

	// Track active section on scroll
	useEffect(() => {
		if (tableOfContents.length === 0) return;

		function handleScroll() {
			const scrollPosition = window.scrollY + 100; // Offset for fixed header
			
			for (let i = tableOfContents.length - 1; i >= 0; i--) {
				const section = document.getElementById(tableOfContents[i].id);
				if (section && section.offsetTop <= scrollPosition) {
					setActiveSection(tableOfContents[i].id);
					break;
				}
			}
		}

		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, [tableOfContents]);

	// Close download menu when clicking outside
	useEffect(() => {
		function handleClickOutside(event) {
			if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
				setShowDownloadMenu(false);
			}
		}
		if (showDownloadMenu) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [showDownloadMenu]);

	// Function to strip HTML and convert to plain text
	function htmlToText(html) {
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = html;
		
		// Replace line breaks
		tempDiv.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
		
		// Replace headings with newlines and bold
		tempDiv.querySelectorAll('h1, h2, h3').forEach(h => {
			h.replaceWith(`\n\n${h.textContent}\n\n`);
		});
		
		// Replace paragraphs with newlines
		tempDiv.querySelectorAll('p').forEach(p => {
			p.replaceWith(`${p.textContent}\n\n`);
		});
		
		// Replace list items
		tempDiv.querySelectorAll('li').forEach(li => {
			li.replaceWith(`• ${li.textContent}\n`);
		});
		
		// Replace tables
		tempDiv.querySelectorAll('table').forEach(table => {
			let tableText = '\n';
			table.querySelectorAll('tr').forEach(tr => {
				const cells = Array.from(tr.querySelectorAll('th, td')).map(cell => cell.textContent.trim());
				tableText += cells.join(' | ') + '\n';
			});
			table.replaceWith(tableText + '\n');
		});
		
		// Get text and clean up
		let text = tempDiv.textContent || tempDiv.innerText || '';
		text = text.replace(/\n{3,}/g, '\n\n'); // Replace multiple newlines with double
		text = text.trim();
		
		return text;
	}

	// Download as TXT
	async function downloadAsTXT() {
		if (!lesson || !lesson.contentHtml) return;
		
		setDownloading(true);
		try {
			const text = htmlToText(lesson.contentHtml);
			const header = `${lesson.title}\n${course ? `Course: ${course.title}\n` : ''}${module ? `Module: ${module.title}\n` : ''}\n${'='.repeat(50)}\n\n`;
			const fullText = header + text;
			
			const blob = new Blob([fullText], { type: 'text/plain' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${lesson.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error('Error downloading TXT:', err);
			alert('Failed to download as TXT');
		} finally {
			setDownloading(false);
		}
	}

	// Download as PDF
	async function downloadAsPDF() {
		if (!lesson || !contentRef.current) return;
		
		setDownloading(true);
		try {
			const element = contentRef.current;
			
			// Create canvas from content
			const canvas = await html2canvas(element, {
				scale: 2,
				useCORS: true,
				backgroundColor: '#ffffff',
				logging: false,
			});
			
			const imgData = canvas.toDataURL('image/png');
			
			// Calculate PDF dimensions
			const imgWidth = canvas.width;
			const imgHeight = canvas.height;
			const pdfWidth = 210; // A4 width in mm
			const pdfHeight = (imgHeight * pdfWidth) / imgWidth;
			
			// Create PDF
			const pdf = new jsPDF('p', 'mm', 'a4');
			const pageHeight = pdf.internal.pageSize.height;
			let heightLeft = pdfHeight;
			let position = 0;
			
			// Add header
			pdf.setFontSize(18);
			pdf.text(lesson.title, 10, 15);
			if (course) {
				pdf.setFontSize(12);
				pdf.text(`Course: ${course.title}`, 10, 25);
			}
			if (module) {
				pdf.setFontSize(12);
				pdf.text(`Module: ${module.title}`, 10, 30);
			}
			position = 35;
			heightLeft = pdfHeight;
			
			// Add content image
			pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
			heightLeft -= pageHeight;
			
			// Add new pages if content is longer than one page
			while (heightLeft > 0) {
				position = heightLeft - pdfHeight;
				pdf.addPage();
				pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
				heightLeft -= pageHeight;
			}
			
			// Save PDF
			pdf.save(`${lesson.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
		} catch (err) {
			console.error('Error downloading PDF:', err);
			alert('Failed to download as PDF');
		} finally {
			setDownloading(false);
		}
	}

	// this is for file size text
	function formatFileSize(bytes) {
		if (!bytes && bytes !== 0) return '';
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	// Check if material can be viewed inline
	function canViewInline(material) {
		if (!material || !material.type) return false;
		const type = material.type.toLowerCase();
		const name = (material.name || '').toLowerCase();
		
		// PDFs can be viewed in iframe
		if (type.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
		// Images can be displayed
		if (type.includes('image') || /\.(jpg|jpeg|png|gif)$/i.test(name)) return 'image';
		// Videos can be played
		if (type.includes('video') || /\.(mp4|mpeg|webm)$/i.test(name)) return 'video';
		// Text files can be displayed
		if (type.includes('text') || name.endsWith('.txt')) return 'text';
		
		return false;
	}

	// Open material viewer
	function handleView(material) {
		if (!user) {
			setDownloadMessage('Sign in to view files.');
			return;
		}
		setViewingMaterial(material);
	}

	// Close material viewer
	function closeViewer() {
		setViewingMaterial(null);
		setTextContent('');
	}

	// Load text file content for inline display
	useEffect(() => {
		if (lesson && lesson.materials) {
			const textMaterials = lesson.materials.filter(m => canViewInline(m) === 'text');
			if (textMaterials.length > 0) {
				textMaterials.forEach(material => {
					fetch(material.url)
						.then(res => res.text())
						.then(text => {
							setTextContent(prev => ({ ...prev, [material.id]: text }));
						})
						.catch(err => {
							console.error('Error loading text file:', err);
							setTextContent(prev => ({ ...prev, [material.id]: 'Error loading file content.' }));
						});
				});
			}
		}
	}, [lesson]);

	// Handle lesson completion
	async function handleCompleteLesson() {
		if (!user || !courseId || !lessonId || userRole !== 'student') return;

		setCompletingLesson(true);
		try {
			const enrollmentId = `${user.uid}_${courseId}`;
			const enrollmentRef = doc(db, 'enrollment', enrollmentId);
			const enrollmentDoc = await getDoc(enrollmentRef);

			if (!enrollmentDoc.exists()) {
				alert('You must be enrolled in this course to complete lessons.');
				setCompletingLesson(false);
				return;
			}

			const enrollmentData = enrollmentDoc.data();
			const completedLessons = enrollmentData?.progress?.completedLessons || [];

			// Check if already completed
			if (completedLessons.includes(lessonId)) {
				setIsLessonCompleted(true);
				setCompletingLesson(false);
				return;
			}

			// Update enrollment with completed lesson
			await updateDoc(enrollmentRef, {
				'progress.completedLessons': arrayUnion(lessonId),
				updatedAt: serverTimestamp(),
			});

			setIsLessonCompleted(true);
			
			// Show success message
			console.log('Lesson marked as complete');
		} catch (err) {
			console.error('Error completing lesson:', err);
			alert('Failed to mark lesson as complete. Please try again.');
		} finally {
			setCompletingLesson(false);
		}
	}

	// this is for downloading lesson materials from storage
	async function handleDownload(material) {
		if (!user) {
			setDownloadMessage('Sign in to download files.');
			return;
		}

		setDownloadMessage('');
		setDownloadStatus(prev => ({ ...prev, [material.id]: 'checking' }));

		try {
			const response = await fetch(material.url);
			if (!response.ok) {
				throw new Error('Download blocked or missing.');
			}

			const blob = await response.blob();

			// simple integrity check
			if (!blob.size) {
				throw new Error('File looks empty, try again.');
			}

			if (material.type && blob.type && material.type !== blob.type) {
				console.warn('File type mismatch', { expected: material.type, got: blob.type });
			}

			const objectUrl = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = objectUrl;
			link.download = material.name || 'lesson-material';
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(objectUrl);

			setDownloadStatus(prev => ({ ...prev, [material.id]: 'done' }));
			setDownloadMessage('Download checked and saved.');
		} catch (err) {
			console.error('Error downloading file:', err);
			setDownloadStatus(prev => ({ ...prev, [material.id]: 'error' }));
			setDownloadMessage(err.message || 'Download failed.');
		}
	}

	if (loading || !accessChecked) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">Loading lesson...</p>
			</div>
		);
	}

	if (error || !lesson) {
		return (
			<Card className="border-error bg-error/5">
				<CardContent className="pt-6">
					<p className="text-body text-error">{error || 'Lesson not found'}</p>
				</CardContent>
			</Card>
		);
	}

	// Check access - require login for all users
	if (!user) {
		return (
			<Card className="border-error bg-error/5">
				<CardContent className="pt-6 space-y-4">
					<p className="text-body text-error font-semibold">Login Required</p>
					<p className="text-body text-muted-foreground">
						Please log in to view this lesson.
					</p>
					<Link href="/login">
						<Button>
							Go to Login
						</Button>
					</Link>
				</CardContent>
			</Card>
		);
	}

	// Check access for students - must be enrolled
	if (userRole === 'student' && !isEnrolled) {
		return (
			<Card className="border-error bg-error/5">
				<CardContent className="pt-6 space-y-4">
					<p className="text-body text-error font-semibold">Access Denied</p>
					<p className="text-body text-muted-foreground">
						You need to enroll in this course to view its lessons.
					</p>
					<Link href={`/courses/${courseId}`}>
						<Button>
							Go to Course Page
						</Button>
					</Link>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="relative">
			<div className="max-w-4xl mx-auto space-y-6">
			{/* Breadcrumb Navigation */}
			<div className="flex items-center gap-2 text-caption text-muted-foreground">
				<Link href="/courses" className="hover:text-neutralDark transition-colors">
					Courses
				</Link>
				<span>/</span>
				{course && (
					<>
						<Link href={`/courses/${courseId}`} className="hover:text-neutralDark transition-colors">
							{course.title}
						</Link>
						<span>/</span>
					</>
				)}
				{module && (
					<>
						<span>{module.title}</span>
						<span>/</span>
					</>
				)}
				<span className="text-neutralDark">{lesson.title}</span>
			</div>

			{/* Lesson Content */}
			<Card className="shadow-lg border-2">
				<CardHeader className="bg-gradient-to-r from-primary/5 to-background border-b-2">
					<div className="flex items-center justify-between">
						<CardTitle className="text-h2 font-bold">{lesson.title}</CardTitle>
						<div className="flex items-center gap-2">
							{/* Download Dropdown */}
							{lesson.contentHtml && (
								<div className="relative" ref={downloadMenuRef}>
									<Button 
										variant="outline" 
										size="sm" 
										disabled={downloading}
										onClick={() => setShowDownloadMenu(!showDownloadMenu)}
										className="flex items-center gap-2"
									>
										<Download className="h-6 w-6 text-neutralDark flex-shrink-0" />
										{downloading ? 'Downloading...' : 'Download'}
									</Button>
									{showDownloadMenu && (
										<div className="absolute right-0 top-full mt-1 min-w-[200px] bg-white border border-border rounded-lg shadow-lg z-50">
											<button
												onClick={() => {
													downloadAsPDF();
													setShowDownloadMenu(false);
												}}
												disabled={downloading}
												className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-neutralLight transition-colors rounded-t-lg disabled:opacity-50 disabled:cursor-not-allowed"
											>
												<FileText className="h-6 w-6 text-primary flex-shrink-0" />
												<span className="text-body">Download as PDF</span>
											</button>
											<button
												onClick={() => {
													downloadAsTXT();
													setShowDownloadMenu(false);
												}}
												disabled={downloading}
												className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-neutralLight transition-colors rounded-b-lg disabled:opacity-50 disabled:cursor-not-allowed"
											>
												<File className="h-6 w-6 text-primary flex-shrink-0" />
												<span className="text-body">Download as TXT</span>
											</button>
										</div>
									)}
								</div>
							)}
							<Link href={`/courses/${courseId}`}>
								<Button variant="ghost" size="sm">
									<ArrowLeft className="h-5 w-5 mr-2 text-neutralDark" />
									Back to Course
								</Button>
							</Link>
						</div>
					</div>
				</CardHeader>
				<CardContent className="prose max-w-none">
					{lesson.contentHtml ? (
						<div 
							ref={contentRef}
							dangerouslySetInnerHTML={{ __html: lesson.contentHtml }}
							className="text-body text-neutralDark lesson-content"
						/>
					) : (
						<p className="text-body text-muted-foreground">No content available for this lesson yet.</p>
					)}
				</CardContent>
			</Card>

			{/* Style for lesson content */}
			<style jsx global>{`
				.lesson-content h1 {
					font-size: 2rem;
					font-weight: 600;
					margin-top: 1.5rem;
					margin-bottom: 1rem;
					color: #1A1C23;
					padding-bottom: 0.5rem;
					border-bottom: 2px solid #4C60FF;
				}
				.lesson-content h2 {
					font-size: 1.5rem;
					font-weight: 600;
					margin-top: 1.5rem;
					margin-bottom: 0.75rem;
					color: #1A1C23;
					padding-left: 0.75rem;
					border-left: 4px solid #4C60FF;
				}
				.lesson-content h3 {
					font-size: 1.25rem;
					font-weight: 500;
					margin-top: 1.25rem;
					margin-bottom: 0.5rem;
					color: #374151;
				}
				.lesson-content p {
					margin-bottom: 1rem;
					line-height: 1.7;
					color: #4B5563;
				}
				.lesson-content ul {
					margin-left: 0;
					margin-bottom: 1.5rem;
					padding-left: 0;
					list-style: none;
				}
				.lesson-content ul li {
					margin-bottom: 0.75rem;
					padding-left: 1.75rem;
					position: relative;
					line-height: 1.6;
					color: #4B5563;
				}
				.lesson-content ul li::before {
					content: "•";
					position: absolute;
					left: 0.5rem;
					color: #4C60FF;
					font-weight: bold;
					font-size: 1.25rem;
					line-height: 1.2;
				}
				.lesson-content ol {
					margin-left: 1.5rem;
					margin-bottom: 1.5rem;
					padding-left: 0.5rem;
				}
				.lesson-content ol li {
					margin-bottom: 0.75rem;
					line-height: 1.6;
					color: #4B5563;
					padding-left: 0.5rem;
				}
				.lesson-content li strong {
					color: #1A1C23;
					font-weight: 600;
				}
				.lesson-content a {
					color: #4C60FF;
					text-decoration: underline;
					font-weight: 500;
				}
				.lesson-content a:hover {
					color: #3d4dcc;
				}
				.lesson-content code {
					background-color: #000000;
					color: #10B981;
					padding: 0.125rem 0.375rem;
					border-radius: 0.25rem;
					font-family: 'Courier New', 'Monaco', 'Consolas', monospace;
					font-size: 0.875rem;
					font-weight: 500;
					border: 1px solid #374151;
				}
				.lesson-content pre {
					background-color: #000000;
					color: #F9FAFB;
					padding: 1.25rem;
					border-radius: 0.5rem;
					overflow-x: auto;
					margin: 1.5rem 0;
					border-left: 4px solid #4C60FF;
					box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
				}
				.lesson-content pre code {
					background-color: transparent;
					color: #F9FAFB;
					padding: 0;
					border: none;
				}
				.lesson-content table {
					width: 100%;
					border-collapse: collapse;
					margin: 1.5rem 0;
					border: 2px solid #374151;
					border-radius: 0.5rem;
					overflow: hidden;
					box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
					background-color: #000000;
				}
				.lesson-content th,
				.lesson-content td {
					padding: 0.875rem 1rem;
					text-align: left;
					border: 1px solid #374151;
				}
				.lesson-content th {
					background-color: #1F2937;
					color: #FFFFFF;
					font-weight: 600;
					text-transform: uppercase;
					font-size: 0.875rem;
					letter-spacing: 0.05em;
				}
				.lesson-content td {
					background-color: #111827;
					color: #F9FAFB;
				}
				.lesson-content tr:nth-child(even) td {
					background-color: #1F2937;
				}
				.lesson-content strong {
					font-weight: 600;
					color: #1A1C23;
				}
				.lesson-content em {
					font-style: italic;
					color: #6B7280;
				}
				.lesson-content blockquote {
					border-left: 4px solid #4C60FF;
					padding-left: 1rem;
					margin: 1.5rem 0;
					color: #6B7280;
					font-style: italic;
					background-color: #F9FAFB;
					padding: 1rem 1rem 1rem 1.5rem;
					border-radius: 0.25rem;
				}
			`}</style>

			{/* Lesson Materials */}
			{lesson.materials && lesson.materials.length > 0 && (
				<Card>
					<CardHeader className="flex flex-col gap-1">
						<CardTitle className="text-h4 flex items-center gap-2">
							<Download className="h-8 w-8 text-primary" />
							Lesson materials
						</CardTitle>
						<p className="text-caption text-muted-foreground flex items-center gap-1">
							<ShieldCheck className="h-5 w-5 text-primary" />
							Files stay private to signed-in students.
						</p>
						{downloadMessage && (
							<p className="text-caption text-emerald-600">{downloadMessage}</p>
						)}
					</CardHeader>
					<CardContent className="space-y-4">
						{lesson.materials.map(material => {
							const viewType = canViewInline(material);
							return (
								<div key={material.id || material.url} className="space-y-2">
									{viewType === 'pdf' && (
										<div className="border border-border rounded-lg overflow-hidden">
											<div className="bg-muted/40 px-4 py-2 border-b border-border flex items-center justify-between">
												<p className="text-body font-medium text-neutralDark">{material.name || 'PDF Document'}</p>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleDownload(material)}
													disabled={!user || downloadStatus[material.id] === 'checking'}
												>
													<Download className="h-5 w-5 mr-1" />
													Download
												</Button>
											</div>
											<iframe
												src={material.url}
												className="w-full h-[600px] border-0"
												title={material.name}
											/>
										</div>
									)}
									{viewType === 'image' && (
										<div className="border border-border rounded-lg overflow-hidden">
											<div className="bg-muted/40 px-4 py-2 border-b border-border flex items-center justify-between">
												<p className="text-body font-medium text-neutralDark">{material.name || 'Image'}</p>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleDownload(material)}
													disabled={!user || downloadStatus[material.id] === 'checking'}
												>
													<Download className="h-5 w-5 mr-1" />
													Download
												</Button>
											</div>
											<div className="flex items-center justify-center bg-black/5 p-4">
												<img
													src={material.url}
													alt={material.name}
													className="max-w-full max-h-[600px] object-contain rounded"
												/>
											</div>
										</div>
									)}
									{viewType === 'video' && (
										<div className="border border-border rounded-lg overflow-hidden">
											<div className="bg-muted/40 px-4 py-2 border-b border-border flex items-center justify-between">
												<p className="text-body font-medium text-neutralDark">{material.name || 'Video'}</p>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleDownload(material)}
													disabled={!user || downloadStatus[material.id] === 'checking'}
												>
													<Download className="h-5 w-5 mr-1" />
													Download
												</Button>
											</div>
											<div className="flex items-center justify-center bg-black p-4">
												<video
													src={material.url}
													controls
													className="max-w-full max-h-[600px] rounded"
												>
													Your browser does not support the video tag.
												</video>
											</div>
										</div>
									)}
									{viewType === 'text' && (
										<div className="border border-border rounded-lg overflow-hidden">
											<div className="bg-muted/40 px-4 py-2 border-b border-border flex items-center justify-between">
												<p className="text-body font-medium text-neutralDark">{material.name || 'Text File'}</p>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleDownload(material)}
													disabled={!user || downloadStatus[material.id] === 'checking'}
												>
													<Download className="h-5 w-5 mr-1" />
													Download
												</Button>
											</div>
											<div className="bg-black text-green-400 p-4 rounded font-mono text-sm overflow-auto max-h-[400px]">
												<pre className="whitespace-pre-wrap">{textContent[material.id] || 'Loading text content...'}</pre>
											</div>
										</div>
									)}
									{!viewType && (
										<div className="flex items-center justify-between rounded-md border border-border bg-muted/40 p-3">
											<div className="space-y-1">
												<p className="text-body font-medium text-neutralDark">{material.name || 'Lesson file'}</p>
												<p className="text-caption text-muted-foreground">
													{material.type || 'file'} {material.size ? `• ${formatFileSize(material.size)}` : ''}
												</p>
											</div>
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleDownload(material)}
												disabled={!user || downloadStatus[material.id] === 'checking'}
											>
												<Download className="h-5 w-5 mr-1" />
												{downloadStatus[material.id] === 'checking' ? 'Checking...' : 'Download'}
											</Button>
										</div>
									)}
								</div>
							);
						})}
					</CardContent>
				</Card>
			)}

			{/* Lesson Completion and Navigation */}
			<div className="space-y-4 pt-4 border-t border-border">
				{/* Complete Lesson Button (for students only) */}
				{userRole === 'student' && isEnrolled && !isLessonCompleted && (
					<div className="flex justify-center">
						<Button
							onClick={handleCompleteLesson}
							disabled={completingLesson}
							size="lg"
							className="flex items-center gap-2 px-6 py-3"
						>
							<CheckCircle2 className="h-5 w-5" />
							{completingLesson ? 'Marking as Complete...' : 'Complete Lesson'}
						</Button>
					</div>
				)}
				
				{/* Completion Status */}
				{userRole === 'student' && isEnrolled && isLessonCompleted && (
					<div className="flex justify-center">
						<div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success/10 text-success border border-success/20">
							<CheckCircle2 className="h-5 w-5" />
							<span className="text-body font-medium">Lesson Completed</span>
						</div>
					</div>
				)}

				{/* Lesson Navigation */}
				<div className="flex items-center justify-between">
					{prevLesson ? (
						<Link href={`/courses/${courseId}/modules/${moduleId}/lessons/${prevLesson.id}`}>
							<Button variant="outline">
								<ArrowLeft className="h-5 w-5 mr-2 text-neutralDark" />
								Previous Lesson
							</Button>
						</Link>
					) : (
						<div></div>
					)}

					{nextLesson ? (
						<Link href={`/courses/${courseId}/modules/${moduleId}/lessons/${nextLesson.id}`}>
							<Button>
								Next Lesson
								<ArrowRight className="h-5 w-5 ml-2 text-white" />
							</Button>
						</Link>
					) : (
						<Link href={`/courses/${courseId}`}>
							<Button variant="outline">
								<BookOpen className="h-5 w-5 mr-2 text-neutralDark" />
								Back to Course
							</Button>
						</Link>
					)}
				</div>
			</div>
			</div>

			{/* Floating Table of Contents Sidebar */}
			{tableOfContents.length > 0 && (
				<div className={`fixed right-4 top-24 w-64 bg-white dark:bg-slate-800 border border-border rounded-lg shadow-lg z-40 transition-all duration-300 ${showTOC ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'}`}>
					<div className="p-4 border-b border-border flex items-center justify-between">
						<div className="flex items-center gap-2">
							<List className="h-5 w-5 text-primary flex-shrink-0" />
							<h3 className="text-sm font-semibold text-neutralDark">Table of Contents</h3>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowTOC(!showTOC)}
							className="h-6 w-6 p-0"
						>
							×
						</Button>
					</div>
					<div className="p-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
						<nav className="space-y-1">
							{tableOfContents.map((item) => (
								<button
									key={item.id}
									onClick={() => scrollToSection(item.id)}
									className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
										activeSection === item.id
											? 'bg-primary text-white font-medium'
											: 'text-muted-foreground hover:bg-neutralLight hover:text-neutralDark'
									}`}
									style={{ paddingLeft: `${(item.level - 1) * 0.75 + 0.75}rem` }}
								>
									{item.text}
								</button>
							))}
						</nav>
					</div>
				</div>
			)}

			{/* Toggle TOC Button (when hidden) */}
			{!showTOC && tableOfContents.length > 0 && (
				<button
					onClick={() => setShowTOC(true)}
					className="fixed right-4 top-24 w-12 h-12 bg-primary text-white rounded-full shadow-lg flex items-center justify-center z-40 hover:bg-primary/90 transition-colors"
					title="Show Table of Contents"
				>
					<List className="h-6 w-6 text-white" />
				</button>
			)}

			{/* Material Viewer Modal */}
			{viewingMaterial && (
				<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeViewer}>
					<div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
						{/* Header */}
						<div className="flex items-center justify-between p-4 border-b border-border">
							<h3 className="text-h4 font-semibold text-neutralDark truncate flex-1">
								{viewingMaterial.name || 'View Material'}
							</h3>
							<Button
								variant="ghost"
								size="sm"
								onClick={closeViewer}
								className="flex-shrink-0"
							>
								<X className="h-5 w-5" />
							</Button>
						</div>
						
						{/* Content */}
						<div className="flex-1 overflow-auto p-4">
							{canViewInline(viewingMaterial) === 'pdf' && (
								<iframe
									src={viewingMaterial.url}
									className="w-full h-full min-h-[600px] border border-border rounded"
									title={viewingMaterial.name}
								/>
							)}
							{canViewInline(viewingMaterial) === 'image' && (
								<div className="flex items-center justify-center">
									<img
										src={viewingMaterial.url}
										alt={viewingMaterial.name}
										className="max-w-full max-h-[70vh] object-contain rounded"
									/>
								</div>
							)}
							{canViewInline(viewingMaterial) === 'video' && (
								<div className="flex items-center justify-center">
									<video
										src={viewingMaterial.url}
										controls
										className="max-w-full max-h-[70vh] rounded"
									>
										Your browser does not support the video tag.
									</video>
								</div>
							)}
							{canViewInline(viewingMaterial) === 'text' && (
								<div className="bg-black text-green-400 p-4 rounded font-mono text-sm overflow-auto max-h-[70vh]">
									<pre className="whitespace-pre-wrap">{textContent || 'Loading text content...'}</pre>
								</div>
							)}
							{!canViewInline(viewingMaterial) && (
								<div className="text-center py-12">
									<p className="text-body text-muted-foreground mb-4">
										This file type cannot be previewed in the browser.
									</p>
									<Button onClick={() => handleDownload(viewingMaterial)}>
										<Download className="h-4 w-4 mr-2" />
										Download to View
									</Button>
								</div>
							)}
						</div>
						
						{/* Footer */}
						<div className="flex items-center justify-between p-4 border-t border-border">
							<p className="text-caption text-muted-foreground">
								{viewingMaterial.type || 'file'} {viewingMaterial.size ? `• ${formatFileSize(viewingMaterial.size)}` : ''}
							</p>
							<div className="flex gap-2">
								<Button variant="outline" onClick={() => handleDownload(viewingMaterial)}>
									<Download className="h-4 w-4 mr-2" />
									Download
								</Button>
								<Button onClick={closeViewer}>
									Close
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

