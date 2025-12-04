'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, RefreshCw, Lightbulb, BookOpen, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function ExplainConceptPage() {
	const router = useRouter();
	const { language } = useLanguage();
	const [concept, setConcept] = useState('');
	const [explanation, setExplanation] = useState(null);
	const [loading, setLoading] = useState(false);
	const [userId, setUserId] = useState(null);
	const [userRole, setUserRole] = useState(null);
	const [regenerateCount, setRegenerateCount] = useState(0);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setUserId(user.uid);
				const { doc, getDoc } = await import('firebase/firestore');
				const { db } = await import('@/firebase');
				const userDoc = await getDoc(doc(db, 'user', user.uid));
				if (userDoc.exists()) {
					const role = userDoc.data().role;
					setUserRole(role);
					if (role !== 'student' && role !== 'teacher' && role !== 'admin') {
						router.push('/dashboard/student');
					}
				}
			} else {
				router.push('/login');
			}
		});

		return () => unsubscribe();
	}, [router]);

	async function handleExplain() {
		if (!concept.trim() || loading) return;

		setLoading(true);
		setExplanation(null);

		try {
			const response = await fetch('/api/ai', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					action: 'explain_concept',
					input: concept.trim(),
					language: language,
					options: {
						regenerate: regenerateCount > 0
					}
				}),
			});

			const data = await response.json();

			if (data.error) {
				throw new Error(data.error);
			}

			setExplanation(data);
		} catch (err) {
			console.error('Error getting explanation:', err);
			alert(language === 'bm' 
				? 'Maaf, saya menghadapi ralat. Sila cuba lagi.'
				: 'Sorry, I encountered an error. Please try again.');
		} finally {
			setLoading(false);
		}
	}

	async function handleRegenerate() {
		setRegenerateCount(prev => prev + 1);
		await handleExplain();
	}

	function handleKeyPress(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleExplain();
		}
	}

	return (
		<div className="max-w-4xl mx-auto">
			<div className="mb-6">
				<Link href="/dashboard/student">
					<Button variant="ghost" className="mb-4">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Dashboard
					</Button>
				</Link>
				<div className="flex items-center gap-3 mb-2">
					<div className="p-2 bg-secondary/10 rounded-lg">
						<Lightbulb className="h-6 w-6 text-secondary" />
					</div>
					<div>
						<h1 className="text-h1 text-neutralDark">
							{language === 'bm' ? 'Terangkan Konsep' : 'Explain Concept'}
						</h1>
						<p className="text-body text-muted-foreground">
							{language === 'bm' 
								? 'Minta AI untuk menerangkan mana-mana subjek akademik atau konsep dengan cara yang jelas dan membantu'
								: 'Ask AI to explain any academic subject or concept in a clear and helpful way'}
						</p>
					</div>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<BookOpen className="h-5 w-5" />
						{language === 'bm' ? 'Apa yang anda ingin fahami?' : 'What would you like to understand?'}
					</CardTitle>
					<CardDescription>
						{language === 'bm' 
							? 'Taipkan mana-mana konsep, kata kunci, atau subjek akademik. AI akan memberikan penjelasan yang jelas.'
							: 'Type in any concept, keyword, or academic subject. AI will provide a clear explanation.'}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Input Section */}
					<div>
						<label htmlFor="concept" className="block text-sm font-medium mb-2">
							{language === 'bm' ? 'Konsep atau Kata Kunci' : 'Concept or Keyword'}
						</label>
						<div className="flex gap-2">
							<input
								id="concept"
								type="text"
								value={concept}
								onChange={(e) => setConcept(e.target.value)}
								onKeyPress={handleKeyPress}
								placeholder={language === 'bm' ? 'cth., pembolehubah, fungsi, gelung, array, objek...' : 'e.g., variables, functions, loops, arrays, objects...'}
								className="flex-1 px-4 py-3 rounded-lg border border-input bg-background text-body placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								disabled={loading}
							/>
							<Button
								onClick={handleExplain}
								disabled={!concept.trim() || loading}
								size="lg"
							>
								{loading ? (
									<>
										<Loader2 className="h-5 w-5 mr-2 animate-spin" />
										{language === 'bm' ? 'Menerangkan...' : 'Explaining...'}
									</>
								) : (
									<>
										<Sparkles className="h-5 w-5 mr-2" />
										{language === 'bm' ? 'Terangkan' : 'Explain'}
									</>
								)}
							</Button>
						</div>
						<p className="text-caption text-muted-foreground mt-2">
							{language === 'bm' ? 'Tekan Enter untuk dapatkan penjelasan' : 'Press Enter to get explanation'}
						</p>
					</div>

					{/* Explanation Display */}
					{loading && (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-8 w-8 animate-spin text-primary" />
						</div>
					)}

					{explanation && !loading && (
						<div className="space-y-4">
							<div className="border-t pt-6">
								<div className="flex items-center justify-between mb-4">
									<h3 className="text-h3 text-neutralDark">
										{language === 'bm' ? 'Penjelasan' : 'Explanation'}
									</h3>
									<Button
										variant="outline"
										size="sm"
										onClick={handleRegenerate}
										disabled={loading}
									>
										<RefreshCw className="h-4 w-4 mr-2" />
										{language === 'bm' ? 'Jana Semula' : 'Regenerate'}
									</Button>
								</div>
								<div className="prose max-w-none">
									<div className="bg-neutralLight border border-border rounded-lg p-6">
										<p className="text-body text-neutralDark whitespace-pre-wrap mb-4">
											{explanation.explanation}
										</p>
									</div>
								</div>
							</div>

							{explanation.simplified && (
								<div className="border-t pt-6">
									<h4 className="text-h3 text-neutralDark mb-3 flex items-center gap-2">
										<Lightbulb className="h-5 w-5 text-secondary" />
										{language === 'bm' ? 'Ringkasan Ringkas' : 'Simple Summary'}
									</h4>
									<div className="bg-secondary/5 border border-secondary/20 rounded-lg p-4">
										<p className="text-body text-neutralDark">{explanation.simplified}</p>
									</div>
								</div>
							)}

							{explanation.examples && explanation.examples.length > 0 && (
								<div className="border-t pt-6">
									<h4 className="text-h3 text-neutralDark mb-3">
										{language === 'bm' ? 'Contoh' : 'Examples'}
									</h4>
									<div className="space-y-2">
										{explanation.examples.map((example, idx) => (
											<div
												key={idx}
												className="bg-neutralDark text-white rounded-lg p-4 font-mono text-sm"
											>
												{example}
											</div>
										))}
									</div>
								</div>
							)}

							<div className="border-t pt-4">
								<Button
									variant="outline"
									onClick={() => {
										setConcept('');
										setExplanation(null);
										setRegenerateCount(0);
									}}
									className="w-full"
								>
									{language === 'bm' ? 'Tanya Tentang Konsep Lain' : 'Ask About Another Concept'}
								</Button>
							</div>
						</div>
					)}

					{!explanation && !loading && (
						<div className="text-center py-12 border-t">
							<BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
							<p className="text-body text-muted-foreground">
								{language === 'bm' 
									? 'Masukkan konsep di atas untuk mula. Cuba konsep seperti:'
									: 'Enter a concept above to get started. Try concepts like:'}
							</p>
							<div className="flex flex-wrap justify-center gap-2 mt-4">
								{(language === 'bm' 
									? ['pembolehubah', 'fungsi', 'gelung', 'array', 'objek', 'kelas']
									: ['variables', 'functions', 'loops', 'arrays', 'objects', 'classes']
								).map((term) => (
									<Button
										key={term}
										variant="outline"
										size="sm"
										onClick={() => {
											setConcept(term);
											setTimeout(() => handleExplain(), 100);
										}}
									>
										{term}
									</Button>
								))}
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

