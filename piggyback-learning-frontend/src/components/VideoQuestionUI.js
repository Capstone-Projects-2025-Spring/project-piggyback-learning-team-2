import React, { useState, useEffect } from 'react';
import '../styles/VideoQuestionUI.css';

const VideoQuestionUI = () => {
  const [question, setQuestion] = useState({
    question: 'What is this shape?',
    options: ['Circle', 'Square', 'Triangle'],
  });
  const [selectedAnswer, setSelectedAnswer] = useState("");

  const handleAnswer = (answer) => {
    setSelectedAnswer(answer);
    // Handle the answer, maybe give feedback, move to next question, etc.
  };

  return (
    <div className="video-question-ui">
      <h3>{question.question}</h3>
      <div className="options-container">
        {question.options.map((option, index) => (
          <button key={index} onClick={() => handleAnswer(option)}>
            {option}
          </button>
        ))}
      </div>
      {selectedAnswer && <p>You selected: {selectedAnswer}</p>}
    </div>
  );
};

export default VideoQuestionUI;
