'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileText, BookOpen, ClipboardCheck, Brain, ArrowRight } from 'lucide-react';
import { Metric, Flex, Text } from '@tremor/react';

export default function TeacherDashboard() {
	return (
		<div className="space-y-8">
			{/* Page Header */}
			<div>
				<h1 className="text-h1 text-neutralDark mb-2">Teacher Dashboard</h1>
				<p className="text-body text-muted-foreground">Create courses, manage students, and track progress</p>
			</div>

			{/* Quick Stats */}
			<div className="grid gap-6 md:grid-cols-3">
				<Card className="card-hover">
					<CardHeader className="pb-3">
						<Flex justifyContent="start" className="gap-2">
							<BookOpen className="h-5 w-5 text-primary" />
							<CardTitle className="text-h3">My Courses</CardTitle>
						</Flex>
					</CardHeader>
					<CardContent>
						<Metric className="text-3xl">-</Metric>
						<Text className="text-caption text-muted-foreground mt-2">Published and draft</Text>
					</CardContent>
				</Card>

				<Card className="card-hover">
					<CardHeader className="pb-3">
						<Flex justifyContent="start" className="gap-2">
							<ClipboardCheck className="h-5 w-5 text-secondary" />
							<CardTitle className="text-h3">Pending Grades</CardTitle>
						</Flex>
					</CardHeader>
					<CardContent>
						<Metric className="text-3xl">-</Metric>
						<Text className="text-caption text-muted-foreground mt-2">Assignments to review</Text>
					</CardContent>
				</Card>

				<Card className="card-hover">
					<CardHeader className="pb-3">
						<Flex justifyContent="start" className="gap-2">
							<Brain className="h-5 w-5 text-secondary" />
							<CardTitle className="text-h3">AI Tools</CardTitle>
						</Flex>
					</CardHeader>
					<CardContent>
						<Text className="text-body text-muted-foreground">Coming Soon</Text>
					</CardContent>
				</Card>
			</div>

			{/* Action Cards */}
			<div>
				<h2 className="text-h2 text-neutralDark mb-6">Quick Actions</h2>
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
					<Card className="card-hover">
						<CardHeader>
							<Flex justifyContent="start" className="gap-3">
								<div className="p-2 bg-primary/10 rounded-lg">
									<FileText className="h-6 w-6 text-primary" />
								</div>
								<div>
									<CardTitle>Create Course</CardTitle>
									<CardDescription>Start building</CardDescription>
								</div>
							</Flex>
						</CardHeader>
						<CardContent>
							<Link href="/dashboard/courses/new">
								<Button variant="ghost" className="w-full justify-between group">
									Create
									<ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
								</Button>
							</Link>
						</CardContent>
					</Card>

					<Card className="card-hover">
						<CardHeader>
							<Flex justifyContent="start" className="gap-3">
								<div className="p-2 bg-primary/10 rounded-lg">
									<BookOpen className="h-6 w-6 text-primary" />
								</div>
								<div>
									<CardTitle>My Courses</CardTitle>
									<CardDescription>Manage courses</CardDescription>
								</div>
							</Flex>
						</CardHeader>
						<CardContent>
							<Link href="/admin/courses">
								<Button variant="ghost" className="w-full justify-between group">
									View All
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
									<CardTitle>Assignments</CardTitle>
									<CardDescription>Manage assignments</CardDescription>
								</div>
							</Flex>
						</CardHeader>
						<CardContent>
							<Link href="/assignments">
									<Button variant="ghost" className="w-full justify-between group">
									Manage
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
									<CardTitle>AI Assist</CardTitle>
									<CardDescription>Generate content</CardDescription>
								</div>
							</Flex>
						</CardHeader>
						<CardContent>
							<Button variant="ghost" className="w-full" disabled>
								Coming Soon
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

