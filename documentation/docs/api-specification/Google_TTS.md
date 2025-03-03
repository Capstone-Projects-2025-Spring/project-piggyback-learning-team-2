---
sidebar_position: 9
description: Google TTS documentation
---

# Google TTS API Specs

## Notes:

### Library:
gTTS (Google Text-to-Speech).

### Authentication: 
None required (public API).


## Endpoints for Text-to-Speech

Convert Text to Speech

### Method: gTTS(text, lang, slow)

#### Parameters:

* string text: The text to convert to speech.

* string lang: Language code (e.g., 'en' for English, 'es' for Spanish).

* boolean slow: Whether to speak slowly (default is False).

#### Sample Usage:

    from gtts import gTTS

    tts = gTTS(text="Hello, world!", lang="en", slow=False)
    tts.save("hello.mp3")

### Returns:
 
* Audio File: Saves the speech as an MP3 file.