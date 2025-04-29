import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function VideoProcessor({ videoUrl, onProcessingComplete }) {
    const [status, setStatus] = useState('idle');
    const [progress, setProgress] = useState('');
    const [processingId, setProcessingId] = useState(null);
    const [error, setError] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [pollingInterval, setPollingInterval] = useState(null);

    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://project-piggyback-learning-team-2-hnwm.onrender.com';

    const generateProcessingId = useCallback(() => {
        return `video-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }, []);

    const startProcessing = useCallback(async () => {
        try {
            if (!videoUrl) {
                throw new Error('No video URL provided');
            }

            setStatus('starting');
            setError(null);
            setProgress('Initializing connection...');

            const newProcessingId = generateProcessingId();
            setProcessingId(newProcessingId);

            // First check if backend is reachable
            try {
                await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
            } catch (healthErr) {
                throw new Error(`Backend service unavailable: ${healthErr.message}`);
            }

            setProgress('Starting video processing...');

            const response = await axios.post(
                `${BACKEND_URL}/api/v1/video/process/${newProcessingId}`,
                {
                    youtube_url: videoUrl,
                    full_analysis: true,
                    num_questions: 5,
                    keyframe_interval: 30
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 60000
                }
            );

            if (response.data.status === 'processing') {
                setStatus('processing');
                setProgress(response.data.progress || 'Processing started');
                startPolling(newProcessingId);
            } else {
                throw new Error(response.data.error || 'Unexpected response from server');
            }
        } catch (err) {
            console.error('Processing error:', err);
            setError(err.message);
            setStatus('error');
            setProgress('Failed');
        }
    }, [videoUrl, generateProcessingId, BACKEND_URL]);

    const startPolling = useCallback((pollingId) => {
        if (!pollingId) {
            setError('Missing video ID for polling');
            setStatus('error');
            return;
        }

        // Clear any existing interval
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }

        let pollingAttempts = 0;
        const maxPollingAttempts = 120; // Increased from 60 (now 6 minutes)
        const maxProcessingTime = 360000; // Increased from 3 to 6 minutes

        const startTime = Date.now();
        const interval = setInterval(async () => {
            try {
                const elapsed = Date.now() - startTime;
                if (elapsed > maxProcessingTime) {
                    clearInterval(interval);
                    setStatus('error');
                    setError('Processing timed out after 6 minutes');
                    return;
                }

                pollingAttempts++;
                console.log(`Polling attempt ${pollingAttempts} for ID: ${pollingId}`);

                const response = await axios.get(
                    `${BACKEND_URL}/api/v1/video/results/${pollingId}`,
                    {
                        timeout: 10000, // 10 second timeout per request
                        headers: { 'Accept': 'application/json' }
                    }
                );

                const result = response.data;

                // Always update progress if available
                if (result.progress) {
                    setProgress(result.progress);
                }

                // Handle completion cases
                if (result.status === 'complete' || (result.questions && result.questions.length > 0)) {
                    clearInterval(interval);
                    setStatus('complete');
                    const questions = result.questions || [];
                    setQuestions(questions);
                    if (onProcessingComplete) {
                        onProcessingComplete(questions);
                    }
                }
                // Handle error cases
                else if (result.status === 'error') {
                    clearInterval(interval);
                    setStatus('error');
                    setError(result.error || 'Processing failed');
                }
                // If still processing after many attempts, show a message
                else if (pollingAttempts > 30 && pollingAttempts % 10 === 0) {
                    setProgress(`Still processing... (attempt ${pollingAttempts})`);
                }
            } catch (err) {
                console.error('Polling error:', {
                    processingId: pollingId,
                    error: err.message,
                    status: err.response?.status
                });

                // Only fail on 404, otherwise keep trying
                if (err.response?.status === 404) {
                    clearInterval(interval);
                    setStatus('error');
                    setError(`Processing session ${pollingId} not found`);
                } else if (pollingAttempts >= maxPollingAttempts) {
                    clearInterval(interval);
                    setStatus('error');
                    setError('Processing timed out after 6 minutes');
                }
            }
        }, 3000); // Keep 3 second interval

        setPollingInterval(interval);

        return () => clearInterval(interval);
    }, [onProcessingComplete, BACKEND_URL]);

    const cancelProcessing = useCallback(async () => {
        if (!processingId) {
            setError('No active processing session to cancel');
            return;
        }

        try {
            console.log(`Cancelling processing for ID: ${processingId}`);
            await axios.post(
                `${BACKEND_URL}/api/v1/video/cancel/${processingId}`,
                {},
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    withCredentials: false
                }
            );

            setStatus('cancelled');
            setError(null);

            // Clear polling if active
            if (pollingInterval) {
                clearInterval(pollingInterval);
                setPollingInterval(null);
            }
        } catch (err) {
            console.error('Cancel error:', err);
            setError('Failed to cancel processing - it may complete normally');
            setStatus('error');
        }
    }, [processingId, pollingInterval, BACKEND_URL]);

    // Clean up polling on unmount
    useEffect(() => {
        return () => {
            if (pollingInterval) {
                clearInterval(pollingInterval);
            }
        };
    }, [pollingInterval]);

    return {
        startProcessing,
        cancelProcessing,
        status,
        progress,
        error,
        questions,
        processingId
    };
}

export default VideoProcessor;