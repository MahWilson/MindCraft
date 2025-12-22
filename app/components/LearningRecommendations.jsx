'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, X, Bookmark, ArrowRight, TrendingUp, AlertCircle, CheckCircle, Lightbulb, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function LearningRecommendations() {
	const router = useRouter();
	const [recommendations, setRecommendations] = useState([]);
	const [loading, setLoading] = useState(true);
	const [savedRecommendations, setSavedRecommendations] = useState(new Set());
	const [ignoredRecommendations, setIgnoredRecommendations] = useState(new Set());
	const [currentUserId, setCurrentUserId] = useState(null);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setCurrentUserId(user.uid);
			}
		});

		return () => unsubscribe();
	}, []);

	useEffect(() => {
		if (currentUserId) {
			loadSavedAndIgnored();
			fetchRecommendations();
		}
	}, [currentUserId]);

	async function loadSavedAndIgnored() {
		if (!currentUserId) return;
		
		try {
			const savedQuery = query(
				collection(db, 'recommendation_preference'),
				where('studentId', '==', currentUserId),
				where('action', '==', 'saved')
			);
			const savedSnapshot = await getDocs(savedQuery);
			const saved = new Set();
			savedSnapshot.forEach(doc => {
				saved.add(doc.data().recommendationId);
			});
			setSavedRecommendations(saved);

			const ignoredQuery = query(
				collection(db, 'recommendation_preference'),
				where('studentId', '==', currentUserId),
				where('action', '==', 'ignored')
			);
			const ignoredSnapshot = await getDocs(ignoredQuery);
			const ignored = new Set();
			ignoredSnapshot.forEach(doc => {
				ignored.add(doc.data().recommendationId);
			});
			setIgnoredRecommendations(ignored);
		} catch (err) {
			console.error('Error loading saved/ignored recommendations:', err);
		}
	}

	async function fetchRecommendations() {
		setLoading(true);
		try {
			const response = await fetch('/api/ai/recommendations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ language: 'en' }),
			});

			if (!response.ok) {
				throw new Error('Failed to fetch recommendations');
			}

			const data = await response.json();
			// Filter out ignored recommendations
			const filtered = data.recommendations.filter(rec => {
				const recId = `${rec.type}_${rec.title}`;
				return !ignoredRecommendations.has(recId);
			});
			setRecommendations(filtered);
		} catch (err) {
			console.error('Error fetching recommendations:', err);
		} finally {
			setLoading(false);
		}
	}

	async function saveRecommendation(recommendation) {
		if (!currentUserId) return;
		
		const recId = `${recommendation.type}_${recommendation.title}`;
		try {
			await setDoc(doc(db, 'recommendation_preference', `${currentUserId}_${recId}`), {
				studentId: currentUserId,
				recommendationId: recId,
				recommendation: recommendation,
				action: 'saved',
				savedAt: new Date().toISOString(),
			});
			setSavedRecommendations(prev => new Set([...prev, recId]));
		} catch (err) {
			console.error('Error saving recommendation:', err);
			alert('Failed to save recommendation');
		}
	}

	async function ignoreRecommendation(recommendation) {
		if (!currentUserId) return;
		
		const recId = `${recommendation.type}_${recommendation.title}`;
		try {
			await setDoc(doc(db, 'recommendation_preference', `${currentUserId}_${recId}`), {
				studentId: currentUserId,
				recommendationId: recId,
				recommendation: recommendation,
				action: 'ignored',
				ignoredAt: new Date().toISOString(),
			});
			setIgnoredRecommendations(prev => new Set([...prev, recId]));
			// Remove from displayed recommendations
			setRecommendations(prev => prev.filter(rec => `${rec.type}_${rec.title}` !== recId));
		} catch (err) {
			console.error('Error ignoring recommendation:', err);
			alert('Failed to ignore recommendation');
		}
	}

	function getPriorityIcon(priority) {
		switch (priority) {
			case 'high':
				return <AlertCircle className="h-4 w-4 text-error" />;
			case 'medium':
				return <TrendingUp className="h-4 w-4 text-warning" />;
			case 'low':
				return <CheckCircle className="h-4 w-4 text-success" />;
			default:
				return <Lightbulb className="h-4 w-4 text-primary" />;
		}
	}

	function getPriorityColor(priority) {
		switch (priority) {
			case 'high':
				return 'border-l-error';
			case 'medium':
				return 'border-l-warning';
			case 'low':
				return 'border-l-success';
			default:
				return 'border-l-primary';
		}
	}

	function handleAction(recommendation) {
		if (recommendation.action?.type === 'navigate' && recommendation.action?.path) {
			router.push(recommendation.action.path);
		}
	}

	if (loading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Brain className="h-5 w-5 text-primary" />
						Learning Recommendations
					</CardTitle>
					<CardDescription>Analyzing your performance...</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-body text-muted-foreground">Loading recommendations...</p>
				</CardContent>
			</Card>
		);
	}

	if (recommendations.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Brain className="h-5 w-5 text-primary" />
						Learning Recommendations
					</CardTitle>
					<CardDescription>Personalized suggestions based on your progress</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-body text-muted-foreground">
						No recommendations available at the moment. Keep learning to receive personalized suggestions!
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							<Brain className="h-5 w-5 text-primary" />
							Learning Recommendations
						</CardTitle>
						<CardDescription>
							Personalized suggestions based on your performance and progress
						</CardDescription>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={fetchRecommendations}
						disabled={loading}
						title="Refresh recommendations"
					>
						<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{recommendations.map((recommendation, index) => {
					const recId = `${recommendation.type}_${recommendation.title}`;
					const isSaved = savedRecommendations.has(recId);
					
					return (
						<div
							key={index}
							className={`border-l-4 ${getPriorityColor(recommendation.priority)} rounded-lg border border-border bg-neutralLight p-4 space-y-3`}
						>
							<div className="flex items-start justify-between gap-3">
								<div className="flex items-start gap-3 flex-1">
									{getPriorityIcon(recommendation.priority)}
									<div className="flex-1">
										<h3 className="text-body font-semibold text-neutralDark mb-1">
											{recommendation.title}
										</h3>
										<p className="text-caption text-muted-foreground mb-2">
											{recommendation.description}
										</p>
										{recommendation.reason && (
											<p className="text-caption text-primary font-medium">
												{recommendation.reason}
											</p>
										)}
									</div>
								</div>
								<div className="flex items-center gap-2">
									{recommendation.action && (
										<Button
											size="sm"
											onClick={() => handleAction(recommendation)}
											className="flex items-center gap-1"
										>
											{recommendation.action.label}
											<ArrowRight className="h-3 w-3" />
										</Button>
									)}
									<Button
										variant="ghost"
										size="sm"
										onClick={() => saveRecommendation(recommendation)}
										disabled={isSaved}
										title={isSaved ? 'Already saved' : 'Save recommendation'}
										className="text-primary hover:text-primary/80"
									>
										<Bookmark className={`h-4 w-4 ${isSaved ? 'fill-primary' : ''}`} />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => ignoreRecommendation(recommendation)}
										title="Dismiss recommendation"
										className="text-muted-foreground hover:text-error"
									>
										<X className="h-4 w-4" />
									</Button>
								</div>
							</div>
						</div>
					);
				})}
			</CardContent>
		</Card>
	);
}

