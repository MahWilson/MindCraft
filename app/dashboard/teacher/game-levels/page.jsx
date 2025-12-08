'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Save, Wand2, RefreshCcw, UploadCloud } from 'lucide-react';

const blockLibrary = [
	{ type: 'start', label: 'Start', color: 'bg-emerald-200' },
	{ type: 'move_up', label: 'Move Up', color: 'bg-sky-200' },
	{ type: 'move_down', label: 'Move Down', color: 'bg-sky-200' },
	{ type: 'move_left', label: 'Move Left', color: 'bg-sky-200' },
	{ type: 'move_right', label: 'Move Right', color: 'bg-sky-200' },
	{ type: 'wait', label: 'Wait', color: 'bg-purple-200' },
	{ type: 'collect', label: 'Collect Coin', color: 'bg-amber-200' },
	{ type: 'say', label: 'Say', color: 'bg-indigo-200', requiresValue: true, placeholder: 'Hello team' },
];

function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

function runBlocks(blocks, levelConfig) {
	const { gridSize, goalRow, goalCol, coinTarget } = levelConfig;
	let row = 1;
	let col = 1;
	let coins = 0;
	const log = [];

	for (const block of blocks) {
		switch (block.type) {
		case 'move_up':
			row = clamp(row - 1, 1, gridSize);
			log.push('Move up');
			break;
		case 'move_down':
			row = clamp(row + 1, 1, gridSize);
			log.push('Move down');
			break;
		case 'move_left':
			col = clamp(col - 1, 1, gridSize);
			log.push('Move left');
			break;
		case 'move_right':
			col = clamp(col + 1, 1, gridSize);
			log.push('Move right');
			break;
		case 'collect':
			coins += 1;
			log.push('Collect coin');
			break;
		case 'wait':
			log.push('Wait a beat');
			break;
		case 'say':
			log.push(`Say: ${block.value || '...'}`);
			break;
		default:
			break;
		}
	}

	const success = row === goalRow && col === goalCol && coins >= coinTarget;

	return {
		row,
		col,
		coins,
		success,
		log,
		needsCoins: coinTarget,
	};
}

function createBlockInstance(block) {
	return {
		id: crypto.randomUUID ? crypto.randomUUID() : `b_${Date.now()}_${Math.random()}`,
		type: block.type,
		label: block.label,
		value: block.requiresValue ? block.placeholder || '' : '',
	};
}

