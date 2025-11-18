'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ClipboardCheck, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function StudentAssessmentsPage() {
	const [assessments, setAssessments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [userRole, setUserRole] = useState(null);
	const router = useRouter();

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (userDoc.exists()) {
					const role = userDoc.data().role;
					setUserRole(role);
					
					// Redirect based on role
					if (role === 'teacher' || role === 'admin') {
						router.push('/dashboard/assessments');
						return;
					}

					await loadAssessments();
				}
			} else {
				router.push('/login');
			}
		});
		return () => unsubscribe();
	}, [router]);

	async function loadAssessments() {
		try {
			setLoading(true);
			console.log('Student loading published assessments...');
			
			// Fetch only published assessments for students
			const response = await fetch('/api/assessments?published=true');
			console.log('API response status:', response.status);
			
			const data = await response.json();
			console.log('API response data:', data);

			if (data.success) {
				setAssessments(data.assessments);
				console.log('Loaded assessments:', data.assessments.length);
			} else {
				console.error('API returned error:', data.error);
				setAssessments([]);
			}
		} catch (err) {
			console.error('Error loading assessments:', err);
			setAssessments([]);
			alert(`Failed to load assessments: ${err.message}`);
		} finally {
			setLoading(false);
		}
	}

	const filteredAssessments = assessments.filter((assessment) => {
		// Skip invalid assessments
		if (!assessment || !assessment.title) {
			console.warn('Invalid assessment found:', assessment);
			return false;
		}
		
		return (
			assessment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			assessment.description?.toLowerCase().includes(searchTerm.toLowerCase())
		);
	});

	if (userRole === 'teacher' || userRole === 'admin') {
		return null; // Will redirect
	}

	return (
		<div className="space-y-8">
			{/* Page Header */}
			<div>
				<h1 className="text-h1 text-neutralDark mb-2">Assessments</h1>
				<p className="text-body text-muted-foreground">
					View and attempt available quizzes and assignments
				</p>
			</div>

			{/* Search */}
			<Card>
				<CardContent className="pt-6">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder="Search assessments..."
							className="pl-10"
						/>
					</div>
				</CardContent>
			</Card>

			{/* Assessments List */}
			{loading ? (
				<Card>
					<CardContent className="pt-6">
						<p className="text-body text-muted-foreground text-center py-8">
							Loading assessments...
						</p>
					</CardContent>
				</Card>
			) : filteredAssessments.length === 0 ? (
				<Card>
					<CardContent className="pt-6">
						<div className="text-center py-12">
							<ClipboardCheck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
							<p className="text-h3 text-neutralDark mb-2">No assessments available</p>
							<p className="text-body text-muted-foreground">
								{searchTerm
									? 'Try adjusting your search'
									: 'Check back later for new assessments'}
							</p>
						</div>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-6">
					{filteredAssessments.map((assessment) => (
						<Card key={assessment.id} className="card-hover">
							<CardContent className="pt-6">
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<div className="flex items-center gap-3 mb-2">
											<h3 className="text-h3 text-neutralDark">{assessment.title}</h3>
											<span className="px-3 py-1 bg-primary/10 text-primary text-caption rounded-full">
												{assessment.type === 'quiz' && 'Quiz'}
												{assessment.type === 'coding' && 'Coding Challenge'}
												{assessment.type === 'assignment' && 'Assignment'}
											</span>
										</div>
										{assessment.description && (
											<p className="text-body text-muted-foreground mb-3">
												{assessment.description}
											</p>
										)}
										<div className="flex items-center gap-6 text-caption text-muted-foreground">
											<span>{assessment.questions?.length || 0} questions</span>
											{assessment.config?.attempts && (
												<span>{assessment.config.attempts} attempt(s) allowed</span>
											)}
											{assessment.config?.timer && (
												<div className="flex items-center gap-1">
													<Clock className="h-3 w-3" />
													<span>{assessment.config.timer} minutes</span>
												</div>
											)}
										</div>
									</div>

									<Link href={`/assessments/${assessment.id}`}>
										<Button className="ml-4">
											Start
											<ArrowRight className="h-4 w-4 ml-2" />
										</Button>
									</Link>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}





