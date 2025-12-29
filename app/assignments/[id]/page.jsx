'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, Edit2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

export default function AssignmentDetailPage({ params }) {
    const [assignment, setAssignment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const [error, setError] = useState(null);
    const router = useRouter();

    // Unwrap params using React.use() as recommended for Next.js 15+ or handle async params
    // However, in client components for typical Next.js 13/14 usage params is passed as prop
    // We will assume standard behavior but handle potentional async nature if needed in future
    const { id } = React.use(params);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const { doc, getDoc } = await import('firebase/firestore');
                const userDoc = await getDoc(doc(db, 'user', user.uid));
                if (userDoc.exists()) {
                    setUserRole(userDoc.data().role);
                }
            } else {
                // Don't redirect immediately, let the page load public/protected logic if needed
                // But here we might want to redirect if not logged in
                // For now, consistent with other pages:
                router.push('/login');
            }
        });

        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (id) {
            loadAssignment(id);
        }
    }, [id]);

    async function loadAssignment(assignmentId) {
        setLoading(true);
        try {
            const docRef = doc(db, 'assignment', assignmentId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setAssignment({ id: docSnap.id, ...docSnap.data() });
            } else {
                setError('Assignment not found');
            }
        } catch (err) {
            console.error('Error loading assignment:', err);
            setError('Failed to load assignment details');
        } finally {
            setLoading(false);
        }
    }

    function formatDate(timestamp) {
        if (!timestamp) return 'No date set';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function isDeadlinePassed(deadline) {
        if (!deadline) return false;
        const deadlineDate = deadline.toDate ? deadline.toDate() : new Date(deadline);
        return deadlineDate < new Date();
    }

    const isTeacherOrAdmin = userRole === 'teacher' || userRole === 'admin';

    if (loading) {
        return (
            <div className="space-y-8">
                <Button variant="ghost" disabled>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
                <div className="h-[200px] flex items-center justify-center">
                    <p className="text-muted-foreground">Loading assignment details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-8">
                <Link href="/assignments">
                    <Button variant="ghost">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Assignments
                    </Button>
                </Link>
                <Card className="border-destructive/50">
                    <CardContent className="pt-6 text-center text-destructive">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                        <p className="text-lg font-medium">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!assignment) return null;

    // Check visibility for students
    if (!isTeacherOrAdmin && assignment.status !== 'published') {
        return (
            <div className="space-y-8">
                <Link href="/assignments">
                    <Button variant="ghost">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Assignments
                    </Button>
                </Link>
                <div className="text-center py-12">
                    <p className="text-muted-foreground">This assignment is not available.</p>
                </div>
            </div>
        );
    }

    const deadlinePassed = isDeadlinePassed(assignment.deadline);

    return (
        <div className="space-y-6">
            {/* Navigation */}
            <div className="flex justify-between items-center">
                <Link href="/assignments">
                    <Button variant="ghost">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Assignments
                    </Button>
                </Link>
                {isTeacherOrAdmin && (
                    <Link href={`/assignments/${assignment.id}/edit`}>
                        <Button>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit Assignment
                        </Button>
                    </Link>
                )}
            </div>

            {/* Main Content */}
            <Card className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
                    <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 mb-2">
                                {assignment.courseTitle && (
                                    <span className="text-sm font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                                        {assignment.courseTitle}
                                    </span>
                                )}
                                {assignment.status === 'published' ? (
                                    <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full font-medium border border-success/20">
                                        Published
                                    </span>
                                ) : (
                                    <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full font-medium border border-warning/20">
                                        Draft
                                    </span>
                                )}
                            </div>
                            <CardTitle className="text-3xl text-neutralDark">{assignment.title}</CardTitle>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-6 space-y-8">
                    {/* Status Bar */}
                    <div className="flex flex-wrap gap-6 p-4 bg-muted/30 rounded-lg border">
                        <div className="flex items-center gap-3">
                            <Calendar className={`h-5 w-5 ${deadlinePassed ? 'text-destructive' : 'text-primary'}`} />
                            <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Deadline</p>
                                <p className={`text-sm font-semibold ${deadlinePassed ? 'text-destructive' : 'text-foreground'}`}>
                                    {formatDate(assignment.deadline)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {assignment.isOpen ? (
                                <CheckCircle className="h-5 w-5 text-info" />
                            ) : (
                                <XCircle className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Status</p>
                                <p className="text-sm font-semibold">
                                    {assignment.isOpen ? 'Open for Submissions' : 'Closed'}
                                </p>
                            </div>
                        </div>

                        {assignment.allowLateSubmissions && (
                            <div className="flex items-center gap-3">
                                <Clock className="h-5 w-5 text-warning" />
                                <div>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Late Policy</p>
                                    <p className="text-sm font-semibold">Late submissions allowed</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3 text-neutralDark">Instructions</h3>
                        <div
                            className="prose max-w-none text-body text-neutralDark/80"
                            dangerouslySetInnerHTML={{ __html: assignment.description }}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
