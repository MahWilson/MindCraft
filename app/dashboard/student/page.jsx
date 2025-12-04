'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BookOpen, ClipboardCheck, TrendingUp, Brain, ArrowRight } from 'lucide-react';
import { Metric, Flex, Text, ProgressBar } from '@tremor/react';

export default function StudentDashboard() {
	return (
		<div className="space-y-8">
			{/* Page Header */}
			<div>
				<h1 className="text-h1 text-neutralDark mb-2">Student Dashboard</h1>
				<p className="text-body text-muted-foreground">Continue your learning journey</p>
			</div>

			{/* Progress Overview */}
			<div className="grid gap-6 md:grid-cols-3">
				<Card className="card-hover">
					<CardHeader className="pb-3">
						<Flex justifyContent="start" className="gap-2">
							<BookOpen className="h-5 w-5 text-primary" />
							<CardTitle className="text-h3">Enrolled Courses</CardTitle>
						</Flex>
					</CardHeader>
					<CardContent>
						<Metric className="text-3xl">-</Metric>
						<Text className="text-caption text-muted-foreground mt-2">Active courses</Text>
					</CardContent>
				</Card>

				<Card className="card-hover">
					<CardHeader className="pb-3">
						<Flex justifyContent="start" className="gap-2">
							<TrendingUp className="h-5 w-5 text-success" />
							<CardTitle className="text-h3">Overall Progress</CardTitle>
						</Flex>
					</CardHeader>
					<CardContent>
						<Metric className="text-3xl">0%</Metric>
						<ProgressBar value={0} color="indigo" className="mt-2" />
						<Text className="text-caption text-muted-foreground mt-2">Completion rate</Text>
					</CardContent>
				</Card>

				<Card className="card-hover">
					<CardHeader className="pb-3">
						<Flex justifyContent="start" className="gap-2">
							<ClipboardCheck className="h-5 w-5 text-secondary" />
							<CardTitle className="text-h3">Pending Tasks</CardTitle>
						</Flex>
					</CardHeader>
					<CardContent>
						<Metric className="text-3xl">-</Metric>
						<Text className="text-caption text-muted-foreground mt-2">Assessments & assignments</Text>
					</CardContent>
				</Card>
			</div>

			{/* Action Cards */}
			<div>
				<h2 className="text-h2 text-neutralDark mb-6">Continue Learning</h2>
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
					<Card className="card-hover">
						<CardHeader>
							<Flex justifyContent="start" className="gap-3">
								<div className="p-2 bg-primary/10 rounded-lg">
									<BookOpen className="h-6 w-6 text-primary" />
								</div>
								<div>
									<CardTitle>My Courses</CardTitle>
									<CardDescription>Continue learning</CardDescription>
								</div>
							</Flex>
						</CardHeader>
						<CardContent>
							<Link href="/courses">
								<Button variant="ghost" className="w-full justify-between group">
									View Courses
									<ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
								</Button>
							</Link>
						</CardContent>
					</Card>

					<Card className="card-hover">
						<CardHeader>
							<Flex justifyContent="start" className="gap-3">
								<div className="p-2 bg-secondary/10 rounded-lg">
									<ClipboardCheck className="h-6 w-6 text-secondary" />
								</div>
								<div>
									<CardTitle>Assessments</CardTitle>
									<CardDescription>Take quizzes</CardDescription>
								</div>
							</Flex>
						</CardHeader>
						<CardContent>
							<Link href="/assessments">
								<Button variant="ghost" className="w-full justify-between group">
									View
									<ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
								</Button>
							</Link>
						</CardContent>
					</Card>

					<Card className="card-hover">
						<CardHeader>
							<Flex justifyContent="start" className="gap-3">
								<div className="p-2 bg-success/10 rounded-lg">
									<TrendingUp className="h-6 w-6 text-success" />
								</div>
								<div>
									<CardTitle>Progress</CardTitle>
									<CardDescription>Track learning</CardDescription>
								</div>
							</Flex>
						</CardHeader>
						<CardContent>
							<Link href="/progress">
								<Button variant="ghost" className="w-full justify-between group">
									View Progress
									<ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
								</Button>
							</Link>
						</CardContent>
					</Card>

					<Card className="card-hover">
						<CardHeader>
							<Flex justifyContent="start" className="gap-3">
								<div className="p-2 bg-secondary/10 rounded-lg">
									<Brain className="h-6 w-6 text-secondary" />
								</div>
								<div>
									<CardTitle>AI Help</CardTitle>
									<CardDescription>Get assistance</CardDescription>
								</div>
							</Flex>
						</CardHeader>
						<CardContent className="space-y-2">
							<Link href="/ai/coding-help" className="block">
								<Button variant="ghost" className="w-full justify-between group">
									Coding Help
									<ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
								</Button>
							</Link>
							<Link href="/ai/explain" className="block">
								<Button variant="ghost" className="w-full justify-between group">
									Explain Concept
									<ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
								</Button>
							</Link>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

