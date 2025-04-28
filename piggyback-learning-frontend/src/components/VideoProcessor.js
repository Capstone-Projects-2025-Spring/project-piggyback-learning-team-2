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

            // Configure axios for this request with more robust CORS settings

            /*
            const axiosConfig = {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                timeout: 600000, // 600 seconds - increased timeout for processing
                withCredentials: false // Important for CORS with '*' origin
            };
            */

            const axiosConfig = {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 120000,
                withCredentials: false  // This is important when using allow_origins=["*"]
            };

            // Log the request
            console.log('Sending request to:', `${API_BASE_URL}/api/v1/video/process/${videoId}`);
            console.log('With payload:', {
                youtube_url: videoUrl,
                full_analysis: true,
                num_questions: 5,
                keyframe_interval: 30
            });

            // Try CORS preflight request first to check connectivity

            //try {
            //    await axios.options(`${API_BASE_URL}/health`, {

            //        timeout: 5000
            //    });
            //    console.log("CORS preflight successful");
            //} catch (preflightErr) {
            //    console.warn("CORS preflight check failed:", preflightErr);
                // Continue anyway - the main request might still work
            //}

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
                errorMessage = `CORS Error: Cannot connect to the API server at ${API_BASE_URL}. This could be due to:
                1. The API server is down or unreachable
                2. CORS is not properly configured on the server
                3. There's a network connectivity issue
                
                Try checking the server status or refreshing the page.`;
            }

            // Special case for 500 errors
            if (err.response?.status === 500) {
                errorMessage = `Server error (500): ${errorMessage}. The server encountered an internal error. Please try again later or with a different video.`;
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
                const response = await axios.get(`${API_BASE_URL}/api/v1/video/polling/${videoId}`, {
                    withCredentials: false,
                    headers: {
                        'Accept': 'application/json'
                    }
                });
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

                // Update error message in UI but continue polling
                // This allows recovery if the server becomes available again
                setProgress(`Waiting for server... (${new Date().toLocaleTimeString()})`);

                // If we've been polling with errors for more than 5 minutes, give up
                const fiveMinutes = 5 * 60 * 1000;
                const processingStartTime = parseInt(videoId.split('-')[1], 10);
                if (Date.now() - processingStartTime > fiveMinutes) {
                    clearInterval(interval);
                    setStatus('error');
                    setError('Server connection timeout after 5 minutes of trying. Please try again later.');
                }
            }
        }, 3000); // Poll every 3 seconds

        setPollingInterval(interval);
    }, [onProcessingComplete, pollingInterval, API_BASE_URL]);

    // Cancel processing
    const cancelProcessing = useCallback(async () => {
        if (!processingId) return;

        try {
            await axios.post(`${API_BASE_URL}/api/v1/video/cancel/${processingId}`, {}, {
                withCredentials: false,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            setStatus('cancelled');

            // Stop polling
            if (pollingInterval) {
                clearInterval(pollingInterval);
                setPollingInterval(null);
            }
        } catch (err) {
            console.error('Failed to cancel processing:', err);
            // Even if cancellation fails, stop polling
            if (pollingInterval) {
                clearInterval(pollingInterval);
                setPollingInterval(null);
            }
            setStatus('cancelled');
            setError('Processing cancelled, but the server might still be processing in the background.');
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