// VideoProcessor.js - Component for handling video processing
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function VideoProcessor({ videoUrl, onProcessingComplete }) {
    const [status, setStatus] = useState('idle');
    const [progress, setProgress] = useState('');
    const [processingId, setProcessingId] = useState(null);
    const [error, setError] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [pollingInterval, setPollingInterval] = useState(null);

    // Get the base URL from environment or use the default
    const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://project-piggyback-learning-team-2-hnwm.onrender.com';

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

            console.log(`Starting video processing with ID: ${videoId}`);
            console.log(`Using API base URL: ${API_BASE_URL}`);

            // Configure axios for this request - add specific CORS headers
            const axiosConfig = {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 120000 // 120 seconds - increased timeout for processing
            };

            // Log the request
            console.log('Sending request to:', `${API_BASE_URL}/api/v1/video/process/${videoId}`);
            console.log('With payload:', {
                youtube_url: videoUrl,
                full_analysis: true,
                num_questions: 5,
                keyframe_interval: 30
            });

            // Start the initial processing request
            const response = await axios.post(
                `${API_BASE_URL}/api/v1/video/process/${videoId}`,
                {
                    youtube_url: videoUrl,
                    full_analysis: true,
                    num_questions: 5,
                    keyframe_interval: 30
                },
                axiosConfig
            );

            console.log('Process response:', response);

            // Handle different response statuses
            if (response.data.status === 'already_processing') {
                setStatus('processing');
                startPolling(videoId);
                return;
            }

            if (response.data.status === 'processing') {
                setStatus('processing');
                startPolling(videoId);
            } else {
                throw new Error(response.data.error || 'Failed to start processing');
            }
        } catch (err) {
            console.error('Failed to start processing:', err);

            // More specific error handling
            let errorMessage = err.response?.data?.detail ||
                err.response?.data?.error ||
                err.message ||
                'Unknown processing error';

            // Special case for CORS errors
            if (err.message.includes('Network Error') && !err.response) {
                errorMessage = 'Network error - Cannot connect to the API server. Please check your connection or if the server is running.';
            }

            // Special case for 500 errors
            if (err.response?.status === 500) {
                errorMessage = `Server error (500): ${errorMessage}. Please try again later.`;
            }

            setError(errorMessage);
            setStatus('error');
        }
    }, [videoUrl, generateProcessingId, API_BASE_URL]);

    // Start polling for updates and triggering next steps
    const startPolling = useCallback((videoId) => {
        // Clear any existing interval
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }

        // Set up new polling interval
        const interval = setInterval(async () => {
            try {
                console.log(`Polling for status update: ${API_BASE_URL}/api/v1/video/polling/${videoId}`);

                // This endpoint both checks status AND triggers the next processing step
                const response = await axios.get(`${API_BASE_URL}/api/v1/video/polling/${videoId}`);
                const result = response.data;

                console.log('Polling response:', result);

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
                console.log('Error details:', err.response?.data || err.message);
                // Don't stop polling on temporary errors
            }
        }, 3000); // Poll every 3 seconds

        setPollingInterval(interval);
    }, [onProcessingComplete, pollingInterval, API_BASE_URL]);

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
    }, [processingId, pollingInterval, API_BASE_URL]);

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