'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function ReportGenerator({ data, type = 'student' }) {
	const { language } = useLanguage();
	const [showOptions, setShowOptions] = useState(false);
	const [reportOptions, setReportOptions] = useState({
		includeMarks: true,
		includeProgress: true,
		includeFeedback: true,
		includeCharts: true,
		includeAttendance: false, // Attendance records (if available)
		format: 'json', // 'json', 'csv', 'pdf', 'word', 'excel'
	});

	function handleGenerateReport() {
		if (!data) {
			alert(language === 'bm' 
				? 'Tiada data untuk dijana'
				: 'No data to generate');
			return;
		}

		try {
			// Validate options (A3: Report Generation Error)
			if (!reportOptions.includeMarks && !reportOptions.includeProgress && !reportOptions.includeFeedback) {
				alert(language === 'bm' 
					? 'Sila pilih sekurang-kurangnya satu pilihan data untuk dimasukkan dalam laporan.'
					: 'Please select at least one data option to include in the report.');
				return;
			}

			// Prepare report data based on options
			const reportData = {
				generatedAt: new Date().toISOString(),
				type: type,
			};

			if (type === 'student') {
				// Student data structure
				if (reportOptions.includeMarks) {
					reportData.marks = data.assessments || data.assignments || [];
				}

				if (reportOptions.includeProgress) {
					reportData.progress = {
						overallProgress: data.overallProgress || 0,
						completedLessons: data.completedLessons || 0,
						completedModules: data.completedModules || 0,
					};
				}

				if (reportOptions.includeFeedback) {
					const allSubmissions = [...(data.assessments || []), ...(data.assignments || [])];
					reportData.feedback = allSubmissions.filter(sub => sub.feedback).map(sub => ({
						title: sub.assessmentTitle || sub.assignmentTitle,
						feedback: sub.feedback,
					}));
				}

				if (reportOptions.includeCharts && data.scoreTrends) {
					reportData.charts = {
						scoreTrends: data.scoreTrends,
					};
				}

				if (reportOptions.includeAttendance) {
					// Note: Attendance tracking is not currently implemented in the system
					// This is a placeholder for future attendance feature
					reportData.attendance = {
						note: language === 'bm' 
							? 'Rekod kehadiran tidak tersedia dalam sistem pada masa ini.'
							: 'Attendance records are not currently available in the system.',
						records: []
					};
				}
			} else {
				// Teacher analytics data structure
				if (reportOptions.includeMarks) {
					reportData.marks = {
						averageScore: data.overallStats?.avgScore || 0,
						scoreTrends: data.scoreTrends || [],
					};
				}

				if (reportOptions.includeProgress) {
					reportData.progress = {
						totalStudents: data.overallStats?.totalStudents || 0,
						avgCompletionRate: data.overallStats?.avgCompletionRate || 0,
						completionRates: data.completionRates || [],
					};
				}

				if (reportOptions.includeFeedback) {
					reportData.feedback = {
						atRiskStudents: data.atRiskStudents || [],
						riskSummary: data.riskSummary || {},
					};
				}

				if (reportOptions.includeCharts) {
					reportData.charts = {
						scoreTrends: data.scoreTrends || [],
						completionRates: data.completionRates || [],
						topicHeatmap: data.topicHeatmap || [],
					};
				}

				if (reportOptions.includeAttendance) {
					// Note: Attendance tracking is not currently implemented in the system
					reportData.attendance = {
						note: language === 'bm' 
							? 'Rekod kehadiran tidak tersedia dalam sistem pada masa ini.'
							: 'Attendance records are not currently available in the system.',
						records: []
					};
				}
			}

			// Generate file based on format
			if (reportOptions.format === 'json') {
				downloadJSON(reportData);
			} else if (reportOptions.format === 'csv') {
				downloadCSV(reportData);
			} else if (reportOptions.format === 'pdf') {
				downloadPDF(reportData);
			} else if (reportOptions.format === 'word') {
				downloadWord(reportData);
			} else if (reportOptions.format === 'excel') {
				downloadExcel(reportData);
			}

			setShowOptions(false);
		} catch (err) {
			console.error('Error generating report:', err);
			alert(language === 'bm' 
				? 'Pembuatan laporan gagal. Sila semak pilihan anda.'
				: 'Report generation failed. Please check your selections.');
		}
	}

	function downloadJSON(data) {
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		downloadFile(blob, `report-${Date.now()}.json`);
	}

	function downloadCSV(data) {
		const headers = [];
		const rows = [];

		if (data.marks) {
			headers.push('Assessment/Assignment', 'Score', 'Grade');
			data.marks.forEach(item => {
				rows.push([
					item.title || item.assessmentTitle || 'N/A',
					item.score || item.grade || 'N/A',
					item.grade || 'N/A',
				]);
			});
		}

		const csvContent = [
			headers.join(','),
			...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
		].join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		downloadFile(blob, `report-${Date.now()}.csv`);
	}

	function downloadPDF(data) {
		// For PDF, we'll create a simple HTML representation and suggest using browser print
		// In production, you'd use a library like jsPDF or puppeteer
		// For now, generate HTML that can be printed to PDF
		const htmlContent = generateHTMLReport(data);
		const blob = new Blob([htmlContent], { type: 'text/html' });
		const url = URL.createObjectURL(blob);
		window.open(url, '_blank');
		// Note: User can use browser's "Print to PDF" feature
		alert(language === 'bm' 
			? 'Laporan HTML telah dibuka. Gunakan "Cetak ke PDF" dalam penyemak imbas anda untuk menyimpan sebagai PDF.'
			: 'HTML report opened. Use "Print to PDF" in your browser to save as PDF.');
	}

	function downloadWord(data) {
		// For Word, we'll create a simple HTML representation
		// In production, you'd use a library like docx
		// For now, generate HTML that can be opened in Word
		const htmlContent = generateHTMLReport(data);
		const blob = new Blob([htmlContent], { type: 'application/msword' });
		downloadFile(blob, `report-${Date.now()}.doc`);
	}

	function generateHTMLReport(data) {
		return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>Performance Report</title>
	<style>
		body { font-family: Arial, sans-serif; padding: 20px; }
		h1 { color: #333; }
		table { border-collapse: collapse; width: 100%; margin-top: 20px; }
		th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
		th { background-color: #f2f2f2; }
	</style>
</head>
<body>
	<h1>Performance Report</h1>
	<p>Generated: ${new Date().toLocaleString()}</p>
	${data.marks ? `<h2>Marks</h2><table>${data.marks.map(item => `<tr><td>${item.title || 'N/A'}</td><td>${item.score || item.grade || 'N/A'}</td></tr>`).join('')}</table>` : ''}
	${data.progress ? `<h2>Progress</h2><p>Overall: ${data.progress.overallProgress}%</p>` : ''}
</body>
</html>`;
	}

	function downloadExcel(data) {
		// For Excel, we'll create CSV which can be opened in Excel
		downloadCSV(data);
	}

	function downloadFile(blob, filename) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	return (
		<div>
			<Button 
				variant="outline" 
				onClick={() => setShowOptions(!showOptions)}
				className="flex items-center gap-2"
			>
				<Download className="h-4 w-4" />
				{language === 'bm' ? 'Eksport Laporan' : 'Export Report'}
			</Button>

			{showOptions && (
				<Card className="mt-4 absolute z-10 w-full max-w-md">
					<CardHeader>
						<CardTitle>{language === 'bm' ? 'Pilihan Laporan' : 'Report Options'}</CardTitle>
						<CardDescription>
							{language === 'bm' 
								? 'Pilih data yang ingin dimasukkan dalam laporan'
								: 'Select data to include in the report'}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-3">
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={reportOptions.includeMarks}
									onChange={(e) => setReportOptions({ ...reportOptions, includeMarks: e.target.checked })}
									className="w-4 h-4"
								/>
								<span className="text-sm">{language === 'bm' ? 'Termasuk Markah' : 'Include Marks'}</span>
							</label>
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={reportOptions.includeProgress}
									onChange={(e) => setReportOptions({ ...reportOptions, includeProgress: e.target.checked })}
									className="w-4 h-4"
								/>
								<span className="text-sm">{language === 'bm' ? 'Termasuk Kemajuan' : 'Include Progress'}</span>
							</label>
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={reportOptions.includeFeedback}
									onChange={(e) => setReportOptions({ ...reportOptions, includeFeedback: e.target.checked })}
									className="w-4 h-4"
								/>
								<span className="text-sm">{language === 'bm' ? 'Termasuk Maklum Balas' : 'Include Feedback'}</span>
							</label>
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={reportOptions.includeCharts}
									onChange={(e) => setReportOptions({ ...reportOptions, includeCharts: e.target.checked })}
									className="w-4 h-4"
								/>
								<span className="text-sm">{language === 'bm' ? 'Termasuk Carta' : 'Include Charts'}</span>
							</label>
							<label className="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={reportOptions.includeAttendance}
									onChange={(e) => setReportOptions({ ...reportOptions, includeAttendance: e.target.checked })}
									className="w-4 h-4"
								/>
								<span className="text-sm">{language === 'bm' ? 'Termasuk Rekod Kehadiran' : 'Include Attendance Records'}</span>
								<span className="text-xs text-muted-foreground ml-1">
									({language === 'bm' ? 'Tidak tersedia' : 'Not available'})
								</span>
							</label>
						</div>

						<div>
							<label className="block text-sm font-medium mb-2">
								{language === 'bm' ? 'Format Fail' : 'File Format'}
							</label>
							<select
								value={reportOptions.format}
								onChange={(e) => setReportOptions({ ...reportOptions, format: e.target.value })}
								className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
							>
								<option value="json">JSON</option>
								<option value="csv">CSV / Excel</option>
								<option value="pdf">PDF (Coming Soon)</option>
								<option value="word">Word (Coming Soon)</option>
							</select>
						</div>

						<div className="flex gap-2 pt-2">
							<Button onClick={handleGenerateReport} className="flex-1">
								<Download className="h-4 w-4 mr-2" />
								{language === 'bm' ? 'Jana Laporan' : 'Generate Report'}
							</Button>
							<Button variant="outline" onClick={() => setShowOptions(false)}>
								{language === 'bm' ? 'Batal' : 'Cancel'}
							</Button>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

