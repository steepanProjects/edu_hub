import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { ArrowLeft, CheckCircle, XCircle, Clock, Award } from 'lucide-react';

export default function QuizResult() {
  const { attemptId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizResult();
  }, [attemptId]);

  async function fetchQuizResult() {
    try {
      // Fetch attempt details
      const { data: attemptData, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select(`
          *,
          quizzes (
            id,
            title,
            description,
            time_limit,
            classroom_id,
            classrooms (
              id,
              name
            )
          )
        `)
        .eq('id', attemptId)
        .single();

      if (attemptError) throw attemptError;

      // Verify user owns this attempt
      if (attemptData.student_id !== currentUser.uid) {
        navigate('/dashboard');
        return;
      }

      setAttempt(attemptData);
      setQuiz(attemptData.quizzes);

      // Fetch responses with questions and options
      const { data: responsesData, error: responsesError } = await supabase
        .from('quiz_responses')
        .select(`
          *,
          quiz_questions (
            id,
            question_text,
            question_type,
            points,
            quiz_options (
              id,
              option_text,
              is_correct,
              order_index
            )
          )
        `)
        .eq('attempt_id', attemptId)
        .order('created_at');

      if (responsesError) throw responsesError;
      setResponses(responsesData || []);

    } catch (error) {
      console.error('Error fetching quiz result:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!attempt || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Quiz result not found</h3>
          <p className="text-gray-600">This quiz result may have been deleted or you don't have access to it.</p>
        </div>
      </div>
    );
  }

  const scorePercentage = Math.round((attempt.score / attempt.total_points) * 100);
  const timeUsed = quiz.time_limit ? quiz.time_limit - (attempt.time_left || 0) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => navigate(`/classroom/${quiz.classroom_id}`)}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Quiz Results</h1>
              <p className="text-gray-600">{quiz.title}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Score Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="text-center">
            <div className="mx-auto w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <Award className="h-12 w-12 text-primary-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {attempt.score} / {attempt.total_points}
            </h2>
            <p className="text-xl text-gray-600 mb-4">
              {scorePercentage}% Correct
            </p>
            
            <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Submitted: {new Date(attempt.submitted_at).toLocaleDateString()}
              </div>
              {timeUsed && (
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Time used: {Math.floor(timeUsed / 60)}:{(timeUsed % 60).toString().padStart(2, '0')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quiz Description */}
        {quiz.description && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quiz Description</h3>
            <p className="text-gray-700">{quiz.description}</p>
          </div>
        )}

        {/* Question Review */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Question Review</h3>
          
          <div className="space-y-6">
            {responses.map((response, index) => {
              const question = response.quiz_questions;
              const isCorrect = response.is_correct;
              
              return (
                <div key={response.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-2">
                        Question {index + 1}
                      </h4>
                      <p className="text-gray-700 mb-3">{question.question_text}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {question.points} point{question.points !== 1 ? 's' : ''}
                      </span>
                      {isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </div>

                  {/* Answer Options */}
                  <div className="space-y-2">
                    {question.question_type === 'multiple_choice' && (
                      question.quiz_options
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((option) => {
                          const isSelected = response.selected_option_id === option.id;
                          const isCorrectOption = option.is_correct;
                          
                          return (
                            <div
                              key={option.id}
                              className={`p-3 rounded-lg border ${
                                isCorrectOption
                                  ? 'bg-green-50 border-green-200 text-green-800'
                                  : isSelected && !isCorrectOption
                                  ? 'bg-red-50 border-red-200 text-red-800'
                                  : 'bg-gray-50 border-gray-200 text-gray-700'
                              }`}
                            >
                              <div className="flex items-center">
                                <span className="font-medium">{option.option_text}</span>
                                {isCorrectOption && (
                                  <CheckCircle className="h-4 w-4 ml-2 text-green-500" />
                                )}
                                {isSelected && !isCorrectOption && (
                                  <XCircle className="h-4 w-4 ml-2 text-red-500" />
                                )}
                              </div>
                            </div>
                          );
                        })
                    )}

                    {question.question_type === 'true_false' && (
                      <div className="space-y-2">
                        {question.quiz_options
                          .sort((a, b) => a.order_index - b.order_index)
                          .map((option) => {
                            const isSelected = response.answer_text === option.option_text;
                            const isCorrectOption = option.is_correct;
                            
                            return (
                              <div
                                key={option.id}
                                className={`p-3 rounded-lg border ${
                                  isCorrectOption
                                    ? 'bg-green-50 border-green-200 text-green-800'
                                    : isSelected && !isCorrectOption
                                    ? 'bg-red-50 border-red-200 text-red-800'
                                    : 'bg-gray-50 border-gray-200 text-gray-700'
                                }`}
                              >
                                <div className="flex items-center">
                                  <span className="font-medium">{option.option_text}</span>
                                  {isCorrectOption && (
                                    <CheckCircle className="h-4 w-4 ml-2 text-green-500" />
                                  )}
                                  {isSelected && !isCorrectOption && (
                                    <XCircle className="h-4 w-4 ml-2 text-red-500" />
                                  )}
                                </div>
                              </div>
                            );
                          })
                        }
                      </div>
                    )}

                    {question.question_type === 'short_answer' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="text-sm text-gray-600 mb-1">Your answer:</p>
                          <p className="text-gray-900">
                            {response.answer_text || 'No answer provided'}
                          </p>
                        </div>
                        {isCorrect ? (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            <span className="text-sm">Correct answer</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600">
                            <XCircle className="h-4 w-4 mr-1" />
                            <span className="text-sm">Incorrect answer</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 text-sm text-gray-500">
                    Points earned: {response.points_earned} / {question.points}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => navigate(`/classroom/${quiz.classroom_id}`)}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Back to Classroom
          </button>
        </div>
      </div>
    </div>
  );
}
