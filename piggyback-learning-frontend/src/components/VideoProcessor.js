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
            // Validate input
            if (!videoUrl) {
                throw new Error('No video URL provided');
            }

            setStatus('starting');
            setError(null);

            // Generate and set processing ID
            const newProcessingId = generateProcessingId();
            setProcessingId(newProcessingId);
            console.log('Generated processing ID:', newProcessingId);

            // Make the processing request
            const response = await axios.post(
                `${BACKEND_URL}/api/v1/video/process/${newProcessingId}`,
                {
                    youtube_url: videoUrl,
                    full_analysis: true,
                    num_questions: 5,
                    keyframe_interval: 30
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    timeout: 600000,
                    withCredentials: false
                }
            );

            console.log('Processing response:', response.data);

            if (response.data.status === 'processing') {
                setStatus('processing');
                startPolling(newProcessingId);
            } else {
                throw new Error(response.data.error || 'Unexpected response from server');
            }
        } catch (err) {
            console.error('Processing error:', {
                error: err.message,
                response: err.response?.data,
                processingId: processingId,
                videoUrl: videoUrl
            });

            let errorMessage = err.response?.data?.error || err.message || 'Processing failed';
            if (err.code === 'ECONNABORTED') {
                errorMessage = 'Request timed out - server may be busy';
            }

            setError(errorMessage);
            setStatus('error');
        }
    }, [videoUrl, generateProcessingId, BACKEND_URL, processingId]);

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
        const maxPollingAttempts = 60; // 3 minutes at 3s interval

        const interval = setInterval(async () => {
            try {
                pollingAttempts++;
                console.log(`Polling attempt ${pollingAttempts} for ID: ${pollingId}`);

                const response = await axios.get(
                    `${BACKEND_URL}/api/v1/video/results/${pollingId}`,
                    {
                        timeout: 600000,
                        headers: { 'Accept': 'application/json' }
                    }
                );

                const result = response.data;
                if (result.progress) setProgress(result.progress);

                if (result.status === 'complete') {
                    clearInterval(interval);
                    setStatus('complete');
                    setQuestions(result.questions || []);
                    if (onProcessingComplete) {
                        onProcessingComplete(result.questions || []);
                    }
                } else if (result.status === 'error') {
                    clearInterval(interval);
                    setStatus('error');
                    setError(result.error || 'Processing failed');
                }
            } catch (err) {
                console.error('Polling error:', {
                    processingId: pollingId,
                    error: err.message,
                    status: err.response?.status
                });

                if (err.response?.status === 404) {
                    clearInterval(interval);
                    setStatus('error');
                    setError(`Processing session ${pollingId} not found`);
                } else if (pollingAttempts >= maxPollingAttempts) {
                    clearInterval(interval);
                    setStatus('error');
                    setError('Processing timed out after 3 minutes');
                }
            }
        }, 3000);

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