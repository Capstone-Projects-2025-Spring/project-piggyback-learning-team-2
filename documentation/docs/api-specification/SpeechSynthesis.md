---
sidebar_position: 9
description: SpeechSynthesis API documentation
---

# SynthesisSpeech API Specs

## Notes:

## Library:
Web Speech API (built into modern browsers)

## Authentication:
None required (client-side only)


## Endpoints for Text-to-Speech

### Method: speakQuestion(question)

**Parameters:**

- Object question: The question object containing:

- string text: The main question text to speak

- string type: Question type ('object_detection' or others)

- array options: Available options (for non-object detection questions)

**Sample Usage:**
```
javascript
const question = {
  text: "What color is the sky?",
  type: "multiple_choice",
  options: ["Blue", "Green", "Red"]
};

speakQuestion(question);
```

## Features:

### Automatic Speech:

Questions are automatically spoken when they appear

Options are read after the main question for multiple choice

### Queue Management:

Cancels any currently playing speech before starting new

Sequences question text and options smoothly

### Cross-browser Support:

Falls back gracefully when SpeechSynthesis isn't available

Console warning in unsupported browsers

Implementation Details:

```
javascript
const speakQuestion = (question) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    
    const questionUtterance = new SpeechSynthesisUtterance(question.text);
    
    if (question.type !== 'object_detection' && question.options?.length > 0) {
      const optionsText = `Options are: ${question.options.join(', ')}`;
      const optionsUtterance = new SpeechSynthesisUtterance(optionsText);

      window.speechSynthesis.speak(questionUtterance);
      questionUtterance.onend = () => {
        window.speechSynthesis.speak(optionsUtterance);
      };
    } else {
      window.speechSynthesis.speak(questionUtterance);
    }
  } else {
    console.warn("Speech synthesis not supported in this browser");
  }
};

```

## UI Integration:

The API is integrated with a speaker button that appears next to each question:

```
jsx
<button
  className="speaker-button"
  onClick={() => speakQuestion(quiz.currentQuestion)}
  title="Read question aloud"
>
  🔊
</button>
```

## Error Handling:
Silently fails in unsupported browsers (with console warning)

Automatically stops any previous speech before starting new

No dependencies - works with native browser APIs

**Browser Support**

| **Browser**   | **Support**   |
| ------------- | ------------- |
| Chrome| ✅ Yes|
| Firefox | ✅ Yes|
| Safari| ✅ Yes|
| Edge| ✅ Yes|
|Mobile Safari| ✅ Yes|
|Chrome Android| ✅ Yes|

Note: Some mobile browsers may require user interaction before allowing speech synthesis.