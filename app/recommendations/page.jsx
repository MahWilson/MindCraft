'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, ChevronDown, ChevronUp, Database, BookOpen, TrendingUp, Target, Lightbulb } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Generic database-related recommendations
const databaseRecommendations = [
	{
		id: 'db-normalization',
		title: 'Database Normalization',
		icon: <Database className="h-5 w-5 text-primary" />,
		priority: 'high',
		why: 'Normalization is fundamental to database design. Understanding how to organize data into well-structured tables reduces redundancy and improves data integrity. This is essential for creating efficient and maintainable databases.',
		overview: 'Learn about the different normal forms (1NF, 2NF, 3NF, BCNF) and how to apply them to your database designs. You\'ll understand how to eliminate data redundancy, prevent update anomalies, and create more efficient database structures.',
		topics: [
			'First Normal Form (1NF) - Atomic values',
			'Second Normal Form (2NF) - Partial dependencies',
			'Third Normal Form (3NF) - Transitive dependencies',
			'Boyce-Codd Normal Form (BCNF)',
			'Practical examples and exercises'
		],
		actionPath: '/courses'
	},
	{
		id: 'sql-joins',
		title: 'Advanced SQL Joins',
		icon: <BookOpen className="h-5 w-5 text-primary" />,
		priority: 'high',
		why: 'SQL joins are crucial for combining data from multiple tables. Mastering different join types allows you to write efficient queries and retrieve complex data relationships. This skill is essential for any database professional.',
		overview: 'Deep dive into INNER JOIN, LEFT JOIN, RIGHT JOIN, FULL OUTER JOIN, and CROSS JOIN. Learn when to use each type, understand join conditions, and practice with real-world scenarios. You\'ll also explore self-joins and complex multi-table joins.',
		topics: [
			'INNER JOIN - Matching records',
			'LEFT/RIGHT JOIN - Including all records from one side',
			'FULL OUTER JOIN - All records from both tables',
			'Self-joins for hierarchical data',
			'Join optimization techniques'
		],
		actionPath: '/courses'
	},
	{
		id: 'indexing-strategies',
		title: 'Database Indexing Strategies',
		icon: <TrendingUp className="h-5 w-5 text-primary" />,
		priority: 'medium',
		why: 'Proper indexing dramatically improves query performance. Understanding when and how to create indexes can make the difference between a slow and fast database. This knowledge is critical for optimizing database performance.',
		overview: 'Explore different types of indexes (B-tree, Hash, Bitmap), learn when to create indexes, understand index maintenance costs, and discover best practices for index design. You\'ll learn to balance query performance with write performance.',
		topics: [
			'Types of indexes and their use cases',
			'Composite indexes and column order',
			'Index maintenance and overhead',
			'Query optimization with indexes',
			'Index monitoring and tuning'
		],
		actionPath: '/courses'
	},
	{
		id: 'transaction-management',
		title: 'Transaction Management & ACID Properties',
		icon: <Target className="h-5 w-5 text-primary" />,
		priority: 'high',
		why: 'Transactions ensure data consistency and reliability. Understanding ACID properties (Atomicity, Consistency, Isolation, Durability) is essential for building robust database applications that handle concurrent operations correctly.',
		overview: 'Learn about database transactions, transaction isolation levels, locking mechanisms, and how to handle concurrent access. Understand commit and rollback operations, and explore how different databases implement transaction management.',
		topics: [
			'ACID properties explained',
			'Transaction isolation levels',
			'Locking mechanisms (shared, exclusive)',
			'Deadlock prevention and resolution',
			'Concurrency control strategies'
		],
		actionPath: '/courses'
	},
	{
		id: 'query-optimization',
		title: 'SQL Query Optimization',
		icon: <Lightbulb className="h-5 w-5 text-primary" />,
		priority: 'medium',
		why: 'Writing efficient SQL queries is crucial for application performance. Understanding query execution plans, optimization techniques, and common pitfalls helps you write faster queries and reduce database load.',
		overview: 'Master query optimization techniques including understanding execution plans, using EXPLAIN statements, identifying bottlenecks, and rewriting queries for better performance. Learn about common anti-patterns and how to avoid them.',
		topics: [
			'Understanding execution plans',
			'Query rewriting techniques',
			'Subquery vs JOIN performance',
			'Avoiding N+1 query problems',
			'Using EXPLAIN and query profiling'
		],
		actionPath: '/courses'
	},
	{
		id: 'data-modeling',
		title: 'Advanced Data Modeling',
		icon: <Database className="h-5 w-5 text-primary" />,
		priority: 'medium',
		why: 'Good data modeling is the foundation of effective database design. Learning advanced modeling techniques helps you create databases that accurately represent business requirements and scale effectively.',
		overview: 'Explore entity-relationship modeling, dimensional modeling for data warehouses, and advanced modeling patterns. Learn about cardinality, relationships, and how to model complex business scenarios.',
		topics: [
			'Entity-Relationship Diagrams (ERD)',
			'Cardinality and relationship types',
			'Dimensional modeling concepts',
			'Modeling for different database types',
			'Best practices and common patterns'
		],
		actionPath: '/courses'
	},
	{
		id: 'stored-procedures',
		title: 'Stored Procedures & Functions',
		icon: <BookOpen className="h-5 w-5 text-primary" />,
		priority: 'low',
		why: 'Stored procedures and functions encapsulate business logic in the database, improving performance and maintainability. They\'re essential for complex database operations and application integration.',
		overview: 'Learn to create, use, and optimize stored procedures and functions. Understand parameters, return values, error handling, and when to use stored procedures versus application-level code.',
		topics: [
			'Creating stored procedures',
			'Input and output parameters',
			'User-defined functions',
			'Error handling in procedures',
			'Performance considerations'
		],
		actionPath: '/courses'
	},
	{
		id: 'database-security',
		title: 'Database Security Best Practices',
		icon: <Target className="h-5 w-5 text-primary" />,
		priority: 'high',
		why: 'Database security is critical for protecting sensitive data. Understanding authentication, authorization, encryption, and security best practices is essential for any database administrator or developer.',
		overview: 'Explore database security fundamentals including user management, role-based access control, data encryption (at rest and in transit), SQL injection prevention, and auditing. Learn industry best practices for securing databases.',
		topics: [
			'User authentication and authorization',
			'Role-based access control (RBAC)',
			'Data encryption techniques',
			'SQL injection prevention',
			'Auditing and compliance'
		],
		actionPath: '/courses'
	}
];

