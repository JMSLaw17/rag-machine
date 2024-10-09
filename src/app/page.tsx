'use client';

import { useState } from "react";

import { SearchResponse } from "@/types";

export default function Home() {
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResponse, setSearchResponse] = useState<string | null>(null);

  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event?.target?.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      if (files[i].type === 'text/plain') {
        formData.append('txts', files[i]);
      }
    }

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      setUploadStatus('TXT files uploaded successfully');
    } catch (error) {
      console.error('Error:', error);
      setUploadStatus('Error uploading TXT files');
    }
  };

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const searchResponse: SearchResponse = await response.json();
      setSearchResponse(searchResponse.data);
    } catch (error) {
      console.error('Error:', error);
      setSearchResponse(null);
    }
  };

  return (
    <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)] bg-gray-900 text-white">
      <main className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">TXT Uploader and Searcher</h1>
        <p className="mb-2">Please upload a folder containing TXT files.</p>
        <input
          type="file"
          accept=".txt"
          onChange={handleFolderUpload}
          multiple
          className="mb-4 text-white bg-gray-800 p-2 rounded"
          aria-label="Upload TXT folder"
        />
        {uploadStatus && (
          <p className="mb-4 text-green-400">{uploadStatus}</p>
        )}
        <form onSubmit={handleSearch} className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter search query"
            className="w-full p-2 bg-gray-800 rounded text-white"
          />
          <button type="submit" className="mt-2 p-2 bg-blue-600 rounded">Search</button>
        </form>
        {searchResponse && (
          <div className="bg-gray-800 p-4 rounded-lg">
            <pre className="whitespace-pre-wrap text-gray-300">{searchResponse}</pre>
          </div>
        )}
      </main>
    </div>
  );
}
