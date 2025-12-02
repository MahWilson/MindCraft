'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { UserPlus, BookOpen, BarChart3, ArrowRight, Users, FileText, ClipboardCheck } from 'lucide-react';
import { Metric, Title, Flex, Text } from '@tremor/react';

export default function AdminDashboard() {
	return (
		<div className="space-y-8">
			{/* Page Header */}
			<div>
				<h1 className="text-h1 text-neutralDark mb-2">Admin Dashboard</h1>
				<p className="text-body text-muted-foreground">Manage users, courses, and platform activity</p>
			</div>

			{/* Quick Stats */}
			<div className="grid gap-6 md:grid-cols-3">
				<Card className="card-hover">
					<CardHeader className="pb-3">
						<Flex justifyContent="start" className="gap-2">
							<Users className="h-5 w-5 text-primary" />
							<CardTitle className="text-h3">Total Users</CardTitle>
						</Flex>
					</CardHeader>
					<CardContent>
						<Metric className="text-3xl">-</Metric>
						<Text className="text-caption text-muted-foreground mt-2">Across all roles</Text>
					</CardContent>
				</Card>

				<Card className="card-hover">
					<CardHeader className="pb-3">
						<Flex justifyContent="start" className="gap-2">
							<BookOpen className="h-5 w-5 text-primary" />
							<CardTitle className="text-h3">Total Courses</CardTitle>
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
							<FileText className="h-5 w-5 text-secondary" />
							<CardTitle className="text-h3">Active Sessions</CardTitle>
						</Flex>
					</CardHeader>
					<CardContent>
						<Metric className="text-3xl">-</Metric>
						<Text className="text-caption text-muted-foreground mt-2">Currently online</Text>
					</CardContent>
				</Card>
			</div>

			{/* Action Cards */}
			<div>
				<h2 className="text-h2 text-neutralDark mb-6">Quick Actions</h2>
			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				<Card className="card-hover">
					<CardHeader>
						<Flex justifyContent="start" className="gap-3">
							<div className="p-2 bg-primary/10 rounded-lg">
								<UserPlus className="h-6 w-6 text-primary" />
							</div>
							<div>
								<CardTitle>User Management</CardTitle>
								<CardDescription>Register teachers and students</CardDescription>
							</div>
						</Flex>
					</CardHeader>
						<CardContent>
							<Link href="/admin/register">
								<Button variant="ghost" className="w-full justify-between group">
									Go to Register
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
									<CardTitle>Course Management</CardTitle>
									<CardDescription>Approve and manage courses</CardDescription>
								</div>
							</Flex>
						</CardHeader>
						<CardContent>
							<Link href="/admin/courses">
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
								<div className="p-2 bg-primary/10 rounded-lg">
									<ClipboardCheck className="h-6 w-6 text-primary" />
								</div>
								<div>
									<CardTitle>Assessments</CardTitle>
									<CardDescription>Manage all assessments</CardDescription>
								</div>
							</Flex>
						</CardHeader>
						<CardContent>
							<Link href="/dashboard/assessments">
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
									<BarChart3 className="h-6 w-6 text-secondary" />
								</div>
								<div>
									<CardTitle>Analytics</CardTitle>
									<CardDescription>Monitor platform activity</CardDescription>
								</div>
							</Flex>
						</CardHeader>
						<CardContent>
							<Link href="/analytics">
								<Button variant="ghost" className="w-full justify-between group">
									View Analytics
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

