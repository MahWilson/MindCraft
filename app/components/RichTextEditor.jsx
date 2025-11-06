'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

export default function RichTextEditor({ value, onChange, placeholder = 'Start typing...' }) {
	const modules = useMemo(() => ({
		toolbar: [
			[{ 'header': [1, 2, 3, false] }],
			['bold', 'italic', 'underline', 'strike'],
			[{ 'list': 'ordered'}, { 'list': 'bullet' }],
			[{ 'color': [] }, { 'background': [] }],
			['link', 'code-block'],
			['clean']
		],
	}), []);

	const formats = [
		'header',
		'bold', 'italic', 'underline', 'strike',
		'list', 'bullet',
		'color', 'background',
		'link',
		'code-block'
	];

	return (
		<div className="rich-text-editor">
			<ReactQuill
				theme="snow"
				value={value || ''}
				onChange={onChange}
				modules={modules}
				formats={formats}
				placeholder={placeholder}
				className="bg-white"
			/>
		</div>
	);
}

