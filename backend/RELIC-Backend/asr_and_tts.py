import io
import os
import re
from functools import lru_cache

from gtts import gTTS


@lru_cache(maxsize=1)
def _load_whisper_model():
    from transformers import WhisperProcessor, WhisperForConditionalGeneration

    print("Loading Multilingual ASR Model (OpenAI Whisper)...")
    processor = WhisperProcessor.from_pretrained("openai/whisper-small")
    model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-small")
    model.eval()
    return processor, model


def run_multilingual_asr(wav_path):
    import librosa
    import torch

    # Reuse the model between quiz questions instead of reloading it each time.
    processor, model = _load_whisper_model()
    print(f"Loading audio from {wav_path}...")
    # librosa automatically resamples the audio to 16000Hz, which Whisper strictly requires!
    speech_array, sampling_rate = librosa.load(wav_path, sr=16000)

    inputs = processor(speech_array, sampling_rate=16000, return_tensors="pt")

    print("Transcribing (Auto-Detecting Language)...")
    with torch.no_grad():
        # Generate token ids with language auto-detection enabled
        predicted_ids = model.generate(inputs.input_features)

    # Decode keeping special tokens to extract the detected language
    transcription_with_special = processor.batch_decode(predicted_ids, skip_special_tokens=False)[0]

    # Extract the language tag (e.g., <|hi|>, <|bn|>) which is usually the second special token
    tags = re.findall(r'<\|(.*?)\|>', transcription_with_special)
    detected_lang = tags[1] if len(tags) > 1 else 'hi'

    # Decode the transcription to normal text
    transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
    return transcription, detected_lang


def synthesize_speech(text, lang_code='en'):
    buffer = io.BytesIO()
    gTTS(text=text, lang=lang_code, slow=False).write_to_fp(buffer)
    return buffer.getvalue()


def run_multilingual_tts(text, lang_code='en', output_path="response.wav"):
    from playsound3 import playsound

    print(f"Generating TTS response in language code '{lang_code}'...")
    with open(output_path, "wb") as f:
        f.write(synthesize_speech(text, lang_code))
    print(f"Playing spoken answer from '{output_path}'...")
    playsound(output_path, block=True)
    return output_path


if __name__ == "__main__":
    # Point this to your input WAV file
    wav_file = r"C:\Users\roytr\Desktop\hack\RelicLLM\voice.wav"

    if os.path.exists(wav_file):
        # 1. Transcribe the audio (it will automatically detect the language)
        text, detected_lang = run_multilingual_asr(wav_file)

        print("\n" + "=" * 50)
        print(f"DETECTED LANGUAGE CODE: {detected_lang}")
        print(f"TRANSCRIBED TEXT (Native Script): {text}")
        print("=" * 50 + "\n")

        # 2. Text-to-Speech Output
        # We now dynamically use the language detected by Whisper for the TTS!
        response_text = f"You said: {text}"
        run_multilingual_tts(response_text, lang_code=detected_lang)
    else:
        print(f"File {wav_file} not found. Please provide a valid .wav file.")