export default function GameLevelBuilder() {
	const [levels, setLevels] = useState([]);
	const [loadingLevels, setLoadingLevels] = useState(false);
	const [saving, setSaving] = useState(false);
	const [testing, setTesting] = useState(false);
	const [message, setMessage] = useState('');

	const [title, setTitle] = useState('');
	const [goal, setGoal] = useState('');
	const [points, setPoints] = useState(10);
	const [gridSize, setGridSize] = useState(5);
	const [goalRow, setGoalRow] = useState(3);
	const [goalCol, setGoalCol] = useState(3);
	const [coinTarget, setCoinTarget] = useState(0);
	const [workspaceBlocks, setWorkspaceBlocks] = useState([]);
	const [testResult, setTestResult] = useState(null);
	const [editingId, setEditingId] = useState(null);

	useEffect(() => {
		loadLevels();
	}, []);

	async function loadLevels() {
		setLoadingLevels(true);
		try {
			const res = await fetch('/api/game-levels');
			const data = await res.json();
			if (data.levels) {
				setLevels(data.levels);
			}
		} catch (err) {
			console.error(err);
		} finally {
			setLoadingLevels(false);
		}
	}

	function handlePaletteDragStart(event, block) {
		event.dataTransfer.setData(
			'text/plain',
			JSON.stringify({ source: 'palette', block })
		);
	}

	function handleWorkspaceDragStart(event, index) {
		event.dataTransfer.setData(
			'text/plain',
			JSON.stringify({ source: 'workspace', index })
		);
	}

	function handleWorkspaceDrop(event, targetIndex = workspaceBlocks.length) {
		event.preventDefault();
		const dataText = event.dataTransfer.getData('text/plain');
		if (!dataText) return;

		let data;
		try {
			data = JSON.parse(dataText);
		} catch (err) {
			console.error('Bad drag data', err);
			return;
		}

		if (data.source === 'palette' && data.block) {
			const newBlock = createBlockInstance(data.block);
			setWorkspaceBlocks(prev => {
				const clone = [...prev];
				clone.splice(targetIndex, 0, newBlock);
				return clone;
			});
		} else if (data.source === 'workspace' && typeof data.index === 'number') {
			const fromIndex = data.index;
			if (fromIndex === targetIndex) return;
			setWorkspaceBlocks(prev => {
				const clone = [...prev];
				const [moved] = clone.splice(fromIndex, 1);
				clone.splice(targetIndex, 0, moved);
				return clone;
			});
		}
	}

	function handleDragOver(event) {
		event.preventDefault();
	}

	function updateBlockValue(id, value) {
		setWorkspaceBlocks(prev => prev.map(block => block.id === id ? { ...block, value } : block));
	}

	function removeBlock(id) {
		setWorkspaceBlocks(prev => prev.filter(block => block.id !== id));
	}

	function resetWorkspace() {
		setWorkspaceBlocks([]);
		setTestResult(null);
		setEditingId(null);
		setMessage('');
	}

	function handleTest() {
		setTesting(true);
		const safeBlocks = workspaceBlocks.filter(b => b.type !== 'start');
		const result = runBlocks(safeBlocks, { gridSize, goalRow, goalCol, coinTarget });
		setTestResult(result);
		setMessage(result.success ? 'Goal reached in test!' : 'Test failed, tweak blocks.');
		setTimeout(() => setTesting(false), 300);
	}

	async function handleSave() {
		setSaving(true);
		setMessage('');
		try {
			const payload = {
				title,
				goal,
				points,
				gridSize,
				goalRow,
				goalCol,
				coinTarget,
				sampleBlocks: workspaceBlocks.map(({ type, value }) => ({ type, value })),
			};

			const res = await fetch(
				editingId ? `/api/game-levels/${editingId}` : '/api/game-levels',
				{
					method: editingId ? 'PUT' : 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				}
			);

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || 'Save failed');
			}

			setMessage('Level saved.');
			setEditingId(editingId || data.id);
			await loadLevels();
		} catch (err) {
			console.error(err);
			setMessage(err.message || 'Save failed');
		} finally {
			setSaving(false);
		}
	}

	function loadLevel(level) {
		setTitle(level.title || '');
		setGoal(level.goal || '');
		setPoints(level.points || 0);
		setGridSize(level.gridSize || 5);
		setGoalRow(level.goalRow || 1);
		setGoalCol(level.goalCol || 1);
		setCoinTarget(level.coinTarget || 0);
		setWorkspaceBlocks(
			(level.sampleBlocks || []).map(block => ({
				id: crypto.randomUUID ? crypto.randomUUID() : `b_${Date.now()}_${Math.random()}`,
				type: block.type,
				value: block.value || '',
			}))
		);
		setEditingId(level.id);
		setTestResult(null);
		setMessage(`Loaded ${level.title}`);
	}

	const gridPreview = useMemo(() => {
		const cells = [];
		for (let r = 1; r <= gridSize; r += 1) {
			for (let c = 1; c <= gridSize; c += 1) {
				const isGoal = goalRow === r && goalCol === c;
				cells.push(
					<div
						key={`${r}-${c}`}
						className={`h-10 w-10 border text-center text-xs flex items-center justify-center ${isGoal ? 'bg-emerald-100 border-emerald-400' : 'bg-white'}`}
					>
						{isGoal ? 'Goal' : ''}
					</div>
				);
			}
		}
		return cells;
	}, [gridSize, goalRow, goalCol]);

	return (
		<div className="space-y-6">
			<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
				<div>
					<h1 className="text-h1 text-neutralDark">Game Level Blocks</h1>
					<p className="text-body text-muted-foreground">Drag, test, and save Scratch-like levels.</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={resetWorkspace}>
						<RefreshCcw className="h-4 w-4 mr-2" />
						Clear
					</Button>
					<Button onClick={handleSave} disabled={saving}>
						<Save className="h-4 w-4 mr-2" />
						{saving ? 'Saving...' : 'Save level'}
					</Button>
				</div>
			</div>

			{message && <p className="text-body text-emerald-700">{message}</p>}

			<div className="grid gap-4 lg:grid-cols-[320px,1fr]">
				{/* Palette */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Wand2 className="h-5 w-5" />
							Block palette
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{blockLibrary.map(block => (
							<div
								key={block.type}
								draggable
								onDragStart={e => handlePaletteDragStart(e, block)}
								className={`cursor-grab rounded px-3 py-2 border text-sm ${block.color}`}
							>
								{block.label}
							</div>
						))}
					</CardContent>
				</Card>

				{/* Workspace */}
				<Card>
					<CardHeader className="flex flex-col gap-2">
						<CardTitle className="text-h3">Workspace</CardTitle>
						<p className="text-caption text-muted-foreground">Drag blocks here then run a test.</p>
						<div className="flex gap-2">
							<Button variant="secondary" onClick={handleTest} disabled={testing}>
								<Play className="h-4 w-4 mr-2" />
								{testing ? 'Testing...' : 'Test level'}
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						<div
							onDragOver={handleDragOver}
							onDrop={event => handleWorkspaceDrop(event, workspaceBlocks.length)}
							className="min-h-[220px] border rounded p-3 bg-muted/40 space-y-2"
						>
							{workspaceBlocks.length === 0 && (
								<p className="text-caption text-muted-foreground">Drag blocks from the left.</p>
							)}
							{workspaceBlocks.map((block, index) => (
								<div
									key={block.id}
									draggable
									onDragStart={event => handleWorkspaceDragStart(event, index)}
									onDragOver={handleDragOver}
									onDrop={event => handleWorkspaceDrop(event, index)}
									className="flex items-center justify-between gap-2 rounded border bg-white px-3 py-2"
								>
									<div className="flex flex-col gap-1 w-full">
										<p className="text-body font-medium capitalize">{block.type.replace('_', ' ')}</p>
										{blockLibrary.find(b => b.type === block.type)?.requiresValue && (
											<input
												className="border rounded px-2 py-1 text-sm"
												value={block.value}
												onChange={e => updateBlockValue(block.id, e.target.value)}
												placeholder="type text"
											/>
										)}
									</div>
									<button
										type="button"
										className="text-xs text-error"
										onClick={() => removeBlock(block.id)}
									>
										remove
									</button>
								</div>
							))}
						</div>

						{testResult && (
							<div className="mt-4 rounded border bg-white p-3">
								<p className="text-body font-semibold">
									{testResult.success ? 'Goal reached!' : 'Not there yet.'}
								</p>
								<p className="text-caption text-muted-foreground">
									Row {testResult.row}, Col {testResult.col} • Coins {testResult.coins}/{testResult.needsCoins}
								</p>
								<ul className="mt-2 list-disc ml-4 text-caption text-neutralDark">
									{testResult.log.map((item, idx) => (
										<li key={idx}>{item}</li>
									))}
								</ul>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Level settings */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<UploadCloud className="h-5 w-5" />
						Level settings
					</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<label className="text-caption text-neutralDark">Level title</label>
						<Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Maze runner" />
					</div>
					<div className="space-y-2">
						<label className="text-caption text-neutralDark">Points</label>
						<Input
							type="number"
							value={points}
							onChange={e => setPoints(Number(e.target.value))}
							min={0}
						/>
					</div>
					<div className="space-y-2 md:col-span-2">
						<label className="text-caption text-neutralDark">Goal / problem</label>
						<textarea
							value={goal}
							onChange={e => setGoal(e.target.value)}
							className="w-full rounded border px-3 py-2 text-sm"
							placeholder="Guide the crab to the goal and collect coins."
							rows={3}
						/>
					</div>
					<div className="space-y-2">
						<label className="text-caption text-neutralDark">Grid size</label>
						<Input
							type="number"
							min={3}
							max={8}
							value={gridSize}
							onChange={e => setGridSize(Number(e.target.value))}
						/>
					</div>
					<div className="space-y-2">
						<label className="text-caption text-neutralDark">Goal row</label>
						<Input
							type="number"
							min={1}
							max={gridSize}
							value={goalRow}
							onChange={e => setGoalRow(Number(e.target.value))}
						/>
					</div>
					<div className="space-y-2">
						<label className="text-caption text-neutralDark">Goal column</label>
						<Input
							type="number"
							min={1}
							max={gridSize}
							value={goalCol}
							onChange={e => setGoalCol(Number(e.target.value))}
						/>
					</div>
					<div className="space-y-2">
						<label className="text-caption text-neutralDark">Coins needed</label>
						<Input
							type="number"
							min={0}
							value={coinTarget}
							onChange={e => setCoinTarget(Number(e.target.value))}
						/>
					</div>
					<div className="space-y-2">
						<label className="text-caption text-neutralDark">Goal preview</label>
						<div
							className="grid gap-1"
							style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
						>
							{gridPreview}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Saved levels */}
			<Card>
				<CardHeader>
					<CardTitle>Saved levels</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-3 md:grid-cols-2">
					{loadingLevels && <p className="text-caption text-muted-foreground">Loading levels...</p>}
					{!loadingLevels && levels.length === 0 && (
						<p className="text-caption text-muted-foreground">No levels yet. Save one to list it.</p>
					)}
					{levels.map(level => (
						<div key={level.id} className="border rounded p-3 space-y-1 bg-white">
							<p className="text-body font-semibold">{level.title}</p>
							<p className="text-caption text-muted-foreground line-clamp-2">{level.goal}</p>
							<p className="text-caption text-neutralDark">Points: {level.points || 0}</p>
							<div className="flex gap-2 pt-1">
								<Button size="sm" variant="outline" onClick={() => loadLevel(level)}>
									Edit / Load
								</Button>
							</div>
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}


