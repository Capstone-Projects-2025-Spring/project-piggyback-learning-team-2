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
    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://project-piggyback-learning-team-2-hnwm.onrender.com';

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

            const processUrl = `${BACKEND_URL}/api/v1/video/process/${videoId}`;
            console.log(`Calling API endpoint: ${processUrl}`);

            console.log(`Starting video processing with ID: ${videoId}`);
            console.log(`Using API base URL: ${BACKEND_URL}`);

            //Health check
            try {
                const healthCheck = await axios.get(`${BACKEND_URL}/health`);
                console.log("Health check response:", healthCheck.data);
            } catch (healthErr) {
                console.error("Health check failed:", healthErr);
                // Continue anyway
            }

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
                timeout: 600000,
                withCredentials: false
            }

            // Log the request
            console.log('Sending request to:', `${BACKEND_URL}/api/v1/video/process/${videoId} from videoprocessor`);
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
                processUrl,
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
            console.error('API call failed:', err);

            console.error('Request details:', {
                url: `${BACKEND_URL}/api/v1/video/process/${videoId}`, // Using state
                status: err.response?.status,
                statusText: err.response?.statusText,
                data: err.response?.data,
                videoUrl: videoUrl // Adding context about what video failed
            });

            // More specific error handling
            let errorMessage = err.response?.data?.detail ||
                err.response?.data?.error ||
                err.message ||
                'Unknown processing error';

            // Special case for CORS errors
            if (err.message.includes('Network Error') && !err.response) {
                errorMessage = `CORS Error: Cannot connect to the API server at ${BACKEND_URL}. This could be due to:
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
    }, [videoUrl, generateProcessingId, BACKEND_URL]);

    // Start polling for updates and triggering next steps
    const startPolling = useCallback((videoId) => {
        // Clear any existing interval
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }

        let pollingAttempts = 0;
        const maxPollingAttempts = 60; // 3 minutes at 3s interval

        // Set up new polling interval
        const interval = setInterval(async () => {
            try {
                pollingAttempts++;
                console.log(`Polling attempt ${pollingAttempts} for video ${videoId}`);

                const response = await axios.get(
                    `${BACKEND_URL}/api/v1/video/polling/${videoId}`,
                    {
                        timeout: 600000,
                        headers: { 'Accept': 'application/json' }
                    }
                );

                const result = response.data;

                // Update progress
                if (result.progress) {
                    setProgress(result.progress);
                }

                // Handle completion
                if (result.status === 'complete') {
                    clearInterval(interval);
                    setStatus('complete');
                    setQuestions(result.questions || []);
                    if (onProcessingComplete) {
                        onProcessingComplete(result.questions || []);
                    }
                    return;
                }

                // Handle errors
                if (result.status === 'error') {
                    clearInterval(interval);
                    setStatus('error');
                    setError(result.error || 'Processing failed');
                    return;
                }

                // Handle timeout
                if (pollingAttempts >= maxPollingAttempts) {
                    clearInterval(interval);
                    setStatus('error');
                    setError('Processing timed out after 3 minutes');
                    return;
                }

            } catch (err) {
                console.error('Polling error:', err);

                // Handle specific error cases
                if (err.response?.status === 404) {
                    clearInterval(interval);
                    setStatus('error');
                    setError('Video processing session not found');
                    return;
                }

                if (pollingAttempts >= maxPollingAttempts) {
                    clearInterval(interval);
                    setStatus('error');
                    setError('Connection failed after multiple attempts');
                    return;
                }
            }
        }, 3000); // Poll every 3 seconds

        setPollingInterval(interval);
    }, [onProcessingComplete, BACKEND_URL]);

    // Cancel processing
    const cancelProcessing = useCallback(async () => {
        if (!processingId) return;

        try {
            await axios.post(`${BACKEND_URL}/api/v1/video/cancel/${videoId}`, {}, {
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