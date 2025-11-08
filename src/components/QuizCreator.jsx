import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { ArrowLeft, Plus, Trash2, Save, Eye } from 'lucide-react';

export default function QuizCreator() {
  const { quizId } = useParams();
  const { currentUser } = useNavigate();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState({
    title: '',
    description: '',
    time_limit: ''
  });
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (quizId && quizId !== 'new') {
      fetchQuizData();
    }
  }, [quizId]);

  async function fetchQuizData() {
    try {
      setLoading(true);
      
      // Fetch quiz details
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (quizError) throw quizError;
      setQuiz(quizData);

      // Fetch questions with options
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select(`
          *,
          quiz_options (
            id,
            option_text,
            is_correct,
            order_index
          )
        `)
        .eq('quiz_id', quizId)
        .order('order_index');

      if (questionsError) throw questionsError;
      
      const formattedQuestions = questionsData.map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        points: q.points,
        order_index: q.order_index,
        options: q.quiz_options.sort((a, b) => a.order_index - b.order_index)
      }));
      
      setQuestions(formattedQuestions);
    } catch (error) {
      console.error('Error fetching quiz data:', error);
      setError('Failed to load quiz data');
    } finally {
      setLoading(false);
    }
  }

  function addQuestion() {
    const newQuestion = {
      id: `temp_${Date.now()}`,
      question_text: '',
      question_type: 'multiple_choice',
      points: 1,
      order_index: questions.length,
      options: [
        { id: `temp_option_${Date.now()}_1`, option_text: '', is_correct: false, order_index: 0 },
        { id: `temp_option_${Date.now()}_2`, option_text: '', is_correct: false, order_index: 1 }
      ]
    };
    setQuestions([...questions, newQuestion]);
  }

  function updateQuestion(questionId, updates) {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, ...updates } : q
    ));
  }

  function deleteQuestion(questionId) {
    setQuestions(questions.filter(q => q.id !== questionId));
  }

  function addOption(questionId) {
    const question = questions.find(q => q.id === questionId);
    const newOption = {
      id: `temp_option_${Date.now()}`,
      option_text: '',
      is_correct: false,
      order_index: question.options.length
    };
    
    updateQuestion(questionId, {
      options: [...question.options, newOption]
    });
  }

  function updateOption(questionId, optionId, updates) {
    const question = questions.find(q => q.id === questionId);
    const updatedOptions = question.options.map(opt =>
      opt.id === optionId ? { ...opt, ...updates } : opt
    );
    
    updateQuestion(questionId, { options: updatedOptions });
  }

  function deleteOption(questionId, optionId) {
    const question = questions.find(q => q.id === questionId);
    const updatedOptions = question.options.filter(opt => opt.id !== optionId);
    
    updateQuestion(questionId, { options: updatedOptions });
  }

  function setCorrectOption(questionId, optionId) {
    const question = questions.find(q => q.id === questionId);
    const updatedOptions = question.options.map(opt => ({
      ...opt,
      is_correct: opt.id === optionId
    }));
    
    updateQuestion(questionId, { options: updatedOptions });
  }

  async function saveQuiz() {
    setSaving(true);
    setError('');

    try {
      // Validate quiz
      if (!quiz.title.trim()) {
        throw new Error('Quiz title is required');
      }

      if (questions.length === 0) {
        throw new Error('At least one question is required');
      }

      // Validate questions
      for (const question of questions) {
        if (!question.question_text.trim()) {
          throw new Error('All questions must have text');
        }
        
        if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
          if (question.options.length < 2) {
            throw new Error('Multiple choice and true/false questions must have at least 2 options');
          }
          
          const hasCorrectOption = question.options.some(opt => opt.is_correct);
          if (!hasCorrectOption) {
            throw new Error('Each question must have at least one correct option');
          }
        }
      }

      let savedQuiz;
      
      if (quizId === 'new') {
        // Create new quiz
        const { data: newQuiz, error: quizError } = await supabase
          .from('quizzes')
          .insert({
            title: quiz.title,
            description: quiz.description,
            time_limit: quiz.time_limit ? parseInt(quiz.time_limit) : null,
            created_by: currentUser.uid,
            classroom_id: quiz.classroom_id
          })
          .select()
          .single();

        if (quizError) throw quizError;
        savedQuiz = newQuiz;
      } else {
        // Update existing quiz
        const { data: updatedQuiz, error: quizError } = await supabase
          .from('quizzes')
          .update({
            title: quiz.title,
            description: quiz.description,
            time_limit: quiz.time_limit ? parseInt(quiz.time_limit) : null
          })
          .eq('id', quizId)
          .select()
          .single();

        if (quizError) throw quizError;
        savedQuiz = updatedQuiz;
      }

      // Save questions
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        
        let savedQuestion;
        
        if (question.id.startsWith('temp_')) {
          // Create new question
          const { data: newQuestion, error: questionError } = await supabase
            .from('quiz_questions')
            .insert({
              quiz_id: savedQuiz.id,
              question_text: question.question_text,
              question_type: question.question_type,
              points: question.points,
              order_index: i
            })
            .select()
            .single();

          if (questionError) throw questionError;
          savedQuestion = newQuestion;
        } else {
          // Update existing question
          const { data: updatedQuestion, error: questionError } = await supabase
            .from('quiz_questions')
            .update({
              question_text: question.question_text,
              question_type: question.question_type,
              points: question.points,
              order_index: i
            })
            .eq('id', question.id)
            .select()
            .single();

          if (questionError) throw questionError;
          savedQuestion = updatedQuestion;
        }

        // Save options
        for (let j = 0; j < question.options.length; j++) {
          const option = question.options[j];
          
          if (option.id.startsWith('temp_option_')) {
            // Create new option
            await supabase
              .from('quiz_options')
              .insert({
                question_id: savedQuestion.id,
                option_text: option.option_text,
                is_correct: option.is_correct,
                order_index: j
              });
          } else {
            // Update existing option
            await supabase
              .from('quiz_options')
              .update({
                option_text: option.option_text,
                is_correct: option.is_correct,
                order_index: j
              })
              .eq('id', option.id);
          }
        }
      }

      navigate(`/classroom/${quiz.classroom_id}`);
    } catch (error) {
      console.error('Error saving quiz:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate(`/classroom/${quiz.classroom_id}`)}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {quizId === 'new' ? 'Create Quiz' : 'Edit Quiz'}
                </h1>
                <p className="text-gray-600">Design your quiz questions and answers</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={saveQuiz}
                disabled={saving}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Quiz'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Quiz Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quiz Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quiz Title *
              </label>
              <input
                type="text"
                value={quiz.title}
                onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter quiz title"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Limit (minutes)
              </label>
              <input
                type="number"
                value={quiz.time_limit}
                onChange={(e) => setQuiz({ ...quiz, time_limit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Optional time limit"
                min="1"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={quiz.description}
              onChange={(e) => setQuiz({ ...quiz, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter quiz description"
            />
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((question, index) => (
            <QuestionEditor
              key={question.id}
              question={question}
              index={index}
              onUpdate={(updates) => updateQuestion(question.id, updates)}
              onDelete={() => deleteQuestion(question.id)}
              onAddOption={() => addOption(question.id)}
              onUpdateOption={(optionId, updates) => updateOption(question.id, optionId, updates)}
              onDeleteOption={(optionId) => deleteOption(question.id, optionId)}
              onSetCorrectOption={(optionId) => setCorrectOption(question.id, optionId)}
            />
          ))}
        </div>

        {/* Add Question Button */}
        <div className="mt-6">
          <button
            onClick={addQuestion}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </button>
        </div>
      </div>
    </div>
  );
}

// Question Editor Component
function QuestionEditor({ question, index, onUpdate, onDelete, onAddOption, onUpdateOption, onDeleteOption, onSetCorrectOption }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Question {index + 1}
        </h3>
        <button
          onClick={onDelete}
          className="p-2 text-red-600 hover:text-red-800"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Question Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question Text *
          </label>
          <textarea
            value={question.question_text}
            onChange={(e) => onUpdate({ question_text: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="Enter your question"
            required
          />
        </div>

        {/* Question Type and Points */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Type
            </label>
            <select
              value={question.question_type}
              onChange={(e) => onUpdate({ question_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="multiple_choice">Multiple Choice</option>
              <option value="true_false">True/False</option>
              <option value="short_answer">Short Answer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Points
            </label>
            <input
              type="number"
              value={question.points}
              onChange={(e) => onUpdate({ points: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              min="1"
            />
          </div>
        </div>

        {/* Options */}
        {(question.question_type === 'multiple_choice' || question.question_type === 'true_false') && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Answer Options *
              </label>
              <button
                onClick={onAddOption}
                className="flex items-center px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Option
              </button>
            </div>
            
            <div className="space-y-3">
              {question.options.map((option, optionIndex) => (
                <div key={option.id} className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name={`correct_${question.id}`}
                    checked={option.is_correct}
                    onChange={() => onSetCorrectOption(option.id)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                  />
                  <input
                    type="text"
                    value={option.option_text}
                    onChange={(e) => onUpdateOption(option.id, { option_text: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder={`Option ${optionIndex + 1}`}
                  />
                  <button
                    onClick={() => onDeleteOption(option.id)}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Short Answer Note */}
        {question.question_type === 'short_answer' && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              Short answer questions will be manually graded. Students will provide text responses.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
