'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, File, X, CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function SubmitAssignmentPage() {
    const params = useParams();
    const router = useRouter();
    const assignmentId = params.id;
    const fileInputRef = useRef(null);

    const [assignment, setAssignment] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isLocked, setIsLocked] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUserId(user.uid);
                await loadData(user.uid);
            } else {
                router.push('/login');
            }
        });

        return () => unsubscribe();
    }, [assignmentId, router]);

    async function loadData(userId) {
        setLoading(true);
        try {
            // Load assignment
            const assignmentDoc = await getDoc(doc(db, 'assignment', assignmentId));
            if (!assignmentDoc.exists()) {
                setError('Assignment not found');
                setLoading(false);
                return;
            }

            const assignmentData = { id: assignmentDoc.id, ...assignmentDoc.data() };
            setAssignment(assignmentData);

            // Check date restrictions
            if (assignmentData.deadline) {
                const now = new Date();
                const endDate = assignmentData.deadline.toDate
                    ? assignmentData.deadline.toDate()
                    : new Date(assignmentData.deadline);

                if (now > endDate && !assignmentData.allowLateSubmissions) {
                    setError('This assignment is closed for submissions');
                    setLoading(false);
                    return;
                }
            }

            if (!assignmentData.isOpen) {
                setError('Submissions are currently closed for this assignment');
                setLoading(false);
                return;
            }

            // Load existing submission if any
            if (userId) {
                const submissionsQuery = query(
                    collection(db, 'submission'),
                    where('assignmentId', '==', assignmentId),
                    where('studentId', '==', userId)
                );
                const submissionsSnapshot = await getDocs(submissionsQuery);

                if (!submissionsSnapshot.empty) {
                    const existingSubmission = {
                        id: submissionsSnapshot.docs[0].id,
                        ...submissionsSnapshot.docs[0].data(),
                    };
                    setSubmission(existingSubmission);
                    setUploadedFiles(existingSubmission.files || []);

                    // Lock if submitted
                    if (existingSubmission.status === 'submitted') {
                        setIsLocked(true);
                    }
                }
            }
        } catch (err) {
            console.error('Error loading data:', err);
            setError('Failed to load assessment data');
        } finally {
            setLoading(false);
        }
    }

    async function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file size (10MB limit)
        const MAX_FILE_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            alert(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // Validate file type
        const allowedMimeTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'application/zip',
            'application/x-zip-compressed',
            'text/plain',
            'text/markdown',
            'text/x-python',
            'text/javascript',
            'text/x-java',
            'image/jpeg',
            'image/png',
        ];

        const allowedExtensions = ['.pdf', '.docx', '.doc', '.zip', '.txt', '.md', '.py', '.js', '.java', '.jpg', '.jpeg', '.png'];
        const fileName = file.name.toLowerCase();
        const fileExtension = fileName.substring(fileName.lastIndexOf('.'));

        const isValidMimeType = allowedMimeTypes.includes(file.type);
        const isValidExtension = allowedExtensions.includes(fileExtension);

        if (!isValidMimeType && !isValidExtension) {
            alert('File type not supported. Please upload PDF, DOCX, ZIP, text files, or images.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setUploading(true);

        try {
            if (!auth.currentUser) {
                throw new Error('You must be signed in to upload files');
            }

            // Upload to Firebase Storage
            const filePath = `assignment-submissions/${assignmentId}/${fileId}_${file.name}`;
            const fileRef = ref(storage, filePath);

            await uploadBytes(fileRef, file);
            const downloadURL = await getDownloadURL(fileRef);

            const fileData = {
                id: fileId,
                name: file.name,
                url: downloadURL,
                type: file.type || 'application/octet-stream',
                size: file.size,
                uploadedAt: new Date().toISOString(),
            };

            setUploadedFiles(prev => [...prev, fileData]);
            setSuccessMessage('File uploaded successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error uploading file:', err);
            alert('Failed to upload file: ' + (err.message || 'Unknown error'));
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    function removeFile(fileId) {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    }

    async function handleSaveDraft() {
        if (uploadedFiles.length === 0) {
            alert('Please upload at least one file to save a draft');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const submissionData = {
                assignmentId,
                studentId: auth.currentUser.uid,
                files: uploadedFiles.map(f => ({
                    name: f.name,
                    url: f.url,
                    type: f.type,
                    size: f.size,
                })),
                status: 'draft',
                updatedAt: serverTimestamp(),
            };

            if (submission) {
                await updateDoc(doc(db, 'submission', submission.id), submissionData);
                setSubmission(prev => ({ ...prev, ...submissionData }));
            } else {
                const docRef = await addDoc(collection(db, 'submission'), submissionData);
                setSubmission({ id: docRef.id, ...submissionData });
            }

            setSuccessMessage('Draft saved successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error saving draft:', err);
            setError('Failed to save draft');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSubmit() {
        if (uploadedFiles.length === 0) {
            alert('Please upload at least one file');
            return;
        }
        setShowConfirmModal(true);
    }

    async function executeSubmit() {
        setSubmitting(true);
        setError('');
        setShowConfirmModal(false);

        try {
            if (!auth.currentUser) {
                throw new Error('You must be signed in to submit');
            }

            const submissionData = {
                assignmentId,
                studentId: auth.currentUser.uid,
                files: uploadedFiles.map(f => ({
                    name: f.name,
                    url: f.url,
                    type: f.type,
                    size: f.size,
                })),
                status: 'submitted',
                submittedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                isLate: assignment.deadline && new Date() > (assignment.deadline.toDate ? assignment.deadline.toDate() : new Date(assignment.deadline)),
            };

            if (submission) {
                // Update existing submission
                await updateDoc(doc(db, 'submission', submission.id), submissionData);
                setSuccessMessage('Assignment submitted successfully!');
            } else {
                // Create new submission
                await addDoc(collection(db, 'submission'), submissionData);
                setSuccessMessage('Assignment submitted successfully!');
            }

            setIsLocked(true);
            setTimeout(() => {
                router.push('/assignments');
            }, 2000);
        } catch (err) {
            console.error('Error submitting assignment:', err);
            setError('Failed to submit assignment: ' + (err.message || 'Unknown error'));
        } finally {
            setSubmitting(false);
        }
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    if (loading) {
        return (
            <div className="space-y-8">
                <div>
                    <h1 className="text-h1 text-neutralDark mb-2">Submit Assignment</h1>
                    <p className="text-body text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (error && !assignment) {
        return (
            <div className="space-y-8">
                <Link href="/assignments">
                    <Button variant="ghost" className="mb-4">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Assignments
                    </Button>
                </Link>
                <Card>
                    <CardContent className="py-12 text-center">
                        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                        <p className="text-body text-destructive">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <Link href={`/assignments/${assignmentId}`}>
                    <Button variant="ghost" className="mb-4" title="Back to Assignment Details">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Assignment Details
                    </Button>
                </Link>
                <h1 className="text-h1 text-neutralDark mb-2">Submit Assignment</h1>
                <p className="text-body text-muted-foreground">{assignment?.title}</p>
            </div>

            {/* Submission Status */}
            {submission && (
                <div className={`p-4 rounded-lg border flex items-center gap-3 ${isLocked ? 'bg-success/5 border-success/20' : 'bg-info/5 border-info/20'
                    }`}>
                    {isLocked ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                    ) : (
                        <File className="h-5 w-5 text-info" />
                    )}
                    <div>
                        <p className={`text-sm font-semibold ${isLocked ? 'text-success' : 'text-info'}`}>
                            {isLocked ? 'Submission Locked' : 'Draft Saved'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {isLocked
                                ? 'Your assignment has been submitted and can no longer be edited.'
                                : 'You have a saved draft. Click "Submit" to finalize your submission.'}
                        </p>
                    </div>
                </div>
            )}

            {/* File Upload Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Upload Files</CardTitle>
                    <CardDescription>
                        Upload your assignment files (PDF, DOCX, ZIP, text files, or images). Maximum 10MB per file.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".pdf,.docx,.doc,.zip,.txt,.md,.py,.js,.java,.jpg,.jpeg,.png"
                    />

                    {!isLocked && (
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            variant="outline"
                            className="w-full h-24 dashed border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                    <span className="text-sm font-medium">Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="h-6 w-6 text-muted-foreground" />
                                    <span className="text-sm font-medium">Click to select files</span>
                                </>
                            )}
                        </Button>
                    )}

                    {successMessage && (
                        <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                            <p className="text-sm text-success">{successMessage}</p>
                        </div>
                    )}

                    {/* Uploaded Files List */}
                    {uploadedFiles.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">Uploaded Files ({uploadedFiles.length})</h4>
                            <div className="space-y-2">
                                {uploadedFiles.map((file) => (
                                    <div
                                        key={file.id}
                                        className="flex items-center justify-between p-3 border rounded-lg bg-white"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{file.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatFileSize(file.size)}
                                                </p>
                                            </div>
                                        </div>
                                        {!isLocked && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeFile(file.id)}
                                                className="text-destructive hover:bg-destructive/10"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 pt-8">
                {!isLocked && (
                    <>
                        <Button
                            onClick={handleSaveDraft}
                            disabled={submitting || uploading || uploadedFiles.length === 0}
                            variant="outline"
                            className="flex-1 h-20 text-lg font-black border-2 border-neutral-200 hover:bg-neutral-50 hover:border-neutral-400 transition-all rounded-[24px] uppercase tracking-widest"
                        >
                            Save Draft
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || uploading || uploadedFiles.length === 0}
                            className="flex-1 h-20 text-xl font-black shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:shadow-primary/30 transition-all duration-500 bg-gradient-to-br from-primary via-primary to-primary/80 hover:scale-[1.02] active:scale-[0.98] rounded-[24px] border-none group"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <div className="flex items-center gap-4">
                                    <span className="tracking-[0.1em]">FINALIZE & SUBMIT</span>
                                    <ArrowRight className="h-7 w-7 transition-transform group-hover:translate-x-3" />
                                </div>
                            )}
                        </Button>
                    </>
                )}
                {isLocked && (
                    <Link href="/assignments" className="w-full">
                        <Button variant="outline" className="w-full h-11">
                            Back to Assignments
                        </Button>
                    </Link>
                )}
            </div>

            {/* Final Submission Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <Card className="max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <CheckCircle className="h-6 w-6 text-primary" />
                                Final Submission
                            </CardTitle>
                            <CardDescription>
                                Are you sure you want to submit your assignment? This will lock your submission and you won't be able to make further changes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/50 p-4 rounded-lg">
                                <p className="text-sm font-medium">Assignment: {assignment.title}</p>
                                <p className="text-sm text-muted-foreground mt-1">Files to submit: {uploadedFiles.length}</p>
                            </div>
                            <div className="flex gap-3 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowConfirmModal(false)}
                                    disabled={submitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={executeSubmit}
                                    disabled={submitting}
                                    className="bg-primary hover:bg-primary/90"
                                >
                                    {submitting ? 'Submitting...' : 'Yes, Submit Now'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
