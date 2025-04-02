import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import logo from '../images/Mob_Iron_Hog.png';
import '../styles/UserProfileDashboard.css';

function UserProfile() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const [showSaved, setShowSaved] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showProgress, setShowProgress] = useState(false);

    const [youtubeUrls] = useState([
        { src: "https://www.youtube.com/embed/DR-cfDsHCGA", title: "Introduction to Numbers" },
        { src: "https://www.youtube.com/embed/Yt8GFgxlITs", title: "Counting 1-10" },
        { src: "https://www.youtube.com/embed/tVHOBVAFjUw", title: "Basic Addition" },
        { src: "https://www.youtube.com/embed/o-6OKWU99Co", title: "Learning Shapes" },
        { src: "https://www.youtube.com/embed/qhOTU8_1Af4", title: "Colors and Patterns" },
    ]);

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            const { data: authData, error: authError } = await supabase.auth.getUser();
            if (authError || !authData?.user) {
                console.error("User not authenticated:", authError);
                navigate('/login');
                return;
            }

            const user = authData.user;
            let { data: profileData, error: profileError } = await supabase
  .from('profiles')
  .select('id, first_name, last_name, email, avatar_url, bio')  
  .eq('id', user.id)
  .single();

            if (profileError) {
                const { data: newProfile, error: insertError } = await supabase
                    .from('profiles')
                    .insert([
                        {
                            id: user.id,
                            name: user.user_metadata?.full_name || "New User",
                            email: user.email,
                            avatar_url: user.user_metadata?.avatar_url || "https://via.placeholder.com/150",
                            bio: "This is my profile!"
                        }
                    ])
                    .select('id, name, email, avatar_url, bio')
                    .single();

                if (insertError) {
                    console.error("Error inserting profile:", insertError);
                } else {
                    profileData = newProfile;
                }
            }

            setProfile(profileData);
            setLoading(false);
        };

        fetchProfile();
    }, [navigate]);

    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error("Sign out error:", error.message);
        } else {
            navigate('/signin');
        }
    };

    if (loading) return <div className="loading">Loading Profile...</div>;
    if (!profile) return <div className="error">Error loading profile.</div>;

    return (
        <div className="profile-container">
            <header className="profile-header-nav">
                <div className="nav-logo">
                    <img src={logo} alt="Piggyback Learning Logo" />
                </div>
                <nav className="nav-menu">
                    <ul>
                        <li><Link to="/">Home</Link></li>
                        <li><Link to="/store">Store</Link></li>
                        <li><Link to="/video">Video (placeholder)</Link></li>
                    </ul>
                </nav>
            </header>

            <div className="profile-page">
                <div className="profile-card">
                    <div className="profile-header">
                        <img
                            className="profile-picture"
                            src={profile.avatar_url || "https://via.placeholder.com/150"}
                            alt="Profile"
                        />
                        <h2>{profile.first_name} {profile.last_name}</h2>
                        <p>{profile.bio}</p>
                    </div>

                    <div className="profile-sections">
                        <button className="profile-section-btn" onClick={() => setShowSaved(!showSaved)}>
                            📁 Saved Videos
                        </button>
                        {showSaved && (
                            <div className="video-scroll-container">
                                <div className="video-grid">
                                    {youtubeUrls.map((video, index) => (
                                        <div key={index} className="video-box">
                                            <iframe
                                                width="300"
                                                height="180"
                                                src={video.src}
                                                title={video.title}
                                                frameBorder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                            <p>{video.title}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button className="profile-section-btn" onClick={() => setShowHistory(!showHistory)}>
                            📜 Video History
                        </button>
                        {showHistory && (
                            <div className="video-placeholder">
                                <p>Video History will appear here (placeholder).</p>
                            </div>
                        )}

                        <button className="profile-section-btn" onClick={() => setShowProgress(!showProgress)}>
                            📊 Progress
                        </button>
                        {showProgress && (
                            <div className="video-placeholder">
                                <p>Progress tracker section (placeholder).</p>
                            </div>
                        )}
                    </div>

                    <button className="back-button" onClick={() => navigate('/')}>
                        ⬅️ Back to Home
                    </button>

                    <button className="signout-button" onClick={handleSignOut}>
                        🚪 Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}

export default UserProfile;
