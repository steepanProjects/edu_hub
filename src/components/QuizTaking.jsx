import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { ArrowLeft, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default function QuizTaking() {
  const { quizId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attempt, setAttempt] = useState(null);
  const [responses, setResponses] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQuizData();
  }, [quizId]);

  useEffect(() => {
    let timer;
    if (timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0) {
      handleSubmitQuiz();
    }
    return () => clearTimeout(timer);
  }, [timeLeft]);

  async function fetchQuizData() {
    try {
      // Fetch quiz details
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select(`
          *,
          users (
            full_name
          ),
          classrooms (
            id,
            name
          )
        `)
        .eq('id', quizId)
        .single();

      if (quizError) throw quizError;

      // Check if user is a member of the classroom
      const { data: membership, error: membershipError } = await supabase
        .from('classroom_members')
        .select('*')
        .eq('classroom_id', quizData.classroom_id)
        .eq('user_id', currentUser.uid)
        .single();

      if (membershipError || !membership) {
        navigate('/dashboard');
        return;
      }

      // Check if user is a tutor (tutors can't take quizzes)
      if (membership.role === 'tutor') {
        navigate(`/classroom/${quizData.classroom_id}`);
        return;
      }

      setQuiz(quizData);

      // Fetch questions
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
      setQuestions(questionsData || []);

      // Check for existing attempt
      const { data: attemptData, error: attemptError } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('quiz_id', quizId)
        .eq('student_id', currentUser.uid)
        .single();

      if (!attemptError && attemptData) {
        if (attemptData.submitted_at) {
          // Quiz already completed
          navigate(`/quiz-result/${attemptData.id}`);
          return;
        } else {
          // Resume existing attempt
          setAttempt(attemptData);
          setTimeLeft(attemptData.time_left || null);
          
          // Fetch existing responses
          const { data: responsesData, error: responsesError } = await supabase
            .from('quiz_responses')
            .select('*')
            .eq('attempt_id', attemptData.id);

          if (!responsesError && responsesData) {
            const responsesObj = {};
            responsesData.forEach(response => {
              responsesObj[response.question_id] = {
                answer_text: response.answer_text,
                selected_option_id: response.selected_option_id
              };
            });
            setResponses(responsesObj);
          }
        }
      } else {
        // Start new attempt
        const { data: newAttempt, error: newAttemptError } = await supabase
          .from('quiz_attempts')
          .insert({
            quiz_id: quizId,
            student_id: currentUser.uid,
            time_left: quizData.time_limit
          })
          .select()
          .single();

        if (newAttemptError) throw newAttemptError;
        setAttempt(newAttempt);
        setTimeLeft(quizData.time_limit);
      }

    } catch (error) {
      console.error('Error fetching quiz data:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  function handleAnswerChange(questionId, answer) {
    setResponses(prev => ({
      ...prev,
      [questionId]: answer
    }));
  }

  function handleNextQuestion() {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  }

  function handlePreviousQuestion() {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  }

  async function handleSubmitQuiz() {
    setSubmitting(true);
    setError('');

    try {
      // Save all responses
      const responsePromises = Object.entries(responses).map(([questionId, response]) => {
        const question = questions.find(q => q.id === questionId);
        let isCorrect = false;
        let pointsEarned = 0;

        if (question.question_type === 'multiple_choice' && response.selected_option_id) {
          const selectedOption = question.quiz_options.find(opt => opt.id === response.selected_option_id);
          isCorrect = selectedOption?.is_correct || false;
          pointsEarned = isCorrect ? question.points : 0;
        } else if (question.question_type === 'true_false') {
          const correctAnswer = question.quiz_options.find(opt => opt.is_correct);
          isCorrect = response.answer_text === correctAnswer?.option_text;
          pointsEarned = isCorrect ? question.points : 0;
        } else if (question.question_type === 'short_answer') {
          // For short answer, we'll mark as correct for now (manual grading needed)
          isCorrect = response.answer_text && response.answer_text.trim().length > 0;
          pointsEarned = isCorrect ? question.points : 0;
        }

        return supabase
          .from('quiz_responses')
          .insert({
            attempt_id: attempt.id,
            question_id: questionId,
            answer_text: response.answer_text,
            selected_option_id: response.selected_option_id,
            is_correct: isCorrect,
            points_earned: pointsEarned
          });
      });

      await Promise.all(responsePromises);

      // Calculate total score
      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
      const earnedPoints = Object.values(responses).reduce((sum, response) => {
        const question = questions.find(q => q.id === Object.keys(responses).find(id => responses[id] === response));
        if (!question) return sum;
        
        if (question.question_type === 'multiple_choice' && response.selected_option_id) {
          const selectedOption = question.quiz_options.find(opt => opt.id === response.selected_option_id);
          return sum + (selectedOption?.is_correct ? question.points : 0);
        } else if (question.question_type === 'true_false') {
          const correctAnswer = question.quiz_options.find(opt => opt.is_correct);
          return sum + (response.answer_text === correctAnswer?.option_text ? question.points : 0);
        } else if (question.question_type === 'short_answer') {
          return sum + (response.answer_text && response.answer_text.trim().length > 0 ? question.points : 0);
        }
        return sum;
      }, 0);

      // Update attempt with final score
      await supabase
        .from('quiz_attempts')
        .update({
          submitted_at: new Date().toISOString(),
          score: earnedPoints,
          total_points: totalPoints,
          time_left: timeLeft
        })
        .eq('id', attempt.id);

      navigate(`/quiz-result/${attempt.id}`);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      setError('Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Quiz not found</h3>
          <p className="text-gray-600">This quiz may have been deleted or you don't have access to it.</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <button
                onClick={() => navigate(`/classroom/${quiz.classroom_id}`)}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{quiz.title}</h1>
                <p className="text-sm text-gray-600">{quiz.classrooms.name}</p>
              </div>
            </div>
            {timeLeft !== null && (
              <div className="flex items-center text-lg font-medium text-gray-900">
                <Clock className="h-5 w-5 mr-2 text-red-500" />
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Question {currentQuestion + 1}
            </h2>
            <p className="text-gray-700 mb-4">{currentQ.question_text}</p>
            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
              {currentQ.points} point{currentQ.points !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQ.question_type === 'multiple_choice' && (
              currentQ.quiz_options
                .sort((a, b) => a.order_index - b.order_index)
                .map((option) => (
                  <label key={option.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name={`question_${currentQ.id}`}
                      value={option.id}
                      checked={responses[currentQ.id]?.selected_option_id === option.id}
                      onChange={() => handleAnswerChange(currentQ.id, {
                        ...responses[currentQ.id],
                        selected_option_id: option.id
                      })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="ml-3 text-gray-700">{option.option_text}</span>
                  </label>
                ))
            )}

            {currentQ.question_type === 'true_false' && (
              <div className="space-y-3">
                {currentQ.quiz_options
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((option) => (
                    <label key={option.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name={`question_${currentQ.id}`}
                        value={option.option_text}
                        checked={responses[currentQ.id]?.answer_text === option.option_text}
                        onChange={() => handleAnswerChange(currentQ.id, {
                          ...responses[currentQ.id],
                          answer_text: option.option_text
                        })}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      />
                      <span className="ml-3 text-gray-700">{option.option_text}</span>
                    </label>
                  ))
                }
              </div>
            )}

            {currentQ.question_type === 'short_answer' && (
              <textarea
                value={responses[currentQ.id]?.answer_text || ''}
                onChange={(e) => handleAnswerChange(currentQ.id, {
                  ...responses[currentQ.id],
                  answer_text: e.target.value
                })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter your answer here..."
              />
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePreviousQuestion}
            disabled={currentQuestion === 0}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex space-x-3">
            {currentQuestion === questions.length - 1 ? (
              <button
                onClick={handleSubmitQuiz}
                disabled={submitting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Next
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
