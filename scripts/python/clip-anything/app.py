"""
CLIP-Anything video editing pipeline.

Provides an end-to-end pipeline for natural language video editing.
Transcribes video with Whisper, identifies relevant segments via an
LLM (Groq), and assembles a final edit with crossfades.
"""

import os
import whisper
from moviepy.editor import VideoFileClip, concatenate_videoclips
import requests
import json
import ast

def transcribe_video(video_path, model_name="base"):
    """
    Transcribe video audio into timestamped segments using Whisper.

    Extracts audio from the video via ffmpeg and runs the Whisper
    speech-to-text model to produce a list of segments with start time,
    end time, and text.

    Args:
        video_path: Path to the input video file.
        model_name: Whisper model size to use (default "base").

    Returns:
        list[dict]: Transcription segments, each containing ``start``,
            ``end``, and ``text`` keys.
    """
    model = whisper.load_model(model_name)
    audio_path = "temp_audio.wav"
    os.system(f"ffmpeg -i {video_path} -ar 16000 -ac 1 -b:a 64k -f mp3 {audio_path}")
    result = model.transcribe(audio_path)
    transcription = []
    for segment in result['segments']:
        transcription.append({
            'start': segment['start'],
            'end': segment['end'],
            'text': segment['text'].strip()
        })
    return transcription
    
def get_relevant_segments(transcript, user_query):
    """
    Identify transcript segments relevant to a natural language query.

    Sends the transcript with a system prompt to the Groq LLM API and
    parses the returned JSON to extract time ranges for conversations
    matching the user's query.

    Args:
        transcript: List of segment dicts with ``start``, ``end``,
            and ``text`` keys.
        user_query: Natural language description of clips to find.

    Returns:
        list[dict]: Relevant conversations, each with ``start`` and
            ``end`` time boundaries.
    """
    prompt = f"""You are an expert video editor who can read video transcripts and perform video editing. Given a transcript with segments, your task is to identify all the conversations related to a user query. Follow these guidelines when choosing conversations. A group of continuous segments in the transcript is a conversation.

Guidelines:
1. The conversation should be relevant to the user query. The conversation should include more than one segment to provide context and continuity.
2. Include all the before and after segments needed in a conversation to make it complete.
3. The conversation should not cut off in the middle of a sentence or idea.
4. Choose multiple conversations from the transcript that are relevant to the user query.
5. Match the start and end time of the conversations using the segment timestamps from the transcript.
6. The conversations should be a direct part of the video and should not be out of context.

Output format: {{ "conversations": [{{"start": "s1", "end": "e1"}}, {{"start": "s2", "end": "e2"}}] }}

Transcript:
{transcript}

User query:
{user_query}"""
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer groq-key"
    }

    data = {
        "messages": [
            {
                "role": "system",
                "content": prompt
            }
        ],
        "model": "llama-3.1-70b-versatile",
        "temperature": 1,
        "max_tokens": 1024,
        "top_p": 1,
        "stream": False,
        "stop": None
    }
    response = requests.post(url, headers=headers, json=data)
    data = response.json()["choices"][0]["message"]["content"]
    conversations = ast.literal_eval(data)["conversations"]
    return conversations

def edit_video(original_video_path, segments, output_video_path, fade_duration=0.5):
    """
    Assemble an edited video from selected segments with crossfades.

    Cuts clips from the original video at the given time ranges, applies
    fade-in/fade-out transitions, and concatenates them into a single
    output file.

    Args:
        original_video_path: Path to the source video file.
        segments: List of dicts with ``start`` and ``end`` time
            boundaries.
        output_video_path: Path where the edited video will be written.
        fade_duration: Duration in seconds for fade transitions
            (default 0.5).
    """
    video = VideoFileClip(original_video_path)
    clips = []
    for seg in segments:
        start = seg['start']
        end = seg['end']
        clip = video.subclip(start, end).fadein(fade_duration).fadeout(fade_duration)
        clips.append(clip)
    if clips:
        final_clip = concatenate_videoclips(clips, method="compose")
        final_clip.write_videofile(output_video_path, codec="libx264", audio_codec="aac")
    else:
        print("No segments to include in the edited video.")

# Main Function
def main():
    """
    Run the CLIP-Anything pipeline end-to-end.

    Transcribes an input video, finds segments matching a hard-coded
    query via LLM, and produces a final edited output video with
    crossfade transitions.
    """
    # Paths
    input_video = "input_video.mp4"
    output_video = "edited_output.mp4"

    # User Query
    user_query = "Find all clips where there is discussion around  GPT-4 Turbo"

    # Step 1: Transcribe
    print("Transcribing video...")
    transcription = transcribe_video(input_video, model_name="base")
   
    relevant_segments = get_relevant_segments(transcription, user_query)
    
    # Step 5: Edit Video
    print("Editing video...")
    edit_video(input_video, relevant_segments, output_video)
    print(f"Edited video saved to {output_video}")

if __name__ == "__main__":
    main()
