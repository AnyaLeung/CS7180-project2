import { FileUploader } from './components/FileUploader';
import type { UploadResult } from './utils/uploadFile';

export default function App() {
  const handleUploadComplete = (result: UploadResult) => {
    console.log('File uploaded:', result);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-2xl font-bold italic text-indigo-400 tracking-tight">
          InstructScan
        </h1>
      </header>
      <main className="flex items-center justify-center px-6 py-20">
        <FileUploader onUploadComplete={handleUploadComplete} />
      </main>
    </div>
  );
}