export default function RecommendationsPage() {
	const router = useRouter();
	const [expandedId, setExpandedId] = useState(null);
	const [currentUserId, setCurrentUserId] = useState(null);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			if (user) {
				setCurrentUserId(user.uid);
			}
		});

		return () => unsubscribe();
	}, []);

	function toggleExpand(id) {
		setExpandedId(expandedId === id ? null : id);
	}

	function getPriorityColor(priority) {
		switch (priority) {
			case 'high':
				return 'border-l-error bg-error/5';
			case 'medium':
				return 'border-l-warning bg-warning/5';
			case 'low':
				return 'border-l-success bg-success/5';
			default:
				return 'border-l-primary bg-primary/5';
		}
	}

	function getPriorityBadge(priority) {
		switch (priority) {
			case 'high':
				return <span className="px-2 py-1 rounded-full text-caption font-medium bg-error/10 text-error">High Priority</span>;
			case 'medium':
				return <span className="px-2 py-1 rounded-full text-caption font-medium bg-warning/10 text-warning">Medium Priority</span>;
			case 'low':
				return <span className="px-2 py-1 rounded-full text-caption font-medium bg-success/10 text-success">Low Priority</span>;
			default:
				return null;
		}
	}

	return (
		<div className="space-y-8">
			{/* Page Header */}
			<div>
				<h1 className="text-h1 text-neutralDark mb-2">Learning Recommendations</h1>
				<p className="text-body text-muted-foreground">
					Personalized suggestions to enhance your database knowledge and skills
				</p>
			</div>

			{/* Recommendations Grid */}
			<div className="grid gap-6 md:grid-cols-2">
				{databaseRecommendations.map((recommendation) => {
					const isExpanded = expandedId === recommendation.id;
					
					return (
						<Card
							key={recommendation.id}
							className={`border-l-4 ${getPriorityColor(recommendation.priority)} transition-all duration-200 hover:shadow-lg cursor-pointer`}
						>
							<CardHeader>
								<div className="flex items-start justify-between gap-3">
									<div className="flex items-start gap-3 flex-1">
										<div className="p-2 bg-primary/10 rounded-lg">
											{recommendation.icon}
										</div>
										<div className="flex-1">
											<CardTitle className="text-h3 mb-2">{recommendation.title}</CardTitle>
											{getPriorityBadge(recommendation.priority)}
										</div>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => toggleExpand(recommendation.id)}
										className="flex-shrink-0"
									>
										{isExpanded ? (
											<ChevronUp className="h-5 w-5" />
										) : (
											<ChevronDown className="h-5 w-5" />
										)}
									</Button>
								</div>
							</CardHeader>

							{isExpanded && (
								<CardContent className="space-y-4 pt-0">
									{/* Why Section */}
									<div className="p-4 bg-neutralLight rounded-lg border border-border">
										<h3 className="text-body font-semibold text-neutralDark mb-2 flex items-center gap-2">
											<Lightbulb className="h-4 w-4 text-primary" />
											Why This Matters
										</h3>
										<p className="text-caption text-muted-foreground leading-relaxed">
											{recommendation.why}
										</p>
									</div>

									{/* Overview Section */}
									<div className="p-4 bg-neutralLight rounded-lg border border-border">
										<h3 className="text-body font-semibold text-neutralDark mb-2 flex items-center gap-2">
											<BookOpen className="h-4 w-4 text-primary" />
											Overview
										</h3>
										<p className="text-caption text-muted-foreground leading-relaxed mb-3">
											{recommendation.overview}
										</p>
									</div>

									{/* Topics Section */}
									<div className="p-4 bg-neutralLight rounded-lg border border-border">
										<h3 className="text-body font-semibold text-neutralDark mb-3 flex items-center gap-2">
											<Target className="h-4 w-4 text-primary" />
											What You'll Learn
										</h3>
										<ul className="space-y-2">
											{recommendation.topics.map((topic, index) => (
												<li key={index} className="flex items-start gap-2 text-caption text-muted-foreground">
													<span className="text-primary mt-1">•</span>
													<span>{topic}</span>
												</li>
											))}
										</ul>
									</div>

									{/* Action Button */}
									<Button
										onClick={() => router.push(recommendation.actionPath)}
										className="w-full"
									>
										Explore Related Courses
									</Button>
								</CardContent>
							)}
						</Card>
					);
				})}
			</div>

			{/* Info Card */}
			<Card className="bg-primary/5 border-primary/20">
				<CardContent className="pt-6">
					<div className="flex items-start gap-3">
						<Brain className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
						<div>
							<h3 className="text-body font-semibold text-neutralDark mb-2">
								About These Recommendations
							</h3>
							<p className="text-caption text-muted-foreground">
								These recommendations are based on database-related topics that are essential for building a strong foundation in database management and SQL. 
								Click on any recommendation card to learn more about why it's important and what you'll gain from studying it. 
								These suggestions are designed to complement your current learning journey and help you master database concepts systematically.
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

