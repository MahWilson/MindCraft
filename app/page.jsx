import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Brain, TrendingUp, Sparkles } from 'lucide-react';

export default function LandingPage() {
	return (
		<div className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12">
			<div className="max-w-5xl mx-auto px-4">
				{/* Hero Section */}
				<div className="text-center mb-16">
					<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-caption font-medium mb-6">
						<Sparkles className="h-4 w-4" />
						AI-Powered Learning Platform
					</div>
					<h1 className="text-h1 font-semibold text-neutralDark mb-4">
						Learn Programming with MindCraft
					</h1>
					<p className="text-h3 text-muted-foreground mb-8 max-w-2xl mx-auto">
						AI-assisted learning platform designed for secondary school programming education
					</p>
					<div className="flex gap-4 justify-center">
						<Link href="/login">
							<Button size="lg" className="px-8">
								Get Started
							</Button>
						</Link>
						<Link href="/explore">
							<Button variant="outline" size="lg" className="px-8">
								Explore Courses
							</Button>
						</Link>
					</div>
				</div>

				{/* Feature Cards */}
				<div className="grid md:grid-cols-3 gap-6">
					<Card className="card-hover">
						<CardHeader>
							<div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
								<BookOpen className="h-6 w-6 text-primary" />
							</div>
							<CardTitle>Interactive Courses</CardTitle>
							<CardDescription>
								Learn programming with hands-on lessons and exercises designed for all skill levels
							</CardDescription>
						</CardHeader>
					</Card>
					<Card className="card-hover">
						<CardHeader>
							<div className="p-3 bg-secondary/10 rounded-lg w-fit mb-4">
								<Brain className="h-6 w-6 text-secondary" />
							</div>
							<CardTitle>AI Assistance</CardTitle>
							<CardDescription>
								Get instant help with coding questions and concepts from our intelligent assistant
							</CardDescription>
						</CardHeader>
					</Card>
					<Card className="card-hover">
						<CardHeader>
							<div className="p-3 bg-success/10 rounded-lg w-fit mb-4">
								<TrendingUp className="h-6 w-6 text-success" />
							</div>
							<CardTitle>Track Progress</CardTitle>
							<CardDescription>
								Monitor your learning journey, achievements, and see your improvement over time
							</CardDescription>
						</CardHeader>
					</Card>
				</div>
			</div>
		</div>
	);
}

