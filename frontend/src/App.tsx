import { useState } from 'react';
import { FileUploader } from './components/FileUploader';
import { useFileUpload } from './hooks/useFileUpload';

const DEMO_TOKEN = 'demo-token';

function App() {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const { uploadState, uploadedFiles, handleUpload, clearError } =
    useFileUpload(DEMO_TOKEN);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800">
        <h1 className="text-xl font-bold italic text-purple-400">
          InstructScan
        </h1>
        <nav className="flex items-center gap-4 text-sm">
          <button className="px-3 py-1 rounded bg-purple-600 text-white">
            Editor
          </button>
          <button className="px-3 py-1 rounded text-gray-400 hover:text-white">
            History
          </button>
          <button className="px-3 py-1 rounded text-gray-400 hover:text-white">
            Settings
          </button>
        </nav>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <FileUploader
          uploadState={uploadState}
          uploadedFiles={uploadedFiles}
          onUpload={handleUpload}
          onClearError={clearError}
          selectedFileId={selectedFileId}
          onSelectFile={setSelectedFileId}
        />

        <main className="flex-1 flex items-center justify-center">
          {selectedFileId ? (
            <p className="text-gray-500">
              Editor will render file {selectedFileId} here.
            </p>
          ) : (
            <p className="text-gray-500">
              Upload a .py file to get started.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
