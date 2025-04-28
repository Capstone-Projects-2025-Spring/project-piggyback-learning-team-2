// VideoProcessor.js - Component for handling video processing
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://project-piggyback-learning-team-2-hnwm.onrender.com'

function VideoProcessor({ videoUrl, onProcessingComplete }) {
    const [status, setStatus] = useState('idle');
    const [progress, setProgress] = useState('');
    const [processingId, setProcessingId] = useState(null);
    const [error, setError] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [pollingInterval, setPollingInterval] = useState(null);

    // Generate a unique ID for this processing session
    const generateProcessingId = useCallback(() => {
        return `video-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }, []);

    // Start processing
    const startProcessing = useCallback(async () => {
        try {
            setStatus('starting');
            setError(null);

            // Generate a processing ID
            const videoId = generateProcessingId();
            setProcessingId(videoId);

            // Start the initial processing request
            const response = await axios.post(`${API_BASE_URL}/api/v1/video/process/${videoId}`, {
                youtube_url: videoUrl,
                full_analysis: true,
                num_questions: 5,
                keyframe_interval: 30
            });

            if (response.data.status === 'processing' || response.data.status === 'already_processing') {
                setStatus('processing');

                // Start polling for updates
                startPolling(videoId);
            } else {
                setError('Failed to start processing');
                setStatus('error');
            }
        } catch (err) {
            console.error('Failed to start processing:', err);
            setError(err.response?.data?.detail || err.message);
            setStatus('error');
        }
    }, [videoUrl, generateProcessingId]);

    // Start polling for updates and triggering next steps
    const startPolling = useCallback((videoId) => {
        // Clear any existing interval
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }

        // Set up new polling interval
        const interval = setInterval(async () => {
            try {
                // This endpoint both checks status AND triggers the next processing step
                const response = await axios.get(`${API_BASE_URL}/api/v1/video/polling/${videoId}`);
                const result = response.data;

                // Update UI based on status
                if (result.progress) {
                    setProgress(result.progress);
                }

                if (result.status === 'complete') {
                    // Processing complete
                    clearInterval(interval);
                    setStatus('complete');
                    setQuestions(result.questions || []);
                    if (onProcessingComplete) {
                        onProcessingComplete(result.questions || []);
                    }
                } else if (result.status === 'error' || result.status === 'timeout') {
                    // Error occurred
                    clearInterval(interval);
                    setStatus('error');
                    setError(result.error || 'Processing failed');
                } else if (result.status === 'cancelled') {
                    // Processing was cancelled
                    clearInterval(interval);
                    setStatus('cancelled');
                }
                // Otherwise continue polling
            } catch (err) {
                console.error('Polling error:', err);
                // Don't stop polling on temporary errors
            }
        }, 3000); // Poll every 3 seconds

        setPollingInterval(interval);
    }, [onProcessingComplete, pollingInterval]);

    // Cancel processing
    const cancelProcessing = useCallback(async () => {
        if (!processingId) return;

        try {
            await axios.post(`${API_BASE_URL}/api/v1/video/cancel/${processingId}`);
            setStatus('cancelled');

            // Stop polling
            if (pollingInterval) {
                clearInterval(pollingInterval);
                setPollingInterval(null);
            }
        } catch (err) {
            console.error('Failed to cancel processing:', err);
        }
    }, [processingId, pollingInterval]);

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