'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Assessment Configuration Component
 * Handles:
 * - Marking scheme (total marks, passing marks)
 * - Weightage rules
 * - Rubrics/Marking guidelines
 */
export default function AssessmentConfigure({ assessment, onConfigChange, loading = false }) {
	const [totalMarks, setTotalMarks] = useState(assessment?.config?.totalMarks || 100);
	const [passingMarks, setPassingMarks] = useState(assessment?.config?.passingMarks || 40);
	const [weightage, setWeightage] = useState(assessment?.config?.weightage || []);
	const [rubrics, setRubrics] = useState(assessment?.config?.rubrics || []);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	// Weightage management
	const addWeightageRule = () => {
		setWeightage([
			...weightage,
			{
				id: Date.now(),
				criterion: '',
				weight: 0,
				description: '',
			},
		]);
	};

	const updateWeightageRule = (id, field, value) => {
		setWeightage(
			weightage.map((rule) =>
				rule.id === id ? { ...rule, [field]: value } : rule
			)
		);
	};

	const deleteWeightageRule = (id) => {
		setWeightage(weightage.filter((rule) => rule.id !== id));
	};

	// Rubrics management
	const addRubric = () => {
		setRubrics([
			...rubrics,
			{
				id: Date.now(),
				criterion: '',
				excellent: '',
				good: '',
				satisfactory: '',
				poor: '',
				weight: 0,
			},
		]);
	};

	const updateRubric = (id, field, value) => {
		setRubrics(
			rubrics.map((rubric) =>
				rubric.id === id ? { ...rubric, [field]: value } : rubric
			)
		);
	};

	const deleteRubric = (id) => {
		setRubrics(rubrics.filter((rubric) => rubric.id !== id));
	};

	const handleSave = async () => {
		setError('');
		setSuccess('');

		// Validation
		if (totalMarks <= 0) {
			setError('Total marks must be greater than 0');
			return;
		}

		if (passingMarks < 0 || passingMarks > totalMarks) {
			setError('Passing marks must be between 0 and total marks');
			return;
		}

		// Validate weightage sum if multiple rules exist
		if (weightage.length > 0) {
			const totalWeight = weightage.reduce((sum, rule) => sum + parseFloat(rule.weight || 0), 0);
			if (totalWeight !== 100 && totalWeight !== 0) {
				setError(`Weightage must sum to 100%. Current: ${totalWeight}%`);
				return;
			}
		}

		try {
			const configData = {
				totalMarks: parseInt(totalMarks),
				passingMarks: parseInt(passingMarks),
				weightage: weightage.filter((w) => w.criterion.trim()),
				rubrics: rubrics.filter((r) => r.criterion.trim()),
			};

			// Call the parent's onConfigChange
			if (onConfigChange) {
				await onConfigChange(configData);
				setSuccess('Grading configuration saved successfully!');
			}
		} catch (err) {
			setError(err.message || 'Failed to save configuration');
		}
	};

	const passingPercentage = ((passingMarks / totalMarks) * 100).toFixed(1);

	return (
		<div className="space-y-6">
			{/* Basic Marking Scheme */}
			<Card>
				<CardHeader>
					<CardTitle className="text-h2">Marking Scheme</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-body font-medium text-neutralDark mb-2">
								Total Marks *
							</label>
							<Input
								type="number"
								min="1"
								max="1000"
								value={totalMarks}
								onChange={(e) => setTotalMarks(parseInt(e.target.value) || 0)}
								placeholder="100"
								disabled={loading}
							/>
							<p className="text-caption text-muted-foreground mt-2">
								Maximum marks available for this assessment
							</p>
						</div>

						<div>
							<label className="block text-body font-medium text-neutralDark mb-2">
								Passing Marks *
							</label>
							<div className="space-y-2">
								<Input
									type="number"
									min="0"
									max={totalMarks}
									value={passingMarks}
									onChange={(e) => setPassingMarks(parseInt(e.target.value) || 0)}
									placeholder="40"
									disabled={loading}
								/>
								<p className="text-caption text-muted-foreground">
									{passingPercentage}% of total marks ({passingMarks} out of {totalMarks})
								</p>
							</div>
						</div>
					</div>

					{/* Marks Summary */}
					<div className="grid grid-cols-3 gap-4 p-4 bg-accent rounded-lg">
						<div className="text-center">
							<p className="text-caption text-muted-foreground">Pass Marks</p>
							<p className="text-h3 font-bold text-success">{passingMarks}</p>
						</div>
						<div className="text-center border-l border-r border-border">
							<p className="text-caption text-muted-foreground">Total Marks</p>
							<p className="text-h3 font-bold text-neutralDark">{totalMarks}</p>
						</div>
						<div className="text-center">
							<p className="text-caption text-muted-foreground">Pass %</p>
							<p className="text-h3 font-bold text-primary">{passingPercentage}%</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Weightage Rules */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-h2">Weightage Rules</CardTitle>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={addWeightageRule}
							disabled={loading}
							className="gap-2"
						>
							<Plus className="h-4 w-4" />
							Add Criterion
						</Button>
					</div>
					<p className="text-body text-muted-foreground mt-2">
						Define how different components contribute to the final score (optional)
					</p>
				</CardHeader>
				<CardContent className="space-y-4">
					{weightage.length === 0 ? (
						<div className="p-8 text-center bg-accent rounded-lg">
							<p className="text-body text-muted-foreground">
								No weightage rules defined. Assessment will use uniform marking.
							</p>
						</div>
					) : (
						<div className="space-y-4">
							{weightage.map((rule) => (
								<div key={rule.id} className="p-4 border border-input rounded-lg space-y-3">
									<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
										<div>
											<label className="text-caption font-medium text-neutralDark block mb-1">
												Criterion
											</label>
											<Input
												value={rule.criterion}
												onChange={(e) =>
													updateWeightageRule(rule.id, 'criterion', e.target.value)
												}
												placeholder="e.g., Conceptual Understanding"
												disabled={loading}
											/>
										</div>
										<div>
											<label className="text-caption font-medium text-neutralDark block mb-1">
												Weight (%)
											</label>
											<Input
												type="number"
												min="0"
												max="100"
												value={rule.weight}
												onChange={(e) =>
													updateWeightageRule(rule.id, 'weight', parseFloat(e.target.value) || 0)
												}
												placeholder="0"
												disabled={loading}
											/>
										</div>
										<div className="flex items-end">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => deleteWeightageRule(rule.id)}
												disabled={loading}
												className="text-error hover:bg-error/10 hover:text-error w-full"
											>
												<Trash2 className="h-4 w-4 mr-2" />
												Delete
											</Button>
										</div>
									</div>
									<div>
										<label className="text-caption font-medium text-neutralDark block mb-1">
											Description
										</label>
										<textarea
											value={rule.description}
											onChange={(e) =>
												updateWeightageRule(rule.id, 'description', e.target.value)
											}
											placeholder="Describe what this criterion evaluates"
											rows={2}
											className="w-full rounded-lg border border-input bg-background px-3 py-2 text-body ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
											disabled={loading}
										/>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Rubrics/Marking Guidelines */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-h2">Marking Guidelines (Rubrics)</CardTitle>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={addRubric}
							disabled={loading}
							className="gap-2"
						>
							<Plus className="h-4 w-4" />
							Add Rubric
						</Button>
					</div>
					<p className="text-body text-muted-foreground mt-2">
						Define performance levels and expectations for each criterion (optional)
					</p>
				</CardHeader>
				<CardContent className="space-y-4">
					{rubrics.length === 0 ? (
						<div className="p-8 text-center bg-accent rounded-lg">
							<p className="text-body text-muted-foreground">
								No rubrics defined. Teachers can grade using general guidelines.
							</p>
						</div>
					) : (
						<div className="space-y-6">
							{rubrics.map((rubric) => (
								<div key={rubric.id} className="p-4 border border-input rounded-lg space-y-4">
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<label className="text-caption font-medium text-neutralDark block mb-2">
												Criterion Name
											</label>
											<Input
												value={rubric.criterion}
												onChange={(e) =>
													updateRubric(rubric.id, 'criterion', e.target.value)
												}
												placeholder="e.g., Code Quality, Accuracy"
												disabled={loading}
											/>
										</div>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => deleteRubric(rubric.id)}
											disabled={loading}
											className="text-error hover:bg-error/10 hover:text-error ml-4"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>

									{/* Performance Levels */}
									<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
										{[
											{ label: 'Excellent', key: 'excellent', color: 'bg-success/10 border-success' },
											{ label: 'Good', key: 'good', color: 'bg-primary/10 border-primary' },
											{ label: 'Satisfactory', key: 'satisfactory', color: 'bg-warning/10 border-warning' },
											{ label: 'Poor', key: 'poor', color: 'bg-error/10 border-error' },
										].map(({ label, key, color }) => (
											<div key={key} className={`p-3 border rounded-lg ${color}`}>
												<label className="text-caption font-medium text-neutralDark block mb-2">
													{label}
												</label>
												<textarea
													value={rubric[key]}
													onChange={(e) => updateRubric(rubric.id, key, e.target.value)}
													placeholder={`Define ${label.toLowerCase()} standards`}
													rows={3}
													className="w-full text-caption rounded border border-input bg-background px-2 py-1 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
													disabled={loading}
												/>
											</div>
										))}
									</div>

									<div>
										<label className="text-caption font-medium text-neutralDark block mb-1">
											Weight (%)
										</label>
										<Input
											type="number"
											min="0"
											max="100"
											value={rubric.weight}
											onChange={(e) => updateRubric(rubric.id, 'weight', parseFloat(e.target.value) || 0)}
											placeholder="0"
											disabled={loading}
										/>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Messages */}
			{error && (
				<div className="p-4 bg-error/10 border border-error rounded-lg flex items-start gap-3">
					<AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
					<div>
						<p className="text-body font-medium text-error">Validation Error</p>
						<p className="text-body text-error/80">{error}</p>
					</div>
				</div>
			)}

			{success && (
				<div className="p-4 bg-success/10 border border-success rounded-lg flex items-start gap-3">
					<CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
					<p className="text-body text-success">{success}</p>
				</div>
			)}

			{/* Save Button */}
			<Button
				type="button"
				onClick={handleSave}
				disabled={loading}
				size="lg"
				className="w-full"
			>
				{loading ? 'Saving Configuration...' : 'Save Grading Configuration'}
			</Button>
		</div>
	);
}
