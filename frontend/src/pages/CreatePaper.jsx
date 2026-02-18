import { useAuth } from '../context/authContext';
import Navbar from '../components/Navbar';
import QuestionPaperCreator from '../components/QuestionPaperCreator';

const CreatePaper = () => {
  const { user } = useAuth();

  if (user.role !== 'faculty') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded">
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p>Only Faculty members can create question papers.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <QuestionPaperCreator />
    </div>
  );
};

export default CreatePaper;