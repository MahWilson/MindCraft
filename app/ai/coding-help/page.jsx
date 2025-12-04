'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Loader2, Code, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function CodingHelpPage() {
	const router = useRouter();
	const { language } = useLanguage();
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [userId, setUserId] = useState(null);
	const [userRole, setUserRole] = useState(null);
	const messagesEndRef = useRef(null);
	const inputRef = useRef(null);

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

	// Auto-scroll to bottom when messages change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	async function handleSend() {
		if (!input.trim() || loading) return;

		const userMessage = {
			id: Date.now(),
			role: 'user',
			content: input.trim(),
			timestamp: new Date()
		};

		setMessages(prev => [...prev, userMessage]);
		setInput('');
		setLoading(true);

		try {
			const response = await fetch('/api/ai', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					action: 'coding_help',
					input: userMessage.content,
					language: language,
					options: {
						conversationHistory: messages
					}
				}),
			});

			const data = await response.json();

			if (data.error) {
				throw new Error(data.error);
			}

			const aiMessage = {
				id: Date.now() + 1,
				role: 'assistant',
				content: data.response,
				suggestions: data.suggestions || [],
				timestamp: new Date()
			};

			setMessages(prev => [...prev, aiMessage]);
		} catch (err) {
			console.error('Error getting AI response:', err);
			const errorMessage = {
				id: Date.now() + 1,
				role: 'assistant',
				content: language === 'bm' 
					? 'Maaf, saya menghadapi ralat. Sila cuba lagi atau semula soalan anda.'
					: 'Sorry, I encountered an error. Please try again or rephrase your question.',
				timestamp: new Date()
			};
			setMessages(prev => [...prev, errorMessage]);
		} finally {
			setLoading(false);
			inputRef.current?.focus();
		}
	}

	function handleSuggestionClick(suggestion) {
		setInput(suggestion);
		inputRef.current?.focus();
	}

	function handleKeyPress(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
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
					<div className="p-2 bg-primary/10 rounded-lg">
						<Code className="h-6 w-6 text-primary" />
					</div>
					<div>
						<h1 className="text-h1 text-neutralDark">
							{language === 'bm' ? 'Bantuan Pengaturcaraan' : 'Coding Help'}
						</h1>
						<p className="text-body text-muted-foreground">
							{language === 'bm' 
								? 'Dapatkan bantuan AI untuk soalan pengaturcaraan, debug, dan konsep pengaturcaraan anda'
								: 'Get AI assistance with your coding questions, debugging, and programming concepts'}
						</p>
					</div>
				</div>
			</div>

			<Card className="h-[600px] flex flex-col">
				<CardHeader className="border-b">
					<CardTitle className="flex items-center gap-2">
						<MessageSquare className="h-5 w-5" />
						{language === 'bm' ? 'Berbual dengan Pembantu AI' : 'Chat with AI Assistant'}
					</CardTitle>
					<CardDescription>
						{language === 'bm' 
							? 'Tanya soalan tentang kod, debug, atau konsep pengaturcaraan. Mesej sebelumnya dikekalkan.'
							: 'Ask questions about code, debugging, or programming concepts. Previous messages are retained.'}
					</CardDescription>
				</CardHeader>
				<CardContent className="flex-1 flex flex-col p-0">
					{/* Messages Area */}
					<div className="flex-1 overflow-y-auto p-6 space-y-4">
						{messages.length === 0 ? (
							<div className="flex items-center justify-center h-full">
								<div className="text-center max-w-md">
									<Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
									<h3 className="text-h3 text-neutralDark mb-2">
										{language === 'bm' ? 'Mulakan Perbualan' : 'Start a Conversation'}
									</h3>
									<p className="text-body text-muted-foreground mb-4">
										{language === 'bm' 
											? 'Tampal kod anda, terangkan bug, atau tanya tentang konsep pengaturcaraan. Saya di sini untuk membantu!'
											: 'Paste your code, describe a bug, or ask about programming concepts. I\'m here to help!'}
									</p>
									<div className="space-y-2 text-left">
										<p className="text-caption text-muted-foreground">
											{language === 'bm' ? 'Cuba tanya:' : 'Try asking:'}
										</p>
										<ul className="text-caption text-muted-foreground space-y-1 list-disc list-inside">
											{language === 'bm' ? (
												<>
													<li>"Kenapa gelung saya tidak berfungsi?"</li>
													<li>"Bantu saya debug ralat ini"</li>
													<li>"Terangkan bagaimana fungsi berfungsi"</li>
												</>
											) : (
												<>
													<li>"Why is my loop not working?"</li>
													<li>"Help me debug this error"</li>
													<li>"Explain how functions work"</li>
												</>
											)}
										</ul>
									</div>
								</div>
							</div>
						) : (
							<>
								{messages.map((message) => (
									<div
										key={message.id}
										className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
									>
										<div
											className={`max-w-[80%] rounded-lg p-4 ${
												message.role === 'user'
													? 'bg-primary text-white'
													: 'bg-neutralLight border border-border'
											}`}
										>
											<div className="text-body whitespace-pre-wrap">{message.content}</div>
											{message.suggestions && message.suggestions.length > 0 && (
												<div className="mt-3 pt-3 border-t border-border/50">
													<p className="text-caption text-muted-foreground mb-2">Suggestions:</p>
													<div className="flex flex-wrap gap-2">
														{message.suggestions.map((suggestion, idx) => (
															<Button
																key={idx}
																variant="outline"
																size="sm"
																onClick={() => handleSuggestionClick(suggestion)}
																className="text-xs"
															>
																{suggestion}
															</Button>
														))}
													</div>
												</div>
											)}
										</div>
									</div>
								))}
								{loading && (
									<div className="flex justify-start">
										<div className="bg-neutralLight border border-border rounded-lg p-4">
											<Loader2 className="h-5 w-5 animate-spin text-primary" />
										</div>
									</div>
								)}
								<div ref={messagesEndRef} />
							</>
						)}
					</div>

					{/* Input Area */}
					<div className="border-t p-4">
						<div className="flex gap-2">
							<textarea
								ref={inputRef}
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyPress={handleKeyPress}
								placeholder={language === 'bm' ? 'Tampal kod anda atau terangkan soalan pengaturcaraan anda...' : 'Paste your code or describe your coding question...'}
								className="flex-1 min-h-[80px] max-h-[200px] px-4 py-3 rounded-lg border border-input bg-background text-body placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
								disabled={loading}
							/>
							<Button
								onClick={handleSend}
								disabled={!input.trim() || loading}
								className="self-end"
								size="lg"
							>
								{loading ? (
									<Loader2 className="h-5 w-5 animate-spin" />
								) : (
									<Send className="h-5 w-5" />
								)}
							</Button>
						</div>
						<p className="text-caption text-muted-foreground mt-2">
							{language === 'bm' ? 'Tekan Enter untuk hantar, Shift+Enter untuk baris baru' : 'Press Enter to send, Shift+Enter for new line'}
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

