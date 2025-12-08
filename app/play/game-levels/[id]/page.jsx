'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Target, Trophy } from 'lucide-react';

const blockLibrary = [
	{ type: 'move_up', label: 'Move Up', color: 'bg-sky-200' },
	{ type: 'move_down', label: 'Move Down', color: 'bg-sky-200' },
	{ type: 'move_left', label: 'Move Left', color: 'bg-sky-200' },
	{ type: 'move_right', label: 'Move Right', color: 'bg-sky-200' },
	{ type: 'wait', label: 'Wait', color: 'bg-purple-200' },
	{ type: 'collect', label: 'Collect Coin', color: 'bg-amber-200' },
	{ type: 'say', label: 'Say', color: 'bg-indigo-200', requiresValue: true, placeholder: 'hello' },
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
	return { row, col, coins, success, log, needsCoins: coinTarget };
}

function createBlockInstance(block) {
	return {
		id: crypto.randomUUID ? crypto.randomUUID() : `b_${Date.now()}_${Math.random()}`,
		type: block.type,
		value: block.requiresValue ? block.placeholder || '' : '',
	};
}

export default function PlayGameLevel() {
	const params = useParams();
	const levelId = params?.id;

	const [level, setLevel] = useState(null);
	const [loading, setLoading] = useState(true);
	const [workspaceBlocks, setWorkspaceBlocks] = useState([]);
	const [result, setResult] = useState(null);
	const [user, setUser] = useState(null);
	const [message, setMessage] = useState('');
	const [awarding, setAwarding] = useState(false);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, currentUser => setUser(currentUser));
		return () => unsubscribe();
	}, []);

	useEffect(() => {
		async function loadLevel() {
			if (!levelId) return;
			setLoading(true);
			try {
				const res = await fetch(`/api/game-levels/${levelId}`);
				const data = await res.json();
				if (data.level) {
					setLevel(data.level);
					// start with teacher sample blocks as hints
					setWorkspaceBlocks(
						(data.level.sampleBlocks || []).map(block => ({
							id: crypto.randomUUID ? crypto.randomUUID() : `b_${Date.now()}_${Math.random()}`,
							type: block.type,
							value: block.value || '',
						}))
					);
				}
			} catch (err) {
				console.error(err);
			} finally {
				setLoading(false);
			}
		}
		loadLevel();
	}, [levelId]);

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

	async function awardPoints() {
		if (!level) return;
		if (!user) {
			setMessage('Sign in to record points.');
			return;
		}
		setAwarding(true);
		try {
			const res = await fetch(`/api/game-levels/${level.id}/award`, { method: 'POST' });
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || 'Could not award points');
			}
			setMessage(`Points added to your profile: +${data.pointsEarned}`);
		} catch (err) {
			console.error(err);
			setMessage(err.message || 'Could not add points');
		} finally {
			setAwarding(false);
		}
	}

	function handleRun() {
		if (!level) return;
		const sim = runBlocks(workspaceBlocks, level);
		setResult(sim);
		if (sim.success) {
			awardPoints();
		} else {
			setMessage('Try again until you hit the goal.');
		}
	}

	const gridPreview = useMemo(() => {
		if (!level) return [];
		const cells = [];
		for (let r = 1; r <= level.gridSize; r += 1) {
			for (let c = 1; c <= level.gridSize; c += 1) {
				const isGoal = level.goalRow === r && level.goalCol === c;
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
	}, [level]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[300px]">
				<p className="text-body text-muted-foreground">Loading level...</p>
			</div>
		);
	}

	if (!level) {
		return (
			<div className="flex items-center justify-center min-h-[300px]">
				<p className="text-body text-muted-foreground">Level not found.</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
				<div>
					<h1 className="text-h1 text-neutralDark">{level.title}</h1>
					<p className="text-body text-muted-foreground">{level.goal}</p>
				</div>
				<div className="flex items-center gap-2 text-body text-neutralDark">
					<Trophy className="h-5 w-5 text-amber-500" />
					{level.points || 0} pts
				</div>
			</div>

			{message && <p className="text-body text-emerald-700">{message}</p>}

			<div className="grid gap-4 lg:grid-cols-[320px,1fr]">
				{/* Palette */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Target className="h-5 w-5" />
							Blocks
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
						<CardTitle className="text-h3">Build your logic</CardTitle>
						<p className="text-caption text-muted-foreground">Drag, order, then run.</p>
						<Button onClick={handleRun} disabled={awarding}>
							<Play className="h-4 w-4 mr-2" />
							Run level
						</Button>
					</CardHeader>
					<CardContent>
						<div
							onDragOver={handleDragOver}
							onDrop={event => handleWorkspaceDrop(event, workspaceBlocks.length)}
							className="min-h-[220px] border rounded p-3 bg-muted/40 space-y-2"
						>
							{workspaceBlocks.length === 0 && (
								<p className="text-caption text-muted-foreground">Drag blocks here.</p>
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

						{result && (
							<div className="mt-4 rounded border bg-white p-3">
								<p className="text-body font-semibold">
									{result.success ? 'Goal reached!' : 'Keep trying.'}
								</p>
								<p className="text-caption text-muted-foreground">
									Row {result.row}, Col {result.col} • Coins {result.coins}/{result.needsCoins}
								</p>
								<ul className="mt-2 list-disc ml-4 text-caption text-neutralDark">
									{result.log.map((item, idx) => (
										<li key={idx}>{item}</li>
									))}
								</ul>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Level map</CardTitle>
				</CardHeader>
				<CardContent>
					<div
						className="grid gap-1"
						style={{ gridTemplateColumns: `repeat(${level.gridSize}, minmax(0, 1fr))` }}
					>
						{gridPreview}
					</div>
					<p className="text-caption text-muted-foreground mt-2">
						Start at row 1 col 1. Reach the green goal and meet coin target.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}


