'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, BookOpen, Download, FileText, File, ShieldCheck } from 'lucide-react';
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

	useEffect(() => {
		// Track signed-in user for material downloads
		const unsubscribe = onAuthStateChanged(auth, currentUser => {
			setUser(currentUser);
		});

		return () => unsubscribe();
	}, []);

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

	if (loading) {
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

	return (
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
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-h2">{lesson.title}</CardTitle>
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
										<Download className="h-4 w-4" />
										{downloading ? 'Downloading...' : 'Download'}
									</Button>
									{showDownloadMenu && (
										<div className="absolute right-0 top-full mt-1 w-48 bg-white border border-border rounded-lg shadow-lg z-50">
											<button
												onClick={() => {
													downloadAsPDF();
													setShowDownloadMenu(false);
												}}
												disabled={downloading}
												className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-neutralLight transition-colors rounded-t-lg disabled:opacity-50 disabled:cursor-not-allowed"
											>
												<FileText className="h-4 w-4 text-primary" />
												<span className="text-body">Download as PDF</span>
											</button>
											<button
												onClick={() => {
													downloadAsTXT();
													setShowDownloadMenu(false);
												}}
												disabled={downloading}
												className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-neutralLight transition-colors rounded-b-lg disabled:opacity-50 disabled:cursor-not-allowed"
											>
												<File className="h-4 w-4 text-primary" />
												<span className="text-body">Download as TXT</span>
											</button>
										</div>
									)}
								</div>
							)}
							<Link href={`/courses/${courseId}`}>
								<Button variant="ghost" size="sm">
									<ArrowLeft className="h-4 w-4 mr-2" />
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
					background-color: #F3F4F6;
					color: #DC2626;
					padding: 0.125rem 0.375rem;
					border-radius: 0.25rem;
					font-family: 'Courier New', monospace;
					font-size: 0.875rem;
					font-weight: 500;
				}
				.lesson-content pre {
					background-color: #1f2937;
					color: #f9fafb;
					padding: 1.25rem;
					border-radius: 0.5rem;
					overflow-x: auto;
					margin: 1.5rem 0;
					border-left: 4px solid #4C60FF;
				}
				.lesson-content pre code {
					background-color: transparent;
					color: #f9fafb;
					padding: 0;
				}
				.lesson-content table {
					width: 100%;
					border-collapse: collapse;
					margin: 1.5rem 0;
					border: 2px solid #E5E7EB;
					border-radius: 0.5rem;
					overflow: hidden;
					box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
				}
				.lesson-content th,
				.lesson-content td {
					padding: 0.875rem 1rem;
					text-align: left;
					border: 1px solid #E5E7EB;
				}
				.lesson-content th {
					background-color: #4C60FF;
					color: #FFFFFF;
					font-weight: 600;
					text-transform: uppercase;
					font-size: 0.875rem;
					letter-spacing: 0.05em;
				}
				.lesson-content td {
					background-color: #FFFFFF;
					color: #1A1C23;
				}
				.lesson-content tr:nth-child(even) td {
					background-color: #F9FAFB;
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
			<Card>
				<CardHeader className="flex flex-col gap-1">
					<CardTitle className="text-h4 flex items-center gap-2">
						<Download className="h-5 w-5" />
						Lesson materials
					</CardTitle>
					<p className="text-caption text-muted-foreground flex items-center gap-1">
						<ShieldCheck className="h-4 w-4" />
						Files stay private to signed-in students.
					</p>
					{downloadMessage && (
						<p className="text-caption text-emerald-600">{downloadMessage}</p>
					)}
				</CardHeader>
				<CardContent className="space-y-3">
					{lesson.materials && lesson.materials.length > 0 ? (
						lesson.materials.map(material => (
							<div
								key={material.id || material.url}
								className="flex items-center justify-between rounded-md border border-border bg-muted/40 p-3"
							>
								<div className="space-y-1">
									<p className="text-body font-medium text-neutralDark">{material.name || 'Lesson file'}</p>
									<p className="text-caption text-muted-foreground">
										{material.type || 'file'} {material.size ? `• ${formatFileSize(material.size)}` : ''}
									</p>
									{downloadStatus[material.id] === 'done' && (
										<p className="text-caption text-emerald-600">Checked and downloaded.</p>
									)}
									{downloadStatus[material.id] === 'error' && (
										<p className="text-caption text-error">Download failed, try again.</p>
									)}
									{!user && (
										<p className="text-caption text-amber-600">Sign in to download.</p>
									)}
								</div>
								<Button
									variant="outline"
									onClick={() => handleDownload(material)}
									disabled={!user || downloadStatus[material.id] === 'checking'}
								>
									{downloadStatus[material.id] === 'checking' ? 'Checking...' : 'Download'}
								</Button>
							</div>
						))
					) : (
						<p className="text-body text-muted-foreground">No files shared yet.</p>
					)}
				</CardContent>
			</Card>

			{/* Lesson Navigation */}
			<div className="flex items-center justify-between pt-4 border-t border-border">
				{prevLesson ? (
					<Link href={`/courses/${courseId}/modules/${moduleId}/lessons/${prevLesson.id}`}>
						<Button variant="outline">
							<ArrowLeft className="h-4 w-4 mr-2" />
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
							<ArrowRight className="h-4 w-4 ml-2" />
						</Button>
					</Link>
				) : (
					<Link href={`/courses/${courseId}`}>
						<Button variant="outline">
							Complete Module
							<BookOpen className="h-4 w-4 ml-2" />
						</Button>
					</Link>
				)}
			</div>
		</div>
	);
}

