/**
 * useAudioRecorder — custom hook for browser audio recording
 *
 * Uses MediaRecorder API to capture audio from the microphone.
 * Returns controls and state for recording UI.
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseAudioRecorderReturn {
    /** Whether the browser is currently recording */
    isRecording: boolean;
    /** Elapsed recording time in seconds */
    recordingTime: number;
    /** Start recording from the microphone */
    startRecording: () => Promise<void>;
    /** Stop recording and return the audio Blob */
    stopRecording: () => void;
    /** The recorded audio blob (available after stop) */
    audioBlob: Blob | null;
    /** Error message (e.g. mic unavailable) */
    error: string | null;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
        };
    }, []);

    const startRecording = useCallback(async () => {
        setError(null);
        setAudioBlob(null);
        chunksRef.current = [];

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            streamRef.current = stream;

            // Prefer webm/opus; fallback to whatever browser supports
            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : "audio/webm";

            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType });
                setAudioBlob(blob);

                // Stop all tracks
                stream.getTracks().forEach((t) => t.stop());
                streamRef.current = null;

                // Stop timer
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
            };

            recorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            // Start elapsed timer
            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } catch {
            setError("mic_unavailable");
            setIsRecording(false);
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    }, []);

    return {
        isRecording,
        recordingTime,
        audioBlob,
        error,
        startRecording,
        stopRecording,
    };
}
